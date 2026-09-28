using MySchoolAdmissions.EventBus.Events;
using MassTransit;

namespace MySchoolAdmissions.CommunicationService.Consumers;

public class AssessmentScheduledEventConsumer : IConsumer<AssessmentScheduledEvent>
{
    private readonly ILogger<AssessmentScheduledEventConsumer> _logger;

    public AssessmentScheduledEventConsumer(ILogger<AssessmentScheduledEventConsumer> logger)
    {
        _logger = logger;
    }

    public Task Consume(ConsumeContext<AssessmentScheduledEvent> context)
    {
        var msg = context.Message;
        
        _logger.LogInformation("--- NOTIFICATION START ---");
        _logger.LogInformation("Type: Assessment Scheduled");
        _logger.LogInformation("To: {Name} (Email: {Email}, Phone: {Phone})", msg.ApplicantName, msg.Email, msg.Phone);
        _logger.LogInformation("Message: An assessment of type '{Type}' has been scheduled for {Date} for your application (ID: {AppId})", msg.AssessmentType, msg.ScheduledDate, msg.ApplicationId);
        _logger.LogInformation("Channels simulated: Email, SMS, WhatsApp");
        _logger.LogInformation("--- NOTIFICATION END ---");

        return Task.CompletedTask;
    }
}
