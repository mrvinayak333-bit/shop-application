@echo off
echo ============================================
echo  SHREE RAAM MOBAILE - Mobile Repairing Service
echo  Setup Script
echo ============================================
echo.

echo [1/3] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed. Make sure Node.js is installed.
    pause
    exit /b 1
)

echo.
echo [2/3] Creating upload directories...
mkdir uploads\gallery 2>nul
mkdir uploads\certificates 2>nul
mkdir uploads\courses\pdf 2>nul
mkdir uploads\courses\images 2>nul
mkdir uploads\courses\documents 2>nul
mkdir uploads\logos 2>nul
mkdir uploads\invoices 2>nul
mkdir uploads\profiles 2>nul

echo.
echo [3/3] Initializing database...
echo Make sure MySQL is running and credentials in .env are correct.
echo.
call npm run db-init

echo.
echo ============================================
echo  Setup Complete!
echo.
echo  Start the server: npm start
echo  Then visit: http://localhost:5000
echo.
echo  Default Logins:
echo    Master:  mr.vinayak333@gmail.com / VINAYAK@333
echo    Admin:   admin@repairsystem.com / master123
echo ============================================
pause
