@echo off
title VOXO POS System - Stop All Processes
color 0C

echo.
echo ===============================================
echo    VOXO POS SYSTEM - STOP ALL PROCESSES
echo ===============================================
echo.

echo [INFO] Stopping all VOXO POS System processes...
echo.

REM Kill Node.js processes related to the POS system
echo [INFO] Stopping backend server...
taskkill /f /im node.exe /fi "WINDOWTITLE eq VOXO POS Backend*" >nul 2>&1

echo [INFO] Stopping frontend development server...
taskkill /f /im node.exe /fi "WINDOWTITLE eq VOXO POS Frontend Dev*" >nul 2>&1

echo [INFO] Stopping Electron application...
taskkill /f /im electron.exe >nul 2>&1
taskkill /f /im "VOXO POS System.exe" >nul 2>&1

REM Also kill any remaining Node.js processes on ports 3001 and 5173
echo [INFO] Stopping processes on ports 3001 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173"') do taskkill /f /pid %%a >nul 2>&1

echo.
echo ===============================================
echo    VOXO POS SYSTEM STOPPED SUCCESSFULLY!
echo ===============================================
echo.
echo All VOXO POS System processes have been terminated.
echo.
pause
