$ErrorActionPreference = "Stop"
$rg = "rg-edukey-admissions-prod"
$pgHost = "psql-edukeyadm-prod.postgres.database.azure.com"
$pgUser = "admissionsadmin"
$pgPass = "EduKeyAdmission#SecurePass2026!"
$storageConn = if ($env:AZURE_STORAGE_CONNECTION_STRING) { $env:AZURE_STORAGE_CONNECTION_STRING } else { (az storage account show-connection-string --name "stedukeyadmprod" --resource-group $rg --query "connectionString" -o tsv) }
$jwtSecret = "my-school-admissions-production-enterprise-jwt-signing-secret-key-32chars-min!"
$jwtIssuer = "MySchoolAdmissionsIdentityService"
$jwtAudience = "MySchoolAdmissionsClients"

$services = @(
    @{ Name = "institution-service"; Db = "MySchoolAdmissionsInstitution" },
    @{ Name = "lead-service"; Db = "MySchoolAdmissionsLead" },
    @{ Name = "application-service"; Db = "MySchoolAdmissionsApplication"; HasStorage = $true },
    @{ Name = "configuration-service"; Db = "MySchoolAdmissionsConfiguration" },
    @{ Name = "enrollment-service"; Db = "MySchoolAdmissionsEnrollment"; HasStorage = $true },
    @{ Name = "marketing-service"; Db = "MySchoolAdmissionsMarketing" },
    @{ Name = "reporting-service"; Db = "MySchoolAdmissionsReporting" },
    @{ Name = "ai-service"; Db = "myschooladmissionsai"; HasStorage = $true },
    @{ Name = "communication-service"; Db = $null }
)

Write-Host "Configuring api-gateway..." -ForegroundColor Cyan
az containerapp update --name "api-gateway" --resource-group $rg `
    --set-env-vars "JwtOptions__Secret=$jwtSecret" "JwtOptions__Issuer=$jwtIssuer" "JwtOptions__Audience=$jwtAudience" `
    --only-show-errors

foreach ($svc in $services) {
    Write-Host "Configuring $($svc.Name)..." -ForegroundColor Cyan
    $envVars = @(
        "RabbitMQHost=rabbitmq",
        "JwtOptions__Secret=$jwtSecret",
        "JwtOptions__Issuer=$jwtIssuer",
        "JwtOptions__Audience=$jwtAudience"
    )
    
    if ($svc.Db) {
        $connStr = "Server=$pgHost;Port=5432;Database=$($svc.Db);User Id=$pgUser;Password=$pgPass;Ssl Mode=Require;Trust Server Certificate=true;Pooling=true;"
        $envVars += "ConnectionStrings__DefaultConnection=$connStr"
    }
    
    if ($svc.HasStorage) {
        $envVars += "AzureStorage__ConnectionString=$storageConn"
    }

    az containerapp update --name $svc.Name --resource-group $rg --set-env-vars $envVars --only-show-errors
    Write-Host "  -> $($svc.Name) updated successfully." -ForegroundColor Green
}

Write-Host "`nAll microservices updated with production database and messaging configurations!" -ForegroundColor Green
