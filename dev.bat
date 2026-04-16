@echo off
setlocal enabledelayedexpansion

echo.
echo 🎙️  Podcastic Development Server Launcher
echo ==========================================
echo.

REM Check if .env exists
if not exist ".env" (
    echo ⚠️  .env file not found!
    echo Creating .env from .env.example...
    copy .env.example .env
    echo ✓ .env created. Please update with your configuration.
    echo.
)

REM Check for MongoDB and Redis
echo 📡 Checking prerequisites...
echo ⚠️  Make sure MongoDB and Redis are running!
echo.

REM Start backend
echo 🚀 Starting Backend (Express.js)...
cd backend
start "Podcastic Backend" npm run dev
cd ..

timeout /t 2 /nobreak

REM Start frontend
echo 🚀 Starting Frontend (Vite)...
cd frontend
start "Podcastic Frontend" npm run dev
cd ..

echo.
echo ✓ Servers started!
echo.
echo 📍 Frontend:  http://localhost:3000
echo 📍 Backend:   http://localhost:5000
echo.
echo Windows command windows will stay open. Close them to stop servers.
echo.
pause
