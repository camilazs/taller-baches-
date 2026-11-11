import { categories } from './records.mjs';
import { validCoordinates, locatedDetections } from './tracking.mjs';
const labels = new Set([...Object.keys(categories), 'sin_hallazgo', 'no_concluyente']);