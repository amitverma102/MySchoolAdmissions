using MySchoolAdmissions.InstitutionService.Models;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.InstitutionService.Data;

public class InstitutionDbContext : DbContext
{
    public InstitutionDbContext(DbContextOptions<InstitutionDbContext> options) : base(options)
    {
    }

    public DbSet<Institution> Institutions => Set<Institution>();
    public DbSet<Campus> Campuses => Set<Campus>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Institution>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);
        });

        modelBuilder.Entity<Campus>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(255);

            entity.HasOne(e => e.Institution)
                .WithMany(i => i.Campuses)
                .HasForeignKey(e => e.InstitutionId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
