namespace MySchoolAdmissions.LeadService.DTOs;

public class CreateEnquiryDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string GradeInterested { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    public Guid? LeadSourceId { get; set; }
    public string? LeadSourceName { get; set; }
    public Guid? CampaignId { get; set; }
    public string? CampaignName { get; set; }
    public Guid? AssignedToId { get; set; }
    public Guid? CoCounselorId { get; set; }
    public string? CoCounselorReason { get; set; }
    public string? PreferredLanguage { get; set; }
    public string? Region { get; set; }
    public string? Religion { get; set; }
}
