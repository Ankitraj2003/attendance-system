# Start Expandit Attendance Frontend Service
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Starting Expandit Attendance Frontend (Vite + React)" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\frontend"
npm.cmd run dev
