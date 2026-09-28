using System.Collections.Concurrent;
using MySchoolAdmissions.CommunicationService.Models;

namespace MySchoolAdmissions.CommunicationService.Services;

public interface ICommunicationStore
{
    void Add(CommunicationLog log);
    IEnumerable<CommunicationLog> GetByReferenceId(Guid referenceId);
    IEnumerable<CommunicationLog> GetAll();
}

public class InMemoryCommunicationStore : ICommunicationStore
{
    private readonly ConcurrentBag<CommunicationLog> _logs = new();

    public void Add(CommunicationLog log)
    {
        _logs.Add(log);
    }

    public IEnumerable<CommunicationLog> GetByReferenceId(Guid referenceId)
    {
        return _logs.Where(l => l.ReferenceId == referenceId).OrderByDescending(l => l.SentAt);
    }

    public IEnumerable<CommunicationLog> GetAll()
    {
        return _logs.OrderByDescending(l => l.SentAt);
    }
}
