using MySchoolAdmissions.ConfigurationService.Data;
using MySchoolAdmissions.ConfigurationService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.ConfigurationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GradesController : ControllerBase
{
    private readonly ConfigurationDbContext _context;

    public GradesController(ConfigurationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Grade>>> GetGrades()
    {
        return await _context.Grades.OrderBy(g => g.Order).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Grade>> GetGrade(Guid id)
    {
        var grade = await _context.Grades.FindAsync(id);

        if (grade == null)
        {
            return NotFound();
        }

        return grade;
    }

    [HttpPost]
    public async Task<ActionResult<Grade>> PostGrade(Grade grade)
    {
        if (grade.Id == Guid.Empty)
            grade.Id = Guid.NewGuid();

        _context.Grades.Add(grade);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGrade), new { id = grade.Id }, grade);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> PutGrade(Guid id, Grade grade)
    {
        if (id != grade.Id)
        {
            return BadRequest();
        }

        _context.Entry(grade).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!GradeExists(id))
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
    public async Task<IActionResult> DeleteGrade(Guid id)
    {
        var grade = await _context.Grades.FindAsync(id);
        if (grade == null)
        {
            return NotFound();
        }

        _context.Grades.Remove(grade);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool GradeExists(Guid id)
    {
        return _context.Grades.Any(e => e.Id == id);
    }
}
