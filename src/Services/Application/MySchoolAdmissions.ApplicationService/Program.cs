using Microsoft.EntityFrameworkCore;
using MassTransit;
using MySchoolAdmissions.ApplicationService.Consumers;
using MySchoolAdmissions.Core.Configuration;
using MySchoolAdmissions.Core.Storage;
using MySchoolAdmissions.Core.Data;
using MySchoolAdmissions.Core.Security;

var builder = WebApplication.CreateBuilder(args);

// Connect to Azure Key Vault if configured
builder.Configuration.AddAzureKeyVaultIfConfigured();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddTenantJwtAuthentication(builder.Configuration);

// Azure PostgreSQL with transient fault resilience & connection pooling
builder.Services.AddAzurePostgreSqlDbContext<MySchoolAdmissions.ApplicationService.Data.ApplicationDbContext>(builder.Configuration);

// Independent Azure Blob Storage for each institution
builder.Services.AddTenantAzureBlobStorage();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<LeadQualifiedEventConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        var rabbitHost = builder.Configuration["RabbitMQHost"] ?? "localhost";
        cfg.Host(rabbitHost, "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        cfg.ReceiveEndpoint("application-service", e =>
        {
            e.ConfigureConsumer<LeadQualifiedEventConsumer>(context);
        });
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
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<MySchoolAdmissions.ApplicationService.Data.ApplicationDbContext>();
        db.Database.EnsureCreated();
    }
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Could not run Application database initialization on startup; continuing...");
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
