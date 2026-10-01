using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using MySchoolAdmissions.MarketingService.Data;
using MySchoolAdmissions.MarketingService.DTOs;
using MySchoolAdmissions.MarketingService.Models;
using MySchoolAdmissions.MarketingService.Services;

namespace MySchoolAdmissions.MarketingService.Controllers;

[ApiController]
[Route("api/ad-platforms")]
public sealed class AdPlatformConnectionsController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly MarketingDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IAdTokenProtector _tokenProtector;
    private readonly ILogger<AdPlatformConnectionsController> _logger;

    public AdPlatformConnectionsController(
        MarketingDbContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IAdTokenProtector tokenProtector,
        ILogger<AdPlatformConnectionsController> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _tokenProtector = tokenProtector;
        _logger = logger;
    }

    [HttpGet("connections")]
    public async Task<IActionResult> GetConnections()
    {
        if (!TryGetInstitutionId(out var institutionId)) return Forbid();
        if (!IsInstitutionAdmin()) return Forbid();

        var connections = await _context.AdPlatformConnections
            .Where(connection => connection.Scope == "Institution" && connection.InstitutionId == institutionId)
            .OrderBy(connection => connection.Platform)
            .ToListAsync();

        return Ok(connections.Select(ToDto));
    }

    [HttpPost("{platform}/authorize")]
    public async Task<IActionResult> StartAuthorization(string platform)
    {
        platform = NormalizePlatform(platform);
        if (platform is not ("Meta" or "GoogleAds")) return BadRequest(new { message = "Platform must be Meta or GoogleAds." });
        if (!TryGetInstitutionId(out var institutionId)) return Forbid();
        if (!IsInstitutionAdmin()) return Forbid();

        var state = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        var stateHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(state)));

        _context.AdPlatformOAuthStates.Add(new AdPlatformOAuthState
        {
            StateHash = stateHash,
            InstitutionId = institutionId,
            Scope = "Institution",
            Platform = platform,
            CreatedByUserId = GetUserId(),
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10)
        });
        await _context.SaveChangesAsync();

        return Ok(new { authorizationUrl = BuildAuthorizationUrl(platform, state) });
    }

    [HttpGet("global/connections")]
    public async Task<IActionResult> GetGlobalConnections()
    {
        if (!IsSuperAdmin()) return Forbid();
        var connections = await _context.AdPlatformConnections
            .Where(connection => connection.Scope == "Global" && connection.InstitutionId == null)
            .OrderBy(connection => connection.Platform)
            .ToListAsync();
        return Ok(connections.Select(ToDto));
    }

    [HttpPost("global/{platform}/authorize")]
    public async Task<IActionResult> StartGlobalAuthorization(string platform)
    {
        platform = NormalizePlatform(platform);
        if (platform is not ("Meta" or "GoogleAds")) return BadRequest(new { message = "Platform must be Meta or GoogleAds." });
        if (!IsSuperAdmin()) return Forbid();
        var state = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        _context.AdPlatformOAuthStates.Add(new AdPlatformOAuthState
        {
            StateHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(state))),
            Scope = "Global",
            InstitutionId = null,
            Platform = platform,
            CreatedByUserId = GetUserId(),
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(10)
        });
        await _context.SaveChangesAsync();
        return Ok(new { authorizationUrl = BuildAuthorizationUrl(platform, state) });
    }

    [AllowAnonymous]
    [HttpGet("oauth/meta/callback")]
    public Task<IActionResult> MetaCallback([FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error)
        => CompleteOAuthAsync("Meta", code, state, error);

    [AllowAnonymous]
    [HttpGet("oauth/google/callback")]
    public Task<IActionResult> GoogleCallback([FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error)
        => CompleteOAuthAsync("GoogleAds", code, state, error);

    [HttpPut("{platform}/selection")]
    public async Task<IActionResult> SelectAccount(string platform, [FromBody] SelectAdPlatformAccountDto dto)
    {
        platform = NormalizePlatform(platform);
        if (platform is not ("Meta" or "GoogleAds")) return BadRequest(new { message = "Platform must be Meta or GoogleAds." });
        if (!TryGetInstitutionId(out var institutionId)) return Forbid();
        if (!IsInstitutionAdmin()) return Forbid();
        if (string.IsNullOrWhiteSpace(dto.AccountId)) return BadRequest(new { message = "Select an ad account." });

        var connection = await _context.AdPlatformConnections
            .SingleOrDefaultAsync(item => item.Scope == "Institution" && item.InstitutionId == institutionId && item.Platform == platform);
        if (connection == null) return NotFound(new { message = "Connect this institution's account first." });

        return await SaveSelectionAsync(connection, platform, dto);
    }

    [HttpPut("global/{platform}/selection")]
    public async Task<IActionResult> SelectGlobalAccount(string platform, [FromBody] SelectAdPlatformAccountDto dto)
    {
        platform = NormalizePlatform(platform);
        if (platform is not ("Meta" or "GoogleAds")) return BadRequest(new { message = "Platform must be Meta or GoogleAds." });
        if (!IsSuperAdmin()) return Forbid();
        if (string.IsNullOrWhiteSpace(dto.AccountId)) return BadRequest(new { message = "Select an ad account." });
        var connection = await _context.AdPlatformConnections.SingleOrDefaultAsync(item => item.Scope == "Global" && item.InstitutionId == null && item.Platform == platform);
        if (connection == null) return NotFound(new { message = "Connect a Super Admin global account first." });
        return await SaveSelectionAsync(connection, platform, dto);
    }

    private async Task<IActionResult> SaveSelectionAsync(AdPlatformConnection connection, string platform, SelectAdPlatformAccountDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.AccountId)) return BadRequest(new { message = "Select an ad account." });

        var accounts = Deserialize<List<AdPlatformAccount>>(connection.AccountsJson);
        if (!accounts.Any(account => account.Id == dto.AccountId))
            return BadRequest(new { message = "The selected account is not available to this authorized user." });

        if (platform == "Meta")
        {
            var pages = Deserialize<List<AdPlatformPage>>(connection.PagesJson);
            if (!string.IsNullOrWhiteSpace(dto.PageId) && !pages.Any(page => page.Id == dto.PageId))
                return BadRequest(new { message = "The selected Facebook Page is not available to the authorized user." });
            if (!string.IsNullOrWhiteSpace(dto.InstagramAccountId) &&
                !pages.Any(page => page.Id == dto.PageId && page.InstagramBusinessAccountId == dto.InstagramAccountId))
                return BadRequest(new { message = "Select an Instagram account linked to the selected Facebook Page." });

            connection.MetaPageId = dto.PageId;
            connection.InstagramAccountId = dto.InstagramAccountId;
            connection.GoogleManagerCustomerId = null;
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(dto.GoogleManagerCustomerId) &&
                !accounts.Any(account => account.Id == dto.GoogleManagerCustomerId))
                return BadRequest(new { message = "The selected Google manager account is not available to the authorized user." });
            connection.GoogleManagerCustomerId = dto.GoogleManagerCustomerId;
            connection.MetaPageId = null;
            connection.InstagramAccountId = null;
        }

        connection.SelectedAccountId = dto.AccountId;
        connection.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(ToDto(connection));
    }

    [HttpDelete("{platform}/connection")]
    public async Task<IActionResult> Disconnect(string platform)
    {
        platform = NormalizePlatform(platform);
        if (platform is not ("Meta" or "GoogleAds")) return BadRequest(new { message = "Platform must be Meta or GoogleAds." });
        if (!TryGetInstitutionId(out var institutionId)) return Forbid();
        if (!IsInstitutionAdmin()) return Forbid();

        var connection = await _context.AdPlatformConnections
            .SingleOrDefaultAsync(item => item.Scope == "Institution" && item.InstitutionId == institutionId && item.Platform == platform);
        if (connection == null) return NoContent();

        _context.AdPlatformConnections.Remove(connection);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("global/{platform}/connection")]
    public async Task<IActionResult> DisconnectGlobal(string platform)
    {
        platform = NormalizePlatform(platform);
        if (platform is not ("Meta" or "GoogleAds")) return BadRequest(new { message = "Platform must be Meta or GoogleAds." });
        if (!IsSuperAdmin()) return Forbid();
        var connection = await _context.AdPlatformConnections.SingleOrDefaultAsync(item => item.Scope == "Global" && item.InstitutionId == null && item.Platform == platform);
        if (connection == null) return NoContent();
        _context.AdPlatformConnections.Remove(connection);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private async Task<IActionResult> CompleteOAuthAsync(string platform, string? code, string? state, string? providerError)
    {
        if (string.IsNullOrWhiteSpace(state)) return OAuthResult(platform, false, "missing_state");

        var stateHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(state)));
        var pending = await _context.AdPlatformOAuthStates
            .SingleOrDefaultAsync(item => item.StateHash == stateHash && item.Platform == platform);
        if (pending == null || pending.ExpiresAtUtc <= DateTime.UtcNow)
        {
            if (pending != null)
            {
                _context.AdPlatformOAuthStates.Remove(pending);
                await _context.SaveChangesAsync();
            }
            return OAuthResult(platform, false, "state_expired");
        }

        _context.AdPlatformOAuthStates.Remove(pending);
        await _context.SaveChangesAsync(); // A state can be consumed only once.

        if (!string.IsNullOrWhiteSpace(providerError)) return OAuthResult(platform, false, "provider_denied");
        if (string.IsNullOrWhiteSpace(code)) return OAuthResult(platform, false, "missing_code");

        try
        {
            var connection = platform == "Meta"
                ? await ExchangeMetaCodeAsync(code, pending.InstitutionId, pending.Scope)
                : await ExchangeGoogleCodeAsync(code, pending.InstitutionId, pending.Scope);

            var existing = await _context.AdPlatformConnections.SingleOrDefaultAsync(item =>
                item.Scope == pending.Scope && item.InstitutionId == pending.InstitutionId && item.Platform == platform);
            if (existing == null)
            {
                _context.AdPlatformConnections.Add(connection);
            }
            else
            {
                connection.Id = existing.Id;
                connection.ConnectedAtUtc = existing.ConnectedAtUtc;
                connection.SelectedAccountId = existing.SelectedAccountId != null &&
                    Deserialize<List<AdPlatformAccount>>(connection.AccountsJson).Any(a => a.Id == existing.SelectedAccountId)
                        ? existing.SelectedAccountId
                        : null;
                connection.MetaPageId = existing.MetaPageId;
                connection.InstagramAccountId = existing.InstagramAccountId;
                connection.GoogleManagerCustomerId = existing.GoogleManagerCustomerId;
                _context.Entry(existing).CurrentValues.SetValues(connection);
            }

            await _context.SaveChangesAsync();
            return OAuthResult(platform, true, "connected");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OAuth connection failed for ad platform {Platform}, scope {Scope}, and institution {InstitutionId}.", platform, pending.Scope, pending.InstitutionId);
            return OAuthResult(platform, false, "provider_setup_failed");
        }
    }

    private async Task<AdPlatformConnection> ExchangeMetaCodeAsync(string code, Guid? institutionId, string scope)
    {
        var version = _configuration["AdIntegrations:Meta:ApiVersion"] ?? "v23.0";
        if (!version.StartsWith('v')) version = $"v{version}";
        var clientId = GetRequiredConfiguration("AdIntegrations:Meta:ClientId");
        var clientSecret = GetRequiredConfiguration("AdIntegrations:Meta:ClientSecret");
        var redirectUri = GetRequiredConfiguration("AdIntegrations:Meta:RedirectUri");
        var client = _httpClientFactory.CreateClient();

        var shortTokenUrl = QueryHelpers.AddQueryString(
            $"https://graph.facebook.com/{version}/oauth/access_token",
            new Dictionary<string, string?>
            {
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"] = redirectUri,
                ["code"] = code
            });
        using var shortTokenResponse = await client.GetAsync(shortTokenUrl);
        var shortTokenBody = await shortTokenResponse.Content.ReadAsStringAsync();
        shortTokenResponse.EnsureSuccessStatusCode();
        using var shortTokenJson = JsonDocument.Parse(shortTokenBody);
        var shortToken = RequiredJsonString(shortTokenJson.RootElement, "access_token");

        var longTokenUrl = QueryHelpers.AddQueryString(
            $"https://graph.facebook.com/{version}/oauth/access_token",
            new Dictionary<string, string?>
            {
                ["grant_type"] = "fb_exchange_token",
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["fb_exchange_token"] = shortToken
            });
        using var longTokenResponse = await client.GetAsync(longTokenUrl);
        var longTokenBody = await longTokenResponse.Content.ReadAsStringAsync();
        longTokenResponse.EnsureSuccessStatusCode();
        using var longTokenJson = JsonDocument.Parse(longTokenBody);
        var accessToken = RequiredJsonString(longTokenJson.RootElement, "access_token");
        var expiresAt = DateTime.UtcNow.AddSeconds(GetJsonInt64(longTokenJson.RootElement, "expires_in", 5_184_000));

        using var profileResponse = await client.GetAsync($"https://graph.facebook.com/{version}/me?fields=id,name&access_token={Uri.EscapeDataString(accessToken)}");
        var profileBody = await profileResponse.Content.ReadAsStringAsync();
        profileResponse.EnsureSuccessStatusCode();
        using var profileJson = JsonDocument.Parse(profileBody);

        var accounts = await ReadMetaAdAccountsAsync(client, version, accessToken);
        var pages = await ReadMetaPagesAsync(client, version, accessToken);
        if (accounts.Count == 0)
            throw new InvalidOperationException("The Meta user has no ad accounts available to the app.");

        return new AdPlatformConnection
        {
            InstitutionId = institutionId,
            Scope = scope,
            Platform = "Meta",
            ProviderUserId = RequiredJsonString(profileJson.RootElement, "id"),
            ProviderUserName = OptionalJsonString(profileJson.RootElement, "name") ?? "Meta user",
            AccountsJson = JsonSerializer.Serialize(accounts, JsonOptions),
            PagesJson = JsonSerializer.Serialize(pages, JsonOptions),
            EncryptedAccessToken = _tokenProtector.Protect(accessToken),
            TokenExpiresAtUtc = expiresAt,
            ConnectedAtUtc = DateTime.UtcNow
        };
    }

    private async Task<AdPlatformConnection> ExchangeGoogleCodeAsync(string code, Guid? institutionId, string scope)
    {
        var client = _httpClientFactory.CreateClient();
        var tokenResponse = await client.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = GetRequiredConfiguration("AdIntegrations:GoogleAds:ClientId"),
            ["client_secret"] = GetRequiredConfiguration("AdIntegrations:GoogleAds:ClientSecret"),
            ["redirect_uri"] = GetRequiredConfiguration("AdIntegrations:GoogleAds:RedirectUri"),
            ["grant_type"] = "authorization_code",
            ["code"] = code
        }));
        var tokenBody = await tokenResponse.Content.ReadAsStringAsync();
        tokenResponse.EnsureSuccessStatusCode();
        using var tokenJson = JsonDocument.Parse(tokenBody);
        var accessToken = RequiredJsonString(tokenJson.RootElement, "access_token");
        var refreshToken = OptionalJsonString(tokenJson.RootElement, "refresh_token");
        var expiresAt = DateTime.UtcNow.AddSeconds(GetJsonInt64(tokenJson.RootElement, "expires_in", 3600));
        if (string.IsNullOrWhiteSpace(refreshToken))
            throw new InvalidOperationException("Google did not return a refresh token. Revoke the app in the Google account and reconnect with consent.");

        var developerToken = GetRequiredConfiguration("AdIntegrations:GoogleAds:DeveloperToken");
        var apiVersion = _configuration["AdIntegrations:GoogleAds:ApiVersion"] ?? "v25";
        if (apiVersion.StartsWith('v')) apiVersion = apiVersion[1..];
        using var accountsRequest = new HttpRequestMessage(HttpMethod.Get, $"https://googleads.googleapis.com/v{apiVersion}/customers:listAccessibleCustomers");
        accountsRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        accountsRequest.Headers.Add("developer-token", developerToken);
        using var accountsResponse = await client.SendAsync(accountsRequest);
        var accountsBody = await accountsResponse.Content.ReadAsStringAsync();
        accountsResponse.EnsureSuccessStatusCode();
        using var accountsJson = JsonDocument.Parse(accountsBody);
        var accounts = accountsJson.RootElement.TryGetProperty("resourceNames", out var resourceNames)
            ? resourceNames.EnumerateArray()
                .Select(name => name.GetString() ?? string.Empty)
                .Where(name => name.StartsWith("customers/", StringComparison.Ordinal))
                .Select(name => new AdPlatformAccount { Id = name["customers/".Length..], Name = name["customers/".Length..] })
                .ToList()
            : new List<AdPlatformAccount>();
        if (accounts.Count == 0)
            throw new InvalidOperationException("The Google user has no accessible Google Ads customers.");

        using var userInfoRequest = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v2/userinfo");
        userInfoRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        using var userInfoResponse = await client.SendAsync(userInfoRequest);
        var userInfoBody = await userInfoResponse.Content.ReadAsStringAsync();
        userInfoResponse.EnsureSuccessStatusCode();
        using var userInfoJson = JsonDocument.Parse(userInfoBody);

        return new AdPlatformConnection
        {
            InstitutionId = institutionId,
            Scope = scope,
            Platform = "GoogleAds",
            ProviderUserId = OptionalJsonString(userInfoJson.RootElement, "id") ?? string.Empty,
            ProviderUserName = OptionalJsonString(userInfoJson.RootElement, "email") ?? "Google Ads user",
            AccountsJson = JsonSerializer.Serialize(accounts, JsonOptions),
            EncryptedAccessToken = _tokenProtector.Protect(accessToken),
            EncryptedRefreshToken = _tokenProtector.Protect(refreshToken),
            TokenExpiresAtUtc = expiresAt,
            ConnectedAtUtc = DateTime.UtcNow
        };
    }

    private static async Task<List<AdPlatformAccount>> ReadMetaAdAccountsAsync(HttpClient client, string version, string token)
    {
        var url = QueryHelpers.AddQueryString(
            $"https://graph.facebook.com/{version}/me/adaccounts",
            new Dictionary<string, string?>
            {
                ["fields"] = "id,name,account_status,currency,timezone_name",
                ["limit"] = "100",
                ["access_token"] = token
            });
        var result = new List<AdPlatformAccount>();
        await ReadMetaPagedDataAsync(client, url, item => result.Add(new AdPlatformAccount
        {
            Id = OptionalJsonString(item, "id") ?? string.Empty,
            Name = OptionalJsonString(item, "name") ?? OptionalJsonString(item, "id") ?? "Ad account",
            Currency = OptionalJsonString(item, "currency"),
            TimeZone = OptionalJsonString(item, "timezone_name"),
            Status = OptionalJsonString(item, "account_status")
        }));
        return result;
    }

    private static async Task<List<AdPlatformPage>> ReadMetaPagesAsync(HttpClient client, string version, string token)
    {
        var url = QueryHelpers.AddQueryString(
            $"https://graph.facebook.com/{version}/me/accounts",
            new Dictionary<string, string?>
            {
                ["fields"] = "id,name,instagram_business_account{id,username}",
                ["limit"] = "100",
                ["access_token"] = token
            });
        var result = new List<AdPlatformPage>();
        await ReadMetaPagedDataAsync(client, url, item =>
        {
            var instagram = item.TryGetProperty("instagram_business_account", out var ig) ? ig : default;
            result.Add(new AdPlatformPage
            {
                Id = OptionalJsonString(item, "id") ?? string.Empty,
                Name = OptionalJsonString(item, "name") ?? "Facebook Page",
                InstagramBusinessAccountId = instagram.ValueKind == JsonValueKind.Object ? OptionalJsonString(instagram, "id") : null,
                InstagramUsername = instagram.ValueKind == JsonValueKind.Object ? OptionalJsonString(instagram, "username") : null
            });
        });
        return result;
    }

    private static async Task ReadMetaPagedDataAsync(HttpClient client, string url, Action<JsonElement> onItem)
    {
        var nextUrl = url;
        for (var page = 0; page < 10 && !string.IsNullOrWhiteSpace(nextUrl); page++)
        {
            using var response = await client.GetAsync(nextUrl);
            var body = await response.Content.ReadAsStringAsync();
            response.EnsureSuccessStatusCode();
            using var json = JsonDocument.Parse(body);
            if (json.RootElement.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in data.EnumerateArray()) onItem(item);
            }
            nextUrl = json.RootElement.TryGetProperty("paging", out var paging) && paging.TryGetProperty("next", out var next)
                ? next.GetString() ?? string.Empty
                : string.Empty;
        }
    }

    private string BuildAuthorizationUrl(string platform, string state)
    {
        var redirectUri = GetRequiredConfiguration($"AdIntegrations:{platform}:RedirectUri");
        var clientId = GetRequiredConfiguration($"AdIntegrations:{platform}:ClientId");
        if (platform == "Meta")
        {
            var version = _configuration["AdIntegrations:Meta:ApiVersion"] ?? "v23.0";
            if (!version.StartsWith('v')) version = $"v{version}";
            return QueryHelpers.AddQueryString($"https://www.facebook.com/{version}/dialog/oauth", new Dictionary<string, string?>
            {
                ["client_id"] = clientId,
                ["redirect_uri"] = redirectUri,
                ["state"] = state,
                ["response_type"] = "code",
                ["scope"] = "ads_read,ads_management,business_management,pages_show_list,pages_read_engagement,instagram_basic"
            });
        }

        return QueryHelpers.AddQueryString("https://accounts.google.com/o/oauth2/v2/auth", new Dictionary<string, string?>
        {
            ["client_id"] = clientId,
            ["redirect_uri"] = redirectUri,
            ["response_type"] = "code",
            ["scope"] = "openid email profile https://www.googleapis.com/auth/adwords",
            ["access_type"] = "offline",
            ["prompt"] = "consent",
            ["include_granted_scopes"] = "true",
            ["state"] = state
        });
    }

    private IActionResult OAuthResult(string platform, bool success, string result)
    {
        var origin = _configuration["AdIntegrations:FrontendOrigin"];
        var isLocalDevelopmentOrigin = Uri.TryCreate(origin, UriKind.Absolute, out var parsed) &&
            parsed.Scheme == Uri.UriSchemeHttp &&
            (parsed.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || parsed.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase));
        var safeOrigin = Uri.TryCreate(origin, UriKind.Absolute, out parsed) &&
            (parsed.Scheme == Uri.UriSchemeHttps || isLocalDevelopmentOrigin)
            ? parsed.GetLeftPart(UriPartial.Authority)
            : string.Empty;
        var script = string.IsNullOrEmpty(safeOrigin)
            ? ""
            : $"if(window.opener)window.opener.postMessage({{type:'ad-platform-oauth',platform:'{platform}',success:{success.ToString().ToLowerInvariant()},result:'{result}'}},'{safeOrigin}');";
        return Content($"<!doctype html><html><body><p>{(success ? "Account connected. You can close this window." : "Account connection failed. Return to MySchoolAdmissions and try again.")}</p><script>{script}window.close();</script></body></html>", "text/html");
    }

    private bool TryGetInstitutionId(out Guid institutionId)
    {
        institutionId = Guid.Empty;
        if (IsSuperAdmin())
        {
            var tenantHeader = Request.Headers["X-Tenant-Id"].FirstOrDefault() ?? Request.Headers["X-Institution-Id"].FirstOrDefault();
            return Guid.TryParse(tenantHeader, out institutionId) && institutionId != Guid.Empty;
        }

        var claim = User.Claims.FirstOrDefault(item => item.Type.Equals("institutionId", StringComparison.OrdinalIgnoreCase) ||
                                                       item.Type.Equals("institution_id", StringComparison.OrdinalIgnoreCase));
        return Guid.TryParse(claim?.Value, out institutionId) && institutionId != Guid.Empty;
    }

    private bool IsSuperAdmin() => GetRoles().Any(role => role.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));

    private bool IsInstitutionAdmin() => GetRoles().Any(role =>
        role.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) ||
        role.Equals("InstitutionAdmin", StringComparison.OrdinalIgnoreCase) ||
        role.Equals("InstituteAdmin", StringComparison.OrdinalIgnoreCase) ||
        role.Equals("SchoolAdmin", StringComparison.OrdinalIgnoreCase));

    private string[] GetRoles() => User.Claims
        .Where(claim => claim.Type == ClaimTypes.Role || claim.Type == "role" || claim.Type == "roles")
        .SelectMany(claim => claim.Value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        .ToArray();

    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? "unknown";

    private string GetRequiredConfiguration(string key) =>
        _configuration[key] is { Length: > 0 } value ? value : throw new InvalidOperationException($"{key} is not configured.");

    private static string NormalizePlatform(string platform) => platform.Equals("Google", StringComparison.OrdinalIgnoreCase) ||
        platform.Equals("GoogleAds", StringComparison.OrdinalIgnoreCase) ? "GoogleAds" :
        platform.Equals("Meta", StringComparison.OrdinalIgnoreCase) ? "Meta" : string.Empty;

    private static string RequiredJsonString(JsonElement root, string property) =>
        OptionalJsonString(root, property) is { Length: > 0 } value ? value : throw new InvalidOperationException($"Provider response did not include {property}.");

    private static string? OptionalJsonString(JsonElement root, string property) =>
        root.ValueKind == JsonValueKind.Object && root.TryGetProperty(property, out var element) && element.ValueKind == JsonValueKind.String
            ? element.GetString()
            : null;

    private static long GetJsonInt64(JsonElement root, string property, long defaultValue) =>
        root.ValueKind == JsonValueKind.Object && root.TryGetProperty(property, out var element) && element.TryGetInt64(out var value)
            ? value
            : defaultValue;

    private static T Deserialize<T>(string json) => JsonSerializer.Deserialize<T>(json, JsonOptions) ?? throw new InvalidOperationException("Stored ad account metadata is invalid.");

    private static AdPlatformConnectionDto ToDto(AdPlatformConnection connection) => new()
    {
        Scope = connection.Scope,
        InstitutionId = connection.InstitutionId,
        Platform = connection.Platform,
        ProviderUserName = connection.ProviderUserName,
        ProviderUserId = connection.ProviderUserId,
        Accounts = Deserialize<List<AdPlatformAccount>>(connection.AccountsJson),
        Pages = Deserialize<List<AdPlatformPage>>(connection.PagesJson),
        SelectedAccountId = connection.SelectedAccountId,
        MetaPageId = connection.MetaPageId,
        InstagramAccountId = connection.InstagramAccountId,
        GoogleManagerCustomerId = connection.GoogleManagerCustomerId,
        ConnectedAtUtc = connection.ConnectedAtUtc,
        TokenExpiresAtUtc = connection.TokenExpiresAtUtc
    };
}
