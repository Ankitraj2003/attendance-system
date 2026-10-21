param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

if (-not (Test-Path $BackupFile)) {
    Write-Host "Specified backup file does not exist: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "Restoring 'attendance_system' from: $BackupFile" -ForegroundColor Cyan
$env:PGPASSWORD = "attendance_pass_2026"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U attendance_user -h localhost -d attendance_system -f $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database restored successfully!" -ForegroundColor Green
} else {
    Write-Host "Restore encountered an error." -ForegroundColor Red
}
