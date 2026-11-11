import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { seedRecords } from '../dist/records.mjs';

test('64 fotografías viales originales conservan firma y hash; se excluye la foto ajena al recorrido', async () => {
  const root=new URL('../dist/evidence/',import.meta.url);
  const files=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
  assert.equal(files.length,64);assert.equal(new Set(files.map(f=>f.id)).size,64);
  for(const f of files){
    assert.match(f.file,/^[a-f0-9]{16}\.jpeg$/);
    assert.match(f.originalName,/2026-10-25/);
    const bytes=await readFile(new URL(f.file,root));
    assert.equal(bytes.length,f.bytes);assert.deepEqual([...bytes.subarray(0,3)],[255,216,255]);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);
  }
});

test('ida y regreso contienen geometría vial de Pasto y separan sectores aproximados de GPS de baches', async()=>{
  const route=JSON.parse(await readFile(new URL('../dist/pasto-route.json',import.meta.url),'utf8'));
  for(const dir of ['ida','regreso']){
    assert.ok(route[dir].coordinates.length>100);
    assert.ok(route[dir].coordinates.every(([lng,lat])=>lng> -77.33&&lng< -77.24&&lat>1.18&&lat<1.26));
  }
  assert.ok(route.ida.waypointKeys.includes('calle19b'));
  assert.ok(route.regreso.waypointKeys.includes('calle18cra40'));
  assert.ok(route.regreso.waypointKeys.includes('calle19cra40'));
  for(const report of seedRecords){assert.ok(route.references[route.reportSectors[report.id]]);assert.equal(report.lat,null);assert.equal(report.lng,null);}
  assert.match(route.note,/No es un registro GPS/);
});
