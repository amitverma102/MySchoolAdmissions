namespace MySchoolAdmissions.MarketingService.DTOs;

public class UpdateCampaignDto
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "Digital";
    public string Objective { get; set; } = "LeadGeneration";
    public string SchoolName { get; set; } = "Delhi International School";
    public Guid? CampusId { get; set; }
    public string CampusName { get; set; } = "Main Campus";
    public string AcademicSession { get; set; } = "2026–2027";
    public string TargetAdmissionCycle { get; set; } = "Cycle 1";
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal Budget { get; set; }
    public decimal ActualCost { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium";
    public string PrimaryChannel { get; set; } = "Facebook";
    public string Channels { get; set; } = "Facebook,Instagram";
    public string TargetGrades { get; set; } = string.Empty;
    public string TargetGeography { get; set; } = string.Empty;
    public string TargetPinCodes { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }

    // Funnel actuals
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

    // Tracking
    public string UtmSource { get; set; } = string.Empty;
    public string UtmMedium { get; set; } = string.Empty;
    public string UtmCampaign { get; set; } = string.Empty;
    public string QrCodeKey { get; set; } = string.Empty;
    public string Owner { get; set; } = "Marketing Lead";
}
