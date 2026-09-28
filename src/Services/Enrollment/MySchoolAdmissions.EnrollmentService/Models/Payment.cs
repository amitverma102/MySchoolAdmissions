namespace MySchoolAdmissions.EnrollmentService.Models;

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EnrollmentId { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public string ReferenceNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // e.g. Completed, Pending, Failed
    public string Remarks { get; set; } = string.Empty;
    public string GatewayOrderId { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "Online"; // UPI, Card, NetBanking, Manual
    public string ReceiptNumber { get; set; } = string.Empty;
    public DateTime? ReceiptDate { get; set; }
    public bool IsAdHoc { get; set; } = false;
    public string FeeCategory { get; set; } = "SeatReservation"; // SeatReservation, Registration, Tuition, Transport, BooksUniform, CautionDeposit, LateFee, AdHoc
    public string Notes { get; set; } = string.Empty;
    public string PaymentLink { get; set; } = string.Empty;
    public string PaymentLinkId { get; set; } = string.Empty;
    public string PaymentLinkStatus { get; set; } = string.Empty; // Active, Paid, Expired
    public DateTime? ExpiresAt { get; set; }
}
