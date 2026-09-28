using MySchoolAdmissions.AIService.Data;
using MySchoolAdmissions.AIService.Services;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;
using MySchoolAdmissions.Core.Configuration;
using MySchoolAdmissions.Core.Storage;
using MySchoolAdmissions.Core.Security;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Connect to Azure Key Vault if configured
builder.Configuration.AddAzureKeyVaultIfConfigured();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddTenantJwtAuthentication(builder.Configuration);

// Configure Azure PostgreSQL + pgvector
var rawConnection = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Port=5433;Database=myschooladmissionsai;Username=postgres;Password=postgres";

var csBuilder = new NpgsqlConnectionStringBuilder(rawConnection);
if (csBuilder.Host?.Contains("postgres.database.azure.com", StringComparison.OrdinalIgnoreCase) == true)
{
    csBuilder.SslMode = SslMode.Require;
    csBuilder.Pooling = true;
    csBuilder.MinPoolSize = 2;
    csBuilder.MaxPoolSize = 100;
}

builder.Services.AddDbContext<AIDbContext>(options =>
{
    options.UseNpgsql(csBuilder.ConnectionString, npgsqlOptions =>
    {
        npgsqlOptions.UseVector();
        npgsqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(30), null);
    });
});

// Independent Azure Blob Storage for each institution's knowledge base
builder.Services.AddTenantAzureBlobStorage();

// Register RAG & AI Services
builder.Services.AddHttpClient();
builder.Services.AddSingleton<LeadScoringService>();
builder.Services.AddSingleton<IEmbeddingService, EmbeddingService>();
builder.Services.AddScoped<DocumentIngestionService>();
builder.Services.AddScoped<ChatService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CorsPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Ensure Database & Schema + Auto-seed Knowledge Base if empty
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = services.GetRequiredService<AIDbContext>();
        db.Database.ExecuteSqlRaw("CREATE EXTENSION IF NOT EXISTS vector;");
        db.Database.EnsureCreated();
        logger.LogInformation("[AIDbContext] Initialized successfully with pgvector extension.");

        var count = db.KnowledgeChunks.Count();
        if (count == 0)
        {
            logger.LogInformation("[RAG Ingestion] Knowledge base is empty. Running initial institution catalog vector sync...");
            var ingestion = services.GetRequiredService<DocumentIngestionService>();
            ingestion.SyncInstitutionsAsync().GetAwaiter().GetResult();
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "[AIDbContext] Database initialization deferred or encountered warning.");
    }
}

app.Run();
