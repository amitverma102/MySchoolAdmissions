using Microsoft.EntityFrameworkCore;
using MassTransit;
using MySchoolAdmissions.IdentityService.Consumers;
using MySchoolAdmissions.Core.Configuration;
using MySchoolAdmissions.Core.Data;

var builder = WebApplication.CreateBuilder(args);

// Connect to Azure Key Vault if configured
builder.Configuration.AddAzureKeyVaultIfConfigured();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Azure PostgreSQL DB Context
builder.Services.AddAzurePostgreSqlDbContext<MySchoolAdmissions.IdentityService.Data.IdentityDbContext>(builder.Configuration);

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<InstitutionStatusChangedConsumer>();
    x.AddConsumer<CampusStatusChangedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        var rabbitHost = builder.Configuration["RabbitMQHost"] ?? "localhost";
        cfg.Host(rabbitHost, "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });
        
        cfg.ConfigureEndpoints(context);
    });
});

// Configure JWT
var jwtSettings = builder.Configuration.GetSection("JwtOptions");
var secret = jwtSettings["Secret"] ?? throw new ArgumentNullException("Jwt Secret missing");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(secret))
    };
});
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.AddScoped<MySchoolAdmissions.IdentityService.Services.IJwtTokenGenerator, MySchoolAdmissions.IdentityService.Services.JwtTokenGenerator>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

try
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<MySchoolAdmissions.IdentityService.Data.IdentityDbContext>();
        db.Database.EnsureCreated();
    }
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Could not run Database.EnsureCreated on startup; continuing...");
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
