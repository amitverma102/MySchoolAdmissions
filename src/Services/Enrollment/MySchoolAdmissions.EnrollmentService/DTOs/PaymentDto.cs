namespace MySchoolAdmissions.EnrollmentService.DTOs;

public class PaymentDto
{
    public Guid Id { get; set; }
    public Guid EnrollmentId { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Remarks { get; set; } = string.Empty;
    public string GatewayOrderId { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string ReceiptNumber { get; set; } = string.Empty;
    public DateTime? ReceiptDate { get; set; }
    public bool IsAdHoc { get; set; } = false;
    public string FeeCategory { get; set; } = "SeatReservation";
    public string Notes { get; set; } = string.Empty;
    public string PaymentLink { get; set; } = string.Empty;
    public string PaymentLinkId { get; set; } = string.Empty;
    public string PaymentLinkStatus { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
}
