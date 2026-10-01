namespace MySchoolAdmissions.LeadService.DTOs;

public class AssignCounselorsDto
{
    public Guid? AssignedToId { get; set; }
    public Guid? CoCounselorId { get; set; }
    public string? AssignmentNotes { get; set; }
    public string? CoCounselorReason { get; set; }
}
