using System.Net.Http.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace MySchoolAdmissions.LeadService.Services;

public class WhatsAppService : IWhatsAppService
{
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WhatsAppService> _logger;

    public WhatsAppService(
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<WhatsAppService> logger)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<bool> SendWhatsAppAsync(
        string toPhone,
        string message,
        string? recipientName = null,
        Guid? referenceId = null)
    {
        if (string.IsNullOrWhiteSpace(toPhone) || string.IsNullOrWhiteSpace(message))
        {
            _logger.LogWarning("[WhatsAppService] Cannot dispatch WhatsApp message: Phone or message is empty.");
            return false;
        }

        var cleanPhone = CleanPhoneNumber(toPhone);
        var client = _httpClientFactory.CreateClient();

        bool sentSuccessfully = false;

        // CommunicationService owns Cloud API dispatch and timeline logging.
        try
        {
            var commBase = _configuration["Services:CommunicationService"] ?? "http://communication-service";
            var commUrl = $"{commBase.TrimEnd('/')}/api/communications/send";
            var payload = new
            {
                referenceId = referenceId ?? Guid.NewGuid(),
                studentName = recipientName ?? "Parent",
                recipient = cleanPhone,
                channel = "WhatsApp",
                templateName = "Campus Tour Communication",
                subject = "Campus Tour WhatsApp Notification",
                content = message,
                handledBy = "Admissions Automated System"
            };

            var serviceToken = CreateServiceToken();
            if (serviceToken == null)
            {
                _logger.LogError("[WhatsAppService] Cannot authenticate to CommunicationService; JwtOptions are incomplete.");
                return false;
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, commUrl);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", serviceToken);
            request.Content = JsonContent.Create(payload);
            using var resp = await client.SendAsync(request);
            if (resp.IsSuccessStatusCode)
            {
                sentSuccessfully = true;
            }
            else
            {
                var error = await resp.Content.ReadAsStringAsync();
                _logger.LogWarning("[WhatsAppService] CommunicationService rejected message for {Phone} with status {StatusCode}: {Error}",
                    cleanPhone, resp.StatusCode, error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[WhatsAppService] CommunicationService forwarding unavailable for {Phone}. Message logged locally.", cleanPhone);
        }

        _logger.LogInformation(
            "[WhatsAppService] WhatsApp dispatch status {Status} -> Recipient: {Recipient} ({Name}) | Preview: {Preview}",
            sentSuccessfully ? "Submitted" : "Failed",
            cleanPhone,
            recipientName ?? "Recipient",
            message.Length > 80 ? message.Substring(0, 80) + "..." : message);

        return sentSuccessfully;
    }

    private string? CreateServiceToken()
    {
        var secret = _configuration["JwtOptions:Secret"];
        var issuer = _configuration["JwtOptions:Issuer"];
        var audience = _configuration["JwtOptions:Audience"];
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience))
        {
            return null;
        }

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: new[]
            {
                new Claim(ClaimTypes.Name, "lead-service"),
                new Claim(ClaimTypes.Role, "InternalService")
            },
            notBefore: DateTime.UtcNow.AddSeconds(-5),
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<bool> SendTourSlotAssignedWhatsAppAsync(TourSlotAssignedWhatsAppModel model)
    {
        if (string.IsNullOrWhiteSpace(model.RepresentativePhone))
        {
            _logger.LogInformation("[WhatsAppService] Representative {Name} has no phone configured. Skipping WhatsApp notification.", model.RepresentativeName);
            return false;
        }

        var dateStr = model.SlotDate.ToString("ddd, MMM dd, yyyy");
        var timeStr = $"{model.StartTime:hh:mm tt} - {model.EndTime:hh:mm tt}";

        var msg =
            $"🏫 *Campus Tour Slot Assignment*\n\n" +
            $"Hello *{model.RepresentativeName}*,\n\n" +
            $"You have been designated as the representative for an upcoming Campus Tour slot at *{model.InstitutionName}* ({model.CampusName}).\n\n" +
            $"📅 *Date:* {dateStr}\n" +
            $"⏰ *Time Window:* {timeStr}\n" +
            $"👥 *Slot Capacity:* {model.Capacity} seats\n" +
            $"📍 *Meeting Point:* Main Campus Reception & Welcome Desk\n\n" +
            $"Parents can now reserve this slot on the public admissions portal. You will receive an instant WhatsApp alert whenever a parent confirms their booking.\n\n" +
            $"_— {model.InstitutionName} Admissions Administration_";

        return await SendWhatsAppAsync(model.RepresentativePhone, msg, model.RepresentativeName);
    }

    public async Task<bool> SendTourBookingConfirmationToParentWhatsAppAsync(TourBookingWhatsAppModel model)
    {
        if (string.IsNullOrWhiteSpace(model.ParentPhone))
        {
            _logger.LogWarning("[WhatsAppService] Parent phone is empty. Cannot dispatch tour confirmation WhatsApp.");
            return false;
        }

        var dateStr = model.TourDate.ToString("ddd, MMM dd, yyyy");
        var helpline = !string.IsNullOrWhiteSpace(model.SchoolContactPhone) ? model.SchoolContactPhone : "+91 98765 43210";
        var campusLocation = !string.IsNullOrWhiteSpace(model.CampusAddress) ? model.CampusAddress : $"{model.CampusName} Main Reception";

        var msg =
            $"🎉 *Campus Tour Confirmed!*\n\n" +
            $"Dear *{model.ParentName}*,\n\n" +
            $"We are thrilled to welcome you and *{model.StudentName}* for a personalized Campus Tour at *{model.InstitutionName}*!\n\n" +
            $"🎫 *Confirmation Code:* *{model.ConfirmationCode}*\n" +
            $"📅 *Date:* {dateStr}\n" +
            $"⏰ *Time Slot:* {model.TimeSlot}\n" +
            $"🎓 *Grade Applying:* {model.GradeInterested}\n" +
            $"👥 *Attendees:* {model.NumberOfAttendees} {(model.NumberOfAttendees == 1 ? "Person" : "Persons")}\n" +
            $"👤 *Designated Tour Host:* *{model.RepresentativeName}*\n" +
            $"📍 *Campus:* {model.CampusName}\n" +
            $"📌 *Location:* {campusLocation}\n\n" +
            $"*Arrival Instructions:*\n" +
            $"• Please arrive 5–10 minutes prior to your scheduled time.\n" +
            $"• Show this confirmation code (*{model.ConfirmationCode}*) at the security gate for priority parking & reception pass.\n" +
            $"• Our admissions guide *{model.RepresentativeName}* will meet your family at the reception.\n\n" +
            $"Need directions or have any questions? Reply directly to this WhatsApp message or call our admissions desk at {helpline}.\n\n" +
            $"Warm regards,\n*{model.InstitutionName} Admissions Team*";

        return await SendWhatsAppAsync(model.ParentPhone, msg, model.ParentName);
    }

    public async Task<bool> SendTourBookingNotificationToRepresentativeWhatsAppAsync(TourBookingWhatsAppModel model)
    {
        if (string.IsNullOrWhiteSpace(model.RepresentativePhone))
        {
            _logger.LogInformation("[WhatsAppService] Representative {Name} has no phone configured for booking alert.", model.RepresentativeName);
            return false;
        }

        var dateStr = model.TourDate.ToString("ddd, MMM dd, yyyy");
        var notesSnippet = !string.IsNullOrWhiteSpace(model.Notes) ? model.Notes : "None specified";

        var msg =
            $"🔔 *New Campus Tour Booking Alert!*\n\n" +
            $"Hello *{model.RepresentativeName}*,\n\n" +
            $"A prospective family has just booked your tour slot at *{model.CampusName}*.\n\n" +
            $"🎫 *Booking Reference:* *{model.ConfirmationCode}*\n" +
            $"👤 *Parent:* {model.ParentName} (📞 {model.ParentPhone})\n" +
            $"🎓 *Student:* {model.StudentName} (Grade: {model.GradeInterested})\n" +
            $"📅 *Date:* {dateStr}\n" +
            $"⏰ *Time Window:* {model.TimeSlot}\n" +
            $"👥 *Attendees:* {model.NumberOfAttendees}\n" +
            $"📝 *Parent Notes:* {notesSnippet}\n\n" +
            $"Please ensure your schedule is clear and be at the Main Reception 5 minutes early to greet the family.\n\n" +
            $"_— {model.InstitutionName} Admissions Office_";

        return await SendWhatsAppAsync(model.RepresentativePhone, msg, model.RepresentativeName);
    }

    public async Task<bool> SendTourBookingNotificationToAdminWhatsAppAsync(TourBookingWhatsAppModel model)
    {
        var targetPhone = !string.IsNullOrWhiteSpace(model.AdminPhone)
            ? model.AdminPhone
            : _configuration["WhatsApp:AdminPhone"] ?? _configuration["AdminPhone"] ?? model.SchoolContactPhone;

        if (string.IsNullOrWhiteSpace(targetPhone))
        {
            _logger.LogInformation("[WhatsAppService] No admin phone configured. Skipping admin WhatsApp notification.");
            return false;
        }

        var dateStr = model.TourDate.ToString("ddd, MMM dd, yyyy");

        var msg =
            $"📢 *Campus Tour Booking Alert [Admin]*\n\n" +
            $"A new self-serve campus tour has been scheduled:\n\n" +
            $"🎫 *Ref Code:* *{model.ConfirmationCode}*\n" +
            $"🏫 *Campus:* {model.CampusName} ({model.InstitutionName})\n" +
            $"📅 *Date & Time:* {dateStr} at {model.TimeSlot}\n" +
            $"👤 *Parent:* {model.ParentName} ({model.ParentPhone})\n" +
            $"🎓 *Student:* {model.StudentName} (Grade {model.GradeInterested})\n" +
            $"👥 *Attendees:* {model.NumberOfAttendees}\n" +
            $"👤 *Assigned Host:* *{model.RepresentativeName}*\n\n" +
            $"Notification emails and WhatsApp confirmations have been dispatched to both parent and host.";

        return await SendWhatsAppAsync(targetPhone, msg, "School Administrator");
    }

    private static string CleanPhoneNumber(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.Length == 10)
        {
            return "91" + digits; // Default India country code for 10-digit mobile
        }
        if (digits.Length == 11 && digits.StartsWith("0"))
        {
            return "91" + digits.Substring(1);
        }
        return digits;
    }
}
