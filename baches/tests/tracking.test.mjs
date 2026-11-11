import test from 'node:test';
import assert from 'node:assert/strict';
import { initialRoutes, parseRoute, validCoordinates, findDuplicate, applyRecordChange, locatedDetections } from '../dist/tracking.mjs';
test('ruta definitiva vacía; solo se admite trazado explícito con coordenadas válidas', () => {
  assert.ok(initialRoutes.every(r => r.points.length === 0));
  assert.equal(initialRoutes[0].status, 'pending');
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