namespace MySchoolAdmissions.LeadService.Models;

public class TourAvailabilitySlot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InstitutionId { get; set; }
    public Guid CampusId { get; set; }
    public DateTime SlotDate { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int Capacity { get; set; } = 3;
    public Guid? AssignedRepresentativeId { get; set; }
    public string? AssignedRepresentativeName { get; set; }
    public string? AssignedRepresentativeEmail { get; set; }
    public string? AssignedRepresentativePhone { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
