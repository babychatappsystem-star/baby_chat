# start-dev.ps1
# Khởi động Backend và Frontend cùng lúc trong 2 cửa sổ Terminal riêng biệt.
# Chạy từ thư mục gốc: .\start-dev.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   BabyChat Dev Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Backend  -> http://localhost:3000" -ForegroundColor Green
Write-Host " Frontend -> http://localhost:5173" -ForegroundColor Yellow
Write-Host " Swagger  -> http://localhost:3000/api/docs" -ForegroundColor Green
Write-Host ""
Write-Host " Dang khoi dong..." -ForegroundColor Gray
Write-Host ""

# Mở 2 cửa sổ PowerShell riêng biệt
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; Write-Host '[BACKEND]' -ForegroundColor Green; npm run dev" -WorkingDirectory $backend

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontend'; Write-Host '[FRONTEND]' -ForegroundColor Yellow; npm run start:dev" -WorkingDirectory $frontend

Write-Host " Hai cua so Terminal da duoc mo!" -ForegroundColor Cyan
Write-Host " Nhan phim bat ky de dong cua so nay..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
