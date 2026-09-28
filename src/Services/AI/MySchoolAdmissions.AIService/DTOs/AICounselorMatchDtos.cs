namespace MySchoolAdmissions.AIService.DTOs;

public class AICounselorLeadProfileDto
{
    public Guid? LeadId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string GradeInterested { get; set; } = string.Empty;
    public string? PreferredLanguage { get; set; }
    public string? Region { get; set; }
    public string? Religion { get; set; }
    public string? Notes { get; set; }
}

public class AICounselorCandidateProfileDto
{
    public Guid UserId { get; set; }
    public string CounselorName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public List<string> HandledClasses { get; set; } = new();
    public List<string> LanguagesKnown { get; set; } = new();
    public List<string> Regions { get; set; } = new();
    public List<string> Religions { get; set; } = new();
    public int ActiveLeads { get; set; }
    public int AssignedToday { get; set; }
    public int DailyCapacity { get; set; } = 15;
    public int MaxActiveLeads { get; set; } = 50;
    public bool IsActive { get; set; } = true;
}

public class AIMatchConfigDto
{
    public int GradeWeight { get; set; } = 35;
    public int LanguageWeight { get; set; } = 25;
    public int RegionWeight { get; set; } = 20;
    public int ReligionWeight { get; set; } = 10;
    public int WorkloadBalanceWeight { get; set; } = 10;
    public int MinimumMatchThreshold { get; set; } = 40;
    public bool AutoAssignCoCounselor { get; set; } = true;
}

public class AICounselorMatchRequestDto
{
    public AICounselorLeadProfileDto Lead { get; set; } = new();
    public List<AICounselorCandidateProfileDto> Counselors { get; set; } = new();
    public AIMatchConfigDto Config { get; set; } = new();
}

public class AICounselorEvaluationDto
{
    public Guid CounselorId { get; set; }
    public string CounselorName { get; set; } = string.Empty;
    public int TotalScore { get; set; }
    public int AcademicScore { get; set; }
    public int LanguageScore { get; set; }
    public int RegionScore { get; set; }
    public int ReligionScore { get; set; }
    public int WorkloadScore { get; set; }
    public string Analysis { get; set; } = string.Empty;
    public bool IsEligible { get; set; } = true;
    public string IneligibilityReason { get; set; } = string.Empty;
    public bool IsPrimaryMatch { get; set; }
    public bool IsRecommendedCoCounselor { get; set; }
    public string? CoCounselorSynergy { get; set; }
}

public class AICounselorMatchResponseDto
{
    public bool Success { get; set; }
    public Guid? PrimaryCounselorId { get; set; }
    public string? PrimaryCounselorName { get; set; }
    public int PrimaryScore { get; set; }
    public string PrimaryReason { get; set; } = string.Empty;

    public Guid? CoCounselorId { get; set; }
    public string? CoCounselorName { get; set; }
    public int? CoCounselorScore { get; set; }
    public string? CoCounselorReason { get; set; }

    public List<AICounselorEvaluationDto> AllEvaluations { get; set; } = new();
    public string EvaluationModel { get; set; } = "MySchoolAdmissions AI Intelligence Engine";
    public DateTime EvaluatedAt { get; set; } = DateTime.UtcNow;
}
