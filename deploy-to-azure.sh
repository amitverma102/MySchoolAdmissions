#!/usr/bin/env bash
# ============================================================================
# EDUKEY ADMISSION ASSIST - AZURE PRODUCTION DEPLOYMENT
# ============================================================================
set -euo pipefail

RESOURCE_GROUP="${1:-rg-edukey-admissions-prod}"
LOCATION="${2:-centralindia}"
ENVIRONMENT="${3:-prod}"
RESOURCE_PREFIX="${4:-edukeyadm}"
PG_PASSWORD="${5:-EduKeyAdmission#SecurePass2026!}"

echo "=========================================================================="
echo " EDUKEY ADMISSION ASSIST - AZURE PRODUCTION DEPLOYMENT"
echo " Resource Group: $RESOURCE_GROUP in $LOCATION"
echo "=========================================================================="

# 1. Verify Azure CLI
echo -e "\n[1/6] Verifying Azure CLI..."
az account show --output table

# 2. Create Resource Group
echo -e "\n[2/6] Ensuring Resource Group exists..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output table

# 3. Deploy Bicep Infrastructure
echo -e "\n[3/6] Deploying Azure Infrastructure via Bicep..."
DEPLOY_OUTPUT=$(az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "./infra/main.bicep" \
    --parameters "./infra/main.parameters.json" \
    --parameters postgresAdminPassword="$PG_PASSWORD" \
    --query "properties.outputs" \
    -o json)

KEYVAULT_NAME=$(echo "$DEPLOY_OUTPUT" | jq -r '.keyVaultName.value')
STORAGE_ACCOUNT=$(echo "$DEPLOY_OUTPUT" | jq -r '.storageAccountName.value')
PG_SERVER=$(echo "$DEPLOY_OUTPUT" | jq -r '.postgresServerFqdn.value')
ACR_SERVER=$(echo "$DEPLOY_OUTPUT" | jq -r '.acrLoginServer.value')
CAE_NAME=$(echo "$DEPLOY_OUTPUT" | jq -r '.containerAppEnvName.value')

echo "  -> Key Vault:          $KEYVAULT_NAME"
echo "  -> Storage Account:    $STORAGE_ACCOUNT"
echo "  -> PostgreSQL Server:  $PG_SERVER"
echo "  -> Container Registry: $ACR_SERVER"

# 4. Verify & Initialize Independent Tenant Storage
echo -e "\n[4/6] Verifying Independent Tenant Storage Containers..."
chmod +x ./infra/scripts/init-tenant-storage.sh
./infra/scripts/init-tenant-storage.sh "$RESOURCE_GROUP" "$STORAGE_ACCOUNT"

# 5. Build and Push Containers
echo -e "\n[5/6] Building and pushing Docker containers to ACR ($ACR_SERVER)..."
az acr login --name "$ACR_SERVER"

SERVICES=(
    "api-gateway:src/ApiGateway/MySchoolAdmissions.ApiGateway/Dockerfile"
    "identity-service:src/Services/Identity/MySchoolAdmissions.IdentityService/Dockerfile"
    "institution-service:src/Services/Institution/MySchoolAdmissions.InstitutionService/Dockerfile"
    "lead-service:src/Services/Lead/MySchoolAdmissions.LeadService/Dockerfile"
    "application-service:src/Services/Application/MySchoolAdmissions.ApplicationService/Dockerfile"
    "configuration-service:src/Services/Configuration/MySchoolAdmissions.ConfigurationService/Dockerfile"
    "enrollment-service:src/Services/Enrollment/MySchoolAdmissions.EnrollmentService/Dockerfile"
    "marketing-service:src/Services/Marketing/MySchoolAdmissions.MarketingService/Dockerfile"
    "reporting-service:src/Services/Reporting/MySchoolAdmissions.ReportingService/Dockerfile"
    "ai-service:src/Services/AI/MySchoolAdmissions.AIService/Dockerfile"
    "communication-service:src/Services/Communication/MySchoolAdmissions.CommunicationService/Dockerfile"
    "web-portal:src/Web/my-school-admissions-web/Dockerfile"
)

for item in "${SERVICES[@]}"; do
    NAME="${item%%:*}"
    DOCKERFILE="${item##*:}"
    echo "Building $NAME..."
    az acr build --registry "$ACR_SERVER" --image "$NAME:latest" --file "$DOCKERFILE" . > /dev/null
    echo "  -> $NAME pushed."
done

# 6. Deploy Container Apps
echo -e "\n[6/6] Deploying Container Apps..."
az containerapp create \
    --name "api-gateway" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CAE_NAME" \
    --image "$ACR_SERVER/api-gateway:latest" \
    --target-port 8080 \
    --ingress external \
    --min-replicas 1 \
    --max-replicas 10 \
    --env-vars "AZURE_KEYVAULT_ENDPOINT=https://$KEYVAULT_NAME.vault.azure.net/" "ASPNETCORE_ENVIRONMENT=Production" \
    --output none

az containerapp create \
    --name "web-portal" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "$CAE_NAME" \
    --image "$ACR_SERVER/web-portal:latest" \
    --target-port 80 \
    --ingress external \
    --min-replicas 1 \
    --max-replicas 10 \
    --output none

GATEWAY_URL=$(az containerapp show --name "api-gateway" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv)
WEB_URL=$(az containerapp show --name "web-portal" --resource-group "$RESOURCE_GROUP" --query "properties.configuration.ingress.fqdn" -o tsv)

echo "=========================================================================="
echo " AZURE PRODUCTION DEPLOYMENT COMPLETE!"
echo "  -> Web Admissions Portal: https://$WEB_URL"
echo "  -> API Gateway:           https://$GATEWAY_URL"
echo "  -> Azure Key Vault:       https://$KEYVAULT_NAME.vault.azure.net/"
echo "  -> Azure PostgreSQL:      $PG_SERVER"
echo "  -> Storage Account:       $STORAGE_ACCOUNT"
echo "=========================================================================="
