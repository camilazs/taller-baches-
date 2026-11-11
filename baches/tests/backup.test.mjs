import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup, planRestore, toGeoJSON } from '../dist/backup.mjs';
const route = { id: 'route', name: 'PRUEBA', points: [], status: 'pending' };
const record = { id: 'record', routeId: 'route', title: 'PRUEBA', description: '', direction: 'ida', category: 'pendiente', lat: null, lng: null, photo: null, analysis: null, history: [] };