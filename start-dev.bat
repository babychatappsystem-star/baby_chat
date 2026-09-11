@echo off
REM start-dev.bat — Khoi dong Backend va Frontend cung luc.

echo.
echo ========================================
echo    BabyChat Dev Server
echo ========================================
echo.
echo  Backend  -^> http://localhost:3000
echo  Frontend -^> http://localhost:5173
echo  Swagger  -^> http://localhost:3000/api/docs
echo.
echo  Dang khoi dong 2 cua so moi...
echo.

start "BabyChat Backend" cmd /k "%~dp0_start-backend.bat"
start "BabyChat Frontend" cmd /k "%~dp0_start-frontend.bat"

echo  Xong! Kiem tra 2 cua so CMD vua mo.
echo.
pause

