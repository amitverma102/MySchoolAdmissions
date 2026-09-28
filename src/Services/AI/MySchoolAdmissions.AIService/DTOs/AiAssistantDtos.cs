namespace MySchoolAdmissions.AIService.DTOs;

public class CounselorDraftRequestDto
{
    public Guid LeadId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string GradeInterested { get; set; } = string.Empty;
    public string Objective { get; set; } = "FollowUp"; // FollowUp, CampusTour, Scholarship, FeeReminder
    public string? CounselorNotes { get; set; }
    public string? PreferredChannel { get; set; } = "Email"; // Email or WhatsApp
}

public class CounselorDraftResponseDto
{
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string WhatsAppShortText { get; set; } = string.Empty;
    public string Tone { get; set; } = "Professional & Engaging";
    public List<string> KeyTalkingPoints { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
