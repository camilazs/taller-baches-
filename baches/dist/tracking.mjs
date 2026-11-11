// Reglas compartidas por interfaz y pruebas. No contienen coordenadas de demostración.
export const DRAFT_ROUTE_ID = 'draft-original';
export const PENDING_ROUTE_ID = 'pending-route';
export const initialRoutes = [
  { id: PENDING_ROUTE_ID, name: 'Ruta definitiva pendiente', status: 'pending', points: [], createdAt: null },
  { id: DRAFT_ROUTE_ID, name: 'Borrador anterior · sin confirmar', status: 'draft', points: [], createdAt: null },
];