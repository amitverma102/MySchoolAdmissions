namespace MySchoolAdmissions.EnrollmentService.Models;

public class FeeConcession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EnrollmentId { get; set; }
    public string Category { get; set; } = string.Empty; // Sibling, Merit, Defense, Staff, FinancialAid
    public string ConcessionType { get; set; } = "Percentage"; // "Percentage" or "FixedAmount"
    public decimal Value { get; set; }
    public decimal CalculatedDiscountAmount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string SiblingReference { get; set; } = string.Empty;
    public string RequestedByCounselorName { get; set; } = "Admission Counselor";
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Pending"; // "Pending", "Approved", "Rejected"
    public string? ReviewedByUserName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewRemarks { get; set; }
}
