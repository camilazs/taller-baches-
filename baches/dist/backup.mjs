import { categories } from './records.mjs';
import { validCoordinates, locatedDetections } from './tracking.mjs';
const labels = new Set([...Object.keys(categories), 'sin_hallazgo', 'no_concluyente']);
const text = (value, max) => typeof value === 'string' && value.length <= max;
const photoPattern = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;