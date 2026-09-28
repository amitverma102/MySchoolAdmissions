namespace MySchoolAdmissions.IdentityService.DTOs;

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}".Trim();
    public Guid UserId { get; set; }
    public Guid? InstitutionId { get; set; }
    public List<string> Roles { get; set; } = new();
}
