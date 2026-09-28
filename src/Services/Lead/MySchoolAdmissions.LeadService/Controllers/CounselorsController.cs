using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySchoolAdmissions.LeadService.Data;
using MySchoolAdmissions.LeadService.DTOs;
using MySchoolAdmissions.LeadService.Models;
using MySchoolAdmissions.LeadService.Services;

namespace MySchoolAdmissions.LeadService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CounselorsController : ControllerBase
{
    private readonly LeadDbContext _context;
    private readonly ILeadAutoAssignmentService _autoAssignmentService;

    public CounselorsController(LeadDbContext context, ILeadAutoAssignmentService autoAssignmentService)
    {
        _context = context;
        _autoAssignmentService = autoAssignmentService;
    }

    private (bool IsSuperAdmin, Guid? InstitutionId) GetUserContext()
    {
        try
        {
            var token = Request.Headers.Authorization.ToString().Replace("Bearer ", string.Empty, StringComparison.OrdinalIgnoreCase).Trim();
            var jwt = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().ReadJwtToken(token);
            var isSuperAdmin = jwt.Claims.Any(c =>
                (c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role") &&
                c.Value.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));
            var claim = jwt.Claims.FirstOrDefault(c => c.Type.Equals("institutionId", StringComparison.OrdinalIgnoreCase) || c.Type.Equals("institution_id", StringComparison.OrdinalIgnoreCase));
            return (isSuperAdmin, Guid.TryParse(claim?.Value, out var institutionId) ? institutionId : null);
        }
        catch
        {
            return (false, null);
        }
    }

    private bool CanAccessProfile(CounselorSkillProfile profile)
    {
        var (isSuperAdmin, institutionId) = GetUserContext();
        return isSuperAdmin || institutionId.HasValue && profile.InstitutionId == institutionId;
    }

    [HttpGet("profiles")]
    public async Task<IActionResult> GetCounselorProfiles([FromQuery] Guid? institutionId)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin && !userInstitutionId.HasValue) return Forbid();

        var targetInstId = isSuperAdmin ? institutionId : userInstitutionId;
        if (isSuperAdmin && !targetInstId.HasValue)
        {
            if (Request.Headers.TryGetValue("X-Institution-Id", out var hInst) && Guid.TryParse(hInst, out var hGuid))
                targetInstId = hGuid;
            else if (Request.Headers.TryGetValue("X-Tenant-Id", out var tInst) && Guid.TryParse(tInst, out var tGuid))
                targetInstId = tGuid;
        }

        var query = _context.CounselorProfiles.AsQueryable();
        if (targetInstId.HasValue)
        {
            query = query.Where(p => p.InstitutionId == targetInstId.Value);
        }

        var profiles = await query.OrderBy(p => p.CounselorName).ToListAsync();

        var activeCounts = await _context.Enquiries
            .Where(e => e.AssignedToId != null && e.Status != "Qualified" && e.Status != "Lost")
            .Where(e => !targetInstId.HasValue || e.InstitutionId == targetInstId.Value)
            .GroupBy(e => e.AssignedToId!.Value)
            .Select(g => new { CounselorId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.CounselorId, g => g.Count);

        var result = profiles.Select(p => new CounselorSkillProfileDto
        {
            Id = p.Id,
            UserId = p.UserId,
            CounselorName = p.CounselorName,
            Email = p.Email,
            InstitutionId = p.InstitutionId,
            CampusId = p.CampusId,
            LanguagesKnown = p.LanguagesKnown,
            HandledClasses = p.HandledClasses,
            Regions = p.Regions,
            Religions = p.Religions,
            DailyLeadCapacity = p.DailyLeadCapacity,
            MaxActiveLeads = p.MaxActiveLeads,
            IsActive = p.IsActive,
            LastAssignedAt = p.LastAssignedAt,
            AssignedCountToday = p.AssignedCountToday,
            CurrentActiveLeads = activeCounts.TryGetValue(p.UserId, out int count) ? count : 0
        }).ToList();

        return Ok(result);
    }

    [HttpGet("profiles/{userId}")]
    public async Task<IActionResult> GetProfile(Guid userId)
    {
        var profile = await _context.CounselorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null) return NotFound();
        if (!CanAccessProfile(profile)) return Forbid();

        var (_, institutionId) = GetUserContext();

        var activeCount = await _context.Enquiries
            .CountAsync(e => e.AssignedToId == userId && e.Status != "Qualified" && e.Status != "Lost" &&
                (!institutionId.HasValue || e.InstitutionId == institutionId.Value));

        return Ok(new CounselorSkillProfileDto
        {
            Id = profile.Id,
            UserId = profile.UserId,
            CounselorName = profile.CounselorName,
            Email = profile.Email,
            InstitutionId = profile.InstitutionId,
            CampusId = profile.CampusId,
            LanguagesKnown = profile.LanguagesKnown,
            HandledClasses = profile.HandledClasses,
            Regions = profile.Regions,
            Religions = profile.Religions,
            DailyLeadCapacity = profile.DailyLeadCapacity,
            MaxActiveLeads = profile.MaxActiveLeads,
            IsActive = profile.IsActive,
            LastAssignedAt = profile.LastAssignedAt,
            AssignedCountToday = profile.AssignedCountToday,
            CurrentActiveLeads = activeCount
        });
    }

    [HttpPost("profiles")]
    public async Task<IActionResult> UpsertProfile([FromBody] UpdateCounselorSkillProfileDto dto)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin && !userInstitutionId.HasValue) return Forbid();
        if (!isSuperAdmin) dto.InstitutionId = userInstitutionId;

        var profile = await _context.CounselorProfiles.FirstOrDefaultAsync(p => p.UserId == dto.UserId);
        if (profile != null && !CanAccessProfile(profile)) return Forbid();

        if (profile == null)
        {
            profile = new CounselorSkillProfile
            {
                UserId = dto.UserId,
                CounselorName = dto.CounselorName,
                Email = dto.Email,
                InstitutionId = dto.InstitutionId,
                CampusId = dto.CampusId,
                LanguagesKnown = dto.LanguagesKnown ?? new List<string>(),
                HandledClasses = dto.HandledClasses ?? new List<string>(),
                Regions = dto.Regions ?? new List<string>(),
                Religions = dto.Religions ?? new List<string>(),
                DailyLeadCapacity = dto.DailyLeadCapacity,
                MaxActiveLeads = dto.MaxActiveLeads,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.CounselorProfiles.Add(profile);
        }
        else
        {
            profile.CounselorName = dto.CounselorName;
            profile.Email = dto.Email;
            profile.InstitutionId = dto.InstitutionId;
            profile.CampusId = dto.CampusId;
            profile.LanguagesKnown = dto.LanguagesKnown ?? new List<string>();
            profile.HandledClasses = dto.HandledClasses ?? new List<string>();
            profile.Regions = dto.Regions ?? new List<string>();
            profile.Religions = dto.Religions ?? new List<string>();
            profile.DailyLeadCapacity = dto.DailyLeadCapacity;
            profile.MaxActiveLeads = dto.MaxActiveLeads;
            profile.IsActive = dto.IsActive;
            profile.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(profile);
    }

    [HttpPut("profiles/{userId}/status")]
    public async Task<IActionResult> ToggleStatus(Guid userId, [FromBody] bool isActive)
    {
        var profile = await _context.CounselorProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null) return NotFound();
        if (!CanAccessProfile(profile)) return Forbid();

        profile.IsActive = isActive;
        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("assignment-config")]
    public async Task<IActionResult> GetConfig([FromQuery] Guid? institutionId)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin && !userInstitutionId.HasValue) return Forbid();
        var config = await _autoAssignmentService.GetConfigAsync(isSuperAdmin ? institutionId : userInstitutionId);
        return Ok(config);
    }

    [HttpPut("assignment-config")]
    public async Task<IActionResult> UpdateConfig([FromBody] AutoAssignmentConfigDto dto)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin && !userInstitutionId.HasValue) return Forbid();
        if (!isSuperAdmin) dto.InstitutionId = userInstitutionId;
        var updated = await _autoAssignmentService.UpdateConfigAsync(dto);
        return Ok(updated);
    }

    [HttpPost("match-simulator")]
    public async Task<IActionResult> SimulateMatch([FromBody] LeadMatchCriteriaDto criteria)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin && !userInstitutionId.HasValue) return Forbid();
        if (!isSuperAdmin) criteria.InstitutionId = userInstitutionId;
        var candidates = await _autoAssignmentService.PreviewMatchesAsync(criteria);
        return Ok(candidates);
    }

    [HttpPost("auto-assign-unassigned")]
    public async Task<IActionResult> BatchAutoAssign([FromQuery] Guid? institutionId)
    {
        int count = await _autoAssignmentService.AutoAssignUnassignedLeadsAsync(institutionId);
        return Ok(new { AssignedCount = count, Message = $"Successfully auto-assigned {count} unassigned leads." });
    }
}
