using MySchoolAdmissions.EnrollmentService.Data;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using MySchoolAdmissions.EnrollmentService.Consumers;
using MySchoolAdmissions.Core.Configuration;
using MySchoolAdmissions.Core.Data;
using MySchoolAdmissions.Core.Security;
using MySchoolAdmissions.Core.Storage;

var builder = WebApplication.CreateBuilder(args);

// Connect to Azure Key Vault if configured
builder.Configuration.AddAzureKeyVaultIfConfigured();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddTenantJwtAuthentication(builder.Configuration);

// Azure PostgreSQL with resilient connection retries and pooling
builder.Services.AddAzurePostgreSqlDbContext<EnrollmentDbContext>(builder.Configuration);

// Independent Azure Blob Storage per institution
builder.Services.AddTenantAzureBlobStorage();

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<ApplicationApprovedEventConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        var rabbitHost = builder.Configuration["RabbitMQHost"] ?? "localhost";
        cfg.Host(rabbitHost, "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        cfg.ReceiveEndpoint("enrollment-service", e =>
        {
            e.ConfigureConsumer<ApplicationApprovedEventConsumer>(context);
        });
    });
});

// CORS
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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    
    // Auto-create DB for development
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<EnrollmentDbContext>();
    context.Database.EnsureCreated();
    context.Database.ExecuteSqlRaw("ALTER TABLE \"Enrollments\" ADD COLUMN IF NOT EXISTS \"InstitutionId\" uuid;");
}

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
