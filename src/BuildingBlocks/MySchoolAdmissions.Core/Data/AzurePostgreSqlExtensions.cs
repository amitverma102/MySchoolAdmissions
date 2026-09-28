using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace MySchoolAdmissions.Core.Data;

public static class AzurePostgreSqlExtensions
{
    /// <summary>
    /// Configures an EF Core DbContext for Azure Database for PostgreSQL (Flexible Server) with production-ready
    /// connection resiliency, SSL enforcement, transient fault retries, and high-performance connection pooling.
    /// </summary>
    public static IServiceCollection AddAzurePostgreSqlDbContext<TContext>(
        this IServiceCollection services,
        IConfiguration configuration,
        string connectionStringName = "DefaultConnection",
        string? targetDatabaseName = null) where TContext : DbContext
    {
        var rawConnection = configuration.GetConnectionString(connectionStringName)
            ?? configuration[$"ConnectionStrings:{connectionStringName}"]
            ?? configuration[$"ConnectionStrings__{connectionStringName}"];

        if (string.IsNullOrWhiteSpace(rawConnection))
        {
            throw new InvalidOperationException($"PostgreSQL Connection string '{connectionStringName}' was not found in configuration or Azure Key Vault.");
        }

        var builder = new NpgsqlConnectionStringBuilder(rawConnection);

        // If targetDatabaseName is specified and different, override database name (useful when connecting to an Azure PostgreSQL server host)
        if (!string.IsNullOrWhiteSpace(targetDatabaseName))
        {
            builder.Database = targetDatabaseName;
        }

        // Configure Azure PostgreSQL Flexible Server specific optimizations
        if (builder.Host?.Contains("postgres.database.azure.com", StringComparison.OrdinalIgnoreCase) == true)
        {
            builder.SslMode = SslMode.Require;
            builder.Pooling = true;
            builder.MinPoolSize = 2;
            builder.MaxPoolSize = 100;
            builder.ConnectionIdleLifetime = 300;
            builder.Timeout = 30;
            builder.CommandTimeout = 60;
        }

        services.AddDbContext<TContext>(options =>
        {
            options.UseNpgsql(builder.ConnectionString, npgsqlOptions =>
            {
                // Cloud connection resilience: retry on transient Azure network hiccups
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 5,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorCodesToAdd: null);

                npgsqlOptions.CommandTimeout(60);
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "public");
            });
        });

        return services;
    }

    /// <summary>
    /// Helper to produce a clean Azure PostgreSQL connection string for a specific database on an Azure PostgreSQL Flexible Server.
    /// </summary>
    public static string BuildAzurePostgreSqlConnectionString(
        string serverHost,
        string databaseName,
        string username,
        string password,
        int port = 5432)
    {
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = serverHost,
            Database = databaseName,
            Username = username,
            Password = password,
            Port = port,
            SslMode = SslMode.Require,
            Pooling = true,
            MinPoolSize = 2,
            MaxPoolSize = 100,
            Timeout = 30,
            CommandTimeout = 60
        };

        return builder.ConnectionString;
    }
}
