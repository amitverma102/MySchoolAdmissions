using MySchoolAdmissions.IdentityService.Data;
using MySchoolAdmissions.IdentityService.DTOs;
using MySchoolAdmissions.IdentityService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace MySchoolAdmissions.IdentityService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IdentityDbContext _context;

    public UsersController(IdentityDbContext context)
    {
        _context = context;
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

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] Guid? institutionId)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin && !userInstitutionId.HasValue)
            return Ok(Array.Empty<object>());

        var query = _context.Users.AsQueryable();
        if (!isSuperAdmin)
            query = query.Where(u => u.InstitutionId == userInstitutionId.GetValueOrDefault());
        else if (institutionId.HasValue)
            query = query.Where(u => u.InstitutionId == institutionId.Value);

        var users = await query
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                u.InstitutionId,
                u.CampusId,
                u.IsActive,
                Roles = u.UserRoles.Select(ur => ur.Role.Name)
            })
            .ToListAsync();
        return Ok(users);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto model)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin && !userInstitutionId.HasValue) return Forbid();
        if (!isSuperAdmin) model.InstitutionId = userInstitutionId;

        var normalizedEmail = model.Email?.Trim().ToLowerInvariant() ?? string.Empty;

        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail))
        {
            return BadRequest(new { Message = "User already exists with this email." });
        }

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == model.RoleName);
        if (role == null)
        {
            return BadRequest(new { Message = $"Role '{model.RoleName}' does not exist." });
        }

        var user = new User
        {
            Email = normalizedEmail,
            FirstName = model.FirstName,
            LastName = model.LastName,
            InstitutionId = model.InstitutionId,
            CampusId = model.CampusId,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password)
        };

        _context.Users.Add(user);

        var userRole = new UserRole
        {
            UserId = user.Id,
            RoleId = role.Id
        };

        _context.UserRoles.Add(userRole);

        await _context.SaveChangesAsync();

        return Created("", new { Message = "User created successfully", UserId = user.Id });
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> ToggleUserStatus(Guid id, [FromBody] bool isActive)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin && (!userInstitutionId.HasValue || user.InstitutionId != userInstitutionId.Value)) return Forbid();

        user.IsActive = isActive;
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
