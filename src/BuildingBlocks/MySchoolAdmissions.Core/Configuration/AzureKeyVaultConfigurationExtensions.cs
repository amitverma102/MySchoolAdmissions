using System;
using Azure.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MySchoolAdmissions.Core.Configuration;

public static class AzureKeyVaultConfigurationExtensions
{
    /// <summary>
    /// Connects the application to Azure Key Vault if AZURE_KEYVAULT_ENDPOINT or KeyVault:VaultUri is configured.
    /// Utilizes DefaultAzureCredential (Managed Identity in Azure App Service / Azure Container Apps, 
    /// Azure CLI in local development) without storing secrets in code or repository.
    /// In Azure Key Vault, secrets use double-dash (--) to represent hierarchy (e.g. ConnectionStrings--DefaultConnection).
    /// </summary>
    public static IConfigurationBuilder AddAzureKeyVaultIfConfigured(
        this IConfigurationBuilder configurationBuilder,
        ILogger? logger = null)
    {
        var tempConfig = configurationBuilder.Build();

        var keyVaultUri = tempConfig["AZURE_KEYVAULT_ENDPOINT"]
            ?? tempConfig["KeyVault:VaultUri"]
            ?? tempConfig["KeyVault:Endpoint"]
            ?? tempConfig["AZURE_KEYVAULT_RESOURCEENDPOINT"];

        if (!string.IsNullOrWhiteSpace(keyVaultUri))
        {
            try
            {
                var vaultUri = new Uri(keyVaultUri);
                var credential = new DefaultAzureCredential(new DefaultAzureCredentialOptions
                {
                    ExcludeInteractiveBrowserCredential = true
                });

                configurationBuilder.AddAzureKeyVault(vaultUri, credential);
                logger?.LogInformation("Connected successfully to Azure Key Vault at: {VaultUri}", keyVaultUri);
            }
            catch (Exception ex)
            {
                logger?.LogWarning(ex, "Failed to initialize Azure Key Vault configuration provider for {VaultUri}. Falling back to standard configuration providers.", keyVaultUri);
            }
        }
        else
        {
            logger?.LogDebug("Azure Key Vault endpoint not specified. Relying on local/container environment variables.");
        }

        return configurationBuilder;
    }
}
