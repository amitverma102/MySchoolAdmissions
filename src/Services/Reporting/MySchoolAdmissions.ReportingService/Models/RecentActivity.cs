namespace MySchoolAdmissions.ReportingService.Models;

public class RecentActivity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string ActivityType { get; set; } = string.Empty; // e.g. "Enquiry", "Application", "Enrollment"
}
