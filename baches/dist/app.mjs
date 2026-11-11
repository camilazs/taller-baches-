import { seedRecords, categories, routeInfo } from './records.mjs';
import { setupCapture } from './capture.mjs';
import { planRestore, toGeoJSON } from './backup.mjs';
import { readPhotoFile, galleryRecords } from './photos.mjs';
import { initialRoutes, DRAFT_ROUTE_ID, PENDING_ROUTE_ID, validCoordinates, parseRoute, findDuplicate, applyRecordChange, planPhotoAssociation, locatedDetections } from './tracking.mjs';

const $ = id => document.getElementById(id);
const analysisLabels = { ...categories, sin_hallazgo: 'Sin hallazgo visible', no_concluyente: 'No concluyente' };
let records = structuredClone(seedRecords).map(r => ({ ...r, routeId: DRAFT_ROUTE_ID })), selected = null, direction = 'ida', placing = null, busy = false, configured = false, db;
let routes = structuredClone(initialRoutes), activeRouteId = DRAFT_ROUTE_ID, tracing = false, tracePoints = [];
let map, markers, lines, toastTimer;
let importingPhotos = false;
let pastoRoute = null;
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
  const reported = routes.find(r => r.id === DRAFT_ROUTE_ID);
  if (reported?.status === 'draft') { reported.name = initialRoutes.find(r => r.id === DRAFT_ROUTE_ID).name; reported.status = 'reported'; await persist(reported, 'routes'); }
  try {
    const prior = localStorage.getItem('via-clara:active-route');
    if (localStorage.getItem('via-clara:reported-route-confirmed') !== '1') {
      activeRouteId = DRAFT_ROUTE_ID;
      localStorage.setItem('via-clara:active-route', activeRouteId);
      localStorage.setItem('via-clara:reported-route-confirmed', '1');
    } else if (routes.some(r => r.id === prior)) activeRouteId = prior;
  } catch {}
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
async function associatePhoto(target,evidence){
  if(busy||pendingAnalysis.has(target.id)||pendingAnalysis.has(evidence.id))return toast('Espera a que termine el análisis antes de asociar la foto.');
  try{
    if(!db)throw new Error('El almacenamiento del navegador no está disponible.');
    const changes=planPhotoAssociation(target,evidence);
    await new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');for(const record of changes)tx.objectStore('records').put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('No se pudo guardar la asociación.'));});
    records=records.map(record=>changes.find(change=>change.id===record.id)||record);render();toast('Fotografía y asociación guardadas juntas. La evidencia anterior se conserva en el historial.');
  }catch(error){toast('No se cambió la asociación: '+error.message);}
}
function render() {
  try { localStorage.setItem('via-clara:active-route', activeRouteId); } catch {}
  const scoped = routeRecords();
  const inventory=scoped.filter(r=>r.source!=='Fotografía original de la carpeta del proyecto');
  $('total').textContent = inventory.length;
  const baches = inventory.filter(r => r.category === 'bache').length;
  $('potholes').textContent = baches; $('others').textContent = inventory.length - baches;
  $('global-ai-status').textContent = configured ? 'IA configurada' : 'IA sin activar';
  $('global-ai-status').classList.toggle('ready', configured);
  $('map-empty').hidden = scoped.some(r => locatedDetections(r).length) || Boolean(activeRoute().points?.length) || (activeRouteId === DRAFT_ROUTE_ID && Boolean(pastoRoute?.[direction]?.coordinates?.length));
  $('show-draft').hidden = activeRouteId === DRAFT_ROUTE_ID;
  $('located').replaceChildren(document.createTextNode(`${inventory.filter(hasLocation).length} `), el('em', `/ ${inventory.length}`));
  $('route-select').replaceChildren(...routes.map(r => { const option = el('option', r.name); option.value = r.id; return option; })); $('route-select').value = activeRouteId;
  $('route-state').textContent = activeRouteId === DRAFT_ROUTE_ID ? 'Recorrido de ida y regreso proporcionado y confirmado por el usuario. Las ubicaciones exactas y el trazado GPS están pendientes de registrar.' : activeRoute().status === 'pending' ? 'Nuevo recorrido sin trazado registrado.' : 'Ruta introducida por el usuario · pendiente de verificación en campo.';
  $('route-origin').textContent = activeRouteId === DRAFT_ROUTE_ID ? (direction === 'ida' ? 'Parque Bolívar' : 'Universidad Cooperativa de Colombia') : 'Origen por confirmar';
  $('route-destination').textContent = activeRouteId === DRAFT_ROUTE_ID ? (direction === 'ida' ? 'Universidad Cooperativa de Colombia' : 'Parque Bolívar') : 'Destino por confirmar';
  $('route-summary').textContent = activeRouteId === DRAFT_ROUTE_ID ? (routeInfo[direction] || 'Fotografías originales del recorrido · sentido y ubicación pendientes de confirmar') : activeRoute().name;
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
    if (r.photo) { const thumb = el('img', undefined, 'record-thumb'); thumb.src = r.photo; thumb.alt = ''; thumb.loading = 'lazy'; button.append(thumb); }
    const copy = el('span', undefined, 'record-copy'); copy.append(el('strong', r.title));
    const type = el('small'); type.append(el('i', undefined, `dot ${r.category}`), document.createTextNode(`${categories[r.category]} · ${r.id}`));
    copy.append(type, el('small', hasLocation(r) ? '● Ubicación registrada' : '○ Ubicación pendiente', 'record-status')); button.append(copy);
    button.onclick = () => { cameraControls.stop(); selected = r.id; placing = null; render(); if (hasLocation(r) && map) map.setView([r.lat, r.lng], 17); };
    $('records').append(button);
  }
  document.querySelectorAll('[data-direction]').forEach(b => { const active = b.dataset.direction === direction; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  renderDetail(); renderMap(); renderGallery();
}
function selectEvidence(record) {
  cameraControls.stop(); selected = record.id; direction = record.direction; placing = null;
  $('category').value = 'all'; $('location-filter').value = 'all'; $('search').value = '';
  render(); $('detail').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderGallery() {
  const scoped = routeRecords(), visible = galleryRecords(scoped, $('gallery-type').value).sort((a,b)=>Number(Boolean(b.photo))-Number(Boolean(a.photo)) || a.order-b.order);
  const photos = scoped.filter(r => r.photo).length;
  $('gallery-count').textContent = `${visible.length} ${visible.length === 1 ? 'evidencia' : 'evidencias'}`;
  $('gallery-note').textContent = photos ? `${photos} fotografías originales adjuntas. Las observaciones sin imagen siguen pendientes de evidencia.` : 'Aún no hay fotografías originales adjuntas a este recorrido. Puedes cargar varias a la vez o añadirlas a cada reporte.';
  $('photo-batch').disabled = importingPhotos;
  $('gallery-import-state').textContent = importingPhotos ? 'Validando y guardando las imágenes…' : 'JPG, PNG o WebP · 3 MB por imagen · Hasta 20 por carga';
  $('evidence-cards').replaceChildren();
  if (!visible.length) {
    const empty = el('div',undefined,'gallery-empty'); empty.append(el('span','↥','empty-symbol'),el('h3','Tus fotografías van aquí'),el('p','Adjunta los archivos originales para documentar los baches. Los accesos directos de Windows no incluyen la imagen.'));
    const attach = el('button','Adjuntar fotografías','primary'); attach.type='button'; attach.onclick=()=>$('photo-batch').click(); empty.append(attach); $('evidence-cards').append(empty);
  }
  for (const r of visible) {
    const card = el('article',undefined,'evidence-card');
    const media = el('div',undefined,'evidence-media');
    if (r.photo) { const image = el('img'); image.src=r.photo; image.alt=`Evidencia de ${r.title}`; image.loading='lazy'; media.append(image); }
    else { media.classList.add('missing-photo'); media.append(el('span','▧','missing-icon'),el('span','Sin fotografía original')); }
    const badge = el('span',categories[r.category],`photo-badge ${r.category}`); media.append(badge); card.append(media);
    const info=el('div',undefined,'evidence-info'); info.append(el('small',r.source?.includes('Relato')?'REPORTE DEL RECORRIDO':'FOTOGRAFÍA DEL USUARIO'),el('h3',r.title),el('p',hasLocation(r)?'● Ubicación registrada':'○ Pendiente de ubicación','evidence-location'));
    const note=el('span',r.analysis?'IA analizada · requiere revisión':r.reviewMethod?'Revisión visual preliminar · no IA':r.photo?'Pendiente de análisis':'Pendiente de evidencia','evidence-status'); info.append(note);
    const actions=el('div',undefined,'evidence-actions'); const view=el('button','Ver ficha ↗','outline'); view.type='button'; view.onclick=()=>selectEvidence(r); actions.append(view);
    if (!r.photo) { const attach=el('button','Adjuntar foto','text-button'); attach.type='button'; attach.onclick=()=>{selectEvidence(r);$('photo').click();}; actions.append(attach); }
    if (r.photo && r.source === 'Fotografía original de la carpeta del proyecto') {
      const associate=el('select'); associate.setAttribute('aria-label',`Asociar ${r.title} a un reporte`);
      const placeholder=el('option',r.linkedTo ? `Asociada a ${r.linkedTo}` : 'Asociar foto a un reporte…'); placeholder.value='';associate.append(placeholder);
      for(const target of scoped.filter(item=>item.source?.includes('Relato'))){const option=el('option',`${target.id} · ${target.title}`);option.value=target.id;associate.append(option);}
      associate.onchange=async()=>{const target=records.find(item=>item.id===associate.value);if(!target)return;if(target.photo&&!confirm('Este reporte ya tiene foto. La anterior se conservará en su historial. ¿Asociar esta fotografía?'))return;await associatePhoto(target,r);};
      actions.append(associate);
    }
    info.append(actions);card.append(info);$('evidence-cards').append(card);
  }
}
function renderDetail() {
  const r = current(); $('detail').hidden = !r; if (!r) { $('record-history').replaceChildren(); return; }
  $('detail-id').textContent = `${r.id} / ${r.direction === 'ida' ? 'IDA' : 'REGRESO'} / ${r.source}`;
  $('detail-title').textContent = r.title; $('detail-description').textContent = r.description; $('detail-category').textContent = categories[r.category]; $('edit-category').value = r.category;
  $('edit-title').value = r.title; $('edit-description').value = r.description;
  $('analysis-origin').textContent = r.analysis ? (r.analysisOrigin || 'Análisis previo · origen sin verificar') : (r.reviewMethod || 'Pendiente de análisis real. Las observaciones del recorrido son reportes del usuario, no detecciones de IA.');
  $('photo-empty').hidden = Boolean(r.photo); $('photo-preview').hidden = !r.photo; $('remove-photo').hidden = !r.photo;
  $('photo-stage').hidden = !r.photo;
  if (r.photo) $('photo-preview').src = r.photo; else $('photo-preview').removeAttribute('src');
  $('lat').value = r.lat ?? ''; $('lng').value = r.lng ?? '';
  $('location-status').textContent = hasLocation(r) ? `Origen: ${r.locationSource || 'Registro manual'}. Posición aportada por el usuario; no verificada en campo.` : 'Sin coordenadas: este reporte aún no aparece en el mapa.';
  $('analyze').disabled = !r.photo || !configured || busy || importingPhotos;
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
  if(activeRouteId===DRAFT_ROUTE_ID && pastoRoute && !activeRoute().points?.length){
    const road=pastoRoute[direction];
    if(road?.coordinates?.length)L.polyline(road.coordinates.map(([lng,lat])=>[lat,lng]),{color:direction==='ida'?'#ed713e':'#2675c9',weight:5,opacity:.85}).bindTooltip('Recorrido reconstruido sobre calles reales · confirmar giros en campo').addTo(lines);
    const labels={margarita:'Margarita Pinta · Comuna 9',calle19b:'Calle 19B',calle18cra40:'Calle 18 / carrera 40',calle19cra40:'Calle 19 / carrera 40',calle19:'Calle 19',parque:'Parque Bolívar',hospital:'Hospital Departamental',batallon:'Batallón Boyacá',colombia:'Av. Colombia',santander:'Av. Santander',puentes:'Sector Dos Puentes',pedagogico:'Colegio Pedagógico',hotel:'Hotel V1501',morasurco:'Calle 22 · Morasurco',cra44:'Carrera 44',ucc:'UCC · carrera 45',cra31:'Carrera 31C',calle21:'Calle 21',panaderia:'Iglesia de la Panadería'};
    for(const key of road?.waypointKeys||[]){const [lng,lat]=pastoRoute.references[key];L.circleMarker([lat,lng],{radius:5,color:'#17273e',fillColor:'#fff',fillOpacity:1,weight:2}).bindPopup(`${labels[key]||key}<br>Referencia cartográfica del recorrido; no es un bache detectado.`).addTo(lines);}
    const sectors=new Map();
    for(const report of filtered()){
      const key=pastoRoute.reportSectors?.[report.id];if(!key||hasLocation(report))continue;
      if(!sectors.has(key))sectors.set(key,[]);sectors.get(key).push(report);
    }
    for(const [key,reports] of sectors){
      const [lng,lat]=pastoRoute.references[key],popup=el('div');
      popup.append(el('strong','Sector aproximado del relato'),el('p','Referencia cartográfica. No representa la ubicación exacta de cada irregularidad.'));
      for(const report of reports){const button=el('button',`${report.id} · ${categories[report.category]} · ${report.title}`,'sector-report');button.onclick=()=>selectEvidence(report);popup.append(button);}
      L.circle([lat,lng],{radius:85,color:reports.some(r=>r.category==='bache')?'#dd6845':'#c29a2c',weight:2,dashArray:'5 5',fillOpacity:.12}).bindPopup(popup).addTo(markers);
    }
  }
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
    const {photo,photoHash} = await readPhotoFile(file);
    if (pendingAnalysis.has(id)) throw new Error('Espera a que termine el análisis de esta foto antes de cambiarla.');
    const duplicate = findDuplicate(records, { ...records.find(r => r.id === id), photo, photoHash });
    if (duplicate && !confirm(`Esta imagen o una ubicación equivalente ya está en ${duplicate.id}. ¿Conservarla también en esta observación?`)) return;
    if (await update(id, { photo, photoHash, analysis: null, analysisOrigin: null, status: 'Evidencia cargada' })) toast(`Fotografía guardada en ${id}.`);
  } catch (error) { toast(error.message); }
}
for (const [key, label] of Object.entries(categories)) { const option = el('option', label); option.value = key; $('edit-category').append(option); }
document.querySelectorAll('[data-direction]').forEach(button => button.onclick = () => { cameraControls.stop(); direction = button.dataset.direction; selected = routeRecords().find(r => r.direction === direction)?.id || null; placing = null; render(); if(pastoRoute?.[direction]?.coordinates?.length && activeRouteId===DRAFT_ROUTE_ID)$('fit').click(); });
for (const id of ['search', 'category', 'location-filter']) $(id).addEventListener(id === 'search' ? 'input' : 'change', render);
$('edit-category').onchange = async e => { if (await update(selected, { category: e.target.value, status: 'Clasificación revisada manualmente' })) toast('Clasificación guardada.'); };
for (const id of ['photo', 'camera']) $(id).onchange = e => { upload(e.target.files[0]); e.target.value = ''; };
const cameraControls = setupCapture(upload, toast);
$('save-description').onclick = () => { if (!selected) return; const title = $('edit-title').value.trim(), description = $('edit-description').value.trim(); if (!title || title.length > 120 || description.length > 1600) return toast('Escribe un título de hasta 120 caracteres y una descripción de hasta 1600.'); update(selected, { title, description }); };
$('remove-photo').onclick = () => { if (pendingAnalysis.has(selected)) return toast('Espera a que termine el análisis antes de quitar esta foto.'); update(selected, { photo: null, analysis: null, status: 'Pendiente de evidencia' }); };
$('save-location').onclick = async () => {
  const lat = Number($('lat').value), lng = Number($('lng').value);
  if (!$('lat').value.trim() || !$('lng').value.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return toast('Escribe una latitud y longitud válidas.');
  if (await savePoint(selected, null, lat, lng, 'Coordenadas introducidas manualmente')) { if (map) map.setView([lat, lng], 17); toast('Coordenadas guardadas.'); }
};
$('clear-location').onclick = () => { placing = null; update(selected, { lat: null, lng: null, locationSource: null }); };
$('place').onclick = () => { if (!map) return toast('El mapa no está disponible. Puedes introducir las coordenadas manualmente.'); placing = selected; renderDetail(); $('map').scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Pulsa en el mapa la ubicación de este reporte.'); };
$('gps').onclick = () => {
  if (!navigator.geolocation) return toast('Este navegador no dispone de ubicación GPS.');
  if (!confirm('Usa esta opción solo si estás junto al punto reportado. Se guardará tu posición actual, no el lugar de una foto antigua. ¿Estás allí?')) return;
  const id = selected;
  navigator.geolocation.getCurrentPosition(async position => { const { latitude: lat, longitude: lng, accuracy } = position.coords; if (!validCoordinates(lat, lng)) return toast('El GPS no devolvió coordenadas válidas.'); if (await update(id, { lat, lng, locationSource: `GPS actual · precisión indicada ±${Math.round(accuracy)} m` })) { if (map) map.setView([lat, lng], 17); toast(`Ubicación guardada para ${id}; precisión indicada ±${Math.round(accuracy)} m.`); } }, () => toast('No se obtuvo el GPS. Permite la ubicación o registra el punto manualmente.'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
};
$('fit').onclick = () => { const points = [...filtered().flatMap(locatedDetections).map(r => [r.lat, r.lng]), ...(activeRoute().points || []), ...(activeRouteId===DRAFT_ROUTE_ID?(pastoRoute?.[direction]?.coordinates||[]).map(([lng,lat])=>[lat,lng]):[])]; if (!map) return toast('El mapa no está disponible.'); if (!points.length) return toast('No hay ubicaciones ni trazado confirmados para esta ruta.'); map.fitBounds(points, { padding: [45, 65], maxZoom: 17 }); };
$('analyze').onclick = async () => {
  const r = current(); if (!r?.photo || !configured || busy) return;
  busy = true; pendingAnalysis.add(r.id); renderDetail();
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: r.photo }), signal: AbortSignal.timeout(55_000) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo analizar.');
    if (!analysisLabels[data.analysis?.category] || typeof data.analysis.summary !== 'string' || !Array.isArray(data.analysis.warnings)) throw new Error('El proveedor devolvió un análisis inválido.');
    if (await update(r.id, { analysis: data.analysis, analysisOrigin: 'Proveedor real de visión · pendiente de validación humana', analyzedAt: new Date().toISOString(), status: 'IA analizada · pendiente de revisión' })) toast(`Análisis guardado en ${r.id}. Revisa la sugerencia antes de aplicarla.`);
  } catch (error) { toast(error.name === 'TimeoutError' ? 'Se agotó el tiempo del análisis. La fotografía se conserva.' : error.message); }
  finally { busy = false; pendingAnalysis.delete(r.id); renderDetail(); }
};
$('apply-analysis').onclick = async () => { const r = current(); if (!r.analysis || !categories[r.analysis.category]) return; if (await update(r.id, { category: r.analysis.category, status: 'Sugerencia de IA aceptada por el usuario' })) toast('Clasificación sugerida aplicada.'); };
$('export').onclick = () => {
  const payload = { version: 2, exportedAt: new Date().toISOString(), routeInfo, routes, activeRouteId, notes: ['El recorrido de ida y regreso fue proporcionado por el usuario; sus observaciones no son detecciones de IA.', 'Coordenadas aportadas por el usuario, no verificadas en campo.', 'Las cajas en la foto no proporcionan por sí mismas coordenadas geográficas.'], records };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })); const a = el('a'); a.href = url; a.download = 'via-clara-pasto.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Exportación completa, incluidas las fotos cargadas.');
};
$('export-map').onclick = () => {
  const data=toGeoJSON(routeRecords(), [activeRoute()]);
  if(activeRouteId===DRAFT_ROUTE_ID && pastoRoute && !activeRoute().points?.length)for(const sense of ['ida','regreso'])data.features.push({type:'Feature',geometry:{type:'LineString',coordinates:pastoRoute[sense].coordinates},properties:{direction:sense,source:pastoRoute.source,status:'Reconstrucción cartográfica del relato · no GPS',approximate:true}});
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' }));
  const link = el('a'); link.href = url; link.download = 'via-clara-recorrido.geojson'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Mapa exportado sin fotografías. Los trazados reconstruidos están identificados como aproximados.');
};
$('restore-backup').onchange = async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  if (busy) return toast('Espera a que termine el análisis antes de restaurar datos.');
  try {
    if (file.size > 150 * 1024 * 1024) throw new Error('El respaldo supera 150 MB.');
    if (!db) throw new Error('No está disponible el almacenamiento del navegador.');
    const plan = planRestore(JSON.parse(await file.text()), records, routes);
    if (!plan.records.length && !plan.routes.length) return toast('El respaldo ya está incorporado; no se duplicaron los registros idénticos.');
    if (!confirm(`Se añadirán ${plan.records.length} observaciones y ${plan.routes.length} recorridos. Los datos actuales se conservan. ¿Restaurar?`)) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['records','routes'], 'readwrite');
      for (const r of plan.routes) tx.objectStore('routes').put(r);
      for (const r of plan.records) tx.objectStore('records').put(r);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('No se pudo restaurar.'));
    });
    records.push(...plan.records); routes.push(...plan.routes); cameraControls.stop(); render(); toast('Respaldo restaurado. Puedes seleccionar sus recorridos en la lista.');
  } catch (error) { toast(`No se restauraron datos: ${error.message}`); }
};
$('route-select').onchange = e => {
  cameraControls.stop();
  activeRouteId = e.target.value; selected = null; placing = null; tracing = false; tracePoints = [];
  try { localStorage.setItem('via-clara:active-route', activeRouteId); } catch {}
  render(); if (map && activeRoute().points?.length >= 2) map.fitBounds(activeRoute().points, { padding: [40, 40] }); else if (map) map.setView([1.221, -77.281], 14);
};
$('new-route').onclick = async () => {
  const name = $('route-name').value.trim(); if (!name || name.length > 120) return toast('Escribe un nombre de recorrido de hasta 120 caracteres.');
  const route = { id: crypto.randomUUID(), name, status: 'pending', points: [], createdAt: new Date().toISOString() };
  try { await persist(route, 'routes'); routes.push(route); activeRouteId = route.id; selected = null; render(); toast('Recorrido creado sin coordenadas. Configura su trazado cuando tengas la ruta definitiva.'); } catch { toast('No se pudo guardar el recorrido.'); }
};
async function saveRoute(points) {
  const old = activeRoute();
  if (points.length < 2) return toast('Añade al menos dos puntos al trazado.');
  const route = { ...old, points, status: 'user-provided', updatedAt: new Date().toISOString(), history: [...(old.history || []), { at: new Date().toISOString(), points: old.points || [] }] };
  try { await persist(route, 'routes'); routes = routes.map(r => r.id === route.id ? route : r); tracing = false; tracePoints = []; render(); map?.fitBounds(points, { padding: [40, 40] }); toast('Trazado guardado. No se ajusta automáticamente a la red de calles.'); } catch { toast('No se pudo guardar el trazado.'); }
}
$('import-route').onclick = () => { try { void saveRoute(parseRoute($('route-geojson').value)); } catch (error) { toast(error.message); } };
$('trace-route').onclick = () => { if (!map) return toast('El mapa no está disponible.'); tracing = !tracing; placing = null; tracePoints = []; $('save-trace').hidden = !tracing; $('map-notice').textContent = tracing ? 'Pulsa en el mapa los puntos de tu ruta, en orden, y después «Guardar trazado».' : 'Trazado manual cancelado; los datos guardados se conservan.'; };
$('save-trace').onclick = () => saveRoute(tracePoints);
$('new-record').onclick = async () => {
  cameraControls.stop();
  const now = new Date().toISOString();
  const record = { id: crypto.randomUUID(), routeId: activeRouteId, direction, order: routeRecords().filter(r => r.direction === direction).length + 1, title: 'Nueva observación vial', description: 'Captura o carga una fotografía y confirma la ubicación.', category: 'pendiente', lat: null, lng: null, photo: null, analysis: null, source: 'Captura del usuario · pendiente de análisis', status: 'Pendiente de evidencia', createdAt: now, history: [] };
  try { await persist(record); records.push(record); selected = record.id; $('category').value = 'all'; $('location-filter').value = 'all'; $('search').value = ''; render(); $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { toast('No se pudo crear la observación.'); }
};
$('gallery-type').onchange=renderGallery;
$('show-draft').onclick=()=>{ $('route-select').value=DRAFT_ROUTE_ID; $('route-select').dispatchEvent(new Event('change')); $('gallery-type').value='bache'; renderGallery(); $('evidence-gallery').scrollIntoView({behavior:'smooth',block:'start'}); };
$('photo-batch').onchange=async e=>{
  const files=Array.from(e.target.files);e.target.value='';
  if(!files.length)return;
  if(importingPhotos||busy)return toast('Espera a que termine la operación actual.');
  if(files.length>20)return toast('Puedes adjuntar hasta 20 fotografías en cada carga.');
  if(!db)return toast('El almacenamiento del navegador no está disponible.');
  const routeId=activeRouteId, captureDirection=direction; importingPhotos=true;renderGallery();renderDetail();
  try {
    const additions=[];let skipped=0;
    for(const file of files){
      const prepared=await readPhotoFile(file);
      const duplicate=[...records,...additions].some(r=>r.routeId===routeId&&(r.photo===prepared.photo||(prepared.photoHash&&r.photoHash===prepared.photoHash)));
      if(duplicate){skipped++;continue;}
      const now=new Date().toISOString();additions.push({id:crypto.randomUUID(),routeId,direction:captureDirection,order:records.filter(r=>r.routeId===routeId&&r.direction===captureDirection).length+additions.length+1,title:file.name.replace(/\.[^.]+$/,'').slice(0,120),description:'Fotografía adjuntada por el usuario. Clasificación y ubicación pendientes de revisión.',category:'pendiente',lat:null,lng:null,...prepared,analysis:null,source:'Fotografía original adjuntada por el usuario',status:'Evidencia cargada · pendiente de análisis',createdAt:now,history:[]});
    }
    if(activeRouteId!==routeId)throw new Error('Cambiaste de recorrido durante la carga. Selecciona el recorrido y vuelve a adjuntar las fotos.');
    if(additions.length)await new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');for(const r of additions)tx.objectStore('records').put(r);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('No se pudo guardar el lote.'));});
    records.push(...additions);$('gallery-type').value='all';render();toast(`${additions.length} fotografías adjuntas${skipped?`; ${skipped} duplicadas omitidas`:''}. Clasificación y ubicación pendientes.`);
  }catch(error){toast(`No se guardó el lote: ${error.message}`);}
  finally{importingPhotos=false;renderGallery();renderDetail();}
};
try { await openStorage(); } catch { toast('No se pudo abrir el almacenamiento local. Puedes explorar el inventario, pero no guardar cambios.'); }
setupMap(); render();
try {
  const response=await fetch('/pasto-route.json');if(!response.ok)throw new Error();
  pastoRoute=await response.json();render();if(activeRouteId===DRAFT_ROUTE_ID)$('fit').click();
}catch{toast('No se pudo cargar el trazado de Pasto. Los reportes se conservan.');}
async function loadProjectPhotos(){
  try{
    const response=await fetch('/evidence/manifest.json');if(!response.ok)throw new Error('No se pudo leer el inventario de fotografías.');
    const manifest=await response.json();
    let count=0;
    for(const [index,item] of manifest.entries()){
      const existing=records.find(r=>r.id===item.id);
      if(existing){
        if(item.reviewedCategory && existing.category==='pendiente' && !existing.history?.length){const revised={...existing,category:item.reviewedCategory,reviewMethod:item.reviewMethod};if(db)await persist(revised);Object.assign(existing,revised);}
        continue;
      }
      const response=await fetch(`/evidence/${item.file}`);if(!response.ok)throw new Error(`No se pudo cargar ${item.originalName}.`);
      const prepared=await readPhotoFile(new File([await response.blob()],item.originalName,{type:'image/jpeg'}));
      if(prepared.photoHash!==item.sha256)throw new Error('La fotografía no coincide con el original.');
      const record={id:item.id,routeId:DRAFT_ROUTE_ID,direction:'sin-asignar',order:index+1,title:`Fotografía del recorrido ${String(index+1).padStart(2,'0')}`,description:`Archivo original: ${item.originalName}. Relación con el reporte y sentido pendientes de confirmar.`,category:item.reviewedCategory||'pendiente',reviewMethod:item.reviewMethod,lat:null,lng:null,...prepared,analysis:null,source:'Fotografía original de la carpeta del proyecto',status:'Foto original · pendiente de validación y ubicación',history:[]};
      if(db)await persist(record);records.push(record);count++;
      if(count%8===0)renderGallery();
    }
    render();if(count)toast(`${count} fotografías originales incorporadas. Puedes asociarlas a los reportes del recorrido.`);
  }catch(error){render();toast(error.message);}
}
void loadProjectPhotos();
try { const response = await fetch('/api/config'); if (!response.ok) throw new Error(); const data = await response.json(); configured = data.configured === true; $('ai-status').textContent = configured ? 'Proveedor configurado' : 'Sin configurar'; render(); }
catch { $('ai-status').textContent = 'Servidor no disponible'; }
