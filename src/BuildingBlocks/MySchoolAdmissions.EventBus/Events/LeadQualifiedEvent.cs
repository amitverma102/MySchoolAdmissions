namespace MySchoolAdmissions.EventBus.Events;

public class LeadQualifiedEvent
{
    public Guid LeadId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string GradeInterested { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    public DateTime QualifiedDate { get; set; }
}
