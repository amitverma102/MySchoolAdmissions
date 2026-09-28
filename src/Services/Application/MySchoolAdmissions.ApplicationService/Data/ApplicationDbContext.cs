using MySchoolAdmissions.ApplicationService.Models;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.ApplicationService.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Application> Applications => Set<Application>();
    public DbSet<ApplicationDocument> Documents => Set<ApplicationDocument>();
    public DbSet<Assessment> Assessments => Set<Assessment>();
    public DbSet<TenantDocument> TenantDocuments => Set<TenantDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Application>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ApplicationNumber).IsUnique();

            entity.HasMany(e => e.Documents)
                .WithOne(d => d.Application)
                .HasForeignKey(d => d.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Assessments)
                .WithOne(a => a.Application)
                .HasForeignKey(a => a.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
