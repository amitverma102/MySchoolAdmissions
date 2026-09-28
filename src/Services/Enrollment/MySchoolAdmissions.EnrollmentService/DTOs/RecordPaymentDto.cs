namespace MySchoolAdmissions.EnrollmentService.DTOs;

public class RecordPaymentDto
{
    public decimal Amount { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public string Remarks { get; set; } = string.Empty;
    public bool IsAdHoc { get; set; } = false;
    public string FeeCategory { get; set; } = "SeatReservation";
    public string Notes { get; set; } = string.Empty;
}
