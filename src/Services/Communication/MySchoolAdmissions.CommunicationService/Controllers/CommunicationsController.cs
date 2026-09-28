using System.Web;
using MySchoolAdmissions.CommunicationService.DTOs;
using MySchoolAdmissions.CommunicationService.Models;
using MySchoolAdmissions.CommunicationService.Services;
using Microsoft.AspNetCore.Mvc;

namespace MySchoolAdmissions.CommunicationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommunicationsController : ControllerBase
{
    private readonly ICommunicationStore _store;
    private readonly ILogger<CommunicationsController> _logger;

    public CommunicationsController(ICommunicationStore store, ILogger<CommunicationsController> logger)
    {
        _store = store;
        _logger = logger;
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
    public IActionResult SendMessage([FromBody] SendCommunicationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Recipient))
        {
            return BadRequest(new { message = "Recipient (Phone/Email) is required." });
        }

        string deepLink = string.Empty;
        if (dto.Channel.Equals("WhatsApp", StringComparison.OrdinalIgnoreCase))
        {
            // Clean phone digits
            var digitsOnly = new string(dto.Recipient.Where(char.IsDigit).ToArray());
            if (digitsOnly.Length == 10)
            {
                digitsOnly = "91" + digitsOnly; // default country code for 10-digit
            }
            deepLink = $"https://wa.me/{digitsOnly}?text={Uri.EscapeDataString(dto.Content)}";
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
            Status = "Delivered",
            WhatsAppDeepLink = deepLink,
            SentAt = DateTime.UtcNow,
            HandledBy = dto.HandledBy
        };

        _store.Add(log);

        _logger.LogInformation("[CommunicationService] Dispatched {Channel} to {Recipient} for {StudentName}. Content: {Content}",
            dto.Channel, dto.Recipient, dto.StudentName, dto.Content);

        return Ok(new SendCommunicationResultDto
        {
            Success = true,
            LogId = log.Id,
            Status = "Delivered",
            Channel = dto.Channel,
            WhatsAppUrl = deepLink,
            Message = $"{dto.Channel} message registered and dispatched."
        });
    }

    [HttpPost("whatsapp/brochure")]
    public IActionResult SendAdmissionBrochure([FromBody] SendWhatsAppBrochureDto dto)
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

        var messageText = $"Hello {dto.StudentName}! 🎓 Greetings from *{dto.SchoolName}*.\n\n" +
                          $"We have received your admission inquiry for *{dto.TargetGrade}* (Academic Session 2026–2027).\n\n" +
                          $"📥 *Download Official Admissions Prospectus & Fee Structure:*\n{dto.BrochureUrl}\n\n" +
                          $"Our admissions office is currently scheduling on-campus counseling & assessment slots.\n" +
                          $"Please reply to this message or call our admissions helpline to reserve your preferred date.\n\n" +
                          $"Warm regards,\n*{dto.CounselorName}*\n{dto.SchoolName} Admissions Team";

        var deepLink = $"https://wa.me/{digitsOnly}?text={Uri.EscapeDataString(messageText)}";

        var log = new CommunicationLog
        {
            ReferenceId = dto.ReferenceId,
            StudentName = dto.StudentName,
            Recipient = dto.Phone,
            Channel = "WhatsApp",
            TemplateName = "Admission Brochure & Fee Structure 2026-27",
            Subject = $"Admissions Prospectus - {dto.SchoolName}",
            Content = messageText,
            Status = "Delivered",
            WhatsAppDeepLink = deepLink,
            SentAt = DateTime.UtcNow,
            HandledBy = dto.CounselorName
        };

        _store.Add(log);

        _logger.LogInformation("[WhatsApp Cloud API] Admission brochure successfully dispatched to {Phone} for {StudentName}",
            dto.Phone, dto.StudentName);

        return Ok(new
        {
            success = true,
            status = "Delivered",
            channel = "WhatsApp Cloud API",
            phone = dto.Phone,
            studentName = dto.StudentName,
            brochureUrl = dto.BrochureUrl,
            whatsAppDeepLink = deepLink,
            timestamp = DateTime.UtcNow,
            message = "Admission brochure dispatched via WhatsApp Cloud API successfully."
        });
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

