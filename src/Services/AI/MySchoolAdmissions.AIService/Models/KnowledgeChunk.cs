using Pgvector;

namespace MySchoolAdmissions.AIService.Models;

public class KnowledgeChunk
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? DocumentId { get; set; }
    public Guid? InstitutionId { get; set; }
    public string InstitutionName { get; set; } = string.Empty;
    public string DocumentTitle { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
    public int ChunkIndex { get; set; }
    public string Content { get; set; } = string.Empty;
    public Vector? Embedding { get; set; }
    public string? MetadataJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public KnowledgeDocument? Document { get; set; }
}
