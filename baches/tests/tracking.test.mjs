import test from 'node:test';
import assert from 'node:assert/strict';
import { initialRoutes, parseRoute, validCoordinates, findDuplicate, applyRecordChange, locatedDetections } from '../dist/tracking.mjs';
test('recorrido confirmado conserva coordenadas pendientes; trazado exige coordenadas válidas', () => {
  assert.ok(initialRoutes.every(r => r.points.length === 0));
  assert.equal(initialRoutes[0].status, 'pending');
  assert.equal(initialRoutes.find(r => r.id === 'draft-original').status, 'reported');
  assert.match(initialRoutes.find(r => r.id === 'draft-original').name, /Parque Bolívar/);
  // Coordenadas sintéticas únicamente de prueba; no corresponden al recorrido del usuario.
  assert.deepEqual(parseRoute(JSON.stringify({ type: 'LineString', coordinates: [[0, 0], [1, 1]] })), [[0, 0], [1, 1]]);
  assert.throws(() => parseRoute('{"type":"LineString","coordinates":[[200,100],[0,0]]}'));
  assert.throws(() => parseRoute('{"type":"Point","coordinates":[0,0]}'));
  assert.equal(validCoordinates(null, 0), false);
});
test('duplicados por foto o ubicación cercana solo en el mismo recorrido', () => {
  const r = { id: 'a', routeId: 'route1', category: 'bache', lat: 0, lng: 0, photo: 'foto-prueba' };
  assert.equal(findDuplicate([r], { ...r, id: 'b' }).id, 'a');
  assert.equal(findDuplicate([r], { ...r, id: 'b', photo: null, lat: .000001 }).id, 'a');
  assert.equal(findDuplicate([r], { ...r, id: 'b', routeId: 'otra' }), undefined);
  assert.equal(findDuplicate([r], { ...r, id: 'a' }), undefined);
});
test('historial conserva evidencias previas y registra cambios sin alterar el original', () => {
  const old = { id: 'a', category: 'pendiente', photo: 'foto-original', analysis: { summary: 'PRUEBA' } };
  const next = applyRecordChange(old, { category: 'bache', photo: 'foto-nueva' }, '2026-10-26T00:00:00.000Z');
  assert.equal(next.history.length, 1); assert.equal(next.evidenceHistory[0].photo, 'foto-original'); assert.equal(old.category, 'pendiente');
  assert.equal(applyRecordChange(old, { photo: null }).evidenceHistory[0].photo, 'foto-original');
});
test('hallazgos usan coordenadas propias o herencia explícita; no infieren GPS desde cajas', () => {
  const record = { lat: null, lng: null, analysis: { detections: [{ category: 'bache', box: { x: .2, y: .2, width: .2, height: .2 } }] } };
  assert.deepEqual(locatedDetections(record), []);
  const inherited = locatedDetections({ ...record, lat: 0, lng: 0 }); assert.equal(inherited[0].inherited, true);
  record.analysis.detections[0].location = { lat: 1, lng: 1 }; assert.equal(locatedDetections(record)[0].inherited, false);
});
