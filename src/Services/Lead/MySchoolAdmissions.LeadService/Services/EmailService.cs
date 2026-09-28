using System.Net;
using System.Net.Mail;
using System.Net.Http.Json;
using System.Text;

namespace MySchoolAdmissions.LeadService.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        IConfiguration configuration,
        HttpClient httpClient,
        ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody, string? recipientName = null)
    {
        if (string.IsNullOrWhiteSpace(toEmail)) return;

        var fromEmail = _configuration["SmtpSettings:FromEmail"] ?? "admin@myschooladmissions.in";
        var fromName = _configuration["SmtpSettings:FromName"] ?? "MySchoolAdmissions Admissions Office";
        var host = _configuration["SmtpSettings:Host"];
        var portStr = _configuration["SmtpSettings:Port"];
        var username = _configuration["SmtpSettings:Username"];
        var password = _configuration["SmtpSettings:Password"];
        var enableSsl = bool.TryParse(_configuration["SmtpSettings:EnableSsl"], out var ssl) ? ssl : true;

        bool sentViaSmtp = false;

        if (!string.IsNullOrWhiteSpace(host))
        {
            try
            {
                int port = int.TryParse(portStr, out var p) ? p : 587;
                using var client = new SmtpClient(host, port)
                {
                    EnableSsl = enableSsl,
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    Timeout = 10000
                };

                if (!string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
                {
                    client.Credentials = new NetworkCredential(username, password);
                }

                using var mail = new MailMessage
                {
                    From = new MailAddress(fromEmail, fromName),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true,
                    BodyEncoding = Encoding.UTF8,
                    SubjectEncoding = Encoding.UTF8
                };
                mail.To.Add(new MailAddress(toEmail, recipientName ?? toEmail));

                await client.SendMailAsync(mail);
                sentViaSmtp = true;
                _logger.LogInformation("[EmailService] SMTP email sent successfully to {ToEmail} (Subject: {Subject})", toEmail, subject);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[EmailService] Direct SMTP send failed for {ToEmail}; logging dispatch fallback.", toEmail);
            }
        }

        // Forward to CommunicationService if available
        try
        {
            var commServiceUrl = _configuration["CommunicationServiceUrl"] ?? "http://communication-service";
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            var payload = new
            {
                Recipient = toEmail,
                StudentName = recipientName ?? toEmail,
                Channel = "Email",
                TemplateName = "Campus Tour Email Notification",
                Subject = subject,
                Content = htmlBody,
                HandledBy = fromName
            };
            await _httpClient.PostAsJsonAsync($"{commServiceUrl}/api/communications/send", payload, cts.Token);
        }
        catch
        {
            // Ignore communication-service forwarding error in test/dev
        }

        if (!sentViaSmtp)
        {
            _logger.LogInformation("[EmailService] Dispatched Email Notification -> Recipient: {Recipient} ({Name}) | Subject: {Subject}",
                toEmail, recipientName ?? "User", subject);
        }
    }

    public async Task SendTourSlotAssignedEmailAsync(TourSlotAssignedEmailModel model)
    {
        if (string.IsNullOrWhiteSpace(model.RepresentativeEmail)) return;

        var slotDateFormatted = model.SlotDate.ToString("ddd, MMM dd, yyyy");
        var timeWindow = $"{model.StartTime:hh:mm tt} - {model.EndTime:hh:mm tt}";
        var subject = $"Campus Tour Slot Assignment: {model.CampusName} - {slotDateFormatted} ({timeWindow})";

        var html = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px; color: #ffffff; }}
    .header h2 {{ margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }}
    .header p {{ margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }}
    .content {{ padding: 24px; font-size: 14px; line-height: 1.6; }}
    .box {{ background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 16px 0; }}
    .box-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }}
    .box-row:last-child {{ margin-bottom: 0; }}
    .label {{ color: #64748b; font-weight: 600; }}
    .val {{ color: #0f172a; font-weight: 800; }}
    .btn {{ display: inline-block; padding: 10px 20px; background: #059669; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; margin-top: 16px; }}
    .footer {{ padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }}
  </style>
</head>
<body>
  <div class='card'>
    <div class='header'>
      <h2>🏫 Campus Tour Slot Assignment</h2>
      <p>{model.InstitutionName} Admissions Team</p>
    </div>
    <div class='content'>
      <p>Hello <b>{model.RepresentativeName}</b>,</p>
      <p>You have been assigned by the Admissions Administration as the representative for an upcoming published Campus Tour slot.</p>
      
      <div class='box'>
        <div class='box-row'><span class='label'>Campus:</span><span class='val'>{model.CampusName}</span></div>
        <div class='box-row'><span class='label'>Date:</span><span class='val'>{slotDateFormatted}</span></div>
        <div class='box-row'><span class='label'>Time Window:</span><span class='val'>{timeWindow}</span></div>
        <div class='box-row'><span class='label'>Max Capacity:</span><span class='val'>{model.Capacity} prospective seats</span></div>
      </div>

      <p>Parents can now reserve this slot on the public admissions portal. Whenever a parent books a tour in this slot, you will receive an immediate booking confirmation email with student and parent details.</p>
      
      <a href='https://www.myschooladmissions.com/calendar' class='btn'>View Activity Calendar</a>
    </div>
    <div class='footer'>
      © {DateTime.UtcNow.Year} MySchoolAdmissions Admissions Management System. All rights reserved.
    </div>
  </div>
</body>
</html>";

        await SendEmailAsync(model.RepresentativeEmail, subject, html, model.RepresentativeName);
    }

    public async Task SendTourBookingConfirmationToParentAsync(TourBookingEmailModel model)
    {
        if (string.IsNullOrWhiteSpace(model.ParentEmail)) return;

        var tourDateFormatted = model.TourDate.ToString("ddd, MMM dd, yyyy");
        var subject = $"Campus Tour Confirmed: {model.CampusName} - {tourDateFormatted} at {model.TimeSlot} [Ref: {model.ConfirmationCode}]";

        var html = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%); padding: 24px; color: #ffffff; text-align: center; }}
    .header h2 {{ margin: 0; font-size: 22px; font-weight: 800; }}
    .badge {{ display: inline-block; padding: 4px 12px; background: rgba(255,255,255,0.2); border-radius: 9999px; font-size: 12px; font-weight: 700; margin-top: 8px; }}
    .content {{ padding: 24px; font-size: 14px; line-height: 1.6; }}
    .box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; }}
    .box-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }}
    .box-row:last-child {{ margin-bottom: 0; }}
    .label {{ color: #64748b; font-weight: 600; }}
    .val {{ color: #0f172a; font-weight: 800; }}
    .notice {{ background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #1e40af; margin-top: 16px; }}
    .footer {{ padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }}
  </style>
</head>
<body>
  <div class='card'>
    <div class='header'>
      <h2>🎉 Campus Tour Confirmed!</h2>
      <div class='badge'>Confirmation Code: {model.ConfirmationCode}</div>
    </div>
    <div class='content'>
      <p>Dear <b>{model.ParentName}</b>,</p>
      <p>Thank you for choosing <b>{model.InstitutionName}</b>. Your on-campus visit has been scheduled. Our team is excited to welcome you and <b>{model.StudentName}</b>.</p>

      <div class='box'>
        <div class='box-row'><span class='label'>Campus:</span><span class='val'>{model.CampusName}</span></div>
        <div class='box-row'><span class='label'>Date:</span><span class='val'>{tourDateFormatted}</span></div>
        <div class='box-row'><span class='label'>Time Slot:</span><span class='val'>{model.TimeSlot}</span></div>
        <div class='box-row'><span class='label'>Student:</span><span class='val'>{model.StudentName} (Grade: {model.GradeInterested})</span></div>
        <div class='box-row'><span class='label'>Attendees:</span><span class='val'>{model.NumberOfAttendees} person(s)</span></div>
        <div class='box-row'><span class='label'>Tour Representative:</span><span class='val'>{model.RepresentativeName}</span></div>
        {(string.IsNullOrWhiteSpace(model.Notes) ? "" : $"<div class='box-row'><span class='label'>Notes:</span><span class='val'>{model.Notes}</span></div>")}
      </div>

      <div class='notice'>
        <b>📍 Arrival Instructions:</b> Please arrive 10 minutes prior to your time slot and report to the Main Campus Welcome Desk. Please carry a valid photo ID for campus visitor check-in.
      </div>
    </div>
    <div class='footer'>
      {model.InstitutionName} • Admissions Office<br>
      © {DateTime.UtcNow.Year} MySchoolAdmissions. All rights reserved.
    </div>
  </div>
</body>
</html>";

        await SendEmailAsync(model.ParentEmail, subject, html, model.ParentName);
    }

    public async Task SendTourBookingNotificationToRepresentativeAsync(TourBookingEmailModel model)
    {
        if (string.IsNullOrWhiteSpace(model.RepresentativeEmail)) return;

        var tourDateFormatted = model.TourDate.ToString("ddd, MMM dd, yyyy");
        var subject = $"New Tour Booking: {model.StudentName} (Grade {model.GradeInterested}) - {tourDateFormatted} at {model.TimeSlot} [Ref: {model.ConfirmationCode}]";

        var html = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }}
    .header {{ background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 24px; color: #ffffff; }}
    .header h2 {{ margin: 0; font-size: 20px; font-weight: 800; }}
    .content {{ padding: 24px; font-size: 14px; line-height: 1.6; }}
    .box {{ background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 16px; margin: 16px 0; }}
    .box-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }}
    .box-row:last-child {{ margin-bottom: 0; }}
    .label {{ color: #6b21a8; font-weight: 600; }}
    .val {{ color: #1e1b4b; font-weight: 800; }}
    .btn {{ display: inline-block; padding: 10px 20px; background: #7c3aed; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; margin-top: 16px; }}
    .footer {{ padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }}
  </style>
</head>
<body>
  <div class='card'>
    <div class='header'>
      <h2>📋 New Campus Tour Booking</h2>
      <p>Assigned Representative: {model.RepresentativeName}</p>
    </div>
    <div class='content'>
      <p>Hi <b>{model.RepresentativeName}</b>,</p>
      <p>A parent has booked a seat for your tour slot. Here are the booking details:</p>

      <div class='box'>
        <div class='box-row'><span class='label'>Confirmation Ref:</span><span class='val'>{model.ConfirmationCode}</span></div>
        <div class='box-row'><span class='label'>Campus:</span><span class='val'>{model.CampusName}</span></div>
        <div class='box-row'><span class='label'>Date:</span><span class='val'>{tourDateFormatted}</span></div>
        <div class='box-row'><span class='label'>Time Slot:</span><span class='val'>{model.TimeSlot}</span></div>
        <div class='box-row'><span class='label'>Student:</span><span class='val'>{model.StudentName} (Grade: {model.GradeInterested})</span></div>
        <div class='box-row'><span class='label'>Parent / Guardian:</span><span class='val'>{model.ParentName}</span></div>
        <div class='box-row'><span class='label'>Parent Phone:</span><span class='val'>{model.ParentPhone}</span></div>
        <div class='box-row'><span class='label'>Parent Email:</span><span class='val'>{model.ParentEmail}</span></div>
        <div class='box-row'><span class='label'>Attendees:</span><span class='val'>{model.NumberOfAttendees}</span></div>
        {(string.IsNullOrWhiteSpace(model.Notes) ? "" : $"<div class='box-row'><span class='label'>Special Notes:</span><span class='val'>{model.Notes}</span></div>")}
        <div class='box-row'><span class='label'>Booked Count:</span><span class='val'>{model.BookedCount} / {model.MaxCapacity} seats</span></div>
      </div>

      <p>Please review the details in your calendar and prepare the tour itinerary accordingly.</p>
      <a href='https://www.myschooladmissions.com/calendar' class='btn'>Open Calendar Schedule</a>
    </div>
    <div class='footer'>
      © {DateTime.UtcNow.Year} MySchoolAdmissions Admissions Management System.
    </div>
  </div>
</body>
</html>";

        await SendEmailAsync(model.RepresentativeEmail, subject, html, model.RepresentativeName);
    }

    public async Task SendTourBookingNotificationToAdminAsync(TourBookingEmailModel model)
    {
        var adminEmail = model.AdminEmail ?? _configuration["SmtpSettings:AdminAlertEmail"] ?? "admin@myschooladmissions.in";
        if (string.IsNullOrWhiteSpace(adminEmail)) return;

        var tourDateFormatted = model.TourDate.ToString("ddd, MMM dd, yyyy");
        var subject = $"[Admin Alert] Campus Tour Booked: {model.StudentName} at {model.CampusName} [Ref: {model.ConfirmationCode}]";

        var html = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }}
    .header {{ background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px; color: #ffffff; }}
    .header h2 {{ margin: 0; font-size: 20px; font-weight: 800; }}
    .content {{ padding: 24px; font-size: 14px; line-height: 1.6; }}
    .box {{ background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 16px 0; }}
    .box-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }}
    .box-row:last-child {{ margin-bottom: 0; }}
    .label {{ color: #475569; font-weight: 600; }}
    .val {{ color: #0f172a; font-weight: 800; }}
    .btn {{ display: inline-block; padding: 10px 20px; background: #0f172a; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 13px; margin-top: 16px; }}
    .footer {{ padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }}
  </style>
</head>
<body>
  <div class='card'>
    <div class='header'>
      <h2>🏫 Admissions Admin Alert: Tour Reserved</h2>
      <p>{model.InstitutionName} - {model.CampusName}</p>
    </div>
    <div class='content'>
      <p>A new campus tour reservation has been made via the public tour booking portal.</p>

      <div class='box'>
        <div class='box-row'><span class='label'>Confirmation Code:</span><span class='val'>{model.ConfirmationCode}</span></div>
        <div class='box-row'><span class='label'>Date & Time:</span><span class='val'>{tourDateFormatted} ({model.TimeSlot})</span></div>
        <div class='box-row'><span class='label'>Campus:</span><span class='val'>{model.CampusName}</span></div>
        <div class='box-row'><span class='label'>Student:</span><span class='val'>{model.StudentName} (Grade: {model.GradeInterested})</span></div>
        <div class='box-row'><span class='label'>Parent:</span><span class='val'>{model.ParentName} ({model.ParentPhone} • {model.ParentEmail})</span></div>
        <div class='box-row'><span class='label'>Assigned Tour Staff:</span><span class='val'>{model.RepresentativeName}</span></div>
        <div class='box-row'><span class='label'>Attendees:</span><span class='val'>{model.NumberOfAttendees}</span></div>
        {(string.IsNullOrWhiteSpace(model.Notes) ? "" : $"<div class='box-row'><span class='label'>Parent Notes:</span><span class='val'>{model.Notes}</span></div>")}
        <div class='box-row'><span class='label'>Slot Availability:</span><span class='val'>{model.BookedCount} / {model.MaxCapacity} booked</span></div>
      </div>

      <a href='https://www.myschooladmissions.com/calendar' class='btn'>Open Calendar</a>
    </div>
    <div class='footer'>
      Admissions Admin Notification System • © {DateTime.UtcNow.Year} MySchoolAdmissions
    </div>
  </div>
</body>
</html>";

        await SendEmailAsync(adminEmail, subject, html, "Admissions Administrator");
    }
}
