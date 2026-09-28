namespace MySchoolAdmissions.CommunicationService.Models;

public class CommunicationLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ReferenceId { get; set; } // LeadId or ApplicationId
    public string StudentName { get; set; } = string.Empty;
    public string Recipient { get; set; } = string.Empty; // Phone number or email
    public string Channel { get; set; } = "WhatsApp"; // WhatsApp, Email, SMS, Call
    public string TemplateName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Status { get; set; } = "Delivered";
    public string WhatsAppDeepLink { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public string HandledBy { get; set; } = "Admission Counselor";
}
