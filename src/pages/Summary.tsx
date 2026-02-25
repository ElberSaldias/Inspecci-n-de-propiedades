import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInspectionStore } from '../store/useInspectionStore';
import { standardRooms } from '../data/mockData';
import { ChevronRight } from 'lucide-react';

const Summary: React.FC = () => {
    const navigate = useNavigate();
    const { selectedUnit, observations } = useInspectionStore();

    useEffect(() => {
        if (!selectedUnit) {
            navigate('/identify');
        }
    }, [selectedUnit, navigate]);

    if (!selectedUnit) return null;

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300 max-w-2xl mx-auto w-full pt-4">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Resumen de Inspección</h1>
                <p className="text-slate-500">
                    Revisa las observaciones ingresadas antes de proceder a la firma del acta.
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800">Ctd. de Observaciones por Recinto</h2>
                    <span className="bg-primary-100 text-primary-700 font-bold px-3 py-1 rounded-full text-sm">
                        Total: {observations.length}
                    </span>
                </div>

                {observations.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        No se registraron observaciones. La unidad está conforme.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {standardRooms.map(room => {
                            const roomObs = observations.filter(o => o.roomId === room.id);
                            if (roomObs.length === 0) return null;

                            return (
                                <div key={room.id} className="p-4 sm:p-6">
                                    <h3 className="font-bold text-slate-900 mb-3">{room.name}</h3>
                                    <ul className="space-y-2">
                                        {roomObs.map((obs, index) => (
                                            <li key={obs.id} className="flex gap-3 text-slate-700">
                                                <span className="text-slate-400 font-medium">{index + 1}.</span>
                                                <span>{obs.description}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex gap-4">
                <button
                    onClick={() => navigate(`/inspection/${selectedUnit.id}`)}
                    className="flex-1 bg-white text-slate-700 font-semibold py-4 px-6 rounded-xl hover:bg-slate-50 border border-slate-200 transition-colors"
                >
                    Volver a Inspección
                </button>
                <button
                    onClick={() => navigate(`/sign/${selectedUnit.id}`)}
                    className="flex-1 bg-success-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-success-700 transition-colors flex justify-center items-center gap-2"
                >
                    <span>Ir a Firmas</span>
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default Summary;
