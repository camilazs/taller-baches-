import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup, planRestore, toGeoJSON } from '../dist/backup.mjs';
const route = { id: 'route', name: 'PRUEBA', points: [], status: 'pending' };
const record = { id: 'record', routeId: 'route', title: 'PRUEBA', description: '', direction: 'ida', category: 'pendiente', lat: null, lng: null, photo: null, analysis: null, history: [] };
test('restauración valida datos y rechaza imágenes externas y coordenadas inválidas', () => {
  assert.equal(validateBackup({version:2,routes:[route],records:[record]}).records.length,1);
  assert.throws(() => validateBackup({version:2,routes:[route],records:[{...record,photo:'https://example.org/photo.jpg'}]}));
  assert.throws(() => validateBackup({version:2,routes:[route],records:[{...record,lat:100,lng:0}]}));
  assert.throws(() => validateBackup({version:2,routes:[route],records:[record,record]}));
});