using Microsoft.Extensions.DependencyInjection;

namespace MySchoolAdmissions.Core.Storage;

public static class TenantStorageServiceCollectionExtensions
{
    /// <summary>
    /// Registers the ITenantStorageService with Azure Blob Storage backend.
    /// Provides independent dedicated containers for each institution (tenant-{institutionId}).
    /// Automatically falls back to isolated local directory storage if Azure credentials are not configured.
    /// </summary>
    public static IServiceCollection AddTenantAzureBlobStorage(this IServiceCollection services)
    {
        services.AddSingleton<ITenantStorageService, AzureBlobTenantStorageService>();
        return services;
    }
}
