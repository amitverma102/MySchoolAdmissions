using MySchoolAdmissions.MarketingService.Data;
using Microsoft.EntityFrameworkCore;
using MySchoolAdmissions.Core.Configuration;
using MySchoolAdmissions.Core.Data;
using MySchoolAdmissions.Core.Security;
using MySchoolAdmissions.MarketingService.Services;

var builder = WebApplication.CreateBuilder(args);

// Connect to Azure Key Vault if configured
builder.Configuration.AddAzureKeyVaultIfConfigured();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddTenantJwtAuthentication(builder.Configuration);
builder.Services.AddHttpClient();
builder.Services.AddSingleton<IAdTokenProtector, AesAdTokenProtector>();

// Configure Azure PostgreSQL DB Context
builder.Services.AddAzurePostgreSqlDbContext<MarketingDbContext>(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

try
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<MarketingDbContext>();
    context.Database.EnsureCreated();
    context.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS "AdPlatformConnections" (
            "Id" uuid PRIMARY KEY,
            "InstitutionId" uuid NULL,
            "Scope" varchar(24) NOT NULL DEFAULT 'Institution',
            "Platform" varchar(32) NOT NULL,
            "ProviderUserId" text NOT NULL,
            "ProviderUserName" text NOT NULL,
            "AccountsJson" text NOT NULL,
            "PagesJson" text NOT NULL DEFAULT '[]',
            "SelectedAccountId" text NULL,
            "MetaPageId" text NULL,
            "InstagramAccountId" text NULL,
            "GoogleManagerCustomerId" text NULL,
            "EncryptedAccessToken" text NOT NULL,
            "EncryptedRefreshToken" text NULL,
            "TokenExpiresAtUtc" timestamptz NULL,
            "ConnectedAtUtc" timestamptz NOT NULL,
            "UpdatedAtUtc" timestamptz NULL,
            CONSTRAINT "UX_AdPlatformConnections_Institution_Platform" UNIQUE ("InstitutionId", "Platform")
        );
        ALTER TABLE "AdPlatformConnections" ALTER COLUMN "InstitutionId" DROP NOT NULL;
        ALTER TABLE "AdPlatformConnections" ADD COLUMN IF NOT EXISTS "Scope" varchar(24) NOT NULL DEFAULT 'Institution';
        ALTER TABLE "AdPlatformConnections" ADD COLUMN IF NOT EXISTS "PagesJson" text NOT NULL DEFAULT '[]';
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_AdPlatformConnections_InstitutionId_Platform"
            ON "AdPlatformConnections" ("InstitutionId", "Platform") WHERE "Scope" = 'Institution' AND "InstitutionId" IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_AdPlatformConnections_Scope_Platform"
            ON "AdPlatformConnections" ("Scope", "Platform") WHERE "Scope" = 'Global';
        CREATE TABLE IF NOT EXISTS "AdPlatformOAuthStates" (
            "Id" uuid PRIMARY KEY,
            "StateHash" varchar(64) NOT NULL UNIQUE,
            "InstitutionId" uuid NULL,
            "Scope" varchar(24) NOT NULL DEFAULT 'Institution',
            "Platform" varchar(32) NOT NULL,
            "CreatedByUserId" text NOT NULL,
            "ExpiresAtUtc" timestamptz NOT NULL
        );
        ALTER TABLE "AdPlatformOAuthStates" ALTER COLUMN "InstitutionId" DROP NOT NULL;
        ALTER TABLE "AdPlatformOAuthStates" ADD COLUMN IF NOT EXISTS "Scope" varchar(24) NOT NULL DEFAULT 'Institution';
        CREATE TABLE IF NOT EXISTS "GeneralAds" (
            "Id" uuid PRIMARY KEY,
            "Name" varchar(200) NOT NULL,
            "AdvertiserOrTopic" text NOT NULL,
            "RelatedInstitutionName" text NULL,
            "Headline" text NOT NULL,
            "PrimaryText" text NOT NULL,
            "Description" text NOT NULL,
            "DestinationUrl" text NOT NULL,
            "ImageUrl" text NULL,
            "GoogleHeadlinesJson" text NOT NULL DEFAULT '[]',
            "GoogleDescriptionsJson" text NOT NULL DEFAULT '[]',
            "KeywordsJson" text NOT NULL DEFAULT '[]',
            "BudgetInr" numeric NOT NULL,
            "StartDateUtc" timestamptz NOT NULL,
            "EndDateUtc" timestamptz NOT NULL,
            "Status" varchar(32) NOT NULL,
            "CreatedByUserId" text NOT NULL,
            "CreatedAtUtc" timestamptz NOT NULL,
            "UpdatedAtUtc" timestamptz NULL
        );
        CREATE TABLE IF NOT EXISTS "GeneralAdPublications" (
            "Id" uuid PRIMARY KEY,
            "GeneralAdId" uuid NOT NULL,
            "Platform" varchar(32) NOT NULL,
            "Status" varchar(32) NOT NULL,
            "ExternalIdsJson" text NOT NULL DEFAULT '{{}}',
            "Error" text NULL,
            "CreatedByUserId" text NOT NULL,
            "CreatedAtUtc" timestamptz NOT NULL,
            "CompletedAtUtc" timestamptz NULL,
            CONSTRAINT "UX_GeneralAdPublications_Ad_Platform" UNIQUE ("GeneralAdId", "Platform")
        );
        """);
    // The production database is shared with other services, so EnsureCreated can be a no-op
    // even when Marketing tables are absent. Create the new ad tables before altering an
    // optional legacy table; otherwise that ALTER can abort all schema setup on startup.
    context.Database.ExecuteSqlRaw("ALTER TABLE IF EXISTS \"AutopilotConfigs\" ADD COLUMN IF NOT EXISTS \"InstitutionId\" uuid;");
    await MarketingDbSeeder.SeedAsync(context);
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Could not run Database.EnsureCreated or SeedAsync on startup; continuing...");
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
