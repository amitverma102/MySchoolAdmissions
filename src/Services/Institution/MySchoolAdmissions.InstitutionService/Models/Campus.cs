using System.Text.Json.Serialization;

namespace MySchoolAdmissions.InstitutionService.Models;

public class Campus
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public Guid InstitutionId { get; set; }
    
    [JsonIgnore]
    public Institution? Institution { get; set; }
}
