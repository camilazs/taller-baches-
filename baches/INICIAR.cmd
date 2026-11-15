@echo off
cd /d "%~dp0"
echo Iniciando Via Clara...
node --use-system-ca --env-file-if-exists=.env.local scripts/iniciar.mjs
pause
