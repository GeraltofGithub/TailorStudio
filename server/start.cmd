@echo off
cd /d "%~dp0"
echo Starting Tailor Studio API (tsx)...
node --import tsx src/server.ts
exit /b %ERRORLEVEL%
