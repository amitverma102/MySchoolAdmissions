namespace MySchoolAdmissions.ApplicationService.DTOs;

public class ApplicationDto
{
    public Guid Id { get; set; }
    public string ApplicationNumber { get; set; } = string.Empty;
    public Guid? EnquiryId { get; set; }
    public Guid StudentId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    public string GradeApplyingFor { get; set; } = string.Empty;
    public DateTime SubmittedDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CustomFieldsJson { get; set; }
    
    public ICollection<AssessmentDto> Assessments { get; set; } = new List<AssessmentDto>();
}
