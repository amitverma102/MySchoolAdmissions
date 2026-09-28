using MySchoolAdmissions.ConfigurationService.Data;
using MySchoolAdmissions.ConfigurationService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.ConfigurationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CampaignTypesController : ControllerBase
{
    private readonly ConfigurationDbContext _context;

    public CampaignTypesController(ConfigurationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CampaignType>>> GetCampaignTypes()
    {
        return await _context.CampaignTypes.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CampaignType>> GetCampaignType(Guid id)
    {
        var campaignType = await _context.CampaignTypes.FindAsync(id);

        if (campaignType == null)
        {
            return NotFound();
        }

        return campaignType;
    }

    [HttpPost]
    public async Task<ActionResult<CampaignType>> PostCampaignType(CampaignType campaignType)
    {
        if (campaignType.Id == Guid.Empty)
            campaignType.Id = Guid.NewGuid();

        _context.CampaignTypes.Add(campaignType);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCampaignType), new { id = campaignType.Id }, campaignType);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutCampaignType(Guid id, CampaignType campaignType)
    {
        if (id != campaignType.Id)
        {
            return BadRequest();
        }

        _context.Entry(campaignType).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!CampaignTypeExists(id))
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
    public async Task<IActionResult> DeleteCampaignType(Guid id)
    {
        var campaignType = await _context.CampaignTypes.FindAsync(id);
        if (campaignType == null)
        {
            return NotFound();
        }

        _context.CampaignTypes.Remove(campaignType);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool CampaignTypeExists(Guid id)
    {
        return _context.CampaignTypes.Any(e => e.Id == id);
    }
}
