@echo off
title FactoryFlow Strategic Command Hub
echo ============================================================
echo [SYSTEM] INITIATING FACTORYFLOW COMMAND NEXUS...
echo ============================================================
echo.
echo [1/3] STARTING STRATEGIC DEVELOPMENT SERVER...
start /min cmd /c "npm run dev"
echo.
echo [2/3] ESTABLISHING NETWORK HANDSHAKE (Wait 8s)...
timeout /t 8 /nobreak > nul
echo.
echo [3/3] LAUNCHING SATELLITE INTERFACE IN CHROME...
start chrome http://localhost:3000
echo.
echo ============================================================
echo [SUCCESS] COMMAND HUB DEPLOYED AT LOCALHOST:3000
echo ============================================================
timeout /t 3 > nul
exit
