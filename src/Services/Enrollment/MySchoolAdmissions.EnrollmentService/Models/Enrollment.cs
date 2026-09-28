namespace MySchoolAdmissions.EnrollmentService.Models;

public class Enrollment
{
    public Guid Id { get; set; }
    public Guid ApplicationId { get; set; }
    public Guid? InstitutionId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // e.g. Offered, Confirmed, Onboarded, Withdrawn
    public DateTime EnrollmentDate { get; set; }
    
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<FeeConcession> Concessions { get; set; } = new List<FeeConcession>();
}
