namespace MySchoolAdmissions.ConfigurationService.Models;

public class LeadSource
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty; // e.g., "Google Ads", "Walk-in"
    public bool IsActive { get; set; } = true;
}
