using MySchoolAdmissions.AIService.Models;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;

namespace MySchoolAdmissions.AIService.Data;

public class AIDbContext : DbContext
{
    public AIDbContext(DbContextOptions<AIDbContext> options) : base(options)
    {
    }

    public DbSet<KnowledgeDocument> KnowledgeDocuments => Set<KnowledgeDocument>();
    public DbSet<KnowledgeChunk> KnowledgeChunks => Set<KnowledgeChunk>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasPostgresExtension("vector");

        modelBuilder.Entity<KnowledgeDocument>(entity =>
        {
            entity.ToTable("ai_knowledge_documents");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(250).IsRequired();
            entity.Property(e => e.InstitutionName).HasMaxLength(250).IsRequired();
            entity.Property(e => e.DocumentType).HasMaxLength(100).IsRequired();
            entity.HasMany(e => e.Chunks)
                  .WithOne(c => c.Document)
                  .HasForeignKey(c => c.DocumentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<KnowledgeChunk>(entity =>
        {
            entity.ToTable("ai_knowledge_chunks");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.InstitutionName).HasMaxLength(250);
            entity.Property(e => e.DocumentTitle).HasMaxLength(250);
            entity.Property(e => e.DocumentType).HasMaxLength(100);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Embedding).HasColumnType("vector(768)");

            entity.HasIndex(e => e.InstitutionId);
            entity.HasIndex(e => e.DocumentId);
        });
    }
}
