@echo off
setlocal enabledelayedexpansion

echo ====================================
echo   Credit Score DApp - Auto Setup
echo ====================================
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is installed

echo Checking for Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed!
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)

echo ✅ Python is installed

echo Checking for node_modules...
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
) else (
    echo ✅ Dependencies already installed
)

echo Checking for .env file...
if not exist ".env" (
    echo ⚙️  Creating .env file...
    node scripts/deploy-and-update.js --setup
    echo.
    echo ⚠️  Please update your PRIVATE_KEY in the .env file!
    echo Press any key after updating .env file...
    pause
) else (
    echo ✅ .env file exists
)

echo.
echo 🔄 Contract Address Configuration
echo =================================
echo.

:: Show current contract address
echo Current Contract Information:
node scripts/show-contract.js
echo.

:: Ask for new contract address
set /p NEW_CONTRACT="Enter new contract address (press Enter to keep current): "
if not "!NEW_CONTRACT!"=="" (
    echo 📝 Updating contract address to: !NEW_CONTRACT!
    node scripts/update-contract.js "!NEW_CONTRACT!"
    if errorlevel 1 (
        echo ❌ Failed to update contract address!
        echo ⚠️  Continuing with current contract address...
    ) else (
        echo ✅ Contract address updated successfully!
    )
) else (
    echo ℹ️  Using current contract address...
)

echo.
echo 🔄 Updating deployment configuration...
node scripts/deploy-and-update.js

echo.
echo 🚀 Starting Backend Server (Node.js on port 3001)...
echo.

:: Start backend in background
start /B node server.js

echo ⏳ Waiting for backend to start (5 seconds)...
timeout 5 > nul

echo.
echo 🌐 Starting Frontend Server (Python HTTP Server on port 8080)...
echo.

:: Start Python HTTP server in background
start /B python -m http.server 8080

echo ⏳ Waiting for frontend server to start (3 seconds)...
timeout 3 > nul

echo.
echo 📱 Opening Frontend in Browser...
echo.

:: Open the frontend in default browser
start "" "http://localhost:8080/frontend-test.html"

echo.
echo ✅ Application Started Successfully!
echo.
echo 📍 Backend API: http://localhost:3001
echo 📍 Frontend: http://localhost:8080/frontend-test.html
echo.
echo 🖥️  Running in background:
echo     - Node.js backend on port 3001
echo     - Python HTTP server on port 8080
echo.
echo ⚠️  To stop the servers:
echo     - Press Ctrl+C in this window
echo     - Or close this window
echo.
echo 🔍 Check the servers are running:
echo     - Backend: http://localhost:3001
echo     - Frontend: http://localhost:8080
echo.
echo The application will continue running...
echo Press Ctrl+C to stop all servers
pause