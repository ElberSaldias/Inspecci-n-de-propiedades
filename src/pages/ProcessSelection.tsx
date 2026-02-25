import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInspectionStore } from '../store/useInspectionStore';
import { ClipboardList, CheckCircle } from 'lucide-react';

const ProcessSelection: React.FC = () => {
    const navigate = useNavigate();
    const selectedUnit = useInspectionStore((state) => state.selectedUnit);
    const setProcessType = useInspectionStore((state) => state.setProcessType);
    const updateSelectedUnit = useInspectionStore((state) => state.updateSelectedUnit);

    const [phone, setPhone] = useState(selectedUnit?.ownerPhone || '');
    const [email, setEmail] = useState(selectedUnit?.ownerEmail || '');
    const [rut, setRut] = useState(selectedUnit?.ownerRut || '');

    useEffect(() => {
        if (!selectedUnit) {
            navigate('/identify');
        }
    }, [selectedUnit, navigate]);

    const handleSelectProcess = (type: 'PRE_ENTREGA' | 'ENTREGA_FINAL') => {
        // Save the updated info before proceeding
        updateSelectedUnit({
            ownerPhone: phone,
            ownerEmail: email,
            ownerRut: rut
        });

        setProcessType(type);
        navigate(`/inspection/${selectedUnit?.id}`);
    };

    if (!selectedUnit) return null;

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300 max-w-2xl mx-auto w-full pt-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                    <div>
                        <p className="text-sm text-slate-500 font-medium mb-1">Cliente Confirmado</p>
                        <h2 className="text-xl font-bold text-slate-900">{selectedUnit.ownerName}</h2>
                        <p className="text-slate-600">Unidad {selectedUnit.number}</p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle size={24} />
                    </div>
                </div>

                {/* Editable Client Info Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 text-slate-500">Datos de Contacto</h3>

                    <div>
                        <label htmlFor="rut" className="block text-sm font-medium text-slate-700 mb-1" translate="no">RUT</label>
                        <input
                            type="text"
                            id="rut"
                            className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-slate-50 text-slate-900 transition-colors"
                            value={rut}
                            onChange={(e) => setRut(e.target.value)}
                            placeholder="Ej: 12345678-9"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                            <input
                                type="tel"
                                id="phone"
                                className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-slate-50 text-slate-900 transition-colors"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+56 9 1234 5678"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                            <input
                                type="email"
                                id="email"
                                className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-slate-50 text-slate-900 transition-colors"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="correo@ejemplo.com"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Paso 2: Selección de Proceso</h1>
                <p className="text-slate-500">
                    Por favor confirme o actualice sus datos y seleccione qué tipo de recorrido realizaremos hoy.
                </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                <button
                    onClick={() => handleSelectProcess('PRE_ENTREGA')}
                    className="flex flex-col items-center p-8 bg-white border-2 border-slate-200 rounded-2xl hover:border-primary-500 hover:bg-primary-50 transition-all text-center group active:scale-95 shadow-sm"
                >
                    <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                        <ClipboardList size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Pre-Entrega</h3>
                    <p className="text-slate-500">
                        Primer recorrido con el cliente para levantar observaciones y detalles antes de la entrega definitiva.
                    </p>
                </button>

                <button
                    onClick={() => handleSelectProcess('ENTREGA_FINAL')}
                    className="flex flex-col items-center p-8 bg-white border-2 border-slate-200 rounded-2xl hover:border-success-500 hover:bg-success-50 transition-all text-center group active:scale-95 shadow-sm"
                >
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 group-hover:bg-success-600 group-hover:text-white transition-colors">
                        <CheckCircle size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Entrega Final</h3>
                    <p className="text-slate-500">
                        Revisión final de observaciones (si existen) y firma del acta de recepción definitiva.
                    </p>
                </button>
            </div>
        </div>
    );
};

export default ProcessSelection;
