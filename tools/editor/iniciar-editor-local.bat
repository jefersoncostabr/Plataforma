@echo off
setlocal
cd /d "%~dp0\..\.."

if "%EDITOR_SAVE_PORT%"=="" set "EDITOR_SAVE_PORT=3210"
if "%EDITOR_SAVE_HOST%"=="" set "EDITOR_SAVE_HOST=127.0.0.1"

echo Iniciando servidor local do editor em http://%EDITOR_SAVE_HOST%:%EDITOR_SAVE_PORT%/tools/editor/editor.html
echo.
echo Feche esta janela para encerrar o servidor.
echo.
start "" "http://%EDITOR_SAVE_HOST%:%EDITOR_SAVE_PORT%/tools/editor/editor.html"
node ".\tools\editor\editor-save-server.js"
