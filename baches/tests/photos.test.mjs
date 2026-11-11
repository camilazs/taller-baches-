import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPhotoFile, galleryRecords, MAX_PHOTO_BYTES } from '../dist/photos.mjs';

test('adjuntos rechazan accesos directos, firmas falsas y archivos demasiado grandes', () => {
  const png = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
  assert.doesNotThrow(() => assertPhotoFile({ type: 'image/png', size: png.length }, png));
  assert.throws(() => assertPhotoFile({ type: 'application/octet-stream', size: png.length }, png));
  assert.throws(() => assertPhotoFile({ type: 'image/jpeg', size: png.length }, png));
  assert.throws(() => assertPhotoFile({ type: 'image/png', size: MAX_PHOTO_BYTES + 1 }, png));
  assert.throws(() => assertPhotoFile({ type: 'image/png', size: 13 }, png));
});

test('galería mantiene evidencias y pendientes separados sin inventar fotografías', () => {
  const records = [{ id: 'a', category: 'bache', photo: null }, { id: 'b', category: 'pendiente', photo: 'original' }];
  assert.deepEqual(galleryRecords(records, 'bache'), [records[0]]);
  assert.deepEqual(galleryRecords(records, 'pendiente'), [records[1]]);
  assert.deepEqual(galleryRecords(records), records);
  assert.equal(records[0].photo, null);
});
