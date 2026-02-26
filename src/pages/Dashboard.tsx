import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Loader2, Clock, User, FileText, LayoutGrid, List } from 'lucide-react';
import { format, parse, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useInspectionStore } from '../store/useInspectionStore';
import type { Unit } from '../types';
import { api } from '../lib/api';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const inspectorRut = useInspectionStore((state) => state.inspectorRut);
    const inspectorEmail = useInspectionStore((state) => state.inspectorEmail);
    const inspectorName = useInspectionStore((state) => state.inspectorName);
    const units = useInspectionStore((state) => state.units);
    const isLoadingData = useInspectionStore((state) => state.isLoadingData);
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

    // 6️⃣ Seguridad: Redirigir al login si no existe usuario autenticado
    useEffect(() => {
        if (!inspectorRut) {
            navigate('/login');
        }
    }, [inspectorRut, navigate]);

    // 3️⃣ Función Generar Acta
    async function generarActa(asignacion: Unit) {
        try {
            setIsGenerating(asignacion.id);
            const response = await api("generate_acta", {
                payload: {
                    PROYECTO: asignacion.edificio || asignacion.projectId,
                    DEPTO: asignacion.departamento || asignacion.number,
                    DIRECCION: asignacion.direccion || asignacion.projectAddress,
                    COMUNA: "Santiago",
                    FECHA_ACTA: new Date().toLocaleDateString(),
                    PROPIETARIO_NOMBRE: asignacion.cliente || asignacion.ownerName,
                    PROPIETARIO_RUT: asignacion.ownerRut || "",
                    TELEFONO: asignacion.ownerPhone || "",
                    EMAIL: asignacion.ownerEmail || "",
                    ESTACIONAMIENTOS: asignacion.estacionamiento || asignacion.parking,
                    BODEGAS: asignacion.bodega || asignacion.storage
                }
            });

            if (response.ok) {
                window.open(response.pdfUrl, "_blank");
            } else {
                alert("Error generando acta: " + (response.error || "Error desconocido"));
            }
        } catch (err) {
            console.error(err);
            alert("Error de conexión al generar acta");
        } finally {
            setIsGenerating(null);
        }
    }

    const formatDeliveryDate = (dateStr: string, timeStr?: string) => {
        if (!dateStr) return 'Sin fecha';
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
                <p className="text-slate-500 font-medium">Cargando asignaciones...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6 animate-in fade-in duration-300">
            {/* Header / Banner */}
            <div className="bg-primary-600 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Panel de Control</h1>
                    <p className="text-primary-100 text-lg font-medium">
                        Bienvenido, <span className="text-white font-bold">{inspectorName || inspectorEmail}</span>
                    </p>
                    <div className="mt-4 inline-flex bg-primary-700/50 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold border border-primary-500/30">
                        {units.length} Asignaciones Pendientes
                    </div>
                </div>
                <div className="absolute top-0 right-0 -mx-10 -my-10 opacity-10">
                    <FileText size={240} />
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex justify-between items-center bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 ml-4">Listado de Asignaciones</h2>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <List size={18} />
                        <span className="text-sm">Tabla</span>
                    </button>
                    <button
                        onClick={() => setViewMode('cards')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-primary-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutGrid size={18} />
                        <span className="text-sm">Tarjetas</span>
                    </button>
                </div>
            </div>

            {units.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center shadow-sm">
                    <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="text-slate-300" size={48} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">No tienes asignaciones</h3>
                    <p className="text-slate-500 font-medium max-w-xs mx-auto">
                        Actualmente no tienes procesos programados para realizar.
                    </p>
                </div>
            ) : viewMode === 'table' ? (
                /* 7️⃣ Tabla de asignaciones responsive */
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Proyecto / Unidad</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha / Hora</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {units.map((unit) => (
                                    <tr key={unit.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-slate-900">{unit.edificio || unit.projectId}</div>
                                            <div className="text-sm text-slate-500 font-medium">Depto {unit.number}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center text-slate-700 font-semibold text-sm">
                                                <Clock size={14} className="mr-2 text-primary-500" />
                                                {formatDeliveryDate(unit.date || '', unit.time)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center text-slate-700 font-bold text-sm">
                                                <User size={14} className="mr-2 text-slate-400" />
                                                {unit.cliente || unit.ownerName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <button
                                                onClick={() => generarActa(unit)}
                                                disabled={isGenerating === unit.id}
                                                className="inline-flex items-center space-x-2 bg-primary-600 text-white font-bold py-2.5 px-5 rounded-xl hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50 shadow-sm shadow-primary-100"
                                            >
                                                {isGenerating === unit.id ? (
                                                    <Loader2 className="animate-spin" size={18} />
                                                ) : (
                                                    <FileText size={18} />
                                                )}
                                                <span>Generar Acta</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Card View Mode */
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {units.map((unit) => (
                        <div key={unit.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-[10px] font-black text-primary-700 ring-1 ring-inset ring-primary-700/10 uppercase tracking-widest">
                                    {unit.processTypeLabel || 'INSPECCIÓN'}
                                </span>
                                <span className="text-2xl font-black text-slate-900">#{unit.number}</span>
                            </div>

                            <h3 className="text-slate-900 font-bold mb-1 text-xl leading-tight truncate">
                                {unit.edificio || unit.projectId}
                            </h3>

                            <div className="space-y-3 mt-4 flex-grow">
                                <div className="flex items-center text-primary-600 font-bold text-sm bg-primary-50/50 p-3 rounded-2xl">
                                    <Clock size={18} className="mr-3" />
                                    <span className="capitalize">{formatDeliveryDate(unit.date || '', unit.time)}</span>
                                </div>

                                <div className="flex items-start text-slate-500 text-sm p-1">
                                    <MapPin size={18} className="mr-3 mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2">{unit.direccion || unit.projectAddress || 'Sin Dirección'}</span>
                                </div>

                                <div className="flex items-center text-slate-600 text-sm p-1">
                                    <User size={18} className="mr-3 flex-shrink-0 text-slate-400" />
                                    <span className="truncate">Cliente: <span className="font-bold text-slate-900">{unit.cliente || unit.ownerName}</span></span>
                                </div>
                            </div>

                            <button
                                onClick={() => generarActa(unit)}
                                disabled={isGenerating === unit.id}
                                className="mt-6 w-full bg-primary-600 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center space-x-2 hover:bg-primary-700 transition-all active:scale-[0.98] shadow-lg shadow-primary-200 disabled:opacity-50"
                            >
                                {isGenerating === unit.id ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <FileText size={20} />
                                )}
                                <span>Generar Acta</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
