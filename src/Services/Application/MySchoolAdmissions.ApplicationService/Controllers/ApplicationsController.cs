using MySchoolAdmissions.ApplicationService.Data;
using MySchoolAdmissions.ApplicationService.Models;
using MySchoolAdmissions.ApplicationService.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using MySchoolAdmissions.EventBus.Events;

namespace MySchoolAdmissions.ApplicationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ApplicationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;

    public ApplicationsController(ApplicationDbContext context, IPublishEndpoint publishEndpoint)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
    }

    private (bool isSuperAdmin, Guid? userInstitutionId) GetUserContext()
    {
        if (Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            var tokenStr = authHeader.ToString();
            if (tokenStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                tokenStr = tokenStr.Substring("Bearer ".Length).Trim();
            }

            try
            {
                var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                if (handler.CanReadToken(tokenStr))
                {
                    var jwt = handler.ReadJwtToken(tokenStr);
                    var isSuper = jwt.Claims.Any(c =>
                        (c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
                        && c.Value.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));

                    Guid? instId = null;
                    var instClaim = jwt.Claims.FirstOrDefault(c =>
                        c.Type.Equals("institutionId", StringComparison.OrdinalIgnoreCase) ||
                        c.Type.Equals("institution_id", StringComparison.OrdinalIgnoreCase));

                    if (instClaim != null && Guid.TryParse(instClaim.Value, out var parsedGuid))
                    {
                        instId = parsedGuid;
                    }

                    return (isSuper, instId);
                }
            }
            catch
            {
            }
        }

        return (false, null);
    }

    private bool CanAccessApplication(Application application)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (isSuperAdmin) return true;
        if (!userInstitutionId.HasValue) return false;
        var recordInstitutionId = application.InstitutionId ?? Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
        return recordInstitutionId == userInstitutionId.Value;
    }

    [HttpGet]
    public async Task<IActionResult> GetApplications([FromQuery] Guid? institutionId = null, [FromQuery] string? parentEmail = null, [FromQuery] string? parentPhone = null)
    {
        var (isSuperAdmin, userInstId) = GetUserContext();

        Guid? targetInstId = null;
        if (isSuperAdmin)
        {
            targetInstId = institutionId;
            if (!targetInstId.HasValue && Request.Headers.TryGetValue("X-Tenant-Id", out var tenantH) && Guid.TryParse(tenantH, out var pT))
                targetInstId = pT;
            else if (!targetInstId.HasValue && Request.Headers.TryGetValue("X-Institution-Id", out var instH) && Guid.TryParse(instH, out var pI))
                targetInstId = pI;
        }
        else
        {
            if (!userInstId.HasValue)
            {
                return Forbid();
            }
            targetInstId = userInstId.Value;
        }

        var apps = await _context.Applications
            .Include(a => a.Assessments)
            .Include(a => a.Documents)
            .ToListAsync();

        if (targetInstId.HasValue)
        {
            var disId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
            apps = targetInstId.Value == disId
                ? apps.Where(a => a.InstitutionId == targetInstId.Value || a.InstitutionId == null).ToList()
                : apps.Where(a => a.InstitutionId == targetInstId.Value).ToList();
        }

        if (!string.IsNullOrWhiteSpace(parentEmail) || !string.IsNullOrWhiteSpace(parentPhone))
        {
            var searchEmail = parentEmail?.Trim().ToLowerInvariant() ?? string.Empty;
            var searchPhone = parentPhone?.Trim() ?? string.Empty;

            apps = apps.Where(a =>
            {
                if (string.IsNullOrWhiteSpace(a.CustomFieldsJson)) return false;
                var json = a.CustomFieldsJson.ToLowerInvariant();
                var emailMatch = !string.IsNullOrEmpty(searchEmail) && json.Contains(searchEmail);
                var phoneMatch = !string.IsNullOrEmpty(searchPhone) && json.Contains(searchPhone);
                return emailMatch || phoneMatch;
            }).ToList();
        }
            
        var dtos = apps.Select(MapToDto).ToList();
        return Ok(dtos);
    }

    [HttpGet("my-wards")]
    public async Task<IActionResult> GetMyWards([FromQuery] string? email, [FromQuery] string? phone)
    {
        return await GetApplications(null, email, phone);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetApplication(Guid id)
    {
        var app = await _context.Applications
            .Include(a => a.Documents)
            .Include(a => a.Assessments)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (app == null) return NotFound();

        var (isSuperAdmin, userInstId) = GetUserContext();
        if (!CanAccessApplication(app)) return Forbid();

        return Ok(MapToDto(app));
    }

    [HttpPost]
    public async Task<IActionResult> CreateApplication([FromBody] CreateApplicationDto dto)
    {
        var (isSuperAdmin, userInstId) = GetUserContext();
        var targetInstId = dto.InstitutionId;

        if (!isSuperAdmin)
        {
            if (!userInstId.HasValue) return Forbid();
            targetInstId = userInstId.Value;
        }
        else
        {
            if (!targetInstId.HasValue && Request.Headers.TryGetValue("X-Tenant-Id", out var tenantH) && Guid.TryParse(tenantH, out var pT))
                targetInstId = pT;
            else if (!targetInstId.HasValue && Request.Headers.TryGetValue("X-Institution-Id", out var instH) && Guid.TryParse(instH, out var pI))
                targetInstId = pI;
        }

        var application = new Application
        {
            ApplicationNumber = "APP" + DateTime.UtcNow.ToString("yyyyMMddHHmmss"),
            EnquiryId = dto.EnquiryId,
            ApplicantName = dto.ApplicantName,
            InstitutionId = targetInstId ?? Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01"),
            CampusId = dto.CampusId,
            GradeApplyingFor = dto.GradeApplyingFor,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "Draft" : dto.Status,
            CustomFieldsJson = dto.CustomFieldsJson,
            SubmittedDate = DateTime.UtcNow
        };
        
        _context.Applications.Add(application);
        await _context.SaveChangesAsync();
        
        return CreatedAtAction(nameof(GetApplication), new { id = application.Id }, MapToDto(application));
    }

    [HttpPut("{id}/custom-fields")]
    public async Task<IActionResult> UpdateCustomFields(Guid id, [FromBody] string customFieldsJson)
    {
        var application = await _context.Applications.FindAsync(id);
        if (application == null) return NotFound();
        if (!CanAccessApplication(application)) return Forbid();

        application.CustomFieldsJson = customFieldsJson;
        await _context.SaveChangesAsync();

        return Ok(MapToDto(application));
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateApplicationStatusDto dto)
    {
        var application = await _context.Applications.FindAsync(id);
        if (application == null) return NotFound();
        if (!CanAccessApplication(application)) return Forbid();

        application.Status = dto.Status;
        await _context.SaveChangesAsync();
        
        if (dto.Status == "Approved")
        {
            await _publishEndpoint.Publish(new ApplicationApprovedEvent
            {
                ApplicationId = application.Id,
                ApplicantName = application.ApplicantName,
                Grade = application.GradeApplyingFor,
                InstitutionId = application.InstitutionId,
                ApprovedDate = DateTime.UtcNow
            });
        }
        
        // Publish ApplicationUpdatedEvent for all status changes to notify candidate
        await _publishEndpoint.Publish(new ApplicationUpdatedEvent
        {
            ApplicationId = application.Id,
            ApplicantName = application.ApplicantName,
            NewStatus = dto.Status,
            Email = "candidate@example.com", // Mock email for now
            Phone = "+1234567890", // Mock phone for now
            UpdatedDate = DateTime.UtcNow
        });
        
        return NoContent();
    }
    
    [HttpGet("{id}/assessments")]
    public async Task<IActionResult> GetAssessments(Guid id)
    {
        var app = await _context.Applications.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        if (app == null) return NotFound();
        if (!CanAccessApplication(app)) return Forbid();

        var assessments = await _context.Assessments
            .Where(a => a.ApplicationId == id)
            .OrderBy(a => a.ScheduledDate)
            .Select(a => new AssessmentDto
            {
                Id = a.Id,
                ApplicationId = a.ApplicationId,
                Type = a.Type,
                ScheduledDate = a.ScheduledDate,
                Status = a.Status,
                Score = a.Score,
                Feedback = a.Feedback
            })
            .ToListAsync();
            
        return Ok(assessments);
    }
    
    [HttpPost("{id}/assessments")]
    public async Task<IActionResult> CreateAssessment(Guid id, [FromBody] CreateAssessmentDto dto)
    {
        var app = await _context.Applications.FindAsync(id);
        if (app == null) return NotFound();
        if (!CanAccessApplication(app)) return Forbid();
        
        var assessment = new Assessment
        {
            ApplicationId = id,
            Type = dto.Type,
            ScheduledDate = dto.ScheduledDate,
            Status = "Scheduled"
        };
        
        _context.Assessments.Add(assessment);
        await _context.SaveChangesAsync();
        
        // Notify candidate
        await _publishEndpoint.Publish(new AssessmentScheduledEvent
        {
            ApplicationId = app.Id,
            AssessmentId = assessment.Id,
            ApplicantName = app.ApplicantName,
            AssessmentType = assessment.Type,
            ScheduledDate = assessment.ScheduledDate,
            Email = "candidate@example.com", // Mock email
            Phone = "+1234567890" // Mock phone
        });
        
        var responseDto = new AssessmentDto
        {
            Id = assessment.Id,
            ApplicationId = assessment.ApplicationId,
            Type = assessment.Type,
            ScheduledDate = assessment.ScheduledDate,
            Status = assessment.Status,
            Score = assessment.Score,
            Feedback = assessment.Feedback
        };
        
        return CreatedAtAction(nameof(GetAssessments), new { id = id }, responseDto); // Usually this would return a single GET, returning list for simplicity or we can just return the object
    }
    
    [HttpPut("{id}/assessments/{assessmentId}")]
    public async Task<IActionResult> UpdateAssessmentScore(Guid id, Guid assessmentId, [FromBody] UpdateAssessmentScoreDto dto)
    {
        var assessment = await _context.Assessments.FirstOrDefaultAsync(a => a.Id == assessmentId && a.ApplicationId == id);
        if (assessment == null) return NotFound();
        
        assessment.Status = dto.Status;
        assessment.Score = dto.Score;
        assessment.Feedback = dto.Feedback;
        
        await _context.SaveChangesAsync();
        
        return NoContent();
    }

    private static ApplicationDto MapToDto(Application app)
    {
        return new ApplicationDto
        {
            Id = app.Id,
            ApplicationNumber = app.ApplicationNumber,
            EnquiryId = app.EnquiryId,
            StudentId = app.StudentId,
            ApplicantName = app.ApplicantName,
            Status = app.Status,
            InstitutionId = app.InstitutionId,
            CampusId = app.CampusId,
            GradeApplyingFor = app.GradeApplyingFor,
            SubmittedDate = app.SubmittedDate,
            CreatedAt = app.CreatedAt,
            CustomFieldsJson = app.CustomFieldsJson,
            Assessments = app.Assessments?.Select(a => new AssessmentDto
            {
                Id = a.Id,
                ApplicationId = a.ApplicationId,
                Type = a.Type,
                ScheduledDate = a.ScheduledDate,
                Status = a.Status,
                Score = a.Score,
                Feedback = a.Feedback
            }).ToList() ?? new List<AssessmentDto>()
        };
    }
}
