@echo off
REM CSRF Protection Installation Script for Windows
REM This script installs the required dependencies and enables CSRF protection

echo ==========================================
echo CSRF Protection Installation
echo ==========================================
echo.

REM Step 1: Install dependencies
echo Step 1: Installing cookie-parser...
call npm install cookie-parser @types/cookie-parser

if %errorlevel% equ 0 (
    echo [32m✓ cookie-parser installed successfully[0m
) else (
    echo [31m✗ Failed to install cookie-parser[0m
    exit /b 1
)

echo.

REM Step 2: Update server.ts
echo Step 2: Enabling CSRF middleware in src\server.ts...
echo.
echo Please manually uncomment the following lines in src\server.ts:
echo.
echo Line ~276-277:
echo   import cookieParser from 'cookie-parser';
echo   app.use(cookieParser());
echo.
echo Line ~282:
echo   app.use(setCsrfToken);
echo.

REM Step 3: Restart server
echo Step 3: Restart your server after uncommenting the lines above:
echo   npm run dev
echo.

REM Step 4: Verify
echo Step 4: Verify CSRF protection is working:
echo   curl http://localhost:5001/api/csrf-token
echo.

echo ==========================================
echo Installation Complete!
echo ==========================================
echo.
echo Next Steps:
echo 1. Uncomment the lines mentioned above in src\server.ts
echo 2. Restart the server: npm run dev
echo 3. Update your frontend to use CSRF tokens (see CSRF_QUICK_START.md)
echo 4. Test the implementation
echo.
echo Documentation:
echo - Quick Start: CSRF_QUICK_START.md
echo - Full Guide: CSRF_PROTECTION_GUIDE.md
echo - Examples: CSRF_ROUTE_EXAMPLES.md
echo.

pause
