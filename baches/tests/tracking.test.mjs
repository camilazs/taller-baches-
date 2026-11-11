import test from 'node:test';
import assert from 'node:assert/strict';
import { initialRoutes, parseRoute, validCoordinates, findDuplicate, applyRecordChange, locatedDetections } from '../dist/tracking.mjs';