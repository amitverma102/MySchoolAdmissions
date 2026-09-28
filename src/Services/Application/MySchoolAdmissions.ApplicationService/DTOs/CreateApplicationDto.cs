namespace MySchoolAdmissions.ApplicationService.DTOs;

public class CreateApplicationDto
{
    public Guid? EnquiryId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public Guid? CampusId { get; set; }
    public string GradeApplyingFor { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft";
    public string? CustomFieldsJson { get; set; }
}
