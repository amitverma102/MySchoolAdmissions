namespace MySchoolAdmissions.EventBus.Events;

public class InstitutionStatusChangedEvent
{
    public Guid InstitutionId { get; set; }
    public bool IsActive { get; set; }
}
