using MySchoolAdmissions.EventBus.Events;
using MySchoolAdmissions.ApplicationService.Data;
using MySchoolAdmissions.ApplicationService.Models;
using MassTransit;

namespace MySchoolAdmissions.ApplicationService.Consumers;

public class LeadQualifiedEventConsumer : IConsumer<LeadQualifiedEvent>
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<LeadQualifiedEventConsumer> _logger;

    public LeadQualifiedEventConsumer(ApplicationDbContext context, ILogger<LeadQualifiedEventConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<LeadQualifiedEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Received LeadQualifiedEvent for {FirstName} {LastName}", message.FirstName, message.LastName);

        // Check if an application already exists for this lead
        var existing = _context.Applications.FirstOrDefault(a => a.EnquiryId == message.LeadId);
        if (existing == null)
        {
            var application = new Application
            {
                ApplicationNumber = $"APP-{DateTime.UtcNow.Year}-{new Random().Next(1000, 9999)}",
                EnquiryId = message.LeadId,
                ApplicantName = $"{message.FirstName} {message.LastName}",
                GradeApplyingFor = message.GradeInterested,
                Status = "Draft",
                InstitutionId = message.InstitutionId,
                CampusId = message.CampusId,
                SubmittedDate = DateTime.UtcNow
            };

            _context.Applications.Add(application);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Automatically created Draft Application {ApplicationNumber} for Lead {LeadId}", application.ApplicationNumber, message.LeadId);
        }
    }
}
