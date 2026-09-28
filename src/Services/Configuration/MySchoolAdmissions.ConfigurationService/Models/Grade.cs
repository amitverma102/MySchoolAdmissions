namespace MySchoolAdmissions.ConfigurationService.Models;

public class Grade
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty; // e.g., "Grade 1", "Kindergarten"
    public int Order { get; set; } // For sorting
    public bool IsActive { get; set; } = true;
}
