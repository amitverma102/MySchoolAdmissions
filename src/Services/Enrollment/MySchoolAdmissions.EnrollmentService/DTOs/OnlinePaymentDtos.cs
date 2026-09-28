namespace MySchoolAdmissions.EnrollmentService.DTOs;

public class CreatePaymentOrderDto
{
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string PaymentMethod { get; set; } = "Online";
    public string FeeCategory { get; set; } = "SeatReservation";
    public bool IsAdHoc { get; set; } = false;
    public string Notes { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
}

public class PaymentOrderResultDto
{
    public Guid PaymentId { get; set; }
    public Guid EnrollmentId { get; set; }
    public string OrderId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string KeyId { get; set; } = "rzp_test_myschooladmissions2026";
    public string StudentName { get; set; } = string.Empty;
    public string FeeCategory { get; set; } = "SeatReservation";
    public bool IsAdHoc { get; set; } = false;
    public string Notes { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CreatePaymentLinkDto
{
    public decimal Amount { get; set; }
    public string FeeCategory { get; set; } = "SeatReservation";
    public string Description { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string RecipientEmail { get; set; } = string.Empty;
    public int ExpiresInHours { get; set; } = 48;
    public bool IsAdHoc { get; set; } = false;
}

public class PaymentLinkResultDto
{
    public Guid PaymentId { get; set; }
    public Guid EnrollmentId { get; set; }
    public string PaymentLinkId { get; set; } = string.Empty;
    public string ShortUrl { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string FeeCategory { get; set; } = "SeatReservation";
    public string Description { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string RecipientEmail { get; set; } = string.Empty;
    public string QrCodeUrl { get; set; } = string.Empty;
    public string WhatsAppShareUrl { get; set; } = string.Empty;
    public string EmailShareUrl { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class PaymentWebhookDto
{
    public string OrderId { get; set; } = string.Empty;
    public string GatewayPaymentId { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
    public string Status { get; set; } = "Captured";
    public string PaymentMethod { get; set; } = "UPI";
}

public class ReceiptDto
{
    public string ReceiptNumber { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; }
    public Guid EnrollmentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string InstitutionName { get; set; } = "MySchoolAdmissions Partner Institution";
    public bool IsAdHoc { get; set; } = false;
    public string FeeCategory { get; set; } = "SeatReservation";
    public string Notes { get; set; } = string.Empty;
}

public class PublicCreatePaymentOrderDto
{
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string FeeCategory { get; set; } = "SeatReservation";
    public string StudentName { get; set; } = string.Empty;
    public string ApplicationRef { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string SchoolName { get; set; } = "Delhi International School";
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public Guid? EnrollmentId { get; set; }
    public bool IsAdHoc { get; set; } = false;
}

public class VerifyPaymentDto
{
    public string OrderId { get; set; } = string.Empty;
    public string PaymentId { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "Razorpay Online";
    public string? StudentName { get; set; }
    public string? FeeCategory { get; set; }
    public decimal? Amount { get; set; }
}

public class PaymentLinkDetailsDto
{
    public string PaymentLinkId { get; set; } = string.Empty;
    public Guid EnrollmentId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string FeeCategory { get; set; } = "SeatReservation";
    public string Description { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string RecipientEmail { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string SchoolName { get; set; } = "MySchoolAdmissions Partner Academy";
    public DateTime? ExpiresAt { get; set; }
    public bool IsExpired { get; set; }
    public string? ExistingTransactionId { get; set; }
    public string? ReceiptNumber { get; set; }
}

