@echo off
setlocal
title XPay Exam Portal

echo.
echo ================================
echo   XPay Exam Portal - Windows
echo ================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js 20 LTS from https://nodejs.org/
  pause
  exit /b 1
)

if not exist package.json (
  echo package.json not found. Open this project folder before running this file.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies. This runs only the first time...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

call npm run doctor
if errorlevel 1 (
  pause
  exit /b 1
)

echo.
echo Starting app. Keep this window open.
echo Open Chrome at: http://localhost:8080
echo.
call npm run dev
pause