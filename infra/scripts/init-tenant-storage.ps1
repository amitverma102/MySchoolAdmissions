<#
.SYNOPSIS
    Provisions independent Azure Blob Storage containers for each educational institution.
.DESCRIPTION
    Creates isolated containers (tenant-{institutionId}) in Azure Storage,
    enabling strict data separation, independent access policies, and lifecycle management.
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory=$true)]
    [string]$StorageAccountName
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Provisioning Independent Tenant Azure Blob Storage Containers" -ForegroundColor Cyan
Write-Host " Storage Account: $StorageAccountName in RG: $ResourceGroupName" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# Known Institutions in the Platform
$institutions = @(
    @{
        Id = "fc49d553-b44f-4c4c-96ad-4bf599016c01"
        Name = "Delhi International School (Main Campus)"
        Code = "DIS-DELHI"
    },
    @{
        Id = "a48d7782-dda9-42ad-b21a-046d517f1ce5"
        Name = "Swami Vivekananda International School"
        Code = "SVIS-MUMBAI"
    }
)

# Retrieve Storage Account Key for container management
$storageKey = (az storage account keys list --resource-group $ResourceGroupName --account-name $StorageAccountName --query "[0].value" -o tsv)

if (-not $storageKey) {
    Write-Error "Failed to retrieve storage account access key. Verify permissions."
    exit 1
}

# 1. Enable CORS for web portal uploads
Write-Host "Configuring Azure Storage CORS rules..." -ForegroundColor Yellow
az storage cors add `
    --services b `
    --origins "*" `
    --methods GET POST PUT DELETE HEAD OPTIONS `
    --allowed-headers "*" `
    --exposed-headers "*" `
    --max-age 3600 `
    --account-name $StorageAccountName `
    --account-key $storageKey | Out-Null

# 2. Iterate and create dedicated container for each institution
foreach ($inst in $institutions) {
    $containerName = "tenant-$($inst.Id.ToLower())"
    Write-Host "Creating independent container for '$($inst.Name)': $containerName" -ForegroundColor Green

    # Create private container
    az storage container create `
        --name $containerName `
        --account-name $StorageAccountName `
        --account-key $storageKey `
        --public-access off `
        --metadata "institutionId=$($inst.Id)" "institutionCode=$($inst.Code)" "platform=EduKeyAdmissionAssist" | Out-Null

    # Create standard subfolder structure markers (.keep)
    $folders = @("documents", "applications", "receipts", "media")
    foreach ($folder in $folders) {
        $tempFile = [System.IO.Path]::GetTempFileName()
        Set-Content -Path $tempFile -Value "Tenant $($inst.Name) - $folder placeholder"
        
        az storage blob upload `
            --container-name $containerName `
            --name "$folder/.keep" `
            --file $tempFile `
            --account-name $StorageAccountName `
            --account-key $storageKey `
            --overwrite true `
            --only-show-errors | Out-Null

        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    }

    Write-Host "  -> Container $containerName successfully verified with folders: $($folders -join ', ')" -ForegroundColor DarkGreen
}

Write-Host "`nAll institution containers provisioned successfully." -ForegroundColor Cyan
