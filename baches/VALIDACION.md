# Verificación local

## Entrega · 11 de noviembre de 2026

- Se completaron restauración de respaldos JSON (versiones 1/2) y exportación GeoJSON del recorrido activo.
- La restauración valida imágenes, regiones y coordenadas antes de guardar; conserva conflictos sin sobrescribir y evita reimportar copias idénticas. Una transacción IndexedDB incorpora rutas y observaciones conjuntamente.
- Se añadieron pruebas de respaldos, conflictos, duplicados e interoperabilidad GeoJSON, además de comprobar que el servidor entrega el nuevo módulo.
- Repo confirmado: `https://github.com/camilazs/taller-baches-.git`. Lectura remota: rama `main`, commit HEAD `8194bfad8f87430332ae4c20a237c1be44c3c4f5`; raíz con README. La consulta inicial fue de solo lectura. El estado posterior de Git está documentado en PUBLICACION.md; no se ha desplegado el servidor.
- No hay una clave de visión configurada ni fotografías originales accesibles. La ruta definitiva sigue pendiente. No se realizaron detecciones reales ni se prometen métricas de precisión.
- Esta entrega repite pruebas automáticas y comprobaciones de sintaxis; las capturas de navegador conservadas corresponden a la validación anterior. Las funciones nuevas de respaldo no se presentan como verificadas manualmente en un navegador en esta sesión.

## Continuación · 26 de octubre de 2026

- **8 pruebas aprobadas, 0 fallidas**. Se añadieron reglas verificadas de rutas vacías/GeoJSON, duplicados por foto/proximidad, historial y coordenadas propias/heredadas por hallazgo.
- Sintaxis verificada de servidor, visión, aplicación, captura y módulo de recorridos.
- Navegador en puerto aislado 3103: ruta y observación de prueba, foto cargada, marcador con fotografía, coordenadas e historial recuperados tras recargar, GeoJSON sintético persistido. No son datos de recorrido real ni resultados de IA.
- Revisión móvil solicitada de 390 px; no hubo desbordamiento horizontal en los tamaños DOM observados. Captura: `docs/ruta-pendiente-movil.jpg`.
- La ruta definitiva permanece vacía; el inventario anterior está en **Borrador anterior · sin confirmar**. La migración IndexedDB conserva los registros previos y añade recorridos/historial.
- Faltan clave real, fotos originales, ruta definitiva y validación de cámara/GPS en campo. No se prometen métricas de detección ni sincronización entre dispositivos.
- No se borraron accesos directos ni imágenes. No hubo publicación. Las entradas siguientes corresponden a la verificación inicial.

- 4 pruebas automatizadas aprobadas: integridad del inventario, validación de imágenes y análisis, contrato de IA con HTTP simulado y servidor HTTP real.
- Comprobación sintáctica de `dist/app.mjs`, `server.mjs` y `vision.mjs`: aprobada.
- Navegador: página y mapa OpenStreetMap cargados; filtro de baches de ida muestra 5 registros; búsqueda de Panadería en regreso muestra el registro R17.
- Persistencia: se cambió temporalmente I01 de reductor a bache, se recargó y se verificó que continuaba guardado. Después se restauró a reductor; inventario final: 20 baches, 8 reductores, 4 desniveles y una rampa.
- Captura de la interfaz: `docs/prototipo.jpg`.
- No se ha probado una llamada real al proveedor de IA: faltan clave configurada e imágenes originales. Las pruebas simuladas no se presentan como detección real.
- No se asignaron coordenadas de prueba al inventario del usuario. Quedan pendientes las 33 ubicaciones, la validación en campo y la correspondencia de fotos con reportes.
- No se verificaron cámara de celular, GPS en campo ni diseño en un dispositivo móvil real.
- El prototipo se mantuvo local; no se publicó.
