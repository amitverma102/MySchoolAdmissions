using MySchoolAdmissions.ReportingService.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace MySchoolAdmissions.ReportingService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly ReportingDbContext _context;

    public DashboardController(ReportingDbContext context)
    {
        _context = context;
    }

    private bool IsSuperAdmin()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeader)) return false;
        try
        {
            var token = authHeader.ToString().Replace("Bearer ", string.Empty, StringComparison.OrdinalIgnoreCase).Trim();
            var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
            return jwt.Claims.Any(c =>
                (c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role") &&
                c.Value.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));
        }
        catch { return false; }
    }

    [HttpGet]
    public async Task<IActionResult> GetDashboardData()
    {
        if (!IsSuperAdmin())
        {
            return Ok(new
            {
                Metrics = new Models.DashboardMetrics { Id = 1 },
                RecentActivities = Array.Empty<object>()
            });
        }

        var metrics = await _context.Metrics.FirstOrDefaultAsync(m => m.Id == 1);
        if (metrics == null)
        {
            metrics = new Models.DashboardMetrics { Id = 1 };
        }

        var activities = await _context.Activities
            .OrderByDescending(a => a.Timestamp)
            .Take(10)
            .ToListAsync();

        return Ok(new
        {
            Metrics = metrics,
            RecentActivities = activities
        });
    }
}
