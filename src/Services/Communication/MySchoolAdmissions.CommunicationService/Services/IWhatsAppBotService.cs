using MySchoolAdmissions.CommunicationService.DTOs;

namespace MySchoolAdmissions.CommunicationService.Services;

public interface IWhatsAppBotService
{
    Task<WhatsAppBotReplyResultDto> ProcessInboundMessageAsync(
        string phone,
        string? senderName,
        string messageText,
        string? schoolHint = null,
        string? gradeHint = null);

    Task<List<WhatsAppConversationItemDto>> GetConversationThreadAsync(string phone);
}
