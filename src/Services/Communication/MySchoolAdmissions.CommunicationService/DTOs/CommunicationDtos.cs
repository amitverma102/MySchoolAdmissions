namespace MySchoolAdmissions.CommunicationService.DTOs;

public class SendCommunicationDto
{
    public Guid ReferenceId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Recipient { get; set; } = string.Empty; // e.g. Phone or Email
    public string Channel { get; set; } = "WhatsApp"; // WhatsApp, Email, SMS, Call
    public string TemplateName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string HandledBy { get; set; } = "Counselor";
}

public class CommunicationTemplateDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Channel { get; set; } = "WhatsApp";
    public string Subject { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class SendCommunicationResultDto
{
    public bool Success { get; set; }
    public Guid LogId { get; set; }
    public string Status { get; set; } = "Delivered";
    public string Channel { get; set; } = "WhatsApp";
    public string? WhatsAppUrl { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class SendWhatsAppBrochureDto
{
    public Guid ReferenceId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string SchoolName { get; set; } = "Delhi International School";
    public string TargetGrade { get; set; } = "Grade 1";
    public string BrochureUrl { get; set; } = "https://myschooladmissions.org/brochures/2026-2027-admissions-prospectus.pdf";
    public string CounselorName { get; set; } = "Senior Admission Counselor";
}

public class LogCallDto
{
    public Guid ReferenceId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public int DurationSeconds { get; set; } = 60;
    public string Outcome { get; set; } = "Connected"; // Connected, NoAnswer, Busy, CallbackRequested
    public string Notes { get; set; } = string.Empty;
    public string CounselorName { get; set; } = "Counselor";
}

