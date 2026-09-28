using MySchoolAdmissions.IdentityService.Models;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.IdentityService.Data;

public class IdentityDbContext : DbContext
{
    public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<TenantStatus> TenantStatuses => Set<TenantStatus>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(ur => new { ur.UserId, ur.RoleId });

            entity.HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId);

            entity.HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId);
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(rp => new { rp.RoleId, rp.PermissionId });

            entity.HasOne(rp => rp.Role)
                .WithMany()
                .HasForeignKey(rp => rp.RoleId);

            entity.HasOne(rp => rp.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(rp => rp.PermissionId);
        });
        
        // Seed some basic roles
        var superAdminRoleId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var schoolAdminRoleId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var counsellorRoleId = Guid.Parse("33333333-3333-3333-3333-333333333333");

        modelBuilder.Entity<Role>().HasData(
            new Role { Id = superAdminRoleId, Name = "SuperAdmin", Description = "Global Super Administrator" },
            new Role { Id = schoolAdminRoleId, Name = "SchoolAdmin", Description = "School/Institution Administrator" },
            new Role { Id = counsellorRoleId, Name = "Counsellor", Description = "Admission Counsellor" }
        );

        // Seed default SuperAdmin user
        var defaultAdminUserId = Guid.Parse("99999999-9999-9999-9999-999999999999");
        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = defaultAdminUserId,
                FirstName = "System",
                LastName = "Admin",
                Email = "admin@myschooladmissions.com",
                // Pre-calculated BCrypt hash for "Admin@123"
                PasswordHash = "$2a$11$1PYkw4v/Synn9Z1/rEijn.If1ifh6yajxqhhD5svnOZSail9Mat.K",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        );

        // Map default SuperAdmin user to SuperAdmin role
        modelBuilder.Entity<UserRole>().HasData(
            new UserRole
            {
                UserId = defaultAdminUserId,
                RoleId = superAdminRoleId
            }
        );
    }
}
