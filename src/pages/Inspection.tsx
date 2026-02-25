import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInspectionStore } from '../store/useInspectionStore';
import { standardRooms } from '../data/mockData';
import { Plus, Camera, X, ClipboardList } from 'lucide-react';
import clsx from 'clsx';

const Inspection: React.FC = () => {
    const navigate = useNavigate();
    const { selectedUnit, processType, observations, addObservation } = useInspectionStore();
    const [activeRoomId, setActiveRoomId] = useState(standardRooms[0].id);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newObsDesc, setNewObsDesc] = useState('');

    useEffect(() => {
        if (!selectedUnit || !processType) {
            navigate('/identify');
        }
    }, [selectedUnit, processType, navigate]);

    const handleAddObservation = (e: React.FormEvent) => {
        e.preventDefault();
        if (newObsDesc.trim()) {
            addObservation({
                unitId: selectedUnit!.id,
                roomId: activeRoomId,
                description: newObsDesc,
                status: 'OPEN',
            });
            setNewObsDesc('');
            setIsModalOpen(false);
        }
    };

    if (!selectedUnit) return null;

    const roomObservations = observations.filter(o => o.roomId === activeRoomId);

    return (
        <div className="flex flex-col h-full h-[calc(100vh-8rem)]">
            {/* Header Info */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 flex justify-between items-center shrink-0">
                <div>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mb-1">
                        {processType === 'PRE_ENTREGA' ? 'Pre-Entrega' : 'Entrega Final'}
                    </span>
                    <h2 className="text-lg font-bold text-slate-900">Depto {selectedUnit.number}</h2>
                </div>
                <button
                    onClick={() => navigate(`/summary/${selectedUnit.id}`)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
                >
                    Ver Resumen
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200">
                {/* Sidebar: Rooms List */}
                <div className="w-1/3 sm:w-1/4 min-w-[120px] bg-slate-50 border-r border-slate-200 overflow-y-auto">
                    {standardRooms.map((room) => {
                        const obsCount = observations.filter(o => o.roomId === room.id).length;
                        const isActive = activeRoomId === room.id;
                        return (
                            <button
                                key={room.id}
                                onClick={() => setActiveRoomId(room.id)}
                                className={clsx(
                                    "w-full text-left p-4 border-b border-slate-200 transition-colors relative flex justify-between items-center",
                                    isActive ? "bg-white text-primary-600 font-semibold" : "text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600" />}
                                <span className="text-sm sm:text-base pr-2">{room.name}</span>
                                {obsCount > 0 && (
                                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
                                        {obsCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Main Area: Room Details & Observations */}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <h3 className="text-xl font-bold text-slate-800">
                            {standardRooms.find(r => r.id === activeRoomId)?.name}
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24">
                        {roomObservations.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <ClipboardList size={48} className="mb-4 opacity-50" />
                                <p>No hay observaciones en este recinto.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {roomObservations.map((obs) => (
                                    <div key={obs.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex gap-4">
                                        <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center shrink-0 text-slate-400">
                                            <Camera size={24} />
                                        </div>
                                        <div>
                                            <p className="text-slate-800">{obs.description}</p>
                                            <span className="inline-block mt-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                                                {obs.status === 'OPEN' ? 'Por reparar' : obs.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Floating Action Button */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="absolute bottom-6 right-6 bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 hover:scale-105 transition-transform flex items-center justify-center"
                        aria-label="Agregar Observación"
                    >
                        <Plus size={28} />
                    </button>
                </div>
            </div>

            {/* Add Observation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Nueva Observación</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddObservation} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Descripción del problema</label>
                                <textarea
                                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                                    rows={4}
                                    placeholder="Ej: Pintura descascarada en el muro derecho..."
                                    value={newObsDesc}
                                    onChange={(e) => setNewObsDesc(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="mb-6">
                                <button
                                    type="button"
                                    className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 text-slate-500 hover:bg-slate-50 hover:border-primary-400 hover:text-primary-600 transition-colors flex flex-col items-center justify-center gap-2"
                                >
                                    <Camera size={24} />
                                    <span className="font-medium">Tomar o subir foto</span>
                                </button>
                            </div>
                            <button
                                type="submit"
                                disabled={!newObsDesc.trim()}
                                className="w-full bg-primary-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Guardar Observación
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inspection;
