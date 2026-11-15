# Validación · 14 de noviembre de 2026

## Automatizada

npm.cmd test: 18 pruebas, sin uso de credenciales por las pruebas simuladas. Incluyen contratos HTTP, restricción de archivos públicos, integridad SHA-256 de 64 JPEG, geometría de ida/regreso en Pasto, formatos de imágenes, regiones, duplicados, historial, asociación atómica y respaldos.

## Real con proveedor

- Gemini con credencial autorizada guardada únicamente en .env.local. Cuenta observada en nivel gratuito; no se activó facturación.
- Foto 29: bache; una región. Respuesta en docs/validacion-ia-20261114.json.
- Foto 42: reductor; una región. Respuesta en docs/validacion-reductor-20261114.json.
- Se conservan fecha, modelo y proveedor. El manifiesto vincula las respuestas a su archivo original.

## Límites

Dos comprobaciones reales no constituyen una evaluación de precisión del conjunto completo. Las ubicaciones exactas no se deducen de las fotos. No se ha probado GPS en campo, la cámara física de todos los dispositivos ni un despliegue público. El mapa requiere teselas de Internet. El proveedor puede aplicar límites de cuota.
