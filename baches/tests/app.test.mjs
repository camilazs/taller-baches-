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