namespace MySchoolAdmissions.LeadService.Models;

public class LeadSource
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty; // e.g. Facebook, Google Ads, Walk-in, Referral
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
