import { create } from 'zustand';
import type { Observation, ProcessType, Unit, Project } from '../types';
import { isToday, isValid, addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { APPS_SCRIPT_URL } from '../config';
import { fetchJSON } from '../apiClient';

interface InspectionState {
    inspectorRut: string | null;
    inspectorName: string | null;
    inspectorEmail: string | null;
    inspectorRole: string | null;
    selectedUnit: Unit | null;
    processType: ProcessType | null;
    observations: Observation[];
    units: Unit[];
    projects: Project[];
    isLoadingData: boolean;
    dataError: string | null;
    connectionStatus: 'IDLE' | 'CHECKING' | 'CONNECTED' | 'ERROR';

    // Actions
    setInspectorRut: (rut: string | null) => void;
    setInspectorData: (data: { nombre: string; email: string; rol: string }) => void;
    setUnits: (units: Unit[]) => void;
    setSelectedUnit: (unit: Unit | null) => void;
    updateSelectedUnit: (updates: Partial<Unit>) => void;
    setProcessType: (type: ProcessType | null) => void;
    addObservation: (observation: Omit<Observation, 'id'>) => void;
    removeObservation: (id: string) => void;
    updateObservationStatus: (id: string, status: Observation['status']) => void;
    clearSession: () => void;
    logout: () => void;
    fetchData: () => Promise<void>;
    validateLogin: (input: string) => Promise<boolean>;
    submitInspection: (extra?: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; pdf_url?: string }>;
    startProcess: (unit: Unit, processType: ProcessType) => Promise<{ ok: boolean; process_id?: string; error?: string }>;
    getActaStatus: (unit: Unit) => Promise<{ ok: boolean; has_acta: boolean; pdf_url?: string; view_url?: string }>;
    getDailyAgenda: () => Unit[];
    getUpcomingDeliveries: () => Unit[];
    getProjectsFromAgenda: () => Project[];
    validateRut: (rut: string) => boolean;
    checkConnection: () => Promise<boolean>;
}

const getDeviceId = () => {
    let id = localStorage.getItem('deviceId');
    if (!id) {
        id = `dev-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
        localStorage.setItem('deviceId', id);
    }
    return id;
};

export const useInspectionStore = create<InspectionState>((set, get) => ({
    inspectorRut: null,
    inspectorName: null,
    inspectorEmail: null,
    inspectorRole: null,
    selectedUnit: null,
    processType: null,
    observations: [],
    units: [],
    projects: [],
    isLoadingData: false,
    dataError: null,
    connectionStatus: 'IDLE',

    validateRut: (rut: string) => {
        const cleanRut = rut.replace(/[^0-9kK]/g, '');
        if (cleanRut.length < 2) return false;
        const num = cleanRut.slice(0, -1);
        const dv = cleanRut.slice(-1).toUpperCase();
        if (!num || !dv) return false;
        let sum = 0;
        let mul = 2;
        for (let i = num.length - 1; i >= 0; i--) {
            sum += parseInt(num[i]) * mul;
            mul = mul === 7 ? 2 : mul + 1;
        }
        const res = 11 - (sum % 11);
        const calculatedDv = res === 11 ? '0' : res === 10 ? 'K' : res.toString();
        return calculatedDv === dv;
    },

    setInspectorRut: (rut: string | null) => set({ inspectorRut: rut }),
    setInspectorData: (data: { nombre: string; email: string; rol: string }) => set({
        inspectorName: data.nombre,
        inspectorEmail: data.email,
        inspectorRole: data.rol
    }),
    setUnits: (units: Unit[]) => set({ units }),
    setSelectedUnit: (unit: Unit | null) => set({ selectedUnit: unit }),
    updateSelectedUnit: (updates: Partial<Unit>) => set((state) => ({
        selectedUnit: state.selectedUnit ? { ...state.selectedUnit, ...updates } : null
    })),
    setProcessType: (type: ProcessType | null) => set({ processType: type }),
    addObservation: (obs: Omit<Observation, 'id'>) => set((state) => ({
        observations: [
            ...state.observations,
            { ...obs, id: Math.random().toString(36).substr(2, 9) }
        ]
    })),
    removeObservation: (id: string) => set((state) => ({
        observations: state.observations.filter(o => o.id !== id)
    })),
    updateObservationStatus: (id: string, status: Observation['status']) => set((state) => ({
        observations: state.observations.map(o => o.id === id ? { ...o, status } : o)
    })),
    clearSession: () => set({ selectedUnit: null, processType: null, observations: [] }),
    logout: () => set({
        inspectorRut: null, inspectorName: null, inspectorEmail: null, inspectorRole: null,
        selectedUnit: null, processType: null, observations: [], units: [], projects: [],
        connectionStatus: 'IDLE'
    }),

    checkConnection: async () => {
        set({ connectionStatus: 'CHECKING' });
        try {
            // Usar POST sin headers para evitar preflight
            const data = await fetchJSON(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'health', t: Date.now() })
            });

            if (data.ok) {
                set({ connectionStatus: 'CONNECTED' });
                return true;
            }
            throw new Error(data.message || 'Sin conexión con base de datos');
        } catch (error: unknown) {
            console.error('Health Check Failed:', error);
            set({ connectionStatus: 'ERROR' });
            return false;
        }
    },

    validateLogin: async (input: string) => {
        set({ isLoadingData: true, dataError: null });
        try {
            // Limpiar RUT (solo números y K)
            const normalizedRut = input.trim().replace(/[^0-9kK]/g, '').toUpperCase();

            const data = await fetchJSON(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'login',
                    rut: normalizedRut,
                    email: input.includes('@') ? input.trim().toLowerCase() : undefined
                })
            });

            if (data.ok && data.user) {
                const user = data.user;
                set({
                    inspectorRut: normalizedRut,
                    inspectorName: user.nombre || 'Inspector',
                    inspectorEmail: user.email || '',
                    inspectorRole: user.rol || 'Inspector',
                    isLoadingData: false
                });
                return true;
            }

            set({ dataError: data.message || "Acceso denegado: Usuario no autorizado", isLoadingData: false });
            return false;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error al validar acceso";
            console.error("Login validation error:", error);
            set({ dataError: errorMessage, isLoadingData: false });
            return false;
        }
    },

    fetchData: async () => {
        const rut = get().inspectorRut;
        if (!rut) return;

        set({ isLoadingData: true, dataError: null });
        try {
            const isHealthy = await get().checkConnection();
            if (!isHealthy) {
                throw new Error("Sin conexión con base de datos");
            }

            const data = await fetchJSON(APPS_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'getAssignments',
                    rut: rut,
                    email: get().inspectorEmail
                })
            });

            if (!data.ok || !Array.isArray(data.data)) {
                throw new Error(data.message || "No se pudo obtener las asignaciones");
            }

            const parsedUnits: Unit[] = [];
            const parsedProjects: Project[] = [];
            const projectMap = new Map<string, Project>();

            (data.data as Record<string, unknown>[]).forEach((row) => {
                const edificio = (row.edificio as string) || (row.proyecto as string) || 'Sin Edificio';
                const direccion = (row.direccion as string) || '';
                const departamento = String(row.departamento || row.depto || '');
                const projectId = `proj-${edificio.replace(/\s+/g, '-').toLowerCase()}`;

                if (!projectMap.has(projectId)) {
                    const newProject: Project = {
                        id: projectId,
                        name: edificio,
                        address: direccion,
                        status: 'ACTIVE'
                    };
                    projectMap.set(projectId, newProject);
                    parsedProjects.push(newProject);
                }

                const rawTipo = String(row.tipo_proceso || '').toUpperCase();
                let status: Unit['status'] = 'PENDING';
                if (rawTipo.includes('PRE')) status = 'PRE_ENTREGA';
                else if (rawTipo.includes('ENTREGA')) status = 'ENTREGADO';

                parsedUnits.push({
                    id: (row.id as string) || `unit-${projectId}-${departamento}`,
                    projectId: projectId,
                    number: departamento,
                    ownerName: (row.cliente as string) || (row.propietario as string) || '',
                    ownerRut: (row.rut_cliente as string) || '',
                    status: status,
                    inspectorId: (row.id_inspector as string),
                    processTypeLabel: (row.tipo_proceso as string),
                    parking: (row.estacionamiento as string),
                    storage: (row.bodega as string),
                    projectAddress: direccion,
                    activeState: (row.estado as string),
                    date: (row.fecha as string),
                    time: (row.hora as string),
                    isHandoverGenerated: String(row.acta_status || '').toUpperCase() === 'GENERADA',
                    handoverUrl: (row.acta_url as string) || (row.acta_pdf_url as string),
                    handoverDate: (row.acta_updated_at as string),
                    procesoStatus: String(row.proceso_status || '').trim().toUpperCase() as Unit['procesoStatus'],
                    procesoCompletedAt: (row.proceso_completed_at as string),
                    procesoCompletedBy: (row.proceso_completed_by as string),
                    procesoNotes: (row.proceso_notes as string),
                    processId: (row.process_id as string),
                    updatedAt: (row.updated_at as string),
                    lastDeviceId: (row.last_device_id as string)
                });
            });

            set({
                units: parsedUnits,
                projects: parsedProjects,
                isLoadingData: false
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error al cargar agenda";
            console.error("Fetch data error:", error);
            set({ dataError: errorMessage, isLoadingData: false });
        }
    },

    startProcess: async (unit: Unit, processType: ProcessType) => {
        const state = get();
        const payload = {
            action: 'startProcess',
            rut: state.inspectorRut,
            email: state.inspectorEmail,
            departamento: String(unit.number),
            fecha: unit.date,
            hora: unit.time,
            device_id: getDeviceId(),
            tipo_proceso: unit.processTypeLabel,
            tipo_proceso_normalized: processType === 'PRE_ENTREGA' ? 'pre_entrega' : 'entrega'
        };

        try {
            const data = await fetchJSON(APPS_SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            if (data.ok) {
                set(state => ({
                    units: state.units.map(u => u.id === unit.id ? { ...u, procesoStatus: 'EN_PROCESO', processId: data.process_id } : u)
                }));
            }
            return data;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error al iniciar proceso";
            console.error("Start Process Error:", error);
            return { ok: false, error: errorMessage };
        }
    },

    getActaStatus: async (unit: Unit) => {
        const state = get();
        try {
            const url = `${APPS_SCRIPT_URL}?action=getActaStatus&rut=${encodeURIComponent(state.inspectorRut || "")}&departamento=${encodeURIComponent(unit.number)}&tipo_proceso=${encodeURIComponent(unit.processTypeLabel || "")}`;
            const data = await fetchJSON(url);
            return data;
        } catch (error: unknown) {
            console.error("Get Acta Status Error:", error);
            return { ok: false, has_acta: false };
        }
    },

    submitInspection: async (extra?: Record<string, unknown>) => {
        const state = get();
        if (!state.selectedUnit) {
            return { ok: false, error: 'Faltan datos de la unidad' };
        }

        const project = state.projects.find(p => p.id === state.selectedUnit?.projectId);
        const ROOM_NAMES: Record<string, string> = {
            'r1': 'Acceso', 'r2': 'Cocina', 'r3': 'Estar Comedor', 'r4': 'Pasillo',
            'r5': 'Dormitorio 1', 'r6': 'Dormitorio 2', 'r7': 'Baño 1', 'r8': 'Baño 2',
            'r9': 'Terraza', 'r10': 'Bodega', 'r11': 'Estacionamiento'
        };

        const payload = {
            action: "completeProcess",
            rut: state.inspectorRut,
            email: state.inspectorEmail,
            departamento: String(state.selectedUnit.number),
            fecha: state.selectedUnit.date,
            hora: state.selectedUnit.time,
            process_id: state.selectedUnit.processId,
            device_id: getDeviceId(),
            proceso_status: "REALIZADO",
            updated_at: new Date().toISOString(),

            pdf_data: {
                tipo: state.processType === 'PRE_ENTREGA' ? 'PRE ENTREGA' : 'ENTREGA FINAL',
                proyecto: project?.name || "Sin Proyecto",
                depto: state.selectedUnit.number || "",
                fecha_acta: new Date().toISOString().split("T")[0],
                edificio_direccion: project?.address || state.selectedUnit.projectAddress || "",
                comuna: "Santiago",
                propietario: {
                    nombre: state.selectedUnit.ownerName || "",
                    rut: state.selectedUnit.ownerRut || "",
                    telefono: state.selectedUnit.ownerPhone || "",
                    email: state.selectedUnit.ownerEmail || ""
                },
                observaciones: state.observations.map((o, i) => ({
                    nro: i + 1,
                    recinto: ROOM_NAMES[o.roomId] || "Desconocido",
                    detalle: o.description
                })),
                firmas: extra?.firmas
            }
        };

        try {
            const data = await fetchJSON(APPS_SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (data.ok) {
                await get().fetchData();
            }

            return data;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error al completar proceso";
            console.error("Complete Process Error:", error);
            return { ok: false, error: errorMessage };
        }
    },

    getDailyAgenda: () => {
        const state = get();
        const { units, inspectorRut } = state;
        if (!inspectorRut) return [];
        const currentRut = inspectorRut.toUpperCase().trim();

        return units.filter(u => {
            if ((u.inspectorId || '').replace(/[^0-9kK]/g, '').toUpperCase().trim() !== currentRut) return false;
            if ((u.activeState || '').toLowerCase().trim() !== 'activo') return false;
            if (!u.date) return false;
            const parts = u.date.trim().split(/[-/]/);
            if (parts.length !== 3) return false;
            let d, m, y;
            if (parts[2].length === 4) { d = parseInt(parts[0], 10); m = parseInt(parts[1], 10) - 1; y = parseInt(parts[2], 10); }
            else if (parts[0].length === 4) { y = parseInt(parts[0], 10); m = parseInt(parts[1], 10) - 1; d = parseInt(parts[2], 10); }
            else return false;
            const parsedDate = new Date(y, m, d);
            return isValid(parsedDate) && isToday(parsedDate);
        }).sort((a, b) => {
            const timeA = (a.time || '00:00').split(':').map(s => parseInt(s, 10));
            const timeB = (b.time || '00:00').split(':').map(s => parseInt(s, 10));
            return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        });
    },

    getUpcomingDeliveries: () => {
        const state = get();
        const { units, inspectorRut } = state;
        if (!inspectorRut) return [];
        const currentRut = inspectorRut.toUpperCase().trim();
        const nowAtStart = startOfDay(new Date());
        const endDate = endOfDay(addDays(nowAtStart, 14));

        return units.filter(u => {
            if ((u.inspectorId || '').replace(/[^0-9kK]/g, '').toUpperCase().trim() !== currentRut) return false;
            if ((u.activeState || '').toLowerCase().trim() !== 'activo') return false;
            if (!u.date) return false;
            const parts = u.date.trim().split(/[-/]/);
            if (parts.length !== 3) return false;
            let d, m, y;
            if (parts[2].length === 4) { d = parseInt(parts[0], 10); m = parseInt(parts[1], 10) - 1; y = parseInt(parts[2], 10); }
            else if (parts[0].length === 4) { y = parseInt(parts[0], 10); m = parseInt(parts[1], 10) - 1; d = parseInt(parts[2], 10); }
            else return false;
            const parsedDate = new Date(y, m, d);
            return isValid(parsedDate) && isWithinInterval(parsedDate, { start: nowAtStart, end: endDate });
        }).sort((a, b) => {
            const getSortTime = (u: Unit) => {
                const parts = (u.date || '').trim().split(/[-/]/);
                let d = 1, m = 0, y = 2000;
                if (parts.length === 3) {
                    if (parts[2].length === 4) { d = parseInt(parts[0], 10); m = parseInt(parts[1], 10) - 1; y = parseInt(parts[2], 10); }
                    else if (parts[0].length === 4) { y = parseInt(parts[0], 10); m = parseInt(parts[1], 10) - 1; d = parseInt(parts[2], 10); }
                }
                const tp = (u.time || '00:00').split(':').map(s => parseInt(s, 10));
                return new Date(y, m, d, tp[0] || 0, tp[1] || 0).getTime();
            };
            return getSortTime(a) - getSortTime(b);
        });
    },

    getProjectsFromAgenda: () => {
        const state = get();
        const agenda = state.getDailyAgenda();
        const projectIds = Array.from(new Set(agenda.map(u => u.projectId)));
        return state.projects.filter(p => projectIds.includes(p.id));
    }
}));
