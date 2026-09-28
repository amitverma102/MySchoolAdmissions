namespace MySchoolAdmissions.LeadService.Models;

public class AdmissionActivity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EnquiryId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ActivityType { get; set; } = "Call"; // Call, CampusTour, Meeting, Assessment, Task
    public string Priority { get; set; } = "Normal"; // High, Normal, Low
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty; // Campus Sector 23 Reception, Virtual Google Meet, Phone
    public DateTime ScheduledStartTime { get; set; }
    public DateTime ScheduledEndTime { get; set; }
    public string Status { get; set; } = "Scheduled"; // Scheduled, Completed, Cancelled, Rescheduled
    public string Disposition { get; set; } = string.Empty; // Outcome disposition recorded upon completion
    public string OutcomeNotes { get; set; } = string.Empty;
    public DateTime? CompletedAt { get; set; }
    public Guid? AssignedToUserId { get; set; }
    public string AssignedToName { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Enquiry? Enquiry { get; set; }
}
