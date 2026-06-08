@echo off
chcp 65001 >nul
title XPay Exam Portal
color 0A

echo.
echo  =============================================
echo   XPay Exam Portal — Starting...
echo  =============================================
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
  echo  [ERROR] Node.js not found!
  echo  Please install Node.js from https://nodejs.org/
  echo  Download the LTS version and run setup again.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER% found.

:: Check .env file
if not exist ".env" (
  echo.
  echo  ============================================
  echo   EMAIL SETUP REQUIRED
  echo  ============================================
  echo.
  echo  To send real OTP emails, you need to set up
  echo  your Gmail credentials.
  echo.
  echo  QUICK SETUP (2 minutes):
  echo.
  echo  1. Go to: https://myaccount.google.com/apppasswords
  echo  2. Sign in with your Gmail account
  echo  3. Click "Create" and name it: XPay Exam Portal
  echo  4. Copy the 16-character password shown
  echo  5. Come back here and answer the questions below
  echo.
  echo  NOTE: If you skip this, OTP will still work but
  echo  will be shown on screen instead of sent by email.
  echo.
  set /p SETUP_EMAIL="  Do you want to set up Gmail now? (y/n): "
  if /i "!SETUP_EMAIL!"=="y" (
    set /p GMAIL_USER="  Enter your Gmail address: "
    set /p GMAIL_PASS="  Enter your 16-char App Password (no spaces): "
    echo SMTP_USER=!GMAIL_USER!> .env
    echo SMTP_PASS=!GMAIL_PASS!>> .env
    echo.
    echo  [OK] .env file created! Emails will now be sent to students.
  ) else (
    echo.
    echo  [INFO] Skipped. OTP will be shown on screen (terminal mode).
  )
  echo.
)

if exist ".env" (
  echo  [OK] .env file found — Gmail email mode active.
) else (
  echo  [INFO] No .env file — OTP will show on screen.
)

:: Install dependencies
if not exist "node_modules" (
  echo.
  echo  [INFO] Installing dependencies...
  npm install
  if errorlevel 1 (
    echo  [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
  )
  echo  [OK] Dependencies installed.
)

:: Install nodemailer if not present
node -e "require('nodemailer')" >nul 2>&1
if errorlevel 1 (
  echo  [INFO] Installing nodemailer...
  npm install nodemailer
)

:: Run doctor check
echo.
echo  [INFO] Running health check...
npm run doctor
if errorlevel 1 (
  echo  [ERROR] Health check failed. See errors above.
  pause
  exit /b 1
)

:: Start the app
echo.
echo  =============================================
echo   Starting XPay Exam Portal
echo  =============================================
echo.
echo  Student login    : http://localhost:8080
echo  Invigilator dash : http://localhost:8080/submissions
echo  Invigilator PIN  : xpay-2026
echo.
echo  Keep this window open during exams.
echo  Press Ctrl+C to stop the server.
echo.

npm run dev
pause
