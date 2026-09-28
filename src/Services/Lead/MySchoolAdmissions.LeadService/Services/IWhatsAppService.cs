namespace MySchoolAdmissions.LeadService.Services;

public class TourSlotAssignedWhatsAppModel
{
    public string RepresentativeName { get; set; } = string.Empty;
    public string RepresentativePhone { get; set; } = string.Empty;
    public string InstitutionName { get; set; } = string.Empty;
    public string CampusName { get; set; } = string.Empty;
    public DateTime SlotDate { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int Capacity { get; set; } = 3;
}

public class TourBookingWhatsAppModel
{
    public string ConfirmationCode { get; set; } = string.Empty;
    public string ParentName { get; set; } = string.Empty;
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
    public string? RepresentativePhone { get; set; }
    public string? AdminPhone { get; set; }
    public string? SchoolContactPhone { get; set; }
}

public interface IWhatsAppService
{
    Task<bool> SendWhatsAppAsync(string toPhone, string message, string? recipientName = null, Guid? referenceId = null);
    Task<bool> SendTourSlotAssignedWhatsAppAsync(TourSlotAssignedWhatsAppModel model);
    Task<bool> SendTourBookingConfirmationToParentWhatsAppAsync(TourBookingWhatsAppModel model);
    Task<bool> SendTourBookingNotificationToRepresentativeWhatsAppAsync(TourBookingWhatsAppModel model);
    Task<bool> SendTourBookingNotificationToAdminWhatsAppAsync(TourBookingWhatsAppModel model);
}
