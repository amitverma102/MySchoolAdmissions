using MySchoolAdmissions.MarketingService.Models;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.MarketingService.Data;

public class MarketingDbContext : DbContext
{
    public MarketingDbContext(DbContextOptions<MarketingDbContext> options) : base(options) { }

    public DbSet<Campaign> Campaigns { get; set; }
    public DbSet<CampaignRecommendation> Recommendations { get; set; }
    public DbSet<CampaignLearning> Learnings { get; set; }
    public DbSet<CampaignQrCode> QrCodes { get; set; }
    public DbSet<CampaignAttributionTouchpoint> AttributionTouchpoints { get; set; }
    public DbSet<CampaignAutopilotConfig> AutopilotConfigs { get; set; }
    public DbSet<CampaignAuditLog> AuditLogs { get; set; }
    public DbSet<AdPlatformConnection> AdPlatformConnections => Set<AdPlatformConnection>();
    public DbSet<AdPlatformOAuthState> AdPlatformOAuthStates => Set<AdPlatformOAuthState>();
    public DbSet<GeneralAd> GeneralAds => Set<GeneralAd>();
    public DbSet<GeneralAdPublication> GeneralAdPublications => Set<GeneralAdPublication>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AdPlatformConnection>(entity =>
        {
            entity.HasKey(connection => connection.Id);
            entity.HasIndex(connection => new { connection.InstitutionId, connection.Platform }).IsUnique()
                .HasFilter("\"Scope\" = 'Institution' AND \"InstitutionId\" IS NOT NULL");
            entity.HasIndex(connection => new { connection.Scope, connection.Platform }).IsUnique()
                .HasFilter("\"Scope\" = 'Global'");
            entity.Property(connection => connection.Scope).HasMaxLength(24).IsRequired();
            entity.Property(connection => connection.Platform).HasMaxLength(32).IsRequired();
            entity.Property(connection => connection.AccountsJson).IsRequired();
            entity.Property(connection => connection.PagesJson).IsRequired();
            entity.Property(connection => connection.EncryptedAccessToken).IsRequired();
        });

        modelBuilder.Entity<AdPlatformOAuthState>(entity =>
        {
            entity.HasKey(state => state.Id);
            entity.HasIndex(state => state.StateHash).IsUnique();
            entity.Property(state => state.StateHash).HasMaxLength(64).IsRequired();
            entity.Property(state => state.Platform).HasMaxLength(32).IsRequired();
            entity.Property(state => state.Scope).HasMaxLength(24).IsRequired();
        });

        modelBuilder.Entity<GeneralAd>(entity =>
        {
            entity.HasKey(ad => ad.Id);
            entity.Property(ad => ad.Name).HasMaxLength(200).IsRequired();
            entity.Property(ad => ad.Status).HasMaxLength(32).IsRequired();
        });

        modelBuilder.Entity<GeneralAdPublication>(entity =>
        {
            entity.HasKey(publication => publication.Id);
            entity.HasIndex(publication => new { publication.GeneralAdId, publication.Platform }).IsUnique();
            entity.Property(publication => publication.Platform).HasMaxLength(32).IsRequired();
            entity.Property(publication => publication.Status).HasMaxLength(32).IsRequired();
            entity.Property(publication => publication.ExternalIdsJson).IsRequired();
        });
    }
}
