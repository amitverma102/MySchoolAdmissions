namespace MySchoolAdmissions.IdentityService.Models;

public class TenantStatus
{
    public Guid Id { get; set; }
    public bool IsActive { get; set; } = true;
}
