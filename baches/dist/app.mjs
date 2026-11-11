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
function render() {
  try { localStorage.setItem('via-clara:active-route', activeRouteId); } catch {}
  const scoped = routeRecords();
  $('total').textContent = scoped.length;
  const baches = scoped.filter(r => r.category === 'bache').length;
  $('potholes').textContent = baches; $('others').textContent = scoped.length - baches;
  $('located').replaceChildren(document.createTextNode(`${scoped.filter(hasLocation).length} `), el('em', `/ ${scoped.length}`));
  $('route-select').replaceChildren(...routes.map(r => { const option = el('option', r.name); option.value = r.id; return option; })); $('route-select').value = activeRouteId;
  $('route-state').textContent = activeRoute().status === 'pending' ? 'Ruta definitiva aún no proporcionada. Configúrala cuando esté confirmada.' : activeRoute().status === 'draft' ? 'BORRADOR ANTERIOR · No es la ruta definitiva y no tiene trazado confirmado.' : 'Ruta introducida por el usuario · pendiente de verificación en campo.';
  $('route-origin').textContent = activeRouteId === DRAFT_ROUTE_ID ? 'Parque Bolívar · borrador' : 'Origen por confirmar';
  $('route-destination').textContent = activeRouteId === DRAFT_ROUTE_ID ? 'UCC · borrador' : 'Destino por confirmar';
  $('route-summary').textContent = activeRouteId === DRAFT_ROUTE_ID ? routeInfo[direction] : activeRoute().name;
  $('save-trace').hidden = !tracing;
  const visible = filtered();
  if (visible.length && !visible.some(r => r.id === selected)) { selected = visible[0].id; placing = null; }
  $('visible-count').textContent = `${visible.length} ${visible.length === 1 ? 'observación' : 'observaciones'}`; $('list-count').textContent = String(visible.length).padStart(2, '0');
  $('records').replaceChildren();
  if (!visible.length) $('records').append(el('p', 'No hay observaciones con estos filtros.', 'empty-list'));
  for (const r of visible) {
    const button = el('button', undefined, `record ${r.id === selected ? 'selected' : ''}`);
    button.type = 'button'; button.setAttribute('aria-pressed', String(r.id === selected));
    button.append(el('span', String(r.order).padStart(2, '0'), 'number'));
    const copy = el('span', undefined, 'record-copy'); copy.append(el('strong', r.title));
    const type = el('small'); type.append(el('i', undefined, `dot ${r.category}`), document.createTextNode(`${categories[r.category]} · ${r.id}`));
    copy.append(type, el('small', hasLocation(r) ? '● Ubicación registrada' : '○ Ubicación pendiente', 'record-status')); button.append(copy);
    button.onclick = () => { cameraControls.stop(); selected = r.id; placing = null; render(); if (hasLocation(r) && map) map.setView([r.lat, r.lng], 17); };
    $('records').append(button);
  }
  document.querySelectorAll('[data-direction]').forEach(b => { const active = b.dataset.direction === direction; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  renderDetail(); renderMap();
}
function renderDetail() {
  const r = current(); $('detail').hidden = !r; if (!r) { $('record-history').replaceChildren(); return; }
  $('detail-id').textContent = `${r.id} / ${r.direction === 'ida' ? 'IDA' : 'REGRESO'} / ${r.source}`;
  $('detail-title').textContent = r.title; $('detail-description').textContent = r.description; $('detail-category').textContent = categories[r.category]; $('edit-category').value = r.category;
  $('edit-title').value = r.title; $('edit-description').value = r.description;
  $('analysis-origin').textContent = r.analysis ? (r.analysisOrigin || 'Análisis previo · origen sin verificar') : 'Pendiente de análisis real. Las observaciones del borrador no son detecciones de IA.';
  $('photo-empty').hidden = Boolean(r.photo); $('photo-preview').hidden = !r.photo; $('remove-photo').hidden = !r.photo;
  $('photo-stage').hidden = !r.photo;
  if (r.photo) $('photo-preview').src = r.photo; else $('photo-preview').removeAttribute('src');
  $('lat').value = r.lat ?? ''; $('lng').value = r.lng ?? '';
  $('location-status').textContent = hasLocation(r) ? `Origen: ${r.locationSource || 'Registro manual'}. Posición aportada por el usuario; no verificada en campo.` : 'Sin coordenadas: este reporte aún no aparece en el mapa.';
  $('analyze').disabled = !r.photo || !configured || busy;
  $('analyze').textContent = busy ? 'Analizando fotografía…' : '✦ Analizar fotografía';
  $('analysis').hidden = !r.analysis;
  if (r.analysis) $('analysis').textContent = `Sugerencia: ${analysisLabels[r.analysis.category]} · Confianza visual ${r.analysis.confidence}\n${r.analysis.summary}\n${r.analysis.warnings.join('\n')}`;
  $('detection-boxes').replaceChildren(); $('detections-list').replaceChildren();
  const detections = r.analysis?.detections || [];
  $('detection-count').hidden = !r.analysis;
  $('detection-count').textContent = `${detections.filter(d => d.category === 'bache').length} baches / ${detections.length} regiones sugeridas por IA. Cajas aproximadas, pendientes de revisión.`;
  for (const [index, detection] of detections.entries()) {
    const box = detection.box;
    if (!box || ![box.x, box.y, box.width, box.height].every(Number.isFinite)) continue;
    const region = el('div', undefined, `detection-box ${detection.category}`);
    region.style.left = `${box.x * 100}%`; region.style.top = `${box.y * 100}%`; region.style.width = `${box.width * 100}%`; region.style.height = `${box.height * 100}%`;
    region.append(el('span', `${index + 1} · ${categories[detection.category] || 'Hallazgo'}`)); $('detection-boxes').append(region);
    const card = el('div', undefined, 'detection-card'); card.append(el('strong', `${index + 1}. ${categories[detection.category]} · Confianza ${detection.confidence}`), el('p', detection.description));
    const accept = el('button', 'Usar categoría de este hallazgo', 'outline'); accept.type = 'button'; accept.onclick = () => update(r.id, { category: detection.category, status: 'Hallazgo visual revisado por el usuario' }); card.append(accept); $('detections-list').append(card);
    const location = el('button', 'Ubicar este hallazgo en el mapa', 'outline'); location.type = 'button'; location.onclick = () => { if (!map) return toast('El mapa no está disponible.'); placing = { id: r.id, index }; $('map-notice').textContent = `Pulsa la posición del hallazgo ${index + 1} en el mapa.`; $('map').scrollIntoView({ behavior: 'smooth', block: 'center' }); }; card.append(location);
    card.append(el('small', detection.location ? `Coordenadas propias: ${detection.location.lat}, ${detection.location.lng}` : hasLocation(r) ? 'Hereda la ubicación aproximada de la captura; puedes corregirla.' : 'Hallazgo sin coordenadas: ubícalo para verlo en el mapa.'));
  }
  $('apply-analysis').hidden = !r.analysis || !categories[r.analysis.category];
  $('record-history').replaceChildren();
  for (const event of [...(r.history || [])].reverse()) $('record-history').append(el('li', `${new Date(event.at).toLocaleString('es-CO')} · ${event.fields.join(', ')} · ${categories[event.category] || event.category}`));
  if (!r.history?.length) $('record-history').append(el('li', 'Sin modificaciones registradas.'));
  for (const evidence of r.evidenceHistory || []) { const item = el('li', `Evidencia anterior · ${new Date(evidence.archivedAt).toLocaleString('es-CO')}`); if (evidence.photo) { const img = el('img'); img.src = evidence.photo; img.alt = 'Fotografía anterior conservada en el historial'; img.width = 120; item.append(img); } $('record-history').append(item); }
  $('map-notice').textContent = placing ? `Selecciona en el mapa el lugar de ${typeof placing === 'string' ? placing : placing.id}. Puedes arrastrar el marcador para corregirlo.` : 'Los marcadores registrados se pueden arrastrar para corregir su posición.';
}
function renderMap() {
  if (!map) return;
  markers.clearLayers(); lines.clearLayers();
  const visible = filtered();
  for (const r of visible) for (const point of locatedDetections(r)) {
    const marker = L.marker([point.lat, point.lng], { draggable: true, icon: L.divIcon({ className: `marker ${point.category}`, html: String(r.order), iconSize: [29, 29], iconAnchor: [14, 14] }) });
    const popup = el('div'); popup.append(el('strong', `${r.id} · ${r.title}`), el('p', `${categories[point.category]} · ${point.inherited ? 'Posición aproximada heredada de la captura' : 'Ubicación aportada por el usuario'}`));
    if (r.photo) { const img = el('img'); img.src = r.photo; img.alt = 'Evidencia del reporte'; img.style.width = '150px'; popup.append(img); }
    marker.bindPopup(popup).addTo(markers); marker.on('click', () => { selected = r.id; placing = null; renderDetail(); });
    marker.on('dragend', async () => { const p = marker.getLatLng(); await savePoint(r.id, point.index, +p.lat.toFixed(6), +p.lng.toFixed(6)); });
  }
  // Conecta solo registros consecutivos ubicados; no salta reportes pendientes.
  if (activeRoute().points?.length >= 2) L.polyline(activeRoute().points, { color: '#166453', weight: 5 }).bindTooltip('Trazado introducido por el usuario; sin ajuste automático a calles').addTo(lines);
  if (tracePoints.length >= 2) L.polyline(tracePoints, { color: '#c87631', weight: 3, dashArray: '4 4' }).addTo(lines);
  const route = routeRecords().filter(r => r.direction === direction);
  for (let i = 1; i < route.length; i++) if (hasLocation(route[i - 1]) && hasLocation(route[i])) L.polyline([[route[i - 1].lat, route[i - 1].lng], [route[i].lat, route[i].lng]], { color: '#286655', weight: 3, dashArray: '6 7', opacity: .7 }).bindTooltip('Secuencia esquemática de observaciones; no es un trazado GPS').addTo(lines);
}
function setupMap() {
  if (!globalThis.L) { $('map-fallback').hidden = false; return; }
  map = L.map('map', { scrollWheelZoom: false }).setView([1.221, -77.281], 14);
  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  let errors = 0; tiles.on('tileerror', () => { if (++errors >= 4) { $('map-notice').textContent = 'No se cargan las imágenes del mapa. Revisa la conexión a Internet.'; } });
  markers = L.layerGroup().addTo(map); lines = L.layerGroup().addTo(map);
  map.on('click', async e => {
    if (tracing) { tracePoints.push([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]); renderMap(); return; }
    if (!placing) return;
    const target = typeof placing === 'string' ? { id: placing, index: null } : placing;
    if (await savePoint(target.id, target.index, +e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6))) { placing = null; renderDetail(); toast(`Ubicación guardada para ${target.id}.`); }
  });
}
async function savePoint(id, index, lat, lng, source = 'Selección manual en mapa') {
  if (!validCoordinates(lat, lng)) return false;
  const record = records.find(r => r.id === id); if (!record) return false;
  if (index !== null) { const analysis = structuredClone(record.analysis); if (!analysis?.detections[index]) return false; analysis.detections[index].location = { lat, lng, source: 'Selección manual en mapa' }; return update(id, { analysis }); }
  const duplicate = findDuplicate(records, { ...record, lat, lng });
  if (duplicate && !confirm(`El reporte ${duplicate.id} está muy cerca o usa la misma foto. ¿Guardar esta ubicación como un hallazgo distinto?`)) return false;
  return update(id, { lat, lng, locationSource: source });
}
async function upload(file) {
  if (!file) return;
  const id = selected;
  if (!id) return toast('Crea o selecciona una observación antes de cargar una fotografía.');
  try {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024 || file.size < 12) throw new Error('Selecciona un JPG, PNG o WebP original de hasta 3 MB. Los accesos directos .lnk no son imágenes.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid = file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n) : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    if (!valid) throw new Error('El contenido no coincide con el formato indicado.');
    const photo = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('No se pudo leer la imagen.')); reader.readAsDataURL(file); });
    await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => img.width * img.height <= 40_000_000 ? resolve() : reject(new Error('La foto supera 40 megapíxeles.')); img.onerror = () => reject(new Error('No se pudo abrir la imagen.')); img.src = photo; });
    if (pendingAnalysis.has(id)) throw new Error('Espera a que termine el análisis de esta foto antes de cambiarla.');
    const photoHash = globalThis.crypto?.subtle ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(n => n.toString(16).padStart(2, '0')).join('') : null;
    const duplicate = findDuplicate(records, { ...records.find(r => r.id === id), photo, photoHash });
    if (duplicate && !confirm(`Esta imagen o una ubicación equivalente ya está en ${duplicate.id}. ¿Conservarla también en esta observación?`)) return;
    if (await update(id, { photo, photoHash, analysis: null, analysisOrigin: null, status: 'Evidencia cargada' })) toast(`Fotografía guardada en ${id}.`);
  } catch (error) { toast(error.message); }
}
for (const [key, label] of Object.entries(categories)) { const option = el('option', label); option.value = key; $('edit-category').append(option); }
document.querySelectorAll('[data-direction]').forEach(button => button.onclick = () => { cameraControls.stop(); direction = button.dataset.direction; selected = routeRecords().find(r => r.direction === direction)?.id || null; placing = null; render(); });
for (const id of ['search', 'category', 'location-filter']) $(id).addEventListener(id === 'search' ? 'input' : 'change', render);
$('edit-category').onchange = async e => { if (await update(selected, { category: e.target.value, status: 'Clasificación revisada manualmente' })) toast('Clasificación guardada.'); };