import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInspectionStore } from '../store/useInspectionStore';
import type { Unit } from '../types';
import { IdCard, Building2, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const inspectorRut = useInspectionStore((state) => state.inspectorRut);

    const setInspectorRut = useInspectionStore((state) => state.setInspectorRut);
    const setInspectorData = useInspectionStore((state) => state.setInspectorData);
    const setUnits = useInspectionStore((state) => state.setUnits);

    const [rutInput, setRutInput] = useState('');
    const dataError = useInspectionStore((state) => state.dataError);
    const [localError, setLocalError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // If already logged in, redirect to dashboard
    useEffect(() => {
        if (inspectorRut) {
            navigate('/');
        }
    }, [inspectorRut, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        // D) Diagnóstico temporal
        console.log("WEBAPP_URL:", import.meta.env.VITE_WEBAPP_URL);
        console.log("API_KEY exists:", !!import.meta.env.VITE_API_KEY);

        const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL;
        const API_KEY = import.meta.env.VITE_API_KEY;

        // A) / C) Validar configuración
        if (!WEBAPP_URL || !API_KEY) {
            setLocalError('Configuration Error');
            return;
        }

        if (!rutInput.trim()) {
            setLocalError('Por favor ingrese su RUT.');
            return;
        }

        try {
            setIsLoading(true);
            const normalizedRut = rutInput.replace(/[^0-9kK]/g, '').toUpperCase();

            // C) Llamar api("login", { rut })
            const login = await api("login", { rut: normalizedRut });

            if (!login.ok) {
                setLocalError(login.error || "RUT no encontrado");
                setIsLoading(false);
                return;
            }

            // C) si ok, usar user.email para llamar api("assignments", { email: user.email })
            const assignmentsResponse = await api("assignments", {
                email: login.user.email
            });

            if (!assignmentsResponse.ok) {
                setLocalError("Error obteniendo asignaciones");
                setIsLoading(false);
                return;
            }

            // Guardar usuario y asignaciones en estado global
            setInspectorRut(normalizedRut);
            setInspectorData(login.user);

            if (assignmentsResponse.data && Array.isArray(assignmentsResponse.data)) {
                const parsedUnits: Unit[] = assignmentsResponse.data.map((row: Record<string, unknown>) => ({
                    id: `unit-${row.edificio}-${row.departamento}`,
                    projectId: (row.edificio as string) || 'PROYECTO',
                    number: String(row.departamento || ''),
                    ownerName: (row.cliente as string) || 'Cliente',
                    ownerRut: '',
                    status: row.estado === 'Realizada' ? 'COMPLETED' : 'PENDING',
                    date: row.fecha as string,
                    time: row.hora as string,
                    processTypeLabel: row.tipo_proceso as string,
                    projectAddress: row.direccion as string,
                    edificio: row.edificio as string,
                    departamento: row.departamento as string,
                    direccion: row.direccion as string,
                    cliente: row.cliente as string,
                    estacionamiento: row.estacionamiento as string,
                    bodega: row.bodega as string
                }));
                setUnits(parsedUnits);
            } else {
                setUnits([]);
            }

            navigate('/');

        } catch (err) {
            const error = err as Error;
            console.error("Login Error:", error);
            if (error.message && error.message.includes("Configuration Error")) {
                setLocalError("Configuration Error");
            } else {
                setLocalError("Error de conexión con el servidor");
            }
        } finally {
            setIsLoading(false);
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
                                placeholder="Ejemplo: 12345678-9 o 12345678"
                                value={rutInput}
                                onChange={(e) => setRutInput(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {(localError || dataError) && (
                            <p className="mt-2 text-sm text-red-600 font-medium">
                                {localError || dataError}
                            </p>
                        )}
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
