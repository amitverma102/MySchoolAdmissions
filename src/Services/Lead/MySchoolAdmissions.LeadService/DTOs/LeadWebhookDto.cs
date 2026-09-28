namespace MySchoolAdmissions.LeadService.DTOs;

public class LeadWebhookDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string GradeInterested { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    public string? Notes { get; set; }
    public string? UtmSource { get; set; }
    public string? UtmMedium { get; set; }
    public string? UtmCampaign { get; set; }
    public string? PreferredLanguage { get; set; }
    public string? Region { get; set; }
    public string? Religion { get; set; }
}

public class WebhookIngestionResultDto
{
    public bool Success { get; set; }
    public bool IsDuplicate { get; set; }
    public Guid LeadId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public Guid? AssignedCounselorId { get; set; }
}

public class BookCampusTourDto
{
    public string ParentName { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string GradeInterested { get; set; } = string.Empty;
    public DateTime TourDate { get; set; }
    public string TimeSlot { get; set; } = string.Empty; // e.g. "10:00 AM - 10:45 AM"
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    public string? Notes { get; set; }
    public int NumberOfAttendees { get; set; } = 2;
}

public class TourSlotDto
{
    public Guid InstitutionId { get; set; }
    public Guid CampusId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public string CampusName { get; set; } = string.Empty;
    public string TimeSlot { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public bool IsAvailable { get; set; } = true;
    public int BookedCount { get; set; }
    public int MaxCapacity { get; set; } = 3;
    public Guid? AssignedRepresentativeId { get; set; }
    public string? AssignedRepresentativeName { get; set; }
    public string? AssignedRepresentativePhone { get; set; }
}

public class TourBookingResultDto
{
    public bool Success { get; set; }
    public Guid ActivityId { get; set; }
    public Guid LeadId { get; set; }
    public string ConfirmationCode { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime ScheduledTime { get; set; }
    public string CounselorName { get; set; } = string.Empty;
}

public class MetaLeadGenWebhookPayload
{
    public string? Object { get; set; }
    public List<MetaWebhookEntry>? Entry { get; set; }
}

public class MetaWebhookEntry
{
    public string? Id { get; set; }
    public long Time { get; set; }
    public List<MetaWebhookChange>? Changes { get; set; }
}

public class MetaWebhookChange
{
    public string? Field { get; set; }
    public MetaWebhookValue? Value { get; set; }
}

public class MetaWebhookValue
{
    public string? AdId { get; set; }
    public string? FormId { get; set; }
    public string? LeadgenId { get; set; }
    public long CreatedTime { get; set; }
    public string? PageId { get; set; }
    public string? AdgroupId { get; set; }
    public string? CampaignId { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Grade { get; set; }
    public string? CampusName { get; set; }
}
