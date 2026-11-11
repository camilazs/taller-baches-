import { seedRecords, categories, routeInfo } from './records.mjs';
import { setupCapture } from './capture.mjs';
import { planRestore, toGeoJSON } from './backup.mjs';
import { initialRoutes, DRAFT_ROUTE_ID, PENDING_ROUTE_ID, validCoordinates, parseRoute, findDuplicate, applyRecordChange, locatedDetections } from './tracking.mjs';

const $ = id => document.getElementById(id);
const analysisLabels = { ...categories, sin_hallazgo: 'Sin hallazgo visible', no_concluyente: 'No concluyente' };
let records = structuredClone(seedRecords).map(r => ({ ...r, routeId: DRAFT_ROUTE_ID })), selected = null, direction = 'ida', placing = null, busy = false, configured = false, db;
let routes = structuredClone(initialRoutes), activeRouteId = PENDING_ROUTE_ID, tracing = false, tracePoints = [];
let map, markers, lines, toastTimer;
const pendingAnalysis = new Set();
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 6500); }
function current() { return records.find(r => r.id === selected); }
function activeRoute() { return routes.find(r => r.id === activeRouteId) || routes[0]; }
function routeRecords() { return records.filter(r => (r.routeId || DRAFT_ROUTE_ID) === activeRouteId); }
function hasLocation(r) { return Number.isFinite(r.lat) && Number.isFinite(r.lng); }
function filtered() { const query = $('search').value.toLocaleLowerCase('es'); return routeRecords().filter(r => r.direction === direction && ($('category').value === 'all' || r.category === $('category').value) && ($('location-filter').value === 'all' || ($('location-filter').value === 'located' ? hasLocation(r) : !hasLocation(r))) && `${r.title} ${r.description} ${r.id}`.toLocaleLowerCase('es').includes(query)); }
function el(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }

async function openStorage() {
  if (!globalThis.indexedDB) throw new Error('El navegador no permite almacenamiento local.');
  db = await new Promise((resolve, reject) => { const req = indexedDB.open('via-clara-pasto', 2); req.onupgradeneeded = () => { for (const name of ['records', 'routes']) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath: 'id' }); }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  const saved = await new Promise((resolve, reject) => { const req = db.transaction('records').objectStore('records').getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  records = records.map(seed => {
    const item = saved.find(r => r.id === seed.id);
    if (!item) return seed;
    return { ...seed, ...item, routeId: item.routeId || DRAFT_ROUTE_ID, category: categories[item.category] ? item.category : seed.category, lat: Number.isFinite(item.lat) && Math.abs(item.lat) <= 90 ? item.lat : null, lng: Number.isFinite(item.lng) && Math.abs(item.lng) <= 180 ? item.lng : null, locationSource: item.locationSource, photo: typeof item.photo === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(item.photo) ? item.photo : null, analysis: item.analysis && analysisLabels[item.analysis.category] && typeof item.analysis.summary === 'string' && Array.isArray(item.analysis.warnings) ? item.analysis : null, status: item.status || seed.status };
  });
  records.push(...saved.filter(r => !records.some(seed => seed.id === r.id) && r.id && r.title));
  const savedRoutes = await new Promise((resolve, reject) => { const req = db.transaction('routes').objectStore('routes').getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  routes = routes.map(seed => savedRoutes.find(r => r.id === seed.id) || seed); routes.push(...savedRoutes.filter(r => !routes.some(seed => seed.id === r.id)));
  try { const prior = localStorage.getItem('via-clara:active-route'); if (routes.some(r => r.id === prior)) activeRouteId = prior; } catch {}
}
async function persist(record, store = 'records') {
  if (!db) throw new Error('Almacenamiento no disponible; exporta tus datos antes de cerrar.');
  await new Promise((resolve, reject) => { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(structuredClone(record)); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('No se pudo guardar.')); });
}
async function update(id, patch) {
  const old = records.find(r => r.id === id);
  if (!old) return false;
  const next = applyRecordChange(old, patch);
  try { await persist(next); records = records.map(r => r.id === id ? next : r); render(); return true; }
  catch { toast('No se pudo guardar el cambio. Comprueba el almacenamiento del navegador.'); return false; }
}