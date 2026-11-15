# Vía Clara · Captura visual de irregularidades viales

Aplicación web de presentación para el recorrido Parque Bolívar ↔ Universidad Cooperativa de Colombia en Pasto, Nariño. Conserva 33 reportes del relato (12 de ida y 21 de regreso) y 64 fotografías originales.

## Abrir en este equipo

Abre INICIAR.cmd con doble clic. El navegador abre http://127.0.0.1:3102 cuando el servidor está listo. Mantén la ventana de inicio abierta durante la presentación. Si el servidor ya está iniciado, se reutiliza. Requiere Node.js 22.19 o posterior; se probó con Node.js 24. No requiere npm install.

También puedes ejecutar npm.cmd start desde esta carpeta. El puerto se define en PORT dentro de .env.local; 3102 es el predeterminado. Abre la dirección que imprime el servidor. Abrir dist/index.html directamente no ejecuta la aplicación.

## Qué funciona

- Mapa interactivo con ida y regreso reconstruidos sobre calles reales mediante OpenStreetMap/OSRM, incluida la referencia Margarita Pinta.
- Consulta de reportes por sectores aproximados; coordenadas exactas por selección manual o GPS actual, únicamente al encontrarse junto al hallazgo.
- Galería con 64 JPEG originales, carga de archivos, captura desde cámara compatible y asociación de fotos a los reportes.
- Detección real mediante Gemini: clasificación y regiones aproximadas sobre la fotografía, revisión de sugerencias y guardado de resultados.
- Historial, archivo de fotos anteriores, detección de duplicados, respaldo JSON, restauración y exportación GeoJSON.
- Persistencia IndexedDB en el navegador. Las asociaciones se guardan en una sola transacción.

## Validación real para presentar

El 14 de noviembre de 2026 se realizaron llamadas reales con Gemini y las fotos originales 29 y 42. La primera devolvió bache y la segunda reductor, ambos con una región. Las respuestas completas se conservan en docs/validacion-ia-20261114.json y docs/validacion-reductor-20261114.json. El manifiesto fotográfico identifica esos resultados con fecha, proveedor, modelo y hash de la foto. Se muestran como análisis reales guardados, nunca como una nueva llamada en vivo. Puedes pulsar Analizar fotografía para solicitar un análisis nuevo.

Las 33 observaciones del relato, los sectores aproximados y las clasificaciones visuales preliminares se distinguen de los resultados reales del proveedor. No se ha medido precisión global con el conjunto de 64 imágenes. Las regiones requieren revisión humana. El trazado reconstruido no es una grabación GPS y los sectores no certifican posiciones exactas de baches.

## Configuración privada

En el equipo de entrega existe .env.local configurado con una clave autorizada de Gemini. Ese archivo no se publica ni se incluye en el ZIP. Para otro equipo, copia .env.gemini.example como .env.local, configura tu propia AI_API_KEY y reinicia. AI_BASE_URL y AI_MODEL están en la plantilla. Nunca publiques claves en GitHub.

La cuenta configurada se comprobó en nivel gratuito. Las cuotas y disponibilidad pertenecen al proveedor; la aplicación muestra errores sin inventar detecciones. No se activó facturación. Internet es necesario para analizar fotos y cargar teselas del mapa. Leaflet y las fotos se sirven localmente. La cámara requiere HTTPS o localhost y permiso del navegador.

## Guardar el trabajo

Los datos se conservan en el mismo navegador y origen: cambiar localhost/127.0.0.1 o el puerto cambia el almacenamiento. Usa Exportar respaldo antes de cambiar de equipo. Restaurar respaldo valida los datos y conserva versiones en conflicto. El repositorio no sincroniza los datos personales del navegador.

El servidor solo escucha en este equipo. No hay despliegue público ni acceso desde otro celular sin una publicación HTTPS configurada aparte.

## Pruebas y presentación

Ejecuta npm.cmd test. Hay 18 pruebas automatizadas de contratos, imágenes, persistencia de cambios, rutas, respaldos y asociaciones. Las pruebas automatizadas de proveedores usan HTTP simulado; las dos validaciones reales están documentadas por separado.

Consulta PRESENTACION.md para el recorrido de exposición y VALIDACION.md para los resultados y límites. La entrega reproducible se genera con scripts/crear-entrega.ps1 y excluye credenciales.

Fuentes: OpenStreetMap (ODbL), Nominatim, OSRM; Margarita Pinta: https://www.rappi.com.co/restaurantes/900178500-margarita-pinta. Leaflet 1.9.4. Gemini: https://aistudio.google.com/docs/openai y https://aistudio.google.com/docs/pricing. El nivel gratuito puede usar contenido para mejorar los productos según las condiciones del proveedor.
