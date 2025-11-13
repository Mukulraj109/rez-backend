@echo off
REM ============================================================================
REM Play Page Data Seeding Script (Windows)
REM Runs all seed scripts in the correct order to populate database
REM ============================================================================

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║     Play Page Production Data Seeding Script                  ║
echo ║     Populates database with merchants, creators, videos,      ║
echo ║     and articles for the Play page                            ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Navigate to backend directory
cd /d "%~dp0"

REM Step 1: Create Merchants
echo.
echo ═══════════════════════════════════════════════════════════════
echo 📦 STEP 1/5: Creating 15 Merchants
echo ═══════════════════════════════════════════════════════════════
echo.
node src\scripts\seed-merchants.js
if errorlevel 1 (
    echo ❌ FAILED: Create Merchants
    pause
    exit /b 1
) else (
    echo ✅ SUCCESS: Created 15 Merchants
)
timeout /t 2 >nul

REM Step 2: Link Stores to Merchants
echo.
echo ═══════════════════════════════════════════════════════════════
echo 📦 STEP 2/5: Linking Stores to Merchants
echo ═══════════════════════════════════════════════════════════════
echo.
node src\scripts\enhance-stores-with-merchants.js
if errorlevel 1 (
    echo ❌ FAILED: Link Stores to Merchants
    pause
    exit /b 1
) else (
    echo ✅ SUCCESS: Stores linked to Merchants
)
timeout /t 2 >nul

REM Step 3: Create Content Creators
echo.
echo ═══════════════════════════════════════════════════════════════
echo 📦 STEP 3/5: Creating 19 Content Creators
echo ═══════════════════════════════════════════════════════════════
echo.
call npx ts-node src\scripts\seed-user-creators.ts
if errorlevel 1 (
    echo ❌ FAILED: Create Content Creators
    pause
    exit /b 1
) else (
    echo ✅ SUCCESS: Created 19 Content Creators
)
timeout /t 2 >nul

REM Step 4: Create Videos
echo.
echo ═══════════════════════════════════════════════════════════════
echo 📦 STEP 4/5: Creating 125-175 Videos with Cloudinary
echo ═══════════════════════════════════════════════════════════════
echo.
node src\scripts\seed-videos.js
if errorlevel 1 (
    echo ❌ FAILED: Create Videos
    pause
    exit /b 1
) else (
    echo ✅ SUCCESS: Created 125-175 Videos
)
timeout /t 2 >nul

REM Step 5: Create Articles
echo.
echo ═══════════════════════════════════════════════════════════════
echo 📦 STEP 5/5: Creating 20-30 Articles with Cloudinary
echo ═══════════════════════════════════════════════════════════════
echo.
node src\scripts\seed-articles.js
if errorlevel 1 (
    echo ❌ FAILED: Create Articles
    pause
    exit /b 1
) else (
    echo ✅ SUCCESS: Created 20-30 Articles
)

REM Final Summary
echo.
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    SEEDING COMPLETE                            ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo ✅ ALL SCRIPTS COMPLETED SUCCESSFULLY!
echo.
echo Next steps:
echo   1. Verify data: node src\scripts\verify-seeded-videos.js
echo   2. Start backend: npm run dev
echo   3. Start frontend: cd ..\frontend ^&^& npm start
echo.

REM Verification
echo.
echo ═══════════════════════════════════════════════════════════════
echo 📊 Verifying Database...
echo ═══════════════════════════════════════════════════════════════
echo.

node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test').then(() => Promise.all([ mongoose.connection.db.collection('users').countDocuments({ role: 'merchant' }), mongoose.connection.db.collection('users').countDocuments({ role: 'user' }), mongoose.connection.db.collection('videos').countDocuments(), mongoose.connection.db.collection('articles').countDocuments() ])).then(([merchants, users, videos, articles]) => { console.log('✅ Merchants:', merchants, '(Target: 15)'); console.log('✅ Users:', users, '(Target: 37+)'); console.log('✅ Videos:', videos, '(Target: 125-175)'); console.log('✅ Articles:', articles, '(Target: 20-30)'); if (merchants >= 15 && videos >= 125 && articles >= 20) { console.log(''); console.log('🎉 DATABASE IS PRODUCTION READY!'); } else { console.log(''); console.log('⚠️  Database needs more data'); } mongoose.disconnect(); }).catch(err => console.error('Error:', err));"

echo.
echo 🎉 Database seeding complete!
echo.
pause
