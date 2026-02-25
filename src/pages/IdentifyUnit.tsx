import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInspectionStore } from '../store/useInspectionStore';
import { Search, UserCheck, Building } from 'lucide-react';

const IdentifyUnit: React.FC = () => {
    const navigate = useNavigate();

    // Store
    const inspectorRut = useInspectionStore((state) => state.inspectorRut);
    const inspectorName = useInspectionStore((state) => state.inspectorName);
    const units = useInspectionStore((state) => state.units);
    const projects = useInspectionStore((state) => state.projects);
    const setSelectedUnit = useInspectionStore((state) => state.setSelectedUnit);

    // Local state for Search Step
    const initialProjectId = projects.length > 0 ? projects[0].id : '';
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const activeProject = selectedProjectId || initialProjectId;

    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');



    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!searchTerm.trim()) {
            setError('Ingrese un número de departamento o RUT válido.');
            return;
        }

        const term = searchTerm.toLowerCase().trim();
        const unit = units.find(
            (u) => u.projectId === activeProject && (u.number.toLowerCase() === term || u.ownerRut.toLowerCase() === term || u.ownerName.toLowerCase().includes(term))
        );

        if (unit) {
            setSelectedUnit(unit);
            navigate('/process');
        } else {
            setError('No se encontró ninguna unidad o cliente asociado a esta búsqueda en el proyecto seleccionado.');
        }
    };



    // --- STEP 2: UNIT SEARCH ---
    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300 max-w-lg mx-auto w-full pt-4">
            <div className="text-center mb-6">
                <div className="bg-primary-100 text-primary-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Paso 2: Buscar Unidad</h1>
                <p className="text-slate-500">
                    Seleccione el proyecto e ingrese el número del departamento o RUT del cliente para comenzar el proceso.
                </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex justify-between items-center text-sm">
                <div>
                    <span className="text-blue-700 font-medium block">Inspector Activo:</span>
                    <span className="text-blue-900 font-medium">{inspectorName || inspectorRut}</span>
                </div>
            </div>

            <form onSubmit={handleSearch} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="mb-4">
                    <label htmlFor="project" className="block text-sm font-medium text-slate-700 mb-2">
                        Proyecto
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Building className="text-slate-400" size={20} />
                        </div>
                        <select
                            id="project"
                            className="block w-full pl-11 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-primary-500 bg-slate-50 transition-colors text-lg appearance-none"
                            value={activeProject}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <label htmlFor="search" className="block text-sm font-medium text-slate-700 mb-2">
                        Número de Unidad o RUT del Cliente
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <UserCheck className="text-slate-400" size={20} />
                        </div>
                        <input
                            type="text"
                            id="search"
                            className="block w-full pl-11 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-primary-500 bg-slate-50 transition-colors text-lg"
                            placeholder="Ejemplo: 101 o 12345678-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
                </div>

                <button
                    type="submit"
                    className="w-full bg-primary-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-primary-700 transition-colors active:scale-95 shadow-sm text-lg"
                >
                    Buscar cliente
                </button>
            </form>

            <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                <p className="font-semibold mb-1">💡 Datos de prueba (Mock):</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Proyecto 1 - Depto: "101" / RUT: "12345678-9"</li>
                    <li>Proyecto 2 - Depto: "B-20" / RUT: "33333333-3"</li>
                </ul>
            </div>
        </div>
    );
};

export default IdentifyUnit;
