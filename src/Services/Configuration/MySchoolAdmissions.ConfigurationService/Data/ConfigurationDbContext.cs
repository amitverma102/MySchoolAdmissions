using MySchoolAdmissions.ConfigurationService.Models;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.ConfigurationService.Data;

public class ConfigurationDbContext : DbContext
{
    public ConfigurationDbContext(DbContextOptions<ConfigurationDbContext> options) : base(options)
    {
    }

    public DbSet<AcademicYear> AcademicYears { get; set; } = null!;
    public DbSet<Grade> Grades { get; set; } = null!;
    public DbSet<LeadSource> LeadSources { get; set; } = null!;
    public DbSet<CampaignType> CampaignTypes { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Seed some initial data using fixed GUIDs
        modelBuilder.Entity<Grade>().HasData(
            new Grade { Id = Guid.Parse("00000000-0000-0000-0000-000000000001"), Name = "Pre-K", Order = 1 },
            new Grade { Id = Guid.Parse("00000000-0000-0000-0000-000000000002"), Name = "Kindergarten", Order = 2 },
            new Grade { Id = Guid.Parse("00000000-0000-0000-0000-000000000003"), Name = "Grade 1", Order = 3 }
        );

        modelBuilder.Entity<AcademicYear>().HasData(
            new AcademicYear { Id = Guid.Parse("10000000-0000-0000-0000-000000000001"), Name = "2025-2026", StartDate = new DateTime(2025, 4, 1, 0, 0, 0, DateTimeKind.Utc), EndDate = new DateTime(2026, 3, 31, 0, 0, 0, DateTimeKind.Utc) }
        );

        modelBuilder.Entity<LeadSource>().HasData(
            new LeadSource { Id = Guid.Parse("20000000-0000-0000-0000-000000000001"), Name = "Website", IsActive = true },
            new LeadSource { Id = Guid.Parse("20000000-0000-0000-0000-000000000002"), Name = "Walk-in", IsActive = true },
            new LeadSource { Id = Guid.Parse("20000000-0000-0000-0000-000000000003"), Name = "Referral", IsActive = true }
        );

        modelBuilder.Entity<CampaignType>().HasData(
            new CampaignType { Id = Guid.Parse("30000000-0000-0000-0000-000000000001"), Name = "Open House", IsActive = true },
            new CampaignType { Id = Guid.Parse("30000000-0000-0000-0000-000000000002"), Name = "Social Media Ad", IsActive = true }
        );
    }
}
