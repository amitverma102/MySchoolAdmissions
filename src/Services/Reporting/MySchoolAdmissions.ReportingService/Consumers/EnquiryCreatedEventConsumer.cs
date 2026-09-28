using MySchoolAdmissions.EventBus.Events;
using MySchoolAdmissions.ReportingService.Data;
using MySchoolAdmissions.ReportingService.Models;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.ReportingService.Consumers;

public class EnquiryCreatedEventConsumer : IConsumer<EnquiryCreatedEvent>
{
    private readonly ReportingDbContext _context;

    public EnquiryCreatedEventConsumer(ReportingDbContext context)
    {
        _context = context;
    }

    public async Task Consume(ConsumeContext<EnquiryCreatedEvent> context)
    {
        var metrics = await _context.Metrics.FirstOrDefaultAsync(m => m.Id == 1);
        if (metrics == null)
        {
            metrics = new DashboardMetrics { Id = 1 };
            _context.Metrics.Add(metrics);
        }
        
        metrics.TotalEnquiries++;
        
        _context.Activities.Add(new RecentActivity
        {
            ActivityType = "Enquiry",
            Description = $"New lead captured: {context.Message.FirstName} {context.Message.LastName}",
            Timestamp = context.Message.CreatedAt
        });
        
        await _context.SaveChangesAsync();
    }
}
