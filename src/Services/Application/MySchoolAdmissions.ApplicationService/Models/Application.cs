namespace MySchoolAdmissions.ApplicationService.Models;

public class Application
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ApplicationNumber { get; set; } = string.Empty;
    public Guid? EnquiryId { get; set; }
    public Guid StudentId { get; set; } // If student profile is created
    public string ApplicantName { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft"; // Draft, Submitted, UnderReview, Approved, Rejected, Waitlisted
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    public string GradeApplyingFor { get; set; } = string.Empty;
    public DateTime SubmittedDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CustomFieldsJson { get; set; } // JSON key-value pairs for dynamic form fields
    
    public ICollection<ApplicationDocument> Documents { get; set; } = new List<ApplicationDocument>();
    public ICollection<Assessment> Assessments { get; set; } = new List<Assessment>();
}
