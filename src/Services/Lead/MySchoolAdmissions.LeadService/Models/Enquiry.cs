namespace MySchoolAdmissions.LeadService.Models;

public class Enquiry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public string StudentName => $"{FirstName} {LastName}".Trim();
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string GradeInterested { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    public Guid? LeadSourceId { get; set; }
    public Guid? CampaignId { get; set; }
    public Guid? AssignedToId { get; set; }
    public Guid? CoCounselorId { get; set; }
    public string? PreferredLanguage { get; set; }
    public string? Region { get; set; }
    public string? Religion { get; set; }
    public int? AutoAssignmentScore { get; set; }
    public string? AutoAssignmentReason { get; set; }
    public string? CoCounselorReason { get; set; }
    public DateTime? AssignedAt { get; set; }
    public string Status { get; set; } = "New"; // New, Contacted, Qualified, Lost
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public LeadSource? LeadSource { get; set; }
    public Campaign? Campaign { get; set; }
    public ICollection<InteractionHistory> Interactions { get; set; } = new List<InteractionHistory>();
}

