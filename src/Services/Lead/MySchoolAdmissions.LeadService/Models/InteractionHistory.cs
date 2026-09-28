namespace MySchoolAdmissions.LeadService.Models;

public class InteractionHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EnquiryId { get; set; }
    public Enquiry Enquiry { get; set; } = null!;
    public string InteractionType { get; set; } = string.Empty; // Email, Call, WhatsApp, Meeting, Walk-in
    public string Disposition { get; set; } = string.Empty; // Interested, Callback, Not Reachable, Info Sent
    public string Notes { get; set; } = string.Empty;
    public DateTime InteractionDate { get; set; } = DateTime.UtcNow;
    public Guid? HandledByUserId { get; set; }

    // Telephone Call Recording & Drive Storage Integration
    public string? RecordingUrl { get; set; }
    public int? RecordingDurationSeconds { get; set; }
    public string? DriveFileId { get; set; }
    public string? DriveStatus { get; set; } // "Synced to Google Drive", "Local Drive", "Pending"
    public string? DriveFolder { get; set; }
}
