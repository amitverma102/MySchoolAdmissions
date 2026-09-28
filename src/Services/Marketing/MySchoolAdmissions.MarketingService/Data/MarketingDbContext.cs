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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
    }
}
