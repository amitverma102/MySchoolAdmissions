using System.Web;
using MySchoolAdmissions.CommunicationService.DTOs;
using MySchoolAdmissions.CommunicationService.Models;
using MySchoolAdmissions.CommunicationService.Services;
using Microsoft.AspNetCore.Mvc;

using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace MySchoolAdmissions.CommunicationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommunicationsController : ControllerBase
{
    private readonly ICommunicationStore _store;
    private readonly ILogger<CommunicationsController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public CommunicationsController(
        ICommunicationStore store,
        ILogger<CommunicationsController> logger,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _store = store;
        _logger = logger;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet("templates")]
    public IActionResult GetTemplates()
    {
        var templates = new List<CommunicationTemplateDto>
        {
            new()
            {
                Id = "tpl-welcome",
                Name = "Welcome & Information Brochure",
                Channel = "WhatsApp",
                Subject = "Welcome to MySchoolAdmissions Admissions",
                Content = "Hello {StudentName}, thank you for your interest in our programs! 🎓 We have reserved your provisional inquiry. Would you like us to share our digital brochure and fee structure?",
                Description = "Introductory message sent immediately upon receiving a new lead inquiry."
            },
            new()
            {
                Id = "tpl-tour",
                Name = "Campus Visit & Open Day Invitation",
                Channel = "WhatsApp",
                Subject = "Invitation: Explore Our Campus This Week",
                Content = "Hi {StudentName}! 🏫 We are hosting an exclusive Campus Walkthrough & Faculty Interaction session this Saturday. Would 11:00 AM or 2:30 PM work better for you and your parents?",
                Description = "High-conversion invite for qualified candidates."
            },
            new()
            {
                Id = "tpl-scholarship",
                Name = "Merit Scholarship Assessment Details",
                Channel = "Email",
                Subject = "Merit Scholarship Criteria & Assessment Guide",
                Content = "Dear {StudentName},\n\nBased on your academic profile, you qualify to apply for up to a 40% Merit Scholarship. Please review the attached curriculum overview and confirm your preferred slot for the assessment.\n\nBest regards,\nAdmissions Office",
                Description = "Formal email detailing scholarship opportunities."
            },
            new()
            {
                Id = "tpl-fee-reminder",
                Name = "Seat Confirmation & Token Fee Link",
                Channel = "WhatsApp",
                Subject = "Admission Offer: Confirm Your Seat",
                Content = "Congratulations {StudentName}! 🎉 Your application has been reviewed and provisional admission is approved. To lock your seat in this batch, please complete the token fee verification using the portal link: https://portal.myschooladmissions.edu/pay?ref={ReferenceId}",
                Description = "Urgent reminder to lock in admission seat."
            }
        };

        return Ok(templates);
    }

    [HttpGet("history/{referenceId}")]
    public IActionResult GetHistory(Guid referenceId)
    {
        var logs = _store.GetByReferenceId(referenceId);
        return Ok(logs);
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] SendCommunicationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Recipient))
        {
            return BadRequest(new { message = "Recipient (Phone/Email) is required." });
        }

        var status = "Logged";
        string? providerMessageId = null;
        string? sendError = null;
        if (dto.Channel.Equals("WhatsApp", StringComparison.OrdinalIgnoreCase))
        {
            var phone = NormalizeWhatsAppPhone(dto.Recipient);
            if (phone.Length is < 10 or > 15)
            {
                return BadRequest(new { message = "Enter a valid WhatsApp number with its country code." });
            }

            var sendResult = await SendWhatsAppCloudMessageAsync(phone, dto.Content);
            status = sendResult.Success ? "Submitted" : "Failed";
            providerMessageId = sendResult.MessageId;
            sendError = sendResult.Error;
        }

        var log = new CommunicationLog
        {
            ReferenceId = dto.ReferenceId,
            StudentName = dto.StudentName,
            Recipient = dto.Recipient,
            Channel = dto.Channel,
            TemplateName = dto.TemplateName,
            Subject = dto.Subject,
            Content = dto.Content,
            Status = status,
            ProviderMessageId = providerMessageId,
            WhatsAppDeepLink = string.Empty,
            SentAt = DateTime.UtcNow,
            HandledBy = dto.HandledBy
        };

        _store.Add(log);

        _logger.LogInformation("[CommunicationService] {Channel} message status {Status} for {Recipient} ({StudentName}); provider message ID: {ProviderMessageId}",
            dto.Channel, status, dto.Recipient, dto.StudentName, providerMessageId);

        if (status == "Failed")
        {
            _logger.LogWarning("WhatsApp send failed for {Recipient}: {Error}", dto.Recipient, sendError);
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                success = false,
                logId = log.Id,
                status,
                message = "WhatsApp could not accept the message.",
                details = sendError
            });
        }

        return Ok(new SendCommunicationResultDto
        {
            Success = true,
            LogId = log.Id,
            Status = status,
            Channel = dto.Channel,
            Message = status == "Submitted"
                ? "WhatsApp accepted the message. Final delivery confirmation is not currently tracked."
                : $"{dto.Channel} message logged."
        });
    }

    [HttpPost("whatsapp/brochure")]
    public async Task<IActionResult> SendAdmissionBrochure([FromBody] SendWhatsAppBrochureDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Phone))
        {
            return BadRequest(new { message = "Phone number is required." });
        }

        var digitsOnly = new string(dto.Phone.Where(char.IsDigit).ToArray());
        if (digitsOnly.Length == 10)
        {
            digitsOnly = "91" + digitsOnly;
        }

        if (digitsOnly.Length is < 10 or > 15)
        {
            return BadRequest(new { message = "Enter a valid WhatsApp number with its country code." });
        }

        var messageText = $"Hello {dto.StudentName}! 🎓 Greetings from *{dto.SchoolName}*.\n\n" +
                          $"We have received your admission inquiry for *{dto.TargetGrade}* (Academic Session 2026–2027).\n\n" +
                          $"📥 *Download Official Admissions Prospectus & Fee Structure:*\n{dto.BrochureUrl}\n\n" +
                          $"Our admissions office is currently scheduling on-campus counseling & assessment slots.\n" +
                          $"Please reply to this message or call our admissions helpline to reserve your preferred date.\n\n" +
                          $"Warm regards,\n*{dto.CounselorName}*\n{dto.SchoolName} Admissions Team";

        var sendResult = await SendWhatsAppCloudMessageAsync(digitsOnly, messageText);

        var log = new CommunicationLog
        {
            ReferenceId = dto.ReferenceId,
            StudentName = dto.StudentName,
            Recipient = dto.Phone,
            Channel = "WhatsApp",
            TemplateName = "Admission Brochure & Fee Structure 2026-27",
            Subject = $"Admissions Prospectus - {dto.SchoolName}",
            Content = messageText,
            Status = sendResult.Success ? "Submitted" : "Failed",
            ProviderMessageId = sendResult.MessageId,
            WhatsAppDeepLink = string.Empty,
            SentAt = DateTime.UtcNow,
            HandledBy = dto.CounselorName
        };

        _store.Add(log);

        if (!sendResult.Success)
        {
            _logger.LogWarning("WhatsApp brochure send failed for {Phone}: {Error}", dto.Phone, sendResult.Error);
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                success = false,
                logId = log.Id,
                status = "Failed",
                message = "WhatsApp could not accept the brochure message.",
                details = sendResult.Error
            });
        }

        _logger.LogInformation("[WhatsApp Cloud API] Brochure message accepted for {Phone} ({StudentName}); provider message ID: {ProviderMessageId}",
            dto.Phone, dto.StudentName, sendResult.MessageId);

        return Ok(new
        {
            success = true,
            status = "Submitted",
            channel = "WhatsApp",
            phone = dto.Phone,
            studentName = dto.StudentName,
            brochureUrl = dto.BrochureUrl,
            providerMessageId = sendResult.MessageId,
            timestamp = DateTime.UtcNow,
            message = "WhatsApp accepted the brochure message. Final delivery confirmation is not currently tracked."
        });
    }

    private async Task<(bool Success, string? MessageId, string? Error)> SendWhatsAppCloudMessageAsync(string phone, string message)
    {
        var accessToken = _configuration["Meta:WhatsApp:AccessToken"];
        var phoneNumberId = _configuration["Meta:WhatsApp:PhoneNumberId"];
        if (string.IsNullOrWhiteSpace(accessToken) || string.IsNullOrWhiteSpace(phoneNumberId))
        {
            return (false, null, "WhatsApp Cloud API credentials are not configured.");
        }

        if (string.IsNullOrWhiteSpace(message))
        {
            return (false, null, "Message content is required.");
        }

        var apiVersion = _configuration["Meta:WhatsApp:ApiVersion"] ?? "v23.0";
        if (!apiVersion.StartsWith('v')) apiVersion = $"v{apiVersion}";
        var endpoint = $"https://graph.facebook.com/{apiVersion}/{Uri.EscapeDataString(phoneNumberId)}/messages";
        var payload = new
        {
            messaging_product = "whatsapp",
            recipient_type = "individual",
            to = phone,
            type = "text",
            text = new { preview_url = true, body = message }
        };

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            using var response = await _httpClientFactory.CreateClient().SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                return (false, null, ExtractProviderError(responseBody) ?? $"WhatsApp returned HTTP {(int)response.StatusCode}.");
            }

            using var json = JsonDocument.Parse(responseBody);
            var messageId = json.RootElement.TryGetProperty("messages", out var messages) && messages.GetArrayLength() > 0
                ? messages[0].GetProperty("id").GetString()
                : null;
            return (true, messageId, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "WhatsApp Cloud API request failed for {Phone}", phone);
            return (false, null, "Could not reach the WhatsApp Cloud API.");
        }
    }

    private static string NormalizeWhatsAppPhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.Length == 10) return $"91{digits}";
        if (digits.Length == 11 && digits[0] == '0') return $"91{digits[1..]}";
        return digits;
    }

    private static string? ExtractProviderError(string responseBody)
    {
        try
        {
            using var json = JsonDocument.Parse(responseBody);
            if (json.RootElement.TryGetProperty("error", out var error) &&
                error.TryGetProperty("message", out var message))
            {
                return message.GetString();
            }
        }
        catch (JsonException)
        {
            // Return a safe generic failure for non-JSON provider responses.
        }

        return null;
    }

    [HttpPost("telephony/call-log")]
    public IActionResult LogCallInteraction([FromBody] LogCallDto dto)
    {
        var log = new CommunicationLog
        {
            ReferenceId = dto.ReferenceId,
            StudentName = dto.StudentName,
            Recipient = dto.PhoneNumber,
            Channel = "Telephony / VoIP",
            TemplateName = "Counselor Outbound Call",
            Subject = $"Call: {dto.Outcome} ({dto.DurationSeconds}s)",
            Content = $"Counselor call ({dto.DurationSeconds}s). Notes: {dto.Notes}",
            Status = dto.Outcome,
            SentAt = DateTime.UtcNow,
            HandledBy = dto.CounselorName
        };

        _store.Add(log);

        _logger.LogInformation("[Telephony] Call logged for {StudentName} to {Phone}. Outcome: {Outcome}",
            dto.StudentName, dto.PhoneNumber, dto.Outcome);

        return Ok(new
        {
            success = true,
            logId = log.Id,
            status = dto.Outcome,
            message = "Call interaction logged successfully."
        });
    }
}
