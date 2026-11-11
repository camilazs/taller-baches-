import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { analyzeImage, validateImage } from './vision.mjs';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpeg': 'image/jpeg', '.png': 'image/png' };
const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
export function createApp() {
  let analyzing = false;
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        // API local: no CORS, y rechazo explícito de solicitudes de otros sitios.
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(res, 403, { error: 'Origen no permitido.' });
        if (req.headers['sec-fetch-site'] === 'cross-site') return send(res, 403, { error: 'Origen no permitido.' });
        if (url.pathname === '/api/config' && req.method === 'GET') return send(res, 200, { configured: Boolean(process.env.AI_API_KEY?.trim()) });
        if (url.pathname !== '/api/analyze') return send(res, 404, { error: 'Ruta no encontrada.' });
        if (req.method !== 'POST') return send(res, 405, { error: 'Usa POST.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return send(res, 415, { error: 'Se requiere JSON.' });
        if (!process.env.AI_API_KEY?.trim()) return send(res, 503, { error: 'IA no configurada. Completa AI_API_KEY en .env.local y reinicia el servidor.' });
        if (analyzing) return send(res, 429, { error: 'Hay un análisis en curso. Espera a que termine.' });
        analyzing = true;
        try {
        let size = 0; const chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4_300_000) { send(res, 413, { error: 'La imagen supera el límite.' }); req.resume(); return; }
          chunks.push(chunk);
        }
        let data;
        try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(res, 400, { error: 'JSON inválido.' }); }
        try { validateImage(data?.image); } catch (error) { return send(res, 400, { error: error.message }); }
        return send(res, 200, { analysis: await analyzeImage(data.image) });
        } finally { analyzing = false; }
      }
      if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, { error: 'Método no permitido.' });
      const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      // Lista cerrada: no expone fotos, accesos directos, .env ni archivos del servidor.
      if (!['index.html', 'styles.css', 'app.mjs', 'records.mjs', 'capture.mjs', 'tracking.mjs', 'backup.mjs', 'photos.mjs', 'pasto-route.json', 'evidence/manifest.json', 'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/images/layers.png', 'vendor/images/layers-2x.png', 'vendor/images/marker-icon.png', 'vendor/images/marker-icon-2x.png', 'vendor/images/marker-shadow.png'].includes(file) && !/^evidence\/[a-f0-9]{16}\.jpeg$/.test(file)) return send(res, 404, { error: 'Archivo no encontrado.' });
      const content = await readFile(path.join(root, file));
      res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (!res.headersSent) send(res, error.name === 'TimeoutError' ? 504 : 502, { error: error.publicMessage || (error.name === 'TimeoutError' ? 'El proveedor tardó demasiado. Reintenta cuando quieras.' : 'No se pudo completar la solicitud. Comprueba el servidor y la configuración del proveedor.') });
      else res.end();
    }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3102);
  createApp().listen(port, '127.0.0.1', () => console.log(`Vía Clara disponible en http://127.0.0.1:${port}`));
}
