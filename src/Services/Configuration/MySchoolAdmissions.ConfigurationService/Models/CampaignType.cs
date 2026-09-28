namespace MySchoolAdmissions.ConfigurationService.Models;

public class CampaignType
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty; // e.g., "Digital", "Offline Event"
    public bool IsActive { get; set; } = true;
}
