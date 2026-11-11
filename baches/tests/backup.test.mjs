import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup, planRestore, toGeoJSON } from '../dist/backup.mjs';
const route = { id: 'route', name: 'PRUEBA', points: [], status: 'pending' };