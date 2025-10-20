@echo off
echo Starting POS System...
echo.

REM Start backend server in a new window
echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d backend && npm start"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend development server in a new window
echo Starting Frontend Development Server...
start "Frontend Server" cmd /k "cd /d frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend will be available at: http://localhost:3000 (or your configured port)
echo Frontend will be available at: http://localhost:5173 (Vite default)
echo.
echo Press any key to close this window...
pause >nul
