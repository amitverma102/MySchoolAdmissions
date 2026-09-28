namespace MySchoolAdmissions.EnrollmentService.DTOs;

public class EnrollmentDto
{
    public Guid Id { get; set; }
    public Guid ApplicationId { get; set; }
    public Guid? InstitutionId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime EnrollmentDate { get; set; }
    
    public ICollection<PaymentDto> Payments { get; set; } = new List<PaymentDto>();
    public ICollection<FeeConcessionDto> Concessions { get; set; } = new List<FeeConcessionDto>();
}
