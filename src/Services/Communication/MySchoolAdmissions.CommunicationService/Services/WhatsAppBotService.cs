using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using MySchoolAdmissions.CommunicationService.DTOs;
using MySchoolAdmissions.CommunicationService.Models;

namespace MySchoolAdmissions.CommunicationService.Services;

public class WhatsAppBotService : IWhatsAppBotService
{
    private readonly ICommunicationStore _store;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<WhatsAppBotService> _logger;

    public WhatsAppBotService(
        ICommunicationStore store,
        HttpClient httpClient,
        IConfiguration config,
        ILogger<WhatsAppBotService> logger)
    {
        _store = store;
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public async Task<WhatsAppBotReplyResultDto> ProcessInboundMessageAsync(
        string phone,
        string? senderName,
        string messageText,
        string? schoolHint = null,
        string? gradeHint = null)
    {
        var cleanPhone = CleanPhoneNumber(phone);
        var displayName = string.IsNullOrWhiteSpace(senderName) ? "Parent" : senderName.Trim();
        var userQuery = messageText?.Trim() ?? string.Empty;

        _logger.LogInformation("[WhatsAppBot] Processing inbound message from {Phone} ({Name}): {Message}",
            cleanPhone, displayName, userQuery);

        // 1. Resolve or Create Lead in LeadService
        Guid? leadId = await ResolveOrCreateLeadAsync(cleanPhone, displayName, userQuery, gradeHint);

        // 2. Log Inbound Message to CommunicationStore
        var inboundLog = new CommunicationLog
        {
            ReferenceId = leadId ?? Guid.NewGuid(),
            StudentName = displayName,
            Recipient = cleanPhone,
            Channel = "WhatsApp",
            TemplateName = "Inbound Parent Query",
            Subject = "Inbound WhatsApp Question",
            Content = userQuery,
            Status = "Received",
            SentAt = DateTime.UtcNow,
            HandledBy = "EduBot WhatsApp Receiver"
        };
        _store.Add(inboundLog);

        // 3. Query MySchoolAdmissions AI RAG Service
        var (botRawReply, citations, actionUrl) = await QueryAIServiceAsync(userQuery, schoolHint, gradeHint);

        // 4. Format Reply for WhatsApp
        var formattedReply = FormatForWhatsApp(botRawReply, actionUrl);

        // 5. Log Outbound Response to CommunicationStore
        var outboundDeepLink = $"https://wa.me/{cleanPhone}?text={Uri.EscapeDataString(formattedReply)}";
        var outboundLog = new CommunicationLog
        {
            ReferenceId = leadId ?? inboundLog.ReferenceId,
            StudentName = displayName,
            Recipient = cleanPhone,
            Channel = "WhatsApp",
            TemplateName = "EduBot AI RAG Response",
            Subject = "Admissions AI Reply",
            Content = formattedReply,
            Status = "Delivered",
            WhatsAppDeepLink = outboundDeepLink,
            SentAt = DateTime.UtcNow,
            HandledBy = "EduBot AI"
        };
        _store.Add(outboundLog);

        // 6. Record interaction in LeadService Timeline
        if (leadId.HasValue)
        {
            await RecordLeadInteractionAsync(leadId.Value, userQuery, botRawReply);
        }

        // 7. Dispatch to Meta WhatsApp Cloud API (or simulate if no credentials)
        bool dispatchedToMeta = await DispatchToMetaCloudApiAsync(cleanPhone, formattedReply);

        return new WhatsAppBotReplyResultDto
        {
            Success = true,
            ParentPhone = cleanPhone,
            SenderName = displayName,
            InboundMessage = userQuery,
            BotReply = formattedReply,
            Citations = citations,
            LeadId = leadId,
            InboundLogId = inboundLog.Id,
            OutboundLogId = outboundLog.Id,
            ActionUrl = actionUrl,
            DispatchedToMeta = dispatchedToMeta,
            Status = "Answered",
            Timestamp = DateTime.UtcNow
        };
    }

    public Task<List<WhatsAppConversationItemDto>> GetConversationThreadAsync(string phone)
    {
        var cleanPhone = CleanPhoneNumber(phone);
        var allLogs = _store.GetAll();

        var thread = allLogs
            .Where(l => l.Channel.Equals("WhatsApp", StringComparison.OrdinalIgnoreCase) &&
                        CleanPhoneNumber(l.Recipient).EndsWith(cleanPhone.Length >= 10 ? cleanPhone[^10..] : cleanPhone))
            .OrderBy(l => l.SentAt)
            .Select(l => new WhatsAppConversationItemDto
            {
                Id = l.Id,
                Direction = l.TemplateName.Contains("Inbound", StringComparison.OrdinalIgnoreCase) ? "Inbound" : "Outbound",
                Sender = l.HandledBy,
                Message = l.Content,
                Timestamp = l.SentAt,
                Status = l.Status
            })
            .ToList();

        return Task.FromResult(thread);
    }

    #region Helper Methods

    private async Task<Guid?> ResolveOrCreateLeadAsync(string phone, string name, string message, string? grade)
    {
        try
        {
            var leadServiceUrl = _config["Services:LeadServiceUrl"] ?? "http://lead-service:8080";
            var url = $"{leadServiceUrl.TrimEnd('/')}/api/leads/webhook/whatsapp-bot";

            var payload = new
            {
                firstName = name,
                lastName = "(WhatsApp)",
                email = $"{phone}@whatsapp.myschooladmissions.internal",
                phone = phone,
                gradeInterested = grade ?? "General",
                utmCampaign = "WhatsApp-AI-Bot",
                notes = $"WhatsApp Inquiry: {message}"
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);

            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("leadId", out var leadIdElem))
                {
                    return leadIdElem.GetGuid();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[WhatsAppBot] Could not resolve lead from LeadService for {Phone}", phone);
        }

        return null;
    }

    private async Task<(string Reply, List<WhatsAppCitationDto> Citations, string? ActionUrl)> QueryAIServiceAsync(
        string message,
        string? schoolHint,
        string? gradeHint)
    {
        var citations = new List<WhatsAppCitationDto>();
        try
        {
            var aiServiceUrl = _config["Services:AiServiceUrl"] ?? "http://ai-service:8080";
            var url = $"{aiServiceUrl.TrimEnd('/')}/api/insights/chat";

            var payload = new
            {
                message = message,
                schoolName = schoolHint,
                targetGrade = gradeHint,
                history = new object[] { }
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);

            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                var reply = root.TryGetProperty("reply", out var r) ? r.GetString() ?? "" : "";
                var actionUrl = root.TryGetProperty("actionUrl", out var a) ? a.GetString() : null;

                if (root.TryGetProperty("citations", out var citElem) && citElem.ValueKind == JsonValueKind.Array)
                {
                    foreach (var c in citElem.EnumerateArray())
                    {
                        citations.Add(new WhatsAppCitationDto
                        {
                            DocumentTitle = c.TryGetProperty("documentTitle", out var dt) ? dt.GetString() ?? "" : "",
                            InstitutionName = c.TryGetProperty("institutionName", out var iname) ? iname.GetString() ?? "" : "",
                            Snippet = c.TryGetProperty("snippet", out var sn) ? sn.GetString() ?? "" : ""
                        });
                    }
                }

                if (!string.IsNullOrWhiteSpace(reply))
                {
                    return (reply, citations, actionUrl);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[WhatsAppBot] Could not reach AI service, applying fallback rules");
        }

        // Polite fallback if AI service is temporarily unreachable
        var fallback = "Hello! 🎓 Thank you for reaching out to MySchoolAdmissions Admissions.\n\n" +
                       "Our admissions office provides comprehensive counseling for Nursery through Grade 12. " +
                       "Applications for Academic Session 2026–2027 are currently open with early-bird merit scholarships.\n\n" +
                       "Would you like our counselor to call you or share our official digital prospectus?";
        return (fallback, citations, "https://portal.myschooladmissions.edu/apply");
    }

    private async Task RecordLeadInteractionAsync(Guid leadId, string question, string botReply)
    {
        try
        {
            var leadServiceUrl = _config["Services:LeadServiceUrl"] ?? "http://lead-service:8080";
            var url = $"{leadServiceUrl.TrimEnd('/')}/api/leads/{leadId}/interactions";

            var snippet = botReply.Length > 250 ? botReply[..250] + "..." : botReply;
            var payload = new
            {
                interactionType = "WhatsApp",
                disposition = "AI Chat Answered",
                notes = $"Parent WhatsApp: \"{question}\"\nEduBot: \"{snippet}\"",
                handledByUserId = (Guid?)null
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            await _httpClient.PostAsync(url, content);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[WhatsAppBot] Could not record interaction in LeadService for {LeadId}", leadId);
        }
    }

    private async Task<bool> DispatchToMetaCloudApiAsync(string phone, string message)
    {
        var accessToken = _config["Meta:WhatsApp:AccessToken"];
        var phoneNumberId = _config["Meta:WhatsApp:PhoneNumberId"];

        if (string.IsNullOrWhiteSpace(accessToken) || string.IsNullOrWhiteSpace(phoneNumberId))
        {
            _logger.LogInformation("[Meta WhatsApp Cloud API - Simulated Mode] Token not set. Outbound message to {Phone} registered locally.", phone);
            return false;
        }

        try
        {
            var apiVersion = _config["Meta:WhatsApp:ApiVersion"] ?? "v23.0";
            if (!apiVersion.StartsWith('v')) apiVersion = $"v{apiVersion}";
            var url = $"https://graph.facebook.com/{apiVersion}/{phoneNumberId}/messages";
            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var body = new
            {
                messaging_product = "whatsapp",
                recipient_type = "individual",
                to = phone,
                type = "text",
                text = new { preview_url = true, body = message }
            };

            request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            var response = await _httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[Meta WhatsApp Cloud API] Dispatched live WhatsApp message to {Phone}", phone);
                return true;
            }
            else
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[Meta WhatsApp Cloud API] Error dispatching to {Phone}: {Error}", phone, err);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Meta WhatsApp Cloud API] Exception sending message to {Phone}", phone);
        }

        return false;
    }

    private static string FormatForWhatsApp(string reply, string? actionUrl)
    {
        if (string.IsNullOrWhiteSpace(reply)) return string.Empty;

        // Convert standard Markdown **bold** to WhatsApp *bold*
        var formatted = Regex.Replace(reply, @"\*\*(.*?)\*\*", "*$1*");

        // Convert Markdown headers # and ## to bold titles
        formatted = Regex.Replace(formatted, @"^#{1,3}\s*(.*)$", "*$1*", RegexOptions.Multiline);

        // Normalize bullet points to WhatsApp-friendly emoji bullets
        formatted = Regex.Replace(formatted, @"^[-*]\s+", "• ", RegexOptions.Multiline);

        // Append action link if present
        if (!string.IsNullOrWhiteSpace(actionUrl) && !formatted.Contains(actionUrl))
        {
            formatted += $"\n\n🔗 *Official Portal / Prospectus:* {actionUrl}";
        }

        // Append friendly signature
        if (!formatted.Contains("EduBot"))
        {
            formatted += "\n\n_— EduBot (Admissions AI Assistant)_";
        }

        return formatted.Trim();
    }

    private static string CleanPhoneNumber(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        var digitsOnly = new string(phone.Where(char.IsDigit).ToArray());
        if (digitsOnly.Length == 10)
        {
            digitsOnly = "91" + digitsOnly;
        }
        return digitsOnly;
    }

    #endregion
}
