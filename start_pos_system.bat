@echo off
title VOXO POS System Startup
color 0A

echo.
echo ===============================================
echo    VOXO POS SYSTEM - STARTUP SCRIPT
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

echo [INFO] Node.js version:
node --version

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

echo [INFO] npm version:
npm --version
echo.

REM Navigate to project directory
cd /d "%~dp0"
echo [INFO] Working directory: %CD%
echo.

REM Check if backend dependencies are installed
if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd backend
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install backend dependencies
        pause
        exit /b 1
    )
    cd ..
    echo [SUCCESS] Backend dependencies installed
) else (
    echo [INFO] Backend dependencies already installed
)

REM Check if frontend dependencies are installed
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
    cd ..
    echo [SUCCESS] Frontend dependencies installed
) else (
    echo [INFO] Frontend dependencies already installed
)

echo.
echo [INFO] Starting VOXO POS System...
echo.

REM Start backend server in a new window
echo [INFO] Starting backend server (Port 3001)...
start "VOXO POS Backend" cmd /k "cd /d %CD%\backend && echo Backend Server Starting... && npm start"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend development server in a new window
echo [INFO] Starting frontend development server (Port 5173)...
start "VOXO POS Frontend Dev" cmd /k "cd /d %CD%\frontend && echo Frontend Development Server Starting... && npm run dev"

REM Wait for frontend dev server to start
echo [INFO] Waiting for development server to start...
timeout /t 5 /nobreak >nul

REM Start Electron app in a new window
echo [INFO] Starting Electron application...
start "VOXO POS Application" cmd /k "cd /d %CD%\frontend && echo Electron Application Starting... && npm run electron:dev"

echo.
echo ===============================================
echo    VOXO POS SYSTEM STARTED SUCCESSFULLY!
echo ===============================================
echo.
echo Backend Server:    http://localhost:3001
echo Frontend Dev:      http://localhost:5173
echo Electron App:      Starting...
echo.
echo Press any key to close this startup window...
echo (The application will continue running in separate windows)
pause >nul

echo.
echo [INFO] VOXO POS System startup completed.
echo [INFO] You can close this window now.
echo [INFO] The application is running in separate windows.
echo.
