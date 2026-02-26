import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, ClipboardCheck, Loader2, Clock, User, FileText, CheckCircle, Download } from 'lucide-react';
import { format, parse, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useInspectionStore } from '../store/useInspectionStore';
import type { Unit, ProcessType } from '../types';
import { lastApiCall } from '../apiClient';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const inspectorEmail = useInspectionStore((state) => state.inspectorEmail);
    const inspectorName = useInspectionStore((state) => state.inspectorName);
    const projects = useInspectionStore((state) => state.projects);
    const units = useInspectionStore((state) => state.units);
    const isLoadingData = useInspectionStore((state) => state.isLoadingData);
    const dataError = useInspectionStore((state) => state.dataError);
    const connectionStatus = useInspectionStore((state) => state.connectionStatus);
    const checkConnection = useInspectionStore((state) => state.checkConnection);
    const fetchData = useInspectionStore((state) => state.fetchData);
    const startProcess = useInspectionStore((state) => state.startProcess);
    const [showDiag, setShowDiag] = React.useState(false);

    const getUpcomingDeliveries = useInspectionStore((state) => state.getUpcomingDeliveries);
    const upcomingDeliveries = getUpcomingDeliveries();

    // Logic for dynamic texts
    const preEntries = upcomingDeliveries.filter(u =>
        (u.processTypeLabel || '').toUpperCase().includes('PRE')
    );
    const regularDeliveries = upcomingDeliveries.filter(u =>
        (u.processTypeLabel || '').toUpperCase().includes('ENTREGA') &&
        !(u.processTypeLabel || '').toUpperCase().includes('PRE')
    );

    const countPre = preEntries.length;
    const countEnt = regularDeliveries.length;
    const countTotal = upcomingDeliveries.length;

    let bannerSubtitle = '';
    let sectionTitle = 'Próximos procesos (14 días)';

    if (countTotal === 0) {
        bannerSubtitle = 'No tienes procesos programados';
        sectionTitle = 'Próximas entregas (14 días)';
    } else if (countPre > 0 && countEnt === 0) {
        bannerSubtitle = `${countPre} pre-entrega${countPre !== 1 ? 's' : ''} programadas`;
        sectionTitle = 'Próximas pre-entregas (14 días)';
    } else if (countEnt > 0 && countPre === 0) {
        bannerSubtitle = `${countEnt} entrega${countEnt !== 1 ? 's' : ''} programadas`;
        sectionTitle = 'Próximas entregas (14 días)';
    } else {
        bannerSubtitle = `${countTotal} procesos programados`;
        sectionTitle = 'Próximos procesos (14 días)';
    }

    const handleSelectUnit = async (unit: Unit) => {
        const store = useInspectionStore.getState();
        const type: ProcessType = (unit.processTypeLabel || '').toUpperCase().includes('PRE')
            ? 'PRE_ENTREGA'
            : 'ENTREGA_FINAL';

        // If it's a new process, we notify the server
        if (!unit.procesoStatus || unit.procesoStatus === 'PROGRAMADA') {
            const res = await startProcess(unit, type);
            if (!res.ok) {
                alert(`No se pudo iniciar el proceso: ${res.error || 'Error desconocido'}`);
                return;
            }
        }

        store.setSelectedUnit(unit);
        store.setProcessType(type);
        navigate('/process');
    };

    const handleViewActa = (url?: string) => {
        if (url) {
            window.open(url, '_blank');
        } else {
            alert('El archivo del acta no está disponible actualmente.');
        }
    };

    const formatDeliveryDate = (dateStr: string, timeStr?: string) => {
        let parsedDate = parseISO(dateStr);
        if (!isValid(parsedDate)) {
            const formats = ['dd/MM/yyyy', 'dd-MM-yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd'];
            for (const fmt of formats) {
                const tempDate = parse(dateStr, fmt, new Date());
                if (isValid(tempDate)) {
                    parsedDate = tempDate;
                    break;
                }
            }
        }

        if (!isValid(parsedDate)) return dateStr;

        const dateFormatted = format(parsedDate, "EEE dd MMM", { locale: es });
        return `${dateFormatted}${timeStr ? ` · ${timeStr}` : ''}`;
    };

    if (isLoadingData) {
        return (
            <div className="flex flex-col h-[50vh] items-center justify-center animate-in fade-in duration-300">
                <Loader2 className="animate-spin text-primary-500 mb-4" size={48} />
                <p className="text-slate-500 font-medium">Sincronizando datos...</p>
            </div>
        );
    }

    if (dataError) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center animate-in fade-in duration-300">
                <div className="bg-red-50 text-red-600 p-8 rounded-3xl border-2 border-red-100 max-w-sm">
                    <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar size={32} />
                    </div>
                    <p className="font-bold text-lg mb-2">Error de conexión</p>
                    <p className="text-sm text-red-500 mb-6">No se pudo conectar con el servidor.</p>
                    <button
                        onClick={() => fetchData()}
                        className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                    >
                        Reintentar carga
                    </button>
                    <p className="mt-4 text-[10px] text-red-400 font-mono break-all">{dataError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6 animate-in fade-in duration-300">
            <div className="bg-primary-600 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-2xl font-bold mb-1">{sectionTitle}</h1>
                    <p className="text-primary-100 font-medium italic">
                        Hola, {inspectorName || inspectorEmail} · {bannerSubtitle}
                    </p>
                </div>

                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mx-10 -my-10 opacity-20">
                    <ClipboardCheck size={200} />
                </div>
            </div>

            {/* Connection Status Bar */}
            <div className="bg-white border border-slate-200 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-green-500 animate-pulse' :
                        connectionStatus === 'ERROR' ? 'bg-red-500' : 'bg-slate-300'
                        }`} />
                    <span className="text-xs font-bold text-slate-600">
                        {connectionStatus === 'CONNECTED' ? 'Conectado a Google Cloud' :
                            connectionStatus === 'CHECKING' ? 'Verificando...' :
                                connectionStatus === 'ERROR' ? 'Sin conexión con base de datos' : 'Estado desconocido'}
                    </span>
                </div>
                <button
                    onClick={() => {
                        checkConnection();
                        setShowDiag(!showDiag);
                    }}
                    disabled={connectionStatus === 'CHECKING'}
                    className="text-[10px] font-bold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors uppercase tracking-wider disabled:opacity-50"
                >
                    {showDiag ? 'Ocultar Diagnostic' : (connectionStatus === 'ERROR' ? 'Reintentar' : 'Probar conexión')}
                </button>
            </div>

            {/* Diagnostic Mode Panel */}
            {showDiag && (
                <div className="bg-slate-900 text-slate-300 p-5 rounded-2xl text-[11px] font-mono space-y-4 border border-slate-700 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                        <span className="text-amber-400 font-bold uppercase tracking-widest text-xs">Diagnostic Panel</span>
                        <div className="flex space-x-2">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">PWA v1.2.5</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <p className="text-slate-500 font-bold">CONFIGURACIÓN:</p>
                            <div className="bg-slate-950 p-2 rounded border border-slate-800 break-all text-blue-300">
                                URL: {import.meta.env.VITE_APPS_SCRIPT_URL || 'Using config.ts URL'}
                            </div>
                            <div className="bg-slate-950 p-2 rounded border border-slate-800 text-cyan-300">
                                Device ID: {localStorage.getItem('deviceId') || 'None'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-slate-500 font-bold">RESULTADOS:</p>
                            <div className="flex space-x-2">
                                <span className={`flex-1 p-1.5 rounded text-center font-bold ${connectionStatus === 'CONNECTED' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                    HEALTH: {connectionStatus}
                                </span>
                                <span className={`flex-1 p-1.5 rounded text-center font-bold ${units.length > 0 ? 'bg-blue-900/50 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                                    AGENDA: {units.length}
                                </span>
                            </div>
                            <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[9px] h-20 overflow-auto">
                                <span className="text-slate-500">Inspectores asignados:</span><br />
                                {Array.from(new Set(units.map(u => u.inspectorId))).join(', ') || 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Show Last Action if available */}
                    <div className="space-y-2">
                        <p className="text-slate-500 font-bold">ÚLTIMA ACCIÓN:</p>
                        <div className="bg-black/40 p-3 rounded-lg border border-slate-800 overflow-auto max-h-40">
                            {lastApiCall ? (
                                <div className="space-y-1">
                                    <p className="text-green-400 font-bold text-[9px] truncate">
                                        {lastApiCall.endpoint}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                                        <span className="text-slate-400 italic">{lastApiCall.timestamp}</span>
                                        <span className="text-right font-bold text-white">Status: {lastApiCall.status || 'N/A'}</span>
                                    </div>
                                    <pre className="text-slate-300 text-[8px] mt-1 bg-slate-950 p-1.5 rounded border border-slate-800 max-h-60 overflow-auto">
                                        {JSON.stringify(lastApiCall.response, null, 2)}
                                    </pre>
                                </div>
                            ) : (
                                <p className="text-slate-500 italic">No hay acciones registradas.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                        <button onClick={() => fetchData()} className="flex-1 bg-primary-600/20 text-primary-400 border border-primary-500/30 py-2 rounded-lg font-bold hover:bg-primary-600/30 transition-colors">
                            Refrescar Agenda
                        </button>
                        <button onClick={() => window.location.reload()} className="flex-1 bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-700 transition-colors">
                            Forzar Recarga
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <Calendar className="mr-2 text-primary-500" size={20} />
                    {sectionTitle}
                </h2>

                {upcomingDeliveries.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-sm">
                        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Calendar className="text-slate-300" size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Sin entregas programadas</h3>
                        <p className="text-slate-500 font-medium max-w-xs mx-auto">
                            Actualmente no tienes inspecciones asignadas para los próximos 14 días.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
                        {upcomingDeliveries.map(unit => {
                            const project = projects.find(p => p.id === unit.projectId);
                            const isGenerated = unit.isHandoverGenerated;
                            const isEnProceso = unit.procesoStatus === 'EN_PROCESO';
                            const isRealizada = unit.procesoStatus === 'REALIZADO';
                            const isCancelada = unit.procesoStatus === 'CANCELADA';
                            const isFinalized = isRealizada || isCancelada;

                            return (
                                <div key={unit.id} className={`bg-white p-5 rounded-2xl shadow-sm border ${isGenerated ? 'border-green-200 bg-green-50/10' : 'border-slate-200'} flex flex-col hover:shadow-md transition-all ${isFinalized ? 'opacity-60 bg-slate-50/30' : ''}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col space-y-1">
                                            <span className="inline-flex items-center rounded-lg bg-primary-50 px-2.5 py-1 text-[10px] font-bold text-primary-700 ring-1 ring-inset ring-primary-700/10 uppercase tracking-widest">
                                                {unit.processTypeLabel || unit.status.replace('_', ' ')}
                                            </span>
                                            {isGenerated && (
                                                <span className="inline-flex items-center rounded-lg bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700 ring-1 ring-inset ring-green-600/10 uppercase tracking-widest">
                                                    <CheckCircle size={10} className="mr-1" />
                                                    ACTA GENERADA
                                                </span>
                                            )}
                                            {isEnProceso && (
                                                <span className="inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/10 uppercase tracking-widest">
                                                    EN PROCESO
                                                </span>
                                            )}
                                            {isRealizada && !isGenerated && (
                                                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-inset ring-slate-400/20 uppercase tracking-widest">
                                                    <CheckCircle size={10} className="mr-1" />
                                                    PROCESO REALIZADO
                                                </span>
                                            )}
                                            {isCancelada && (
                                                <span className="inline-flex items-center rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600 ring-1 ring-inset ring-red-600/10 uppercase tracking-widest">
                                                    CANCELADA
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xl font-black text-slate-900">Depto {unit.number}</span>
                                    </div>

                                    <h3 className="text-slate-900 font-bold mb-1 text-lg leading-tight truncate">{project?.name || 'Edificio no especificado'}</h3>

                                    <div className="space-y-2 mt-2">
                                        <div className="flex items-center text-primary-600 font-bold text-sm bg-primary-50/50 p-2 rounded-lg">
                                            <Clock size={16} className="mr-2" />
                                            <span className="capitalize">{formatDeliveryDate(unit.date || '', unit.time)}</span>
                                        </div>

                                        <div className="flex items-start text-slate-500 text-sm p-1">
                                            <MapPin size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                                            <span className="line-clamp-1">{project?.address || unit.projectAddress || 'Sin Dirección'}</span>
                                        </div>

                                        <div className="flex items-center text-slate-600 text-sm p-1">
                                            <User size={16} className="mr-2 flex-shrink-0 text-slate-400" />
                                            <span className="truncate">Cliente: <span className="font-bold text-slate-800">{unit.ownerName}</span></span>
                                        </div>
                                    </div>

                                    {isGenerated ? (
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleViewActa(unit.handoverUrl)}
                                                className="flex-1 bg-white border-2 border-green-600 text-green-600 font-bold py-3 px-2 rounded-xl flex items-center justify-center space-x-1.5 hover:bg-green-50 transition-colors active:scale-[0.98] text-sm"
                                            >
                                                <FileText size={16} />
                                                <span>Ver Acta</span>
                                            </button>
                                            {unit.handoverUrl ? (
                                                <button
                                                    onClick={() => handleViewActa(unit.handoverUrl)}
                                                    className="flex-1 bg-green-600 text-white font-bold py-3 px-2 rounded-xl flex items-center justify-center space-x-1.5 hover:bg-green-700 transition-colors active:scale-[0.98] text-sm"
                                                >
                                                    <Download size={16} />
                                                    <span>PDF</span>
                                                </button>
                                            ) : (
                                                <div className="flex-1 bg-slate-100 text-slate-400 font-bold py-3 px-2 rounded-xl flex items-center justify-center text-center text-[10px] leading-tight">
                                                    Detalle no disponible
                                                </div>
                                            )}
                                        </div>
                                    ) : isRealizada || isCancelada ? (
                                        <button
                                            disabled
                                            className="mt-4 w-full bg-slate-100 text-slate-400 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 cursor-not-allowed shadow-none"
                                        >
                                            <span>{isRealizada ? 'PROCESO REALIZADO' : 'Proceso cancelado'}</span>
                                            {isRealizada && <CheckCircle size={18} />}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleSelectUnit(unit)}
                                            className="mt-4 w-full bg-primary-600 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-primary-700 transition-colors active:scale-[0.98] shadow-sm"
                                        >
                                            <span>{isEnProceso ? 'Continuar Proceso' : 'Iniciar Proceso'}</span>
                                            <ArrowRight size={18} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
