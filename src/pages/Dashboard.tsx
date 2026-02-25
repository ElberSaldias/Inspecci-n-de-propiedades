import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, ClipboardCheck, Loader2, Clock, User } from 'lucide-react';
import { format, parse, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useInspectionStore } from '../store/useInspectionStore';
import type { Unit } from '../types';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const clearSession = useInspectionStore((state) => state.clearSession);
    const inspectorRut = useInspectionStore((state) => state.inspectorRut);
    const inspectorName = useInspectionStore((state) => state.inspectorName);
    const projects = useInspectionStore((state) => state.projects);
    const isLoadingData = useInspectionStore((state) => state.isLoadingData);
    const dataError = useInspectionStore((state) => state.dataError);

    const getUpcomingDeliveries = useInspectionStore((state) => state.getUpcomingDeliveries);
    const upcomingDeliveries = getUpcomingDeliveries();

    const handleStartProcess = () => {
        clearSession();
        navigate('/identify');
    };

    const handleSelectUnit = (unit: Unit) => {
        useInspectionStore.getState().setSelectedUnit(unit);
        navigate('/process');
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
                    <h1 className="text-2xl font-bold mb-1">Hola, {inspectorName || `Inspector ${inspectorRut}`}</h1>
                    <p className="text-primary-100 mb-6 font-medium">Tienes {upcomingDeliveries.length} entregas programadas en los próximos 14 días.</p>
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
                    Próximas entregas (14 días)
                </h2>

                {upcomingDeliveries.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                        <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500 font-medium whitespace-pre-wrap">No tienes entregas programadas en los próximos 14 días.</p>
                    </div>
                ) : (
                    <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
                        {upcomingDeliveries.map(unit => {
                            const project = projects.find(p => p.id === unit.projectId);
                            return (
                                <div key={unit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:border-primary-300 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="inline-flex items-center rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700 ring-1 ring-inset ring-primary-700/10 uppercase tracking-wide">
                                            {unit.processTypeLabel || unit.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-lg font-bold text-slate-900">Depto {unit.number}</span>
                                    </div>

                                    <h3 className="text-slate-900 font-bold mb-1 text-lg">{project?.name || 'Edificio no especificado'}</h3>

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
                                            <User size={16} className="mr-2 flex-shrink-0" />
                                            <span className="truncate">Cliente: <span className="font-bold text-slate-800">{unit.ownerName}</span></span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleSelectUnit(unit)}
                                        className="mt-4 w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-primary-700 transition-colors active:scale-[0.98]"
                                    >
                                        <span>Iniciar Proceso</span>
                                        <ArrowRight size={18} />
                                    </button>
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
