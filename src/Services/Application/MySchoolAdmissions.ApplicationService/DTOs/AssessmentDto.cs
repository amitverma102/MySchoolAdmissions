namespace MySchoolAdmissions.ApplicationService.DTOs;

public class AssessmentDto
{
    public Guid Id { get; set; }
    public Guid ApplicationId { get; set; }
    public string Type { get; set; } = string.Empty;
    public DateTime ScheduledDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Score { get; set; } = string.Empty;
    public string Feedback { get; set; } = string.Empty;
}
