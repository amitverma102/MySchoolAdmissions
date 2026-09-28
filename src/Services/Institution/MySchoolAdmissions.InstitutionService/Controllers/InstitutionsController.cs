using MySchoolAdmissions.InstitutionService.Data;
using MySchoolAdmissions.InstitutionService.Models;
using MySchoolAdmissions.EventBus.Events;
using MassTransit;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace MySchoolAdmissions.InstitutionService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InstitutionsController : ControllerBase
{
    private readonly InstitutionDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;

    public InstitutionsController(InstitutionDbContext context, IPublishEndpoint publishEndpoint)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
    }

    private (bool isSuperAdmin, Guid? institutionId) GetUserContext()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            return (false, null);

        var token = authHeader.ToString().Replace("Bearer ", string.Empty, StringComparison.OrdinalIgnoreCase).Trim();
        try
        {
            var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
            var isSuperAdmin = jwt.Claims.Any(c =>
                (c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role") &&
                c.Value.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));
            var institutionClaim = jwt.Claims.FirstOrDefault(c =>
                c.Type.Equals("institutionId", StringComparison.OrdinalIgnoreCase) ||
                c.Type.Equals("institution_id", StringComparison.OrdinalIgnoreCase));

            return (isSuperAdmin, Guid.TryParse(institutionClaim?.Value, out var institutionId) ? institutionId : null);
        }
        catch
        {
            return (false, null);
        }
    }

    private bool CanAccessInstitution(Guid institutionId)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        return isSuperAdmin || userInstitutionId == institutionId;
    }

    [HttpGet]
    public async Task<IActionResult> GetInstitutions()
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin && !userInstitutionId.HasValue)
            return Ok(Array.Empty<Institution>());

        var query = _context.Institutions.Include(i => i.Campuses).AsQueryable();
        if (!isSuperAdmin)
            query = query.Where(i => i.Id == userInstitutionId.GetValueOrDefault());

        var institutions = await query.ToListAsync();
        return Ok(institutions);
    }

    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicInstitutions()
    {
        var institutions = await _context.Institutions
            .Where(i => i.IsActive)
            .Include(i => i.Campuses.Where(c => c.IsActive))
            .ToListAsync();
        return Ok(institutions);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetInstitution(Guid id)
    {
        if (!CanAccessInstitution(id)) return Forbid();

        var institution = await _context.Institutions
            .Include(i => i.Campuses)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (institution == null) return NotFound();
        return Ok(institution);
    }

    [HttpPost]
    public async Task<IActionResult> CreateInstitution([FromBody] Institution institution)
    {
        if (!GetUserContext().isSuperAdmin) return Forbid();

        _context.Institutions.Add(institution);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetInstitution), new { id = institution.Id }, institution);
    }

    [HttpPost("{id}/campuses")]
    public async Task<IActionResult> AddCampus(Guid id, [FromBody] Campus campus)
    {
        if (!CanAccessInstitution(id)) return Forbid();

        var institution = await _context.Institutions.FindAsync(id);
        if (institution == null) return NotFound();

        campus.InstitutionId = id;
        _context.Campuses.Add(campus);
        await _context.SaveChangesAsync();

        return Ok(campus);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> ToggleInstitutionStatus(Guid id, [FromBody] bool isActive)
    {
        if (!CanAccessInstitution(id)) return Forbid();

        var institution = await _context.Institutions.FindAsync(id);
        if (institution == null) return NotFound();

        institution.IsActive = isActive;
        await _context.SaveChangesAsync();

        await _publishEndpoint.Publish(new InstitutionStatusChangedEvent
        {
            InstitutionId = id,
            IsActive = isActive
        });

        return NoContent();
    }

    [HttpPut("{institutionId}/campuses/{campusId}/status")]
    public async Task<IActionResult> ToggleCampusStatus(Guid institutionId, Guid campusId, [FromBody] bool isActive)
    {
        if (!CanAccessInstitution(institutionId)) return Forbid();

        var campus = await _context.Campuses.FirstOrDefaultAsync(c => c.Id == campusId && c.InstitutionId == institutionId);
        if (campus == null) return NotFound();

        campus.IsActive = isActive;
        await _context.SaveChangesAsync();

        await _publishEndpoint.Publish(new CampusStatusChangedEvent
        {
            CampusId = campusId,
            IsActive = isActive
        });

        return NoContent();
    }
}
