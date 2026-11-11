import { seedRecords, categories, routeInfo } from './records.mjs';
import { setupCapture } from './capture.mjs';
import { planRestore, toGeoJSON } from './backup.mjs';
import { initialRoutes, DRAFT_ROUTE_ID, PENDING_ROUTE_ID, validCoordinates, parseRoute, findDuplicate, applyRecordChange, locatedDetections } from './tracking.mjs';

const $ = id => document.getElementById(id);
const analysisLabels = { ...categories, sin_hallazgo: 'Sin hallazgo visible', no_concluyente: 'No concluyente' };
let records = structuredClone(seedRecords).map(r => ({ ...r, routeId: DRAFT_ROUTE_ID })), selected = null, direction = 'ida', placing = null, busy = false, configured = false, db;
let routes = structuredClone(initialRoutes), activeRouteId = PENDING_ROUTE_ID, tracing = false, tracePoints = [];
let map, markers, lines, toastTimer;
const pendingAnalysis = new Set();
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 6500); }