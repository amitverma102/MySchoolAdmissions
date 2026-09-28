using MySchoolAdmissions.ConfigurationService.Data;
using MySchoolAdmissions.ConfigurationService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.ConfigurationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LeadSourcesController : ControllerBase
{
    private readonly ConfigurationDbContext _context;

    public LeadSourcesController(ConfigurationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LeadSource>>> GetLeadSources()
    {
        return await _context.LeadSources.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<LeadSource>> GetLeadSource(Guid id)
    {
        var leadSource = await _context.LeadSources.FindAsync(id);

        if (leadSource == null)
        {
            return NotFound();
        }

        return leadSource;
    }

    [HttpPost]
    public async Task<ActionResult<LeadSource>> PostLeadSource(LeadSource leadSource)
    {
        if (leadSource.Id == Guid.Empty)
            leadSource.Id = Guid.NewGuid();

        _context.LeadSources.Add(leadSource);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetLeadSource), new { id = leadSource.Id }, leadSource);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutLeadSource(Guid id, LeadSource leadSource)
    {
        if (id != leadSource.Id)
        {
            return BadRequest();
        }

        _context.Entry(leadSource).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!LeadSourceExists(id))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLeadSource(Guid id)
    {
        var leadSource = await _context.LeadSources.FindAsync(id);
        if (leadSource == null)
        {
            return NotFound();
        }

        _context.LeadSources.Remove(leadSource);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool LeadSourceExists(Guid id)
    {
        return _context.LeadSources.Any(e => e.Id == id);
    }
}
