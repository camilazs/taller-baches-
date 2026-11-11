const categories = ['bache', 'reductor', 'desnivel', 'rampa', 'sin_hallazgo', 'no_concluyente'];
export function validateImage(image) {
  if (typeof image !== 'string') throw new Error('Selecciona una fotografía.');
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match || match[2].length % 4 !== 0) throw new Error('Formato de imagen inválido.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 3 * 1024 * 1024 || bytes.length < 12 || bytes.toString('base64') !== match[2]) throw new Error('Imagen inválida o superior a 3 MB.');
  const valid = match[1] === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : match[1] === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw new Error('El contenido no coincide con el formato de la imagen.');
  return match[1];
}
export function validateAnalysis(data) {
  if (!data || typeof data !== 'object' || !categories.includes(data.category) || !['baja', 'media', 'alta'].includes(data.confidence) || typeof data.summary !== 'string' || data.summary.length < 1 || data.summary.length > 1600 || !Array.isArray(data.warnings) || data.warnings.length > 8 || data.warnings.some(x => typeof x !== 'string' || x.length > 500)) throw new Error('Respuesta de IA inválida.');
  if (!Array.isArray(data.detections) || data.detections.length > 20) throw new Error('Faltan las detecciones visuales o superan el límite.');
  for (const detection of data.detections) {
    if (!detection || !categories.slice(0, 4).includes(detection.category) || !['baja', 'media', 'alta'].includes(detection.confidence) || typeof detection.description !== 'string' || detection.description.length > 600 || !detection.box) throw new Error('Detección visual inválida.');
    const { x, y, width, height } = detection.box;
    if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1.00001 || y + height > 1.00001) throw new Error('La región detectada sale de la imagen.');
  }
  if (['sin_hallazgo', 'no_concluyente'].includes(data.category) && data.detections.length) throw new Error('El análisis contradice las regiones detectadas.');
  if (categories.slice(0, 4).includes(data.category) && !data.detections.some(d => d.category === data.category)) throw new Error('La categoría principal no aparece en las detecciones.');
  return { category: data.category, confidence: data.confidence, summary: data.summary, warnings: data.warnings, detections: data.detections };
}