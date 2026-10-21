# Start Expandit Attendance Backend Service
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Starting Expandit Attendance Backend (FastAPI + Uvicorn)" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\backend"
& ".\.venv\Scripts\python.exe" run.py
