import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInspectionStore } from '../store/useInspectionStore';
import type { Unit } from '../types';
import { Calendar, Clock, ChevronRight, MapPin, User } from 'lucide-react';

const IdentifyUnit: React.FC = () => {
    const navigate = useNavigate();

    // Store
    const projects = useInspectionStore((state) => state.projects);
    const setSelectedUnit = useInspectionStore((state) => state.setSelectedUnit);
    const getUpcomingDeliveries = useInspectionStore((state) => state.getUpcomingDeliveries);

    const upcomingDeliveries = getUpcomingDeliveries();

    const getProjectForUnit = (unit: Unit) => {
        return projects.find(p => p.id === unit.projectId);
    };

    useEffect(() => {
        if (upcomingDeliveries.length === 1) {
            setSelectedUnit(upcomingDeliveries[0]);
            navigate('/process');
        }
    }, [upcomingDeliveries, setSelectedUnit, navigate]);

    const handleSelectUnit = (unit: Unit) => {
        setSelectedUnit(unit);
        navigate('/process');
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300 max-w-2xl mx-auto w-full pt-4 pb-20">
            <div className="text-center mb-6">
                <div className="bg-primary-100 text-primary-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Seleccionar propiedad programada</h1>
                <p className="text-slate-500">
                    Solo puedes iniciar procesos en propiedades que tengas agendadas para los próximos 14 días.
                </p>
            </div>

            {upcomingDeliveries.length > 0 ? (
                <div className="grid gap-5">
                    {upcomingDeliveries.map(unit => {
                        const project = getProjectForUnit(unit);
                        return (
                            <button
                                key={unit.id}
                                onClick={() => handleSelectUnit(unit)}
                                className="bg-white p-6 rounded-3xl shadow-sm border-2 border-slate-100 flex flex-col items-start text-left hover:border-primary-500 hover:shadow-lg transition-all active:scale-[0.98] group overflow-hidden relative"
                            >
                                <div className="flex justify-between w-full mb-4">
                                    <span className="inline-flex items-center rounded-lg bg-primary-100 px-3 py-1 text-xs font-bold text-primary-700 uppercase tracking-widest">
                                        {unit.processTypeLabel || 'INSPECCIÓN'}
                                    </span>
                                    <div className="text-right">
                                        <div className="text-primary-600 font-bold text-xs flex items-center justify-end">
                                            <Clock size={14} className="mr-1" />
                                            <span className="capitalize">{unit.date} · {unit.time || '--:--'}</span>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Proyecto</h3>
                                <p className="text-lg font-bold text-slate-900 mb-4 leading-tight">{project?.name || 'Edificio no especificado'}</p>

                                <div className="grid grid-cols-3 gap-4 w-full mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Depto</span>
                                        <span className="text-base font-bold text-slate-800">{unit.number}</span>
                                    </div>
                                    {unit.parking && (
                                        <div>
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Estac</span>
                                            <span className="text-base font-bold text-slate-800">{unit.parking}</span>
                                        </div>
                                    )}
                                    {unit.storage && (
                                        <div>
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Bodega</span>
                                            <span className="text-base font-bold text-slate-800">{unit.storage}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 w-full text-slate-600">
                                    <div className="flex items-center text-sm">
                                        <MapPin size={14} className="mr-2 text-slate-400" />
                                        <span className="truncate">{project?.address || unit.projectAddress || 'Sin Dirección'}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <User size={14} className="mr-2 text-slate-400" />
                                        <span className="font-medium text-slate-800">Prop: <span className="font-bold">{unit.ownerName}</span></span>
                                    </div>
                                </div>

                                <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-primary-600 text-white p-2 rounded-full shadow-md">
                                        <ChevronRight size={24} />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-500">
                    <Calendar className="mx-auto text-slate-300 mb-4" size={50} />
                    <p className="font-medium">No tienes entregas programadas en los próximos 14 días.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-6 text-primary-600 font-bold text-sm hover:underline"
                    >
                        Volver al Dashboard
                    </button>
                </div>
            )}
        </div>
    );
};

export default IdentifyUnit;
