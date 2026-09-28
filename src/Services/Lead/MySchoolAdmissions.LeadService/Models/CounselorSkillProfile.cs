namespace MySchoolAdmissions.LeadService.Models;

public class CounselorSkillProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string CounselorName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    
    // Skill Matrix Parameters
    public List<string> LanguagesKnown { get; set; } = new();
    public List<string> HandledClasses { get; set; } = new();
    public List<string> Regions { get; set; } = new();
    public List<string> Religions { get; set; } = new();

    // Capacity & Availability
    public int DailyLeadCapacity { get; set; } = 15;
    public int MaxActiveLeads { get; set; } = 50;
    public bool IsActive { get; set; } = true;
    public DateTime? LastAssignedAt { get; set; }
    public int AssignedCountToday { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
