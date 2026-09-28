#!/usr/bin/env bash
# ============================================================================
# Provisions independent Azure Blob Storage containers for each institution
# ============================================================================
set -euo pipefail

RESOURCE_GROUP="${1:-rg-myschooladmissions-prod}"
STORAGE_ACCOUNT="${2:-stmyschooladmprod}"

echo "================================================================="
echo " Provisioning Independent Tenant Azure Blob Storage Containers"
echo " Storage Account: $STORAGE_ACCOUNT in RG: $RESOURCE_GROUP"
echo "================================================================="

STORAGE_KEY=$(az storage account keys list --resource-group "$RESOURCE_GROUP" --account-name "$STORAGE_ACCOUNT" --query "[0].value" -o tsv)

# Enable CORS for web uploads
echo "Configuring Azure Storage CORS rules..."
az storage cors add \
    --services b \
    --origins "*" \
    --methods GET POST PUT DELETE HEAD OPTIONS \
    --allowed-headers "*" \
    --exposed-headers "*" \
    --max-age 3600 \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" > /dev/null

INSTITUTIONS=(
    "fc49d553-b44f-4c4c-96ad-4bf599016c01:Delhi International School"
    "a48d7782-dda9-42ad-b21a-046d517f1ce5:Swami Vivekananda International School"
)

for item in "${INSTITUTIONS[@]}"; do
    INST_ID="${item%%:*}"
    INST_NAME="${item##*:}"
    CONTAINER="tenant-${INST_ID,,}"

    echo "Creating independent container for '$INST_NAME': $CONTAINER"
    az storage container create \
        --name "$CONTAINER" \
        --account-name "$STORAGE_ACCOUNT" \
        --account-key "$STORAGE_KEY" \
        --public-access off \
        --metadata "institutionId=$INST_ID" "platform=EduKeyAdmissionAssist" > /dev/null

    echo "  -> Container $CONTAINER successfully provisioned."
done

echo "All institution containers provisioned successfully."
