@echo off
cd /d "%~dp0"
echo Abre http://127.0.0.1:3102 en tu navegador cuando aparezca el mensaje de inicio.
call npm.cmd start
pause
