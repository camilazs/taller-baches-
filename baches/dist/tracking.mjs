// Reglas compartidas por interfaz y pruebas. No contienen coordenadas de demostración.
export const DRAFT_ROUTE_ID = 'draft-original';
export const PENDING_ROUTE_ID = 'pending-route';
export const initialRoutes = [
  { id: PENDING_ROUTE_ID, name: 'Ruta definitiva pendiente', status: 'pending', points: [], createdAt: null },
  { id: DRAFT_ROUTE_ID, name: 'Borrador anterior · sin confirmar', status: 'draft', points: [], createdAt: null },
];
export function validCoordinates(lat, lng) { return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180; }
export function parseRoute(text) {
  const value = JSON.parse(text);
  const geometry = value.type === 'Feature' ? value.geometry : value;
  if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2 || geometry.coordinates.length > 5000) throw new Error('Se requiere un GeoJSON LineString con 2 a 5000 puntos [longitud, latitud].');
  return geometry.coordinates.map(p => { if (!Array.isArray(p) || p.length < 2 || !validCoordinates(p[1], p[0])) throw new Error('Coordenadas de ruta inválidas. Usa [longitud, latitud].'); return [p[1], p[0]]; });
}