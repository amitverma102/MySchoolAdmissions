using Pgvector;

namespace MySchoolAdmissions.AIService.Services;

public interface IEmbeddingService
{
    string ProviderName { get; }
    Task<Vector> GenerateEmbeddingAsync(string text, CancellationToken cancellationToken = default);
    Task<List<Vector>> GenerateEmbeddingsAsync(List<string> texts, CancellationToken cancellationToken = default);
}
