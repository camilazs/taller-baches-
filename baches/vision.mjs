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