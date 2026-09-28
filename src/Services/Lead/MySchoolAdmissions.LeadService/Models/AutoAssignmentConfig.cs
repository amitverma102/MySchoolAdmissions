namespace MySchoolAdmissions.LeadService.Models;

public class AutoAssignmentConfig
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? InstitutionId { get; set; }
    
    // Percentage weights (sums to 100)
    public int GradeWeight { get; set; } = 35;
    public int LanguageWeight { get; set; } = 25;
    public int RegionWeight { get; set; } = 20;
    public int ReligionWeight { get; set; } = 10;
    public int WorkloadBalanceWeight { get; set; } = 10;
    
    // Thresholds & Fallback
    public int MinimumMatchThreshold { get; set; } = 40;
    public Guid? FallbackCounselorId { get; set; }
    public string? FallbackCounselorName { get; set; }
    
    public bool IsAutoAssignmentEnabled { get; set; } = true;
    public bool AutoAssignCoCounselor { get; set; } = true;
    public bool UseAiScoring { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
