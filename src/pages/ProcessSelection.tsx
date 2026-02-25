import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInspectionStore } from '../store/useInspectionStore';
import { UserCheck, Building, AlertCircle, ArrowRight } from 'lucide-react';


const ProcessSelection: React.FC = () => {
    const navigate = useNavigate();
    const selectedUnit = useInspectionStore((state) => state.selectedUnit);
    const projects = useInspectionStore((state) => state.projects);
    const setProcessType = useInspectionStore((state) => state.setProcessType);
    const updateSelectedUnit = useInspectionStore((state) => state.updateSelectedUnit);
    const validateRut = useInspectionStore((state) => state.validateRut);

    const project = projects.find(p => p.id === selectedUnit?.projectId);

    const [name, setName] = useState(selectedUnit?.ownerName || '');
    const [phone, setPhone] = useState(selectedUnit?.ownerPhone || '');
    const [email, setEmail] = useState(selectedUnit?.ownerEmail || '');
    const [rut, setRut] = useState(selectedUnit?.ownerRut || '');

    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        if (!selectedUnit) {
            navigate('/identify');
            return;
        }

        if (selectedUnit.isHandoverGenerated) {
            alert('Esta unidad ya cuenta con acta generada.');
            navigate('/');
        }
    }, [selectedUnit, navigate]);

    const handleConfirm = () => {
        setValidationError('');

        // 1. Mandatory Fields
        if (!name.trim() || !rut.trim() || !phone.trim() || !email.trim()) {
            setValidationError('Por favor, complete todos los campos obligatorios.');
            return;
        }

        // 2. RUT Validation
        if (!validateRut(rut)) {
            setValidationError('El RUT ingresado no es válido. Por favor verifique.');
            return;
        }

        // 3. Phone Validation (Basic check for +56 9 ...)
        const cleanPhone = phone.replace(/\s/g, '');
        if (!cleanPhone.startsWith('+569') || cleanPhone.length !== 12) {
            setValidationError('El teléfono debe tener el formato +56 9 XXXX XXXX (12 caracteres).');
            return;
        }

        // 4. Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setValidationError('El correo electrónico no tiene un formato válido.');
            return;
        }

        // Detect Process Type from Label
        let type: 'PRE_ENTREGA' | 'ENTREGA_FINAL' = 'PRE_ENTREGA';
        const label = (selectedUnit?.processTypeLabel || '').toUpperCase();
        if (label.includes('FINA') || label.includes('ENTREGA') && !label.includes('PRE')) {
            type = 'ENTREGA_FINAL';
        }

        // Save everything
        updateSelectedUnit({
            ownerName: name,
            ownerPhone: phone,
            ownerEmail: email,
            ownerRut: rut
        });

        setProcessType(type);
        navigate(`/inspection/${selectedUnit?.id}`);
    };

    if (!selectedUnit) return null;

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300 max-w-2xl mx-auto w-full pt-4 pb-20">
            <div className="text-center mb-8">
                <div className="bg-primary-100 text-primary-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserCheck size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Paso 3: Datos del Cliente</h1>
                <p className="text-slate-500">
                    Confirme los datos que aparecerán en el acta de inspección.
                </p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8 overflow-hidden">
                <div className="bg-slate-50 -mx-6 -mt-6 p-6 mb-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Propiedad Seleccionada</p>
                        <h2 className="text-lg font-bold text-slate-900 leading-tight">
                            {project?.name || 'Edificio'} · Depto {selectedUnit.number}
                        </h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {selectedUnit.parking && (
                                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600 uppercase">Estac: {selectedUnit.parking}</span>
                            )}
                            {selectedUnit.storage && (
                                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600 uppercase">Bodega: {selectedUnit.storage}</span>
                            )}
                        </div>
                        <p className="text-primary-600 text-sm font-bold mt-2">Agendada: {selectedUnit.date} · {selectedUnit.time} hrs</p>
                    </div>
                    <div className="h-12 w-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center border border-primary-100">
                        <Building size={24} />
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Nombre Completo</label>
                        <input
                            type="text"
                            className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-inner text-slate-900 font-medium"
                            placeholder="Nombre del propietario"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">RUT</label>
                        <input
                            type="text"
                            className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-inner text-slate-900 font-medium"
                            placeholder="12.345.678-9"
                            value={rut}
                            onChange={(e) => setRut(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Teléfono</label>
                            <input
                                type="tel"
                                className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-inner text-slate-900 font-medium"
                                placeholder="+56 9 XXXX XXXX"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email</label>
                            <input
                                type="email"
                                className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white shadow-inner text-slate-900 font-medium"
                                placeholder="usuario@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {validationError && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-600 text-sm font-bold animate-in slide-in-from-top-2">
                        <AlertCircle className="mr-2 flex-shrink-0" size={18} />
                        {validationError}
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={() => navigate('/identify')}
                    className="flex-1 bg-white border-2 border-slate-200 text-slate-600 font-bold py-4 px-8 rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                    Volver
                </button>
                <button
                    onClick={handleConfirm}
                    className="flex-[2] bg-primary-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:bg-primary-700 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                    <span>Confirmar y continuar</span>
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default ProcessSelection;
