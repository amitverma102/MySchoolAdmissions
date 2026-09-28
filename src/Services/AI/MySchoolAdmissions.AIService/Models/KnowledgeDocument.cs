namespace MySchoolAdmissions.AIService.Models;

public class KnowledgeDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? InstitutionId { get; set; }
    public string InstitutionName { get; set; } = "General";
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileExtension { get; set; } = ".pdf";
    public long FileSizeBytes { get; set; }
    public string DocumentType { get; set; } = "Prospectus";
    public int ChunkCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<KnowledgeChunk> Chunks { get; set; } = new List<KnowledgeChunk>();
}
