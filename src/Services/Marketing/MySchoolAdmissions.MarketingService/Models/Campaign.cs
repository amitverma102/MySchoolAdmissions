namespace MySchoolAdmissions.MarketingService.Models;

public class Campaign
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "Digital"; // Digital, Offline, Hybrid, Referral
    public string Objective { get; set; } = "LeadGeneration"; // LeadGeneration, CampusVisits, OpenHouse, ApplicationGeneration, Enrollment, EarlyAdmission, ScholarshipPromotion
    
    // Multi-School / Campus Targeting
    public string SchoolName { get; set; } = "Delhi International School";
    public Guid? CampusId { get; set; }
    public string CampusName { get; set; } = "Main Campus";
    public string AcademicSession { get; set; } = "2026–2027";
    public string TargetAdmissionCycle { get; set; } = "Cycle 1 (April 2026)";
    public Guid? InstitutionId { get; set; }

    // Timing & Status Lifecycle
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime EndDate { get; set; } = DateTime.UtcNow.AddDays(30);
    public string Status { get; set; } = "Draft"; // Draft, AiGenerated, PendingApproval, Approved, Scheduled, Active, Paused, Completed, Analyzing, Learned, Cancelled, Archived
    public string Priority { get; set; } = "Medium"; // Low, Medium, High, Urgent
    
    // Budget & Financials
    public decimal Budget { get; set; }
    public decimal ActualCost { get; set; }
    
    // Channels & Segments
    public string PrimaryChannel { get; set; } = "Facebook";
    public string Channels { get; set; } = "Facebook,Instagram"; // Comma-separated or multi-channel
    public string TargetGrades { get; set; } = "Grade 1,Grade 2,Grade 3";
    public string TargetGeography { get; set; } = "Within 5 km radius";
    public string TargetPinCodes { get; set; } = string.Empty;

    // Complete Funnel Metrics
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

    // Tracking & Attribution
    public string UtmSource { get; set; } = string.Empty;
    public string UtmMedium { get; set; } = string.Empty;
    public string UtmCampaign { get; set; } = string.Empty;
    public string UtmContent { get; set; } = string.Empty;
    public string UtmTerm { get; set; } = string.Empty;
    public string QrCodeKey { get; set; } = string.Empty;

    // AI Intelligence Metadata
    public bool IsAiGenerated { get; set; } = false;
    public Guid? AiRecommendationId { get; set; }
    public double AiConfidenceScore { get; set; } = 0.85; // 0.0 to 1.0
    public string AiDiagnosisSummary { get; set; } = string.Empty;
    public string AiStrategySummary { get; set; } = string.Empty;

    // Ownership & Audit
    public string Owner { get; set; } = "Marketing Lead";
    public string CreatedBy { get; set; } = "admin@edukey.com";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Calculated Helper Properties
    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public decimal CostPerLead => ActualLeads > 0 ? Math.Round(ActualCost / ActualLeads, 2) : 0;

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public decimal CostPerVisit => ActualVisits > 0 ? Math.Round(ActualCost / ActualVisits, 2) : 0;

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public decimal CostPerApplication => ActualApplications > 0 ? Math.Round(ActualCost / ActualApplications, 2) : 0;

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public decimal CostPerEnrollment => ActualEnrollments > 0 ? Math.Round(ActualCost / ActualEnrollments, 2) : 0;

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public double LeadToEnrollmentConversion => ActualLeads > 0 ? Math.Round(((double)ActualEnrollments / ActualLeads) * 100, 2) : 0;
}
