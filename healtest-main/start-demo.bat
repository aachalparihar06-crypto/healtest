@echo off
echo =========================================
echo   HealTest - Self-Healing Testing System
echo   Live Demo Startup Script
echo =========================================
echo.

REM Start backend in a new terminal window
echo [1/2] Starting Backend API + Playwright Engine (port 3001)...
start "HealTest Backend" cmd /k "cd /d "%~dp0" && npm.cmd --prefix backend run dev"

REM Wait for backend to start
echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

REM Start frontend in a new terminal window
echo [2/2] Starting Frontend Dev Server (port 5173)...
start "HealTest Frontend" cmd /k "cd /d "%~dp0" && npm.cmd --prefix frontend run dev"

echo.
echo =========================================
echo   Both servers are starting up!
echo.
echo   Frontend UI:  http://localhost:5173/
echo   Backend API:  http://localhost:3001/api/health
echo   Test Fixture: http://localhost:3001/fixture
echo.
echo   Demo Scenarios (in New Test page presets):
echo   [1] Baseline E2E Pass  - target: /fixture
echo   [2] Live Self-Healing  - target: /fixture?mutated=true
echo   [3] Strict Failure     - target: /fixture?broken=true
echo.
echo   Open http://localhost:5173/ in your browser.
echo =========================================
echo.
pause
