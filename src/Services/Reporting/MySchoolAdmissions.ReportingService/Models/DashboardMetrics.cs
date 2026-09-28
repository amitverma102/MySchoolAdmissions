namespace MySchoolAdmissions.ReportingService.Models;

public class DashboardMetrics
{
    public int Id { get; set; } = 1; // Single row for global metrics
    public int TotalEnquiries { get; set; }
    public int TotalApplications { get; set; }
    public int TotalEnrollments { get; set; }
    public decimal TotalRevenue { get; set; }
}
