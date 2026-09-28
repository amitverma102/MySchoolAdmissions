namespace MySchoolAdmissions.MarketingService.DTOs;

public class CampaignDashboardDto
{
    public int TotalCampaigns { get; set; }
    public int ActiveCampaigns { get; set; }
    public int ScheduledCampaigns { get; set; }
    public int CompletedCampaigns { get; set; }
    
    // Aggregated Funnel
    public long TotalImpressions { get; set; }
    public long TotalClicks { get; set; }
    public int TotalLeads { get; set; }
    public int TotalQualifiedLeads { get; set; }
    public int TotalVisits { get; set; }
    public int TotalApplications { get; set; }
    public int TotalEnrollments { get; set; }

    // Financials
    public decimal TotalBudget { get; set; }
    public decimal TotalSpend { get; set; }
    public decimal CostPerLead { get; set; }
    public decimal CostPerVisit { get; set; }
    public decimal CostPerApplication { get; set; }
    public decimal CostPerEnrollment { get; set; }
    public decimal MarketingRoi { get; set; } // Percentage ROI

    // Benchmark comparison (vs previous admission cycle)
    public double LeadGrowthPercentage { get; set; }
    public double VisitGrowthPercentage { get; set; }
    public double EnrollmentGrowthPercentage { get; set; }
    public double CplEfficiencyPercentage { get; set; }

    // Step-Down Funnel Conversion Rates
    public double ImpressionToClickRate { get; set; }
    public double ClickToLeadRate { get; set; }
    public double LeadToQualifiedRate { get; set; }
    public double QualifiedToVisitRate { get; set; }
    public double VisitToApplicationRate { get; set; }
    public double ApplicationToEnrollmentRate { get; set; }
    public double OverallConversionRate { get; set; }

    public List<CampaignAlertDto> UrgentAlerts { get; set; } = new();
    public List<ChannelPerformanceDto> ChannelHighlights { get; set; } = new();
}

public class CampaignAlertDto
{
    public string Id { get; set; } = string.Empty;
    public string Severity { get; set; } = "Warning"; // Info, Warning, Critical, Opportunity
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string RecommendedAction { get; set; } = string.Empty;
}

public class CreateAiCampaignRequestDto
{
    public string Objective { get; set; } = "LeadGeneration";
    public string SchoolName { get; set; } = "Delhi International School";
    public string CampusName { get; set; } = "Main Campus";
    public string AcademicSession { get; set; } = "2026–2027";
    public string TargetGrades { get; set; } = "Kindergarten,Grade 1,Grade 2";
    public string TargetGeography { get; set; } = "Indiranagar, Koramangala (0-5 km)";
    public decimal Budget { get; set; } = 35000;
    public int DurationDays { get; set; } = 30;
    public string PreferredChannels { get; set; } = "Facebook,Instagram,WhatsApp,Society";
    public string SpecialOffer { get; set; } = "Early Bird Seat Registration Fee Waiver & Campus Tour Kit";
}

public class AiCampaignResultDto
{
    public string CampaignName { get; set; } = string.Empty;
    public string Objective { get; set; } = string.Empty;
    public string StrategySummary { get; set; } = string.Empty;
    public string TargetAudienceProfile { get; set; } = string.Empty;
    public string RecommendedChannels { get; set; } = string.Empty;
    public decimal RecommendedBudget { get; set; }
    public int ExpectedLeads { get; set; }
    public int ExpectedVisits { get; set; }
    public int ExpectedEnrollments { get; set; }
    public double ConfidenceScore { get; set; }
    
    // Multi-Channel Generated Creatives & Copy
    public string Headline { get; set; } = string.Empty;
    public string PrimaryText { get; set; } = string.Empty;
    public string CallToAction { get; set; } = string.Empty;
    public string WhatsAppCopy { get; set; } = string.Empty;
    public string SmsCopy { get; set; } = string.Empty;
    public string EmailSubject { get; set; } = string.Empty;
    public string EmailBody { get; set; } = string.Empty;
    public string FacebookAdCopy { get; set; } = string.Empty;
    public string GoogleHeadline1 { get; set; } = string.Empty;
    public string GoogleHeadline2 { get; set; } = string.Empty;
    public string GoogleDescription { get; set; } = string.Empty;
    public string CounselorFollowupScript { get; set; } = string.Empty;
}

public class CampaignDiagnosisDto
{
    public Guid CampaignId { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    public string OverallAssessment { get; set; } = string.Empty;
    public List<string> WhatWorked { get; set; } = new();
    public List<string> WhatDidNotWork { get; set; } = new();
    public string AudienceDiagnosis { get; set; } = string.Empty;
    public string CreativeDiagnosis { get; set; } = string.Empty;
    public string ChannelDiagnosis { get; set; } = string.Empty;
    public string GeographyDiagnosis { get; set; } = string.Empty;
    public string TimingDiagnosis { get; set; } = string.Empty;
    public string CounselorFollowupDiagnosis { get; set; } = string.Empty;
    public List<string> RecommendedActions { get; set; } = new();
}

public class CampaignCopilotRequestDto
{
    public string Query { get; set; } = string.Empty;
    public string? SchoolFilter { get; set; }
    public string? SessionFilter { get; set; }
}

public class CampaignCopilotResponseDto
{
    public string Answer { get; set; } = string.Empty;
    public string DataPeriod { get; set; } = "Academic Cycle 2025–2026 & Active 2026–2027";
    public List<string> DataPointsCited { get; set; } = new();
    public List<string> SuggestedFollowups { get; set; } = new();
    public string? ActionableButtonText { get; set; }
    public string? ActionableRoute { get; set; }
}

public class GeographyPerformanceDto
{
    public string PinCode { get; set; } = string.Empty;
    public string Locality { get; set; } = string.Empty;
    public string DistanceBracket { get; set; } = "0–5 km";
    public int Leads { get; set; }
    public int Visits { get; set; }
    public int Enrollments { get; set; }
    public decimal TotalSpend { get; set; }
    public decimal CostPerEnrollment { get; set; }
    public double VisitConversionRate { get; set; }
    public double EnrollmentConversionRate { get; set; }
}

public class ChannelPerformanceDto
{
    public string Channel { get; set; } = string.Empty;
    public string Category { get; set; } = "Digital"; // Digital, Offline, Referral
    public decimal TotalSpend { get; set; }
    public int Leads { get; set; }
    public int QualifiedLeads { get; set; }
    public int Visits { get; set; }
    public int Enrollments { get; set; }
    public decimal CostPerLead { get; set; }
    public decimal CostPerVisit { get; set; }
    public decimal CostPerEnrollment { get; set; }
    public double EnrollmentConversion { get; set; }
    public decimal RevenueGenerated { get; set; }
    public decimal ReturnOnSpend { get; set; }
}

public class CampaignIdeaDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string IdeaTitle { get; set; } = string.Empty;
    public string Objective { get; set; } = string.Empty;
    public string TargetAudience { get; set; } = string.Empty;
    public string RecommendedChannel { get; set; } = string.Empty;
    public string TargetGeography { get; set; } = string.Empty;
    public int DurationDays { get; set; } = 21;
    public decimal EstimatedBudget { get; set; } = 30000;
    public int ExpectedLeads { get; set; }
    public int ExpectedVisits { get; set; }
    public int ExpectedEnrollments { get; set; }
    public string ReasonForRecommendation { get; set; } = string.Empty;
    public string HistoricalEvidence { get; set; } = string.Empty;
    public double ConfidenceLevel { get; set; } = 0.86;
}

public class CampaignCalendarEventDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string EventType { get; set; } = "Campaign"; // Campaign, OpenHouse, AdmissionDeadline, SchoolEvent, Holiday, ExamPeriod
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Channel { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public string SchoolName { get; set; } = string.Empty;
    public bool HasConflict { get; set; } = false;
    public string ConflictReason { get; set; } = string.Empty;
}
