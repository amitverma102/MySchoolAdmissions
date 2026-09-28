namespace MySchoolAdmissions.LeadService.DTOs;

public class InteractionDto
{
    public Guid Id { get; set; }
    public Guid EnquiryId { get; set; }
    public string InteractionType { get; set; } = string.Empty;
    public string Disposition { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime InteractionDate { get; set; }
    public Guid? HandledByUserId { get; set; }

    // Recording and Drive Storage
    public string? RecordingUrl { get; set; }
    public int? RecordingDurationSeconds { get; set; }
    public string? DriveFileId { get; set; }
    public string? DriveStatus { get; set; }
    public string? DriveFolder { get; set; }
}
