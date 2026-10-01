using MySchoolAdmissions.MarketingService.Data;
using MySchoolAdmissions.MarketingService.Models;
using MySchoolAdmissions.MarketingService.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace MySchoolAdmissions.MarketingService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CampaignsController : ControllerBase
{
    private readonly MarketingDbContext _context;

    public CampaignsController(MarketingDbContext context)
    {
        _context = context;
    }

    private (bool isSuperAdmin, Guid? institutionId) GetUserContext()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeader)) return (false, null);
        try
        {
            var token = authHeader.ToString().Replace("Bearer ", string.Empty, StringComparison.OrdinalIgnoreCase).Trim();
            var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
            var isSuperAdmin = jwt.Claims.Any(c =>
                (c.Type == "role" || c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role") &&
                c.Value.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase));
            var claim = jwt.Claims.FirstOrDefault(c => c.Type.Equals("institutionId", StringComparison.OrdinalIgnoreCase) || c.Type.Equals("institution_id", StringComparison.OrdinalIgnoreCase));
            return (isSuperAdmin, Guid.TryParse(claim?.Value, out var id) ? id : null);
        }
        catch { return (false, null); }
    }

    private Guid? GetSelectedInstitutionId(Guid? queryInstitutionId = null)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin) return userInstitutionId;
        if (queryInstitutionId.HasValue && queryInstitutionId.Value != Guid.Empty) return queryInstitutionId;

        if (Request.Headers.TryGetValue("X-Tenant-Id", out var tenant) && Guid.TryParse(tenant, out var tenantId) && tenantId != Guid.Empty) return tenantId;
        if (Request.Headers.TryGetValue("X-Institution-Id", out var institution) && Guid.TryParse(institution, out var institutionId) && institutionId != Guid.Empty) return institutionId;
        return isSuperAdmin ? null : userInstitutionId;
    }

    private bool CanAccess(Campaign campaign)
    {
        var selectedInstitutionId = GetSelectedInstitutionId();
        return selectedInstitutionId.HasValue && campaign.InstitutionId == selectedInstitutionId.Value ||
               !selectedInstitutionId.HasValue && GetUserContext().isSuperAdmin;
    }

    [HttpGet]
    public async Task<IActionResult> GetCampaigns(
        [FromQuery] string? schoolName,
        [FromQuery] string? campusName,
        [FromQuery] string? session,
        [FromQuery] string? status,
        [FromQuery] string? channel,
        [FromQuery] string? type,
        [FromQuery] string? search,
        [FromQuery] Guid? institutionId)
    {
        // Ensure campaigns are seeded and multi-tenant backfilled
        await MarketingDbSeeder.SeedAsync(_context);

        var query = _context.Campaigns.AsQueryable();
        var selectedInstitutionId = GetSelectedInstitutionId(institutionId);
        if (selectedInstitutionId.HasValue) 
        {
            var disId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
            if (selectedInstitutionId.Value == disId)
            {
                query = query.Where(c => c.InstitutionId == selectedInstitutionId.Value || c.InstitutionId == null);
            }
            else
            {
                query = query.Where(c => c.InstitutionId == selectedInstitutionId.Value);
            }
        }

        if (!string.IsNullOrWhiteSpace(schoolName))
            query = query.Where(c => c.SchoolName.ToLower() == schoolName.ToLower());

        if (!string.IsNullOrWhiteSpace(campusName))
            query = query.Where(c => c.CampusName.ToLower() == campusName.ToLower());

        if (!string.IsNullOrWhiteSpace(session))
            query = query.Where(c => c.AcademicSession == session);

        if (!string.IsNullOrWhiteSpace(status) && status.ToLower() != "all")
            query = query.Where(c => c.Status.ToLower() == status.ToLower());

        if (!string.IsNullOrWhiteSpace(channel) && channel.ToLower() != "all")
            query = query.Where(c => c.PrimaryChannel.ToLower() == channel.ToLower() || c.Channels.ToLower().Contains(channel.ToLower()));

        if (!string.IsNullOrWhiteSpace(type) && type.ToLower() != "all")
            query = query.Where(c => c.Type.ToLower() == type.ToLower());

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(s) || 
                                     c.TargetGrades.ToLower().Contains(s) || 
                                     c.TargetGeography.ToLower().Contains(s));
        }

        var campaigns = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Ok(campaigns.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCampaign(Guid id)
    {
        var campaign = await _context.Campaigns.FindAsync(id);
        if (campaign == null) return NotFound();
        if (!CanAccess(campaign)) return Forbid();
        
        return Ok(MapToDto(campaign));
    }

    [HttpPost]
    public async Task<IActionResult> CreateCampaign([FromBody] CreateCampaignDto dto)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin && !userInstitutionId.HasValue) return Forbid();
        var campaign = new Campaign
        {
            Name = dto.Name,
            Type = dto.Type,
            Objective = dto.Objective,
            SchoolName = string.IsNullOrWhiteSpace(dto.SchoolName) ? "Delhi International School" : dto.SchoolName,
            CampusId = dto.CampusId,
            CampusName = string.IsNullOrWhiteSpace(dto.CampusName) ? "Main Campus" : dto.CampusName,
            AcademicSession = string.IsNullOrWhiteSpace(dto.AcademicSession) ? "2026–2027" : dto.AcademicSession,
            TargetAdmissionCycle = string.IsNullOrWhiteSpace(dto.TargetAdmissionCycle) ? "Cycle 1" : dto.TargetAdmissionCycle,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Budget = dto.Budget,
            ActualCost = 0,
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "Draft" : dto.Status,
            Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Medium" : dto.Priority,
            PrimaryChannel = string.IsNullOrWhiteSpace(dto.PrimaryChannel) ? "Facebook" : dto.PrimaryChannel,
            Channels = string.IsNullOrWhiteSpace(dto.Channels) ? "Facebook,Instagram" : dto.Channels,
            TargetGrades = dto.TargetGrades,
            TargetGeography = dto.TargetGeography,
            TargetPinCodes = dto.TargetPinCodes,
            InstitutionId = GetSelectedInstitutionId(),
            UtmSource = dto.UtmSource,
            UtmMedium = dto.UtmMedium,
            UtmCampaign = dto.UtmCampaign,
            QrCodeKey = dto.QrCodeKey,
            IsAiGenerated = dto.IsAiGenerated,
            AiConfidenceScore = dto.AiConfidenceScore,
            AiStrategySummary = dto.AiStrategySummary,
            Owner = string.IsNullOrWhiteSpace(dto.Owner) ? "Marketing Lead" : dto.Owner,
            CreatedAt = DateTime.UtcNow
        };
        
        _context.Campaigns.Add(campaign);
        await _context.SaveChangesAsync();
        
        return CreatedAtAction(nameof(GetCampaign), new { id = campaign.Id }, MapToDto(campaign));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCampaign(Guid id, [FromBody] UpdateCampaignDto dto)
    {
        var campaign = await _context.Campaigns.FindAsync(id);
        if (campaign == null) return NotFound();
        if (!CanAccess(campaign)) return Forbid();

        campaign.Name = dto.Name;
        campaign.Type = dto.Type;
        campaign.Objective = dto.Objective;
        campaign.SchoolName = dto.SchoolName;
        campaign.CampusId = dto.CampusId;
        campaign.CampusName = dto.CampusName;
        campaign.AcademicSession = dto.AcademicSession;
        campaign.TargetAdmissionCycle = dto.TargetAdmissionCycle;
        campaign.StartDate = dto.StartDate;
        campaign.EndDate = dto.EndDate;
        campaign.Budget = dto.Budget;
        campaign.ActualCost = dto.ActualCost;
        campaign.Status = dto.Status;
        campaign.Priority = dto.Priority;
        campaign.PrimaryChannel = dto.PrimaryChannel;
        campaign.Channels = dto.Channels;
        campaign.TargetGrades = dto.TargetGrades;
        campaign.TargetGeography = dto.TargetGeography;
        campaign.TargetPinCodes = dto.TargetPinCodes;
        campaign.InstitutionId = GetSelectedInstitutionId();

        // Funnel updates
        campaign.Impressions = dto.Impressions;
        campaign.Clicks = dto.Clicks;
        campaign.ExpectedLeads = dto.ExpectedLeads;
        campaign.ActualLeads = dto.ActualLeads;
        campaign.ExpectedQualified = dto.ExpectedQualified;
        campaign.ActualQualified = dto.ActualQualified;
        campaign.ExpectedVisits = dto.ExpectedVisits;
        campaign.ActualVisits = dto.ActualVisits;
        campaign.ExpectedApplications = dto.ExpectedApplications;
        campaign.ActualApplications = dto.ActualApplications;
        campaign.ExpectedEnrollments = dto.ExpectedEnrollments;
        campaign.ActualEnrollments = dto.ActualEnrollments;

        campaign.UtmSource = dto.UtmSource;
        campaign.UtmMedium = dto.UtmMedium;
        campaign.UtmCampaign = dto.UtmCampaign;
        campaign.QrCodeKey = dto.QrCodeKey;
        campaign.Owner = dto.Owner;
        campaign.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        
        return NoContent();
    }
    
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCampaign(Guid id)
    {
        var campaign = await _context.Campaigns.FindAsync(id);
        if (campaign == null) return NotFound();
        if (!CanAccess(campaign)) return Forbid();
        
        _context.Campaigns.Remove(campaign);
        await _context.SaveChangesAsync();
        
        return NoContent();
    }

    [HttpPost("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] StatusUpdateDto dto)
    {
        var campaign = await _context.Campaigns.FindAsync(id);
        if (campaign == null) return NotFound();
        if (!CanAccess(campaign)) return Forbid();

        campaign.Status = dto.Status;
        campaign.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapToDto(campaign));
    }

    private static CampaignDto MapToDto(Campaign campaign)
    {
        return new CampaignDto
        {
            Id = campaign.Id,
            Name = campaign.Name,
            Type = campaign.Type,
            Objective = campaign.Objective,
            SchoolName = campaign.SchoolName,
            CampusId = campaign.CampusId,
            CampusName = campaign.CampusName,
            AcademicSession = campaign.AcademicSession,
            TargetAdmissionCycle = campaign.TargetAdmissionCycle,
            InstitutionId = campaign.InstitutionId,
            StartDate = campaign.StartDate,
            EndDate = campaign.EndDate,
            Budget = campaign.Budget,
            ActualCost = campaign.ActualCost,
            Status = campaign.Status,
            Priority = campaign.Priority,
            PrimaryChannel = campaign.PrimaryChannel,
            Channels = campaign.Channels,
            TargetGrades = campaign.TargetGrades,
            TargetGeography = campaign.TargetGeography,
            TargetPinCodes = campaign.TargetPinCodes,
            
            Impressions = campaign.Impressions,
            Clicks = campaign.Clicks,
            ExpectedLeads = campaign.ExpectedLeads,
            ActualLeads = campaign.ActualLeads,
            ExpectedQualified = campaign.ExpectedQualified,
            ActualQualified = campaign.ActualQualified,
            ExpectedVisits = campaign.ExpectedVisits,
            ActualVisits = campaign.ActualVisits,
            ExpectedApplications = campaign.ExpectedApplications,
            ActualApplications = campaign.ActualApplications,
            ExpectedEnrollments = campaign.ExpectedEnrollments,
            ActualEnrollments = campaign.ActualEnrollments,

            CostPerLead = campaign.CostPerLead,
            CostPerVisit = campaign.CostPerVisit,
            CostPerApplication = campaign.CostPerApplication,
            CostPerEnrollment = campaign.CostPerEnrollment,
            LeadToEnrollmentConversion = campaign.LeadToEnrollmentConversion,

            UtmSource = campaign.UtmSource,
            UtmMedium = campaign.UtmMedium,
            UtmCampaign = campaign.UtmCampaign,
            QrCodeKey = campaign.QrCodeKey,
            IsAiGenerated = campaign.IsAiGenerated,
            AiConfidenceScore = campaign.AiConfidenceScore,
            AiDiagnosisSummary = campaign.AiDiagnosisSummary,
            AiStrategySummary = campaign.AiStrategySummary,
            Owner = campaign.Owner,
            CreatedAt = campaign.CreatedAt
        };
    }

    private async Task SeedInitialCampaignsAsync()
    {
        var now = DateTime.UtcNow;
        var campaigns = new List<Campaign>
        {
            new Campaign
            {
                Name = "Early Bird Admissions 2026-27 - Meta Lead Blitz",
                Type = "Digital",
                Objective = "LeadGeneration",
                SchoolName = "Delhi International School",
                CampusName = "Main Campus",
                AcademicSession = "2026–2027",
                TargetAdmissionCycle = "Cycle 1 (April 2026)",
                StartDate = now.AddDays(-20),
                EndDate = now.AddDays(10),
                Status = "Active",
                Priority = "High",
                Budget = 50000,
                ActualCost = 38400,
                PrimaryChannel = "Facebook",
                Channels = "Facebook,Instagram",
                TargetGrades = "Nursery,Kindergarten,Grade 1",
                TargetGeography = "Sector 14, Indiranagar (0-5 km)",
                TargetPinCodes = "560038,560008",
                Impressions = 142000,
                Clicks = 5680,
                ExpectedLeads = 350,
                ActualLeads = 320,
                ExpectedQualified = 210,
                ActualQualified = 205,
                ExpectedVisits = 110,
                ActualVisits = 98,
                ExpectedApplications = 60,
                ActualApplications = 52,
                ExpectedEnrollments = 35,
                ActualEnrollments = 31,
                UtmSource = "meta",
                UtmMedium = "cpc",
                UtmCampaign = "early_bird_2026",
                IsAiGenerated = true,
                AiConfidenceScore = 0.92,
                AiStrategySummary = "Hyper-local parent persona targeting with video testimonial of primary grade parents and virtual campus tour incentive.",
                AiDiagnosisSummary = "Top performing digital campaign. Strong lead volume; slight bottleneck at campus visit attendance on weekdays.",
                Owner = "Ananya Sharma",
                CreatedAt = now.AddDays(-21)
            },
            new Campaign
            {
                Name = "Gated Community Showcase & STEM Expo",
                Type = "Offline",
                Objective = "CampusVisits",
                SchoolName = "Delhi International School",
                CampusName = "Main Campus",
                AcademicSession = "2026–2027",
                TargetAdmissionCycle = "Cycle 1 (April 2026)",
                StartDate = now.AddDays(-14),
                EndDate = now.AddDays(16),
                Status = "Active",
                Priority = "High",
                Budget = 60000,
                ActualCost = 42000,
                PrimaryChannel = "Society Event",
                Channels = "Society Event,Flyer,WhatsApp",
                TargetGrades = "Grade 4,Grade 5,Grade 6,Grade 7",
                TargetGeography = "Prestige Ozone & Palm Meadows Societies (3 km)",
                TargetPinCodes = "560066",
                Impressions = 8500,
                Clicks = 2100,
                ExpectedLeads = 120,
                ActualLeads = 145,
                ExpectedQualified = 100,
                ActualQualified = 122,
                ExpectedVisits = 75,
                ActualVisits = 84,
                ExpectedApplications = 50,
                ActualApplications = 58,
                ExpectedEnrollments = 30,
                ActualEnrollments = 36,
                QrCodeKey = "QR-SOC-OZONE-26",
                IsAiGenerated = true,
                AiConfidenceScore = 0.95,
                AiStrategySummary = "Weekend robotics showcase in clubhouse with instant QR registration for experiential weekend campus walk.",
                AiDiagnosisSummary = "Exceptional conversion rate (24.8% Lead-to-Enrollment) driven by peer community credibility.",
                Owner = "Vikram Malhotra",
                CreatedAt = now.AddDays(-15)
            },
            new Campaign
            {
                Name = "Google High-Intent Search: 'Best CBSE Schools Near Me'",
                Type = "Digital",
                Objective = "ApplicationGeneration",
                SchoolName = "Delhi International School",
                CampusName = "Main Campus",
                AcademicSession = "2026–2027",
                TargetAdmissionCycle = "Cycle 1 (April 2026)",
                StartDate = now.AddDays(-30),
                EndDate = now.AddDays(30),
                Status = "Active",
                Priority = "Urgent",
                Budget = 75000,
                ActualCost = 64500,
                PrimaryChannel = "Google Search",
                Channels = "Google Search,Call Extensions",
                TargetGrades = "Grade 9,Grade 10,Grade 11 Science",
                TargetGeography = "City-wide within 10 km",
                TargetPinCodes = "560001,560038,560066,560075",
                Impressions = 68000,
                Clicks = 4900,
                ExpectedLeads = 240,
                ActualLeads = 265,
                ExpectedQualified = 180,
                ActualQualified = 195,
                ExpectedVisits = 90,
                ActualVisits = 102,
                ExpectedApplications = 65,
                ActualApplications = 71,
                ExpectedEnrollments = 40,
                ActualEnrollments = 44,
                UtmSource = "google",
                UtmMedium = "cpc",
                UtmCampaign = "cbse_search_core",
                IsAiGenerated = false,
                AiConfidenceScore = 0.89,
                AiStrategySummary = "Targeting high-intent parents searching for top secondary schools with direct scholarship exam registration landing page.",
                AiDiagnosisSummary = "Steady high-quality pipeline; Cost per enrollment is ₹1,465, well below benchmark ceiling of ₹2,500.",
                Owner = "Ananya Sharma",
                CreatedAt = now.AddDays(-31)
            },
            new Campaign
            {
                Name = "Pre-Primary Open House & Discovery Morning",
                Type = "Hybrid",
                Objective = "OpenHouse",
                SchoolName = "Delhi International School",
                CampusName = "North Campus",
                AcademicSession = "2026–2027",
                TargetAdmissionCycle = "Cycle 1 (April 2026)",
                StartDate = now.AddDays(5),
                EndDate = now.AddDays(25),
                Status = "Scheduled",
                Priority = "Medium",
                Budget = 35000,
                ActualCost = 8500,
                PrimaryChannel = "WhatsApp",
                Channels = "WhatsApp,Email,Instagram",
                TargetGrades = "Playgroup,Nursery,LKG",
                TargetGeography = "North Campus 4 km perimeter",
                TargetPinCodes = "560024,560092",
                Impressions = 32000,
                Clicks = 1850,
                ExpectedLeads = 180,
                ActualLeads = 74,
                ExpectedQualified = 120,
                ActualQualified = 56,
                ExpectedVisits = 80,
                ActualVisits = 12,
                ExpectedApplications = 45,
                ActualApplications = 4,
                ExpectedEnrollments = 25,
                ActualEnrollments = 2,
                UtmSource = "whatsapp",
                UtmMedium = "direct",
                UtmCampaign = "openhouse_north_mar",
                IsAiGenerated = true,
                AiConfidenceScore = 0.87,
                AiStrategySummary = "Personalized interactive WhatsApp invites with child's name placeholder and one-click RSVP confirmation.",
                AiDiagnosisSummary = "Early phase - registrations pacing 15% ahead of target for upcoming Saturday.",
                Owner = "Priya Nair",
                CreatedAt = now.AddDays(-4)
            },
            new Campaign
            {
                Name = "Grade 11 Merit Scholarship & JEE/NEET Career Seminar",
                Type = "Digital",
                Objective = "ScholarshipPromotion",
                SchoolName = "Delhi International School",
                CampusName = "Main Campus",
                AcademicSession = "2026–2027",
                TargetAdmissionCycle = "Cycle 1 (April 2026)",
                StartDate = now.AddDays(-45),
                EndDate = now.AddDays(-5),
                Status = "Completed",
                Priority = "High",
                Budget = 40000,
                ActualCost = 39800,
                PrimaryChannel = "YouTube",
                Channels = "YouTube,Instagram,SMS",
                TargetGrades = "Grade 10 Moving to 11",
                TargetGeography = "Greater Metro Area",
                TargetPinCodes = "560001,560025,560038,560047",
                Impressions = 95000,
                Clicks = 3800,
                ExpectedLeads = 220,
                ActualLeads = 248,
                ExpectedQualified = 160,
                ActualQualified = 175,
                ExpectedVisits = 85,
                ActualVisits = 92,
                ExpectedApplications = 60,
                ActualApplications = 64,
                ExpectedEnrollments = 30,
                ActualEnrollments = 34,
                UtmSource = "youtube",
                UtmMedium = "video_ad",
                UtmCampaign = "merit_scholarship_g11",
                IsAiGenerated = true,
                AiConfidenceScore = 0.91,
                AiStrategySummary = "Alumni success stories spotlighting top rankers and integrated coaching infrastructure.",
                AiDiagnosisSummary = "Completed successfully. 34 confirmed enrollments at ₹1,170 CAC per student.",
                Owner = "Vikram Malhotra",
                CreatedAt = now.AddDays(-46)
            },
            new Campaign
            {
                Name = "Mall Kiosk & Interactive Curiosity Booth",
                Type = "Offline",
                Objective = "LeadGeneration",
                SchoolName = "Delhi International School",
                CampusName = "Main Campus",
                AcademicSession = "2026–2027",
                TargetAdmissionCycle = "Cycle 1 (April 2026)",
                StartDate = now.AddDays(-10),
                EndDate = now.AddDays(20),
                Status = "Paused",
                Priority = "Low",
                Budget = 45000,
                ActualCost = 28000,
                PrimaryChannel = "Mall Kiosk",
                Channels = "Mall Kiosk,QR Code",
                TargetGrades = "All Grades",
                TargetGeography = "Phoenix Marketcity Mall (7 km)",
                TargetPinCodes = "560048",
                Impressions = 55000,
                Clicks = 1200,
                ExpectedLeads = 150,
                ActualLeads = 110,
                ExpectedQualified = 90,
                ActualQualified = 38,
                ExpectedVisits = 40,
                ActualVisits = 14,
                ExpectedApplications = 20,
                ActualApplications = 6,
                ExpectedEnrollments = 12,
                ActualEnrollments = 3,
                QrCodeKey = "QR-MALL-PHOENIX",
                IsAiGenerated = false,
                AiConfidenceScore = 0.74,
                AiStrategySummary = "Weekend shopping center interactive science puzzles with prize tickets and brochure handouts.",
                AiDiagnosisSummary = "High footfall but poor qualification rate (34.5% vs 65% benchmark). Leads are predominantly non-residential or outside transport zones.",
                Owner = "Ananya Sharma",
                CreatedAt = now.AddDays(-12)
            }
        };

        _context.Campaigns.AddRange(campaigns);
        await _context.SaveChangesAsync();
    }
}

public class StatusUpdateDto
{
    public string Status { get; set; } = string.Empty;
}
