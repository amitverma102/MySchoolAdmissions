namespace MySchoolAdmissions.MarketingService.DTOs;

public class CampaignDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "Digital";
    public string Objective { get; set; } = "LeadGeneration";
    public string SchoolName { get; set; } = "Delhi International School";
    public Guid? CampusId { get; set; }
    public string CampusName { get; set; } = "Main Campus";
    public string AcademicSession { get; set; } = "2026–2027";
    public string TargetAdmissionCycle { get; set; } = "Cycle 1";
    public Guid? InstitutionId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = "Draft";
    public string Priority { get; set; } = "Medium";
    public decimal Budget { get; set; }
    public decimal ActualCost { get; set; }
    public string PrimaryChannel { get; set; } = "Facebook";
    public string Channels { get; set; } = "Facebook,Instagram";
    public string TargetGrades { get; set; } = string.Empty;
    public string TargetGeography { get; set; } = string.Empty;
    public string TargetPinCodes { get; set; } = string.Empty;
    
    // Funnel
    public int Impressions { get; set; }
    public int Clicks { get; set; }
    public int ExpectedLeads { get; set; }
    public int ActualLeads { get; set; }
    public int ExpectedQualified { get; set; }
    public int ActualQualified { get; set; }
    public int ExpectedVisits { get; set; }
    public int ActualVisits { get; set; }
    public int ExpectedApplications { get; set; }
    public int ActualApplications { get; set; }
    public int ExpectedEnrollments { get; set; }
    public int ActualEnrollments { get; set; }

    // Calculated
    public decimal CostPerLead { get; set; }
    public decimal CostPerVisit { get; set; }
    public decimal CostPerApplication { get; set; }
    public decimal CostPerEnrollment { get; set; }
    public double LeadToEnrollmentConversion { get; set; }

    // UTM & Tracking
    public string UtmSource { get; set; } = string.Empty;
    public string UtmMedium { get; set; } = string.Empty;
    public string UtmCampaign { get; set; } = string.Empty;
    public string QrCodeKey { get; set; } = string.Empty;

    // AI Metadata
    public bool IsAiGenerated { get; set; }
    public double AiConfidenceScore { get; set; }
    public string AiDiagnosisSummary { get; set; } = string.Empty;
    public string AiStrategySummary { get; set; } = string.Empty;
    public string Owner { get; set; } = "Marketing Lead";
    public DateTime CreatedAt { get; set; }
}
