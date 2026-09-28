namespace MySchoolAdmissions.EventBus.Events;

public class CampusStatusChangedEvent
{
    public Guid CampusId { get; set; }
    public bool IsActive { get; set; }
}
