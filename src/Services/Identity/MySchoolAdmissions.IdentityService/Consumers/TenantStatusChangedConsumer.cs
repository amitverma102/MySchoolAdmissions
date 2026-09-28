using MySchoolAdmissions.EventBus.Events;
using MySchoolAdmissions.IdentityService.Data;
using MySchoolAdmissions.IdentityService.Models;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.IdentityService.Consumers;

public class InstitutionStatusChangedConsumer : IConsumer<InstitutionStatusChangedEvent>
{
    private readonly IdentityDbContext _context;

    public InstitutionStatusChangedConsumer(IdentityDbContext context)
    {
        _context = context;
    }

    public async Task Consume(ConsumeContext<InstitutionStatusChangedEvent> context)
    {
        var message = context.Message;
        var status = await _context.TenantStatuses.FindAsync(message.InstitutionId);
        
        if (status == null)
        {
            status = new TenantStatus { Id = message.InstitutionId, IsActive = message.IsActive };
            _context.TenantStatuses.Add(status);
        }
        else
        {
            status.IsActive = message.IsActive;
        }

        await _context.SaveChangesAsync();
    }
}

public class CampusStatusChangedConsumer : IConsumer<CampusStatusChangedEvent>
{
    private readonly IdentityDbContext _context;

    public CampusStatusChangedConsumer(IdentityDbContext context)
    {
        _context = context;
    }

    public async Task Consume(ConsumeContext<CampusStatusChangedEvent> context)
    {
        var message = context.Message;
        var status = await _context.TenantStatuses.FindAsync(message.CampusId);
        
        if (status == null)
        {
            status = new TenantStatus { Id = message.CampusId, IsActive = message.IsActive };
            _context.TenantStatuses.Add(status);
        }
        else
        {
            status.IsActive = message.IsActive;
        }

        await _context.SaveChangesAsync();
    }
}
