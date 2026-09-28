namespace MySchoolAdmissions.EnrollmentService.DTOs;

public class CreateEnrollmentDto
{
    public Guid ApplicationId { get; set; }
    public Guid? InstitutionId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string Status { get; set; } = "Offered";
}
