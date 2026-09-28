<#
.SYNOPSIS
    End-to-End Production Deployment Script for EduKey Admission Assist to Microsoft Azure.
.DESCRIPTION
    Automates:
    1. Azure Resource Group creation
    2. Infrastructure provisioning via Azure Bicep (Key Vault, PostgreSQL Flexible Server, Storage Blobs, ACA)
    3. Azure PostgreSQL database and pgvector extension setup
    4. Independent institution storage blob containers verification
    5. Building and pushing microservice Docker containers to Azure Container Registry (ACR)
    6. Deploying container apps with Managed Identity and Azure Key Vault integration
#>

param (
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-edukey-admissions-prod",

    [Parameter(Mandatory=$false)]
    [string]$Location = "centralindia",

    [Parameter(Mandatory=$false)]
    [string]$EnvironmentName = "prod",

    [Parameter(Mandatory=$false)]
    [string]$ResourcePrefix = "edukeyadm",

    [Parameter(Mandatory=$false)]
    [string]$PostgresAdminPassword = "EduKeyAdmission#SecurePass2026!"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host " EDUKEY ADMISSION ASSIST - AZURE PRODUCTION DEPLOYMENT" -ForegroundColor Cyan
Write-Host " Resource Group: $ResourceGroupName in $Location" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan

# 1. Check Azure CLI
Write-Host "`n[1/6] Verifying Azure CLI Authentication..." -ForegroundColor Yellow
$account = az account show --query "user.name" -o tsv 2>$null
if (-not $account) {
    Write-Host "Please authenticate using 'az login' first." -ForegroundColor Red
    az login --output table
}
$subName = az account show --query "name" -o tsv
Write-Host "Logged in to subscription: $subName" -ForegroundColor Green

# 2. Create Resource Group
Write-Host "`n[2/6] Ensuring Resource Group exists..." -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location --output table

# 3. Deploy Bicep Infrastructure
Write-Host "`n[3/6] Deploying Azure Infrastructure via Bicep (Key Vault, PostgreSQL, Storage, ACR)..." -ForegroundColor Yellow
$deployment = az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file "./infra/main.bicep" `
    --parameters "./infra/main.parameters.json" `
    --parameters postgresAdminPassword="$PostgresAdminPassword" `
    --parameters location="$Location" `
    --query "properties.outputs" `
    -o json | ConvertFrom-Json

$keyVaultName = $deployment.keyVaultName.value
$storageAccountName = $deployment.storageAccountName.value
$postgresServerFqdn = $deployment.postgresServerFqdn.value
$acrLoginServer = $deployment.acrLoginServer.value
$containerAppEnvName = $deployment.containerAppEnvName.value

Write-Host "  -> Key Vault:          $keyVaultName" -ForegroundColor Green
Write-Host "  -> Storage Account:    $storageAccountName (with independent tenant containers)" -ForegroundColor Green
Write-Host "  -> PostgreSQL Server:  $postgresServerFqdn" -ForegroundColor Green
Write-Host "  -> Container Registry: $acrLoginServer" -ForegroundColor Green

# 3b. Provision PostgreSQL Microservice Databases
Write-Host "`n[3b] Ensuring Microservice Databases exist on Azure PostgreSQL..." -ForegroundColor Yellow
$postgresServerShortName = $postgresServerFqdn.Split('.')[0]
$microserviceDbs = @(
    "MySchoolAdmissionsIdentity",
    "MySchoolAdmissionsInstitution",
    "MySchoolAdmissionsLead",
    "MySchoolAdmissionsApplication",
    "MySchoolAdmissionsConfiguration",
    "MySchoolAdmissionsEnrollment",
    "MySchoolAdmissionsMarketing",
    "MySchoolAdmissionsReporting",
    "myschooladmissionsai"
)

foreach ($db in $microserviceDbs) {
    Write-Host "  -> Initializing DB: $db..." -ForegroundColor Yellow
    az postgres flexible-server db create `
        --resource-group $ResourceGroupName `
        --server-name $postgresServerShortName `
        --name $db `
        --only-show-errors 2>$null | Out-Null
    Write-Host "  -> DB '$db' ready." -ForegroundColor Green
}

# 4. Verify & Initialize Independent Tenant Storage
Write-Host "`n[4/6] Verifying Independent Tenant Blob Containers..." -ForegroundColor Yellow
& "./infra/scripts/init-tenant-storage.ps1" -ResourceGroupName $ResourceGroupName -StorageAccountName $storageAccountName

# 5. Build and Push Container Images to ACR
Write-Host "`n[5/6] Building and Pushing Containers to ACR ($acrLoginServer)..." -ForegroundColor Yellow

$acrShortName = $acrLoginServer.Split('.')[0]
$acrUsername = az acr credential show --name $acrShortName --query "username" -o tsv
$acrPassword = az acr credential show --name $acrShortName --query "passwords[0].value" -o tsv
$acrPassword | docker login $acrLoginServer -u $acrUsername --password-stdin | Out-Null

$services = @(
    @{ Name = "api-gateway";            Dockerfile = "src/ApiGateway/MySchoolAdmissions.ApiGateway/Dockerfile"; Context = "." },
    @{ Name = "identity-service";       Dockerfile = "src/Services/Identity/MySchoolAdmissions.IdentityService/Dockerfile"; Context = "." },
    @{ Name = "institution-service";    Dockerfile = "src/Services/Institution/MySchoolAdmissions.InstitutionService/Dockerfile"; Context = "." },
    @{ Name = "lead-service";           Dockerfile = "src/Services/Lead/MySchoolAdmissions.LeadService/Dockerfile"; Context = "." },
    @{ Name = "application-service";    Dockerfile = "src/Services/Application/MySchoolAdmissions.ApplicationService/Dockerfile"; Context = "." },
    @{ Name = "configuration-service";  Dockerfile = "src/Services/Configuration/MySchoolAdmissions.ConfigurationService/Dockerfile"; Context = "." },
    @{ Name = "enrollment-service";     Dockerfile = "src/Services/Enrollment/MySchoolAdmissions.EnrollmentService/Dockerfile"; Context = "." },
    @{ Name = "marketing-service";      Dockerfile = "src/Services/Marketing/MySchoolAdmissions.MarketingService/Dockerfile"; Context = "." },
    @{ Name = "reporting-service";      Dockerfile = "src/Services/Reporting/MySchoolAdmissions.ReportingService/Dockerfile"; Context = "." },
    @{ Name = "ai-service";             Dockerfile = "src/Services/AI/MySchoolAdmissions.AIService/Dockerfile"; Context = "." },
    @{ Name = "communication-service";  Dockerfile = "src/Services/Communication/MySchoolAdmissions.CommunicationService/Dockerfile"; Context = "." },
    @{ Name = "web-portal";             Dockerfile = "src/Web/my-school-admissions-web/Dockerfile"; Context = "src/Web/my-school-admissions-web" }
)

foreach ($svc in $services) {
    $imageTag = "$acrLoginServer/$($svc.Name):latest"
    Write-Host "Building and pushing container: $($svc.Name)..." -ForegroundColor Yellow
    docker build -t $imageTag -f $svc.Dockerfile $svc.Context
    if ($LASTEXITCODE -ne 0) { throw "Docker build failed for $($svc.Name)" }
    docker push $imageTag
    if ($LASTEXITCODE -ne 0) { throw "Docker push failed for $($svc.Name)" }
    Write-Host "  -> $($svc.Name) pushed." -ForegroundColor Green
}

# 5b. Configure Azure Key Vault Secrets
Write-Host "`n[5b] Configuring Azure Key Vault Application Secrets..." -ForegroundColor Yellow
$userOid = az ad signed-in-user show --query id -o tsv 2>$null
if ($userOid) {
    az keyvault set-policy --name $keyVaultName --object-id $userOid --secret-permissions get list set delete --only-show-errors | Out-Null
}
& "./infra/scripts/setup-azure-keyvault-secrets.ps1" `
    -KeyVaultName $keyVaultName `
    -PostgreSqlHost $postgresServerFqdn `
    -PostgreSqlAdminUser "admissionsadmin" `
    -PostgreSqlAdminPassword $PostgresAdminPassword

# 6. Deploy Container Apps
Write-Host "`n[6/6] Deploying Microservices into Azure Container Apps Environment..." -ForegroundColor Yellow

# Retrieve ACR credentials for ACA
$acrShortName = $acrLoginServer.Split('.')[0]
$acrUsername = az acr credential show --name $acrShortName --query "username" -o tsv
$acrPassword = az acr credential show --name $acrShortName --query "passwords[0].value" -o tsv

$internalServices = @(
    "identity-service",
    "institution-service",
    "lead-service",
    "application-service",
    "configuration-service",
    "enrollment-service",
    "marketing-service",
    "reporting-service",
    "ai-service",
    "communication-service"
)

foreach ($svcName in $internalServices) {
    Write-Host "Deploying internal microservice: $svcName..." -ForegroundColor Yellow
    az containerapp create `
        --name $svcName `
        --resource-group $ResourceGroupName `
        --environment $containerAppEnvName `
        --image "$acrLoginServer/$($svcName):latest" `
        --target-port 8080 `
        --ingress internal `
        --registry-server $acrLoginServer `
        --registry-username $acrUsername `
        --registry-password $acrPassword `
        --min-replicas 1 `
        --max-replicas 5 `
        --env-vars "AZURE_KEYVAULT_ENDPOINT=https://$keyVaultName.vault.azure.net/" "ASPNETCORE_ENVIRONMENT=Production" `
        --output none
    Write-Host "  -> $svcName deployed." -ForegroundColor Green
}

# Deploy API Gateway with External Ingress
Write-Host "Deploying external API Gateway..." -ForegroundColor Yellow
az containerapp create `
    --name "api-gateway" `
    --resource-group $ResourceGroupName `
    --environment $containerAppEnvName `
    --image "$acrLoginServer/api-gateway:latest" `
    --target-port 8080 `
    --ingress external `
    --registry-server $acrLoginServer `
    --registry-username $acrUsername `
    --registry-password $acrPassword `
    --min-replicas 1 `
    --max-replicas 10 `
    --env-vars "AZURE_KEYVAULT_ENDPOINT=https://$keyVaultName.vault.azure.net/" "ASPNETCORE_ENVIRONMENT=Production" `
    --output none
Write-Host "  -> api-gateway deployed." -ForegroundColor Green

# Deploy Web Portal with External Ingress
Write-Host "Deploying external Web Portal..." -ForegroundColor Yellow
az containerapp create `
    --name "web-portal" `
    --resource-group $ResourceGroupName `
    --environment $containerAppEnvName `
    --image "$acrLoginServer/web-portal:latest" `
    --target-port 80 `
    --ingress external `
    --registry-server $acrLoginServer `
    --registry-username $acrUsername `
    --registry-password $acrPassword `
    --min-replicas 1 `
    --max-replicas 10 `
    --output none
Write-Host "  -> web-portal deployed." -ForegroundColor Green

$gatewayUrl = az containerapp show --name "api-gateway" --resource-group $ResourceGroupName --query "properties.configuration.ingress.fqdn" -o tsv
$webUrl = az containerapp show --name "web-portal" --resource-group $ResourceGroupName --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "`n==========================================================================" -ForegroundColor Cyan
Write-Host " AZURE PRODUCTION DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "  -> Web Admissions Portal: https://$webUrl" -ForegroundColor Cyan
Write-Host "  -> API Gateway:           https://$gatewayUrl" -ForegroundColor Cyan
Write-Host "  -> Azure Key Vault:       https://$keyVaultName.vault.azure.net/" -ForegroundColor Cyan
Write-Host "  -> Azure PostgreSQL:      $postgresServerFqdn" -ForegroundColor Cyan
Write-Host "  -> Multi-Tenant Storage:  $storageAccountName" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
