namespace MySchoolAdmissions.EventBus.Events;

public class ApplicationApprovedEvent
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public DateTime ApprovedDate { get; set; }
}
