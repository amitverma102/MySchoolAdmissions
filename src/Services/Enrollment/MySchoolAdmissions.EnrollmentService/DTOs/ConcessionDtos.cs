namespace MySchoolAdmissions.EnrollmentService.DTOs;

public class RequestConcessionDto
{
    public string Category { get; set; } = "Sibling"; // Sibling, Merit, Defense, Staff, FinancialAid
    public string ConcessionType { get; set; } = "Percentage"; // "Percentage" or "FixedAmount"
    public decimal Value { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? SiblingReference { get; set; }
    public string? CounselorName { get; set; }
}

public class ReviewConcessionDto
{
    public string Status { get; set; } = "Approved"; // "Approved" or "Rejected"
    public string? ReviewerName { get; set; } = "School Principal / Admin";
    public string? Remarks { get; set; }
}

public class FeeConcessionDto
{
    public Guid Id { get; set; }
    public Guid EnrollmentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string ConcessionType { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public decimal CalculatedDiscountAmount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string SiblingReference { get; set; } = string.Empty;
    public string RequestedByCounselorName { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ReviewedByUserName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewRemarks { get; set; }
}
