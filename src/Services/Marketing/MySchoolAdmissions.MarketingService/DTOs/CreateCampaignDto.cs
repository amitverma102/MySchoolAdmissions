namespace MySchoolAdmissions.MarketingService.DTOs;

public class CreateCampaignDto
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "Digital";
    public string Objective { get; set; } = "LeadGeneration";
    public string SchoolName { get; set; } = "Delhi International School";
    public Guid? CampusId { get; set; }
    public string CampusName { get; set; } = "Main Campus";
    public string AcademicSession { get; set; } = "2026–2027";
    public string TargetAdmissionCycle { get; set; } = "Cycle 1";
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime EndDate { get; set; } = DateTime.UtcNow.AddDays(30);
    public decimal Budget { get; set; }
    public string Status { get; set; } = "Draft";
    public string Priority { get; set; } = "Medium";
    public string PrimaryChannel { get; set; } = "Facebook";
    public string Channels { get; set; } = "Facebook,Instagram";
    public string TargetGrades { get; set; } = string.Empty;
    public string TargetGeography { get; set; } = string.Empty;
    public string TargetPinCodes { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public string UtmSource { get; set; } = string.Empty;
    public string UtmMedium { get; set; } = string.Empty;
    public string UtmCampaign { get; set; } = string.Empty;
    public string QrCodeKey { get; set; } = string.Empty;
    public bool IsAiGenerated { get; set; }
    public double AiConfidenceScore { get; set; } = 0.85;
    public string AiStrategySummary { get; set; } = string.Empty;
    public string Owner { get; set; } = "Marketing Lead";
}
