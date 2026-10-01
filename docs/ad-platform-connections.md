# Tenant ad account connections

Ad account authorization has two isolated scopes. Institution administrators authorize one institution's own Meta Business user or Google Ads user. Super Admins separately authorize global accounts for General Ads; those account rows have no `InstitutionId` and are not shared with institution campaigns. Provider tokens are encrypted with AES-256-GCM before they are stored; token values are never returned from the API.

## Required service configuration

Set these values in Azure Key Vault (or environment variables in local development); do not commit real values to `appsettings.json`:

- `AdIntegrations:TokenEncryptionKey`: base64-encoded random 32-byte key. Back it up securely. Losing or rotating this key without re-encrypting the records makes saved provider connections unusable.
- `AdIntegrations:FrontendOrigin`: exact HTTPS origin of the web portal, used as the OAuth popup `postMessage` target.
- `AdIntegrations:Meta:ClientId`, `AdIntegrations:Meta:ClientSecret`, `AdIntegrations:Meta:RedirectUri`, and optionally `AdIntegrations:Meta:ApiVersion`.
- `AdIntegrations:GoogleAds:ClientId`, `AdIntegrations:GoogleAds:ClientSecret`, `AdIntegrations:GoogleAds:RedirectUri`, `AdIntegrations:GoogleAds:DeveloperToken`, and optionally `AdIntegrations:GoogleAds:ApiVersion`.

Register these exact callback URLs in the provider apps:

- `{Marketing API base URL}/api/ad-platforms/oauth/meta/callback`
- `{Marketing API base URL}/api/ad-platforms/oauth/google/callback`

The API Gateway forwards the callback paths anonymously to the Marketing Service. The callbacks are protected by a one-use, ten-minute OAuth state stored with the target institution. All account management endpoints require an authenticated institution administrator and resolve the tenant from the validated identity; Super Admin requests must include the selected tenant header.

## Separate workflows

General Ads are owned by Super Admin and do not belong to an institute campaign. They can advertise MySchoolAdmissions, another product, public information, or optionally mention an institute. Super Admin creates General Ads in the General Ads workspace, then separately submits each ad to the global Meta account (Facebook and linked Instagram placements) and/or global Google Ads Search account. Publishing requires ad copy and an HTTPS destination URL, a publicly reachable HTTPS image for Meta, and Google Search headlines, descriptions, and keywords for Google. The General Ad's total INR budget and dates are used; connected provider accounts must use INR. Submissions are active, subject to provider review and billing. Each platform submission has its own status and provider resource IDs, and duplicate submissions are blocked.

If a submission fails before creating any provider resources, use **Edit** on that ad to correct its image URL or other details, then retry the platform submission. Ads with successful, in-progress, or partially created provider resources remain locked to preserve the submission record.

## Publish a Meta ad as Super Admin

Before starting, make sure the production Marketing Service has `AdIntegrations:Meta:ClientId` set to the Meta App ID and `AdIntegrations:Meta:ClientSecret` set from an Azure Container App secret. The deployed Meta callback is:

`https://api-gateway.calmsky-907b66e9.centralindia.azurecontainerapps.io/api/ad-platforms/oauth/meta/callback`

The same exact URL must be listed in the Meta app's **Valid OAuth Redirect URIs**. The Meta app must also have the required login and advertising permissions available to the connecting user. In development mode, use a Meta account assigned an app role; broader institute use can require Meta review and additional access.

1. Sign in to MySchoolAdmissions with a **Super Admin** account.
2. Open **Campaigns → General Ads**.
3. Under **Global ad platform accounts**, select **Connect Meta** and authorize the Meta user who owns or can manage the intended ad account.
4. In the returned connection card, choose the Meta ad account that uses **INR**. Choose a Facebook Page. To include Instagram placements, select its linked Instagram professional account. Select **Save account selection**.
5. Select **Create General Ad**. Enter the ad name, advertiser or topic, headline, primary text, HTTPS destination URL, a publicly accessible HTTPS image URL, total INR budget, and start/end dates. Related institute is optional. The image URL must be reachable by Meta without signing in.
6. Select **Save draft**. Check the draft's text, image, dates, and budget.
7. Select **Publish Meta / Instagram** and confirm the submission. Meta publishing creates and activates a campaign, ad set, and ad using this General Ad's budget and dates. Instagram placements are included only if a linked Instagram professional account was selected; otherwise the ad runs on Facebook placements.
8. Check the publication status and Meta resource IDs on the ad card. Meta may still review the submitted ad, and actual delivery and charges depend on Meta's review, account status, and billing settings.

Publishing to Meta is a live advertising action. Publishing this same General Ad to another platform is a separate action with a separate platform submission and budget.

Lead import remains a separate integration. It needs form/webhook subscriptions, provider lead retrieval permissions, signature/verification, and institution-specific field mapping. Connecting an ad account does not subscribe lead forms or enable imports.
