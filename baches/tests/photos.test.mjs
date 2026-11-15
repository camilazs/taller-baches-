import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPhotoFile, galleryRecords, MAX_PHOTO_BYTES, withRecordedAnalysis } from '../dist/photos.mjs';

test('adjuntos rechazan accesos directos, firmas falsas y archivos demasiado grandes', () => {
  const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
  assert.doesNotThrow(() => assertPhotoFile({ type: 'image/png', size: png.length }, png));
  assert.throws(() => assertPhotoFile({ type: 'application/octet-stream', size: png.length }, png));
  assert.throws(() => assertPhotoFile({ type: 'image/jpeg', size: png.length }, png));
  assert.throws(() => assertPhotoFile({ type: 'image/png', size: MAX_PHOTO_BYTES + 1 }, png));
  assert.throws(() => assertPhotoFile({ type: 'image/png', size: 13 }, png));
});
test('resultados reales guardados se vinculan solo al hash original y respetan cambios del usuario',()=>{
  const photo={id:'foto',photo:'original',photoHash:'hash',analysis:null};
  const evidence={sha256:'hash',analysis:{summary:'Respuesta real previamente guardada'},analysisOrigin:'Proveedor real',analyzedAt:'2026-11-14'};
  const saved=withRecordedAnalysis(photo,evidence);assert.equal(saved.analysis.summary,evidence.analysis.summary);assert.equal(photo.analysis,null);
  assert.equal(withRecordedAnalysis({...photo,photoHash:'otro'},evidence).analysis,null);
  assert.equal(withRecordedAnalysis({...photo,photo:null},evidence).analysis,null);
  const removed={...saved,analysis:null};assert.equal(withRecordedAnalysis(removed,evidence),removed);
  const live={...photo,analysis:{summary:'Análisis posterior'}};assert.equal(withRecordedAnalysis(live,evidence).analysis.summary,'Análisis posterior');
});

test('galería mantiene evidencias y pendientes separados sin inventar fotografías', () => {
  const records = [{ id: 'a', category: 'bache', photo: null }, { id: 'b', category: 'pendiente', photo: 'original' }];
  assert.deepEqual(galleryRecords(records, 'bache'), [records[0]]);
  assert.deepEqual(galleryRecords(records, 'pendiente'), [records[1]]);
  assert.deepEqual(galleryRecords(records), records);
  assert.equal(records[0].photo, null);
});
