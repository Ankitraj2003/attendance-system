# PostgreSQL Database Backup for Expandit Attendance System
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$PSScriptRoot\backup_attendance_system_$timestamp.sql"

Write-Host "Creating backup of 'attendance_system' to: $backupFile" -ForegroundColor Cyan
$env:PGPASSWORD = "attendance_pass_2026"
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U attendance_user -h localhost -d attendance_system -F p -f $backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Backup encountered an error." -ForegroundColor Red
}
