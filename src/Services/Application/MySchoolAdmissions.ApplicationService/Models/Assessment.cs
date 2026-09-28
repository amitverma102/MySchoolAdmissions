namespace MySchoolAdmissions.ApplicationService.Models;

public class Assessment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ApplicationId { get; set; }
    public Application Application { get; set; } = null!;
    public string Type { get; set; } = string.Empty; // Entrance Exam, Interview
    public DateTime ScheduledDate { get; set; }
    public string Status { get; set; } = "Scheduled"; // Scheduled, Completed, Missed
    public string Score { get; set; } = string.Empty;
    public string Feedback { get; set; } = string.Empty;
}
