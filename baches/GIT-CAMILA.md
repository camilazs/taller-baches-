# Commit en el repositorio de Camila Zambrano

Repositorio confirmado por el usuario: https://github.com/camilazs/taller-baches-.git.
En la consulta de solo lectura del 11 de noviembre de 2026, HEAD apunta a `main` y la raíz contiene un `README.md`. No se modificó el repositorio remoto.

La entrega incluye una carpeta `baches`. Así se conserva el README existente de Camila y se añade la aplicación sin mezclarla con el otro proyecto `taller`.

## 1. Clonar y crear una rama

Desde una carpeta donde quieras guardar la copia (no dentro de `taller`):

```powershell
git clone https://github.com/camilazs/taller-baches-.git
cd taller-baches-
git switch -c entrega-baches
```

Si ya tienes el repositorio clonado, entra en él, ejecuta `git status` y conserva cualquier trabajo pendiente antes de actualizarlo. No vuelvas a clonarlo sobre una carpeta existente ni uses `git reset`, `--force` o comandos de borrado.

## 2. Incorporar el ZIP

Descomprime el ZIP de entrega dentro de la copia del repositorio. El resultado será `taller-baches-/baches/package.json`, etc. El README raíz original se conserva.

También puedes hacerlo con PowerShell, sustituyendo la ruta del ZIP por el archivo entregado:

```powershell
if (Test-Path -LiteralPath '.\baches') { throw 'Ya existe baches: revisa los cambios antes de copiar.' }
Expand-Archive -LiteralPath 'C:\RUTA\baches-entrega.zip' -DestinationPath '.'
cd baches
npm.cmd test
cd ..
```

No copies `.env.local`, respaldos exportados, fotos privadas, `node_modules` ni accesos directos `.lnk`. La entrega excluye esos archivos. El borrador histórico contiene referencias del recorrido original: revísalas antes de hacer público el repositorio.

## 3. Revisar, hacer commit y subir la rama

```powershell
git add -- baches
git diff --cached --stat
git diff --cached
git commit -m "Completar sistema de captura y deteccion vial con IA"
git push -u origin entrega-baches
```

Después, abre un Pull Request desde `entrega-baches` hacia `main` en GitHub. Estos comandos son instrucciones para que los ejecutes tú; consulta PUBLICACION.md para el estado de la rama preparada por el asistente.

El commit debe usar tu identidad real de Git. Que Camila sea la propietaria del repositorio no significa que debas configurar su nombre o usar su contraseña. Necesitas acceso de colaboración concedido por ella; si GitHub rechaza el push, pídele acceso o trabaja desde un fork y abre el Pull Request. No uses tokens de otras personas.

## Comprobar la aplicación después de subirla

```powershell
cd baches
npm.cmd start
```

Abrir http://127.0.0.1:3102. El repositorio de GitHub guarda el código; no ejecuta por sí mismo el servidor de visión. GitHub Pages solo aloja archivos estáticos y no sustituye `server.mjs`. No se ha desplegado la aplicación ni configurado secretos en GitHub.
