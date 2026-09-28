// ============================================================================
// EduKey Admission Assist - Production Azure Bicep Infrastructure Deployment
// ============================================================================
@description('Deployment environment name (e.g. prod, staging, dev)')
param environmentName string = 'prod'

@description('Primary Azure region for all provisioned resources')
param location string = resourceGroup().location

@description('Prefix used to ensure unique naming of cloud resources')
@minLength(3)
@maxLength(11)
param resourcePrefix string = 'myschooladm'

@description('PostgreSQL Flexible Server administrator login')
param postgresAdminUser string = 'admissionsadmin'

@description('PostgreSQL Flexible Server administrator password')
@secure()
param postgresAdminPassword string

@description('Razorpay Key ID')
param razorpayKeyId string = 'rzp_test_EduKeyAdmissions2026'

@description('Razorpay Key Secret')
@secure()
param razorpayKeySecret string = 'rzp_sec_EduKeyAdmissionsLiveSecureSecret99'

@description('Razorpay Webhook Secret')
@secure()
param razorpayWebhookSecret string = 'rzp_whsec_EduKeyAdmissionsHook2026'

@description('JWT Authentication Signing Key (minimum 32 characters)')
@secure()
param jwtSecretKey string = 'my-school-admissions-production-enterprise-jwt-signing-secret-key-32chars-min!'

// Variable Naming Conventions
var safePrefix = toLower(resourcePrefix)
var uamiName = 'id-${safePrefix}-${environmentName}'
var logWorkspaceName = 'log-${safePrefix}-${environmentName}'
var appInsightsName = 'appi-${safePrefix}-${environmentName}'
var keyVaultName = 'kv-${safePrefix}-${environmentName}'
var storageAccountName = 'st${safePrefix}${environmentName}'
var postgresServerName = 'psql-${safePrefix}-${environmentName}'
var acrName = 'cr${safePrefix}${environmentName}'
var containerAppEnvName = 'cae-${safePrefix}-${environmentName}'

// 1. User Assigned Managed Identity
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: uamiName
  location: location
}

// 2. Log Analytics Workspace & Application Insights
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logWorkspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// 3. Azure Storage Account with Multi-Tenant Blob Containers
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: [
            '*'
          ]
          allowedMethods: [
            'GET'
            'POST'
            'PUT'
            'DELETE'
            'HEAD'
            'OPTIONS'
          ]
          allowedHeaders: [
            '*'
          ]
          exposedHeaders: [
            '*'
          ]
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

// Independent Dedicated Containers for Every Institution
resource containerDis 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'tenant-fc49d553-b44f-4c4c-96ad-4bf599016c01'
  properties: {
    publicAccess: 'None'
    metadata: {
      institutionId: 'fc49d553-b44f-4c4c-96ad-4bf599016c01'
      institutionName: 'Delhi International School'
      platform: 'EduKeyAdmissionAssist'
    }
  }
}

resource containerSvis 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'tenant-a48d7782-dda9-42ad-b21a-046d517f1ce5'
  properties: {
    publicAccess: 'None'
    metadata: {
      institutionId: 'a48d7782-dda9-42ad-b21a-046d517f1ce5'
      institutionName: 'Swami Vivekananda International School'
      platform: 'EduKeyAdmissionAssist'
    }
  }
}

// 4. Azure Database for PostgreSQL Flexible Server
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B2s'
    tier: 'Burstable'
  }
  properties: {
    version: '15'
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// Allow Azure Internal Services Firewall Rule
resource pgFirewallAllowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = {
  parent: postgresServer
  name: 'AllowAllWindowsAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Enable pgvector and uuid-ossp extension
resource pgConfigExtensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-03-01-preview' = {
  parent: postgresServer
  name: 'azure.extensions'
  properties: {
    value: 'VECTOR,UUID-OSSP'
    source: 'user-override'
  }
  dependsOn: [
    pgFirewallAllowAzure
  ]
}

// 5. Azure Key Vault with Managed Identity Access
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableSoftDelete: true
    softDeleteRetentionInDays: 30
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: managedIdentity.properties.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

// Store Key Vault Secrets
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
var basePgConnection = 'Server=${postgresServer.properties.fullyQualifiedDomainName};Port=5432;User Id=${postgresAdminUser};Password=${postgresAdminPassword};Ssl Mode=Require;Trust Server Certificate=true;Pooling=true;MinPoolSize=2;MaxPoolSize=100;Timeout=30;CommandTimeout=60;'

resource secPgDefault 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'ConnectionStrings--DefaultConnection'
  properties: {
    value: '${basePgConnection}Database=MySchoolAdmissionsApplication;'
  }
}

resource secStorageConn 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'AzureStorage--ConnectionString'
  properties: {
    value: storageConnectionString
  }
}

resource secJwtKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'Jwt--Key'
  properties: {
    value: jwtSecretKey
  }
}

resource secJwtOptionsSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'JwtOptions--Secret'
  properties: {
    value: jwtSecretKey
  }
}

resource secRzpKeyId 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'Razorpay--KeyId'
  properties: {
    value: razorpayKeyId
  }
}

resource secRzpKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'Razorpay--KeySecret'
  properties: {
    value: razorpayKeySecret
  }
}

resource secRzpWebhookSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'Razorpay--WebhookSecret'
  properties: {
    value: razorpayWebhookSecret
  }
}

// 6. Azure Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// 7. Azure Container Apps Environment
resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Outputs for deployment automation
output resourceGroupName string = resourceGroup().name
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
output storageAccountName string = storageAccount.name
output postgresServerFqdn string = postgresServer.properties.fullyQualifiedDomainName
output acrLoginServer string = containerRegistry.properties.loginServer
output containerAppEnvName string = containerAppEnv.name
output managedIdentityClientId string = managedIdentity.properties.clientId
