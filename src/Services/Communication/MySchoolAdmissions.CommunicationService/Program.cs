using MySchoolAdmissions.CommunicationService.Consumers;
using MySchoolAdmissions.CommunicationService.Services;
using MassTransit;
using MySchoolAdmissions.Core.Configuration;
using MySchoolAdmissions.Core.Security;

var builder = WebApplication.CreateBuilder(args);

// Connect to Azure Key Vault if configured
builder.Configuration.AddAzureKeyVaultIfConfigured();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddTenantJwtAuthentication(builder.Configuration);
builder.Services.AddHttpClient();
builder.Services.AddSingleton<ICommunicationStore, InMemoryCommunicationStore>();
builder.Services.AddScoped<IWhatsAppBotService, WhatsAppBotService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

// Configure MassTransit
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<ApplicationUpdatedEventConsumer>();
    x.AddConsumer<AssessmentScheduledEventConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        var rabbitMqHost = builder.Configuration["RabbitMQHost"] ?? "localhost";
        cfg.Host(rabbitMqHost, "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        cfg.ConfigureEndpoints(context);
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CorsPolicy");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
