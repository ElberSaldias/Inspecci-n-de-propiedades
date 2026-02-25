import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useInspectionStore } from '../store/useInspectionStore';
import type { Unit, ProcessType } from '../types';
import { Calendar, Clock, ChevronRight, MapPin, User, CheckCircle, AlertCircle } from 'lucide-react';

const IdentifyUnit: React.FC = () => {
    const navigate = useNavigate();

    // Store
    const inspectorName = useInspectionStore((state) => state.inspectorName);
    const inspectorRut = useInspectionStore((state) => state.inspectorRut);
    const projects = useInspectionStore((state) => state.projects);
    const getUpcomingDeliveries = useInspectionStore((state) => state.getUpcomingDeliveries);

    const upcomingDeliveries = getUpcomingDeliveries();

    const getProjectForUnit = (unit: Unit) => {
        return projects.find(p => p.id === unit.projectId);
    };

    const handleSelectUnit = (unit: Unit) => {
        if (unit.isHandoverGenerated) {
            alert('Esta unidad ya cuenta con acta generada. Ver detalle en el Dashboard.');
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

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300 max-w-5xl mx-auto w-full pt-4 pb-20">
            <div className="text-center mb-6">
                <div className="bg-primary-100 text-primary-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Seleccionar Propiedad Programada</h1>
                <p className="text-slate-500">Paso 2: Identificación de propiedad asignada</p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-8 flex justify-between items-center text-sm shadow-sm">
                <div>
                    <span className="text-blue-700 font-bold block uppercase tracking-tight text-[10px] mb-0.5">Inspector Activo</span>
                    <span className="text-blue-900 font-bold text-base">{inspectorName || inspectorRut}</span>
                </div>
            </div>

            <div className="mb-6">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Unidades programadas (próximos 14 días)</h2>

                {upcomingDeliveries.length > 0 ? (
                    <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
                        {upcomingDeliveries.map(unit => {
                            const project = getProjectForUnit(unit);
                            const isGenerated = unit.isHandoverGenerated;
                            const isEnProceso = unit.procesoStatus === 'EN_PROCESO';
                            const isRealizada = unit.procesoStatus === 'REALIZADA';
                            const isCancelada = unit.procesoStatus === 'CANCELADA';
                            const isBlocked = isGenerated || isRealizada || isCancelada;

                            return (
                                <button
                                    key={unit.id}
                                    onClick={() => handleSelectUnit(unit)}
                                    disabled={isBlocked}
                                    className={`bg-white p-6 rounded-3xl shadow-sm border-2 ${isBlocked ? 'border-slate-50 opacity-60 cursor-not-allowed bg-slate-50/10' : isEnProceso ? 'border-amber-200 bg-amber-50/5 hover:border-amber-500' : 'border-slate-100 hover:border-primary-500 hover:shadow-lg active:scale-[0.98]'} flex flex-col items-start text-left transition-all group relative overflow-hidden`}
                                >
                                    <div className="flex justify-between w-full mb-3">
                                        <div className="flex flex-col space-y-1">
                                            <span className="inline-flex items-center rounded-lg bg-primary-100 px-3 py-1 text-[10px] font-bold text-primary-700 uppercase tracking-widest">
                                                {unit.processTypeLabel || 'INSPECCIÓN'}
                                            </span>
                                            {isGenerated && (
                                                <span className="inline-flex items-center rounded-lg bg-green-50 px-3 py-1 text-[10px] font-bold text-green-700 uppercase tracking-widest ring-1 ring-inset ring-green-600/10">
                                                    ACTA GENERADA
                                                </span>
                                            )}
                                            {isEnProceso && (
                                                <span className="inline-flex items-center rounded-lg bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700 uppercase tracking-widest ring-1 ring-inset ring-amber-600/10">
                                                    EN PROCESO
                                                </span>
                                            )}
                                            {isRealizada && !isGenerated && (
                                                <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest ring-1 ring-inset ring-slate-400/20">
                                                    PROCESO REALIZADO
                                                </span>
                                            )}
                                            {isCancelada && (
                                                <span className="inline-flex items-center rounded-lg bg-red-50 px-3 py-1 text-[10px] font-bold text-red-700 uppercase tracking-widest ring-1 ring-inset ring-red-600/10">
                                                    CANCELADA
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-primary-600 font-bold text-xs flex items-center">
                                            <Clock size={14} className="mr-1" />
                                            <span className="capitalize">{unit.date} · {unit.time || '--:--'}</span>
                                        </div>
                                    </div>

                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Proyecto: {project?.name || 'Edificio'}</p>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                                        Depto: {unit.number}
                                        {unit.parking && ` | Estac: ${unit.parking}`}
                                        {unit.storage && ` | Bod: ${unit.storage}`}
                                    </h3>

                                    <div className="space-y-1.5 w-full pt-2 border-t border-slate-50 mt-1">
                                        <div className="flex items-center text-sm text-slate-500">
                                            <MapPin size={14} className="mr-2 flex-shrink-0" />
                                            <span className="truncate">{project?.address || unit.projectAddress || 'Sin dirección'}</span>
                                        </div>
                                        <div className="flex items-center text-sm">
                                            <User size={14} className="mr-2 flex-shrink-0 text-slate-400" />
                                            <span className="text-slate-700 font-medium">Cliente: <span className="font-bold text-slate-900">{unit.ownerName}</span></span>
                                        </div>
                                    </div>

                                    {!isBlocked && (
                                        <div className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-200 group-hover:text-primary-500 transition-colors">
                                            <ChevronRight size={32} />
                                        </div>
                                    )}

                                    {isGenerated && (
                                        <div className="absolute top-1/2 right-4 -translate-y-1/2 text-green-200">
                                            <CheckCircle size={32} />
                                        </div>
                                    )}

                                    {isRealizada && !isGenerated && (
                                        <div className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-200">
                                            <CheckCircle size={32} />
                                        </div>
                                    )}

                                    {isCancelada && (
                                        <div className="absolute top-1/2 right-4 -translate-y-1/2 text-red-200">
                                            <AlertCircle size={32} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-500">
                        <Calendar className="mx-auto text-slate-300 mb-4" size={50} />
                        <p className="font-medium">No tienes unidades programadas para los próximos 14 días.</p>
                        <button
                            onClick={() => navigate('/')}
                            className="mt-6 text-primary-600 font-bold text-sm hover:underline"
                        >
                            Volver al Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IdentifyUnit;
