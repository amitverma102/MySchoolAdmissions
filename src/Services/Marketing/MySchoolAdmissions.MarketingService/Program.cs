using MySchoolAdmissions.MarketingService.Data;
using Microsoft.EntityFrameworkCore;
using MySchoolAdmissions.Core.Configuration;
using MySchoolAdmissions.Core.Data;
using MySchoolAdmissions.Core.Security;

var builder = WebApplication.CreateBuilder(args);

// Connect to Azure Key Vault if configured
builder.Configuration.AddAzureKeyVaultIfConfigured();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddTenantJwtAuthentication(builder.Configuration);

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
    context.Database.ExecuteSqlRaw("ALTER TABLE \"AutopilotConfigs\" ADD COLUMN IF NOT EXISTS \"InstitutionId\" uuid;");
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
