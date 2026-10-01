namespace MySchoolAdmissions.LeadService.DTOs;

public class UpdateEnquiryDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? GradeInterested { get; set; }
    public Guid? CampusId { get; set; }
    public Guid? LeadSourceId { get; set; }
    public Guid? CampaignId { get; set; }
    public Guid? AssignedToId { get; set; }
    public Guid? CoCounselorId { get; set; }
    public string? PreferredLanguage { get; set; }
    public string? Region { get; set; }
    public string? Religion { get; set; }
    public string? Status { get; set; }
    public string? AssignmentNotes { get; set; }
    public string? CoCounselorReason { get; set; }
}
