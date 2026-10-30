<#
.SYNOPSIS
    Smart Campus Ecosystem - SQLite Online Backup Automation (PowerShell)
.DESCRIPTION
    Performs safe, non-destructive online backups of SQLite databases using SQLite's
    online backup API. Supports both Local Development and Docker Named Volumes.
    Verifies PRAGMA integrity_check and expected schema tables without printing sensitive data.
.PARAMETER Mode
    Deployment mode: "Local" (default) or "Docker"
.PARAMETER OutputDir
    Destination folder for timestamped backups (default: ./backups)
.EXAMPLE
    .\scripts\backup_databases.ps1 -Mode Local
    .\scripts\backup_databases.ps1 -Mode Docker
#>

param(
    [ValidateSet("Local", "Docker")]
    [string]$Mode = "Local",
    [string]$OutputDir = "backups",
    [int]$RetainCount = 7,
    [switch]$ApplyRetention,
    [switch]$ExecutePrune
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SMART CAMPUS ECOSYSTEM - SQLITE ONLINE BACKUP AUTOMATION" -ForegroundColor Cyan
Write-Host " Mode: $Mode" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$EngineScript = Join-Path $ProjectRoot "scripts\sqlite_backup_engine.py"
if (-not (Test-Path $EngineScript)) {
    Write-Error "Backup engine not found at: $EngineScript"
    exit 1
}

$AbsOutputDir = Join-Path $ProjectRoot $OutputDir
if (-not (Test-Path $AbsOutputDir)) {
    New-Item -ItemType Directory -Path $AbsOutputDir -Force | Out-Null
}

if ($Mode -eq "Local") {
    $AttDb = Join-Path $ProjectRoot "services\attendance-service\smartattend.db"
    $CarDb = Join-Path $ProjectRoot "services\career-ai-service\data\career_assistant.db"
    if (-not (Test-Path $CarDb)) {
        $CarDb = Join-Path $ProjectRoot "services\career-ai-service\career_assistant.db"
    }

    Write-Host "[Local Mode] Source Attendance DB: $AttDb"
    Write-Host "[Local Mode] Source Career AI DB:  $CarDb"

    $RetentionArgs = @()
    if ($ApplyRetention) {
        $RetentionArgs += "--apply-retention"
        $RetentionArgs += "--retain-count"
        $RetentionArgs += $RetainCount
        if ($ExecutePrune) {
            $RetentionArgs += "--execute-prune"
        }
    }

    python $EngineScript --attendance-db $AttDb --career-db $CarDb --output-dir $AbsOutputDir --mode local @RetentionArgs
    $ExitCode = $LASTEXITCODE

    if ($ExitCode -eq 0) {
        Write-Host "`n[SUCCESS] Local SQLite online backup completed and verified." -ForegroundColor Green
    } else {
        Write-Host "`n[FAILED] Backup failed with exit code $ExitCode." -ForegroundColor Red
        exit $ExitCode
    }
}
elseif ($Mode -eq "Docker") {
    Write-Host "[Docker Mode] Detecting active Smart Campus containers or named volumes..."

    # Check if containers are running
    $AttRunning = (docker ps -q -f name=smartcampus-attendance)
    $CarRunning = (docker ps -q -f name=smartcampus-career-ai)

    if ($AttRunning -and $CarRunning) {
        Write-Host "Smart Campus containers are currently running. Using containerized online backup..."

        # Execute backup inside container to ensure zero path discrepancy
        docker cp $EngineScript smartcampus-attendance:/tmp/sqlite_backup_engine.py
        docker exec smartcampus-attendance python /tmp/sqlite_backup_engine.py --attendance-db /app/data/smartattend.db --output-dir /app/data/backups --mode docker

        docker cp $EngineScript smartcampus-career-ai:/tmp/sqlite_backup_engine.py
        docker exec smartcampus-career-ai python /tmp/sqlite_backup_engine.py --career-db /app/data/career_assistant.db --output-dir /app/data/backups --mode docker

        # Copy backed up files to host
        $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $HostBackupDir = Join-Path $AbsOutputDir "docker_$Timestamp"
        New-Item -ItemType Directory -Path $HostBackupDir -Force | Out-Null

        docker cp smartcampus-attendance:/app/data/backups/. $HostBackupDir/
        docker cp smartcampus-career-ai:/app/data/backups/. $HostBackupDir/

        Write-Host "`n[SUCCESS] Docker container online backup completed. Extracted to: $HostBackupDir" -ForegroundColor Green
    }
    else {
        Write-Host "Containers not running. Performing safe read-only backup directly from named volumes via helper container..."

        $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $HostBackupDir = Join-Path $AbsOutputDir "volume_$Timestamp"
        New-Item -ItemType Directory -Path $HostBackupDir -Force | Out-Null

        # Run temporary container mounting named volumes read-only
        docker run --rm `
            -v attendance-data:/data/attendance:ro `
            -v career-data:/data/career:ro `
            -v "${ProjectRoot}:/repo:ro" `
            -v "${HostBackupDir}:/backups" `
            python:3.11-slim `
            python /repo/scripts/sqlite_backup_engine.py `
                --attendance-db /data/attendance/smartattend.db `
                --career-db /data/career/career_assistant.db `
                --output-dir /backups `
                --mode docker

        $ExitCode = $LASTEXITCODE
        if ($ExitCode -eq 0) {
            Write-Host "`n[SUCCESS] Docker named-volume backup completed and verified at: $HostBackupDir" -ForegroundColor Green
        } else {
            Write-Host "`n[FAILED] Docker volume backup failed with exit code $ExitCode." -ForegroundColor Red
            exit $ExitCode
        }
    }
}
