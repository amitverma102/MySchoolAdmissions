using MySchoolAdmissions.LeadService.Data;
using MySchoolAdmissions.LeadService.DTOs;
using MySchoolAdmissions.LeadService.Models;
using MySchoolAdmissions.LeadService.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Json;
using System.Collections.Concurrent;

namespace MySchoolAdmissions.LeadService.Controllers;

[ApiController]
[Route("api/leads/activities")]
public class ActivitiesController : ControllerBase
{
    private readonly LeadDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IWhatsAppService _whatsappService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ActivitiesController> _logger;
    private static readonly ConcurrentDictionary<Guid, (string InstName, string CampName, string? ContactEmail, string? ContactPhone)> _nameCache = new();

    public ActivitiesController(
        LeadDbContext context,
        IEmailService emailService,
        IWhatsAppService whatsappService,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<ActivitiesController> logger)
    {
        _context = context;
        _emailService = emailService;
        _whatsappService = whatsappService;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    private (bool isSuperAdmin, Guid? userInstitutionId) GetUserContext()
    {
        if (Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            var tokenStr = authHeader.ToString();
            if (tokenStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                tokenStr = tokenStr.Substring("Bearer ".Length).Trim();
            }

            try
            {
                var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                if (handler.CanReadToken(tokenStr))
                {
                    var jwt = handler.ReadJwtToken(tokenStr);
                    var isSuper = jwt.Claims.Any(c =>
                        (c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
                        && c.Value.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));

                    Guid? instId = null;
                    var instClaim = jwt.Claims.FirstOrDefault(c =>
                        c.Type.Equals("institutionId", StringComparison.OrdinalIgnoreCase) ||
                        c.Type.Equals("institution_id", StringComparison.OrdinalIgnoreCase));

                    if (instClaim != null && Guid.TryParse(instClaim.Value, out var parsedGuid))
                    {
                        instId = parsedGuid;
                    }

                    return (isSuper, instId);
                }
            }
            catch
            {
            }
        }

        return (false, null);
    }

    private Guid? ResolveInstitutionId(bool isSuperAdmin, Guid? userInstitutionId)
    {
        if (!isSuperAdmin) return userInstitutionId;
        if (Request.Headers.TryGetValue("X-Tenant-Id", out var tenant) && Guid.TryParse(tenant, out var tenantId)) return tenantId;
        if (Request.Headers.TryGetValue("X-Institution-Id", out var institution) && Guid.TryParse(institution, out var institutionId)) return institutionId;
        return null;
    }

    private bool IsSelectedInstitution(Guid institutionId)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        return isSuperAdmin || userInstitutionId == institutionId;
    }

    private bool CanAccessActivity(AdmissionActivity activity)
    {
        var institutionId = activity.InstitutionId ?? activity.Enquiry?.InstitutionId ?? Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
        return IsSelectedInstitution(institutionId);
    }

    private async Task<List<TourAvailabilitySlotDto>> MapAvailabilitySlotsAsync(IEnumerable<TourAvailabilitySlot> slots)
    {
        var mapped = new List<TourAvailabilitySlotDto>();
        foreach (var slot in slots)
        {
            var bookedCount = await _context.Activities.CountAsync(a =>
                a.CampusId == slot.CampusId &&
                a.ActivityType == "CampusTour" &&
                a.Status != "Cancelled" &&
                Math.Abs((a.ScheduledStartTime - slot.StartTime).TotalMinutes) < 1);
            mapped.Add(new TourAvailabilitySlotDto
            {
                Id = slot.Id,
                InstitutionId = slot.InstitutionId,
                CampusId = slot.CampusId,
                SlotDate = slot.SlotDate,
                StartTime = slot.StartTime,
                EndTime = slot.EndTime,
                Capacity = slot.Capacity,
                IsActive = slot.IsActive,
                BookedCount = bookedCount,
                AssignedRepresentativeId = slot.AssignedRepresentativeId,
                AssignedRepresentativeName = slot.AssignedRepresentativeName,
                AssignedRepresentativeEmail = slot.AssignedRepresentativeEmail,
                AssignedRepresentativePhone = slot.AssignedRepresentativePhone
            });
        }
        return mapped;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivities(
        [FromQuery] Guid? counselorId,
        [FromQuery] Guid? institutionId,
        [FromQuery] Guid? campusId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? status,
        [FromQuery] string? activityType,
        [FromQuery] string? search)
    {
        var (isSuperAdmin, userInstId) = GetUserContext();

        Guid? targetInstId = null;
        if (isSuperAdmin)
        {
            targetInstId = institutionId;
            if (!targetInstId.HasValue && Request.Headers.TryGetValue("X-Tenant-Id", out var tenantH) && Guid.TryParse(tenantH, out var pT))
                targetInstId = pT;
            else if (!targetInstId.HasValue && Request.Headers.TryGetValue("X-Institution-Id", out var instH) && Guid.TryParse(instH, out var pI))
                targetInstId = pI;
        }
        else
        {
            if (!userInstId.HasValue)
            {
                return Ok(new List<ActivityDto>());
            }
            targetInstId = userInstId.Value;
        }

        var query = _context.Activities
            .Include(a => a.Enquiry)
            .AsQueryable();

        if (counselorId.HasValue)
        {
            query = query.Where(a => a.AssignedToUserId == counselorId.Value);
        }

        if (targetInstId.HasValue)
        {
            var disId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
            if (targetInstId.Value == disId)
            {
                query = query.Where(a => a.InstitutionId == targetInstId.Value || a.InstitutionId == null);
            }
            else
            {
                if (!await _context.Activities.AnyAsync(a => a.InstitutionId == targetInstId.Value))
                {
                    var svisEnquiry = await _context.Enquiries.FirstOrDefaultAsync(e => e.InstitutionId == targetInstId.Value);
                    if (svisEnquiry != null)
                    {
                        var svisCounselor = await _context.CounselorProfiles.FirstOrDefaultAsync(c => c.InstitutionId == targetInstId.Value);
                        var cId = svisCounselor?.UserId ?? Guid.NewGuid();
                        var cName = svisCounselor?.CounselorName ?? "Rahul Mehta";
                        var now = DateTime.UtcNow;

                        var demoActivities = new List<AdmissionActivity>
                        {
                            new AdmissionActivity
                            {
                                InstitutionId = targetInstId.Value,
                                EnquiryId = svisEnquiry.Id,
                                Title = "Campus Tour & STEAM Lab Interaction",
                                ActivityType = "CampusTour",
                                Priority = "High",
                                Location = "Main Campus Reception",
                                AssignedToUserId = cId,
                                AssignedToName = cName,
                                ScheduledStartTime = now.AddHours(2),
                                ScheduledEndTime = now.AddHours(3),
                                Status = "Scheduled",
                                Description = "Parent interested in experiential robotics and transport routes."
                            },
                            new AdmissionActivity
                            {
                                InstitutionId = targetInstId.Value,
                                EnquiryId = svisEnquiry.Id,
                                Title = "Initial Counselor Counseling Call",
                                ActivityType = "Call",
                                Priority = "Normal",
                                Location = "Phone",
                                AssignedToUserId = cId,
                                AssignedToName = cName,
                                ScheduledStartTime = now.AddHours(-1),
                                ScheduledEndTime = now.AddMinutes(-30),
                                Status = "Completed",
                                Description = "Discussed Montessori vs Cambridge Foundation pedagogy."
                            }
                        };

                        _context.Activities.AddRange(demoActivities);
                        await _context.SaveChangesAsync();
                    }
                }

                query = query.Where(a => a.InstitutionId == targetInstId.Value);
            }
        }

        if (campusId.HasValue)
        {
            query = query.Where(a => a.CampusId == campusId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(a => a.ScheduledStartTime >= startDate.Value.ToUniversalTime());
        }

        if (endDate.HasValue)
        {
            query = query.Where(a => a.ScheduledStartTime <= endDate.Value.ToUniversalTime());
        }

        if (!string.IsNullOrWhiteSpace(status) && status.ToLower() != "all")
        {
            query = query.Where(a => a.Status.ToLower() == status.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(activityType) && activityType.ToLower() != "all")
        {
            query = query.Where(a => a.ActivityType.ToLower() == activityType.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(a =>
                a.Title.ToLower().Contains(searchLower) ||
                a.Description.ToLower().Contains(searchLower) ||
                (a.Enquiry != null && (
                    a.Enquiry.FirstName.ToLower().Contains(searchLower) ||
                    a.Enquiry.LastName.ToLower().Contains(searchLower) ||
                    a.Enquiry.Email.ToLower().Contains(searchLower) ||
                    a.Enquiry.Phone.Contains(searchLower)
                ))
            );
        }

        var list = await query
            .OrderBy(a => a.ScheduledStartTime)
            .ToListAsync();

        return Ok(list.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetActivity(Guid id)
    {
        var activity = await _context.Activities
            .Include(a => a.Enquiry)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (activity == null) return NotFound();
        if (!CanAccessActivity(activity)) return Forbid();

        return Ok(MapToDto(activity));
    }

    [HttpPost]
    public async Task<IActionResult> CreateActivity([FromBody] CreateActivityDto dto)
    {
        var enquiry = await _context.Enquiries.FindAsync(dto.EnquiryId);
        if (enquiry == null)
        {
            return BadRequest(new { message = "Referenced enquiry/lead was not found." });
        }
        if (!CanAccessActivity(new AdmissionActivity { Enquiry = enquiry, InstitutionId = enquiry.InstitutionId })) return Forbid();

        var activity = new AdmissionActivity
        {
            EnquiryId = dto.EnquiryId,
            Title = string.IsNullOrWhiteSpace(dto.Title) ? $"{dto.ActivityType} with {enquiry.FirstName} {enquiry.LastName}".Trim() : dto.Title.Trim(),
            ActivityType = dto.ActivityType,
            Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Normal" : dto.Priority,
            Description = dto.Description ?? string.Empty,
            Location = dto.Location ?? string.Empty,
            ScheduledStartTime = dto.ScheduledStartTime.ToUniversalTime(),
            ScheduledEndTime = dto.ScheduledEndTime.ToUniversalTime(),
            Status = "Scheduled",
            AssignedToUserId = dto.AssignedToUserId ?? enquiry.AssignedToId,
            AssignedToName = dto.AssignedToName ?? string.Empty,
            InstitutionId = enquiry.InstitutionId,
            CampusId = dto.CampusId ?? enquiry.CampusId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Activities.Add(activity);
        await _context.SaveChangesAsync();

        // Also add an audit note in InteractionHistory that an activity was scheduled
        var scheduleNote = new InteractionHistory
        {
            EnquiryId = enquiry.Id,
            InteractionType = "ActivityScheduled",
            Disposition = "Scheduled",
            Notes = $"Scheduled {activity.ActivityType}: \"{activity.Title}\" for {activity.ScheduledStartTime:g} UTC. Location: {activity.Location}.",
            InteractionDate = DateTime.UtcNow,
            HandledByUserId = activity.AssignedToUserId
        };
        _context.InteractionHistories.Add(scheduleNote);
        await _context.SaveChangesAsync();

        activity.Enquiry = enquiry;
        return CreatedAtAction(nameof(GetActivity), new { id = activity.Id }, MapToDto(activity));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateActivity(Guid id, [FromBody] UpdateActivityDto dto)
    {
        var activity = await _context.Activities.Include(a => a.Enquiry).FirstOrDefaultAsync(a => a.Id == id);
        if (activity == null) return NotFound();
        if (!CanAccessActivity(activity)) return Forbid();

        activity.Title = dto.Title;
        activity.ActivityType = dto.ActivityType;
        activity.Priority = dto.Priority;
        activity.Description = dto.Description ?? string.Empty;
        activity.Location = dto.Location ?? string.Empty;
        activity.ScheduledStartTime = dto.ScheduledStartTime.ToUniversalTime();
        activity.ScheduledEndTime = dto.ScheduledEndTime.ToUniversalTime();
        activity.AssignedToUserId = dto.AssignedToUserId;
        activity.AssignedToName = dto.AssignedToName ?? activity.AssignedToName;
        activity.Status = dto.Status;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(activity));
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteActivity(Guid id, [FromBody] CompleteActivityDto dto)
    {
        var activity = await _context.Activities.Include(a => a.Enquiry).FirstOrDefaultAsync(a => a.Id == id);
        if (activity == null) return NotFound();
        if (!CanAccessActivity(activity)) return Forbid();

        activity.Status = "Completed";
        activity.Disposition = dto.Disposition;
        activity.OutcomeNotes = dto.OutcomeNotes;
        activity.CompletedAt = DateTime.UtcNow;

        // Auto-append interaction record to Enquiry timeline for full 360 context
        var interaction = new InteractionHistory
        {
            EnquiryId = activity.EnquiryId,
            InteractionType = activity.ActivityType switch
            {
                "CampusTour" => "Campus Tour",
                "Meeting" => "Meeting",
                "Assessment" => "Assessment",
                "Task" => "Task",
                _ => "Call"
            },
            Disposition = string.IsNullOrWhiteSpace(dto.Disposition) ? "Completed" : dto.Disposition,
            Notes = $"Completed {activity.Title}. Disposition: {dto.Disposition}. Outcome Notes: {dto.OutcomeNotes}",
            InteractionDate = DateTime.UtcNow,
            HandledByUserId = activity.AssignedToUserId
        };
        _context.InteractionHistories.Add(interaction);

        // Update lead status if requested
        if (activity.Enquiry != null)
        {
            if (dto.UpdateLeadStatus && !string.IsNullOrWhiteSpace(dto.NextLeadStatus))
            {
                activity.Enquiry.Status = dto.NextLeadStatus;
            }
            else if (dto.Disposition == "Interested - Qualified" || dto.Disposition == "Qualified")
            {
                activity.Enquiry.Status = "Qualified";
            }
            else if (dto.Disposition == "Not Interested" || dto.Disposition == "Lost")
            {
                activity.Enquiry.Status = "Lost";
            }
            else if (activity.Enquiry.Status == "New")
            {
                activity.Enquiry.Status = "Contacted";
            }
        }

        // Schedule next follow-up activity if requested
        AdmissionActivity? nextActivity = null;
        if (dto.NextActivity != null)
        {
            nextActivity = new AdmissionActivity
            {
                EnquiryId = activity.EnquiryId,
                Title = dto.NextActivity.Title,
                ActivityType = dto.NextActivity.ActivityType,
                Priority = dto.NextActivity.Priority,
                Description = dto.NextActivity.Description,
                Location = dto.NextActivity.Location,
                ScheduledStartTime = dto.NextActivity.ScheduledStartTime.ToUniversalTime(),
                ScheduledEndTime = dto.NextActivity.ScheduledEndTime.ToUniversalTime(),
                Status = "Scheduled",
                AssignedToUserId = dto.NextActivity.AssignedToUserId ?? activity.AssignedToUserId,
                AssignedToName = dto.NextActivity.AssignedToName ?? activity.AssignedToName,
                InstitutionId = activity.InstitutionId,
                CampusId = activity.CampusId,
                CreatedAt = DateTime.UtcNow
            };
            _context.Activities.Add(nextActivity);
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            Activity = MapToDto(activity),
            NextActivity = nextActivity != null ? MapToDto(nextActivity) : null
        });
    }

    [HttpPost("{id}/reschedule")]
    public async Task<IActionResult> RescheduleActivity(Guid id, [FromBody] RescheduleActivityDto dto)
    {
        var activity = await _context.Activities.Include(a => a.Enquiry).FirstOrDefaultAsync(a => a.Id == id);
        if (activity == null) return NotFound();
        if (!CanAccessActivity(activity)) return Forbid();

        var oldStart = activity.ScheduledStartTime;
        activity.ScheduledStartTime = dto.NewStartTime.ToUniversalTime();
        activity.ScheduledEndTime = dto.NewEndTime.ToUniversalTime();
        activity.Status = "Rescheduled";

        // Audit note
        var auditNote = new InteractionHistory
        {
            EnquiryId = activity.EnquiryId,
            InteractionType = "ActivityRescheduled",
            Disposition = "Rescheduled",
            Notes = $"Rescheduled \"{activity.Title}\" from {oldStart:g} to {activity.ScheduledStartTime:g} UTC. Reason: {dto.Reason}",
            InteractionDate = DateTime.UtcNow,
            HandledByUserId = activity.AssignedToUserId
        };
        _context.InteractionHistories.Add(auditNote);

        await _context.SaveChangesAsync();
        return Ok(MapToDto(activity));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteActivity(Guid id)
    {
        var activity = await _context.Activities.FindAsync(id);
        if (activity == null) return NotFound();
        if (!CanAccessActivity(activity)) return Forbid();

        activity.Status = "Cancelled";
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("metrics")]
    public async Task<IActionResult> GetMetrics([FromQuery] Guid? counselorId, [FromQuery] Guid? institutionId)
    {
        var now = DateTime.UtcNow;
        var startOfToday = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);
        var endOfToday = startOfToday.AddDays(1);
        var startOfWeek = startOfToday.AddDays(-(int)startOfToday.DayOfWeek);

        var query = _context.Activities.AsQueryable();
        if (counselorId.HasValue)
        {
            query = query.Where(a => a.AssignedToUserId == counselorId.Value);
        }

        var (isSuperAdmin, userInstId) = GetUserContext();
        Guid? targetInstId = null;

        if (isSuperAdmin)
        {
            targetInstId = institutionId;
            if (!targetInstId.HasValue && Request.Headers.TryGetValue("X-Tenant-Id", out var hVal) && Guid.TryParse(hVal, out var parsedH))
            {
                targetInstId = parsedH;
            }
            else if (!targetInstId.HasValue && Request.Headers.TryGetValue("X-Institution-Id", out var hVal2) && Guid.TryParse(hVal2, out var parsedH2))
            {
                targetInstId = parsedH2;
            }
        }
        else
        {
            if (!userInstId.HasValue)
            {
                return Ok(new ActivityMetricsDto());
            }
            targetInstId = userInstId.Value;
        }

        if (targetInstId.HasValue)
        {
            var disId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
            if (targetInstId.Value == disId)
            {
                query = query.Where(a => a.InstitutionId == targetInstId.Value || a.InstitutionId == null);
            }
            else
            {
                query = query.Where(a => a.InstitutionId == targetInstId.Value);
            }
        }

        var todayCount = await query.CountAsync(a => 
            a.ScheduledStartTime >= startOfToday && a.ScheduledStartTime < endOfToday && a.Status != "Cancelled");

        var overdueCount = await query.CountAsync(a => 
            a.ScheduledStartTime < startOfToday && a.Status == "Scheduled");

        var upcomingCount = await query.CountAsync(a => 
            a.ScheduledStartTime >= endOfToday && a.Status == "Scheduled");

        var toursCount = await query.CountAsync(a => 
            a.ActivityType == "CampusTour" && a.ScheduledStartTime >= startOfToday && a.Status != "Cancelled");

        var completedWeekCount = await query.CountAsync(a => 
            a.Status == "Completed" && a.CompletedAt >= startOfWeek);

        return Ok(new ActivityMetricsDto
        {
            TodayCount = todayCount,
            OverdueCount = overdueCount,
            UpcomingCount = upcomingCount,
            CampusToursCount = toursCount,
            CompletedThisWeekCount = completedWeekCount
        });
    }

    [HttpGet("tour-slots")]
    public async Task<IActionResult> GetTourAvailabilitySlots(
        [FromQuery] DateTime? date,
        [FromQuery] Guid? campusId,
        [FromQuery] Guid? institutionId)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        var targetInstId = ResolveInstitutionId(isSuperAdmin, userInstitutionId) ?? (isSuperAdmin ? institutionId : null);
        if (!targetInstId.HasValue && !isSuperAdmin) return Forbid();

        var query = _context.TourAvailabilitySlots.Where(s => s.IsActive);
        if (targetInstId.HasValue)
        {
            query = query.Where(s => s.InstitutionId == targetInstId.Value);
        }
        if (campusId.HasValue) query = query.Where(s => s.CampusId == campusId.Value);
        if (date.HasValue)
        {
            var day = date.Value.Date;
            query = query.Where(s => s.SlotDate.Date == day);
        }

        var slots = await query.OrderBy(s => s.SlotDate).ThenBy(s => s.StartTime).ToListAsync();
        return Ok(await MapAvailabilitySlotsAsync(slots));
    }

    [HttpGet("tour-slots/busy-user-ids")]
    public async Task<IActionResult> GetBusyUserIds(
        [FromQuery] DateTime startTime,
        [FromQuery] DateTime endTime,
        [FromQuery] Guid? campusId)
    {
        var busyFromActivities = await _context.Activities
            .Where(a => a.AssignedToUserId.HasValue &&
                        a.Status != "Cancelled" &&
                        a.ScheduledStartTime < endTime &&
                        a.ScheduledEndTime > startTime)
            .Select(a => a.AssignedToUserId!.Value)
            .Distinct()
            .ToListAsync();

        var busyFromSlots = await _context.TourAvailabilitySlots
            .Where(s => s.AssignedRepresentativeId.HasValue &&
                        s.IsActive &&
                        s.StartTime < endTime &&
                        s.EndTime > startTime)
            .Select(s => s.AssignedRepresentativeId!.Value)
            .Distinct()
            .ToListAsync();

        var allBusy = busyFromActivities.Union(busyFromSlots).Distinct().ToList();
        return Ok(allBusy);
    }

    [HttpPost("tour-slots")]
    public async Task<IActionResult> CreateTourAvailabilitySlot([FromBody] CreateTourAvailabilitySlotDto dto)
    {
        try
        {
            var (isSuperAdmin, userInstitutionId) = GetUserContext();
            var institutionId = ResolveInstitutionId(isSuperAdmin, userInstitutionId) ?? (isSuperAdmin ? dto.InstitutionId : null);
            if (!institutionId.HasValue || (!isSuperAdmin && institutionId.Value != dto.InstitutionId)) return Forbid();
            if (dto.CampusId == Guid.Empty || dto.EndTime <= dto.StartTime || dto.Capacity < 1)
                return BadRequest(new { message = "A campus, valid time range, and positive capacity are required." });

            if (dto.AssignedRepresentativeId.HasValue)
            {
                var repId = dto.AssignedRepresentativeId.Value;
                var hasActivityConflict = await _context.Activities.AnyAsync(a =>
                    a.AssignedToUserId == repId &&
                    a.Status != "Cancelled" &&
                    a.ScheduledStartTime < dto.EndTime &&
                    a.ScheduledEndTime > dto.StartTime);

                var hasSlotConflict = await _context.TourAvailabilitySlots.AnyAsync(s =>
                    s.AssignedRepresentativeId == repId &&
                    s.IsActive &&
                    s.StartTime < dto.EndTime &&
                    s.EndTime > dto.StartTime);

                if (hasActivityConflict || hasSlotConflict)
                {
                    return BadRequest(new { message = $"Selected representative '{dto.AssignedRepresentativeName ?? "User"}' has a calendar conflict during this slot." });
                }
            }

            var slot = new TourAvailabilitySlot
            {
                InstitutionId = dto.InstitutionId,
                CampusId = dto.CampusId,
                SlotDate = dto.SlotDate.Date,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                Capacity = dto.Capacity,
                IsActive = true,
                AssignedRepresentativeId = dto.AssignedRepresentativeId,
                AssignedRepresentativeName = dto.AssignedRepresentativeName,
                AssignedRepresentativeEmail = dto.AssignedRepresentativeEmail,
                AssignedRepresentativePhone = dto.AssignedRepresentativePhone
            };
            _context.TourAvailabilitySlots.Add(slot);
            await _context.SaveChangesAsync();

            if (slot.AssignedRepresentativeId.HasValue && (!string.IsNullOrWhiteSpace(slot.AssignedRepresentativeEmail) || !string.IsNullOrWhiteSpace(slot.AssignedRepresentativePhone)))
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var (instName, campName, _, _) = await ResolveNamesAsync(slot.InstitutionId, slot.CampusId);
                        if (!string.IsNullOrWhiteSpace(slot.AssignedRepresentativeEmail))
                        {
                            await _emailService.SendTourSlotAssignedEmailAsync(new TourSlotAssignedEmailModel
                            {
                                RepresentativeEmail = slot.AssignedRepresentativeEmail,
                                RepresentativeName = slot.AssignedRepresentativeName ?? "Counselor",
                                InstitutionName = instName,
                                CampusName = campName,
                                SlotDate = slot.SlotDate,
                                StartTime = slot.StartTime,
                                EndTime = slot.EndTime,
                                Capacity = slot.Capacity
                            });
                        }

                        if (!string.IsNullOrWhiteSpace(slot.AssignedRepresentativePhone))
                        {
                            await _whatsappService.SendTourSlotAssignedWhatsAppAsync(new TourSlotAssignedWhatsAppModel
                            {
                                RepresentativePhone = slot.AssignedRepresentativePhone,
                                RepresentativeName = slot.AssignedRepresentativeName ?? "Counselor",
                                InstitutionName = instName,
                                CampusName = campName,
                                SlotDate = slot.SlotDate,
                                StartTime = slot.StartTime,
                                EndTime = slot.EndTime,
                                Capacity = slot.Capacity
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send tour slot assignment notifications for slot {SlotId}", slot.Id);
                    }
                });
            }

            return Ok((await MapAvailabilitySlotsAsync(new[] { slot })).Single());
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }

    [HttpDelete("tour-slots/{id}")]
    public async Task<IActionResult> DeleteTourAvailabilitySlot(Guid id)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        var slot = await _context.TourAvailabilitySlots.FindAsync(id);
        if (slot == null) return NotFound();
        if (!isSuperAdmin && slot.InstitutionId != userInstitutionId) return Forbid();
        if (isSuperAdmin && !IsSelectedInstitution(slot.InstitutionId)) return Forbid();

        slot.IsActive = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("public/slots")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicTourSlots(
        [FromQuery] DateTime? date,
        [FromQuery] Guid? campusId)
    {
        var targetDateRaw = (date ?? DateTime.UtcNow).Date;
        var targetDate = DateTime.SpecifyKind(targetDateRaw, DateTimeKind.Utc);
        if (targetDate < DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc))
        {
            targetDate = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        }

        if (!campusId.HasValue) return Ok(Array.Empty<TourSlotDto>());

        var existingTours = await _context.Activities
            .Where(a => a.ActivityType == "CampusTour" && 
                        a.CampusId == campusId.Value &&
                        a.ScheduledStartTime.Date == targetDate &&
                        a.Status != "Cancelled")
            .ToListAsync();

        var configuredSlots = await _context.TourAvailabilitySlots
            .Where(s => s.CampusId == campusId.Value && s.SlotDate.Date == targetDate && s.IsActive)
            .OrderBy(s => s.StartTime)
            .ToListAsync();

        var result = new List<TourSlotDto>();
        foreach (var slot in configuredSlots)
        {
            var booked = existingTours.Count(t => 
                Math.Abs((t.ScheduledStartTime - slot.StartTime).TotalMinutes) < 1);

            var isPast = slot.StartTime < DateTime.UtcNow;

            result.Add(new TourSlotDto
            {
                InstitutionId = slot.InstitutionId,
                CampusId = slot.CampusId,
                TimeSlot = $"{slot.StartTime:hh:mm tt} - {slot.EndTime:hh:mm tt}",
                StartTime = slot.StartTime,
                EndTime = slot.EndTime,
                BookedCount = booked,
                MaxCapacity = slot.Capacity,
                IsAvailable = !isPast && booked < slot.Capacity,
                AssignedRepresentativeId = slot.AssignedRepresentativeId,
                AssignedRepresentativeName = slot.AssignedRepresentativeName,
                AssignedRepresentativePhone = slot.AssignedRepresentativePhone
            });
        }

        return Ok(result);
    }

    [HttpPost("public/book-tour")]
    [AllowAnonymous]
    public async Task<IActionResult> BookPublicCampusTour([FromBody] BookCampusTourDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.ParentName) || string.IsNullOrWhiteSpace(dto.Phone))
        {
            return BadRequest(new { message = "Parent name and phone number are required." });
        }

        var normalizedEmail = dto.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        var normalizedPhone = dto.Phone.Trim();

        if (!dto.CampusId.HasValue) return BadRequest(new { message = "Please select the institute campus you want to visit." });
        var targetDate = dto.TourDate.Date;
        var availableSlot = await _context.TourAvailabilitySlots
            .Where(s => s.CampusId == dto.CampusId.Value && s.SlotDate.Date == targetDate && s.IsActive)
            .ToListAsync();
        var requestedSlot = availableSlot.FirstOrDefault(s => $"{s.StartTime:hh:mm tt} - {s.EndTime:hh:mm tt}" == dto.TimeSlot);
        if (requestedSlot == null) return BadRequest(new { message = "That campus has not published this tour slot." });
        var bookedCount = await _context.Activities.CountAsync(a => a.CampusId == dto.CampusId.Value && a.ActivityType == "CampusTour" && a.Status != "Cancelled" && Math.Abs((a.ScheduledStartTime - requestedSlot.StartTime).TotalMinutes) < 1);
        if (requestedSlot.StartTime < DateTime.UtcNow || bookedCount >= requestedSlot.Capacity)
            return Conflict(new { message = "That tour slot is no longer available. Please choose another slot." });

        // 1. Find existing or create new Lead
        var lead = await _context.Enquiries
            .FirstOrDefaultAsync(e => 
                e.InstitutionId == requestedSlot.InstitutionId &&
                ((!string.IsNullOrEmpty(normalizedEmail) && e.Email.ToLower() == normalizedEmail) ||
                (!string.IsNullOrEmpty(normalizedPhone) && e.Phone == normalizedPhone)));

        var studentFullName = string.IsNullOrWhiteSpace(dto.StudentName) ? dto.ParentName : dto.StudentName.Trim();
        var nameParts = studentFullName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var studentFirst = nameParts.Length > 0 ? nameParts[0] : studentFullName;
        var studentLast = nameParts.Length > 1 ? nameParts[1] : string.Empty;

        if (lead == null)
        {
            var tourSource = await _context.LeadSources.FirstOrDefaultAsync(s => s.Name.ToLower() == "campustour");
            if (tourSource == null)
            {
                tourSource = new LeadSource { Name = "CampusTour" };
                _context.LeadSources.Add(tourSource);
                await _context.SaveChangesAsync();
            }

            lead = new Enquiry
            {
                FirstName = studentFirst,
                LastName = studentLast,
                Email = normalizedEmail,
                Phone = normalizedPhone,
                GradeInterested = string.IsNullOrWhiteSpace(dto.GradeInterested) ? "General" : dto.GradeInterested,
                InstitutionId = requestedSlot.InstitutionId,
                CampusId = dto.CampusId,
                LeadSourceId = tourSource.Id,
                Status = "New",
                CreatedAt = DateTime.UtcNow
            };
            _context.Enquiries.Add(lead);
            await _context.SaveChangesAsync();
        }

        // 2. Select Counselor / Representative
        Guid? counselorId = requestedSlot.AssignedRepresentativeId;
        string counselorName = requestedSlot.AssignedRepresentativeName ?? "Admissions Representative";
        string? representativeEmail = requestedSlot.AssignedRepresentativeEmail;

        if (!counselorId.HasValue)
        {
            counselorId = lead.AssignedToId;
            if (!counselorId.HasValue)
            {
                var activeCounselor = await _context.CounselorProfiles
                    .Where(c => c.IsActive && (!dto.CampusId.HasValue || c.CampusId == dto.CampusId.Value))
                    .OrderBy(c => c.AssignedCountToday)
                    .FirstOrDefaultAsync();

                if (activeCounselor != null)
                {
                    counselorId = activeCounselor.UserId;
                    counselorName = activeCounselor.CounselorName;
                    representativeEmail = activeCounselor.Email;
                    lead.AssignedToId = counselorId;
                    activeCounselor.AssignedCountToday++;
                    activeCounselor.LastAssignedAt = DateTime.UtcNow;
                }
            }
            else
            {
                var assignedProfile = await _context.CounselorProfiles.FirstOrDefaultAsync(c => c.UserId == counselorId.Value);
                if (assignedProfile != null)
                {
                    counselorName = assignedProfile.CounselorName;
                    representativeEmail = assignedProfile.Email;
                }
            }
        }
        else
        {
            lead.AssignedToId = counselorId;
            if (string.IsNullOrWhiteSpace(representativeEmail))
            {
                var profile = await _context.CounselorProfiles.FirstOrDefaultAsync(c => c.UserId == counselorId.Value);
                if (profile != null)
                {
                    representativeEmail = profile.Email;
                    if (string.IsNullOrWhiteSpace(counselorName)) counselorName = profile.CounselorName;
                }
            }
        }

        var scheduledStart = dto.TourDate.Date;
        if (!string.IsNullOrWhiteSpace(dto.TimeSlot) && dto.TimeSlot.Contains(':'))
        {
            var timePart = dto.TimeSlot.Split('-')[0].Trim();
            if (DateTime.TryParse(timePart, out var parsedTime))
            {
                scheduledStart = scheduledStart.Add(parsedTime.TimeOfDay);
            }
            else
            {
                scheduledStart = scheduledStart.AddHours(10);
            }
        }
        else
        {
            scheduledStart = scheduledStart.AddHours(10);
        }
        scheduledStart = DateTime.SpecifyKind(scheduledStart, DateTimeKind.Utc);
        var scheduledEnd = scheduledStart.AddMinutes(45);

        var confirmationCode = $"TOUR-{DateTime.UtcNow:yyMM}-{Random.Shared.Next(1000, 9999)}";

        var activity = new AdmissionActivity
        {
            EnquiryId = lead.Id,
            Title = $"Campus Tour - {studentFullName} (Grade {dto.GradeInterested})",
            ActivityType = "CampusTour",
            Priority = "High",
            Description = $"Self-booked campus tour by {dto.ParentName} ({dto.Phone}). Attendees: {dto.NumberOfAttendees}. Notes: {dto.Notes ?? "None"}. Code: {confirmationCode}",
            Location = "Main Campus Reception & Welcome Center",
            ScheduledStartTime = scheduledStart,
            ScheduledEndTime = scheduledEnd,
            Status = "Scheduled",
            AssignedToUserId = counselorId,
            AssignedToName = counselorName,
            InstitutionId = requestedSlot.InstitutionId,
            CampusId = dto.CampusId ?? lead.CampusId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Activities.Add(activity);

        var timeline = new InteractionHistory
        {
            EnquiryId = lead.Id,
            InteractionType = "CampusTour",
            Disposition = "Tour Scheduled",
            Notes = $"Parent scheduled self-serve campus tour for {scheduledStart:yyyy-MM-dd HH:mm} UTC. Ref: {confirmationCode}. Counselor: {counselorName}",
            InteractionDate = DateTime.UtcNow
        };
        _context.InteractionHistories.Add(timeline);

        await _context.SaveChangesAsync();

        // 3. Dispatch confirmation emails and WhatsApp messages to Parent, Representative, and School Admin
        _ = Task.Run(async () =>
        {
            try
            {
                var (instName, campName, adminEmail, adminPhone) = await ResolveNamesAsync(requestedSlot.InstitutionId, requestedSlot.CampusId);
                var emailModel = new TourBookingEmailModel
                {
                    ParentName = dto.ParentName,
                    ParentEmail = normalizedEmail,
                    ParentPhone = normalizedPhone,
                    StudentName = studentFullName,
                    GradeInterested = dto.GradeInterested ?? "General",
                    NumberOfAttendees = dto.NumberOfAttendees > 0 ? dto.NumberOfAttendees : 1,
                    ConfirmationCode = confirmationCode,
                    InstitutionName = instName,
                    CampusName = campName,
                    TourDate = scheduledStart.Date,
                    TimeSlot = dto.TimeSlot,
                    RepresentativeName = counselorName,
                    RepresentativeEmail = representativeEmail,
                    AdminEmail = adminEmail,
                    Notes = dto.Notes
                };

                var whatsappModel = new TourBookingWhatsAppModel
                {
                    ParentName = dto.ParentName,
                    ParentPhone = normalizedPhone,
                    StudentName = studentFullName,
                    GradeInterested = dto.GradeInterested ?? "General",
                    NumberOfAttendees = dto.NumberOfAttendees > 0 ? dto.NumberOfAttendees : 1,
                    ConfirmationCode = confirmationCode,
                    InstitutionName = instName,
                    CampusName = campName,
                    TourDate = scheduledStart.Date,
                    TimeSlot = dto.TimeSlot,
                    RepresentativeName = counselorName,
                    RepresentativePhone = requestedSlot.AssignedRepresentativePhone,
                    AdminPhone = adminPhone,
                    Notes = dto.Notes
                };

                // Dispatch Emails
                if (!string.IsNullOrWhiteSpace(normalizedEmail))
                {
                    await _emailService.SendTourBookingConfirmationToParentAsync(emailModel);
                }

                if (!string.IsNullOrWhiteSpace(representativeEmail))
                {
                    await _emailService.SendTourBookingNotificationToRepresentativeAsync(emailModel);
                }

                if (!string.IsNullOrWhiteSpace(adminEmail))
                {
                    await _emailService.SendTourBookingNotificationToAdminAsync(emailModel);
                }

                // Dispatch WhatsApp Notifications
                if (!string.IsNullOrWhiteSpace(normalizedPhone))
                {
                    await _whatsappService.SendTourBookingConfirmationToParentWhatsAppAsync(whatsappModel);
                }

                if (!string.IsNullOrWhiteSpace(requestedSlot.AssignedRepresentativePhone))
                {
                    await _whatsappService.SendTourBookingNotificationToRepresentativeWhatsAppAsync(whatsappModel);
                }

                if (!string.IsNullOrWhiteSpace(adminPhone))
                {
                    await _whatsappService.SendTourBookingNotificationToAdminWhatsAppAsync(whatsappModel);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send tour booking confirmation notifications for activity {ActivityId}", activity.Id);
            }
        });

        return Ok(new TourBookingResultDto
        {
            Success = true,
            ActivityId = activity.Id,
            LeadId = lead.Id,
            ConfirmationCode = confirmationCode,
            ScheduledTime = scheduledStart,
            CounselorName = counselorName,
            Message = $"Campus Tour confirmed for {studentFullName} on {scheduledStart:MMM dd, yyyy} at {dto.TimeSlot}. Confirmation code: {confirmationCode}"
        });
    }

    private async Task<(string InstitutionName, string CampusName, string? AdminEmail, string? ContactPhone)> ResolveNamesAsync(Guid institutionId, Guid campusId)
    {
        if (_nameCache.TryGetValue(campusId, out var cached))
        {
            return cached;
        }

        string instName = "Delhi International School";
        string campName = "Main Campus";
        string? adminEmail = _configuration["AdminEmail"] ?? "admissions@delhi-international.edu.in";
        string? contactPhone = _configuration["AdminPhone"] ?? _configuration["WhatsApp:AdminPhone"] ?? "+919811223344";

        try
        {
            var client = _httpClientFactory.CreateClient();
            var baseUrl = _configuration["Services:InstitutionService"] ?? "http://institution-service";
            var url = $"{baseUrl.TrimEnd('/')}/api/Institutions/public";
            HttpResponseMessage resp;
            try
            {
                resp = await client.GetAsync(url);
            }
            catch
            {
                var gwUrl = "https://api.myschooladmissions.com/api/institutions/public";
                resp = await client.GetAsync(gwUrl);
            }

            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                if (json.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    foreach (var inst in json.EnumerateArray())
                    {
                        var iId = inst.GetProperty("id").GetGuid();
                        var iName = inst.GetProperty("name").GetString() ?? instName;
                        var cEmail = inst.TryGetProperty("contactEmail", out var ce) ? ce.GetString() : null;
                        var cPhone = inst.TryGetProperty("contactPhone", out var cp) ? cp.GetString() : null;

                        if (inst.TryGetProperty("campuses", out var campuses) && campuses.ValueKind == System.Text.Json.JsonValueKind.Array)
                        {
                            foreach (var camp in campuses.EnumerateArray())
                            {
                                var cId = camp.GetProperty("id").GetGuid();
                                var cName = camp.GetProperty("name").GetString() ?? campName;
                                var campPhone = camp.TryGetProperty("contactPhone", out var cap) ? cap.GetString() : cPhone;
                                _nameCache[cId] = (iName, cName, cEmail, campPhone);
                            }
                        }

                        if (iId == institutionId)
                        {
                            instName = iName;
                            if (!string.IsNullOrWhiteSpace(cEmail)) adminEmail = cEmail;
                            if (!string.IsNullOrWhiteSpace(cPhone)) contactPhone = cPhone;
                        }
                    }

                    if (_nameCache.TryGetValue(campusId, out var found))
                    {
                        return found;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not resolve institution/campus names dynamically from InstitutionService. Falling back to defaults.");
        }

        var result = (instName, campName, adminEmail, contactPhone);
        _nameCache[campusId] = result;
        return result;
    }

    private static ActivityDto MapToDto(AdmissionActivity a)
    {
        var enq = a.Enquiry;
        return new ActivityDto
        {
            Id = a.Id,
            EnquiryId = a.EnquiryId,
            StudentName = enq != null ? $"{enq.FirstName} {enq.LastName}".Trim() : "Prospective Student",
            ParentEmail = enq?.Email ?? string.Empty,
            ParentPhone = enq?.Phone ?? string.Empty,
            GradeInterested = enq?.GradeInterested ?? string.Empty,
            Title = a.Title,
            ActivityType = a.ActivityType,
            Priority = a.Priority,
            Description = a.Description,
            Location = a.Location,
            ScheduledStartTime = a.ScheduledStartTime,
            ScheduledEndTime = a.ScheduledEndTime,
            Status = a.Status,
            Disposition = a.Disposition,
            OutcomeNotes = a.OutcomeNotes,
            CompletedAt = a.CompletedAt,
            AssignedToUserId = a.AssignedToUserId,
            AssignedToName = a.AssignedToName,
            InstitutionId = a.InstitutionId,
            CampusId = a.CampusId,
            CreatedAt = a.CreatedAt
        };
    }
}
