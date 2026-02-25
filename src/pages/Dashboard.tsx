import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, ClipboardCheck, Loader2 } from 'lucide-react';
import { isToday, parse, isValid, parseISO } from 'date-fns';
import { useInspectionStore } from '../store/useInspectionStore';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const clearSession = useInspectionStore((state) => state.clearSession);
    const inspectorRut = useInspectionStore((state) => state.inspectorRut);
    const inspectorName = useInspectionStore((state) => state.inspectorName);
    const inspectorEmail = useInspectionStore((state) => state.inspectorEmail);
    const units = useInspectionStore((state) => state.units);
    const projects = useInspectionStore((state) => state.projects);
    const isLoadingData = useInspectionStore((state) => state.isLoadingData);
    const dataError = useInspectionStore((state) => state.dataError);

    // Filter pending units
    const pendingUnits = units.filter(u => {
        if (u.status === 'ENTREGADO') return false;

        const rowId = (u.inspectorId || '').toLowerCase().trim();
        const currentEmail = (inspectorEmail || '').toLowerCase().trim();
        const currentRut = (inspectorRut || '').toLowerCase().replace(/[^0-9k]/g, '');
        const rowIdAsRut = rowId.replace(/[^0-9k]/g, '');

        let isAssignedToMe = false;
        if (currentEmail && rowId === currentEmail) isAssignedToMe = true;
        else if (currentRut && rowIdAsRut === currentRut) isAssignedToMe = true;

        if (!isAssignedToMe) return false;

        // Date check
        if (!u.date) return false;

        const dateStr = u.date.trim();
        let parsedDate = parseISO(dateStr);

        if (!isValid(parsedDate)) {
            // Try common latam/sheet formats
            const formats = ['dd/MM/yyyy', 'dd-MM-yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd'];
            for (const fmt of formats) {
                const tempDate = parse(dateStr, fmt, new Date());
                if (isValid(tempDate)) {
                    parsedDate = tempDate;
                    break;
                }
            }
        }

        if (!isValid(parsedDate)) return false;

        return isToday(parsedDate);
    });

    // Sort chronologically by time
    pendingUnits.sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;

        // Parse time strings like "9:00", "11:30"
        const parseTime = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(':').map(str => parseInt(str.trim(), 10));
            return (hours || 0) * 60 + (minutes || 0);
        };

        const timeA = parseTime(a.time);
        const timeB = parseTime(b.time);

        return timeA - timeB;
    });

    const handleStartProcess = () => {
        clearSession();
        navigate('/identify');
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
                    <h1 className="text-2xl font-bold mb-1">Hola, {inspectorName || `Inspector ${inspectorRut}`}</h1>
                    <p className="text-primary-100 mb-6">Tienes {pendingUnits.length} entregas pendientes en la plataforma.</p>
                    <button
                        onClick={handleStartProcess}
                        className="bg-white text-primary-600 font-semibold py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center space-x-2 w-full sm:w-auto justify-center"
                    >
                        <span>Iniciar Nuevo Proceso</span>
                        <ArrowRight size={20} />
                    </button>
                </div>

                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mx-10 -my-10 opacity-20">
                    <ClipboardCheck size={200} />
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <Calendar className="mr-2 text-primary-500" size={20} />
                    Agenda del Día
                </h2>

                {pendingUnits.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-500">
                        No hay unidades pendientes.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {pendingUnits.map(unit => {
                            const project = projects.find(p => p.id === unit.projectId);
                            return (
                                <div key={unit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mb-2 mt-1">
                                            {unit.processTypeLabel || unit.status.replace('_', ' ')}
                                        </span>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-slate-900 block">Depto {unit.number}</span>
                                            {unit.time && <span className="text-primary-600 font-bold text-sm block">{unit.time} hrs</span>}
                                        </div>
                                    </div>
                                    <h3 className="text-slate-700 font-medium">{project?.name || 'Edificio no especificado'}</h3>
                                    <div className="flex items-center text-slate-500 text-sm mt-1 mb-4">
                                        <MapPin size={14} className="mr-1 flex-shrink-0" />
                                        <span className="truncate">{project?.address || unit.projectAddress || 'Sin Dirección'}</span>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Cliente: <span className="font-medium text-slate-800">{unit.ownerName}</span></span>
                                    </div>
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
