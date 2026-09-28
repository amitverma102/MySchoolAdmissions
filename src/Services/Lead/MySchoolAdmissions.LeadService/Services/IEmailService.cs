namespace MySchoolAdmissions.LeadService.Services;

public class TourSlotAssignedEmailModel
{
    public string RepresentativeName { get; set; } = string.Empty;
    public string RepresentativeEmail { get; set; } = string.Empty;
    public string InstitutionName { get; set; } = string.Empty;
    public string CampusName { get; set; } = string.Empty;
    public DateTime SlotDate { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int Capacity { get; set; } = 3;
}

public class TourBookingEmailModel
{
    public string ConfirmationCode { get; set; } = string.Empty;
    public string ParentName { get; set; } = string.Empty;
    public string ParentEmail { get; set; } = string.Empty;
    public string ParentPhone { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string GradeInterested { get; set; } = string.Empty;
    public int NumberOfAttendees { get; set; } = 2;
    public string? Notes { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public string CampusName { get; set; } = string.Empty;
    public string? CampusAddress { get; set; }
    public DateTime TourDate { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public string RepresentativeName { get; set; } = "Admissions Representative";
    public string? RepresentativeEmail { get; set; }
    public string? AdminEmail { get; set; }
    public int BookedCount { get; set; }
    public int MaxCapacity { get; set; } = 3;
}

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string htmlBody, string? recipientName = null);
    Task SendTourSlotAssignedEmailAsync(TourSlotAssignedEmailModel model);
    Task SendTourBookingConfirmationToParentAsync(TourBookingEmailModel model);
    Task SendTourBookingNotificationToRepresentativeAsync(TourBookingEmailModel model);
    Task SendTourBookingNotificationToAdminAsync(TourBookingEmailModel model);
}
