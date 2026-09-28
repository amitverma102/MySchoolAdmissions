namespace MySchoolAdmissions.LeadService.DTOs;

public class CounselorSkillProfileDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string CounselorName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    public List<string> LanguagesKnown { get; set; } = new();
    public List<string> HandledClasses { get; set; } = new();
    public List<string> Regions { get; set; } = new();
    public List<string> Religions { get; set; } = new();
    public int DailyLeadCapacity { get; set; }
    public int MaxActiveLeads { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastAssignedAt { get; set; }
    public int AssignedCountToday { get; set; }
    public int CurrentActiveLeads { get; set; }
}

public class UpdateCounselorSkillProfileDto
{
    public Guid UserId { get; set; }
    public string CounselorName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    public List<string> LanguagesKnown { get; set; } = new();
    public List<string> HandledClasses { get; set; } = new();
    public List<string> Regions { get; set; } = new();
    public List<string> Religions { get; set; } = new();
    public int DailyLeadCapacity { get; set; } = 15;
    public int MaxActiveLeads { get; set; } = 50;
    public bool IsActive { get; set; } = true;
}

public class AutoAssignmentConfigDto
{
    public Guid? InstitutionId { get; set; }
    public int GradeWeight { get; set; } = 35;
    public int LanguageWeight { get; set; } = 25;
    public int RegionWeight { get; set; } = 20;
    public int ReligionWeight { get; set; } = 10;
    public int WorkloadBalanceWeight { get; set; } = 10;
    public int MinimumMatchThreshold { get; set; } = 40;
    public Guid? FallbackCounselorId { get; set; }
    public string? FallbackCounselorName { get; set; }
    public bool IsAutoAssignmentEnabled { get; set; } = true;
    public bool AutoAssignCoCounselor { get; set; } = true;
    public bool UseAiScoring { get; set; } = true;
}

public class LeadMatchCriteriaDto
{
    public string? GradeInterested { get; set; }
    public string? PreferredLanguage { get; set; }
    public string? Region { get; set; }
    public string? Religion { get; set; }
    public string? Notes { get; set; }
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
}

public class CounselorMatchCandidateDto
{
    public Guid UserId { get; set; }
    public string CounselorName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int TotalScore { get; set; }
    public int GradeScore { get; set; }
    public int LanguageScore { get; set; }
    public int RegionScore { get; set; }
    public int ReligionScore { get; set; }
    public int WorkloadScore { get; set; }
    public bool IsEligible { get; set; }
    public string IneligibilityReason { get; set; } = string.Empty;
    public string MatchSummary { get; set; } = string.Empty;
    public string AiAnalysis { get; set; } = string.Empty;
    public bool IsRecommendedCoCounselor { get; set; }
    public string? CoCounselorSynergy { get; set; }
    public int ActiveLeads { get; set; }
    public int AssignedToday { get; set; }
    public int DailyCapacity { get; set; }
    public List<string> MatchingSkills { get; set; } = new();
}

public class AutoAssignmentResultDto
{
    public bool Success { get; set; }
    public Guid? AssignedCounselorId { get; set; }
    public string? AssignedCounselorName { get; set; }
    public int MatchScore { get; set; }
    public string MatchReason { get; set; } = string.Empty;

    public Guid? CoCounselorId { get; set; }
    public string? CoCounselorName { get; set; }
    public int? CoCounselorScore { get; set; }
    public string? CoCounselorReason { get; set; }

    public bool IsFallback { get; set; }
    public string EvaluationEngine { get; set; } = "Artificial Intelligence Match Engine";
}

public class AssignLeadRequestDto
{
    public Guid? AssignedToId { get; set; }
    public Guid? CoCounselorId { get; set; }
    public string? Notes { get; set; }
}
