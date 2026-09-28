namespace MySchoolAdmissions.ApplicationService.Models;

public class ApplicationDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ApplicationId { get; set; }
    public Application Application { get; set; } = null!;
    public string DocumentType { get; set; } = string.Empty; // Birth Certificate, Previous Report Card, Photo
    public string FileUrl { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending, Verified, Rejected
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
