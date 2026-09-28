#!/usr/bin/env bash
# ============================================================================
# Populates production secrets and keys into Azure Key Vault
# ============================================================================
set -euo pipefail

KEYVAULT_NAME="${1:?KeyVault name required}"
PG_HOST="${2:?Postgres host required}"
PG_USER="${3:?Postgres user required}"
PG_PASS="${4:?Postgres password required}"
STORAGE_CONN="${5:-}"

echo "================================================================="
echo " Configuring Production Secrets in Azure Key Vault: $KEYVAULT_NAME"
echo "================================================================="

set_secret() {
    local name="$1"
    local val="$2"
    echo "Setting secret: $name"
    az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "$name" --value "$val" --only-show-errors > /dev/null
}

BASE_PG="Server=$PG_HOST;Port=5432;User Id=$PG_USER;Password=$PG_PASS;Ssl Mode=Require;Trust Server Certificate=true;Pooling=true;MinPoolSize=2;MaxPoolSize=100;Timeout=30;CommandTimeout=60;"

set_secret "ConnectionStrings--DefaultConnection" "${BASE_PG}Database=MySchoolAdmissionsApplication;"
set_secret "ConnectionStrings--ApplicationDb" "${BASE_PG}Database=MySchoolAdmissionsApplication;"
set_secret "ConnectionStrings--EnrollmentDb" "${BASE_PG}Database=MySchoolAdmissionsEnrollment;"
set_secret "ConnectionStrings--IdentityDb" "${BASE_PG}Database=MySchoolAdmissionsIdentity;"
set_secret "ConnectionStrings--InstitutionDb" "${BASE_PG}Database=MySchoolAdmissionsInstitution;"
set_secret "ConnectionStrings--LeadDb" "${BASE_PG}Database=MySchoolAdmissionsLead;"
set_secret "ConnectionStrings--MarketingDb" "${BASE_PG}Database=MySchoolAdmissionsMarketing;"
set_secret "ConnectionStrings--ReportingDb" "${BASE_PG}Database=MySchoolAdmissionsReporting;"
set_secret "ConnectionStrings--AiDb" "${BASE_PG}Database=myschooladmissionsai;"
set_secret "ConnectionStrings--ConfigurationDb" "${BASE_PG}Database=MySchoolAdmissionsConfiguration;"

JWT_KEY="my-school-admissions-production-enterprise-jwt-signing-secret-key-32chars-min!"
set_secret "Jwt--Key" "$JWT_KEY"
set_secret "Jwt--Secret" "$JWT_KEY"
set_secret "Jwt--Issuer" "MySchoolAdmissionsIdentityService"
set_secret "Jwt--Audience" "MySchoolAdmissionsClients"
set_secret "JwtOptions--Secret" "$JWT_KEY"
set_secret "JwtOptions--Issuer" "MySchoolAdmissionsIdentityService"
set_secret "JwtOptions--Audience" "MySchoolAdmissionsClients"

set_secret "Razorpay--KeyId" "rzp_test_EduKeyAdmissions2026"
set_secret "Razorpay--KeySecret" "rzp_sec_EduKeyAdmissionsLiveSecureSecret99"
set_secret "Razorpay--WebhookSecret" "rzp_whsec_EduKeyAdmissionsHook2026"

if [ -n "$STORAGE_CONN" ]; then
    set_secret "AzureStorage--ConnectionString" "$STORAGE_CONN"
fi

set_secret "Meta--WhatsApp--VerifyToken" "myschooladmissions_whatsapp_secret_2026"

echo "All secrets successfully configured in Azure Key Vault: $KEYVAULT_NAME"
