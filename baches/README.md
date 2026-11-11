# Vía Clara · Inventario vial de Pasto

Web local independiente de `taller`. Registra el recorrido Parque Bolívar ↔ Universidad Cooperativa de Colombia, con mapa OpenStreetMap/Leaflet, captura de imágenes y detección visual opcional con IA. No requiere instalar dependencias.

## Estado actualizado: recorrido y fotografías incorporados

El recorrido activo es **Parque Bolívar ↔ UCC · ida y regreso**, confirmado por el usuario. Conserva los 33 reportes originales. El mapa carga dos trazados sobre calles reales obtenidos de OSRM/OpenStreetMap y referencias buscadas en Nominatim. Son una reconstrucción del relato, no una grabación GPS. Se incorporaron las intersecciones calle 18/carrera 40 y calle 19/carrera 40 y la calle 19B. El desvío Margarita Pinta (Comuna 9, calle 20 #40A-10) se incorporó usando las coordenadas públicas de su ficha en Rappi; los giros requieren confirmación en campo. Las zonas discontinuas permiten consultar reportes del sector sin inventar posiciones exactas de cada bache.

Se conservan los recorridos creados, las coordenadas manuales y las fotos guardadas en el navegador. El trazado manual tiene prioridad sobre la reconstrucción. Puedes crear recorridos adicionales o importar GeoJSON.

**Nueva observación** crea un registro sin clasificar dentro del recorrido activo. Admite título, descripción, foto, coordenadas, análisis y seguimiento de cambios. Cada región detectada puede ubicarse por separado; mientras no tenga coordenadas propias, solo puede heredar la ubicación aproximada de su captura. Las cajas de píxeles nunca se transforman automáticamente en GPS.

El mapa muestra los hallazgos geolocalizados; seleccionar un marcador abre su ficha y fotografía. El historial conserva cambios y fotografías anteriores al reemplazarlas o retirarlas de la ficha. La comparación SHA-256 de imágenes y la proximidad de reportes de la misma categoría (menos de 3 m, dentro del mismo recorrido) advierten de posibles duplicados. La confirmación permite conservar hallazgos distintos cercanos.

El almacenamiento IndexedDB se actualiza de versión 1 a 2 sin borrar el almacén anterior, añadiendo recorridos y conservando registros previos y nuevas observaciones al recargar. Exportar incluye todos los recorridos, observaciones e historiales. Sigue siendo almacenamiento local de este navegador; no hay sincronización entre dispositivos.

El servidor predeterminado solo escucha en `127.0.0.1`. El diseño se puede probar en pantalla estrecha, pero usarlo físicamente desde otro celular requiere una publicación HTTPS o infraestructura autorizada aparte. No se ha publicado ni abierto el servidor a la red.

**Captura visual:** puedes abrir una cámara en vivo, capturar un fotograma o usar la cámara nativa del celular. La cámara en vivo requiere permiso y HTTPS o localhost. Al cerrar la cámara, ocultar la pestaña o salir se detienen sus pistas; no se envía video al proveedor.

**Detección sobre la imagen:** el análisis devuelve una lista de hasta 20 hallazgos con categorías y cajas normalizadas. La interfaz dibuja esas regiones sobre la fotografía y muestra la descripción y confianza de cada hallazgo. Los baches se cuentan por separado de reductores, desniveles y rampas. Puedes aplicar la categoría principal o la de un hallazgo revisado al reporte seleccionado. Si una foto contiene varios baches, la foto y su lista de detecciones permanecen asociadas a una observación del mapa; no se inventa una ubicación distinta para cada caja.

Las cajas son aproximaciones propuestas por un modelo general de visión, **no un detector vial entrenado y evaluado con este conjunto de imágenes**. No se ha medido precisión/recall. Antes de uso real hace falta etiquetar fotos, revisar regiones y evaluar falsos positivos/negativos. Fuente sobre límites de localización visual: https://developers.openai.com/api/docs/guides/images-vision.

## Ejecutar

Requiere Node.js 22.9 o superior (recomendado 24). Desde esta carpeta:

```powershell
npm.cmd start
```

Abrir **http://127.0.0.1:3102**. El servidor escucha solo en este equipo. No abrir `dist/index.html` como archivo: la aplicación necesita el servidor para módulos, almacenamiento y API. Leaflet y las fotografías originales se sirven localmente. Internet sigue siendo necesario para las teselas de OpenStreetMap y las fuentes; no existe modo sin conexión completo.

## Recorrido e inventario

El relato del usuario se convirtió en **33 observaciones**, 12 de ida y 21 de regreso: 20 baches, 8 reductores, 4 desniveles y una rampa. Dos “medio baches con un desnivel” se registraron como dos baches parciales para revisión. Un desnivel cercano a otro bache se registró aparte. Los conteos no son validación técnica ni detecciones de IA.

Los registros conservan el orden y las referencias del relato. No se inventaron coordenadas: inicialmente no hay marcadores. Selecciona un reporte, pulsa **Ubicar en mapa** y selecciona el punto; puedes arrastrar el marcador después. También puedes introducir coordenadas o usar GPS **solo si estás físicamente junto al punto reportado**. La precisión GPS se conserva en la descripción del origen. Las coordenadas guardadas son aportadas por el usuario y no están verificadas en campo.

La línea discontinua une solo observaciones consecutivas que ya tengan coordenadas, sin saltar registros pendientes. Es un esquema del orden, no una ruta calculada sobre calles ni un registro GPS. No permite inferir distancia o tiempo de viaje.

El borrador usa Parque Bolívar como referencia general. La dirección particular se omite de esta copia pública. La ruta definitiva está pendiente de confirmar.

Fuentes de referencia de la ciudad, no de coordenadas individuales:
- UCC: https://www.ucc.edu.co/estudiante/admisiones-registro-cad/Paginas/contacto-darc.aspx (Pasto, calle 18 #45-150).
- Hotel V1501: https://www.hotelv1501.com/ (Pasto, calle 20 #33-60).

## Fotos y persistencia

La carpeta ahora contiene **65 JPEG originales**. Se incorporaron las **64 fotografías viales del 25 de octubre** a `dist/evidence/`, con manifiesto SHA-256 y comprobación de integridad. La foto de comida del 30 de octubre se conserva en la carpeta original, fuera del inventario vial. No se borra ningún original. Las fotos aparecen automáticamente y se guardan en IndexedDB; no vuelven a importarse si su ID ya existe. Dos fotos con baches visibles tienen clasificación visual preliminar identificada como **no IA**; las demás quedan sin clasificar. No se asignan por orden de archivo a ubicaciones o reportes: la galería permite asociar cada foto al reporte correspondiente. Las fotos pendientes de asignar aparecen en la pestaña Fotos, sin aumentar el conteo de 33 reportes.

Carga un JPG, PNG o WebP original de hasta 3 MB en la ficha correspondiente o usa la cámara de un celular compatible. Se comprueban tipo, firma y decodificación; máximo 40 megapíxeles. La cámara depende del navegador y equipo; no se fuerza en escritorio.

Las fotos, coordenadas, clasificaciones y resultados se guardan en **IndexedDB de este navegador y origen**. No hay cuentas ni almacenamiento compartido. Borrar datos del navegador elimina el trabajo; cambiar de localhost a 127.0.0.1 o de puerto cambia el origen. **Exportar datos** descarga un JSON con todo el inventario y las fotos en base64. **Restaurar respaldo** permite recuperarlo en otro navegador: valida el contenido, omite copias idénticas y conserva versiones en conflicto como registros separados, sin sobrescribir los actuales. El guardado de la restauración es atómico. **Exportar mapa GeoJSON** incluye los recorridos y hallazgos ubicados del recorrido activo, sin fotografías.

La entrega reproducible y su configuración están explicadas en [ENTREGA.md](ENTREGA.md). Para incorporar el proyecto al repositorio confirmado de Camila Zambrano, sigue [GIT-CAMILA.md](GIT-CAMILA.md).

## IA real opcional

El mapa es un inventario: para detectar visualmente un bache se necesita una fotografía. La IA no busca baches en el mapa ni deduce GPS desde una imagen.

Si quieres habilitar el análisis, copia `.env.example` a `.env.local` solo si este último no existe, completa tu propia `AI_API_KEY` y reinicia. Usa `AI_MODEL` disponible en tu cuenta, con visión y salidas estructuradas en Chat Completions. El proveedor se configura con `AI_BASE_URL` (HTTPS salvo localhost). La clave permanece en el servidor. No se han reutilizado credenciales de `taller`.

El botón envía únicamente la foto al proveedor y puede generar cargos de tu cuenta. Sin clave se deshabilita; nunca devuelve una detección simulada. Distingue bache, reductor, desnivel, rampa, sin hallazgo y no concluyente. El análisis se guarda como sugerencia separada; la categoría del inventario solo cambia al pulsar **Aplicar clasificación sugerida**. El resultado no mide profundidad, no certifica seguridad ni sustituye una inspección. No hay reintentos automáticos. Solo un análisis simultáneo; timeout del proveedor 45 s. La integración real está pendiente de validarse con una clave autorizada; las fotos originales ya están incorporadas.

El contrato de salida estructurada se contrastó con la documentación oficial de OpenAI: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat.

## Validación

```powershell
npm.cmd test
node --check server.mjs
node --check vision.mjs
node --check dist/app.mjs
```

Las pruebas verifican inventario, validación de imágenes, contrato del proveedor mediante HTTP simulado (no IA real), rechazo de resultados incompletos, rutas locales, falta de credenciales y bloqueo de otros orígenes. No se incluyen servicios pagados ni publicación. Para alojarlo en Internet se debe adaptar autenticación, almacenamiento, protección de cuota y despliegue; este servidor es para uso local.


## Cartografía y fotografías incorporadas

- Cartografía: OpenStreetMap (ODbL), geocodificación Nominatim y reconstrucción vehicular OSRM mediante routing.openstreetmap.de. Datos guardados en `dist/pasto-route.json`; no se consulta geocodificación al abrir la app.
- Leaflet 1.9.4 se distribuye localmente bajo licencia BSD-2-Clause; sus avisos se conservan en el archivo original.
- Los círculos discontinuos son sectores aproximados del relato. No aumentan el conteo de observaciones con GPS ni se exportan como detecciones exactas.
- El manifiesto de fotografías incluye el nombre original y hash SHA-256. Las fotos con clasificación visual preliminar están marcadas como no IA.
- Validación automatizada: 17 pruebas, incluyendo integridad de 64 fotos y contratos HTTP de los recursos del mapa. Validación real de IA pendiente de `AI_API_KEY`.


## Continuación: asociación segura y activación de IA

La asociación entre fotografía y reporte ahora se guarda en una sola transacción IndexedDB. Si falla el almacenamiento, no queda una vinculación a medias. El reporte conserva su categoría, sentido y coordenadas, y archiva la foto anterior con su análisis. La imagen nueva no hereda el análisis de la anterior.

Para activar detección real, completa `AI_API_KEY` en `.env.local` (archivo ignorado por Git). Configura un modelo de visión disponible en tu cuenta mediante `AI_MODEL` y reinicia `npm.cmd start`. El proyecto no incluye claves ni créditos. No escribas la clave en el chat ni en el navegador. La integración sigue sin validación real hasta contar con esa configuración.

Fuente del desvío: [Margarita Pinta en Rappi](https://www.rappi.com.co/restaurantes/900178500-margarita-pinta), campo público GeoCoordinates, consultado el 11 de noviembre de 2026.


## Proveedor Gemini preparado

Se verificó en la documentación oficial que Gemini ofrece visión, salidas estructuradas y un endpoint compatible. Plantilla: `.env.gemini.example`. Modelo propuesto: `gemini-3.5-flash-lite`; endpoint `https://generativelanguage.googleapis.com/v1beta/openai`. El nivel gratuito tiene cuotas y utiliza contenido para mejorar productos según las condiciones de Google. No se activa facturación desde el proyecto.

La cuenta y clave se crean en https://aistudio.google.com/apikey. El usuario debe iniciar sesión en su propia cuenta y revisar las condiciones de Google. La clave real solo se guarda en `.env.local`, ignorado por Git. No hay una clave incluida ni se ha validado todavía una llamada real. La prueba `gemini.test.mjs` verifica el contrato mediante HTTP simulado, sin imágenes enviadas ni consumo de cuota.

Fuentes oficiales consultadas el 11 de noviembre de 2026: https://aistudio.google.com/docs/openai, https://aistudio.google.com/docs/models/gemini-3.5-flash-lite, https://aistudio.google.com/docs/pricing#gemini-3.5-flash-lite.
