@echo off
setlocal

set "ROOT=%~dp0"
set "PY_CMD=python"

where python >nul 2>&1
if errorlevel 1 (
  where py >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] Python is not installed or not available in PATH.
    echo Install Python 3.10+ and try again.
    exit /b 1
  )
  set "PY_CMD=py"
)

echo Starting ASD Track and Care services...

start "AI Model (FastAPI)" cmd /k "cd /d "%ROOT%Ai-Model" && %PY_CMD% -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"
start "Backend (Spring Boot)" cmd /k "cd /d "%ROOT%backend" && mvnw.cmd spring-boot:run"
start "Frontend (Vite)" cmd /k "cd /d "%ROOT%Frontend" && npm run dev"

echo.
echo Services launched in separate terminals:
echo - AI Model:  http://localhost:8000
echo - Backend:   http://localhost:8081
echo - Frontend:  http://localhost:5173
echo.
echo Close each opened terminal to stop a service.

endlocal