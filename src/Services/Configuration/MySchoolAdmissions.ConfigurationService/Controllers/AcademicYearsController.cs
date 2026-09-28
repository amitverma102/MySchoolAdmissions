using MySchoolAdmissions.ConfigurationService.Data;
using MySchoolAdmissions.ConfigurationService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.ConfigurationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AcademicYearsController : ControllerBase
{
    private readonly ConfigurationDbContext _context;

    public AcademicYearsController(ConfigurationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AcademicYear>>> GetAcademicYears()
    {
        return await _context.AcademicYears.OrderBy(x => x.StartDate).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AcademicYear>> GetAcademicYear(Guid id)
    {
        var academicYear = await _context.AcademicYears.FindAsync(id);

        if (academicYear == null)
        {
            return NotFound();
        }

        return academicYear;
    }

    [HttpPost]
    public async Task<ActionResult<AcademicYear>> PostAcademicYear(AcademicYear academicYear)
    {
        if (academicYear.Id == Guid.Empty)
            academicYear.Id = Guid.NewGuid();

        _context.AcademicYears.Add(academicYear);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAcademicYear), new { id = academicYear.Id }, academicYear);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutAcademicYear(Guid id, AcademicYear academicYear)
    {
        if (id != academicYear.Id)
        {
            return BadRequest();
        }

        _context.Entry(academicYear).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!AcademicYearExists(id))
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
    public async Task<IActionResult> DeleteAcademicYear(Guid id)
    {
        var academicYear = await _context.AcademicYears.FindAsync(id);
        if (academicYear == null)
        {
            return NotFound();
        }

        _context.AcademicYears.Remove(academicYear);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool AcademicYearExists(Guid id)
    {
        return _context.AcademicYears.Any(e => e.Id == id);
    }
}
