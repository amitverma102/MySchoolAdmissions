<#
.SYNOPSIS
    Populates all production secrets and keys into Azure Key Vault.
.DESCRIPTION
    Creates or updates the secrets hierarchy using ASP.NET Core double-dash (--) naming.
    Microservices automatically resolve these via DefaultAzureCredential Managed Identity.
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$KeyVaultName,

    [Parameter(Mandatory=$true)]
    [string]$PostgreSqlHost,

    [Parameter(Mandatory=$true)]
    [string]$PostgreSqlAdminUser,

    [Parameter(Mandatory=$true)]
    [string]$PostgreSqlAdminPassword,

    [Parameter(Mandatory=$false)]
    [string]$StorageConnectionString = "",

    [Parameter(Mandatory=$false)]
    [string]$RazorpayKeyId = "rzp_test_EduKeyAdmissions2026",

    [Parameter(Mandatory=$false)]
    [string]$RazorpayKeySecret = "rzp_sec_EduKeyAdmissionsLiveSecureSecret99",

    [Parameter(Mandatory=$false)]
    [string]$RazorpayWebhookSecret = "rzp_whsec_EduKeyAdmissionsHook2026",

    [Parameter(Mandatory=$false)]
    [string]$JwtSecretKey = "my-school-admissions-production-enterprise-jwt-signing-secret-key-32chars-min!",

    [Parameter(Mandatory=$false)]
    [string]$WhatsAppVerifyToken = "myschooladmissions_whatsapp_secret_2026"
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Configuring Production Secrets in Azure Key Vault: $KeyVaultName" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Helper to create/update secret
function Set-KvSecret {
    param (
        [string]$Name,
        [string]$Value
    )
    Write-Host "Setting secret: $Name" -ForegroundColor Yellow
    az keyvault secret set --vault-name $KeyVaultName --name $Name --value $Value --only-show-errors | Out-Null
    Write-Host "  -> $Name saved." -ForegroundColor Green
}

# 1. Base Azure PostgreSQL Connection String Template
$basePgConn = "Server=$PostgreSqlHost;Port=5432;User Id=$PostgreSqlAdminUser;Password=$PostgreSqlAdminPassword;Ssl Mode=Require;Trust Server Certificate=true;Pooling=true;MinPoolSize=2;MaxPoolSize=100;Timeout=30;CommandTimeout=60;"

Set-KvSecret -Name "ConnectionStrings--DefaultConnection" -Value "$basePgConn;Database=MySchoolAdmissionsApplication;"
Set-KvSecret -Name "ConnectionStrings--ApplicationDb" -Value "$basePgConn;Database=MySchoolAdmissionsApplication;"
Set-KvSecret -Name "ConnectionStrings--EnrollmentDb" -Value "$basePgConn;Database=MySchoolAdmissionsEnrollment;"
Set-KvSecret -Name "ConnectionStrings--IdentityDb" -Value "$basePgConn;Database=MySchoolAdmissionsIdentity;"
Set-KvSecret -Name "ConnectionStrings--InstitutionDb" -Value "$basePgConn;Database=MySchoolAdmissionsInstitution;"
Set-KvSecret -Name "ConnectionStrings--LeadDb" -Value "$basePgConn;Database=MySchoolAdmissionsLead;"
Set-KvSecret -Name "ConnectionStrings--MarketingDb" -Value "$basePgConn;Database=MySchoolAdmissionsMarketing;"
Set-KvSecret -Name "ConnectionStrings--ReportingDb" -Value "$basePgConn;Database=MySchoolAdmissionsReporting;"
Set-KvSecret -Name "ConnectionStrings--AiDb" -Value "$basePgConn;Database=myschooladmissionsai;"
Set-KvSecret -Name "ConnectionStrings--ConfigurationDb" -Value "$basePgConn;Database=MySchoolAdmissionsConfiguration;"

# 2. JWT Authentication Secrets
Set-KvSecret -Name "Jwt--Key" -Value $JwtSecretKey
Set-KvSecret -Name "Jwt--Secret" -Value $JwtSecretKey
Set-KvSecret -Name "Jwt--Issuer" -Value "MySchoolAdmissionsIdentityService"
Set-KvSecret -Name "Jwt--Audience" -Value "MySchoolAdmissionsClients"
Set-KvSecret -Name "JwtOptions--Secret" -Value $JwtSecretKey
Set-KvSecret -Name "JwtOptions--Issuer" -Value "MySchoolAdmissionsIdentityService"
Set-KvSecret -Name "JwtOptions--Audience" -Value "MySchoolAdmissionsClients"

# 3. Razorpay Gateway Production Secrets
Set-KvSecret -Name "Razorpay--KeyId" -Value $RazorpayKeyId
Set-KvSecret -Name "Razorpay--KeySecret" -Value $RazorpayKeySecret
Set-KvSecret -Name "Razorpay--WebhookSecret" -Value $RazorpayWebhookSecret

# 4. Azure Storage Connection String for Multi-Tenant Blobs
if (![string]::IsNullOrWhiteSpace($StorageConnectionString)) {
    Set-KvSecret -Name "AzureStorage--ConnectionString" -Value $StorageConnectionString
}

# 5. Meta WhatsApp Communication Secrets
Set-KvSecret -Name "Meta--WhatsApp--VerifyToken" -Value $WhatsAppVerifyToken

Write-Host "`nAll secrets successfully configured in Azure Key Vault: $KeyVaultName" -ForegroundColor Cyan
