@echo off
echo ==============================================
echo Cleaning up any stuck background processes...
echo ==============================================

echo Aggressively destroying all stuck node processes...
taskkill /IM node.exe /F 2>NUL

echo.
echo ==============================================
echo Starting the Backend and Frontend servers...
echo ==============================================

start cmd /k "cd backend && npm run dev"
start cmd /k "cd frontend && npm run dev"

echo.
echo Launch sequence initiated! Two new black terminal windows should pop up.
echo Once they finish loading, your app will be live!
echo.
pause
