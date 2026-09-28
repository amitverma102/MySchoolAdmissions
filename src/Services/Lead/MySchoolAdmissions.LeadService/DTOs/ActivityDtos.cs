namespace MySchoolAdmissions.LeadService.DTOs;

public class ActivityDto
{
    public Guid Id { get; set; }
    public Guid EnquiryId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string ParentEmail { get; set; } = string.Empty;
    public string ParentPhone { get; set; } = string.Empty;
    public string GradeInterested { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ActivityType { get; set; } = "Call"; // Call, CampusTour, Meeting, Assessment, Task
    public string Priority { get; set; } = "Normal"; // High, Normal, Low
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateTime ScheduledStartTime { get; set; }
    public DateTime ScheduledEndTime { get; set; }
    public string Status { get; set; } = "Scheduled"; // Scheduled, Completed, Cancelled, Rescheduled
    public string Disposition { get; set; } = string.Empty;
    public string OutcomeNotes { get; set; } = string.Empty;
    public DateTime? CompletedAt { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string AssignedToName { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateActivityDto
{
    public Guid EnquiryId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ActivityType { get; set; } = "Call"; // Call, CampusTour, Meeting, Assessment, Task
    public string Priority { get; set; } = "Normal"; // High, Normal, Low
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateTime ScheduledStartTime { get; set; }
    public DateTime ScheduledEndTime { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string AssignedToName { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
}

public class UpdateActivityDto
{
    public string Title { get; set; } = string.Empty;
    public string ActivityType { get; set; } = "Call";
    public string Priority { get; set; } = "Normal";
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateTime ScheduledStartTime { get; set; }
    public DateTime ScheduledEndTime { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string AssignedToName { get; set; } = string.Empty;
    public string Status { get; set; } = "Scheduled";
}

public class CompleteActivityDto
{
    public string Disposition { get; set; } = string.Empty; // Outcome disposition
    public string OutcomeNotes { get; set; } = string.Empty;
    public bool UpdateLeadStatus { get; set; } = true;
    public string? NextLeadStatus { get; set; } // e.g. Qualified, Contacted, Lost
    public CreateActivityDto? NextActivity { get; set; } // Optional 1-click follow-up
}

public class RescheduleActivityDto
{
    public DateTime NewStartTime { get; set; }
    public DateTime NewEndTime { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class ActivityMetricsDto
{
    public int TodayCount { get; set; }
    public int OverdueCount { get; set; }
    public int UpcomingCount { get; set; }
    public int CampusToursCount { get; set; }
    public int CompletedThisWeekCount { get; set; }
}

public class CreateTourAvailabilitySlotDto
{
    public Guid InstitutionId { get; set; }
    public Guid CampusId { get; set; }
    public DateTime SlotDate { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int Capacity { get; set; } = 3;
    public Guid? AssignedRepresentativeId { get; set; }
    public string? AssignedRepresentativeName { get; set; }
    public string? AssignedRepresentativeEmail { get; set; }
    public string? AssignedRepresentativePhone { get; set; }
}

public class TourAvailabilitySlotDto
{
    public Guid Id { get; set; }
    public Guid InstitutionId { get; set; }
    public Guid CampusId { get; set; }
    public DateTime SlotDate { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int Capacity { get; set; }
    public bool IsActive { get; set; }
    public int BookedCount { get; set; }
    public Guid? AssignedRepresentativeId { get; set; }
    public string? AssignedRepresentativeName { get; set; }
    public string? AssignedRepresentativeEmail { get; set; }
    public string? AssignedRepresentativePhone { get; set; }
}
