using MySchoolAdmissions.ApplicationService.Data;
using MySchoolAdmissions.ApplicationService.Models;
using MySchoolAdmissions.Core.Storage;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace MySchoolAdmissions.ApplicationService.Controllers;

public class UploadDocumentDto
{
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string Description { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string? ContentBase64 { get; set; }
    public Guid? InstitutionId { get; set; }
}

[ApiController]
[Route("api/applications/documents")]
public class TenantDocumentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly ITenantStorageService _tenantStorage;

    private static readonly Guid DisId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
    private static readonly Guid SvisId = Guid.Parse("a48d7782-dda9-42ad-b21a-046d517f1ce5");

    public TenantDocumentsController(
        ApplicationDbContext context,
        IWebHostEnvironment env,
        ITenantStorageService tenantStorage)
    {
        _context = context;
        _env = env;
        _tenantStorage = tenantStorage;
    }

    private (bool isSuperAdmin, Guid? userInstitutionId) GetUserContext()
    {
        if (Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            var tokenStr = authHeader.ToString();
            if (tokenStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                tokenStr = tokenStr.Substring("Bearer ".Length).Trim();
            }

            try
            {
                var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                if (handler.CanReadToken(tokenStr))
                {
                    var jwt = handler.ReadJwtToken(tokenStr);
                    var isSuper = jwt.Claims.Any(c =>
                        (c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
                        && c.Value.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));

                    Guid? instId = null;
                    var instClaim = jwt.Claims.FirstOrDefault(c =>
                        c.Type.Equals("institutionId", StringComparison.OrdinalIgnoreCase) ||
                        c.Type.Equals("institution_id", StringComparison.OrdinalIgnoreCase));

                    if (instClaim != null && Guid.TryParse(instClaim.Value, out var parsedGuid))
                    {
                        instId = parsedGuid;
                    }

                    return (isSuper, instId);
                }
            }
            catch
            {
            }
        }

        return (false, null);
    }

    private Guid ResolveInstitutionId(Guid? requestedId)
    {
        var (isSuperAdmin, userInstId) = GetUserContext();

        // NON-SUPERADMIN: STRICTLY LOCKED TO THEIR OWN INSTITUTION REPOSITORY!
        if (!isSuperAdmin && userInstId.HasValue)
        {
            return userInstId.Value;
        }

        if (!isSuperAdmin)
        {
            return Guid.Empty;
        }

        if (requestedId.HasValue && requestedId.Value != Guid.Empty)
            return requestedId.Value;

        if (Request.Headers.TryGetValue("X-Tenant-Id", out var tenantH) && Guid.TryParse(tenantH, out var parsedTenant))
            return parsedTenant;

        if (Request.Headers.TryGetValue("X-Institution-Id", out var instH) && Guid.TryParse(instH, out var parsedInst))
            return parsedInst;

        return DisId;
    }

    [HttpGet]
    public async Task<IActionResult> GetTenantDocuments([FromQuery] Guid? institutionId = null, [FromQuery] string? category = null)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin && !userInstitutionId.HasValue) return Forbid();
        var tenantId = ResolveInstitutionId(institutionId);

        // Ensure database table exists
        await _context.Database.EnsureCreatedAsync();

        // Seed tenant-specific documents if empty for this tenant
        var existingCount = await _context.TenantDocuments.CountAsync(d => d.InstitutionId == tenantId);
        if (existingCount == 0)
        {
            await SeedTenantDocumentsAsync(tenantId);
        }

        var query = _context.TenantDocuments
            .Where(d => d.InstitutionId == tenantId && !d.IsArchived)
            .OrderByDescending(d => d.UploadedAt)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(d => d.Category == category);
        }

        var docs = await query.ToListAsync();
        return Ok(docs);
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadTenantDocument([FromBody] UploadDocumentDto dto)
    {
        var tenantId = ResolveInstitutionId(dto.InstitutionId);

        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest(new { Message = "Document title is required." });
        }

        var fileName = string.IsNullOrWhiteSpace(dto.FileName)
            ? $"{dto.Title.Replace(" ", "_")}.pdf"
            : dto.FileName;

        var ext = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(ext)) ext = ".pdf";

        byte[] fileBytes;
        if (!string.IsNullOrWhiteSpace(dto.ContentBase64))
        {
            try
            {
                fileBytes = Convert.FromBase64String(dto.ContentBase64);
            }
            catch
            {
                fileBytes = Encoding.UTF8.GetBytes($"Official School Document: {dto.Title}\nTenant ID: {tenantId}\nUploaded: {DateTime.UtcNow}");
            }
        }
        else
        {
            fileBytes = Encoding.UTF8.GetBytes($"Official School Document: {dto.Title}\nTenant ID: {tenantId}\nUploaded: {DateTime.UtcNow}");
        }

        var mimeType = ext.ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".csv" => "text/csv",
            _ => "application/octet-stream"
        };

        // Upload to institution's independent Azure Blob Container (tenant-{tenantId})
        var uploadResult = await _tenantStorage.UploadTenantFileBytesAsync(
            tenantId,
            fileName,
            fileBytes,
            mimeType,
            "documents");

        var doc = new TenantDocument
        {
            InstitutionId = tenantId,
            Title = dto.Title.Trim(),
            Category = string.IsNullOrWhiteSpace(dto.Category) ? "General" : dto.Category.Trim(),
            Description = dto.Description?.Trim() ?? string.Empty,
            FileName = fileName,
            FileExtension = ext.ToLowerInvariant(),
            FileSizeBytes = uploadResult.FileSizeBytes > 0 ? uploadResult.FileSizeBytes : fileBytes.Length,
            StoragePath = uploadResult.StoragePath,
            FileUrl = uploadResult.BlobUrl,
            UploadedBy = "School Administration",
            UploadedAt = DateTime.UtcNow,
            IsVerified = true
        };

        _context.TenantDocuments.Add(doc);
        await _context.SaveChangesAsync();

        return Ok(doc);
    }

    [HttpGet("{id}/sas-url")]
    public async Task<IActionResult> GetDocumentSasUrl(Guid id)
    {
        var doc = await _context.TenantDocuments.FindAsync(id);
        if (doc == null) return NotFound();

        var (isSuperAdmin, userInstId) = GetUserContext();
        if (!isSuperAdmin && (!userInstId.HasValue || doc.InstitutionId != userInstId.Value))
        {
            return Forbid();
        }

        var sasUri = await _tenantStorage.GetTenantFileSasUriAsync(
            doc.InstitutionId,
            doc.StoragePath,
            TimeSpan.FromHours(2),
            "documents");

        return Ok(new
        {
            DocumentId = doc.Id,
            FileName = doc.FileName,
            SasUrl = sasUri,
            ExpiresInMinutes = 120,
            InstitutionId = doc.InstitutionId,
            Container = _tenantStorage.GetTenantContainerName(doc.InstitutionId)
        });
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> DownloadDocument(Guid id)
    {
        var doc = await _context.TenantDocuments.FindAsync(id);
        if (doc == null) return NotFound();

        var (isSuperAdmin, userInstId) = GetUserContext();
        if (!isSuperAdmin && (!userInstId.HasValue || doc.InstitutionId != userInstId.Value))
        {
            return Forbid();
        }

        var downloadResult = await _tenantStorage.DownloadTenantFileAsync(
            doc.InstitutionId,
            doc.StoragePath,
            "documents");

        if (downloadResult == null)
        {
            return NotFound("File not found in institution storage container.");
        }

        return File(downloadResult.ContentStream, downloadResult.ContentType, doc.FileName);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDocument(Guid id)
    {
        var doc = await _context.TenantDocuments.FindAsync(id);
        if (doc == null) return NotFound();

        var (isSuperAdmin, userInstId) = GetUserContext();
        if (!isSuperAdmin && (!userInstId.HasValue || doc.InstitutionId != userInstId.Value))
        {
            return Forbid();
        }

        _context.TenantDocuments.Remove(doc);
        await _context.SaveChangesAsync();

        // Remove from institution's independent Azure Blob Container
        await _tenantStorage.DeleteTenantFileAsync(doc.InstitutionId, doc.StoragePath, "documents");

        return Ok(new { Message = "Document deleted successfully from institution container." });
    }

    private async Task SeedTenantDocumentsAsync(Guid tenantId)
    {
        var basePath = Path.Combine(Directory.GetCurrentDirectory(), "storage", "tenants", tenantId.ToString(), "documents");
        Directory.CreateDirectory(basePath);

        if (tenantId == DisId)
        {
            // Seed DIS Repository
            var disDocs = new List<TenantDocument>
            {
                new TenantDocument
                {
                    InstitutionId = DisId,
                    Title = "DIS Annual Academic Prospectus & Campus Guide 2026-27",
                    Category = "Prospectus & Brochures",
                    FileName = "DIS_Prospectus_2026_27.pdf",
                    FileExtension = ".pdf",
                    FileSizeBytes = 4194304, // 4 MB
                    StoragePath = Path.Combine(basePath, "DIS_Prospectus_2026_27.pdf"),
                    FileUrl = $"/storage/tenants/{DisId}/documents/DIS_Prospectus_2026_27.pdf",
                    Description = "Official comprehensive curriculum, faculty directory, and campus infrastructure prospectus.",
                    UploadedBy = "DIS Admissions Cell",
                    UploadedAt = DateTime.UtcNow.AddDays(-14)
                },
                new TenantDocument
                {
                    InstitutionId = DisId,
                    Title = "DIS Tuition Fee Schedule & 10% Sibling Concession Policy",
                    Category = "Fee Structure & Policies",
                    FileName = "DIS_Fee_Concession_Policy_2026.pdf",
                    FileExtension = ".pdf",
                    FileSizeBytes = 1048576, // 1 MB
                    StoragePath = Path.Combine(basePath, "DIS_Fee_Concession_Policy_2026.pdf"),
                    FileUrl = $"/storage/tenants/{DisId}/documents/DIS_Fee_Concession_Policy_2026.pdf",
                    Description = "Approved annual fee circular detailing installment schedule, security deposit, and sibling concession rules.",
                    UploadedBy = "DIS Finance & Bursar Office",
                    UploadedAt = DateTime.UtcNow.AddDays(-10)
                },
                new TenantDocument
                {
                    InstitutionId = DisId,
                    Title = "CBSE Senior Secondary Affiliation Renewal & Fire Safety NOC",
                    Category = "Affiliation & Compliance",
                    FileName = "CBSE_Affiliation_Approval_DIS.pdf",
                    FileExtension = ".pdf",
                    FileSizeBytes = 2097152, // 2 MB
                    StoragePath = Path.Combine(basePath, "CBSE_Affiliation_Approval_DIS.pdf"),
                    FileUrl = $"/storage/tenants/{DisId}/documents/CBSE_Affiliation_Approval_DIS.pdf",
                    Description = "Central Board of Secondary Education permanent affiliation letter and municipal building clearance.",
                    UploadedBy = "DIS Legal Compliance Cell",
                    UploadedAt = DateTime.UtcNow.AddDays(-30)
                },
                new TenantDocument
                {
                    InstitutionId = DisId,
                    Title = "Mandatory Student Medical Fitness & Immunization Checklist",
                    Category = "Admission Guidelines",
                    FileName = "Student_Medical_Clearance_Form.pdf",
                    FileExtension = ".pdf",
                    FileSizeBytes = 524288, // 512 KB
                    StoragePath = Path.Combine(basePath, "Student_Medical_Clearance_Form.pdf"),
                    FileUrl = $"/storage/tenants/{DisId}/documents/Student_Medical_Clearance_Form.pdf",
                    Description = "Required medical fitness certificate to be completed by registered pediatrician prior to class commencement.",
                    UploadedBy = "DIS Infirmary & Health Unit",
                    UploadedAt = DateTime.UtcNow.AddDays(-5)
                }
            };

            _context.TenantDocuments.AddRange(disDocs);
            await _context.SaveChangesAsync();
        }
        else if (tenantId == SvisId)
        {
            // Seed SVIS Repository (Completely separated!)
            var svisDocs = new List<TenantDocument>
            {
                new TenantDocument
                {
                    InstitutionId = SvisId,
                    Title = "SVIS Comprehensive Academic & Pedagogical Handbook 2026-27",
                    Category = "Prospectus & Brochures",
                    FileName = "SVIS_Academic_Handbook_2026.pdf",
                    FileExtension = ".pdf",
                    FileSizeBytes = 3670016, // 3.5 MB
                    StoragePath = Path.Combine(basePath, "SVIS_Academic_Handbook_2026.pdf"),
                    FileUrl = $"/storage/tenants/{SvisId}/documents/SVIS_Academic_Handbook_2026.pdf",
                    Description = "Sri Venkateshwara International School holistic learning pathways, laboratories, and arts framework.",
                    UploadedBy = "SVIS Principal Office",
                    UploadedAt = DateTime.UtcNow.AddDays(-12)
                },
                new TenantDocument
                {
                    InstitutionId = SvisId,
                    Title = "SVIS Fee Schedule, Transport Zones & Quarterly Slabs",
                    Category = "Fee Structure & Policies",
                    FileName = "SVIS_Fee_Schedule_2026_27.pdf",
                    FileExtension = ".pdf",
                    FileSizeBytes = 1258291, // 1.2 MB
                    StoragePath = Path.Combine(basePath, "SVIS_Fee_Schedule_2026_27.pdf"),
                    FileUrl = $"/storage/tenants/{SvisId}/documents/SVIS_Fee_Schedule_2026_27.pdf",
                    Description = "Quarterly fee distribution, bus route fleet rates, and online payment gateway terms.",
                    UploadedBy = "SVIS Accounts Department",
                    UploadedAt = DateTime.UtcNow.AddDays(-8)
                },
                new TenantDocument
                {
                    InstitutionId = SvisId,
                    Title = "Delhi Directorate of Education Recognition & CBSE Affiliation",
                    Category = "Affiliation & Compliance",
                    FileName = "DOE_Recognition_Certificate_SVIS.pdf",
                    FileExtension = ".pdf",
                    FileSizeBytes = 1887436, // 1.8 MB
                    StoragePath = Path.Combine(basePath, "DOE_Recognition_Certificate_SVIS.pdf"),
                    FileUrl = $"/storage/tenants/{SvisId}/documents/DOE_Recognition_Certificate_SVIS.pdf",
                    Description = "Government of NCT Delhi DoE recognition grant and school safety certification.",
                    UploadedBy = "SVIS Administrative Office",
                    UploadedAt = DateTime.UtcNow.AddDays(-22)
                },
                new TenantDocument
                {
                    InstitutionId = SvisId,
                    Title = "Transfer Certificate (TC) & Prior Academic Record Policy",
                    Category = "Admission Guidelines",
                    FileName = "SVIS_Transfer_Certificate_Format.pdf",
                    FileExtension = ".pdf",
                    FileSizeBytes = 419430, // 410 KB
                    StoragePath = Path.Combine(basePath, "SVIS_Transfer_Certificate_Format.pdf"),
                    FileUrl = $"/storage/tenants/{SvisId}/documents/SVIS_Transfer_Certificate_Format.pdf",
                    Description = "Official instructions for submitting countersigned Transfer Certificates and marks transcripts.",
                    UploadedBy = "SVIS Registrar",
                    UploadedAt = DateTime.UtcNow.AddDays(-3)
                }
            };

            _context.TenantDocuments.AddRange(svisDocs);
            await _context.SaveChangesAsync();
        }
    }
}
