namespace MySchoolAdmissions.EventBus.Events;

public class EnquiryCreatedEvent
{
    public Guid EnquiryId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
