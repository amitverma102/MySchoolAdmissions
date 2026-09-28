using Microsoft.EntityFrameworkCore;
using MySchoolAdmissions.ReportingService.Models;

namespace MySchoolAdmissions.ReportingService.Data;

public class ReportingDbContext : DbContext
{
    public ReportingDbContext(DbContextOptions<ReportingDbContext> options) : base(options) { }

    public DbSet<DashboardMetrics> Metrics { get; set; }
    public DbSet<RecentActivity> Activities { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DashboardMetrics>().HasData(new DashboardMetrics { Id = 1, TotalEnquiries = 0, TotalApplications = 0, TotalEnrollments = 0, TotalRevenue = 0 });
    }
}
