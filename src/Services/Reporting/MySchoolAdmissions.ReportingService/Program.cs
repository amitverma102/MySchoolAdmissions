using MySchoolAdmissions.ReportingService.Data;
using MySchoolAdmissions.ReportingService.Consumers;
using Microsoft.EntityFrameworkCore;
using MassTransit;
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
builder.Services.AddAzurePostgreSqlDbContext<ReportingDbContext>(builder.Configuration);

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<EnquiryCreatedEventConsumer>();
    x.AddConsumer<ApplicationApprovedEventConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        var rabbitHost = builder.Configuration["RabbitMQHost"] ?? "localhost";
        cfg.Host(rabbitHost, "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        cfg.ReceiveEndpoint("reporting-service", e =>
        {
            e.ConfigureConsumer<EnquiryCreatedEventConsumer>(context);
            e.ConfigureConsumer<ApplicationApprovedEventConsumer>(context);
        });
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Auto-migrate on startup for convenience in dev
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ReportingDbContext>();
    db.Database.EnsureCreated();
}

app.Run();
