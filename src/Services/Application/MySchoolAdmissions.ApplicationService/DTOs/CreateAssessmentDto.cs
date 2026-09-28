namespace MySchoolAdmissions.ApplicationService.DTOs;

public class CreateAssessmentDto
{
    public string Type { get; set; } = string.Empty;
    public DateTime ScheduledDate { get; set; }
}
