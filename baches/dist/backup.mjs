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