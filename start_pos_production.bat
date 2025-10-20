@echo off
title VOXO POS System - Production Mode
color 0A

echo.
echo ===============================================
echo    VOXO POS SYSTEM - PRODUCTION MODE
echo ===============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Navigate to project directory
cd /d "%~dp0"
echo [INFO] Working directory: %CD%
echo.

REM Check if frontend is built
if not exist "frontend\dist\index.html" (
    echo [WARNING] Frontend not built. Building now...
    cd frontend
    npm run build
    if %errorlevel% neq 0 (
        echo ERROR: Failed to build frontend
        pause
        exit /b 1
    )
    cd ..
    echo [SUCCESS] Frontend built successfully
) else (
    echo [INFO] Frontend build found
)

echo.
echo [INFO] Starting VOXO POS System in Production Mode...
echo.

REM Start backend server in a new window
echo [INFO] Starting backend server (Port 3001)...
start "VOXO POS Backend" cmd /k "cd /d %CD%\backend && echo Backend Server Starting... && npm start"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Electron app in production mode
echo [INFO] Starting Electron application (Production Mode)...
start "VOXO POS Application" cmd /k "cd /d %CD%\frontend && echo Electron Application Starting... && npm run electron:start"

echo.
echo ===============================================
echo    VOXO POS SYSTEM STARTED SUCCESSFULLY!
echo ===============================================
echo.
echo Backend Server:    http://localhost:3001
echo Electron App:      Running in Production Mode
echo.
echo Press any key to close this startup window...
echo (The application will continue running in separate windows)
pause >nul

echo.
echo [INFO] VOXO POS System startup completed.
echo [INFO] You can close this window now.
echo [INFO] The application is running in separate windows.
echo.
