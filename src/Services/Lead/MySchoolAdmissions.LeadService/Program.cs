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

// Azure PostgreSQL with resilient retries
builder.Services.AddAzurePostgreSqlDbContext<MySchoolAdmissions.LeadService.Data.LeadDbContext>(builder.Configuration);

builder.Services.AddHttpClient();
builder.Services.AddScoped<MySchoolAdmissions.LeadService.Services.ILeadAutoAssignmentService, MySchoolAdmissions.LeadService.Services.LeadAutoAssignmentService>();
builder.Services.AddScoped<MySchoolAdmissions.LeadService.Services.IEmailService, MySchoolAdmissions.LeadService.Services.EmailService>();
builder.Services.AddScoped<MySchoolAdmissions.LeadService.Services.IWhatsAppService, MySchoolAdmissions.LeadService.Services.WhatsAppService>();

builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context, cfg) =>
    {
        var rabbitHost = builder.Configuration["RabbitMQHost"] ?? "localhost";
        cfg.Host(rabbitHost, "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
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
        var db = scope.ServiceProvider.GetRequiredService<MySchoolAdmissions.LeadService.Data.LeadDbContext>();
        db.Database.EnsureCreated();
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""TourAvailabilitySlots"" (
                ""Id"" uuid NOT NULL PRIMARY KEY,
                ""InstitutionId"" uuid NOT NULL,
                ""CampusId"" uuid NOT NULL,
                ""SlotDate"" timestamp with time zone NOT NULL,
                ""StartTime"" timestamp with time zone NOT NULL,
                ""EndTime"" timestamp with time zone NOT NULL,
                ""Capacity"" integer NOT NULL,
                ""IsActive"" boolean NOT NULL,
                ""CreatedAt"" timestamp with time zone NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ""IX_TourAvailabilitySlots_TenantCampusDate""
            ON ""TourAvailabilitySlots"" (""InstitutionId"", ""CampusId"", ""SlotDate"");
            
            ALTER TABLE ""TourAvailabilitySlots"" ADD COLUMN IF NOT EXISTS ""AssignedRepresentativeId"" uuid NULL;
            ALTER TABLE ""TourAvailabilitySlots"" ADD COLUMN IF NOT EXISTS ""AssignedRepresentativeName"" text NULL;
            ALTER TABLE ""TourAvailabilitySlots"" ADD COLUMN IF NOT EXISTS ""AssignedRepresentativeEmail"" text NULL;
            ALTER TABLE ""TourAvailabilitySlots"" ADD COLUMN IF NOT EXISTS ""AssignedRepresentativePhone"" text NULL;
        ");
    }
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Could not run Lead database initialization on startup; continuing...");
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
