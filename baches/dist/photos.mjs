export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export function assertPhotoFile(file, bytes) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 12 || file.size > MAX_PHOTO_BYTES || bytes.length !== file.size) throw new Error('Selecciona un JPG, PNG o WebP original de hasta 3 MB. Un acceso directo .lnk no contiene la fotografía.');
  const valid = file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n) : String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
  if (!valid) throw new Error('El contenido del archivo no coincide con el formato de imagen.');
}
export async function readPhotoFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer()); assertPhotoFile(file, bytes);
  const photo = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('No se pudo leer la fotografía.')); reader.readAsDataURL(file); });
  await new Promise((resolve,reject) => { const image = new Image(); image.onload = () => image.width && image.height && image.width * image.height <= 40_000_000 ? resolve() : reject(new Error('La imagen supera 40 megapíxeles o no tiene dimensiones válidas.')); image.onerror = () => reject(new Error('No se pudo abrir la fotografía.')); image.src = photo; });
  const photoHash = globalThis.crypto?.subtle ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n => n.toString(16).padStart(2,'0')).join('') : null;
  return { photo, photoHash, filename: file.name };
}
export function galleryRecords(records, category = 'all') { return records.filter(r => category === 'all' || r.category === category); }
