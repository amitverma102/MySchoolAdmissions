using System;

namespace MySchoolAdmissions.Core.Storage;

public class TenantBlobUploadResult
{
    public bool Success { get; set; } = true;
    public string ContainerName { get; set; } = string.Empty;
    public string BlobName { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public string BlobUrl { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public Guid InstitutionId { get; set; }
    public string SubFolder { get; set; } = "documents";
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

public class TenantBlobDownloadResult
{
    public Stream ContentStream { get; set; } = null!;
    public string ContentType { get; set; } = "application/octet-stream";
    public string FileName { get; set; } = string.Empty;
    public long ContentLength { get; set; }
}

public class TenantBlobItem
{
    public string BlobName { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string SubFolder { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public DateTimeOffset? LastModified { get; set; }
    public string BlobUrl { get; set; } = string.Empty;
}
