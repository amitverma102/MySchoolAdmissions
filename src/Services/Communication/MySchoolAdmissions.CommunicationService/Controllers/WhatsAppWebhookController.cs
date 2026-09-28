using MySchoolAdmissions.CommunicationService.DTOs;
using MySchoolAdmissions.CommunicationService.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace MySchoolAdmissions.CommunicationService.Controllers;

[ApiController]
[Route("api/communications/webhook/whatsapp")]
public class WhatsAppWebhookController : ControllerBase
{
    private readonly IWhatsAppBotService _botService;
    private readonly IConfiguration _config;
    private readonly ILogger<WhatsAppWebhookController> _logger;

    public WhatsAppWebhookController(
        IWhatsAppBotService botService,
        IConfiguration config,
        ILogger<WhatsAppWebhookController> logger)
    {
        _botService = botService;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Meta WhatsApp Cloud API Webhook Subscription Verification (Handshake)
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public IActionResult VerifyWebhook(
        [FromQuery(Name = "hub.mode")] string? mode,
        [FromQuery(Name = "hub.verify_token")] string? token,
        [FromQuery(Name = "hub.challenge")] string? challenge)
    {
        var configuredToken = _config["Meta:WhatsApp:VerifyToken"] ?? "myschooladmissions_whatsapp_secret_2026";

        if (mode == "subscribe" && token == configuredToken)
        {
            _logger.LogInformation("[WhatsApp Webhook] Subscription verified successfully with Meta.");
            return Content(challenge ?? string.Empty, "text/plain");
        }

        _logger.LogWarning("[WhatsApp Webhook] Verification token mismatch. Expected: {Expected}, Received: {Received}",
            configuredToken, token);
        return Forbid();
    }

    /// <summary>
    /// Meta WhatsApp Cloud API Inbound Message Webhook Receiver
    /// </summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> HandleIncomingWebhook([FromBody] WhatsAppWebhookPayload payload)
    {
        try
        {
            if (payload?.Entry == null || payload.Entry.Count == 0)
            {
                return Ok(new { status = "EVENT_RECEIVED", note = "Empty payload ignored" });
            }

            foreach (var entry in payload.Entry)
            {
                if (entry.Changes == null) continue;

                foreach (var change in entry.Changes)
                {
                    var val = change.Value;
                    if (val?.Messages == null || val.Messages.Count == 0) continue;

                    var senderName = val.Contacts?.FirstOrDefault()?.Profile?.Name ?? "Parent";

                    foreach (var msg in val.Messages)
                    {
                        if (msg.Type == "text" && msg.Text != null && !string.IsNullOrWhiteSpace(msg.Text.Body))
                        {
                            var phone = msg.From;
                            var query = msg.Text.Body;

                            _logger.LogInformation("[WhatsApp Webhook] Inbound text from {Phone}: {Text}", phone, query);

                            // Process query asynchronously via RAG
                            await _botService.ProcessInboundMessageAsync(phone, senderName, query);
                        }
                    }
                }
            }

            return Ok(new { status = "EVENT_RECEIVED" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[WhatsApp Webhook] Exception processing incoming message");
            return StatusCode(500, new { error = "Internal server error processing WhatsApp webhook" });
        }
    }

    /// <summary>
    /// Test & Simulation Endpoint for testing WhatsApp AI responses without a live Meta webhook
    /// </summary>
    [HttpPost("simulate")]
    public async Task<IActionResult> SimulateInboundMessage([FromBody] SimulateWhatsAppMessageDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Phone))
        {
            return BadRequest(new { message = "Parent phone number is required." });
        }

        if (string.IsNullOrWhiteSpace(dto.Message))
        {
            return BadRequest(new { message = "Message content is required." });
        }

        var result = await _botService.ProcessInboundMessageAsync(
            dto.Phone,
            dto.SenderName,
            dto.Message,
            dto.SchoolName,
            dto.TargetGrade);

        return Ok(result);
    }

    /// <summary>
    /// Retrieve full chronological WhatsApp conversation thread for a parent's phone number
    /// </summary>
    [HttpGet("thread/{phone}")]
    public async Task<IActionResult> GetThread(string phone)
    {
        var thread = await _botService.GetConversationThreadAsync(phone);
        return Ok(thread);
    }
}
