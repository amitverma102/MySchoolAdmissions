using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySchoolAdmissions.MarketingService.Data;
using MySchoolAdmissions.MarketingService.DTOs;
using MySchoolAdmissions.MarketingService.Models;
using MySchoolAdmissions.MarketingService.Services;

namespace MySchoolAdmissions.MarketingService.Controllers;

[ApiController]
[Route("api/general-ads")]
public sealed class GeneralAdsController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly MarketingDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IAdTokenProtector _tokenProtector;
    private readonly ILogger<GeneralAdsController> _logger;

    public GeneralAdsController(MarketingDbContext context, IHttpClientFactory httpClientFactory, IConfiguration configuration, IAdTokenProtector tokenProtector, ILogger<GeneralAdsController> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _tokenProtector = tokenProtector;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAds()
    {
        if (!IsSuperAdmin()) return Forbid();
        var ads = await _context.GeneralAds.OrderByDescending(ad => ad.CreatedAtUtc).ToListAsync();
        return Ok(await ToDtosAsync(ads));
    }

    [HttpPost]
    public async Task<IActionResult> CreateAd([FromBody] PublishGeneralAdDto dto)
    {
        if (!IsSuperAdmin()) return Forbid();
        var validation = Validate(dto);
        if (validation != null) return BadRequest(new { message = validation });
        var ad = new GeneralAd();
        ApplyDto(ad, dto);
        ad.CreatedByUserId = GetUserId();
        ad.Status = "Draft";
        _context.GeneralAds.Add(ad);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAds), new { id = ad.Id }, await ToDtoAsync(ad));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateAd(Guid id, [FromBody] PublishGeneralAdDto dto)
    {
        if (!IsSuperAdmin()) return Forbid();
        var ad = await _context.GeneralAds.SingleOrDefaultAsync(item => item.Id == id);
        if (ad == null) return NotFound();
        var publications = await _context.GeneralAdPublications.Where(item => item.GeneralAdId == id).ToListAsync();
        if (publications.Any(item => !CanSafelyEditFailedPublication(item)))
            return Conflict(new { message = "This ad has a successful, in-progress, or partially created provider submission and can no longer be edited." });
        var validation = Validate(dto, allowPastStartDate: true);
        if (validation != null) return BadRequest(new { message = validation });
        ApplyDto(ad, dto);
        ad.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(await ToDtoAsync(ad));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAd(Guid id)
    {
        if (!IsSuperAdmin()) return Forbid();
        var ad = await _context.GeneralAds.SingleOrDefaultAsync(item => item.Id == id);
        if (ad == null) return NoContent();
        if (await _context.GeneralAdPublications.AnyAsync(item => item.GeneralAdId == id))
            return Conflict(new { message = "This ad has a provider submission; keep its record for audit." });
        _context.GeneralAds.Remove(ad);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/publish/{platform}")]
    public async Task<IActionResult> Publish(Guid id, string platform)
    {
        if (!IsSuperAdmin()) return Forbid();
        platform = NormalizePlatform(platform);
        if (platform is not ("Meta" or "GoogleAds")) return BadRequest(new { message = "Platform must be Meta or GoogleAds." });
        var ad = await _context.GeneralAds.SingleOrDefaultAsync(item => item.Id == id);
        if (ad == null) return NotFound();
        var connection = await _context.AdPlatformConnections.SingleOrDefaultAsync(item => item.Scope == "Global" && item.InstitutionId == null && item.Platform == platform);
        if (connection == null || string.IsNullOrWhiteSpace(connection.SelectedAccountId))
            return BadRequest(new { message = $"Connect and select a global Super Admin {platform} account first." });

        var existing = await _context.GeneralAdPublications.SingleOrDefaultAsync(item => item.GeneralAdId == id && item.Platform == platform);
        if (existing != null && existing.Status != "Failed")
            return Conflict(new { message = $"This General Ad already has a {platform} submission ({existing.Status}). Review its provider IDs before retrying." });
        var publication = existing ?? new GeneralAdPublication { GeneralAdId = id, Platform = platform, CreatedByUserId = GetUserId() };
        publication.Status = "Publishing";
        publication.Error = null;
        publication.CompletedAtUtc = null;
        if (existing == null) _context.GeneralAdPublications.Add(publication);
        try { await _context.SaveChangesAsync(); }
        catch (DbUpdateException) { return Conflict(new { message = "A publish request is already in progress or was submitted." }); }

        try
        {
            var token = platform == "Meta" ? GetMetaToken(connection) : await GetGoogleTokenAsync(connection);
            var externalIds = platform == "Meta"
                ? await PublishMetaAsync(ad, connection, token, publication)
                : await PublishGoogleAsync(ad, connection, token);
            publication.ExternalIdsJson = JsonSerializer.Serialize(externalIds);
            publication.Status = "Published";
            publication.CompletedAtUtc = DateTime.UtcNow;
            ad.Status = "Published";
            ad.UpdatedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(await ToDtoAsync(ad));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not publish General Ad {GeneralAdId} to {Platform}.", id, platform);
            publication.Status = "Failed";
            publication.Error = SafeProviderMessage(ex.Message);
            publication.CompletedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Problem(title: "Ad publish failed", detail: publication.Error, statusCode: StatusCodes.Status502BadGateway);
        }
    }

    private async Task<Dictionary<string, string>> PublishMetaAsync(GeneralAd ad, AdPlatformConnection connection, string token, GeneralAdPublication publication)
    {
        if (!Uri.TryCreate(ad.ImageUrl, UriKind.Absolute, out var imageUrl) || imageUrl.Scheme != Uri.UriSchemeHttps)
            throw new InvalidOperationException("Meta ads require a public HTTPS image URL.");
        if (connection.TokenExpiresAtUtc <= DateTime.UtcNow.AddMinutes(2)) throw new InvalidOperationException("Reconnect the global Meta account before publishing.");
        var account = Deserialize<List<AdPlatformAccount>>(connection.AccountsJson).SingleOrDefault(item => item.Id == connection.SelectedAccountId);
        if (!string.Equals(account?.Currency, "INR", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("The global Meta ad account must use INR.");
        var selectedPage = Deserialize<List<AdPlatformPage>>(connection.PagesJson).SingleOrDefault(page => page.Id == connection.MetaPageId);
        if (selectedPage == null) throw new InvalidOperationException("Select an available Facebook Page in Global Ad Accounts before publishing.");
        if (!string.IsNullOrWhiteSpace(connection.InstagramAccountId) && selectedPage.InstagramBusinessAccountId != connection.InstagramAccountId)
            throw new InvalidOperationException("The selected Instagram account is not linked to the selected Facebook Page. Choose a linked Instagram account or select None.");

        var version = _configuration["AdIntegrations:Meta:ApiVersion"] ?? "v23.0";
        if (!version.StartsWith('v')) version = $"v{version}";
        var accountId = connection.SelectedAccountId!.StartsWith("act_", StringComparison.OrdinalIgnoreCase) ? connection.SelectedAccountId : $"act_{connection.SelectedAccountId}";
        var client = _httpClientFactory.CreateClient();
        var ids = Deserialize<Dictionary<string, string>>(publication.ExternalIdsJson);
        if (!ids.TryGetValue("campaignId", out var campaignId))
        {
            var campaign = await MetaPostAsync(client, $"https://graph.facebook.com/{version}/{accountId}/campaigns", new Dictionary<string, string>
            {
                ["name"] = ad.Name, ["objective"] = "OUTCOME_TRAFFIC", ["status"] = "PAUSED", ["special_ad_categories"] = "[]",
                ["is_adset_budget_sharing_enabled"] = "false", ["access_token"] = token
            }, "campaign creation");
            campaignId = RequiredId(campaign, "id");
            ids["campaignId"] = campaignId;
            await SavePartialIdsAsync(publication, ids);
        }

        var now = DateTime.UtcNow;
        var start = ad.StartDateUtc > now ? ad.StartDateUtc : now.AddMinutes(15);
        var end = ad.EndDateUtc;
        if (end <= start) throw new InvalidOperationException("The General Ad end date must be after its start date.");
        var targeting = new JsonObject
        {
            ["geo_locations"] = new JsonObject { ["countries"] = new JsonArray("IN") },
            ["publisher_platforms"] = JsonSerializer.SerializeToNode(string.IsNullOrWhiteSpace(connection.InstagramAccountId) ? new[] { "facebook" } : new[] { "facebook", "instagram" }),
            ["facebook_positions"] = JsonSerializer.SerializeToNode(new[] { "feed", "story", "facebook_reels" })
        };
        if (!string.IsNullOrWhiteSpace(connection.InstagramAccountId)) targeting["instagram_positions"] = JsonSerializer.SerializeToNode(new[] { "stream", "story", "reels" });
        if (!ids.TryGetValue("adSetId", out var adSetId))
        {
            var adSet = await MetaPostAsync(client, $"https://graph.facebook.com/{version}/{accountId}/adsets", new Dictionary<string, string>
            {
                ["name"] = ad.Name + " Ad Set", ["campaign_id"] = campaignId,
                ["lifetime_budget"] = ToMinorUnits(ad.BudgetInr, 2).ToString(CultureInfo.InvariantCulture),
                ["billing_event"] = "IMPRESSIONS", ["optimization_goal"] = "LINK_CLICKS", ["bid_strategy"] = "LOWEST_COST_WITHOUT_CAP",
                ["destination_type"] = "WEBSITE", ["targeting"] = targeting.ToJsonString(),
                ["start_time"] = start.ToString("O", CultureInfo.InvariantCulture), ["end_time"] = end.ToString("O", CultureInfo.InvariantCulture),
                ["status"] = "PAUSED", ["access_token"] = token
            }, "ad set creation");
            adSetId = RequiredId(adSet, "id");
            ids["adSetId"] = adSetId;
            await SavePartialIdsAsync(publication, ids);
        }

        if (!ids.TryGetValue("imageHash", out var imageHash))
        {
            var imageAsset = await DownloadPublicImageAsync(ad.ImageUrl!);
            using var upload = new MultipartFormDataContent();
            upload.Add(new StringContent(token), "access_token");
            var imageContent = new ByteArrayContent(imageAsset.Bytes);
            imageContent.Headers.ContentType = MediaTypeHeaderValue.Parse(imageAsset.ContentType);
            upload.Add(imageContent, "filename", imageAsset.FileName);
            var image = await MetaPostAsync(client, $"https://graph.facebook.com/{version}/{accountId}/adimages", upload, "image upload");
            imageHash = image["images"]?.AsObject().FirstOrDefault().Value?["hash"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(imageHash)) throw new InvalidOperationException("Meta did not accept the General Ad image URL.");
            ids["imageHash"] = imageHash;
            await SavePartialIdsAsync(publication, ids);
        }
        var story = new JsonObject
        {
            ["page_id"] = connection.MetaPageId,
            ["link_data"] = new JsonObject
            {
                ["link"] = ad.DestinationUrl, ["message"] = ad.PrimaryText, ["name"] = ad.Headline,
                ["description"] = ad.Description, ["image_hash"] = imageHash,
                ["call_to_action"] = new JsonObject { ["type"] = "LEARN_MORE", ["value"] = new JsonObject { ["link"] = ad.DestinationUrl } }
            }
        };
        if (!string.IsNullOrWhiteSpace(connection.InstagramAccountId)) story["instagram_actor_id"] = connection.InstagramAccountId;
        if (!ids.TryGetValue("creativeId", out var creativeId))
        {
            var creative = await MetaPostAsync(client, $"https://graph.facebook.com/{version}/{accountId}/adcreatives", new Dictionary<string, string>
            {
                ["name"] = ad.Name + " Creative", ["object_story_spec"] = story.ToJsonString(), ["access_token"] = token
            }, "ad creative creation");
            creativeId = RequiredId(creative, "id");
            ids["creativeId"] = creativeId;
            await SavePartialIdsAsync(publication, ids);
        }

        if (!ids.TryGetValue("adId", out var adId))
        {
            var createdAd = await MetaPostAsync(client, $"https://graph.facebook.com/{version}/{accountId}/ads", new Dictionary<string, string>
            {
                ["name"] = ad.Name + " Ad", ["adset_id"] = adSetId, ["creative"] = JsonSerializer.Serialize(new { creative_id = creativeId }),
                ["status"] = "PAUSED", ["access_token"] = token
            }, "ad creation");
            adId = RequiredId(createdAd, "id");
            ids["adId"] = adId;
            await SavePartialIdsAsync(publication, ids);
        }
        await MetaPostAsync(client, $"https://graph.facebook.com/{version}/{campaignId}", new Dictionary<string, string> { ["status"] = "ACTIVE", ["access_token"] = token }, "campaign activation");
        await MetaPostAsync(client, $"https://graph.facebook.com/{version}/{adSetId}", new Dictionary<string, string> { ["status"] = "ACTIVE", ["access_token"] = token }, "ad set activation");
        await MetaPostAsync(client, $"https://graph.facebook.com/{version}/{adId}", new Dictionary<string, string> { ["status"] = "ACTIVE", ["access_token"] = token }, "ad activation");
        return ids;
    }

    private async Task<Dictionary<string, string>> PublishGoogleAsync(GeneralAd ad, AdPlatformConnection connection, string token)
    {
        if (connection.TokenExpiresAtUtc <= DateTime.UtcNow.AddMinutes(2)) throw new InvalidOperationException("Reconnect the global Google Ads account before publishing.");
        var client = _httpClientFactory.CreateClient();
        var customerId = connection.SelectedAccountId!.Replace("-", string.Empty, StringComparison.Ordinal);
        var apiVersion = _configuration["AdIntegrations:GoogleAds:ApiVersion"] ?? "v25";
        if (!apiVersion.StartsWith('v')) apiVersion = $"v{apiVersion}";
        var developerToken = _configuration["AdIntegrations:GoogleAds:DeveloperToken"];
        if (string.IsNullOrWhiteSpace(developerToken)) throw new InvalidOperationException("Google Ads developer token is not configured.");
        var currency = await GoogleCurrencyAsync(client, apiVersion, customerId, token, developerToken, connection.GoogleManagerCustomerId);
        if (!string.Equals(currency, "INR", StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException($"The global Google Ads account must use INR; its currency is {currency}.");

        var headlines = Deserialize<List<string>>(ad.GoogleHeadlinesJson).Where(value => !string.IsNullOrWhiteSpace(value)).Distinct().Take(15).ToList();
        var descriptions = Deserialize<List<string>>(ad.GoogleDescriptionsJson).Where(value => !string.IsNullOrWhiteSpace(value)).Distinct().Take(4).ToList();
        var keywords = Deserialize<List<string>>(ad.KeywordsJson).Where(value => !string.IsNullOrWhiteSpace(value)).Distinct(StringComparer.OrdinalIgnoreCase).Take(20).ToList();
        if (headlines.Count < 3 || headlines.Any(value => value.Length > 30) || descriptions.Count < 2 || descriptions.Any(value => value.Length > 90) || keywords.Count == 0)
            throw new InvalidOperationException("Google Search requires 3 to 15 headlines (max 30 characters), 2 to 4 descriptions (max 90 characters), and at least one keyword.");
        var start = ad.StartDateUtc.Date < DateTime.UtcNow.Date ? DateTime.UtcNow.Date.AddDays(1) : ad.StartDateUtc.Date;
        var end = ad.EndDateUtc.Date;
        if (end <= start) throw new InvalidOperationException("The General Ad end date must be after its start date.");

        var operations = new JsonArray
        {
            new JsonObject { ["create"] = new JsonObject { ["resourceName"] = $"customers/{customerId}/campaignBudgets/-1", ["name"] = ad.Name + " Budget", ["period"] = "CUSTOM_PERIOD", ["totalAmountMicros"] = ToMicros(ad.BudgetInr).ToString(CultureInfo.InvariantCulture), ["explicitlyShared"] = false } },
            new JsonObject { ["create"] = new JsonObject { ["resourceName"] = $"customers/{customerId}/campaigns/-2", ["name"] = ad.Name, ["advertisingChannelType"] = "SEARCH", ["status"] = "ENABLED", ["campaignBudget"] = $"customers/{customerId}/campaignBudgets/-1", ["manualCpc"] = new JsonObject(), ["networkSettings"] = new JsonObject { ["targetGoogleSearch"] = true, ["targetSearchNetwork"] = true, ["targetContentNetwork"] = false, ["targetPartnerSearchNetwork"] = false }, ["startDate"] = start.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), ["endDate"] = end.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), ["containsEuPoliticalAdvertising"] = "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING" } },
            new JsonObject { ["create"] = new JsonObject { ["resourceName"] = $"customers/{customerId}/adGroups/-3", ["name"] = ad.Name + " Ad Group", ["campaign"] = $"customers/{customerId}/campaigns/-2", ["status"] = "ENABLED", ["type"] = "SEARCH_STANDARD", ["cpcBidMicros"] = "10000000" } },
            new JsonObject { ["create"] = new JsonObject { ["resourceName"] = $"customers/{customerId}/campaignCriteria/-4", ["campaign"] = $"customers/{customerId}/campaigns/-2", ["negative"] = false, ["location"] = new JsonObject { ["geoTargetConstant"] = "geoTargetConstants/2356" } } }
        };
        for (var index = 0; index < keywords.Count; index++)
            operations.Add(new JsonObject { ["create"] = new JsonObject { ["resourceName"] = $"customers/{customerId}/adGroupCriteria/{-5-index}", ["adGroup"] = $"customers/{customerId}/adGroups/-3", ["status"] = "ENABLED", ["keyword"] = new JsonObject { ["text"] = keywords[index], ["matchType"] = "PHRASE" } } });
        operations.Add(new JsonObject { ["create"] = new JsonObject { ["resourceName"] = $"customers/{customerId}/adGroupAds/-30", ["adGroup"] = $"customers/{customerId}/adGroups/-3", ["status"] = "ENABLED", ["ad"] = new JsonObject { ["responsiveSearchAd"] = new JsonObject { ["headlines"] = JsonSerializer.SerializeToNode(headlines.Select(text => new { text })), ["descriptions"] = JsonSerializer.SerializeToNode(descriptions.Select(text => new { text })) }, ["finalUrls"] = JsonSerializer.SerializeToNode(new[] { ad.DestinationUrl }) } } });
        var request = new HttpRequestMessage(HttpMethod.Post, $"https://googleads.googleapis.com/{apiVersion}/customers/{customerId}/googleAds:mutate") { Content = JsonContent.Create(new { operations, partialFailure = false, validateOnly = false }) };
        SetGoogleHeaders(request, token, developerToken, connection.GoogleManagerCustomerId);
        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException(ExtractGoogleError(body, response.StatusCode));
        var results = JsonNode.Parse(body)?["mutateOperationResponses"]?.AsArray() ?? throw new InvalidOperationException("Google Ads returned no created resources.");
        var ids = new Dictionary<string, string>();
        foreach (var result in results)
            if (result is JsonObject operation)
                foreach (var entry in operation)
                {
                    var resourceName = entry.Value?["resourceName"]?.GetValue<string>();
                    if (!string.IsNullOrWhiteSpace(resourceName)) ids[resourceName.Split('/')[^2]] = resourceName.Split('/')[^1];
                }
        return ids;
    }

    private async Task SavePartialIdsAsync(GeneralAdPublication publication, Dictionary<string, string> ids)
    {
        publication.ExternalIdsJson = JsonSerializer.Serialize(ids);
        await _context.SaveChangesAsync();
    }

    private async Task<string> GoogleCurrencyAsync(HttpClient client, string version, string customerId, string token, string developerToken, string? managerId)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"https://googleads.googleapis.com/{version}/customers/{customerId}/googleAds:search") { Content = JsonContent.Create(new { query = "SELECT customer.currency_code FROM customer LIMIT 1" }) };
        SetGoogleHeaders(request, token, developerToken, managerId);
        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException(ExtractGoogleError(body, response.StatusCode));
        return JsonNode.Parse(body)?["results"]?.AsArray().FirstOrDefault()?["customer"]?["currencyCode"]?.GetValue<string>() ?? string.Empty;
    }

    private async Task<string> GetGoogleTokenAsync(AdPlatformConnection connection)
    {
        if (connection.TokenExpiresAtUtc > DateTime.UtcNow.AddMinutes(2)) return _tokenProtector.Unprotect(connection.EncryptedAccessToken);
        if (string.IsNullOrWhiteSpace(connection.EncryptedRefreshToken)) throw new InvalidOperationException("Reconnect the global Google Ads account before publishing.");
        using var response = await _httpClientFactory.CreateClient().PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _configuration["AdIntegrations:GoogleAds:ClientId"] ?? string.Empty,
            ["client_secret"] = _configuration["AdIntegrations:GoogleAds:ClientSecret"] ?? string.Empty,
            ["refresh_token"] = _tokenProtector.Unprotect(connection.EncryptedRefreshToken), ["grant_type"] = "refresh_token"
        }));
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException("Reconnect the global Google Ads account before publishing.");
        var json = JsonNode.Parse(body);
        var access = json?["access_token"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(access)) throw new InvalidOperationException("Google could not refresh the global authorization.");
        connection.EncryptedAccessToken = _tokenProtector.Protect(access);
        connection.TokenExpiresAtUtc = DateTime.UtcNow.AddSeconds(json?["expires_in"]?.GetValue<int>() ?? 3600);
        connection.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return access;
    }

    private string GetMetaToken(AdPlatformConnection connection)
    {
        if (connection.TokenExpiresAtUtc <= DateTime.UtcNow.AddMinutes(2)) throw new InvalidOperationException("Reconnect the global Meta account before publishing.");
        return _tokenProtector.Unprotect(connection.EncryptedAccessToken);
    }

    private static async Task<JsonObject> MetaPostAsync(HttpClient client, string url, Dictionary<string, string> values, string operation)
    {
        using var content = new FormUrlEncodedContent(values);
        return await MetaPostAsync(client, url, content, operation);
    }

    private static async Task<JsonObject> MetaPostAsync(HttpClient client, string url, HttpContent content, string operation)
    {
        using var response = await client.PostAsync(url, content);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            try
            {
                var error = JsonNode.Parse(body)?["error"] as JsonObject;
                var parts = new List<string> { error?["message"]?.GetValue<string>() ?? $"Meta API returned {(int)response.StatusCode}." };
                var userTitle = error?["error_user_title"]?.GetValue<string>();
                var userMessage = error?["error_user_msg"]?.GetValue<string>();
                var code = error?["code"]?.ToJsonString();
                var subcode = error?["error_subcode"]?.ToJsonString();
                var errorData = error?["error_data"]?.ToJsonString();
                var traceId = error?["fbtrace_id"]?.GetValue<string>();
                if (!string.IsNullOrWhiteSpace(userTitle)) parts.Add(userTitle);
                if (!string.IsNullOrWhiteSpace(userMessage)) parts.Add(userMessage);
                if (!string.IsNullOrWhiteSpace(code)) parts.Add($"Meta code {code.Trim('"')}.");
                if (!string.IsNullOrWhiteSpace(subcode)) parts.Add($"Subcode {subcode.Trim('"')}.");
                if (!string.IsNullOrWhiteSpace(traceId)) parts.Add($"Trace ID: {traceId}.");
                if (!string.IsNullOrWhiteSpace(errorData)) parts.Add($"Meta details: {(errorData.Length > 250 ? errorData[..250] : errorData)}");
                throw new InvalidOperationException($"Meta {operation} failed: {string.Join(" ", parts)}");
            }
            catch (JsonException)
            {
                throw new InvalidOperationException($"Meta {operation} failed with HTTP {(int)response.StatusCode}.");
            }
        }
        return JsonNode.Parse(body)?.AsObject() ?? throw new InvalidOperationException("Meta returned an empty response.");
    }

    private static async Task<(byte[] Bytes, string ContentType, string FileName)> DownloadPublicImageAsync(string imageUrl)
    {
        if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
            throw new InvalidOperationException("Meta ads require a public HTTPS image URL.");

        using var handler = new SocketsHttpHandler { AllowAutoRedirect = false, ConnectTimeout = TimeSpan.FromSeconds(10) };
        handler.ConnectCallback = async (context, cancellationToken) =>
        {
            var addresses = await Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, cancellationToken);
            var address = addresses.FirstOrDefault(IsPublicAddress)
                ?? throw new InvalidOperationException("The ad image URL must resolve to a public internet address.");
            var socket = new Socket(address.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
            try
            {
                await socket.ConnectAsync(new IPEndPoint(address, context.DnsEndPoint.Port), cancellationToken);
                return new NetworkStream(socket, ownsSocket: true);
            }
            catch
            {
                socket.Dispose();
                throw;
            }
        };

        using var imageClient = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(30) };
        for (var redirects = 0; redirects <= 3; redirects++)
        {
            if (uri.Scheme != Uri.UriSchemeHttps)
                throw new InvalidOperationException("The ad image URL and its redirects must use HTTPS.");

            using var response = await imageClient.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead);
            if ((int)response.StatusCode is >= 300 and < 400)
            {
                if (redirects == 3 || response.Headers.Location == null)
                    throw new InvalidOperationException("The ad image URL redirected too many times.");
                uri = response.Headers.Location.IsAbsoluteUri ? response.Headers.Location : new Uri(uri, response.Headers.Location);
                continue;
            }

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Could not download the ad image (HTTP {(int)response.StatusCode}).");
            var contentType = response.Content.Headers.ContentType?.MediaType;
            if (contentType is not ("image/jpeg" or "image/png" or "image/gif" or "image/webp"))
                throw new InvalidOperationException("The ad image must be a JPEG, PNG, GIF, or WebP image.");
            const int maxImageBytes = 10 * 1024 * 1024;
            if (response.Content.Headers.ContentLength > maxImageBytes)
                throw new InvalidOperationException("The ad image must be 10 MB or smaller.");

            await using var stream = await response.Content.ReadAsStreamAsync();
            using var buffer = new MemoryStream();
            var chunk = new byte[81920];
            int read;
            while ((read = await stream.ReadAsync(chunk)) > 0)
            {
                if (buffer.Length + read > maxImageBytes)
                    throw new InvalidOperationException("The ad image must be 10 MB or smaller.");
                await buffer.WriteAsync(chunk.AsMemory(0, read));
            }

            var fileName = Path.GetFileName(Uri.UnescapeDataString(uri.AbsolutePath));
            if (string.IsNullOrWhiteSpace(fileName))
                fileName = $"ad-image.{(contentType == "image/png" ? "png" : contentType == "image/webp" ? "webp" : contentType == "image/gif" ? "gif" : "jpg")}";
            return (buffer.ToArray(), contentType, fileName);
        }

        throw new InvalidOperationException("Could not download the ad image.");
    }

    private static bool IsPublicAddress(IPAddress address)
    {
        if (address.IsIPv4MappedToIPv6) return IsPublicAddress(address.MapToIPv4());
        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = address.GetAddressBytes();
            return !(b[0] == 0 || b[0] == 10 || b[0] == 127 || b[0] >= 224 ||
                (b[0] == 100 && b[1] is >= 64 and <= 127) ||
                (b[0] == 169 && b[1] == 254) ||
                (b[0] == 172 && b[1] is >= 16 and <= 31) ||
                (b[0] == 192 && (b[1] == 168 || b[1] == 0 || b[1] == 2)) ||
                (b[0] == 198 && b[1] is 18 or 19 or 51) ||
                (b[0] == 203 && b[1] == 0 && b[2] == 113));
        }
        if (address.AddressFamily != AddressFamily.InterNetworkV6) return false;
        var bytes = address.GetAddressBytes();
        return !IPAddress.IsLoopback(address) && !address.IsIPv6LinkLocal && !address.IsIPv6SiteLocal && !address.IsIPv6Multicast &&
            (bytes[0] & 0xE0) == 0x20 && !(bytes[0] == 0x20 && bytes[1] == 0x01 && bytes[2] == 0x0D && bytes[3] == 0xB8);
    }

    private static void SetGoogleHeaders(HttpRequestMessage request, string token, string developerToken, string? managerId)
    {
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("developer-token", developerToken);
        if (!string.IsNullOrWhiteSpace(managerId)) request.Headers.Add("login-customer-id", managerId.Replace("-", string.Empty, StringComparison.Ordinal));
    }

    private static string RequiredId(JsonObject value, string property) => value[property]?.GetValue<string>() is { Length: > 0 } id ? id : throw new InvalidOperationException("Ad platform did not return a resource ID.");
    private static string ExtractGoogleError(string body, System.Net.HttpStatusCode status) => JsonNode.Parse(body)?["error"]?["message"]?.GetValue<string>() ?? $"Google Ads API returned {(int)status}.";
    private static long ToMinorUnits(decimal amount, int digits) => (long)Math.Round(amount * (decimal)Math.Pow(10, digits), MidpointRounding.AwayFromZero);
    private static long ToMicros(decimal amount) => (long)Math.Round(amount * 1_000_000m, MidpointRounding.AwayFromZero);
    private static string NormalizePlatform(string value) => value.Equals("Meta", StringComparison.OrdinalIgnoreCase) ? "Meta" : value.Equals("Google", StringComparison.OrdinalIgnoreCase) || value.Equals("GoogleAds", StringComparison.OrdinalIgnoreCase) ? "GoogleAds" : string.Empty;
    private static string? Validate(PublishGeneralAdDto dto, bool allowPastStartDate = false)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.AdvertiserOrTopic) || string.IsNullOrWhiteSpace(dto.Headline) || string.IsNullOrWhiteSpace(dto.PrimaryText)) return "Enter a name, advertiser/topic, headline, and ad text.";
        if (!Uri.TryCreate(dto.DestinationUrl, UriKind.Absolute, out var url) || url.Scheme != Uri.UriSchemeHttps) return "Enter a public HTTPS destination URL.";
        if (dto.BudgetInr <= 0) return "Budget must be greater than zero.";
        if ((!allowPastStartDate && dto.StartDateUtc.ToUniversalTime() < DateTime.UtcNow.AddMinutes(-5)) || dto.EndDateUtc.ToUniversalTime() <= dto.StartDateUtc.ToUniversalTime()) return allowPastStartDate ? "Choose an end date after the start date." : "Choose a future start date and an end date after it.";
        return null;
    }
    private static void ApplyDto(GeneralAd ad, PublishGeneralAdDto dto)
    {
        ad.Name = dto.Name.Trim(); ad.AdvertiserOrTopic = dto.AdvertiserOrTopic.Trim(); ad.RelatedInstitutionName = string.IsNullOrWhiteSpace(dto.RelatedInstitutionName) ? null : dto.RelatedInstitutionName.Trim();
        ad.Headline = dto.Headline.Trim(); ad.PrimaryText = dto.PrimaryText.Trim(); ad.Description = dto.Description.Trim(); ad.DestinationUrl = dto.DestinationUrl.Trim();
        ad.ImageUrl = string.IsNullOrWhiteSpace(dto.ImageUrl) ? null : dto.ImageUrl.Trim(); ad.GoogleHeadlinesJson = JsonSerializer.Serialize(dto.GoogleHeadlines); ad.GoogleDescriptionsJson = JsonSerializer.Serialize(dto.GoogleDescriptions); ad.KeywordsJson = JsonSerializer.Serialize(dto.Keywords);
        ad.BudgetInr = dto.BudgetInr; ad.StartDateUtc = dto.StartDateUtc.ToUniversalTime(); ad.EndDateUtc = dto.EndDateUtc.ToUniversalTime();
    }
    private async Task<IReadOnlyList<GeneralAdDto>> ToDtosAsync(List<GeneralAd> ads)
    {
        var ids = ads.Select(ad => ad.Id).ToList();
        var publications = await _context.GeneralAdPublications.Where(item => ids.Contains(item.GeneralAdId)).ToListAsync();
        return ads.Select(ad => ToDto(ad, publications.Where(item => item.GeneralAdId == ad.Id))).ToList();
    }
    private async Task<GeneralAdDto> ToDtoAsync(GeneralAd ad) => ToDto(ad, await _context.GeneralAdPublications.Where(item => item.GeneralAdId == ad.Id).ToListAsync());
    private static GeneralAdDto ToDto(GeneralAd ad, IEnumerable<GeneralAdPublication> publications) => new()
    {
        Id = ad.Id, Name = ad.Name, AdvertiserOrTopic = ad.AdvertiserOrTopic, RelatedInstitutionName = ad.RelatedInstitutionName,
        Headline = ad.Headline, PrimaryText = ad.PrimaryText, Description = ad.Description, DestinationUrl = ad.DestinationUrl, ImageUrl = ad.ImageUrl,
        GoogleHeadlines = Deserialize<List<string>>(ad.GoogleHeadlinesJson), GoogleDescriptions = Deserialize<List<string>>(ad.GoogleDescriptionsJson), Keywords = Deserialize<List<string>>(ad.KeywordsJson),
        BudgetInr = ad.BudgetInr, StartDateUtc = ad.StartDateUtc, EndDateUtc = ad.EndDateUtc, Status = ad.Status, CreatedAtUtc = ad.CreatedAtUtc,
        Publications = publications.Select(item => new GeneralAdPublicationDto { Platform = item.Platform, Status = item.Status, ExternalIdsJson = item.ExternalIdsJson, Error = item.Error, CreatedAtUtc = item.CreatedAtUtc, CompletedAtUtc = item.CompletedAtUtc }).ToList()
    };
    private static T Deserialize<T>(string json) => JsonSerializer.Deserialize<T>(json, JsonOptions) ?? throw new InvalidOperationException("Stored General Ad content is invalid.");
    private static string SafeProviderMessage(string value) => value.Length <= 500 ? value : value[..500];
    private static bool CanSafelyEditFailedPublication(GeneralAdPublication publication)
    {
        if (!string.Equals(publication.Status, "Failed", StringComparison.OrdinalIgnoreCase)) return false;
        if (string.IsNullOrWhiteSpace(publication.ExternalIdsJson)) return true;
        try
        {
            using var document = JsonDocument.Parse(publication.ExternalIdsJson);
            if (document.RootElement.ValueKind != JsonValueKind.Object) return false;
            var keys = document.RootElement.EnumerateObject().Select(property => property.Name).ToList();
            return keys.Count == 0 ||
                (publication.Platform == "Meta" && keys.All(key => key == "campaignId"));
        }
        catch (JsonException)
        {
            return false;
        }
    }
    private bool IsSuperAdmin() => User.Claims.Where(claim => claim.Type == ClaimTypes.Role || claim.Type == "role" || claim.Type == "roles" || claim.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role").SelectMany(claim => claim.Value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)).Any(role => role.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));
    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? "unknown";
}
