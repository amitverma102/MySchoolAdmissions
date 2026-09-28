# PowerShell script to build, push, and deploy all remaining microservices to Azure Container Apps
$ErrorActionPreference = "Stop"

$acr = "credukeyadmprod.azurecr.io"
$rg = "rg-edukey-admissions-prod"
$tag = "v" + (Get-Date -Format "yyyyMMddHHmm")

$services = @(
    @{ Name = "api-gateway";            Dockerfile = "src/ApiGateway/MySchoolAdmissions.ApiGateway/Dockerfile"; Context = "." },
    @{ Name = "marketing-service";      Dockerfile = "src/Services/Marketing/MySchoolAdmissions.MarketingService/Dockerfile"; Context = "." },
    @{ Name = "reporting-service";      Dockerfile = "src/Services/Reporting/MySchoolAdmissions.ReportingService/Dockerfile"; Context = "." },
    @{ Name = "identity-service";       Dockerfile = "src/Services/Identity/MySchoolAdmissions.IdentityService/Dockerfile"; Context = "." },
    @{ Name = "institution-service";    Dockerfile = "src/Services/Institution/MySchoolAdmissions.InstitutionService/Dockerfile"; Context = "." },
    @{ Name = "application-service";    Dockerfile = "src/Services/Application/MySchoolAdmissions.ApplicationService/Dockerfile"; Context = "." },
    @{ Name = "configuration-service";  Dockerfile = "src/Services/Configuration/MySchoolAdmissions.ConfigurationService/Dockerfile"; Context = "." },
    @{ Name = "enrollment-service";     Dockerfile = "src/Services/Enrollment/MySchoolAdmissions.EnrollmentService/Dockerfile"; Context = "." },
    @{ Name = "ai-service";             Dockerfile = "src/Services/AI/MySchoolAdmissions.AIService/Dockerfile"; Context = "." },
    @{ Name = "communication-service";  Dockerfile = "src/Services/Communication/MySchoolAdmissions.CommunicationService/Dockerfile"; Context = "." }
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Building, Pushing, and Deploying Remaining Microservices" -ForegroundColor Cyan
Write-Host " Target Tag: $tag" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

foreach ($svc in $services) {
    $svcName = $svc.Name
    $dockerfile = $svc.Dockerfile
    $context = $svc.Context
    $imageLatest = "$acr/$svcName`:latest"
    $imageTagged = "$acr/$svcName`:$tag"

    Write-Host "`n---> [1/3] Building $svcName..." -ForegroundColor Yellow
    docker build -t $imageLatest -t $imageTagged -f $dockerfile $context
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build Docker image for $svcName"
    }

    Write-Host "---> [2/3] Pushing $svcName to ACR..." -ForegroundColor Yellow
    docker push $imageLatest
    docker push $imageTagged
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to push Docker image for $svcName"
    }

    Write-Host "---> [3/3] Updating Azure Container App for $svcName..." -ForegroundColor Yellow
    az containerapp update --name $svcName --resource-group $rg --image $imageTagged --only-show-errors
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to update Azure Container App for $svcName"
    }
    Write-Host "[OK] $svcName deployed successfully!" -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " All Microservices Successfully Built and Deployed to Azure!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
