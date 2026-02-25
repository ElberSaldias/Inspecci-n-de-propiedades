import type { Project, Unit, Room } from '../types';

export const mockProjects: Project[] = [
    {
        id: 'p1',
        name: 'Edificio Parque Lira',
        address: 'Av. Eliodoro Yáñez 1234, Providencia',
        status: 'ACTIVE',
    },
    {
        id: 'p2',
        name: 'Condominio Altos del Bosque',
        address: 'Camino a Farellones km 2, Lo Barnechea',
        status: 'ACTIVE',
    },
];

export const mockUnits: Unit[] = [
    { id: 'u1', projectId: 'p1', number: '101', ownerName: 'Juan Pérez', ownerRut: '12345678-9', status: 'PENDING' },
    { id: 'u2', projectId: 'p1', number: '102', ownerName: 'María González', ownerRut: '9876543-2', status: 'PRE_ENTREGA' },
    { id: 'u3', projectId: 'p1', number: '201', ownerName: 'Carlos Silva', ownerRut: '11111111-1', status: 'PENDING' },
    { id: 'u4', projectId: 'p2', number: 'A-10', ownerName: 'Ana Rojas', ownerRut: '22222222-2', status: 'PENDING' },
    { id: 'u5', projectId: 'p2', number: 'B-20', ownerName: 'Luis Morales', ownerRut: '33333333-3', status: 'PENDING' },
];

export const standardRooms: Room[] = [
    { id: 'r1', name: 'Acceso' },
    { id: 'r2', name: 'Cocina' },
    { id: 'r3', name: 'Estar Comedor' },
    { id: 'r4', name: 'Pasillo' },
    { id: 'r5', name: 'Dormitorio 1' },
    { id: 'r6', name: 'Dormitorio 2' },
    { id: 'r7', name: 'Baño 1' },
    { id: 'r8', name: 'Baño 2' },
    { id: 'r9', name: 'Terraza' },
    { id: 'r10', name: 'Bodega' },
    { id: 'r11', name: 'Estacionamiento' },
];
