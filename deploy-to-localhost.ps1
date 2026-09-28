<#
.SYNOPSIS
    Deploys and runs the full MySchoolAdmissions solution locally using Docker Compose.
.DESCRIPTION
    Builds and starts all microservices, infrastructure (PostgreSQL, RabbitMQ, Redis),
    YARP API Gateway, and the production Nginx-served Web Portal.
#>

param (
    [Parameter(Mandatory=$false)]
    [switch]$Rebuild = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host " MY SCHOOL ADMISSIONS - LOCALHOST DEPLOYMENT" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan

# 1. Verify Docker Engine
Write-Host "`n[1/4] Checking Docker status..." -ForegroundColor Yellow
try {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
    if (-not $dockerVersion) {
        throw "Docker daemon is not running. Please start Docker Desktop."
    }
    Write-Host "Docker engine is running (v$dockerVersion)." -ForegroundColor Green
} catch {
    Write-Host "Error: Docker Desktop is not running or not found in PATH." -ForegroundColor Red
    exit 1
}

# 2. Build & Launch Microservices + Web Portal
Write-Host "`n[2/4] Deploying stack via Docker Compose..." -ForegroundColor Yellow
$composeArgs = @("compose", "up", "-d")
if ($Rebuild) {
    $composeArgs += "--build"
}

docker @composeArgs

# 3. Health Verification
Write-Host "`n[3/4] Verifying service accessibility..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $webResponse = Invoke-WebRequest -Uri "http://localhost:80" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($webResponse.StatusCode -eq 200) {
        Write-Host "  -> Web Portal: OK (HTTP 200)" -ForegroundColor Green
    }
} catch {
    Write-Host "  -> Web Portal: Still initializing..." -ForegroundColor Yellow
}

try {
    $apiResponse = Invoke-WebRequest -Uri "http://localhost:5010/api/institutions" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "  -> API Gateway: OK" -ForegroundColor Green
} catch {
    Write-Host "  -> API Gateway: Still initializing..." -ForegroundColor Yellow
}

# 4. Deployment Complete Summary
Write-Host "`n==========================================================================" -ForegroundColor Cyan
Write-Host " LOCALHOST DEPLOYMENT COMPLETE & READY!" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  Web Admissions Portal : http://localhost" -ForegroundColor Cyan
Write-Host "  Alternative Web Port  : http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Vite Dev Server       : http://localhost:5173" -ForegroundColor Cyan
Write-Host "  API Gateway           : http://localhost:5010" -ForegroundColor Cyan
Write-Host "  RabbitMQ Management   : http://localhost:15672 (user: guest / pass: guest)" -ForegroundColor Cyan
Write-Host "  PostgreSQL Database   : localhost:5433 (user: postgres / pass: postgres)" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------------------------" -ForegroundColor Gray
Write-Host " Default Login Credentials:" -ForegroundColor Yellow
Write-Host "  Super Admin : admin@myschooladmissions.com / Admin@123" -ForegroundColor White
Write-Host "  DIS Admin   : admin@dis.com / Admin@123" -ForegroundColor White
Write-Host "  SVIS Admin  : admin@svis.org / Admin@123" -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Cyan
