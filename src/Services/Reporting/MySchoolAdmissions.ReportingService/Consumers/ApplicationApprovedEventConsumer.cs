using MySchoolAdmissions.EventBus.Events;
using MySchoolAdmissions.ReportingService.Data;
using MySchoolAdmissions.ReportingService.Models;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.ReportingService.Consumers;

public class ApplicationApprovedEventConsumer : IConsumer<ApplicationApprovedEvent>
{
    private readonly ReportingDbContext _context;

    public ApplicationApprovedEventConsumer(ReportingDbContext context)
    {
        _context = context;
    }

    public async Task Consume(ConsumeContext<ApplicationApprovedEvent> context)
    {
        var metrics = await _context.Metrics.FirstOrDefaultAsync(m => m.Id == 1);
        if (metrics == null)
        {
            metrics = new DashboardMetrics { Id = 1 };
            _context.Metrics.Add(metrics);
        }
        
        metrics.TotalApplications++;
        
        _context.Activities.Add(new RecentActivity
        {
            ActivityType = "Application",
            Description = $"Application approved for {context.Message.ApplicantName} (Grade {context.Message.Grade})",
            Timestamp = context.Message.ApprovedDate
        });
        
        await _context.SaveChangesAsync();
    }
}
