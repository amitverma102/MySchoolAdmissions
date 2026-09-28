using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace MySchoolAdmissions.Core.Storage;

/// <summary>
/// Provides isolated, independent storage for every institution in Azure Storage Blobs.
/// Each institution is mapped to its own dedicated Azure Blob Storage container (tenant-{institutionId}),
/// ensuring strict physical separation of documents, applicant files, and academic records.
/// </summary>
public interface ITenantStorageService
{
    /// <summary>
    /// Gets the sanitized, Azure-compliant container name for a specific institution.
    /// Format: "tenant-{institutionId:lowercase}"
    /// </summary>
    string GetTenantContainerName(Guid institutionId);

    /// <summary>
    /// Ensures that an independent dedicated Azure Blob Container exists for the specified institution.
    /// </summary>
    Task EnsureTenantContainerAsync(Guid institutionId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Uploads a file for a specific institution into their dedicated Azure Blob container.
    /// </summary>
    Task<TenantBlobUploadResult> UploadTenantFileStreamAsync(
        Guid institutionId,
        string fileName,
        Stream stream,
        string contentType,
        string subFolder = "documents",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Uploads a byte array for a specific institution into their dedicated Azure Blob container.
    /// </summary>
    Task<TenantBlobUploadResult> UploadTenantFileBytesAsync(
        Guid institutionId,
        string fileName,
        byte[] bytes,
        string contentType,
        string subFolder = "documents",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Downloads a file from the institution's dedicated Azure Blob container.
    /// </summary>
    Task<TenantBlobDownloadResult?> DownloadTenantFileAsync(
        Guid institutionId,
        string blobNameOrPath,
        string subFolder = "documents",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates a time-limited Shared Access Signature (SAS) URI for direct, secure reading of a tenant file.
    /// </summary>
    Task<string> GetTenantFileSasUriAsync(
        Guid institutionId,
        string blobNameOrPath,
        TimeSpan validDuration,
        string subFolder = "documents");

    /// <summary>
    /// Deletes a file from the institution's dedicated Azure Blob container.
    /// </summary>
    Task<bool> DeleteTenantFileAsync(
        Guid institutionId,
        string blobNameOrPath,
        string subFolder = "documents",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists all files belonging to an institution in their dedicated container, optionally filtered by subfolder.
    /// </summary>
    Task<IReadOnlyList<TenantBlobItem>> ListTenantFilesAsync(
        Guid institutionId,
        string subFolder = "documents",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Completely purges the institution's entire dedicated container (e.g. upon school offboarding).
    /// </summary>
    Task<bool> DeleteTenantContainerAsync(
        Guid institutionId,
        CancellationToken cancellationToken = default);
}
