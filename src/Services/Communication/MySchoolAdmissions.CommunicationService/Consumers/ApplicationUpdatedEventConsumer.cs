using MySchoolAdmissions.EventBus.Events;
using MassTransit;

namespace MySchoolAdmissions.CommunicationService.Consumers;

public class ApplicationUpdatedEventConsumer : IConsumer<ApplicationUpdatedEvent>
{
    private readonly ILogger<ApplicationUpdatedEventConsumer> _logger;

    public ApplicationUpdatedEventConsumer(ILogger<ApplicationUpdatedEventConsumer> logger)
    {
        _logger = logger;
    }

    public Task Consume(ConsumeContext<ApplicationUpdatedEvent> context)
    {
        var msg = context.Message;
        
        _logger.LogInformation("--- NOTIFICATION START ---");
        _logger.LogInformation("Type: Application Status Update");
        _logger.LogInformation("To: {Name} (Email: {Email}, Phone: {Phone})", msg.ApplicantName, msg.Email, msg.Phone);
        _logger.LogInformation("Message: Your application (ID: {AppId}) status has been updated to: {NewStatus}", msg.ApplicationId, msg.NewStatus);
        _logger.LogInformation("Channels simulated: Email, SMS, WhatsApp");
        _logger.LogInformation("--- NOTIFICATION END ---");

        return Task.CompletedTask;
    }
}
