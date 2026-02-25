import { create } from 'zustand';
import Papa from 'papaparse';
import type { Observation, ProcessType, Unit, Project } from '../types';
import { isToday, parse, isValid, parseISO, addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

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

    setInspectorRut: (rut) => set({ inspectorRut: rut }),

    setSelectedUnit: (unit) => set({ selectedUnit: unit }),

    updateSelectedUnit: (updates) => set((state) => ({
        selectedUnit: state.selectedUnit ? { ...state.selectedUnit, ...updates } : null
    })),

    setProcessType: (type) => set({ processType: type }),

    addObservation: (obs) => set((state) => ({
        observations: [
            ...state.observations,
            { ...obs, id: Math.random().toString(36).substr(2, 9) }
        ]
    })),

    removeObservation: (id) => set((state) => ({
        observations: state.observations.filter(o => o.id !== id)
    })),

    updateObservationStatus: (id, status) => set((state) => ({
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
                            time: row.hora || ''
                        });
                    });

                    // Mock handover status for some units (e.g., every 5th unit)
                    const enhancedUnits = parsedUnits.map((u, index) => ({
                        ...u,
                        isHandoverGenerated: index % 5 === 0,
                        handoverUrl: index % 5 === 0 ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' : undefined,
                        handoverDate: index % 5 === 0 ? u.date : undefined
                    }));

                    set({
                        units: enhancedUnits,
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

    submitInspection: async (extra?: Record<string, any>) => {
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

        const payload = {
            tipo: state.processType === 'PRE_ENTREGA' ? 'PRE ENTREGA' : 'ENTREGA FINAL',
            proyecto: project?.name || "Sin Proyecto",
            depto: state.selectedUnit.number || "",
            fecha_acta: new Date().toISOString().split("T")[0],
            edificio_direccion: project?.address || state.selectedUnit.projectAddress || "",
            comuna: "Santiago", // Valor por defecto ya que no está en el modelo
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

        try {
            const response = await fetch(WEBAPP_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            return data;
        } catch (error: unknown) {
            console.error("Webhook POST Error:", error);
            const message = error instanceof Error ? error.message : 'Error de red al intentar contactar a Google Apps Script';
            return { ok: false, error: message };
        }
    },

    getDailyAgenda: () => {
        const state = get();
        const { units, inspectorEmail, inspectorRut } = state;

        return units.filter(u => {
            if (u.status === 'ENTREGADO') return false;

            const rowId = (u.inspectorId || '').toLowerCase().trim();
            const currentEmail = (inspectorEmail || '').toLowerCase().trim();
            const currentRut = (inspectorRut || '').toLowerCase().replace(/[^0-9k]/g, '');
            const rowIdAsRut = rowId.replace(/[^0-9k]/g, '');

            let isAssignedToMe = false;
            if (currentEmail && rowId === currentEmail) isAssignedToMe = true;
            else if (currentRut && rowIdAsRut === currentRut) isAssignedToMe = true;

            if (!isAssignedToMe) return false;

            // Date check
            if (!u.date) return false;

            const dateStr = u.date.trim();
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

            if (!isValid(parsedDate)) return false;
            return isToday(parsedDate);
        }).sort((a, b) => {
            if (!a.time && !b.time) return 0;
            if (!a.time) return 1;
            if (!b.time) return -1;
            const parseTime = (timeStr: string) => {
                const [hours, minutes] = timeStr.split(':').map(str => parseInt(str.trim(), 10));
                return (hours || 0) * 60 + (minutes || 0);
            };
            return parseTime(a.time) - parseTime(b.time);
        });
    },

    getUpcomingDeliveries: () => {
        const state = get();
        const { units, inspectorEmail, inspectorRut } = state;
        const now = new Date();
        const endDate = addDays(now, 14);

        return units.filter(u => {
            if (u.status === 'ENTREGADO') return false;

            const rowId = (u.inspectorId || '').toLowerCase().trim();
            const currentEmail = (inspectorEmail || '').toLowerCase().trim();
            const currentRut = (inspectorRut || '').toLowerCase().replace(/[^0-9k]/g, '');
            const rowIdAsRut = rowId.replace(/[^0-9k]/g, '');

            let isAssignedToMe = false;
            if (currentEmail && rowId === currentEmail) isAssignedToMe = true;
            else if (currentRut && rowIdAsRut === currentRut) isAssignedToMe = true;

            if (!isAssignedToMe) return false;

            // Date check
            if (!u.date) return false;

            const dateStr = u.date.trim();
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

            if (!isValid(parsedDate)) return false;

            return isWithinInterval(parsedDate, {
                start: startOfDay(now),
                end: endOfDay(endDate)
            });
        }).sort((a, b) => {
            // Sort by date first
            const dateStrA = a.date!.trim();
            const dateStrB = b.date!.trim();

            let parsedA = parseISO(dateStrA);
            if (!isValid(parsedA)) {
                const formats = ['dd/MM/yyyy', 'dd-MM-yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd'];
                for (const fmt of formats) {
                    const temp = parse(dateStrA, fmt, new Date());
                    if (isValid(temp)) { parsedA = temp; break; }
                }
            }

            let parsedB = parseISO(dateStrB);
            if (!isValid(parsedB)) {
                const formats = ['dd/MM/yyyy', 'dd-MM-yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd'];
                for (const fmt of formats) {
                    const temp = parse(dateStrB, fmt, new Date());
                    if (isValid(temp)) { parsedB = temp; break; }
                }
            }

            const timeDiff = parsedA.getTime() - parsedB.getTime();
            if (timeDiff !== 0) return timeDiff;

            // Then by time
            if (!a.time && !b.time) return 0;
            if (!a.time) return 1;
            if (!b.time) return -1;
            const parseTime = (timeStr: string) => {
                const [hours, minutes] = timeStr.split(':').map(str => parseInt(str.trim(), 10));
                return (hours || 0) * 60 + (minutes || 0);
            };
            return parseTime(a.time) - parseTime(b.time);
        });
    },

    getProjectsFromAgenda: () => {
        const state = get();
        const agenda = state.getDailyAgenda();
        const projectIds = Array.from(new Set(agenda.map(u => u.projectId)));
        return state.projects.filter(p => projectIds.includes(p.id));
    }
}));
