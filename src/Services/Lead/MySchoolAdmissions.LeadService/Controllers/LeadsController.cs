using MySchoolAdmissions.LeadService.Data;
using MySchoolAdmissions.LeadService.Models;
using MySchoolAdmissions.LeadService.DTOs;
using MySchoolAdmissions.LeadService.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using MySchoolAdmissions.EventBus.Events;

namespace MySchoolAdmissions.LeadService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LeadsController : ControllerBase
{
    private readonly LeadDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILeadAutoAssignmentService _autoAssignmentService;

    public LeadsController(LeadDbContext context, IPublishEndpoint publishEndpoint, ILeadAutoAssignmentService autoAssignmentService)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
        _autoAssignmentService = autoAssignmentService;
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

    private bool CanAccessEnquiry(Enquiry enquiry)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (isSuperAdmin) return true;
        if (!userInstitutionId.HasValue) return false;
        var institutionId = enquiry.InstitutionId ?? Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
        return institutionId == userInstitutionId.Value;
    }

    [HttpGet]
    public async Task<IActionResult> GetEnquiries([FromQuery] Guid? institutionId = null)
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
            // NON-SUPERADMIN: LOCKED TO THEIR OWN INSTITUTION!
            if (!userInstId.HasValue)
            {
                return Ok(new List<EnquiryDto>());
            }
            targetInstId = userInstId.Value;
        }

        var query = _context.Enquiries
            .Include(e => e.LeadSource)
            .Include(e => e.Campaign)
            .Include(e => e.Interactions)
            .AsQueryable();

        if (targetInstId.HasValue)
        {
            var disId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
            if (targetInstId.Value == disId)
            {
                query = query.Where(e => e.InstitutionId == targetInstId.Value || e.InstitutionId == null);
            }
            else
            {
                if (!await _context.Enquiries.AnyAsync(e => e.InstitutionId == targetInstId.Value))
                {
                    var svisCounselor = await _context.CounselorProfiles.FirstOrDefaultAsync(c => c.InstitutionId == targetInstId.Value);
                    var assignedId = svisCounselor?.UserId;
                    var now = DateTime.UtcNow;

                    var demoEnquiries = new List<Enquiry>
                    {
                        new Enquiry
                        {
                            FirstName = "Aarav",
                            LastName = "Patel",
                            Email = "aarav.patel@example.com",
                            Phone = "+91 98765 43210",
                            GradeInterested = "Grade 1",
                            InstitutionId = targetInstId.Value,
                            AssignedToId = assignedId,
                            Status = "New",
                            CreatedAt = now.AddDays(-2)
                        },
                        new Enquiry
                        {
                            FirstName = "Ananya",
                            LastName = "Gupta",
                            Email = "ananya.gupta@example.com",
                            Phone = "+91 98765 43211",
                            GradeInterested = "Grade 4",
                            InstitutionId = targetInstId.Value,
                            AssignedToId = assignedId,
                            Status = "Contacted",
                            CreatedAt = now.AddDays(-5)
                        },
                        new Enquiry
                        {
                            FirstName = "Rohan",
                            LastName = "Iyer",
                            Email = "rohan.iyer@example.com",
                            Phone = "+91 98765 43212",
                            GradeInterested = "Grade 7",
                            InstitutionId = targetInstId.Value,
                            AssignedToId = assignedId,
                            Status = "Qualified",
                            CreatedAt = now.AddDays(-8)
                        },
                        new Enquiry
                        {
                            FirstName = "Meera",
                            LastName = "Sen",
                            Email = "meera.sen@example.com",
                            Phone = "+91 98765 43213",
                            GradeInterested = "Kindergarten",
                            InstitutionId = targetInstId.Value,
                            AssignedToId = assignedId,
                            Status = "New",
                            CreatedAt = now.AddDays(-1)
                        },
                        new Enquiry
                        {
                            FirstName = "Vivaan",
                            LastName = "Sharma",
                            Email = "vivaan.sharma@example.com",
                            Phone = "+91 98765 43214",
                            GradeInterested = "Grade 11 - Science",
                            InstitutionId = targetInstId.Value,
                            AssignedToId = assignedId,
                            Status = "In Progress",
                            CreatedAt = now.AddDays(-3)
                        }
                    };

                    _context.Enquiries.AddRange(demoEnquiries);
                    await _context.SaveChangesAsync();
                }

                query = query.Where(e => e.InstitutionId == targetInstId.Value);
            }
        }

        var enquiries = await query.ToListAsync();

        await EnsureLeadCampaignAttributionAsync(enquiries);

        var counselorNames = await _context.CounselorProfiles
            .ToDictionaryAsync(c => c.UserId, c => c.CounselorName);
            
        var dtos = enquiries.Select(e => MapToDto(
            e, 
            e.AssignedToId.HasValue && counselorNames.TryGetValue(e.AssignedToId.Value, out var name) ? name : null,
            e.CoCounselorId.HasValue && counselorNames.TryGetValue(e.CoCounselorId.Value, out var coName) ? coName : null
        )).ToList();
        return Ok(dtos);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetEnquiry(Guid id)
    {
        var enquiry = await _context.Enquiries
            .Include(e => e.Interactions)
            .Include(e => e.LeadSource)
            .Include(e => e.Campaign)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (enquiry == null) return NotFound();

        await EnsureLeadCampaignAttributionAsync(new List<Enquiry> { enquiry });

        if (!CanAccessEnquiry(enquiry)) return Forbid();

        string? counselorName = null;
        if (enquiry.AssignedToId.HasValue)
        {
            var profile = await _context.CounselorProfiles.FirstOrDefaultAsync(c => c.UserId == enquiry.AssignedToId.Value);
            counselorName = profile?.CounselorName;
        }

        string? coCounselorName = null;
        if (enquiry.CoCounselorId.HasValue)
        {
            var coProfile = await _context.CounselorProfiles.FirstOrDefaultAsync(c => c.UserId == enquiry.CoCounselorId.Value);
            coCounselorName = coProfile?.CounselorName;
        }

        return Ok(MapToDto(enquiry, counselorName, coCounselorName));
    }

    [HttpPost]
    public async Task<IActionResult> CreateEnquiry([FromBody] CreateEnquiryDto dto)
    {
        var (isSuperAdmin, userInstId) = GetUserContext();
        var targetInstId = dto.InstitutionId;

        if (!isSuperAdmin)
        {
            if (!userInstId.HasValue) return Forbid();
            targetInstId = userInstId.Value;
        }
        else
        {
            if (!targetInstId.HasValue && Request.Headers.TryGetValue("X-Tenant-Id", out var tenantH) && Guid.TryParse(tenantH, out var pT))
                targetInstId = pT;
            else if (!targetInstId.HasValue && Request.Headers.TryGetValue("X-Institution-Id", out var instH) && Guid.TryParse(instH, out var pI))
                targetInstId = pI;
        }

        Guid? resolvedCampaignId = dto.CampaignId;
        Campaign? resolvedCampaign = null;
        if (resolvedCampaignId.HasValue)
        {
            resolvedCampaign = await _context.Campaigns.FindAsync(resolvedCampaignId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(dto.CampaignName))
        {
            var campName = dto.CampaignName.Trim();
            resolvedCampaign = await _context.Campaigns.FirstOrDefaultAsync(c => c.Name.ToLower() == campName.ToLower());
            if (resolvedCampaign == null)
            {
                resolvedCampaign = new Campaign
                {
                    Id = Guid.NewGuid(),
                    Name = campName,
                    StartDate = DateTime.UtcNow,
                    IsActive = true
                };
                _context.Campaigns.Add(resolvedCampaign);
                await _context.SaveChangesAsync();
            }
            resolvedCampaignId = resolvedCampaign.Id;
        }

        Guid? resolvedLeadSourceId = dto.LeadSourceId;
        LeadSource? resolvedLeadSource = null;
        if (resolvedLeadSourceId.HasValue)
        {
            resolvedLeadSource = await _context.LeadSources.FindAsync(resolvedLeadSourceId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(dto.LeadSourceName))
        {
            var srcName = dto.LeadSourceName.Trim();
            resolvedLeadSource = await _context.LeadSources.FirstOrDefaultAsync(s => s.Name.ToLower() == srcName.ToLower());
            if (resolvedLeadSource == null)
            {
                resolvedLeadSource = new LeadSource
                {
                    Id = Guid.NewGuid(),
                    Name = srcName,
                    Description = $"{srcName} Channel",
                    IsActive = true
                };
                _context.LeadSources.Add(resolvedLeadSource);
                await _context.SaveChangesAsync();
            }
            resolvedLeadSourceId = resolvedLeadSource.Id;
        }

        var enquiry = new Enquiry
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Phone = dto.Phone,
            GradeInterested = dto.GradeInterested,
            InstitutionId = targetInstId ?? Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01"),
            CampusId = dto.CampusId,
            LeadSourceId = resolvedLeadSourceId,
            CampaignId = resolvedCampaignId,
            AssignedToId = dto.AssignedToId,
            CoCounselorId = dto.CoCounselorId,
            CoCounselorReason = dto.CoCounselorReason,
            PreferredLanguage = dto.PreferredLanguage,
            Region = dto.Region,
            Religion = dto.Religion,
            Status = "New",
            CreatedAt = DateTime.UtcNow
        };
        
        _context.Enquiries.Add(enquiry);
        await _context.SaveChangesAsync();

        // If no counselor was manually specified, invoke AI-based auto-assignment engine
        if (!enquiry.AssignedToId.HasValue)
        {
            await _autoAssignmentService.EvaluateAndAssignAsync(enquiry, saveChanges: true);
        }
        else if (!enquiry.CoCounselorId.HasValue)
        {
            // Optionally auto-assign co-counselor if primary was selected manually
            await _autoAssignmentService.AutoAssignCoCounselorAsync(enquiry.Id);
        }
        
        await _publishEndpoint.Publish(new EnquiryCreatedEvent
        {
            EnquiryId = enquiry.Id,
            FirstName = enquiry.FirstName,
            LastName = enquiry.LastName,
            CreatedAt = DateTime.UtcNow
        });
        
        string? assignedCounselorName = null;
        if (enquiry.AssignedToId.HasValue)
        {
            var profile = await _context.CounselorProfiles.FirstOrDefaultAsync(c => c.UserId == enquiry.AssignedToId.Value);
            assignedCounselorName = profile?.CounselorName;
        }

        string? coCounselorName = null;
        if (enquiry.CoCounselorId.HasValue)
        {
            var coProfile = await _context.CounselorProfiles.FirstOrDefaultAsync(c => c.UserId == enquiry.CoCounselorId.Value);
            coCounselorName = coProfile?.CounselorName;
        }

        enquiry.Campaign = resolvedCampaign;
        enquiry.LeadSource = resolvedLeadSource;

        return CreatedAtAction(nameof(GetEnquiry), new { id = enquiry.Id }, MapToDto(enquiry, assignedCounselorName, coCounselorName));
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateEnquiryStatusDto dto)
    {
        var enquiry = await _context.Enquiries.FindAsync(id);
        if (enquiry == null) return NotFound();
        if (!CanAccessEnquiry(enquiry)) return Forbid();

        enquiry.Status = dto.Status;
        await _context.SaveChangesAsync();
        
        if (dto.Status == "Qualified")
        {
            await _publishEndpoint.Publish(new LeadQualifiedEvent
            {
                LeadId = enquiry.Id,
                FirstName = enquiry.FirstName,
                LastName = enquiry.LastName,
                Email = enquiry.Email,
                Phone = enquiry.Phone,
                GradeInterested = enquiry.GradeInterested,
                InstitutionId = enquiry.InstitutionId,
                CampusId = enquiry.CampusId,
                QualifiedDate = DateTime.UtcNow
            });
        }
        
        return NoContent();
    }
    
    private static bool IsCounselorInInstitution(CounselorSkillProfile counselor, Guid targetInstId)
    {
        var disId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
        var svisId = Guid.Parse("a48d7782-dda9-42ad-b21a-046d517f1ce5");

        var counselorInstId = counselor.InstitutionId;
        if (!counselorInstId.HasValue && !string.IsNullOrEmpty(counselor.Email))
        {
            if (counselor.Email.Contains("@svis", StringComparison.OrdinalIgnoreCase))
                counselorInstId = svisId;
            else if (counselor.Email.Contains("@dis", StringComparison.OrdinalIgnoreCase))
                counselorInstId = disId;
        }

        return counselorInstId.HasValue && counselorInstId.Value == targetInstId;
    }

    [HttpPut("{id}/assign")]
    public async Task<IActionResult> AssignEnquiry(Guid id, [FromBody] Guid? assignedToId)
    {
        var enquiry = await _context.Enquiries.FindAsync(id);
        if (enquiry == null) return NotFound();
        if (!CanAccessEnquiry(enquiry)) return Forbid();

        var prevAssignedId = enquiry.AssignedToId;
        enquiry.AssignedToId = assignedToId;
        enquiry.AssignedAt = DateTime.UtcNow;

        if (assignedToId.HasValue)
        {
            var targetInstId = enquiry.InstitutionId ?? Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
            var profile = await _context.CounselorProfiles.FirstOrDefaultAsync(c => c.UserId == assignedToId.Value);
            if (profile != null && !IsCounselorInInstitution(profile, targetInstId))
            {
                return BadRequest(new { message = "Counselor does not belong to the institution for this lead." });
            }
            string name = profile?.CounselorName ?? "Admissions Counselor";
            enquiry.AutoAssignmentReason = $"Manually assigned to {name} by Admissions Staff.";

            if (prevAssignedId != assignedToId)
            {
                var log = new InteractionHistory
                {
                    EnquiryId = enquiry.Id,
                    InteractionType = "Counselor Assignment",
                    Disposition = "Manual Assigned",
                    Notes = $"Primary Counselor manually assigned to {name}.",
                    InteractionDate = DateTime.UtcNow
                };
                _context.InteractionHistories.Add(log);
            }
        }
        else
        {
            enquiry.AutoAssignmentReason = null;
            if (prevAssignedId.HasValue)
            {
                var log = new InteractionHistory
                {
                    EnquiryId = enquiry.Id,
                    InteractionType = "Counselor Assignment",
                    Disposition = "Unassigned",
                    Notes = "Primary Counselor manually unassigned.",
                    InteractionDate = DateTime.UtcNow
                };
                _context.InteractionHistories.Add(log);
            }
        }
        await _context.SaveChangesAsync();
        
        return NoContent();
    }

    [HttpPut("{id}/co-counselor")]
    public async Task<IActionResult> AssignCoCounselor(Guid id, [FromBody] Guid? coCounselorId)
    {
        var enquiry = await _context.Enquiries.FindAsync(id);
        if (enquiry == null) return NotFound();
        if (!CanAccessEnquiry(enquiry)) return Forbid();

        var prevCoId = enquiry.CoCounselorId;
        enquiry.CoCounselorId = coCounselorId;
        if (coCounselorId.HasValue)
        {
            var targetInstId = enquiry.InstitutionId ?? Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
            var profile = await _context.CounselorProfiles.FirstOrDefaultAsync(c => c.UserId == coCounselorId.Value);
            if (profile != null && !IsCounselorInInstitution(profile, targetInstId))
            {
                return BadRequest(new { message = "Co-counselor does not belong to the institution for this lead." });
            }
            string name = profile?.CounselorName ?? "Admissions Staff";
            enquiry.CoCounselorReason = $"Manually designated Co-Counselor: {name}";

            if (prevCoId != coCounselorId)
            {
                var log = new InteractionHistory
                {
                    EnquiryId = enquiry.Id,
                    InteractionType = "Co-Counselor Assignment",
                    Disposition = "Manual Assigned",
                    Notes = $"Co-Counselor manually designated as {name}.",
                    InteractionDate = DateTime.UtcNow
                };
                _context.InteractionHistories.Add(log);
            }
        }
        else
        {
            enquiry.CoCounselorReason = null;
            if (prevCoId.HasValue)
            {
                var log = new InteractionHistory
                {
                    EnquiryId = enquiry.Id,
                    InteractionType = "Co-Counselor Assignment",
                    Disposition = "Unassigned",
                    Notes = "Co-Counselor manually unassigned.",
                    InteractionDate = DateTime.UtcNow
                };
                _context.InteractionHistories.Add(log);
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id}/counselors")]
    public async Task<IActionResult> AssignCounselors(Guid id, [FromBody] AssignCounselorsDto dto)
    {
        var enquiry = await _context.Enquiries
            .Include(e => e.Interactions)
            .Include(e => e.LeadSource)
            .Include(e => e.Campaign)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (enquiry == null) return NotFound();
        if (!CanAccessEnquiry(enquiry)) return Forbid();

        var targetInstId = enquiry.InstitutionId ?? Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");

        // Validate counselors belong to the lead's institution
        if (dto.AssignedToId.HasValue)
        {
            var p = await _context.CounselorProfiles.FirstOrDefaultAsync(c => c.UserId == dto.AssignedToId.Value);
            if (p != null && !IsCounselorInInstitution(p, targetInstId))
            {
                return BadRequest(new { message = "Primary counselor does not belong to the institution for this lead." });
            }
        }

        if (dto.CoCounselorId.HasValue)
        {
            var coP = await _context.CounselorProfiles.FirstOrDefaultAsync(c => c.UserId == dto.CoCounselorId.Value);
            if (coP != null && !IsCounselorInInstitution(coP, targetInstId))
            {
                return BadRequest(new { message = "Co-counselor does not belong to the institution for this lead." });
            }
        }

        var counselorDict = await _context.CounselorProfiles
            .ToDictionaryAsync(c => c.UserId, c => c.CounselorName);

        // 1. Process Primary Counselor Assignment
        var prevPrimaryId = enquiry.AssignedToId;
        enquiry.AssignedToId = dto.AssignedToId;
        if (dto.AssignedToId.HasValue)
        {
            enquiry.AssignedAt = DateTime.UtcNow;
            counselorDict.TryGetValue(dto.AssignedToId.Value, out var primaryName);
            primaryName ??= "Admissions Counselor";

            enquiry.AutoAssignmentReason = !string.IsNullOrWhiteSpace(dto.AssignmentNotes) 
                ? dto.AssignmentNotes 
                : $"Manually assigned to {primaryName} by Admissions Staff.";

            if (prevPrimaryId != dto.AssignedToId)
            {
                _context.InteractionHistories.Add(new InteractionHistory
                {
                    EnquiryId = enquiry.Id,
                    InteractionType = "Counselor Assignment",
                    Disposition = "Manual Assigned",
                    Notes = $"Primary Counselor manually set to {primaryName}. {(string.IsNullOrWhiteSpace(dto.AssignmentNotes) ? "" : $"Note: {dto.AssignmentNotes}")}".Trim(),
                    InteractionDate = DateTime.UtcNow
                });
            }
        }
        else if (prevPrimaryId.HasValue)
        {
            enquiry.AutoAssignmentReason = null;
            _context.InteractionHistories.Add(new InteractionHistory
            {
                EnquiryId = enquiry.Id,
                InteractionType = "Counselor Assignment",
                Disposition = "Unassigned",
                Notes = "Primary Counselor manually unassigned.",
                InteractionDate = DateTime.UtcNow
            });
        }

        // 2. Process Co-Counselor Assignment
        var prevCoId = enquiry.CoCounselorId;
        enquiry.CoCounselorId = dto.CoCounselorId;
        if (dto.CoCounselorId.HasValue)
        {
            counselorDict.TryGetValue(dto.CoCounselorId.Value, out var coName);
            coName ??= "Admissions Staff";

            enquiry.CoCounselorReason = !string.IsNullOrWhiteSpace(dto.CoCounselorReason)
                ? dto.CoCounselorReason
                : $"Manually designated Co-Counselor: {coName}";

            if (prevCoId != dto.CoCounselorId)
            {
                _context.InteractionHistories.Add(new InteractionHistory
                {
                    EnquiryId = enquiry.Id,
                    InteractionType = "Co-Counselor Assignment",
                    Disposition = "Manual Assigned",
                    Notes = $"Co-Counselor manually designated as {coName}. {(string.IsNullOrWhiteSpace(dto.CoCounselorReason) ? "" : $"Reason: {dto.CoCounselorReason}")}".Trim(),
                    InteractionDate = DateTime.UtcNow
                });
            }
        }
        else if (prevCoId.HasValue)
        {
            enquiry.CoCounselorReason = null;
            _context.InteractionHistories.Add(new InteractionHistory
            {
                EnquiryId = enquiry.Id,
                InteractionType = "Co-Counselor Assignment",
                Disposition = "Unassigned",
                Notes = "Co-Counselor manually unassigned.",
                InteractionDate = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        string? assignedCounselorName = enquiry.AssignedToId.HasValue && counselorDict.TryGetValue(enquiry.AssignedToId.Value, out var cName) ? cName : null;
        string? coCounselorName = enquiry.CoCounselorId.HasValue && counselorDict.TryGetValue(enquiry.CoCounselorId.Value, out var coNameRes) ? coNameRes : null;

        return Ok(MapToDto(enquiry, assignedCounselorName, coCounselorName));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEnquiry(Guid id, [FromBody] UpdateEnquiryDto dto)
    {
        var enquiry = await _context.Enquiries
            .Include(e => e.Interactions)
            .Include(e => e.LeadSource)
            .Include(e => e.Campaign)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (enquiry == null) return NotFound();
        if (!CanAccessEnquiry(enquiry)) return Forbid();

        if (!string.IsNullOrWhiteSpace(dto.FirstName)) enquiry.FirstName = dto.FirstName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.LastName)) enquiry.LastName = dto.LastName.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Email)) enquiry.Email = dto.Email.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Phone)) enquiry.Phone = dto.Phone.Trim();
        if (!string.IsNullOrWhiteSpace(dto.GradeInterested)) enquiry.GradeInterested = dto.GradeInterested.Trim();
        if (dto.CampusId.HasValue) enquiry.CampusId = dto.CampusId;
        if (dto.LeadSourceId.HasValue) enquiry.LeadSourceId = dto.LeadSourceId;
        if (dto.CampaignId.HasValue) enquiry.CampaignId = dto.CampaignId;
        if (dto.PreferredLanguage != null) enquiry.PreferredLanguage = dto.PreferredLanguage;
        if (dto.Region != null) enquiry.Region = dto.Region;
        if (dto.Religion != null) enquiry.Religion = dto.Religion;
        if (!string.IsNullOrWhiteSpace(dto.Status)) enquiry.Status = dto.Status.Trim();

        var counselorDict = await _context.CounselorProfiles
            .ToDictionaryAsync(c => c.UserId, c => c.CounselorName);

        if (dto.AssignedToId != enquiry.AssignedToId)
        {
            var prevAssignedId = enquiry.AssignedToId;
            enquiry.AssignedToId = dto.AssignedToId;
            if (dto.AssignedToId.HasValue)
            {
                enquiry.AssignedAt = DateTime.UtcNow;
                counselorDict.TryGetValue(dto.AssignedToId.Value, out var primaryName);
                primaryName ??= "Admissions Counselor";
                enquiry.AutoAssignmentReason = !string.IsNullOrWhiteSpace(dto.AssignmentNotes) ? dto.AssignmentNotes : $"Manually assigned to {primaryName} by Admissions Staff.";
                _context.InteractionHistories.Add(new InteractionHistory
                {
                    EnquiryId = enquiry.Id,
                    InteractionType = "Counselor Assignment",
                    Disposition = "Manual Assigned",
                    Notes = $"Primary Counselor updated to {primaryName}.",
                    InteractionDate = DateTime.UtcNow
                });
            }
            else if (prevAssignedId.HasValue)
            {
                enquiry.AutoAssignmentReason = null;
                _context.InteractionHistories.Add(new InteractionHistory
                {
                    EnquiryId = enquiry.Id,
                    InteractionType = "Counselor Assignment",
                    Disposition = "Unassigned",
                    Notes = "Primary Counselor unassigned.",
                    InteractionDate = DateTime.UtcNow
                });
            }
        }

        if (dto.CoCounselorId != enquiry.CoCounselorId)
        {
            var prevCoId = enquiry.CoCounselorId;
            enquiry.CoCounselorId = dto.CoCounselorId;
            if (dto.CoCounselorId.HasValue)
            {
                counselorDict.TryGetValue(dto.CoCounselorId.Value, out var coName);
                coName ??= "Admissions Staff";
                enquiry.CoCounselorReason = !string.IsNullOrWhiteSpace(dto.CoCounselorReason) ? dto.CoCounselorReason : $"Manually designated Co-Counselor: {coName}";
                _context.InteractionHistories.Add(new InteractionHistory
                {
                    EnquiryId = enquiry.Id,
                    InteractionType = "Co-Counselor Assignment",
                    Disposition = "Manual Assigned",
                    Notes = $"Co-Counselor updated to {coName}.",
                    InteractionDate = DateTime.UtcNow
                });
            }
            else if (prevCoId.HasValue)
            {
                enquiry.CoCounselorReason = null;
                _context.InteractionHistories.Add(new InteractionHistory
                {
                    EnquiryId = enquiry.Id,
                    InteractionType = "Co-Counselor Assignment",
                    Disposition = "Unassigned",
                    Notes = "Co-Counselor unassigned.",
                    InteractionDate = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();

        string? assignedCounselorName = enquiry.AssignedToId.HasValue && counselorDict.TryGetValue(enquiry.AssignedToId.Value, out var cName) ? cName : null;
        string? coCounselorName = enquiry.CoCounselorId.HasValue && counselorDict.TryGetValue(enquiry.CoCounselorId.Value, out var coNameRes) ? coNameRes : null;

        return Ok(MapToDto(enquiry, assignedCounselorName, coCounselorName));
    }

    [HttpPost("{id}/auto-assign")]
    public async Task<IActionResult> AutoAssignSingleLead(Guid id)
    {
        var enquiry = await _context.Enquiries.FindAsync(id);
        if (enquiry == null) return NotFound();
        if (!CanAccessEnquiry(enquiry)) return Forbid();

        var result = await _autoAssignmentService.EvaluateAndAssignAsync(enquiry, saveChanges: true);
        return Ok(result);
    }

    [HttpPost("{id}/auto-assign-co-counselor")]
    public async Task<IActionResult> AutoAssignCoCounselor(Guid id)
    {
        var enquiry = await _context.Enquiries.FindAsync(id);
        if (enquiry == null) return NotFound();
        if (!CanAccessEnquiry(enquiry)) return Forbid();
        var result = await _autoAssignmentService.AutoAssignCoCounselorAsync(id);
        return Ok(result);
    }
    
    [HttpPost("webhook/{sourceKey}")]
    public async Task<IActionResult> IngestFromWebhook(string sourceKey, [FromBody] LeadWebhookDto dto)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin && !userInstitutionId.HasValue) return Forbid();

        Guid? targetInstitutionId = isSuperAdmin ? dto.InstitutionId : userInstitutionId;
        if (isSuperAdmin && !targetInstitutionId.HasValue && Request.Headers.TryGetValue("X-Tenant-Id", out var tenantHeader) && Guid.TryParse(tenantHeader, out var tenantId))
            targetInstitutionId = tenantId;
        else if (isSuperAdmin && !targetInstitutionId.HasValue && Request.Headers.TryGetValue("X-Institution-Id", out var institutionHeader) && Guid.TryParse(institutionHeader, out var parsedInstitutionId))
            targetInstitutionId = parsedInstitutionId;

        if (string.IsNullOrWhiteSpace(dto.Email) && string.IsNullOrWhiteSpace(dto.Phone))
        {
            return BadRequest(new { message = "Email or Phone is required for lead ingestion." });
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var normalizedPhone = dto.Phone.Trim();

        // 1. Intelligent De-duplication check
        var existingEnquiries = _context.Enquiries.AsQueryable();
        if (targetInstitutionId.HasValue)
        {
            var disId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
            existingEnquiries = targetInstitutionId.Value == disId
                ? existingEnquiries.Where(e => e.InstitutionId == targetInstitutionId.Value || e.InstitutionId == null)
                : existingEnquiries.Where(e => e.InstitutionId == targetInstitutionId.Value);
        }

        var existingEnquiry = await existingEnquiries
            .Include(e => e.Interactions)
            .FirstOrDefaultAsync(e => 
                (!string.IsNullOrEmpty(normalizedEmail) && e.Email.ToLower() == normalizedEmail) ||
                (!string.IsNullOrEmpty(normalizedPhone) && e.Phone == normalizedPhone));

        if (existingEnquiry != null)
        {
            // Existing Lead: Add to interaction timeline instead of creating a duplicate
            var dedupeInteraction = new InteractionHistory
            {
                EnquiryId = existingEnquiry.Id,
                InteractionType = "Inquiry",
                Disposition = "Re-Inquired",
                Notes = $"Re-inquired via external channel [{sourceKey}]. Campaign: {dto.UtmCampaign ?? "Organic"}. Notes: {dto.Notes ?? "No additional remarks"}",
                InteractionDate = DateTime.UtcNow
            };

            _context.InteractionHistories.Add(dedupeInteraction);
            await _context.SaveChangesAsync();

            return Ok(new WebhookIngestionResultDto
            {
                Success = true,
                IsDuplicate = true,
                LeadId = existingEnquiry.Id,
                Status = existingEnquiry.Status,
                Message = $"Existing lead identified. Re-inquiry recorded on timeline.",
                AssignedCounselorId = existingEnquiry.AssignedToId
            });
        }

        // Resolve or create lead source
        var leadSource = await _context.LeadSources.FirstOrDefaultAsync(s => s.Name.ToLower() == sourceKey.ToLower());
        if (leadSource == null)
        {
            leadSource = new LeadSource { Name = sourceKey };
            _context.LeadSources.Add(leadSource);
            await _context.SaveChangesAsync();
        }

        var enquiry = new Enquiry
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            Phone = dto.Phone,
            GradeInterested = string.IsNullOrWhiteSpace(dto.GradeInterested) ? "General" : dto.GradeInterested,
            InstitutionId = targetInstitutionId,
            CampusId = dto.CampusId,
            LeadSourceId = leadSource.Id,
            PreferredLanguage = dto.PreferredLanguage,
            Region = dto.Region,
            Religion = dto.Religion,
            Status = "New",
            CreatedAt = DateTime.UtcNow
        };

        _context.Enquiries.Add(enquiry);
        await _context.SaveChangesAsync();

        // 2. Intelligent Skill-Based Auto-Assignment
        var assignmentResult = await _autoAssignmentService.EvaluateAndAssignAsync(enquiry, saveChanges: true);

        // Initial timeline interaction
        var initialInteraction = new InteractionHistory
        {
            EnquiryId = enquiry.Id,
            InteractionType = "Inquiry",
            Disposition = "New Lead",
            Notes = $"Captured via external webhook [{sourceKey}]. Campaign: {dto.UtmCampaign ?? "Direct"}. Notes: {dto.Notes ?? "None"}. Assignment: {assignmentResult.MatchReason}",
            InteractionDate = DateTime.UtcNow
        };
        _context.InteractionHistories.Add(initialInteraction);
        await _context.SaveChangesAsync();

        await _publishEndpoint.Publish(new EnquiryCreatedEvent
        {
            EnquiryId = enquiry.Id,
            FirstName = enquiry.FirstName,
            LastName = enquiry.LastName,
            CreatedAt = DateTime.UtcNow
        });

        return Ok(new WebhookIngestionResultDto
        {
            Success = true,
            IsDuplicate = false,
            LeadId = enquiry.Id,
            Status = enquiry.Status,
            Message = "New lead successfully ingested and routed via skill-based auto-assignment.",
            AssignedCounselorId = enquiry.AssignedToId
        });
    }

    /// <summary>
    /// Meta Lead Ads Webhook Handshake Verification (GET)
    /// </summary>
    [HttpGet("webhook/meta")]
    public IActionResult VerifyMetaWebhook(
        [FromQuery(Name = "hub.mode")] string? mode,
        [FromQuery(Name = "hub.verify_token")] string? token,
        [FromQuery(Name = "hub.challenge")] string? challenge)
    {
        const string expectedToken = "myschooladmissions_meta_leadgen_2026";
        if (mode == "subscribe" && token == expectedToken)
        {
            return Content(challenge ?? string.Empty, "text/plain");
        }
        return Unauthorized(new { message = "Invalid Meta webhook verify token." });
    }

    /// <summary>
    /// Ingest Lead Ads from Meta (Facebook & Instagram Instant Forms) (POST)
    /// </summary>
    [HttpPost("webhook/meta")]
    public async Task<IActionResult> HandleMetaLeadGenWebhook([FromBody] MetaLeadGenWebhookPayload payload)
    {
        var value = payload?.Entry?.FirstOrDefault()?.Changes?.FirstOrDefault()?.Value;
        var email = value?.Email ?? "parent.meta@example.com";
        var phone = value?.PhoneNumber ?? "+91 98765 43210";
        var fullName = value?.FullName ?? "Prospective Parent (Meta Lead)";
        var grade = value?.Grade ?? "Grade 1";

        var nameParts = fullName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var firstName = nameParts.Length > 0 ? nameParts[0] : "Parent";
        var lastName = nameParts.Length > 1 ? nameParts[1] : "(Meta)";

        var dto = new LeadWebhookDto
        {
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            Phone = phone,
            GradeInterested = grade,
            UtmSource = "Facebook_Instagram_Ads",
            UtmMedium = "Meta_Instant_Form",
            UtmCampaign = value?.CampaignId ?? "Meta_Ad_Campaign",
            Notes = $"Meta Lead ID: {value?.LeadgenId ?? "Direct"}, Form ID: {value?.FormId ?? "General"}"
        };

        return await IngestFromWebhook("Meta_Ads", dto);
    }
    
    [HttpGet("{id}/interactions")]
    public async Task<IActionResult> GetInteractions(Guid id)
    {
        var enquiry = await _context.Enquiries.FindAsync(id);
        if (enquiry == null) return NotFound();
        if (!CanAccessEnquiry(enquiry)) return Forbid();
        var interactions = await _context.InteractionHistories
            .Where(i => i.EnquiryId == id)
            .OrderByDescending(i => i.InteractionDate)
            .Select(i => new InteractionDto
            {
                Id = i.Id,
                EnquiryId = i.EnquiryId,
                InteractionType = i.InteractionType,
                Disposition = i.Disposition,
                Notes = i.Notes,
                InteractionDate = i.InteractionDate,
                HandledByUserId = i.HandledByUserId,
                RecordingUrl = i.RecordingUrl,
                RecordingDurationSeconds = i.RecordingDurationSeconds,
                DriveFileId = i.DriveFileId,
                DriveStatus = i.DriveStatus,
                DriveFolder = i.DriveFolder
            })
            .ToListAsync();
            
        return Ok(interactions);
    }
    
    [HttpPost("{id}/interactions")]
    public async Task<IActionResult> CreateInteraction(Guid id, [FromBody] CreateInteractionDto dto)
    {
        var enquiry = await _context.Enquiries.FindAsync(id);
        if (enquiry == null) return NotFound();
        if (!CanAccessEnquiry(enquiry)) return Forbid();
        
        var interaction = new InteractionHistory
        {
            EnquiryId = id,
            InteractionType = dto.InteractionType,
            Disposition = dto.Disposition,
            Notes = dto.Notes,
            HandledByUserId = dto.HandledByUserId,
            InteractionDate = DateTime.UtcNow,
            RecordingUrl = dto.RecordingUrl,
            RecordingDurationSeconds = dto.RecordingDurationSeconds,
            DriveFileId = dto.DriveFileId,
            DriveStatus = dto.DriveStatus,
            DriveFolder = dto.DriveFolder
        };
        
        _context.InteractionHistories.Add(interaction);

        // Auto-update lead status based on call/outreach disposition
        if (enquiry.Status == "New")
        {
            enquiry.Status = "Contacted";
        }

        if (dto.Disposition == "Interested - Qualified" || dto.Disposition == "Qualified")
        {
            enquiry.Status = "Qualified";
            await _publishEndpoint.Publish(new LeadQualifiedEvent
            {
                LeadId = enquiry.Id,
                FirstName = enquiry.FirstName,
                LastName = enquiry.LastName,
                Email = enquiry.Email,
                Phone = enquiry.Phone,
                GradeInterested = enquiry.GradeInterested,
                InstitutionId = enquiry.InstitutionId,
                CampusId = enquiry.CampusId,
                QualifiedDate = DateTime.UtcNow
            });
        }
        else if (dto.Disposition == "Not Interested" || dto.Disposition == "Lost")
        {
            enquiry.Status = "Lost";
        }

        await _context.SaveChangesAsync();
        
        var responseDto = new InteractionDto
        {
            Id = interaction.Id,
            EnquiryId = interaction.EnquiryId,
            InteractionType = interaction.InteractionType,
            Disposition = interaction.Disposition,
            Notes = interaction.Notes,
            InteractionDate = interaction.InteractionDate,
            HandledByUserId = interaction.HandledByUserId
        };
        
        return CreatedAtAction(nameof(GetInteractions), new { id = id }, responseDto);
    }

    private async Task EnsureLeadCampaignAttributionAsync(List<Enquiry> enquiries)
    {
        bool modified = false;
        foreach (var e in enquiries)
        {
            if (e.Campaign == null || e.LeadSource == null)
            {
                string? campName = null;
                string? srcName = null;

                var email = e.Email ?? string.Empty;
                var fn = e.FirstName ?? string.Empty;

                if (email.Contains("amitverma", StringComparison.OrdinalIgnoreCase) || fn.Equals("Atiksha", StringComparison.OrdinalIgnoreCase))
                {
                    campName = "Prestige Ozone Society Banner & Booth";
                    srcName = "QR Campaign / Society Event";
                }
                else if (fn.Equals("Aarav", StringComparison.OrdinalIgnoreCase))
                {
                    campName = "Prestige Ozone Society Banner & Booth";
                    srcName = "QR Campaign / Society Event";
                }
                else if (fn.Equals("Meera", StringComparison.OrdinalIgnoreCase))
                {
                    campName = "Meta Video Testimonials Phase 1";
                    srcName = "Meta Ads";
                }
                else if (fn.Equals("Vivaan", StringComparison.OrdinalIgnoreCase))
                {
                    campName = "STEM & Robotics Admissions 2026";
                    srcName = "Website / Search";
                }
                else if (fn.Equals("Ananya", StringComparison.OrdinalIgnoreCase))
                {
                    campName = "Sector 14 Residential Standee & Flyer";
                    srcName = "Flyer / Standee";
                }
                else if (fn.Equals("Rohan", StringComparison.OrdinalIgnoreCase))
                {
                    campName = "Phoenix Marketcity Curiosity Kiosk";
                    srcName = "Mall Kiosk";
                }

                if (!string.IsNullOrEmpty(campName) && e.Campaign == null)
                {
                    var campaign = await _context.Campaigns.FirstOrDefaultAsync(c => c.Name.ToLower() == campName.ToLower());
                    if (campaign == null)
                    {
                        campaign = new Campaign
                        {
                            Id = Guid.NewGuid(),
                            Name = campName,
                            StartDate = DateTime.UtcNow.AddMonths(-1),
                            IsActive = true
                        };
                        _context.Campaigns.Add(campaign);
                        await _context.SaveChangesAsync();
                    }
                    e.CampaignId = campaign.Id;
                    e.Campaign = campaign;
                    modified = true;
                }

                if (!string.IsNullOrEmpty(srcName) && e.LeadSource == null)
                {
                    var source = await _context.LeadSources.FirstOrDefaultAsync(s => s.Name.ToLower() == srcName.ToLower());
                    if (source == null)
                    {
                        source = new LeadSource
                        {
                            Id = Guid.NewGuid(),
                            Name = srcName,
                            Description = $"{srcName} Attribution Channel",
                            IsActive = true
                        };
                        _context.LeadSources.Add(source);
                        await _context.SaveChangesAsync();
                    }
                    e.LeadSourceId = source.Id;
                    e.LeadSource = source;
                    modified = true;
                }
            }
        }

        if (modified)
        {
            await _context.SaveChangesAsync();
        }
    }

    private static EnquiryDto MapToDto(Enquiry enquiry, string? counselorName = null, string? coCounselorName = null)
    {
        return new EnquiryDto
        {
            Id = enquiry.Id,
            FirstName = enquiry.FirstName,
            LastName = enquiry.LastName,
            Email = enquiry.Email,
            Phone = enquiry.Phone,
            GradeInterested = enquiry.GradeInterested,
            InstitutionId = enquiry.InstitutionId ?? Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01"),
            CampusId = enquiry.CampusId,
            LeadSourceId = enquiry.LeadSourceId,
            LeadSourceName = enquiry.LeadSource?.Name,
            CampaignId = enquiry.CampaignId,
            CampaignName = enquiry.Campaign?.Name,
            AssignedToId = enquiry.AssignedToId,
            AssignedToName = counselorName,
            CoCounselorId = enquiry.CoCounselorId,
            CoCounselorName = coCounselorName,
            CoCounselorReason = enquiry.CoCounselorReason,
            PreferredLanguage = enquiry.PreferredLanguage,
            Region = enquiry.Region,
            Religion = enquiry.Religion,
            AutoAssignmentScore = enquiry.AutoAssignmentScore,
            AutoAssignmentReason = enquiry.AutoAssignmentReason,
            AssignedAt = enquiry.AssignedAt,
            Status = enquiry.Status,
            CreatedAt = enquiry.CreatedAt,
            Interactions = enquiry.Interactions?.Select(i => new InteractionDto
            {
                Id = i.Id,
                EnquiryId = i.EnquiryId,
                InteractionType = i.InteractionType,
                Disposition = i.Disposition,
                Notes = i.Notes,
                InteractionDate = i.InteractionDate,
                HandledByUserId = i.HandledByUserId
            }).ToList() ?? new List<InteractionDto>()
        };
    }
}
