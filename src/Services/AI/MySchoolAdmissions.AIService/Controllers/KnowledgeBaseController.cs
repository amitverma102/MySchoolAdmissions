using MySchoolAdmissions.AIService.Data;
using MySchoolAdmissions.AIService.Models;
using MySchoolAdmissions.AIService.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace MySchoolAdmissions.AIService.Controllers;

public class SearchKnowledgeRequestDto
{
    public string Query { get; set; } = string.Empty;
    public string? SchoolName { get; set; }
    public int TopK { get; set; } = 4;
}

public class TextIngestRequestDto
{
    public string Content { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string InstitutionName { get; set; } = "General";
    public Guid? InstitutionId { get; set; }
    public string DocumentType { get; set; } = "Prospectus";
}

[ApiController]
[Route("api/ai/knowledge")]
public class KnowledgeBaseController : ControllerBase
{
    private readonly AIDbContext _dbContext;
    private readonly DocumentIngestionService _ingestionService;
    private readonly IEmbeddingService _embeddingService;
    private readonly ILogger<KnowledgeBaseController> _logger;

    public KnowledgeBaseController(
        AIDbContext dbContext,
        DocumentIngestionService ingestionService,
        IEmbeddingService embeddingService,
        ILogger<KnowledgeBaseController> logger)
    {
        _dbContext = dbContext;
        _ingestionService = ingestionService;
        _embeddingService = embeddingService;
        _logger = logger;
    }

    private (bool isSuperAdmin, Guid? institutionId) GetUserContext()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeader)) return (false, null);
        try
        {
            var token = authHeader.ToString().Replace("Bearer ", string.Empty, StringComparison.OrdinalIgnoreCase).Trim();
            var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
            var isSuperAdmin = jwt.Claims.Any(c =>
                (c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role") &&
                c.Value.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));
            var claim = jwt.Claims.FirstOrDefault(c => c.Type.Equals("institutionId", StringComparison.OrdinalIgnoreCase) || c.Type.Equals("institution_id", StringComparison.OrdinalIgnoreCase));
            return (isSuperAdmin, Guid.TryParse(claim?.Value, out var id) ? id : null);
        }
        catch { return (false, null); }
    }

    private Guid? GetSelectedInstitutionId()
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin) return userInstitutionId;
        if (Request.Headers.TryGetValue("X-Tenant-Id", out var tenant) && Guid.TryParse(tenant, out var tenantId)) return tenantId;
        if (Request.Headers.TryGetValue("X-Institution-Id", out var institution) && Guid.TryParse(institution, out var institutionId)) return institutionId;
        return null;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var institutionId = GetSelectedInstitutionId();
        if (!institutionId.HasValue && !GetUserContext().isSuperAdmin) return Forbid();
        var docCount = await _dbContext.KnowledgeDocuments.CountAsync(d => !institutionId.HasValue || d.InstitutionId == institutionId.Value);
        var chunkCount = await _dbContext.KnowledgeChunks.CountAsync(c => !institutionId.HasValue || c.InstitutionId == institutionId.Value);

        return Ok(new
        {
            totalDocuments = docCount,
            totalChunks = chunkCount,
            vectorDimensions = 768,
            embeddingProvider = _embeddingService.ProviderName,
            status = "Online"
        });
    }

    [HttpGet("documents")]
    public async Task<IActionResult> GetDocuments()
    {
        var institutionId = GetSelectedInstitutionId();
        if (!institutionId.HasValue && !GetUserContext().isSuperAdmin) return Forbid();
        var docs = await _dbContext.KnowledgeDocuments
            .Where(d => !institutionId.HasValue || d.InstitutionId == institutionId.Value)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new
            {
                d.Id,
                d.Title,
                d.InstitutionName,
                d.DocumentType,
                d.FileName,
                d.FileSizeBytes,
                d.ChunkCount,
                d.CreatedAt,
                d.UpdatedAt
            })
            .ToListAsync();

        return Ok(docs);
    }

    [HttpPost("sync-institutions")]
    public async Task<IActionResult> SyncInstitutions()
    {
        if (!GetUserContext().isSuperAdmin) return Forbid();
        var chunksCount = await _ingestionService.SyncInstitutionsAsync();
        return Ok(new
        {
            message = "Institution catalog & showcase profiles successfully ingested into vector store.",
            chunksSynced = chunksCount,
            embeddingModel = _embeddingService.ProviderName
        });
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadDocument(
        [FromForm] IFormFile file,
        [FromForm] string? title,
        [FromForm] string? institutionName,
        [FromForm] Guid? institutionId,
        [FromForm] string? documentType)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Please provide a valid file to upload.");
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".pdf" && ext != ".txt" && ext != ".md")
        {
            return BadRequest("Supported file formats are: .pdf, .txt, .md");
        }

        using var stream = file.OpenReadStream();
        var selectedInstitutionId = GetSelectedInstitutionId();
        if (!selectedInstitutionId.HasValue) return Forbid();
        var result = await _ingestionService.IngestFileStreamAsync(
            stream,
            file.FileName,
            title ?? file.FileName,
            institutionName ?? "General",
            selectedInstitutionId,
            documentType ?? "Prospectus");

        return Ok(result);
    }

    [HttpPost("ingest-text")]
    public async Task<IActionResult> IngestText([FromBody] TextIngestRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest("Content cannot be empty.");
        }

        var fileName = $"{request.Title.Replace(" ", "_")}.txt";
        var selectedInstitutionId = GetSelectedInstitutionId();
        if (!selectedInstitutionId.HasValue) return Forbid();
        var result = await _ingestionService.IngestRawTextAsync(
            request.Content,
            fileName,
            request.Title,
            request.InstitutionName,
            selectedInstitutionId,
            request.DocumentType);

        return Ok(result);
    }

    [HttpPost("search")]
    public async Task<IActionResult> SearchKnowledge([FromBody] SearchKnowledgeRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
        {
            return BadRequest("Query cannot be empty.");
        }

        var queryVector = await _embeddingService.GenerateEmbeddingAsync(request.Query);
        var query = _dbContext.KnowledgeChunks.AsNoTracking();
        var selectedInstitutionId = GetSelectedInstitutionId();
        if (!selectedInstitutionId.HasValue && !GetUserContext().isSuperAdmin) return Forbid();
        if (selectedInstitutionId.HasValue) query = query.Where(c => c.InstitutionId == selectedInstitutionId.Value);

        if (!string.IsNullOrWhiteSpace(request.SchoolName))
        {
            query = query.Where(c => c.InstitutionName.ToLower().Contains(request.SchoolName.ToLower()));
        }

        var results = await query
            .Where(c => c.Embedding != null)
            .OrderBy(c => c.Embedding!.CosineDistance(queryVector))
            .Take(request.TopK > 0 ? request.TopK : 4)
            .Select(c => new
            {
                c.Id,
                c.DocumentTitle,
                c.InstitutionName,
                c.DocumentType,
                c.ChunkIndex,
                c.Content,
                Distance = c.Embedding!.CosineDistance(queryVector)
            })
            .ToListAsync();

        return Ok(new
        {
            query = request.Query,
            provider = _embeddingService.ProviderName,
            results = results
        });
    }

    [HttpDelete("documents/{id}")]
    public async Task<IActionResult> DeleteDocument(Guid id)
    {
        var doc = await _dbContext.KnowledgeDocuments.FindAsync(id);
        if (doc == null)
        {
            return NotFound();
        }

        var selectedInstitutionId = GetSelectedInstitutionId();
        if (!GetUserContext().isSuperAdmin && doc.InstitutionId != selectedInstitutionId) return Forbid();
        if (GetUserContext().isSuperAdmin && selectedInstitutionId.HasValue && doc.InstitutionId != selectedInstitutionId) return Forbid();

        _dbContext.KnowledgeDocuments.Remove(doc);
        await _dbContext.SaveChangesAsync();
        return Ok(new { message = "Document and associated vector chunks removed." });
    }
}
