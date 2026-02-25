import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInspectionStore } from '../store/useInspectionStore';
import { IdCard, Building2, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const inspectorRut = useInspectionStore((state) => state.inspectorRut);
    const validateLogin = useInspectionStore((state) => state.validateLogin);

    const [rutInput, setRutInput] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // If already logged in, redirect to dashboard
    useEffect(() => {
        if (inspectorRut) {
            navigate('/');
        }
    }, [inspectorRut, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!rutInput.trim()) {
            setError('Ingrese un RUT o Email válido.');
            return;
        }

        setIsLoading(true);
        const isValid = await validateLogin(rutInput);
        setIsLoading(false);

        if (isValid) {
            navigate('/');
        } else {
            setError('Usuario no autorizado o no encontrado en la base de datos.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center space-x-2 text-primary-600 mb-6">
                        <Building2 size={40} />
                        <span className="text-3xl font-bold tracking-tight text-slate-900">InmobApp</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Ingreso de Inspector</h1>
                    <p className="text-slate-500">
                        Por favor ingrese su RUT para acceder a sus entregas pendientes.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="mb-6">
                        <label htmlFor="inspector-rut" className="block text-sm font-medium text-slate-700 mb-2">
                            RUT del Inspector
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <IdCard className="text-slate-400" size={20} />
                            </div>
                            <input
                                type="text"
                                id="inspector-rut"
                                className="block w-full pl-11 pr-4 py-4 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-primary-500 bg-slate-50 transition-colors text-lg"
                                placeholder="Ejemplo: 12345678-9"
                                value={rutInput}
                                onChange={(e) => setRutInput(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-primary-700 transition-colors active:scale-95 shadow-sm text-lg disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={24} />
                                <span>Validando usuario...</span>
                            </>
                        ) : (
                            <span>Ingresar</span>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-slate-400">
                    &copy; {new Date().getFullYear()} InmobApp v1.0.0
                </div>
            </div>
        </div>
    );
};

export default Login;
