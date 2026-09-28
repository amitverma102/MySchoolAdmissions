using MySchoolAdmissions.LeadService.DTOs;
using MySchoolAdmissions.LeadService.Models;

namespace MySchoolAdmissions.LeadService.Services;

public interface ILeadAutoAssignmentService
{
    Task<AutoAssignmentResultDto> EvaluateAndAssignAsync(Enquiry enquiry, bool saveChanges = true);
    Task<AutoAssignmentResultDto> AutoAssignCoCounselorAsync(Guid enquiryId);
    Task<List<CounselorMatchCandidateDto>> PreviewMatchesAsync(LeadMatchCriteriaDto criteria);
    Task<int> AutoAssignUnassignedLeadsAsync(Guid? institutionId);
    Task<AutoAssignmentConfigDto> GetConfigAsync(Guid? institutionId);
    Task<AutoAssignmentConfigDto> UpdateConfigAsync(AutoAssignmentConfigDto dto);
}
