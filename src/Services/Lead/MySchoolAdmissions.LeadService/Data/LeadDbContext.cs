using System.Text.Json;
using MySchoolAdmissions.LeadService.Models;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.LeadService.Data;

public class LeadDbContext : DbContext
{
    public LeadDbContext(DbContextOptions<LeadDbContext> options) : base(options)
    {
    }

    public DbSet<Enquiry> Enquiries => Set<Enquiry>();
    public DbSet<LeadSource> LeadSources => Set<LeadSource>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<InteractionHistory> InteractionHistories => Set<InteractionHistory>();
    public DbSet<AdmissionActivity> Activities => Set<AdmissionActivity>();
    public DbSet<CounselorSkillProfile> CounselorProfiles => Set<CounselorSkillProfile>();
    public DbSet<AutoAssignmentConfig> AutoAssignmentConfigs => Set<AutoAssignmentConfig>();
    public DbSet<TourAvailabilitySlot> TourAvailabilitySlots => Set<TourAvailabilitySlot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Enquiry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).HasMaxLength(255);
            
            entity.HasOne(e => e.LeadSource)
                .WithMany()
                .HasForeignKey(e => e.LeadSourceId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Campaign)
                .WithMany()
                .HasForeignKey(e => e.CampaignId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<InteractionHistory>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.Enquiry)
                .WithMany(enq => enq.Interactions)
                .HasForeignKey(e => e.EnquiryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AdmissionActivity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.ActivityType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Priority).HasMaxLength(50);
            entity.Property(e => e.Location).HasMaxLength(255);

            entity.HasIndex(e => e.ScheduledStartTime);
            entity.HasIndex(e => e.AssignedToUserId);
            entity.HasIndex(e => e.InstitutionId);

            entity.HasOne(e => e.Enquiry)
                .WithMany()
                .HasForeignKey(e => e.EnquiryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CounselorSkillProfile>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.HasIndex(c => c.UserId).IsUnique();
            entity.HasIndex(c => c.InstitutionId);
            entity.Property(c => c.CounselorName).HasMaxLength(255).IsRequired();
            entity.Property(c => c.Email).HasMaxLength(255).IsRequired();

            entity.Property(c => c.LanguagesKnown)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>()
                );

            entity.Property(c => c.HandledClasses)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>()
                );

            entity.Property(c => c.Regions)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>()
                );

            entity.Property(c => c.Religions)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>()
                );
        });

        modelBuilder.Entity<AutoAssignmentConfig>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.HasIndex(c => c.InstitutionId);
        });

        modelBuilder.Entity<TourAvailabilitySlot>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.HasIndex(s => new { s.InstitutionId, s.CampusId, s.SlotDate });
        });
    }
}
