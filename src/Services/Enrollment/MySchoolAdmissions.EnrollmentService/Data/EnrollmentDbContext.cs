using MySchoolAdmissions.EnrollmentService.Models;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.EnrollmentService.Data;

public class EnrollmentDbContext : DbContext
{
    public EnrollmentDbContext(DbContextOptions<EnrollmentDbContext> options) : base(options) { }

    public DbSet<Enrollment> Enrollments { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<FeeConcession> FeeConcessions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<Enrollment>()
            .HasMany(e => e.Payments)
            .WithOne()
            .HasForeignKey(p => p.EnrollmentId);

        modelBuilder.Entity<Enrollment>()
            .HasMany(e => e.Concessions)
            .WithOne()
            .HasForeignKey(c => c.EnrollmentId);
    }
}
