# Entrega del sistema de baches · 11 de noviembre de 2026

Aplicación web local con captura de imagen, integración real de visión configurable, regiones detectadas sobre la foto, mapa, coordenadas por hallazgo, recorridos, historial y control de duplicados.

## Ejecutar

Requiere Node.js 22.9 o superior (recomendado 24). No necesita `npm install` porque solo usa módulos incluidos en Node. El mapa y las fuentes requieren Internet.

```powershell
npm.cmd start
```

Abrir http://127.0.0.1:3102. También puedes abrir `INICIAR.cmd` en Windows.

## Configurar detección real

Si no existe `.env.local`, copia `.env.example` a ese nombre. Configura tu clave privada `AI_API_KEY` y un `AI_MODEL` de visión que admita Chat Completions y salida JSON estructurada. `AI_BASE_URL` permite un proveedor compatible. Reinicia el servidor.

La aplicación no devuelve resultados inventados cuando falta configuración. Solo envía la foto al proveedor al pulsar analizar; no envía video continuo ni realiza reintentos pagados automáticos. La precisión de las cajas debe evaluarse con fotografías reales. No se han efectuado llamadas de pago ni medido precisión con las fotos del usuario.

## Flujo de uso

1. Crea o selecciona un recorrido. La ruta definitiva está pendiente; el inventario previo de 33 observaciones se conserva como borrador.
2. Configura el trazado mediante GeoJSON o puntos manuales en el mapa cuando dispongas de la ruta confirmada.
3. Crea una observación y toma o carga un JPG, PNG o WebP de hasta 3 MB.
4. Registra el GPS actual solo si estás en el lugar, o selecciona la ubicación manualmente.
5. Analiza con IA, revisa los hallazgos y asigna coordenadas propias a cada uno cuando corresponda. Una caja de píxeles no proporciona GPS.
6. Consulta marcadores, fotografías e historial. Las fotos anteriores se conservan al reemplazarlas.
7. Exporta un respaldo JSON o el mapa GeoJSON. Usa **Restaurar respaldo** para recuperarlo en otro navegador: se valida antes de escribir, se conservan conflictos como copias y la escritura es atómica.

Los datos se guardan en IndexedDB del navegador, no en GitHub. No hay sincronización automática entre teléfonos. Usarlo desde un celular físico requiere una publicación HTTPS autorizada; el servidor predeterminado solo escucha en este equipo.

## Qué incluye la entrega

Código, ejemplos de configuración sin claves, pruebas, documentación y capturas previas de verificación. Incluye `ENTREGA-MANIFEST.json` con las huellas SHA-256 de los archivos. No incluye `.env.local`, archivos Git, datos del navegador, claves, fotos originales ni los 68 accesos directos `.lnk` que se conservaron en la carpeta de trabajo.

Puedes generar otro ZIP desde la carpeta del proyecto:

```powershell
powershell -NoProfile -File .\scripts\crear-entrega.ps1
```

## Pendientes externos

Faltan la clave del proveedor, las fotografías originales accesibles y la ruta definitiva. Se puede ejecutar todo el flujo manual y probar contratos sin esos elementos; no se puede dar por validada una detección real sin ellos. Las capturas que dicen PRUEBA no son resultados de IA.

Para hacer commit en el repositorio de Camila, sigue `GIT-CAMILA.md`. Esta copia se incorpora al repositorio en una rama de trabajo. No se ha desplegado el servidor; consulta PUBLICACION.md.
