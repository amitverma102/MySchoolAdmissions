namespace MySchoolAdmissions.ApplicationService.Models;

public class TenantDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InstitutionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "General"; // e.g. "Prospectus & Brochures", "Fee Structure & Policies", "Affiliation & Compliance", "Admission Guidelines", "Student Verification"
    public string FileName { get; set; } = string.Empty;
    public string FileExtension { get; set; } = ".pdf";
    public long FileSizeBytes { get; set; }
    public string FileUrl { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public string UploadedBy { get; set; } = "School Administration";
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = string.Empty;
    public bool IsVerified { get; set; } = true;
    public bool IsArchived { get; set; } = false;
}
