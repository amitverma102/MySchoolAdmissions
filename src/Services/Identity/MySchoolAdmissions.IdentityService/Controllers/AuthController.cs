using MySchoolAdmissions.IdentityService.Data;
using MySchoolAdmissions.IdentityService.DTOs;
using MySchoolAdmissions.IdentityService.Models;
using MySchoolAdmissions.IdentityService.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.IdentityService.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IdentityDbContext _context;
    private readonly IJwtTokenGenerator _tokenGenerator;

    public AuthController(IdentityDbContext context, IJwtTokenGenerator tokenGenerator)
    {
        _context = context;
        _tokenGenerator = tokenGenerator;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto model)
    {
        var normalizedEmail = model.Email?.Trim().ToLowerInvariant() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return BadRequest(new { Message = "Email address is required." });
        }

        if (string.IsNullOrWhiteSpace(model.Password) || model.Password.Length < 6)
        {
            return BadRequest(new { Message = "Password must be at least 6 characters long." });
        }

        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail))
        {
            return BadRequest(new { Message = "An account with this email address already exists." });
        }

        // Module constraint: accounts created via this module are strictly Parent or Student only
        var requestedRole = (model.Role ?? "Parent").Trim();
        var targetRoleName = requestedRole.Equals("Student", StringComparison.OrdinalIgnoreCase) 
            ? "Student" 
            : "Parent";

        var targetRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == targetRoleName);
        if (targetRole == null)
        {
            targetRole = new Role
            {
                Id = Guid.NewGuid(),
                Name = targetRoleName,
                Description = targetRoleName == "Student" ? "Student Applicant Account" : "Parent / Guardian Account"
            };
            _context.Roles.Add(targetRole);
            await _context.SaveChangesAsync();
        }

        var user = new User
        {
            Email = normalizedEmail,
            FirstName = model.FirstName?.Trim() ?? string.Empty,
            LastName = model.LastName?.Trim() ?? string.Empty,
            // Self-registration must never grant an institution tenant claim.
            InstitutionId = null,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(model.Password),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var userRole = new UserRole
        {
            UserId = user.Id,
            RoleId = targetRole.Id
        };
        _context.UserRoles.Add(userRole);
        await _context.SaveChangesAsync();

        var roles = new List<string> { targetRole.Name };
        var token = _tokenGenerator.GenerateToken(user, roles);

        return Ok(new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Roles = roles,
            InstitutionId = user.InstitutionId
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto model)
    {
        var normalizedEmail = model.Email?.Trim().ToLowerInvariant() ?? string.Empty;

        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        if (user == null || !BCrypt.Net.BCrypt.Verify(model.Password, user.PasswordHash))
        {
            return Unauthorized(new { Message = "Invalid credentials" });
        }

        if (!user.IsActive)
        {
            return Unauthorized(new { Message = "User is inactive" });
        }

        if (user.InstitutionId.HasValue)
        {
            var instStatus = await _context.TenantStatuses.FindAsync(user.InstitutionId.Value);
            if (instStatus != null && !instStatus.IsActive)
            {
                return Unauthorized(new { Message = "Institution is disabled" });
            }
        }

        if (user.CampusId.HasValue)
        {
            var campusStatus = await _context.TenantStatuses.FindAsync(user.CampusId.Value);
            if (campusStatus != null && !campusStatus.IsActive)
            {
                return Unauthorized(new { Message = "Campus is disabled" });
            }
        }

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var token = _tokenGenerator.GenerateToken(user, roles);

        return Ok(new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Roles = roles,
            InstitutionId = user.InstitutionId
        });
    }
}
