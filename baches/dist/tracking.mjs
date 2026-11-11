// Reglas compartidas por interfaz y pruebas. No contienen coordenadas de demostración.
export const DRAFT_ROUTE_ID = 'draft-original';
export const PENDING_ROUTE_ID = 'pending-route';
export const initialRoutes = [
  { id: PENDING_ROUTE_ID, name: 'Ruta definitiva pendiente', status: 'pending', points: [], createdAt: null },
  { id: DRAFT_ROUTE_ID, name: 'Parque Bolívar ↔ UCC · ida y regreso', status: 'reported', points: [], createdAt: null },
];
export function validCoordinates(lat, lng) { return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180; }
export function parseRoute(text) {
  const value = JSON.parse(text);
  const geometry = value.type === 'Feature' ? value.geometry : value;
  if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2 || geometry.coordinates.length > 5000) throw new Error('Se requiere un GeoJSON LineString con 2 a 5000 puntos [longitud, latitud].');
  return geometry.coordinates.map(p => { if (!Array.isArray(p) || p.length < 2 || !validCoordinates(p[1], p[0])) throw new Error('Coordenadas de ruta inválidas. Usa [longitud, latitud].'); return [p[1], p[0]]; });
}
export function distanceMeters(a, b) {
  if (!validCoordinates(a.lat, a.lng) || !validCoordinates(b.lat, b.lng)) return Infinity;
  const rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const v = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(Math.max(0, 1 - v)));
}
export function findDuplicate(records, candidate) {
  return records.find(r => r.id !== candidate.id && r.routeId === candidate.routeId && ((candidate.photo && r.photo === candidate.photo) || (candidate.photoHash && r.photoHash === candidate.photoHash) || (candidate.category !== 'pendiente' && r.category === candidate.category && distanceMeters(r, candidate) < 3)));
}
export function applyRecordChange(record, patch, timestamp = new Date().toISOString()) {
  const history = [...(record.history || []), { at: timestamp, fields: Object.keys(patch), category: patch.category ?? record.category, lat: patch.lat === undefined ? record.lat : patch.lat, lng: patch.lng === undefined ? record.lng : patch.lng, analysis: patch.analysis || undefined }];
  const evidenceHistory = 'photo' in patch && record.photo && patch.photo !== record.photo ? [...(record.evidenceHistory || []), { photo: record.photo, analysis: record.analysis, photoHash: record.photoHash, archivedAt: timestamp }] : record.evidenceHistory || [];
  return { ...record, ...patch, updatedAt: timestamp, history, evidenceHistory };
}
export function planPhotoAssociation(target, evidence, timestamp = new Date().toISOString()) {
  if (!target || !evidence?.photo || target.id === evidence.id || target.routeId !== evidence.routeId) throw new Error('Selecciona una fotografía y un reporte del mismo recorrido.');
  return [
    applyRecordChange(target, { photo: evidence.photo, photoHash: evidence.photoHash || null, analysis: null, analysisOrigin: null, analyzedAt: null, evidenceId: evidence.id, status: 'Fotografía asociada por el usuario · pendiente de análisis' }, timestamp),
    applyRecordChange(evidence, { linkedTo: target.id }, timestamp),
  ];
}
export function locatedDetections(record) {
  if (!record.analysis?.detections?.length) return validCoordinates(record.lat, record.lng) ? [{ lat: record.lat, lng: record.lng, category: record.category, inherited: false, index: null }] : [];
  return record.analysis.detections.flatMap((d, index) => {
    const own = d.location && validCoordinates(d.location.lat, d.location.lng);
    const location = own ? d.location : record;
    return validCoordinates(location.lat, location.lng) ? [{ lat: location.lat, lng: location.lng, category: d.category, inherited: !own, index }] : [];
  });
}
