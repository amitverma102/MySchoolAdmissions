using MySchoolAdmissions.IdentityService.Data;
using MySchoolAdmissions.IdentityService.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.IdentityService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RolesController : ControllerBase
{
    private readonly IdentityDbContext _context;

    public RolesController(IdentityDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await _context.Roles.OrderBy(r => r.Name).ToListAsync();
        return Ok(roles);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRole([FromBody] Role model)
    {
        if (await _context.Roles.AnyAsync(r => r.Name == model.Name))
        {
            return BadRequest(new { Message = "Role already exists." });
        }

        model.Id = Guid.NewGuid();
        _context.Roles.Add(model);
        await _context.SaveChangesAsync();
        
        return CreatedAtAction(nameof(GetRoles), new { id = model.Id }, model);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRole(Guid id)
    {
        var role = await _context.Roles.FindAsync(id);
        if (role == null) return NotFound();

        // Ensure we don't delete built-in roles
        var builtInRoles = new[] { 
            "11111111-1111-1111-1111-111111111111", 
            "22222222-2222-2222-2222-222222222222", 
            "33333333-3333-3333-3333-333333333333" 
        };
        
        if (builtInRoles.Contains(id.ToString()))
        {
            return BadRequest(new { Message = "Cannot delete built-in system roles." });
        }

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
