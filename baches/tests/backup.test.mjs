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
test('restauración no sobrescribe conflictos y omite copias idénticas', () => {
  const data={version:2,routes:[route],records:[record]};
  assert.equal(planRestore(data,[record],[route]).skipped,1);
  const restored=planRestore({...data,records:[{...record,title:'Otra versión'}]},[record],[route],()=> 'new-id');
  assert.equal(restored.records[0].id,'new-id'); assert.equal(record.title,'PRUEBA');
  assert.equal(planRestore({...data,records:[{...record,title:'Otra versión'}]},[record,...restored.records],[route]).records.length,0);
  const older=planRestore({version:1,records:[{...record,routeId:undefined}]},[],[]);
  assert.equal(older.records[0].routeId,'draft-original'); assert.equal(older.routes.length,1);
});