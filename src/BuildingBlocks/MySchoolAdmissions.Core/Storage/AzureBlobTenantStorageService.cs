using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Azure;
using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MySchoolAdmissions.Core.Storage;

/// <summary>
/// Production-grade implementation of ITenantStorageService using Azure Blob Storage.
/// Provides independent Azure Blob Containers for every institution (tenant-{institutionId}),
/// with enterprise-grade SAS tokens, content metadata, and automatic local fallback for offline development.
/// </summary>
public class AzureBlobTenantStorageService : ITenantStorageService
{
    private readonly BlobServiceClient? _blobServiceClient;
    private readonly ILogger<AzureBlobTenantStorageService> _logger;
    private readonly string _localStorageRoot;
    private readonly bool _isAzureConfigured;

    public AzureBlobTenantStorageService(
        IConfiguration configuration,
        ILogger<AzureBlobTenantStorageService> logger)
    {
        _logger = logger;
        _localStorageRoot = Path.Combine(Directory.GetCurrentDirectory(), "storage", "tenants");

        var connectionString = configuration["AzureStorage:ConnectionString"]
            ?? configuration["AZURE_STORAGE_CONNECTION_STRING"]
            ?? configuration.GetConnectionString("AzureStorage");

        var serviceUri = configuration["AzureStorage:ServiceUri"]
            ?? configuration["AZURE_STORAGE_SERVICE_URI"];

        if (!string.IsNullOrWhiteSpace(connectionString) && !connectionString.Contains("UseDevelopmentStorage=true", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                _blobServiceClient = new BlobServiceClient(connectionString);
                _isAzureConfigured = true;
                _logger.LogInformation("Azure Blob Storage initialized with connection string for multi-tenant storage.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to initialize Azure Blob Storage client with connection string. Falling back to local storage.");
                _isAzureConfigured = false;
            }
        }
        else if (!string.IsNullOrWhiteSpace(serviceUri))
        {
            try
            {
                _blobServiceClient = new BlobServiceClient(new Uri(serviceUri), new DefaultAzureCredential());
                _isAzureConfigured = true;
                _logger.LogInformation("Azure Blob Storage initialized with Managed Identity for URI: {ServiceUri}", serviceUri);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to initialize Azure Blob Storage with Managed Identity. Falling back to local storage.");
                _isAzureConfigured = false;
            }
        }
        else
        {
            _isAzureConfigured = false;
            _logger.LogInformation("Azure Blob Storage credentials not provided. Operating in tenant-isolated local storage mode at: {Path}", _localStorageRoot);
        }
    }

    public string GetTenantContainerName(Guid institutionId)
    {
        // Azure container names must be lowercase letters, numbers, and hyphens, 3 to 63 chars long.
        // Format: tenant-00000000-0000-0000-0000-000000000000 (length 43 characters)
        return $"tenant-{institutionId.ToString("D").ToLowerInvariant()}";
    }

    public async Task EnsureTenantContainerAsync(Guid institutionId, CancellationToken cancellationToken = default)
    {
        var containerName = GetTenantContainerName(institutionId);

        if (_isAzureConfigured && _blobServiceClient != null)
        {
            try
            {
                var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
                await containerClient.CreateIfNotExistsAsync(
                    publicAccessType: PublicAccessType.None,
                    metadata: new Dictionary<string, string>
                    {
                        { "institutionId", institutionId.ToString() },
                        { "platform", "EduKeyAdmissionAssist" },
                        { "createdDateUtc", DateTime.UtcNow.ToString("O") }
                    },
                    cancellationToken: cancellationToken);

                _logger.LogInformation("Ensured independent Azure Blob Container exists for institution: {ContainerName}", containerName);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ensuring Azure Blob container for institution {InstitutionId}", institutionId);
                throw;
            }
        }

        // Local fallback
        var tenantLocalPath = Path.Combine(_localStorageRoot, institutionId.ToString());
        Directory.CreateDirectory(tenantLocalPath);
    }

    public async Task<TenantBlobUploadResult> UploadTenantFileStreamAsync(
        Guid institutionId,
        string fileName,
        Stream stream,
        string contentType,
        string subFolder = "documents",
        CancellationToken cancellationToken = default)
    {
        var sanitizedFileName = Path.GetFileName(fileName);
        var uniqueBlobName = $"{subFolder.Trim('/', '\\')}/{Guid.NewGuid():N}_{sanitizedFileName}";
        var containerName = GetTenantContainerName(institutionId);

        if (_isAzureConfigured && _blobServiceClient != null)
        {
            await EnsureTenantContainerAsync(institutionId, cancellationToken);
            var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
            var blobClient = containerClient.GetBlobClient(uniqueBlobName);

            var headers = new BlobHttpHeaders
            {
                ContentType = string.IsNullOrWhiteSpace(contentType) ? GetContentType(sanitizedFileName) : contentType,
                CacheControl = "public, max-age=86400"
            };

            var metadata = new Dictionary<string, string>
            {
                { "institutionId", institutionId.ToString() },
                { "originalFileName", Uri.EscapeDataString(sanitizedFileName) },
                { "subFolder", subFolder },
                { "uploadedAtUtc", DateTime.UtcNow.ToString("O") }
            };

            if (stream.CanSeek) stream.Position = 0;
            var uploadResponse = await blobClient.UploadAsync(
                content: stream,
                options: new BlobUploadOptions
                {
                    HttpHeaders = headers,
                    Metadata = metadata
                },
                cancellationToken: cancellationToken);

            long fileSizeBytes = stream.CanSeek ? stream.Length : 0;

            _logger.LogInformation("Successfully uploaded tenant file to Azure Blob: {ContainerName}/{BlobName} ({Bytes} bytes)",
                containerName, uniqueBlobName, fileSizeBytes);

            return new TenantBlobUploadResult
            {
                Success = true,
                InstitutionId = institutionId,
                ContainerName = containerName,
                BlobName = uniqueBlobName,
                StoragePath = $"azure://{containerName}/{uniqueBlobName}",
                BlobUrl = blobClient.Uri.ToString(),
                ContentType = headers.ContentType,
                FileSizeBytes = fileSizeBytes,
                SubFolder = subFolder,
                UploadedAt = DateTime.UtcNow
            };
        }

        // Local storage fallback for dev/offline
        var localTenantDir = Path.Combine(_localStorageRoot, institutionId.ToString(), subFolder);
        Directory.CreateDirectory(localTenantDir);

        var safeLocalName = $"{Guid.NewGuid():N}_{sanitizedFileName}";
        var localFullPath = Path.Combine(localTenantDir, safeLocalName);

        using (var fileStream = new FileStream(localFullPath, FileMode.Create, FileAccess.Write))
        {
            if (stream.CanSeek) stream.Position = 0;
            await stream.CopyToAsync(fileStream, cancellationToken);
        }

        var localInfo = new FileInfo(localFullPath);

        return new TenantBlobUploadResult
        {
            Success = true,
            InstitutionId = institutionId,
            ContainerName = containerName,
            BlobName = $"{subFolder}/{safeLocalName}",
            StoragePath = localFullPath,
            BlobUrl = $"/storage/tenants/{institutionId}/{subFolder}/{safeLocalName}",
            ContentType = string.IsNullOrWhiteSpace(contentType) ? GetContentType(sanitizedFileName) : contentType,
            FileSizeBytes = localInfo.Length,
            SubFolder = subFolder,
            UploadedAt = DateTime.UtcNow
        };
    }

    public async Task<TenantBlobUploadResult> UploadTenantFileBytesAsync(
        Guid institutionId,
        string fileName,
        byte[] bytes,
        string contentType,
        string subFolder = "documents",
        CancellationToken cancellationToken = default)
    {
        using var memoryStream = new MemoryStream(bytes);
        return await UploadTenantFileStreamAsync(institutionId, fileName, memoryStream, contentType, subFolder, cancellationToken);
    }

    public async Task<TenantBlobDownloadResult?> DownloadTenantFileAsync(
        Guid institutionId,
        string blobNameOrPath,
        string subFolder = "documents",
        CancellationToken cancellationToken = default)
    {
        var containerName = GetTenantContainerName(institutionId);
        var blobName = CleanBlobName(blobNameOrPath, containerName);

        if (_isAzureConfigured && _blobServiceClient != null)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
            var blobClient = containerClient.GetBlobClient(blobName);

            if (!await blobClient.ExistsAsync(cancellationToken))
            {
                _logger.LogWarning("Tenant blob not found in Azure: {ContainerName}/{BlobName}", containerName, blobName);
                return null;
            }

            var download = await blobClient.DownloadStreamingAsync(cancellationToken: cancellationToken);
            return new TenantBlobDownloadResult
            {
                ContentStream = download.Value.Content,
                ContentType = download.Value.Details.ContentType ?? "application/octet-stream",
                FileName = Path.GetFileName(blobName),
                ContentLength = download.Value.Details.ContentLength
            };
        }

        // Local storage fallback
        var localPath = blobNameOrPath.StartsWith(_localStorageRoot)
            ? blobNameOrPath
            : Path.Combine(_localStorageRoot, institutionId.ToString(), blobName);

        if (!File.Exists(localPath))
        {
            _logger.LogWarning("Local tenant file not found: {Path}", localPath);
            return null;
        }

        var fileStream = new FileStream(localPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        var fileInfo = new FileInfo(localPath);

        return new TenantBlobDownloadResult
        {
            ContentStream = fileStream,
            ContentType = GetContentType(fileInfo.Name),
            FileName = fileInfo.Name,
            ContentLength = fileInfo.Length
        };
    }

    public async Task<string> GetTenantFileSasUriAsync(
        Guid institutionId,
        string blobNameOrPath,
        TimeSpan validDuration,
        string subFolder = "documents")
    {
        var containerName = GetTenantContainerName(institutionId);
        var blobName = CleanBlobName(blobNameOrPath, containerName);

        if (_isAzureConfigured && _blobServiceClient != null)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
            var blobClient = containerClient.GetBlobClient(blobName);

            if (blobClient.CanGenerateSasUri)
            {
                var sasBuilder = new BlobSasBuilder
                {
                    BlobContainerName = containerName,
                    BlobName = blobName,
                    Resource = "b",
                    StartsOn = DateTimeOffset.UtcNow.AddMinutes(-5),
                    ExpiresOn = DateTimeOffset.UtcNow.Add(validDuration)
                };
                sasBuilder.SetPermissions(BlobSasPermissions.Read);

                return blobClient.GenerateSasUri(sasBuilder).ToString();
            }

            return blobClient.Uri.ToString();
        }

        // Local fallback: returns the relative URL endpoint
        return $"/storage/tenants/{institutionId}/{blobName}";
    }

    public async Task<bool> DeleteTenantFileAsync(
        Guid institutionId,
        string blobNameOrPath,
        string subFolder = "documents",
        CancellationToken cancellationToken = default)
    {
        var containerName = GetTenantContainerName(institutionId);
        var blobName = CleanBlobName(blobNameOrPath, containerName);

        if (_isAzureConfigured && _blobServiceClient != null)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
            var blobClient = containerClient.GetBlobClient(blobName);
            var response = await blobClient.DeleteIfExistsAsync(DeleteSnapshotsOption.IncludeSnapshots, cancellationToken: cancellationToken);
            return response.Value;
        }

        var localPath = blobNameOrPath.StartsWith(_localStorageRoot)
            ? blobNameOrPath
            : Path.Combine(_localStorageRoot, institutionId.ToString(), blobName);

        if (File.Exists(localPath))
        {
            try
            {
                File.Delete(localPath);
                return true;
            }
            catch
            {
                return false;
            }
        }

        return false;
    }

    public async Task<IReadOnlyList<TenantBlobItem>> ListTenantFilesAsync(
        Guid institutionId,
        string subFolder = "documents",
        CancellationToken cancellationToken = default)
    {
        var items = new List<TenantBlobItem>();
        var containerName = GetTenantContainerName(institutionId);

        if (_isAzureConfigured && _blobServiceClient != null)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
            if (!await containerClient.ExistsAsync(cancellationToken))
            {
                return items;
            }

            var prefix = string.IsNullOrWhiteSpace(subFolder) ? null : $"{subFolder.Trim('/', '\\')}/";
            await foreach (var blobItem in containerClient.GetBlobsAsync(prefix: prefix, cancellationToken: cancellationToken))
            {
                var blobClient = containerClient.GetBlobClient(blobItem.Name);
                items.Add(new TenantBlobItem
                {
                    BlobName = blobItem.Name,
                    FileName = Path.GetFileName(blobItem.Name),
                    SubFolder = subFolder,
                    ContentType = blobItem.Properties.ContentType ?? GetContentType(blobItem.Name),
                    FileSizeBytes = blobItem.Properties.ContentLength ?? 0,
                    LastModified = blobItem.Properties.LastModified,
                    BlobUrl = blobClient.Uri.ToString()
                });
            }

            return items;
        }

        // Local storage listing
        var localDir = Path.Combine(_localStorageRoot, institutionId.ToString(), subFolder);
        if (Directory.Exists(localDir))
        {
            foreach (var file in Directory.GetFiles(localDir))
            {
                var fi = new FileInfo(file);
                items.Add(new TenantBlobItem
                {
                    BlobName = $"{subFolder}/{fi.Name}",
                    FileName = fi.Name,
                    SubFolder = subFolder,
                    ContentType = GetContentType(fi.Name),
                    FileSizeBytes = fi.Length,
                    LastModified = fi.LastWriteTimeUtc,
                    BlobUrl = $"/storage/tenants/{institutionId}/{subFolder}/{fi.Name}"
                });
            }
        }

        return items;
    }

    public async Task<bool> DeleteTenantContainerAsync(
        Guid institutionId,
        CancellationToken cancellationToken = default)
    {
        var containerName = GetTenantContainerName(institutionId);

        if (_isAzureConfigured && _blobServiceClient != null)
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
            var response = await containerClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
            _logger.LogInformation("Deleted entire Azure Blob container for institution {InstitutionId}: {Deleted}", institutionId, response.Value);
            return response.Value;
        }

        var localDir = Path.Combine(_localStorageRoot, institutionId.ToString());
        if (Directory.Exists(localDir))
        {
            Directory.Delete(localDir, true);
            return true;
        }

        return false;
    }

    private static string CleanBlobName(string blobNameOrPath, string containerName)
    {
        if (string.IsNullOrWhiteSpace(blobNameOrPath)) return string.Empty;

        if (blobNameOrPath.StartsWith($"azure://{containerName}/", StringComparison.OrdinalIgnoreCase))
        {
            return blobNameOrPath.Substring($"azure://{containerName}/".Length);
        }

        if (Uri.TryCreate(blobNameOrPath, UriKind.Absolute, out var uri) && uri.Scheme.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            var segs = uri.AbsolutePath.TrimStart('/').Split('/');
            if (segs.Length > 1 && segs[0].Equals(containerName, StringComparison.OrdinalIgnoreCase))
            {
                return string.Join('/', segs, 1, segs.Length - 1);
            }
        }

        return blobNameOrPath.TrimStart('/', '\\');
    }

    private static string GetContentType(string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".pdf" => "application/pdf",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".svg" => "image/svg+xml",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".csv" => "text/csv",
            ".txt" => "text/plain",
            ".json" => "application/json",
            ".zip" => "application/zip",
            _ => "application/octet-stream"
        };
    }
}
