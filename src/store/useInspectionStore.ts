import { create } from 'zustand';
import Papa from 'papaparse';
import type { Observation, ProcessType, Unit, Project } from '../types';
import { isToday, parse, isValid, parseISO, addDays, isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';
import { APPS_SCRIPT_URL, PUBLISHED_CSV_URL } from '../config';
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
    getDailyAgenda: () => Unit[];
    getUpcomingDeliveries: () => Unit[];
    getProjectsFromAgenda: () => Project[];
    validateRut: (rut: string) => boolean;
    connectionStatus: 'IDLE' | 'CHECKING' | 'CONNECTED' | 'ERROR';
    checkConnection: () => Promise<boolean>;
}

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

    // Helper for Chilean RUT validation
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
        observations: state.observations.map(o =>
            o.id === id ? { ...o, status } : o
        )
    })),

    clearSession: () => set({
        selectedUnit: null,
        processType: null,
        observations: []
    }),

    logout: () => set({
        inspectorRut: null,
        inspectorName: null,
        inspectorEmail: null,
        inspectorRole: null,
        selectedUnit: null,
        processType: null,
        observations: [],
        units: [],
        projects: [],
        connectionStatus: 'IDLE'
    }),

    checkConnection: async () => {
        set({ connectionStatus: 'CHECKING' });
        try {
            // Reintentamos con un timestamp para evitar cache
            const data = await fetchJSON(`${APPS_SCRIPT_URL}?action=health&t=${Date.now()}`);
            if (data.ok) {
                set({ connectionStatus: 'CONNECTED' });
                return true;
            }
            throw new Error(data.message || 'Respuesta de estado inválida');
        } catch (error) {
            console.error('Health Check Failed:', error);
            set({ connectionStatus: 'ERROR' });
            return false;
        }
    },

    validateLogin: async (input: string) => {
        try {
            const response = await fetch(`${PUBLISHED_CSV_URL}&t=${Date.now()}`, { cache: "no-store" });
            if (!response.ok) throw new Error(`Error ${response.status} al validar login`);

            const csvText = await response.text();
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

            const currentStr = input.trim().toLowerCase();
            const isEmailLogin = currentStr.includes('@');
            const normalizedRut = currentStr.replace(/[^0-9k]/g, '');

            let matchedUser = null;
            let realName = 'Usuario';
            let realEmail = '';
            let realRole = 'Inspector';

            for (const user of parsed.data as any[]) {
                const keys = Object.keys(user);
                const getVal = (names: string[]) => {
                    const key = keys.find(k => names.some(n => k.toLowerCase().trim().includes(n.toLowerCase())));
                    return key ? (user[key] || '').toString().trim() : '';
                };

                const uEmail = getVal(['email']).toLowerCase();
                const uRut = getVal(['rut', 'id']).toLowerCase().replace(/[^0-9k]/g, '');

                if ((isEmailLogin && uEmail === currentStr) || (!isEmailLogin && uRut === normalizedRut)) {
                    matchedUser = user;
                    realName = getVal(['nombre', 'completo']) || 'Usuario';
                    realEmail = getVal(['email']) || '';
                    realRole = getVal(['rol']) || 'Inspector';
                    break;
                }
            }

            if (matchedUser) {
                set({
                    inspectorRut: input.trim().toUpperCase(),
                    inspectorName: realName,
                    inspectorEmail: realEmail.trim().toLowerCase(),
                    inspectorRole: realRole
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error("Login validation error:", error);
            return false;
        }
    },

    fetchData: async () => {
        set({ isLoadingData: true, dataError: null });
        try {
            const response = await fetch(`${PUBLISHED_CSV_URL}&t=${Date.now()}`, {
                cache: "no-store",
                headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
            });

            if (!response.ok) {
                console.error(`[FetchData Error] Status: ${response.status} | URL: ${PUBLISHED_CSV_URL}`);
                throw new Error(`No se pudo conectar con el servidor de datos (Spreadsheet). Status: ${response.status}`);
            }

            const unitsCsvText = await response.text();



            Papa.parse(unitsCsvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const parsedUnits: Unit[] = [];
                    const parsedProjects: Project[] = [];
                    const projectMap = new Map<string, Project>();

                    (results.data as any[]).forEach((row) => {
                        const keys = Object.keys(row);
                        const getVal = (names: string[]) => {
                            const key = keys.find(k => names.includes(k.toLowerCase().trim()));
                            return key ? (row[key] || '').toString().trim() : '';
                        };

                        const edificio = getVal(['edificio', 'proyecto']);
                        const direccion = getVal(['direccion']);
                        const departamento = getVal(['departamento', 'depto', 'unidad']);
                        const name = edificio || 'Sin Edificio';
                        const projectId = `proj-${name.replace(/\s+/g, '-').toLowerCase()}`;

                        if (!projectMap.has(projectId)) {
                            const newProject: Project = {
                                id: projectId,
                                name: name,
                                address: direccion || '',
                                status: 'ACTIVE'
                            };
                            projectMap.set(projectId, newProject);
                            parsedProjects.push(newProject);
                        }

                        const rawTipo = getVal(['tipo_proceso', 'proceso']);
                        let status: Unit['status'] = 'PENDING';
                        if (rawTipo.toUpperCase().includes('PRE')) status = 'PRE_ENTREGA';
                        else if (rawTipo.toUpperCase().includes('ENTREGA')) status = 'ENTREGADO';

                        const unitId = `unit-${projectId}-${departamento}`;
                        parsedUnits.push({
                            id: unitId,
                            projectId: projectId,
                            number: departamento,
                            ownerName: getVal(['cliente', 'propietario']),
                            ownerRut: '',
                            status: status,
                            inspectorId: getVal(['id_inspector', 'inspector']),
                            processTypeLabel: rawTipo,
                            parking: getVal(['estacionamiento']),
                            storage: getVal(['bodega']),
                            projectAddress: direccion,
                            activeState: getVal(['estado']),
                            date: getVal(['fecha']),
                            time: getVal(['hora']),
                            isHandoverGenerated: getVal(['acta_status']).toUpperCase() === 'GENERADA',
                            handoverUrl: getVal(['acta_url']) || getVal(['acta_pdf_url']) || undefined,
                            handoverDate: getVal(['acta_updated_at']) || undefined,
                            procesoStatus: getVal(['proceso_status', 'status_proceso', 'status']).toUpperCase() as Unit['procesoStatus'],
                            procesoCompletedAt: getVal(['proceso_completed_at']),
                            procesoCompletedBy: getVal(['proceso_completed_by']),
                            procesoNotes: getVal(['proceso_notes'])
                        });
                    });

                    set({
                        units: parsedUnits,
                        projects: parsedProjects,
                        isLoadingData: false
                    });
                },
                error: (error: Error) => {
                    set({ dataError: error.message, isLoadingData: false });
                }
            });
        } catch (error: unknown) {
            if (error instanceof Error) {
                set({ dataError: error.message || 'Error fetching data', isLoadingData: false });
            } else {
                set({ dataError: 'Error fetching data', isLoadingData: false });
            }
        }
    },

    submitInspection: async (extra?: Record<string, unknown>) => {
        const state = get();
        if (!state.selectedUnit || !state.processType) {
            return { ok: false, error: 'Faltan datos de la unidad o proceso' };
        }

        const project = state.projects.find(p => p.id === state.selectedUnit?.projectId);

        // Mapeo de recintos
        const ROOM_NAMES: Record<string, string> = {
            'r1': 'Acceso', 'r2': 'Cocina', 'r3': 'Estar Comedor', 'r4': 'Pasillo',
            'r5': 'Dormitorio 1', 'r6': 'Dormitorio 2', 'r7': 'Baño 1', 'r8': 'Baño 2',
            'r9': 'Terraza', 'r10': 'Bodega', 'r11': 'Estacionamiento'
        };

        // Normalizar fecha y hora para coincidir exactamente con la hoja de cálculo (dd-mm-aaaa y hh:mm)
        const normalizeDate = (dateStr: string) => {
            if (!dateStr) return "";
            // Si ya viene formateado dd-mm-yyyy lo respetamos
            if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;

            let d = parseISO(dateStr);
            if (!isValid(d)) {
                const formats = ['dd/MM/yyyy', 'dd-MM-yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd', 'yyyy-MM-dd'];
                for (const fmt of formats) {
                    const temp = parse(dateStr, fmt, new Date());
                    if (isValid(temp)) { d = temp; break; }
                }
            }
            return isValid(d) ? format(d, 'dd-MM-yyyy') : dateStr;
        };

        const normalizeTime = (timeStr: string) => {
            if (!timeStr) return "";
            // Asegurar formato HH:mm eliminando segundos si existen
            return timeStr.includes(':') ? timeStr.split(':').slice(0, 2).join(':') : timeStr;
        };

        const normalizedFecha = normalizeDate(state.selectedUnit.date || "");
        const normalizedHora = normalizeTime(state.selectedUnit.time || "");

        const payload = {
            // CRITERIOS DE BÚSQUEDA (Coincidencia exacta por 5 campos solicitados con trim preventivo)
            id_inspector: (state.selectedUnit.inspectorId || "").trim(),
            tipo_proceso: (state.selectedUnit.processTypeLabel || "").trim(),
            departamento: (state.selectedUnit.number || "").trim(),
            fecha: normalizedFecha.trim(),
            hora: normalizedHora.trim(),

            // DATOS DE ACTUALIZACIÓN (Columna L y nuevas)
            proceso_status: 'REALIZADA',
            completed_at: new Date().toISOString(),
            completed_by: state.inspectorEmail || state.inspectorRut || "Unknown",

            // DATOS PARA GENERACIÓN DE ACTA (Compatibilidad con script actual)
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
        };

        // Logging de criterios para debugging
        console.log("Iniciando UPDATE de estado en Sheets con criterios:", {
            inspector: payload.id_inspector,
            proceso: payload.tipo_proceso,
            depto: payload.departamento,
            fecha: payload.fecha,
            hora: payload.hora
        });

        try {
            const data = await fetchJSON(APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });

            if (data.ok) {
                await get().fetchData();
            } else {
                const errorDetail = `Depto ${payload.departamento}, ${payload.fecha} ${payload.hora}, ${payload.tipo_proceso}`;
                alert(`No se encontró el agendamiento para actualizar estado (revisar fecha/hora).\n\nCriterios usados:\n${errorDetail}\nInspector: ${payload.id_inspector}`);
                console.warn("Falla en actualización de fila:", payload);
            }

            return data;
        } catch (error: any) {
            console.error("Webhook POST Error:", error);
            const message = error.message || 'Error de red al intentar contactar a Google Apps Script';
            return { ok: false, error: message };
        }
    },

    getDailyAgenda: () => {
        const state = get();
        const { units, inspectorEmail } = state;
        if (!inspectorEmail) return [];

        const currentEmail = inspectorEmail.toLowerCase().trim();

        return units.filter(u => {
            // 1. Exact match by email (id_inspector)
            const rowId = (u.inspectorId || '').toLowerCase().trim();
            if (rowId !== currentEmail) return false;

            // 2. Active state
            const isActive = (u.activeState || '').toLowerCase().trim() === 'activo';
            if (!isActive) return false;

            // 3. Date check (Today)
            if (!u.date) return false;
            const dateStr = u.date.trim();

            // Manual parsing dd-mm-yyyy or yyyy-mm-dd
            const parts = dateStr.split(/[-/]/);
            if (parts.length !== 3) return false;

            let d, m, y;
            if (parts[2].length === 4) { // dd-mm-yyyy
                d = parseInt(parts[0], 10);
                m = parseInt(parts[1], 10) - 1;
                y = parseInt(parts[2], 10);
            } else if (parts[0].length === 4) { // yyyy-mm-dd
                y = parseInt(parts[0], 10);
                m = parseInt(parts[1], 10) - 1;
                d = parseInt(parts[2], 10);
            } else return false;

            const parsedDate = new Date(y, m, d);
            if (!isValid(parsedDate)) return false;

            return isToday(parsedDate);
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
            // 1. Exact match by email (id_inspector)
            const rowId = (u.inspectorId || '').toLowerCase().trim();
            if (rowId !== currentEmail) return false;

            // 2. Active state
            const isActive = (u.activeState || '').toLowerCase().trim() === 'activo';
            if (!isActive) return false;

            // 3. Date check (Within range)
            if (!u.date) return false;
            const dateStr = u.date.trim();
            const parts = dateStr.split(/[-/]/);
            if (parts.length !== 3) return false;

            let d, m, y;
            if (parts[2].length === 4) { // dd-mm-yyyy
                d = parseInt(parts[0], 10);
                m = parseInt(parts[1], 10) - 1;
                y = parseInt(parts[2], 10);
            } else if (parts[0].length === 4) { // yyyy-mm-dd
                y = parseInt(parts[0], 10);
                m = parseInt(parts[1], 10) - 1;
                d = parseInt(parts[2], 10);
            } else return false;

            const parsedDate = new Date(y, m, d);
            if (!isValid(parsedDate)) return false;

            return isWithinInterval(parsedDate, { start: nowAtStart, end: endDate });
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
