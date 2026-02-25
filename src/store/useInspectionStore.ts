import { create } from 'zustand';
import Papa from 'papaparse';
import type { Observation, ProcessType, Unit, Project } from '../types';
import { isToday, parse, isValid, parseISO, addDays, isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';

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
        projects: []
    }),

    validateLogin: async (input: string) => {
        try {
            // Se agrega un timestamp (t=...) para evadir cache del navegador
            const response = await fetch(`https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9LrYOr-j7mtY4F51Aw2CtGvP_l1dMW5-sZGLQvyUGQ1lmVxyj9Hxe3z40QeVy5j7VkAsmbLUzSaDV/pub?output=csv&t=${Date.now()}`, { cache: "no-store" });
            const csvText = await response.text();
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

            const currentStr = input.trim().toLowerCase();
            const isEmailLogin = currentStr.includes('@');
            const normalizedRut = currentStr.replace(/[^0-9k]/g, '');

            let matchedUser = null;
            let realName = 'Usuario';
            let realEmail = '';
            let realRole = 'Inspector';

            for (const user of parsed.data as Record<string, string>[]) {
                // Buscamos las columnas flexibilizando espacios o capitalización
                const keys = Object.keys(user);
                const emailKey = keys.find(k => k.toLowerCase().includes('email')) || 'Email';
                const rutKey = keys.find(k => k.toLowerCase().includes('rut') || k.toLowerCase().includes('id')) || 'RUT / ID';
                const nameKey = keys.find(k => k.toLowerCase().includes('nombre') || k.toLowerCase().includes('completo')) || 'Nombre Completo';
                const roleKey = keys.find(k => k.toLowerCase().includes('rol')) || 'Rol';

                const uEmail = (user[emailKey] || '').trim().toLowerCase();
                const uRut = (user[rutKey] || '').toLowerCase().replace(/[^0-9k]/g, '');

                if ((isEmailLogin && uEmail === currentStr) || (!isEmailLogin && uRut === normalizedRut)) {
                    matchedUser = user;
                    realName = user[nameKey] || 'Usuario';
                    realEmail = user[emailKey] || '';
                    realRole = user[roleKey] || 'Inspector';
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
            // Cache buster para refrescar siempre los nuevos departamentos
            const response = await fetch(`https://docs.google.com/spreadsheets/d/e/2PACX-1vSjo8-wZ72MSUQcaKuooUzuxk1Uj8FTV1DeMEy24z5pqIDblK2GfCOAT3E2S3aQBnbOmoe6VbBt-Qey/pub?output=csv&t=${Date.now()}`, { cache: "no-store" });
            const unitsCsvText = await response.text();

            interface CsvRow {
                id_inspector?: string;
                tipo_proceso?: string;
                departamento?: string;
                estacionamiento?: string;
                bodega?: string;
                edificio?: string;
                direccion?: string;
                cliente?: string;
                estado?: string;
                fecha?: string;
                hora?: string;
                acta_status?: string;
                acta_url?: string;
                acta_pdf_url?: string;
                acta_id?: string;
                acta_updated_at?: string;
                proceso_status?: string;
                proceso_completed_at?: string;
                proceso_completed_by?: string;
                proceso_notes?: string;
            }

            Papa.parse(unitsCsvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const parsedUnits: Unit[] = [];
                    const parsedProjects: Project[] = [];
                    const projectMap = new Map<string, Project>();

                    (results.data as CsvRow[]).forEach((row) => {
                        // Extract project
                        const projectName = row.edificio || 'Sin Edificio';
                        const projectAddress = row.direccion || '';
                        // Basic ID generation logic based on name
                        const projectId = `proj-${projectName.replace(/\s+/g, '-').toLowerCase()}`;

                        if (!projectMap.has(projectId)) {
                            const newProject: Project = {
                                id: projectId,
                                name: projectName,
                                address: projectAddress,
                                status: 'ACTIVE'
                            };
                            projectMap.set(projectId, newProject);
                            parsedProjects.push(newProject);
                        }

                        // Determine status
                        let status: Unit['status'] = 'PENDING';
                        if (row.tipo_proceso === 'PRE ENTREGA') status = 'PRE_ENTREGA';
                        else if (row.tipo_proceso === 'ENTREGADO') status = 'ENTREGADO';

                        // Create unit
                        const unitId = `unit-${projectId}-${row.departamento}`;
                        parsedUnits.push({
                            id: unitId,
                            projectId: projectId,
                            number: row.departamento || '',
                            ownerName: row.cliente || '',
                            ownerRut: '', // Not provided directly in CSV
                            status: status,

                            // CSV-specific mapping
                            inspectorId: row.id_inspector || '',
                            processTypeLabel: row.tipo_proceso || '',
                            parking: row.estacionamiento || '',
                            storage: row.bodega || '',
                            projectAddress: projectAddress,
                            activeState: row.estado || '',
                            date: row.fecha || '',
                            time: row.hora || '',
                            isHandoverGenerated: (row.acta_status || '').toUpperCase() === 'GENERADA',
                            handoverUrl: row.acta_url || row.acta_pdf_url || undefined,
                            handoverDate: row.acta_updated_at || undefined,

                            procesoStatus: (row.proceso_status || '') as Unit['procesoStatus'],
                            procesoCompletedAt: row.proceso_completed_at,
                            procesoCompletedBy: row.proceso_completed_by,
                            procesoNotes: row.proceso_notes
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
        const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyuuCHHUBE_zcRi1qqZQ-ERkXEnqctDOo4muW2U7hDbL0dYl4qMovrD_XbvnddwoUkEfA/exec";

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
            // CRITERIOS DE BÚSQUEDA (Coincidencia exacta por 5 campos solicitados)
            id_inspector: state.selectedUnit.inspectorId || "",
            tipo_proceso: state.selectedUnit.processTypeLabel || "",
            departamento: state.selectedUnit.number || "",
            fecha: normalizedFecha,
            hora: normalizedHora,

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
            const response = await fetch(WEBAPP_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.ok) {
                // Sincronización inmediata para bloquear la tarjeta
                await get().fetchData();
            } else {
                const errorDetail = `Depto ${payload.departamento}, ${payload.fecha} ${payload.hora}, ${payload.tipo_proceso}`;
                alert(`No se encontró el agendamiento para actualizar estado (revisar fecha/hora).\n\nCriterios usados:\n${errorDetail}\nInspector: ${payload.id_inspector}`);
                console.warn("Falla en actualización de fila:", payload);
            }

            return data;
        } catch (error: unknown) {
            console.error("Webhook POST Error:", error);
            const message = error instanceof Error ? error.message : 'Error de red al intentar contactar a Google Apps Script';
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
