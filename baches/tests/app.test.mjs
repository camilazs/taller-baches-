import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';
import { validateImage, validateAnalysis, analyzeImage } from '../vision.mjs';
import { seedRecords } from '../dist/records.mjs';

test('inventario del relato conserva orden, sentidos y categorías sin GPS ni IA inventados', () => {
  assert.equal(seedRecords.length, 33);
  assert.equal(new Set(seedRecords.map(r => r.id)).size, 33);
  for (const [category, count] of Object.entries({ bache: 20, reductor: 8, desnivel: 4, rampa: 1 })) assert.equal(seedRecords.filter(r => r.category === category).length, count);
  for (const [direction, length] of [['ida', 12], ['regreso', 21]]) assert.deepEqual(seedRecords.filter(r => r.direction === direction).map(r => r.order), Array.from({ length }, (_, i) => i + 1));
  assert.ok(seedRecords.every(r => r.lat === null && r.lng === null && r.photo === null && r.analysis === null));
});
test('rechaza accesos directos, firma falsa, exceso de tamaño y análisis no válido', () => {
  assert.throws(() => validateImage('C:\\foto.lnk'));
  assert.throws(() => validateImage('data:image/jpeg;base64,' + Buffer.alloc(20).toString('base64')));
  assert.throws(() => validateImage('data:image/jpeg;base64,' + Buffer.alloc(3 * 1024 * 1024 + 1).toString('base64')));
  assert.throws(() => validateAnalysis({ category: 'bache', confidence: 'seguro', summary: 'Bache', warnings: [] }));
  assert.throws(() => validateAnalysis({ category: 'hueco', confidence: 'alta', summary: 'Bache', warnings: [] }));
  assert.equal(validateAnalysis({ category: 'no_concluyente', confidence: 'baja', summary: 'No se aprecia la vía.', warnings: ['Imagen borrosa'], detections: [] }).category, 'no_concluyente');
  assert.throws(() => validateAnalysis({ category: 'bache', confidence: 'alta', summary: 'PRUEBA', warnings: [], detections: [{ category: 'bache', confidence: 'alta', description: 'PRUEBA', box: { x: .9, y: .2, width: .3, height: .2 } }] }), /región/);
  assert.throws(() => validateAnalysis({ category: 'sin_hallazgo', confidence: 'alta', summary: 'PRUEBA', warnings: [], detections: [{ category: 'bache', confidence: 'alta', description: 'PRUEBA', box: { x: .1, y: .2, width: .3, height: .2 } }] }), /contradice/);
});
test('contrato de visión transmite la imagen, valida el resultado y no inventa fallback (HTTP simulado)', async () => {
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const analysis = { category: 'reductor', confidence: 'media', summary: 'PRUEBA: reductor visible', warnings: ['PRUEBA, no análisis real'], detections: [{ category: 'reductor', confidence: 'media', description: 'PRUEBA: región de un reductor', box: { x: .1, y: .5, width: .8, height: .2 } }] };
  const result = await analyzeImage(image, async (url, options) => {
    const body = JSON.parse(options.body);
    assert.ok(url.endsWith('/chat/completions'));
    assert.equal(body.messages[1].content[1].image_url.url, image);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.ok(body.response_format.json_schema.schema.required.includes('detections'));
    return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(analysis) } }] }) };
  });
  assert.deepEqual(result, analysis);
  await assert.rejects(() => analyzeImage(image, async () => ({ ok: false, status: 401 })), /Proveedor/);
  await assert.rejects(() => analyzeImage(image, async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }) })), /incompleto/);
});
test('servidor sirve la web, mantiene claves privadas y bloquea llamadas cruzadas', async () => {
  const before = process.env.AI_API_KEY; delete process.env.AI_API_KEY;
  const server = createApp(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(base); assert.equal(page.status, 200); assert.match(await page.text(), /Vía Clara/);
    assert.equal((await fetch(base + '/backup.mjs')).status, 200);
    assert.equal((await fetch(base + '/photos.mjs')).status, 200);
    const leaflet=await fetch(base+'/vendor/leaflet.js');assert.equal(leaflet.status,200);assert.match(leaflet.headers.get('content-type'),/javascript/);
    const manifest=await (await fetch(base+'/evidence/manifest.json')).json();assert.equal(manifest.length,64);
    const original=await fetch(base+'/evidence/'+manifest[0].file);assert.equal(original.status,200);assert.equal(original.headers.get('content-type'),'image/jpeg');
    assert.equal((await fetch(base+'/pasto-route.json')).status,200);
    assert.equal((await fetch(base+'/evidence/secret.jpeg')).status,404);
    assert.deepEqual(await (await fetch(base + '/api/config')).json(), { configured: false });
    assert.equal((await fetch(base + '/.env.local')).status, 404);
    assert.equal((await fetch(base + '/server.mjs')).status, 404);
    assert.equal((await fetch(base + '/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 503);
    assert.equal((await fetch(base + '/api/analyze', { method: 'POST', headers: { Origin: 'https://example.org', 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); if (before === undefined) delete process.env.AI_API_KEY; else process.env.AI_API_KEY = before; }
});
