namespace MySchoolAdmissions.LeadService.DTOs;

public class EnquiryDto
{
    public Guid Id { get; set; }
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
    public string? AssignedToName { get; set; }
    public Guid? CoCounselorId { get; set; }
    public string? CoCounselorName { get; set; }
    public string? PreferredLanguage { get; set; }
    public string? Region { get; set; }
    public string? Religion { get; set; }
    public int? AutoAssignmentScore { get; set; }
    public string? AutoAssignmentReason { get; set; }
    public string? CoCounselorReason { get; set; }
    public DateTime? AssignedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // Optionally include interactions directly in the enquiry payload
    public ICollection<InteractionDto> Interactions { get; set; } = new List<InteractionDto>();
}
