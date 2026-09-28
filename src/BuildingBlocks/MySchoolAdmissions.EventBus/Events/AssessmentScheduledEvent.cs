namespace MySchoolAdmissions.EventBus.Events;

public class AssessmentScheduledEvent
{
    public Guid ApplicationId { get; set; }
    public Guid AssessmentId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string AssessmentType { get; set; } = string.Empty;
    public DateTime ScheduledDate { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
}
