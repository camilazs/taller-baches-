import { categories } from './records.mjs';
import { validCoordinates, locatedDetections } from './tracking.mjs';
const labels = new Set([...Object.keys(categories), 'sin_hallazgo', 'no_concluyente']);
const text = (value, max) => typeof value === 'string' && value.length <= max;
const photoPattern = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
function validatePhoto(photo) {
  if (photo == null) return;
  if (!text(photo, 4_200_000) || !photoPattern.test(photo)) throw new Error('El respaldo contiene una fotografía inválida.');
  const bytes = atob(photo.slice(photo.indexOf(',') + 1));
  const mime = photo.slice(5, photo.indexOf(';'));
  if (bytes.length < 12 || bytes.length > 3 * 1024 * 1024) throw new Error('Una fotografía del respaldo supera el tamaño permitido.');
  const valid = mime === 'image/jpeg' ? bytes.charCodeAt(0) === 255 && bytes.charCodeAt(1) === 216 && bytes.charCodeAt(2) === 255 : mime === 'image/png' ? [137,80,78,71,13,10,26,10].every((n, i) => bytes.charCodeAt(i) === n) : bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WEBP';
  if (!valid) throw new Error('La firma de una fotografía del respaldo no es válida.');
}
function coordinates(item) {
  if ((item.lat != null || item.lng != null) && !validCoordinates(item.lat, item.lng)) throw new Error('El respaldo contiene coordenadas inválidas.');
}
function validateAnalysis(analysis) {
  if (analysis == null) return;
  if (!labels.has(analysis.category) || !text(analysis.summary, 1600) || !Array.isArray(analysis.warnings) || analysis.warnings.some(w => !text(w, 500)) || (analysis.detections != null && !Array.isArray(analysis.detections))) throw new Error('Análisis del respaldo inválido.');
  for (const d of analysis.detections || []) {
    const b = d.box;
    if (!categories[d.category] || !b || ![b.x,b.y,b.width,b.height].every(Number.isFinite) || b.x < 0 || b.y < 0 || b.width <= 0 || b.height <= 0 || b.x + b.width > 1.00001 || b.y + b.height > 1.00001) throw new Error('Región del respaldo inválida.');
    if (d.location) coordinates(d.location);
  }
}
export function validateBackup(value) {
  if (!value || ![1,2].includes(value.version) || !Array.isArray(value.records) || value.records.length > 10000 || (value.routes != null && !Array.isArray(value.routes))) throw new Error('Selecciona un respaldo JSON exportado por Vía Clara (versión 1 o 2).');
  const routes = value.routes || [];
  for (const route of routes) {
    if (!text(route.id, 100) || !route.id || !text(route.name, 120) || !Array.isArray(route.points) || route.points.length > 5000 || route.points.some(p => !Array.isArray(p) || !validCoordinates(p[0], p[1]))) throw new Error('Recorrido del respaldo inválido.');
  }
  for (const r of value.records) {
    if (!text(r.id, 100) || !r.id || !text(r.title, 120) || !text(r.description, 1600) || !categories[r.category] || !['ida','regreso'].includes(r.direction) || !Array.isArray(r.history || []) || !Array.isArray(r.evidenceHistory || [])) throw new Error('Observación del respaldo inválida.');
    coordinates(r); validatePhoto(r.photo); validateAnalysis(r.analysis);
    for (const event of r.history || []) if (!Array.isArray(event.fields) || event.fields.some(f => !text(f, 100)) || !text(event.at, 80)) throw new Error('Historial del respaldo inválido.');
    for (const evidence of r.evidenceHistory || []) { validatePhoto(evidence.photo); validateAnalysis(evidence.analysis); }
  }
  for (const list of [value.records, routes]) if (new Set(list.map(r => r.id)).size !== list.length) throw new Error('El respaldo repite identificadores.');
  return structuredClone(value);
}
export function planRestore(value, existingRecords, existingRoutes, newId = () => crypto.randomUUID()) {
  const data = validateBackup(value), records = [], routes = [], routeIds = new Map(); let skipped = 0;
  const canonical = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(canonical) : Object.fromEntries(Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => [k, canonical(value[k])])) : value;
  const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  for (const r of data.routes || []) {
    const current = existingRoutes.find(x => x.id === r.id);
    if (current && !same(current, r)) {
      const previousCopy = existingRoutes.find(x => x.restoredFrom === r.id && same({ ...x, id: r.id, name: r.name, restoredFrom: undefined }, r));
      if (previousCopy) { routeIds.set(r.id, previousCopy.id); continue; }
      const id = newId(); routeIds.set(r.id, id); routes.push({ ...r, id, name: (r.name + ' · respaldo').slice(0,120), restoredFrom: r.id });
    } else { routeIds.set(r.id, r.id); if (!current) routes.push(r); }
  }
  for (const incoming of data.records) {
    const record = { ...incoming, routeId: routeIds.get(incoming.routeId) || incoming.routeId || 'draft-original' };
    const current = existingRecords.find(x => x.id === record.id);
    if (current && same(current, record)) { skipped++; continue; }
    if (existingRecords.some(x => x.restoredFrom === record.id && same({ ...x, id: record.id, restoredFrom: undefined }, record))) { skipped++; continue; }
    records.push(current ? { ...record, id: newId(), restoredFrom: record.id } : record);
  }
  const knownRoutes = new Set([...existingRoutes, ...routes].map(r => r.id));
  for (const r of records) if (!knownRoutes.has(r.routeId)) { routes.push({ id: r.routeId, name: 'Recorrido recuperado', points: [], status: 'pending' }); knownRoutes.add(r.routeId); }
  return { records, routes, skipped };
}
export function toGeoJSON(records, routes) {
  return { type: 'FeatureCollection', features: [
    ...routes.filter(r => r.points?.length >= 2).map(r => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: r.points.map(([lat,lng]) => [lng,lat]) }, properties: { id: r.id, name: r.name, status: r.status, origin: 'Trazado aportado por el usuario' } })),
    ...records.flatMap(r => locatedDetections(r).map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng,p.lat] }, properties: { recordId: r.id, routeId: r.routeId, title: r.title, category: p.category, detectionIndex: p.index, inheritedLocation: p.inherited, source: r.analysisOrigin || r.source || 'Sin verificar', status: r.status } }))),
  ] };
}
