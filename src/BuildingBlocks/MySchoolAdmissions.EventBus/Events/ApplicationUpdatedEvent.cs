namespace MySchoolAdmissions.EventBus.Events;

public class ApplicationUpdatedEvent
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateTime UpdatedDate { get; set; }
}
