using MySchoolAdmissions.ConfigurationService.Data;
using Microsoft.EntityFrameworkCore;
using MySchoolAdmissions.Core.Configuration;
using MySchoolAdmissions.Core.Data;
using MySchoolAdmissions.Core.Security;

var builder = WebApplication.CreateBuilder(args);

// Connect to Azure Key Vault if configured
builder.Configuration.AddAzureKeyVaultIfConfigured();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddTenantJwtAuthentication(builder.Configuration);

// Configure Azure PostgreSQL DbContext
builder.Services.AddAzurePostgreSqlDbContext<ConfigurationDbContext>(builder.Configuration);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Auto-migrate for Dev (As specified in original implementation plan)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ConfigurationDbContext>();
    dbContext.Database.EnsureCreated();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
