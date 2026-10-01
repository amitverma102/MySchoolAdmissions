namespace MySchoolAdmissions.MarketingService.Models;

public sealed class AdPlatformConnection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? InstitutionId { get; set; }
    public string Scope { get; set; } = "Institution";
    public string Platform { get; set; } = string.Empty;
    public string ProviderUserId { get; set; } = string.Empty;
    public string ProviderUserName { get; set; } = string.Empty;
    public string AccountsJson { get; set; } = "[]";
    public string PagesJson { get; set; } = "[]";
    public string? SelectedAccountId { get; set; }
    public string? MetaPageId { get; set; }
    public string? InstagramAccountId { get; set; }
    public string? GoogleManagerCustomerId { get; set; }
    public string EncryptedAccessToken { get; set; } = string.Empty;
    public string? EncryptedRefreshToken { get; set; }
    public DateTime? TokenExpiresAtUtc { get; set; }
    public DateTime ConnectedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
}

public sealed class AdPlatformOAuthState
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string StateHash { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public string Scope { get; set; } = "Institution";
    public string Platform { get; set; } = string.Empty;
    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
}

public sealed class GeneralAd
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string AdvertiserOrTopic { get; set; } = string.Empty;
    public string? RelatedInstitutionName { get; set; }
    public string Headline { get; set; } = string.Empty;
    public string PrimaryText { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DestinationUrl { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string GoogleHeadlinesJson { get; set; } = "[]";
    public string GoogleDescriptionsJson { get; set; } = "[]";
    public string KeywordsJson { get; set; } = "[]";
    public decimal BudgetInr { get; set; }
    public DateTime StartDateUtc { get; set; }
    public DateTime EndDateUtc { get; set; }
    public string Status { get; set; } = "Draft";
    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
}

public sealed class GeneralAdPublication
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GeneralAdId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string Status { get; set; } = "Publishing";
    public string ExternalIdsJson { get; set; } = "{}";
    public string? Error { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAtUtc { get; set; }
}

public sealed class AdPlatformAccount
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Currency { get; set; }
    public string? TimeZone { get; set; }
    public string? Status { get; set; }
}

public sealed class AdPlatformPage
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? InstagramBusinessAccountId { get; set; }
    public string? InstagramUsername { get; set; }
}
