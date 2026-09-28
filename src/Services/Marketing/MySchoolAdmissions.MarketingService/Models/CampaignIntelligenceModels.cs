namespace MySchoolAdmissions.MarketingService.Models;

public class CampaignRecommendation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "Optimization"; // ChannelShift, BudgetIncrease, NewCampaign, Retargeting, GeographicExpansion
    public string Description { get; set; } = string.Empty;
    public string SupportingEvidence { get; set; } = string.Empty;
    public string HistoricalPeriod { get; set; } = "Previous Admission Cycle";
    public int SampleSize { get; set; } = 450;
    public double ConfidenceLevel { get; set; } = 0.88; // 0.0 - 1.0
    public string ExpectedImpact { get; set; } = "+25% Higher Visit-to-Enrollment Conversion";
    public string Assumptions { get; set; } = "Assumes same seasonal admission interest and localized radius";
    public decimal SuggestedBudget { get; set; } = 25000;
    public string TargetChannel { get; set; } = "Apartment Society Event";
    public string TargetGeography { get; set; } = "Sector 14 / Indiranagar (0-5 km)";
    public string Status { get; set; } = "Pending"; // Pending, Adopted, Dismissed
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CampaignLearning
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? CampaignId { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string Geography { get; set; } = string.Empty;
    public decimal TotalSpend { get; set; }
    public int TotalLeads { get; set; }
    public int TotalVisits { get; set; }
    public int TotalEnrollments { get; set; }
    public decimal CostPerEnrollment { get; set; }
    public string WhatWorked { get; set; } = string.Empty;
    public string WhatFailed { get; set; } = string.Empty;
    public string KeyTakeaway { get; set; } = string.Empty;
    public string RecommendedNextAction { get; set; } = string.Empty;
    public DateTime LoggedAt { get; set; } = DateTime.UtcNow;
}

public class CampaignQrCode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? CampaignId { get; set; }
    public string CodeKey { get; set; } = string.Empty; // e.g. QR-SOC-IND-01
    public string Title { get; set; } = string.Empty;
    public string TargetLocation { get; set; } = string.Empty; // e.g. Prestige Ozone Society Club House
    public string ChannelType { get; set; } = "Society Event"; // Society Event, Mall Kiosk, Newspaper, Flyer, Hoarding, Open House
    public string DestinationUrl { get; set; } = string.Empty;
    public string QrImageUrl { get; set; } = string.Empty;
    public int TotalScans { get; set; }
    public int LeadsGenerated { get; set; }
    public int EnrollmentsGenerated { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CampaignAttributionTouchpoint
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LeadId { get; set; }
    public Guid CampaignId { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string TouchpointType { get; set; } = "FirstTouch"; // FirstTouch, IntermediateTouch, LastTouch
    public string StageReached { get; set; } = "Enrollment"; // Lead, Visit, Application, Enrollment
    public double AttributionWeight { get; set; } = 1.0;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class CampaignAutopilotConfig
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? InstitutionId { get; set; }
    public int AutopilotLevel { get; set; } = 2; // Level 1 (Recommend Only) to Level 5 (Auto Optimize)
    public decimal MaxMonthlyBudgetCap { get; set; } = 200000;
    public decimal MaxSingleCampaignBudget { get; set; } = 50000;
    public bool RequireHumanApprovalForPublishing { get; set; } = true;
    public bool EmergencyPauseAllActive { get; set; } = false;
    public string ApprovedChannels { get; set; } = "Facebook,Instagram,Google,WhatsApp,Society";
    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}

public class CampaignAuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ActionType { get; set; } = "StatusChange";
    public string PerformedBy { get; set; } = "AI Autopilot";
    public string Details { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
