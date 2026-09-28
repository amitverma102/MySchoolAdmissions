using MySchoolAdmissions.EventBus.Events;
using MySchoolAdmissions.EnrollmentService.Data;
using MySchoolAdmissions.EnrollmentService.Models;
using MassTransit;

namespace MySchoolAdmissions.EnrollmentService.Consumers;

public class ApplicationApprovedEventConsumer : IConsumer<ApplicationApprovedEvent>
{
    private readonly EnrollmentDbContext _context;
    private readonly ILogger<ApplicationApprovedEventConsumer> _logger;

    public ApplicationApprovedEventConsumer(EnrollmentDbContext context, ILogger<ApplicationApprovedEventConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ApplicationApprovedEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("Received ApplicationApprovedEvent for Application {ApplicationId}", message.ApplicationId);

        // Check if an enrollment already exists
        var existing = _context.Enrollments.FirstOrDefault(e => e.ApplicationId == message.ApplicationId);
        if (existing == null)
        {
            var enrollment = new Enrollment
            {
                ApplicationId = message.ApplicationId,
                InstitutionId = message.InstitutionId,
                StudentName = message.ApplicantName,
                Grade = message.Grade,
                Status = "Offered" // Initial status when approved but not yet accepted/paid by student
            };

            _context.Enrollments.Add(enrollment);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Automatically created Offered Enrollment for Application {ApplicationId}", message.ApplicationId);
        }
    }
}
