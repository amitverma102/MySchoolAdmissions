using System.Text.Json.Serialization;

namespace MySchoolAdmissions.CommunicationService.DTOs;

#region Standard Meta WhatsApp Cloud API Webhook Models

public class WhatsAppWebhookPayload
{
    [JsonPropertyName("object")]
    public string Object { get; set; } = string.Empty;

    [JsonPropertyName("entry")]
    public List<WhatsAppWebhookEntry> Entry { get; set; } = new();
}

public class WhatsAppWebhookEntry
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("changes")]
    public List<WhatsAppWebhookChange> Changes { get; set; } = new();
}

public class WhatsAppWebhookChange
{
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public WhatsAppWebhookValue? Value { get; set; }
}

public class WhatsAppWebhookValue
{
    [JsonPropertyName("messaging_product")]
    public string MessagingProduct { get; set; } = "whatsapp";

    [JsonPropertyName("metadata")]
    public WhatsAppMetadata? Metadata { get; set; }

    [JsonPropertyName("contacts")]
    public List<WhatsAppContact>? Contacts { get; set; }

    [JsonPropertyName("messages")]
    public List<WhatsAppInboundMessage>? Messages { get; set; }
}

public class WhatsAppMetadata
{
    [JsonPropertyName("display_phone_number")]
    public string? DisplayPhoneNumber { get; set; }

    [JsonPropertyName("phone_number_id")]
    public string? PhoneNumberId { get; set; }
}

public class WhatsAppContact
{
    [JsonPropertyName("profile")]
    public WhatsAppProfile? Profile { get; set; }

    [JsonPropertyName("wa_id")]
    public string WaId { get; set; } = string.Empty;
}

public class WhatsAppProfile
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public class WhatsAppInboundMessage
{
    [JsonPropertyName("from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "text";

    [JsonPropertyName("text")]
    public WhatsAppTextContent? Text { get; set; }
}

public class WhatsAppTextContent
{
    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;
}

#endregion

#region Simulation & Local Testing DTOs

public class SimulateWhatsAppMessageDto
{
    public string Phone { get; set; } = string.Empty;
    public string? SenderName { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? SchoolName { get; set; }
    public string? TargetGrade { get; set; }
}

public class WhatsAppCitationDto
{
    public string DocumentTitle { get; set; } = string.Empty;
    public string InstitutionName { get; set; } = string.Empty;
    public string Snippet { get; set; } = string.Empty;
}

public class WhatsAppBotReplyResultDto
{
    public bool Success { get; set; } = true;
    public string ParentPhone { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string InboundMessage { get; set; } = string.Empty;
    public string BotReply { get; set; } = string.Empty;
    public List<WhatsAppCitationDto> Citations { get; set; } = new();
    public Guid? LeadId { get; set; }
    public Guid InboundLogId { get; set; }
    public Guid OutboundLogId { get; set; }
    public string? ActionUrl { get; set; }
    public bool DispatchedToMeta { get; set; }
    public string Status { get; set; } = "Answered";
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class WhatsAppConversationItemDto
{
    public Guid Id { get; set; }
    public string Direction { get; set; } = "Inbound"; // "Inbound" or "Outbound"
    public string Sender { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Status { get; set; } = string.Empty;
}

#endregion
