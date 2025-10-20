# VOXO POS System - Startup Guide

This guide explains how to start and manage the VOXO POS System using the provided batch files.

## Prerequisites

1. **Node.js**: Make sure Node.js is installed on your system
   - Download from: https://nodejs.org/
   - Version 16 or higher recommended

2. **Database**: The SQLite database (`database.db`) should be present in the root directory

## Available Batch Files

### 1. `start_pos_system.bat` - Development Mode
**Use this for development and testing**

This batch file will:
- Check for Node.js installation
- Install dependencies if needed (backend and frontend)
- Start the backend server (Port 3001)
- Start the frontend development server (Port 5173)
- Launch the Electron application in development mode

**Features:**
- Hot reload for frontend changes
- Development tools available
- Separate windows for each component
- Automatic dependency installation

### 2. `start_pos_production.bat` - Production Mode
**Use this for production deployment**

This batch file will:
- Check for Node.js installation
- Build the frontend if not already built
- Start the backend server (Port 3001)
- Launch the Electron application in production mode

**Features:**
- Optimized production build
- No development server
- Faster startup
- Production-ready performance

### 3. `stop_pos_system.bat` - Stop All Processes
**Use this to stop all running POS system processes**

This batch file will:
- Stop the backend server
- Stop the frontend development server
- Close the Electron application
- Clean up any remaining processes

## How to Use

### Starting the System

1. **For Development:**
   ```
   Double-click: start_pos_system.bat
   ```

2. **For Production:**
   ```
   Double-click: start_pos_production.bat
   ```

### Stopping the System

```
Double-click: stop_pos_system.bat
```

## System Components

### Backend Server
- **Port**: 3001
- **URL**: http://localhost:3001
- **Purpose**: API server, database operations
- **Technology**: Node.js, Express, SQLite

### Frontend Development Server (Development Mode Only)
- **Port**: 5173
- **URL**: http://localhost:5173
- **Purpose**: Hot reload development server
- **Technology**: Vite, React

### Electron Application
- **Purpose**: Desktop application interface
- **Technology**: Electron, React
- **Modes**: Development (with dev server) or Production (built files)

## Troubleshooting

### Common Issues

1. **"Node.js is not installed"**
   - Install Node.js from https://nodejs.org/
   - Restart your computer after installation

2. **"Failed to install dependencies"**
   - Check your internet connection
   - Try running the batch file as administrator
   - Delete `node_modules` folders and try again

3. **"Port already in use"**
   - Use `stop_pos_system.bat` to stop all processes
   - Wait a few seconds and try again

4. **"Frontend not built" (Production Mode)**
   - The system will automatically build the frontend
   - If it fails, manually run: `cd frontend && npm run build`

### Manual Commands

If the batch files don't work, you can start components manually:

**Backend:**
```bash
cd backend
npm install
npm start
```

**Frontend (Development):**
```bash
cd frontend
npm install
npm run dev
```

**Electron (Development):**
```bash
cd frontend
npm run electron:dev
```

**Electron (Production):**
```bash
cd frontend
npm run build
npm run electron:start
```

## System Architecture

```
VOXO POS System
├── Backend (Node.js/Express)
│   ├── API Routes
│   ├── Database (SQLite)
│   └── Authentication
├── Frontend (React/Electron)
│   ├── User Interface
│   ├── Business Logic
│   └── Desktop Integration
└── Database
    └── SQLite (database.db)
```

## Default Login Credentials

- **Admin**: Username: `Admin`, Password: `Admin123`
- **Salesman**: Username: `salesman`, Password: `salesman123`
- **Data Entry**: Username: `dataenter`, Password: `dataenter123`

## Support

If you encounter any issues:
1. Check the console output in the opened windows
2. Ensure all prerequisites are installed
3. Try stopping all processes and restarting
4. Check that no other applications are using ports 3001 or 5173

---

**VOXO POS System** - Professional Point of Sale Solution
