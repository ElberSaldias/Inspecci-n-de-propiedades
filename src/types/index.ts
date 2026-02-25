export type ProjectStatus = 'ACTIVE' | 'COMPLETED';
export type UnitStatus = 'PENDING' | 'PRE_ENTREGA' | 'ENTREGADO';
export type ObservationStatus = 'OPEN' | 'REPAIRING' | 'CLOSED';
export type ProcessType = 'PRE_ENTREGA' | 'ENTREGA_FINAL';

export interface Project {
    id: string;
    name: string;
    address: string;
    status: ProjectStatus;
}

export interface Unit {
    id: string;
    projectId: string;
    number: string;
    ownerName: string;
    ownerRut: string;
    ownerPhone?: string; // Optional initially, to be filled in step 2
    ownerEmail?: string; // Optional initially, to be filled in step 2
    status: UnitStatus;

    // Additional fields mapped from CSV
    inspectorId?: string;       // id_inspector
    processTypeLabel?: string;  // tipo_proceso
    parking?: string;           // estacionamiento
    storage?: string;           // bodega
    projectAddress?: string;    // direccion
    activeState?: string;       // estado
    date?: string;              // fecha
    time?: string;              // hora

    // Handover generation status
    isHandoverGenerated?: boolean;
    handoverUrl?: string;
    handoverDate?: string;
}

export interface Room {
    id: string;
    name: string;
}

export interface Observation {
    id: string;
    unitId: string;
    roomId: string;
    description: string;
    photoUrl?: string; // Optional URL for the photo
    status: ObservationStatus;
}

export interface HandoverRecord {
    id: string;
    unitId: string;
    processType: ProcessType;
    date: string; // ISO String
    representativeSignature: string; // Base64 Canvas Data
    clientSignature: string; // Base64 Canvas Data
}
