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