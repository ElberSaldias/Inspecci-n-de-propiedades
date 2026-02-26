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
            const data = await fetchJSON(`${APPS_SCRIPT_URL}?action=health&t=${Date.now()}`);
            if (data.ok) {
                set({ connectionStatus: 'CONNECTED' });
                return true;
            }
            throw new Error(data.message || 'Error en health check');
        } catch (error: any) {
            console.error('Health Check Failed:', error);
            set({ connectionStatus: 'ERROR' });
            return false;
        }
    },

    validateLogin: async (input: string) => {
        set({ isLoadingData: true, dataError: null });
        try {
            const data = await fetchJSON(`${APPS_SCRIPT_URL}?action=getUsuarios&t=${Date.now()}`);
            if (!data.ok || !Array.isArray(data.data)) {
                throw new Error("No se pudo obtener la lista de usuarios autorizados");
            }

            const currentStr = input.trim().toLowerCase();
            const isEmailLogin = currentStr.includes('@');
            const normalizedRut = currentStr.replace(/[^0-9k]/g, '');

            const matchedUser = data.data.find((u: any) => {
                const uEmail = (u.id_inspector || u.email || "").toLowerCase().trim();
                const uRut = (u.rut || u.id || "").toLowerCase().replace(/[^0-9k]/g, '');
                return (isEmailLogin && uEmail === currentStr) || (!isEmailLogin && uRut === normalizedRut);
            });

            if (matchedUser) {
                set({
                    inspectorRut: (matchedUser.rut || input).trim().toUpperCase(),
                    inspectorName: matchedUser.nombre || 'Inspector',
                    inspectorEmail: (matchedUser.id_inspector || matchedUser.email || "").trim().toLowerCase(),
                    inspectorRole: matchedUser.rol || 'Inspector',
                    isLoadingData: false
                });
                return true;
            }

            set({ dataError: "Usuario no autorizado", isLoadingData: false });
            return false;
        } catch (error: any) {
            console.error("Login validation error:", error);
            set({ dataError: error.message || "Error al validar acceso", isLoadingData: false });
            return false;
        }
    },

    fetchData: async () => {
        const email = get().inspectorEmail;
        if (!email) return;

        set({ isLoadingData: true, dataError: null });
        try {
            const data = await fetchJSON(`${APPS_SCRIPT_URL}?action=getAsignaciones&id_inspector=${encodeURIComponent(email)}&days=14&t=${Date.now()}`);

            if (!data.ok || !Array.isArray(data.data)) {
                throw new Error(data.message || "No se pudo obtener las asignaciones");
            }

            const parsedUnits: Unit[] = [];
            const parsedProjects: Project[] = [];
            const projectMap = new Map<string, Project>();

            data.data.forEach((row: any) => {
                const edificio = row.edificio || row.proyecto || 'Sin Edificio';
                const direccion = row.direccion || '';
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

                const rawTipo = (row.tipo_proceso || '').toUpperCase();
                let status: Unit['status'] = 'PENDING';
                if (rawTipo.includes('PRE')) status = 'PRE_ENTREGA';
                else if (rawTipo.includes('ENTREGA')) status = 'ENTREGADO';

                parsedUnits.push({
                    id: row.id || `unit-${projectId}-${departamento}`,
                    projectId: projectId,
                    number: departamento,
                    ownerName: row.cliente || row.propietario || '',
                    ownerRut: row.rut_cliente || '',
                    status: status,
                    inspectorId: row.id_inspector,
                    processTypeLabel: row.tipo_proceso,
                    parking: row.estacionamiento,
                    storage: row.bodega,
                    projectAddress: direccion,
                    activeState: row.estado,
                    date: row.fecha,
                    time: row.hora,
                    isHandoverGenerated: (row.acta_status || '').toUpperCase() === 'GENERADA',
                    handoverUrl: row.acta_url || row.acta_pdf_url,
                    handoverDate: row.acta_updated_at,
                    procesoStatus: (row.proceso_status || '').trim().toUpperCase() as Unit['procesoStatus'],
                    procesoCompletedAt: row.proceso_completed_at,
                    procesoCompletedBy: row.proceso_completed_by,
                    procesoNotes: row.proceso_notes,
                    processId: row.process_id,
                    updatedAt: row.updated_at,
                    lastDeviceId: row.last_device_id
                });
            });

            set({
                units: parsedUnits,
                projects: parsedProjects,
                isLoadingData: false
            });
        } catch (error: any) {
            console.error("Fetch data error:", error);
            set({ dataError: error.message || "Error al cargar agenda", isLoadingData: false });
        }
    },

    startProcess: async (unit: Unit, processType: ProcessType) => {
        const state = get();
        const payload = {
            id_inspector: (state.inspectorEmail || "").toLowerCase().trim(),
            tipo_proceso: unit.processTypeLabel, // Raw value from sheet
            tipo_proceso_normalized: processType === 'PRE_ENTREGA' ? 'pre_entrega' : 'entrega',
            departamento: String(unit.number),
            fecha: unit.date,
            hora: unit.time,
            device_id: getDeviceId()
        };

        try {
            const data = await fetchJSON(`${APPS_SCRIPT_URL}?action=startProcess`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            if (data.ok) {
                set(state => ({
                    units: state.units.map(u => u.id === unit.id ? { ...u, procesoStatus: 'EN_PROCESO', processId: data.process_id } : u)
                }));
            }
            return data;
        } catch (error: any) {
            console.error("Start Process Error:", error);
            return { ok: false, error: error.message };
        }
    },

    getActaStatus: async (unit: Unit) => {
        const state = get();
        try {
            const url = `${APPS_SCRIPT_URL}?action=getActaStatus&id_inspector=${encodeURIComponent((state.inspectorEmail || "").toLowerCase().trim())}&departamento=${encodeURIComponent(unit.number)}&tipo_proceso=${encodeURIComponent(unit.processTypeLabel || "")}`;
            const data = await fetchJSON(url);
            return data;
        } catch (error: any) {
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
            process_id: state.selectedUnit.processId,
            id_inspector: (state.inspectorEmail || "").toLowerCase().trim(),
            tipo_proceso: state.selectedUnit.processTypeLabel,
            departamento: String(state.selectedUnit.number),
            fecha: state.selectedUnit.date,
            hora: state.selectedUnit.time,
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
            const data = await fetchJSON(`${APPS_SCRIPT_URL}?action=completeProcess`, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (data.ok) {
                await get().fetchData();
            }

            return data;
        } catch (error: any) {
            console.error("Complete Process Error:", error);
            return { ok: false, error: error.message };
        }
    },

    getDailyAgenda: () => {
        const state = get();
        const { units, inspectorEmail } = state;
        if (!inspectorEmail) return [];
        const currentEmail = inspectorEmail.toLowerCase().trim();

        return units.filter(u => {
            if ((u.inspectorId || '').toLowerCase().trim() !== currentEmail) return false;
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
        const { units, inspectorEmail } = state;
        if (!inspectorEmail) return [];
        const currentEmail = inspectorEmail.toLowerCase().trim();
        const nowAtStart = startOfDay(new Date());
        const endDate = endOfDay(addDays(nowAtStart, 14));

        return units.filter(u => {
            if ((u.inspectorId || '').toLowerCase().trim() !== currentEmail) return false;
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
