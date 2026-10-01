namespace MySchoolAdmissions.MarketingService.DTOs;

public sealed class AdPlatformConnectionDto
{
    public string Scope { get; set; } = string.Empty;
    public Guid? InstitutionId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string ProviderUserName { get; set; } = string.Empty;
    public string ProviderUserId { get; set; } = string.Empty;
    public List<Models.AdPlatformAccount> Accounts { get; set; } = new();
    public List<Models.AdPlatformPage> Pages { get; set; } = new();
    public string? SelectedAccountId { get; set; }
    public string? MetaPageId { get; set; }
    public string? InstagramAccountId { get; set; }
    public string? GoogleManagerCustomerId { get; set; }
    public DateTime ConnectedAtUtc { get; set; }
    public DateTime? TokenExpiresAtUtc { get; set; }
}

public sealed class SelectAdPlatformAccountDto
{
    public string AccountId { get; set; } = string.Empty;
    public string? PageId { get; set; }
    public string? InstagramAccountId { get; set; }
    public string? GoogleManagerCustomerId { get; set; }
}

public sealed class PublishGeneralAdDto
{
    public string Name { get; set; } = string.Empty;
    public string AdvertiserOrTopic { get; set; } = string.Empty;
    public string? RelatedInstitutionName { get; set; }
    public string DestinationUrl { get; set; } = string.Empty;
    public string Headline { get; set; } = string.Empty;
    public string PrimaryText { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public List<string> GoogleHeadlines { get; set; } = new();
    public List<string> GoogleDescriptions { get; set; } = new();
    public List<string> Keywords { get; set; } = new();
    public decimal BudgetInr { get; set; }
    public DateTime StartDateUtc { get; set; }
    public DateTime EndDateUtc { get; set; }
}

public sealed class GeneralAdDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AdvertiserOrTopic { get; set; } = string.Empty;
    public string? RelatedInstitutionName { get; set; }
    public string Headline { get; set; } = string.Empty;
    public string PrimaryText { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DestinationUrl { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public List<string> GoogleHeadlines { get; set; } = new();
    public List<string> GoogleDescriptions { get; set; } = new();
    public List<string> Keywords { get; set; } = new();
    public decimal BudgetInr { get; set; }
    public DateTime StartDateUtc { get; set; }
    public DateTime EndDateUtc { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public List<GeneralAdPublicationDto> Publications { get; set; } = new();
}

public sealed class GeneralAdPublicationDto
{
    public string Platform { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ExternalIdsJson { get; set; } = "{}";
    public string? Error { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
}
