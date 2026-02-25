import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, ClipboardCheck, Loader2, Clock, User, FileText, CheckCircle, Download } from 'lucide-react';
import { format, parse, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useInspectionStore } from '../store/useInspectionStore';
import type { Unit, ProcessType } from '../types';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const inspectorEmail = useInspectionStore((state) => state.inspectorEmail);
    const inspectorRut = useInspectionStore((state) => state.inspectorRut);
    const inspectorName = useInspectionStore((state) => state.inspectorName);
    const projects = useInspectionStore((state) => state.projects);
    const units = useInspectionStore((state) => state.units);
    const isLoadingData = useInspectionStore((state) => state.isLoadingData);
    const dataError = useInspectionStore((state) => state.dataError);

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
        bannerSubtitle = 'No tienes procesos programados en los próximos 14 días.';
        sectionTitle = 'Próximas entregas (14 días)';
    } else if (countPre > 0 && countEnt === 0) {
        bannerSubtitle = `Tienes ${countPre} pre-entrega${countPre !== 1 ? 's' : ''} programadas en los próximos 14 días.`;
        sectionTitle = 'Próximas pre-entregas (14 días)';
    } else if (countEnt > 0 && countPre === 0) {
        bannerSubtitle = `Tienes ${countEnt} entrega${countEnt !== 1 ? 's' : ''} programadas en los próximos 14 días.`;
        sectionTitle = 'Próximas entregas (14 días)';
    } else {
        bannerSubtitle = `Tienes ${countTotal} procesos programados en los próximos 14 días.`;
        sectionTitle = 'Próximos procesos (14 días)';
    }

    const handleSelectUnit = (unit: Unit) => {
        if (unit.isHandoverGenerated) {
            alert('Esta unidad ya cuenta con acta generada. Puedes ver o descargar el acta desde el dashboard.');
            return;
        }

        const store = useInspectionStore.getState();
        store.setSelectedUnit(unit);

        // Auto-set process type based on label
        const type: ProcessType = (unit.processTypeLabel || '').toUpperCase().includes('PRE')
            ? 'PRE_ENTREGA'
            : 'ENTREGA_FINAL';
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
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-200 text-center animate-in fade-in duration-300">
                <p className="font-bold mb-2">Error al cargar datos</p>
                <p className="text-sm">{dataError}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6 animate-in fade-in duration-300">
            <div className="bg-primary-600 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-2xl font-bold mb-1">Hola, {inspectorName || inspectorEmail || inspectorRut}</h1>
                    <p className="text-primary-100 font-medium">
                        {bannerSubtitle}
                    </p>
                </div>

                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mx-10 -my-10 opacity-20">
                    <ClipboardCheck size={200} />
                </div>
            </div>

            {/* Debug Mode Info (Only in Dev) */}
            {import.meta.env.DEV && (
                <div className="bg-slate-800 text-slate-300 p-3 rounded-xl text-[10px] font-mono flex flex-wrap gap-x-4 gap-y-1">
                    <span>Filtrando por: {inspectorEmail}</span>
                    <span>Total filas: {units.length}</span>
                    <span>Filtradas (14d): {upcomingDeliveries.length}</span>
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
                            const isRealizada = unit.procesoStatus === 'REALIZADA';
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
                                            <span>{isRealizada ? 'Proceso realizado' : 'Proceso cancelado'}</span>
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
