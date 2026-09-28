using MySchoolAdmissions.MarketingService.Data;
using MySchoolAdmissions.MarketingService.Models;
using MySchoolAdmissions.MarketingService.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace MySchoolAdmissions.MarketingService.Controllers;

[ApiController]
[Route("api/campaigns/intelligence")]
public class CampaignIntelligenceController : ControllerBase
{
    private readonly MarketingDbContext _context;

    public CampaignIntelligenceController(MarketingDbContext context)
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

    private bool CanAccessCampaign(Campaign campaign)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (isSuperAdmin) return true;
        if (!userInstitutionId.HasValue) return false;
        var campaignInstitutionId = campaign.InstitutionId ?? MarketingDbSeeder.DisInstitutionId;
        return campaignInstitutionId == userInstitutionId.Value;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetDashboardSummary([FromQuery] string? schoolName, [FromQuery] string? session, [FromQuery] Guid? institutionId)
    {
        // Ensure initial campaigns exist for both tenants
        await MarketingDbSeeder.SeedAsync(_context);

        var query = _context.Campaigns.AsQueryable();
        var selectedInstitutionId = GetSelectedInstitutionId(institutionId);
        if (!selectedInstitutionId.HasValue && !GetUserContext().isSuperAdmin)
            return Forbid();

        if (selectedInstitutionId.HasValue) 
            query = query.Where(c => c.InstitutionId == selectedInstitutionId.Value);

        if (!string.IsNullOrWhiteSpace(schoolName))
            query = query.Where(c => c.SchoolName.ToLower() == schoolName.ToLower());
        if (!string.IsNullOrWhiteSpace(session))
            query = query.Where(c => c.AcademicSession == session);

        var campaigns = await query.ToListAsync();

        var totalBudget = campaigns.Sum(c => c.Budget);
        var totalSpend = campaigns.Sum(c => c.ActualCost);
        var impressions = campaigns.Sum(c => (long)c.Impressions);
        var clicks = campaigns.Sum(c => (long)c.Clicks);
        var leads = campaigns.Sum(c => c.ActualLeads);
        var qualified = campaigns.Sum(c => c.ActualQualified);
        var visits = campaigns.Sum(c => c.ActualVisits);
        var applications = campaigns.Sum(c => c.ActualApplications);
        var enrollments = campaigns.Sum(c => c.ActualEnrollments);

        var cpl = leads > 0 ? Math.Round(totalSpend / leads, 2) : 0;
        var cpv = visits > 0 ? Math.Round(totalSpend / visits, 2) : 0;
        var cpa = applications > 0 ? Math.Round(totalSpend / applications, 2) : 0;
        var cpe = enrollments > 0 ? Math.Round(totalSpend / enrollments, 2) : 0;

        // Estimated revenue: average annual fee of ₹1,40,000 per enrollment
        var estimatedRevenue = enrollments * 140000m;
        var marketingRoi = totalSpend > 0 ? Math.Round(((estimatedRevenue - totalSpend) / totalSpend) * 100, 1) : 0;

        // Funnel Step Rates
        var impToClick = impressions > 0 ? Math.Round(((double)clicks / impressions) * 100, 2) : 0;
        var clickToLead = clicks > 0 ? Math.Round(((double)leads / clicks) * 100, 2) : 0;
        var leadToQual = leads > 0 ? Math.Round(((double)qualified / leads) * 100, 1) : 0;
        var qualToVisit = qualified > 0 ? Math.Round(((double)visits / qualified) * 100, 1) : 0;
        var visitToApp = visits > 0 ? Math.Round(((double)applications / visits) * 100, 1) : 0;
        var appToEnroll = applications > 0 ? Math.Round(((double)enrollments / applications) * 100, 1) : 0;
        var overallConv = leads > 0 ? Math.Round(((double)enrollments / leads) * 100, 2) : 0;

        var alerts = new List<CampaignAlertDto>
        {
            new CampaignAlertDto
            {
                Id = "ALT-01",
                Severity = "Warning",
                Title = "Mall Kiosk Campaign Underperforming in Conversion",
                Description = "Phoenix Marketcity Kiosk is delivering only 34.5% qualified leads (target is 65%). CAC is currently ₹9,333 vs ₹1,400 benchmark.",
                RecommendedAction = "Pause mall kiosk campaign and shift ₹20,000 budget to high-converting Gated Community Showcase."
            },
            new CampaignAlertDto
            {
                Id = "ALT-02",
                Severity = "Opportunity",
                Title = "Gated Community Society Event Conversion High (24.8%)",
                Description = "Prestige Ozone society booth generated 36 enrollments at ₹1,166 CAC. Similar society clusters identified in Sector 14.",
                RecommendedAction = "Deploy 2 additional weekend society activations in Palm Meadows and Silver County."
            },
            new CampaignAlertDto
            {
                Id = "ALT-03",
                Severity = "Critical",
                Title = "Counselor First-Touch Latency Spike",
                Description = "Leads contacted after 3 hours have a 48% lower campus visit show-up rate than leads contacted within 30 minutes.",
                RecommendedAction = "Enable auto-assigned WhatsApp instant welcome brochure within 2 minutes of form submission."
            }
        };

        var channelHighlights = GetDefaultChannelPerformance();

        var dashboard = new CampaignDashboardDto
        {
            TotalCampaigns = campaigns.Count,
            ActiveCampaigns = campaigns.Count(c => c.Status == "Active"),
            ScheduledCampaigns = campaigns.Count(c => c.Status == "Scheduled"),
            CompletedCampaigns = campaigns.Count(c => c.Status == "Completed"),
            
            TotalImpressions = impressions,
            TotalClicks = clicks,
            TotalLeads = leads,
            TotalQualifiedLeads = qualified,
            TotalVisits = visits,
            TotalApplications = applications,
            TotalEnrollments = enrollments,

            TotalBudget = totalBudget,
            TotalSpend = totalSpend,
            CostPerLead = cpl,
            CostPerVisit = cpv,
            CostPerApplication = cpa,
            CostPerEnrollment = cpe,
            MarketingRoi = marketingRoi,

            LeadGrowthPercentage = 34.2,
            VisitGrowthPercentage = 28.5,
            EnrollmentGrowthPercentage = 41.0,
            CplEfficiencyPercentage = -18.4, // 18.4% reduction in CPL (cheaper leads)

            ImpressionToClickRate = impToClick,
            ClickToLeadRate = clickToLead,
            LeadToQualifiedRate = leadToQual,
            QualifiedToVisitRate = qualToVisit,
            VisitToApplicationRate = visitToApp,
            ApplicationToEnrollmentRate = appToEnroll,
            OverallConversionRate = overallConv,

            UrgentAlerts = alerts,
            ChannelHighlights = channelHighlights
        };

        return Ok(dashboard);
    }

    [HttpGet("recommendations")]
    public async Task<IActionResult> GetRecommendations()
    {
        var recommendations = await _context.Recommendations.ToListAsync();
        if (!recommendations.Any())
        {
            recommendations = GetDefaultRecommendations();
            _context.Recommendations.AddRange(recommendations);
            await _context.SaveChangesAsync();
        }

        return Ok(recommendations.OrderByDescending(r => r.ConfidenceLevel));
    }

    [HttpPost("recommendations/{id}/action")]
    public async Task<IActionResult> ActionRecommendation(Guid id, [FromBody] RecommendationActionDto dto)
    {
        var rec = await _context.Recommendations.FindAsync(id);
        if (rec == null) return NotFound();

        rec.Status = dto.Action; // "Adopted" or "Dismissed"
        
        // Log to audit
        _context.AuditLogs.Add(new CampaignAuditLog
        {
            ActionType = "Recommendation" + dto.Action,
            PerformedBy = dto.PerformedBy ?? "Marketing Admin",
            Details = $"Recommendation '{rec.Title}' was marked as {dto.Action}.",
            Reason = dto.Reason ?? "Actioned from Campaign Intelligence Dashboard",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return Ok(rec);
    }

    [HttpPost("generate")]
    public IActionResult GenerateAiCampaign([FromBody] CreateAiCampaignRequestDto req)
    {
        var gradeContext = string.IsNullOrWhiteSpace(req.TargetGrades) ? "Pre-Primary & Primary" : req.TargetGrades;
        var geoContext = string.IsNullOrWhiteSpace(req.TargetGeography) ? "0-5 km surrounding campus" : req.TargetGeography;

        var result = new AiCampaignResultDto
        {
            CampaignName = $"{req.SchoolName} — {gradeContext} Admissions Campaign 2026-27",
            Objective = req.Objective,
            TargetAudienceProfile = $"Parents aged 27-42 residing in {geoContext} seeking holistic CBSE/Cambridge curriculum, advanced STEM & safety for {gradeContext}.",
            RecommendedChannels = req.PreferredChannels,
            RecommendedBudget = req.Budget,
            ExpectedLeads = (int)Math.Round(req.Budget / 160m),
            ExpectedVisits = (int)Math.Round((req.Budget / 160m) * 0.42m),
            ExpectedEnrollments = (int)Math.Round((req.Budget / 160m) * 0.16m),
            ConfidenceScore = 0.93,
            StrategySummary = $"Multi-stage hyper-local campaign combining Meta high-resonance parent videos, instant WhatsApp brochure triggers, and weekend Experiential Campus Walk invitations with {req.SpecialOffer}.",

            Headline = $"Give Your Child the Ideal Academic Foundation at {req.SchoolName}",
            PrimaryText = $"Admissions open for Academic Year {req.AcademicSession} ({gradeContext}). Experience our world-class robotics labs, Olympic sports facilities, and personalized mentorship. Book your family campus tour today and receive: {req.SpecialOffer}.",
            CallToAction = "Schedule Campus Tour & Apply",

            WhatsAppCopy = $"Hello [Parent Name]! 👋 Thank you for considering {req.SchoolName} for your child's education for {req.AcademicSession}.\n\n🏫 We would love to invite your family for an exclusive Campus Discovery Walk this Saturday. Your child can participate in our interactive curiosity lab while you meet the Principal.\n\n🎁 Exclusive: {req.SpecialOffer}\n\n👉 Reply 'YES' to confirm your preferred time slot or visit: [Direct Link]",

            SmsCopy = $"{req.SchoolName}: Admissions open for {gradeContext} ({req.AcademicSession}). Avail {req.SpecialOffer}. Book campus visit: [Link] or Call 080-4920-1100.",

            EmailSubject = $"Admissions Open {req.AcademicSession} — Tour {req.SchoolName} This Saturday",
            EmailBody = $"Dear Parent,\n\nChoosing the right school is one of the most critical decisions you make for your child's future.\n\nAt {req.SchoolName}, our holistic pedagogy balances academic rigor with sports, robotics, and creative arts.\n\nWe warmly invite you and your child to our upcoming Campus Discovery Day.\n\nWhat to expect:\n• Interactive classroom walkthrough\n• 1-on-1 interaction with School Leadership\n• Diagnostic assessment & career counselling\n• Special Benefit: {req.SpecialOffer}\n\nClick below to reserve your priority slot:\n[Reserve Campus Visit Slot]\n\nWarm regards,\nAdmissions Committee\n{req.SchoolName}",

            FacebookAdCopy = $"⭐ Empowering young minds for tomorrow's world. Admissions Open for {req.AcademicSession} at {req.SchoolName} ({gradeContext}).\n\n✨ 100% Board Pass Rate & Top College Placements\n✨ AI & STEM Innovation Centers\n✨ Safe GPS-enabled Transport & Nutritious Cafeteria\n\nLimited seats per batch. Claim {req.SpecialOffer} when you schedule a visit today!\n\n👇 Tap 'Learn More' to book your family visit.",

            GoogleHeadline1 = $"Top CBSE School Near You | {req.SchoolName}",
            GoogleHeadline2 = $"Admissions Open {req.AcademicSession} - Apply Today",
            GoogleDescription = $"Rated #1 for Academic Excellence & Holistic Growth. Book a personalized campus tour. {req.SpecialOffer}.",

            CounselorFollowupScript = $"\"Good morning [Parent Name], this is [Counselor Name] from {req.SchoolName}. I noticed you registered your interest for {gradeContext} admission for {req.AcademicSession}. We are currently hosting personalized weekend campus discovery sessions where parents meet the Academic Director and explore our innovation labs. I have an open slot this Saturday at 10:30 AM or Sunday at 11:00 AM—which day works better for your family?\""
        };

        return Ok(result);
    }

    [HttpGet("ideas")]
    public IActionResult GetCampaignIdeas()
    {
        var ideas = new List<CampaignIdeaDto>
        {
            new CampaignIdeaDto
            {
                IdeaTitle = "Apartment Society Robot-Making & Science Weekend",
                Objective = "CampusVisits",
                TargetAudience = "Parents of Grade 3-7 students in high-density gated societies",
                RecommendedChannel = "Society Event + WhatsApp",
                TargetGeography = "Sector 14 & Outer Ring Road (15 high-density complexes)",
                DurationDays = 14,
                EstimatedBudget = 45000,
                ExpectedLeads = 160,
                ExpectedVisits = 95,
                ExpectedEnrollments = 38,
                ReasonForRecommendation = "Historical society activations show a 24.8% lead-to-enrollment rate with 62% lower CAC than broad digital ads.",
                HistoricalEvidence = "Prestige Ozone event achieved 36 enrollments at ₹1,166 per enrollment.",
                ConfidenceLevel = 0.94
            },
            new CampaignIdeaDto
            {
                IdeaTitle = "WhatsApp 'Parent Guide to Pre-Primary Transition'",
                Objective = "LeadGeneration",
                TargetAudience = "First-time parents looking for Nursery & Kindergarten",
                RecommendedChannel = "Meta Lead Ads -> Instant WhatsApp PDF Guide",
                TargetGeography = "0-4 km school catchment area",
                DurationDays = 21,
                EstimatedBudget = 25000,
                ExpectedLeads = 280,
                ExpectedVisits = 85,
                ExpectedEnrollments = 26,
                ReasonForRecommendation = "Pre-primary admissions have the longest parent research cycle. Providing value-first educational guidance builds early school trust.",
                HistoricalEvidence = "Lead-to-qualified rate increases from 48% to 74% when parents receive a helpful educational PDF immediately.",
                ConfidenceLevel = 0.89
            },
            new CampaignIdeaDto
            {
                IdeaTitle = "Grade 11 Stream Selection Masterclass & Merit Test",
                Objective = "ScholarshipPromotion",
                TargetAudience = "Grade 10 board exam appearing students & ambitious parents",
                RecommendedChannel = "Google Search + YouTube + Direct School Tie-ups",
                TargetGeography = "5-10 km radius covering secondary feeder schools",
                DurationDays = 30,
                EstimatedBudget = 50000,
                ExpectedLeads = 240,
                ExpectedVisits = 110,
                ExpectedEnrollments = 42,
                ReasonForRecommendation = "High-ticket science/commerce senior school admissions decide based on integrated competitive exam coaching and scholarship awards.",
                HistoricalEvidence = "Last cycle's STEM scholarship test yielded 34 enrollments with average annual fee value of ₹1,65,000.",
                ConfidenceLevel = 0.91
            },
            new CampaignIdeaDto
            {
                IdeaTitle = "Current Parent Referral Loyalty Privilege Program",
                Objective = "Enrollment",
                TargetAudience = "Satisfied existing parents of Grade 1-8 students",
                RecommendedChannel = "Email + Parent App Notification + Personal Counselor Call",
                TargetGeography = "Current bus route pin codes",
                DurationDays = 45,
                EstimatedBudget = 15000,
                ExpectedLeads = 90,
                ExpectedVisits = 68,
                ExpectedEnrollments = 45,
                ReasonForRecommendation = "Referral leads convert at 50% from visit to admission with near-zero media cost. ₹5,000 fee credit voucher for both families is cost-effective.",
                HistoricalEvidence = "Referral admissions historically have the highest 5-year student retention rate (96%).",
                ConfidenceLevel = 0.96
            }
        };

        return Ok(ideas);
    }

    [HttpGet("diagnosis/{id}")]
    public async Task<IActionResult> GetCampaignDiagnosis(Guid id)
    {
        var campaign = await _context.Campaigns.FindAsync(id);
        if (campaign == null) return NotFound();
        if (!CanAccessCampaign(campaign)) return Forbid();

        var diagnosis = new CampaignDiagnosisDto
        {
            CampaignId = campaign.Id,
            CampaignName = campaign.Name,
            OverallAssessment = campaign.ActualEnrollments >= campaign.ExpectedEnrollments
                ? "Outperforming Expectations: The campaign is running with superior audience resonance and healthy funnel velocity."
                : "Funnel Bottleneck Detected: While initial reach is adequate, a leak exists between Qualified Leads and Campus Visits.",
            WhatWorked = new List<string>
            {
                "Video testimonial featuring existing Grade 2 parents generated 4.2% Click-Through-Rate (vs industry benchmark 1.8%).",
                "Targeting localized radius (0-5 km) kept Cost Per Lead at ₹120, 35% lower than city-wide campaigns.",
                "WhatsApp instant auto-responder increased phone response rate by 22%."
            },
            WhatDidNotWork = new List<string>
            {
                "Weekday campus visit slots had a 52% no-show rate among working IT parents.",
                "Ad creative copy lacked explicit mention of transport/bus route coverage for Outer Ring Road.",
                "Mobile landing page load time on 4G networks was 3.4 seconds, causing a 14% drop-off before form completion."
            },
            AudienceDiagnosis = "Parent persona 28-36 in tech sectors demonstrated highest intent. Audience saturation reached 42% in PIN code 560038.",
            CreativeDiagnosis = "Short 15-second campus life reels outperformed static banner graphics by 3.1x in conversion.",
            ChannelDiagnosis = $"{campaign.PrimaryChannel} delivered highest volume, but Society Offline activations yielded 2.4x higher final enrollment rate.",
            GeographyDiagnosis = "Strongest conversions from PIN codes within 4 km of Main Campus. Leads beyond 7 km had 85% drop-out due to commute concerns.",
            TimingDiagnosis = "Best ad engagement observed Sunday 8 PM - 10 PM and Tuesday 1 PM - 3 PM.",
            CounselorFollowupDiagnosis = "First-call response time averaged 4.2 hours. Campaigns where counselors called within 30 minutes achieved 64% visit confirmation.",
            RecommendedActions = new List<string>
            {
                "Shift 40% of visit slots exclusively to Saturday & Sunday mornings (9:30 AM to 1:00 PM).",
                "Add an interactive bus route lookup tool directly on the campaign registration landing page.",
                "Implement instant automated WhatsApp confirmation message with calendar invite and Google Maps location pin.",
                "Reallocate ₹15,000 from underperforming broad audience ad sets to retargeting parents who viewed >50% of the video."
            }
        };

        return Ok(diagnosis);
    }

    [HttpPost("copilot")]
    public IActionResult AskCopilot([FromBody] CampaignCopilotRequestDto req)
    {
        var q = req.Query.ToLower();
        var response = new CampaignCopilotResponseDto();

        if (q.Contains("roi") || q.Contains("highest return") || q.Contains("profitable"))
        {
            response.Answer = "**Apartment Society Showcases** and **Existing Parent Referrals** produced the highest ROI in the current admission cycle. While digital ads generate the highest raw lead volume (730+ leads), Society Activations produced a **24.8% Lead-to-Enrollment rate** at an effective Cost Per Enrollment of **₹1,166**, compared to ₹1,465 for Google Search and ₹2,400 for Facebook/Instagram.";
            response.DataPointsCited = new List<string>
            {
                "Prestige Ozone & Palm Meadows Society Event: 36 Enrollments at ₹1,166 CAC",
                "Google CBSE High Intent Search: 44 Enrollments at ₹1,465 CAC",
                "Total Admissions Revenue: ₹2.05 Cr against ₹2.17 Lakh marketing spend (94.4x Return)"
            };
            response.SuggestedFollowups = new List<string>
            {
                "Which apartment societies should we target next weekend?",
                "What is the average Cost Per Lead across all digital channels?",
                "How can we reduce our Facebook ad CAC?"
            };
            response.ActionableButtonText = "View Channel ROI Comparison";
            response.ActionableRoute = "/campaigns?tab=channels";
        }
        else if (q.Contains("grade 11") || q.Contains("science") || q.Contains("senior"))
        {
            response.Answer = "For **Grade 11 Science & Commerce**, the **Google Search High-Intent ('Best CBSE Schools Near Me')** and **YouTube STEM Scholarship Seminar** campaigns yielded the strongest conversion. Together they brought in **78 confirmed Grade 11 enrollments** with an average visit-to-application conversion of 69%.";
            response.DataPointsCited = new List<string>
            {
                "Grade 11 Merit Scholarship YouTube Campaign: 248 Leads, 34 Enrollments",
                "Google Search Secondary Wing: 265 Leads, 44 Enrollments",
                "Key Parent Decision Factor: Integrated JEE/NEET faculty track record"
            };
            response.SuggestedFollowups = new List<string>
            {
                "Generate an ad copy for Grade 11 STEM Scholarship",
                "Which PIN codes produce the most Grade 11 enrollments?",
                "Compare Pre-Primary vs Senior Wing marketing cost"
            };
            response.ActionableButtonText = "Generate Grade 11 AI Campaign";
            response.ActionableRoute = "/campaigns?action=generate&grade=Grade11";
        }
        else if (q.Contains("pin code") || q.Contains("locality") || q.Contains("area") || q.Contains("geography"))
        {
            response.Answer = "Top performing geographic clusters are **PIN Code 560066 (Whitefield / Prestige Ozone)** and **560038 (Indiranagar / Sector 14)**, contributing **58% of all confirmed admissions**. Leads originating within 0-5 km convert at **22.4%**, while leads beyond 7 km convert at only **4.1%** primarily due to school bus commute duration.";
            response.DataPointsCited = new List<string>
            {
                "PIN 560066: 36 Enrollments, Cost/Enrollment ₹1,166",
                "PIN 560038: 31 Enrollments, Cost/Enrollment ₹1,238",
                "Commute Threshold: Drop-off accelerates sharply beyond 35 minutes bus travel"
            };
            response.SuggestedFollowups = new List<string>
            {
                "Show full PIN code breakdown",
                "Should we launch a targeted campaign for PIN 560048?",
                "What bus routes have spare capacity for new students?"
            };
            response.ActionableButtonText = "Open Geography Intelligence";
            response.ActionableRoute = "/campaigns?tab=geography";
        }
        else if (q.Contains("leak") || q.Contains("bottleneck") || q.Contains("drop") || q.Contains("counselor"))
        {
            response.Answer = "The single largest funnel leakage point is the transition from **Qualified Leads (616) to Campus Visits (302)**, where 51% of interested parents do not attend their booked tour. Data indicates:\n1. Weekday tours suffer a 54% no-show rate.\n2. When counselors contact leads within **30 minutes**, show-up rate increases to **72%**.\n3. Automatic WhatsApp reminders 24h and 2h prior reduce no-shows by **31%**.";
            response.DataPointsCited = new List<string>
            {
                "Qualified-to-Visit rate: 49.0% (Target is 65%)",
                "Average counselor response latency: 3.8 hours",
                "Weekend vs Weekday show-up ratio: 2.3 to 1"
            };
            response.SuggestedFollowups = new List<string>
            {
                "How can we automate instant WhatsApp visit scheduling?",
                "Show counselor followup performance by agent",
                "Create a weekend Open House campaign"
            };
            response.ActionableButtonText = "View Funnel Attribution";
            response.ActionableRoute = "/campaigns?tab=attribution";
        }
        else
        {
            response.Answer = $"Based on analysis of 6 active and historical campaigns for {req.SchoolFilter ?? "Delhi International School"} (Session {req.SessionFilter ?? "2026–2027"}), overall marketing efficiency is strong with **147 confirmed admissions** generated from ₹2.17 Lakh spend (**₹1,476 Cost Per Admission**). Key driver of performance is hyper-local proximity and omnichannel WhatsApp nurturing.";
            response.DataPointsCited = new List<string>
            {
                "Total Inquiries: 1,162 Leads across 6 campaigns",
                "Campus Visits Hosted: 302 families",
                "Average Lead-to-Enrollment: 12.6% (Top quartile school SaaS benchmark: 9-11%)"
            };
            response.SuggestedFollowups = new List<string>
            {
                "Which campaign produced the highest ROI?",
                "What are our top performing PIN codes?",
                "Why did the Mall Kiosk campaign underperform?"
            };
            response.ActionableButtonText = "Explore AI Recommendations";
            response.ActionableRoute = "/campaigns?tab=recommendations";
        }

        return Ok(response);
    }

    [HttpGet("geography")]
    public IActionResult GetGeographyPerformance()
    {
        var geos = new List<GeographyPerformanceDto>
        {
            new GeographyPerformanceDto
            {
                PinCode = "560066",
                Locality = "Whitefield / Prestige Ozone",
                DistanceBracket = "0–4 km",
                Leads = 245,
                Visits = 112,
                Enrollments = 48,
                TotalSpend = 56000,
                CostPerEnrollment = 1166,
                VisitConversionRate = 45.7,
                EnrollmentConversionRate = 19.6
            },
            new GeographyPerformanceDto
            {
                PinCode = "560038",
                Locality = "Indiranagar / Sector 14",
                DistanceBracket = "1–5 km",
                Leads = 320,
                Visits = 124,
                Enrollments = 42,
                TotalSpend = 52000,
                CostPerEnrollment = 1238,
                VisitConversionRate = 38.7,
                EnrollmentConversionRate = 13.1
            },
            new GeographyPerformanceDto
            {
                PinCode = "560008",
                Locality = "Halasuru / Defense Colony",
                DistanceBracket = "3–6 km",
                Leads = 185,
                Visits = 64,
                Enrollments = 26,
                TotalSpend = 36000,
                CostPerEnrollment = 1384,
                VisitConversionRate = 34.6,
                EnrollmentConversionRate = 14.0
            },
            new GeographyPerformanceDto
            {
                PinCode = "560075",
                Locality = "Kaggadasapura / CV Raman Nagar",
                DistanceBracket = "4–7 km",
                Leads = 192,
                Visits = 58,
                Enrollments = 21,
                TotalSpend = 34000,
                CostPerEnrollment = 1619,
                VisitConversionRate = 30.2,
                EnrollmentConversionRate = 10.9
            },
            new GeographyPerformanceDto
            {
                PinCode = "560048",
                Locality = "Mahadevapura / Phoenix Perimeter",
                DistanceBracket = "7–10 km",
                Leads = 150,
                Visits = 24,
                Enrollments = 8,
                TotalSpend = 32000,
                CostPerEnrollment = 4000,
                VisitConversionRate = 16.0,
                EnrollmentConversionRate = 5.3
            },
            new GeographyPerformanceDto
            {
                PinCode = "560001",
                Locality = "MG Road / Central Core",
                DistanceBracket = "6–9 km",
                Leads = 70,
                Visits = 14,
                Enrollments = 2,
                TotalSpend = 18000,
                CostPerEnrollment = 9000,
                VisitConversionRate = 20.0,
                EnrollmentConversionRate = 2.8
            }
        };

        return Ok(geos);
    }

    [HttpGet("channels")]
    public IActionResult GetChannelsPerformance()
    {
        return Ok(GetDefaultChannelPerformance());
    }

    [HttpGet("learnings")]
    public async Task<IActionResult> GetLearnings()
    {
        var learnings = await _context.Learnings.ToListAsync();
        if (!learnings.Any())
        {
            learnings = GetDefaultLearnings();
            _context.Learnings.AddRange(learnings);
            await _context.SaveChangesAsync();
        }

        return Ok(learnings.OrderByDescending(l => l.LoggedAt));
    }

    [HttpPost("learnings")]
    public async Task<IActionResult> CreateLearning([FromBody] CampaignLearning learning)
    {
        learning.Id = Guid.NewGuid();
        learning.LoggedAt = DateTime.UtcNow;
        _context.Learnings.Add(learning);
        await _context.SaveChangesAsync();
        return Ok(learning);
    }

    [HttpGet("qrcodes")]
    public async Task<IActionResult> GetQrCodes([FromQuery] Guid? institutionId)
    {
        var selectedInstitutionId = GetSelectedInstitutionId(institutionId);
        if (!selectedInstitutionId.HasValue && !GetUserContext().isSuperAdmin) return Forbid();
        var qrs = await _context.QrCodes.ToListAsync();
        if (!qrs.Any())
        {
            qrs = GetDefaultQrCodes();
            _context.QrCodes.AddRange(qrs);
            await _context.SaveChangesAsync();
        }
        else
        {
            // Sanitize legacy or missing instId in URLs
            bool changed = false;
            var disId = "fc49d553-b44f-4c4c-96ad-4bf599016c01";
            var svisId = "a48d7782-dda9-42ad-b21a-046d517f1ce5";
            foreach (var qr in qrs)
            {
                if (string.IsNullOrEmpty(qr.DestinationUrl) || qr.DestinationUrl.Contains("admissions.myschool.edu") || !qr.DestinationUrl.Contains("instId="))
                {
                    string targetId = (qr.CodeKey.Contains("OZONE") || qr.CodeKey.Contains("PHOENIX") || qr.CodeKey.Contains("SVIS")) ? svisId : disId;
                    qr.DestinationUrl = $"https://www.myschooladmissions.com/apply?src=qr&code={qr.CodeKey}&instId={targetId}";
                    qr.QrImageUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={Uri.EscapeDataString(qr.DestinationUrl)}";
                    changed = true;
                }
            }

            if (!qrs.Any(q => q.CodeKey == "QR-METRO-DWARKA"))
            {
                var extra = new CampaignQrCode
                {
                    CodeKey = "QR-METRO-DWARKA",
                    Title = "Dwarka Sector 21 Metro Gateway Display",
                    TargetLocation = "Dwarka Sector 21 Metro Station Concourse",
                    ChannelType = "Hoarding",
                    DestinationUrl = $"https://www.myschooladmissions.com/apply?src=qr&code=QR-METRO-DWARKA&instId={disId}",
                    QrImageUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={Uri.EscapeDataString($"https://www.myschooladmissions.com/apply?src=qr&code=QR-METRO-DWARKA&instId={disId}")}",
                    TotalScans = 280,
                    LeadsGenerated = 94,
                    EnrollmentsGenerated = 22,
                    IsActive = true
                };
                _context.QrCodes.Add(extra);
                qrs.Add(extra);
                changed = true;
            }

            if (changed)
            {
                await _context.SaveChangesAsync();
            }
        }

        // Multi-tenant filtering: if institutionId is passed, filter strictly to this institution's QR codes
        if (selectedInstitutionId.HasValue)
        {
            var idStr = $"instId={selectedInstitutionId.Value}".ToLowerInvariant();
            qrs = qrs.Where(q => q.DestinationUrl.ToLowerInvariant().Contains(idStr)).ToList();
        }

        return Ok(qrs);
    }

    [HttpGet("qrcodes/{codeKey}")]
    public async Task<IActionResult> GetQrCodeByKey(string codeKey)
    {
        var selectedInstitutionId = GetSelectedInstitutionId();
        var qr = await _context.QrCodes.FirstOrDefaultAsync(q => q.CodeKey == codeKey);
        if (qr == null)
        {
            var defaultQrs = GetDefaultQrCodes();
            qr = defaultQrs.FirstOrDefault(q => q.CodeKey.Equals(codeKey, StringComparison.OrdinalIgnoreCase));
            if (qr != null)
            {
                _context.QrCodes.Add(qr);
                await _context.SaveChangesAsync();
            }
        }

        if (qr != null)
        {
            var disId = "fc49d553-b44f-4c4c-96ad-4bf599016c01";
            var svisId = "a48d7782-dda9-42ad-b21a-046d517f1ce5";
            if (string.IsNullOrEmpty(qr.DestinationUrl) || qr.DestinationUrl.Contains("admissions.myschool.edu") || !qr.DestinationUrl.Contains("instId="))
            {
                string targetId = (qr.CodeKey.Contains("OZONE") || qr.CodeKey.Contains("PHOENIX") || qr.CodeKey.Contains("SVIS")) ? svisId : disId;
                qr.DestinationUrl = $"https://www.myschooladmissions.com/apply?src=qr&code={qr.CodeKey}&instId={targetId}";
                qr.QrImageUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={Uri.EscapeDataString(qr.DestinationUrl)}";
            }

            if (selectedInstitutionId.HasValue && !qr.DestinationUrl.Contains($"instId={selectedInstitutionId.Value}", StringComparison.OrdinalIgnoreCase))
                return NotFound();
            if (!selectedInstitutionId.HasValue && !GetUserContext().isSuperAdmin) return Forbid();

            qr.TotalScans++;
            try { await _context.SaveChangesAsync(); } catch { }
            return Ok(qr);
        }

        return NotFound();
    }

    [HttpPost("qrcodes")]
    public async Task<IActionResult> CreateQrCode([FromBody] CampaignQrCode qr, [FromQuery] Guid? institutionId)
    {
        var selectedInstitutionId = GetSelectedInstitutionId(institutionId);
        if (!selectedInstitutionId.HasValue && !GetUserContext().isSuperAdmin) return Forbid();
        if (qr.CampaignId.HasValue)
        {
            var campaign = await _context.Campaigns.FindAsync(qr.CampaignId.Value);
            if (campaign == null || !CanAccessCampaign(campaign)) return Forbid();
        }
        qr.Id = Guid.NewGuid();
        qr.CreatedAt = DateTime.UtcNow;
        if (string.IsNullOrWhiteSpace(qr.DestinationUrl))
        {
            var instQuery = selectedInstitutionId.HasValue ? $"&instId={selectedInstitutionId.Value}" : "";
            qr.DestinationUrl = $"https://www.myschooladmissions.com/apply?src=qr&code={qr.CodeKey}{instQuery}";
        }
        else
        {
            qr.DestinationUrl = qr.DestinationUrl.Replace("https://admissions.myschool.edu", "https://www.myschooladmissions.com");
            if (selectedInstitutionId.HasValue && !qr.DestinationUrl.Contains("instId="))
            {
                qr.DestinationUrl += (qr.DestinationUrl.Contains("?") ? "&" : "?") + $"instId={selectedInstitutionId.Value}";
            }
            else if (selectedInstitutionId.HasValue && !qr.DestinationUrl.Contains($"instId={selectedInstitutionId.Value}", StringComparison.OrdinalIgnoreCase))
            {
                return Forbid();
            }
        }
        
        // Generate SVG or data URL preview
        qr.QrImageUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={Uri.EscapeDataString(qr.DestinationUrl)}";

        _context.QrCodes.Add(qr);
        await _context.SaveChangesAsync();
        return Ok(qr);
    }

    [HttpGet("calendar")]
    public IActionResult GetCampaignCalendar()
    {
        var now = DateTime.UtcNow;
        var events = new List<CampaignCalendarEventDto>
        {
            new CampaignCalendarEventDto
            {
                Id = "EVT-1",
                Title = "Meta Early Bird Digital Blitz",
                EventType = "Campaign",
                StartDate = now.AddDays(-20),
                EndDate = now.AddDays(10),
                Channel = "Facebook & Instagram",
                Status = "Active",
                SchoolName = "Delhi International School",
                HasConflict = false
            },
            new CampaignCalendarEventDto
            {
                Id = "EVT-2",
                Title = "Prestige Ozone Society Science Expo",
                EventType = "Campaign",
                StartDate = now.AddDays(-14),
                EndDate = now.AddDays(16),
                Channel = "Society Event",
                Status = "Active",
                SchoolName = "Delhi International School",
                HasConflict = false
            },
            new CampaignCalendarEventDto
            {
                Id = "EVT-3",
                Title = "Pre-Primary Discovery Open House",
                EventType = "OpenHouse",
                StartDate = now.AddDays(5),
                EndDate = now.AddDays(7),
                Channel = "WhatsApp & On-Campus",
                Status = "Scheduled",
                SchoolName = "North Campus",
                HasConflict = false
            },
            new CampaignCalendarEventDto
            {
                Id = "EVT-4",
                Title = "CBSE Board Examination Window (Feeder Schools)",
                EventType = "ExamPeriod",
                StartDate = now.AddDays(12),
                EndDate = now.AddDays(26),
                Channel = "Academic Calendar",
                Status = "Upcoming",
                SchoolName = "All Campuses",
                HasConflict = true,
                ConflictReason = "Overlaps with scheduled Grade 10 to 11 outbound calling blitz. Recommend shifting direct calls until after exams."
            },
            new CampaignCalendarEventDto
            {
                Id = "EVT-5",
                Title = "Early Admission Phase 1 Fee Waiver Deadline",
                EventType = "AdmissionDeadline",
                StartDate = now.AddDays(20),
                EndDate = now.AddDays(20),
                Channel = "All Channels",
                Status = "Scheduled",
                SchoolName = "All Campuses",
                HasConflict = false
            }
        };

        return Ok(events);
    }

    [HttpGet("autopilot/config")]
    public async Task<IActionResult> GetAutopilotConfig()
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        var institutionId = GetSelectedInstitutionId();
        if (!institutionId.HasValue && !isSuperAdmin) return Forbid();
        institutionId ??= MarketingDbSeeder.DisInstitutionId;

        var config = await _context.AutopilotConfigs.FirstOrDefaultAsync(c => c.InstitutionId == institutionId);
        if (config == null)
        {
            config = new CampaignAutopilotConfig
            {
                InstitutionId = institutionId,
                AutopilotLevel = 2, // Level 2: Recommendations with Human 1-Click Approval
                MaxMonthlyBudgetCap = 250000,
                MaxSingleCampaignBudget = 60000,
                RequireHumanApprovalForPublishing = true,
                EmergencyPauseAllActive = false,
                ApprovedChannels = "Facebook,Instagram,Google,WhatsApp,Society",
                LastUpdatedAt = DateTime.UtcNow
            };
            _context.AutopilotConfigs.Add(config);
            await _context.SaveChangesAsync();
        }

        return Ok(config);
    }

    [HttpPut("autopilot/config")]
    public async Task<IActionResult> UpdateAutopilotConfig([FromBody] CampaignAutopilotConfig updated)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        var institutionId = GetSelectedInstitutionId();
        if (!institutionId.HasValue && !isSuperAdmin) return Forbid();
        institutionId ??= MarketingDbSeeder.DisInstitutionId;

        var config = await _context.AutopilotConfigs.FirstOrDefaultAsync(c => c.InstitutionId == institutionId);
        if (config == null)
        {
            config = updated;
            config.InstitutionId = institutionId;
            _context.AutopilotConfigs.Add(config);
        }
        else
        {
            config.AutopilotLevel = updated.AutopilotLevel;
            config.MaxMonthlyBudgetCap = updated.MaxMonthlyBudgetCap;
            config.MaxSingleCampaignBudget = updated.MaxSingleCampaignBudget;
            config.RequireHumanApprovalForPublishing = updated.RequireHumanApprovalForPublishing;
            config.ApprovedChannels = updated.ApprovedChannels;
            config.LastUpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(config);
    }

    [HttpPost("autopilot/pause-all")]
    public async Task<IActionResult> EmergencyPauseAll([FromBody] PauseAllDto dto)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        var institutionId = GetSelectedInstitutionId();
        if (!isSuperAdmin && !institutionId.HasValue) return Forbid();

        var campaignQuery = _context.Campaigns.Where(c => c.Status == "Active");
        if (institutionId.HasValue) campaignQuery = campaignQuery.Where(c => c.InstitutionId == institutionId.Value);
        var activeCampaigns = await campaignQuery.ToListAsync();
        foreach (var c in activeCampaigns)
        {
            c.Status = "Paused";
            c.UpdatedAt = DateTime.UtcNow;
        }

        var config = institutionId.HasValue
            ? await _context.AutopilotConfigs.FirstOrDefaultAsync(c => c.InstitutionId == institutionId.Value)
            : null;
        if (config != null)
        {
            config.EmergencyPauseAllActive = true;
            config.LastUpdatedAt = DateTime.UtcNow;
        }

        _context.AuditLogs.Add(new CampaignAuditLog
        {
            ActionType = "EmergencyPauseAll",
            PerformedBy = dto.PerformedBy ?? "Safety Officer / Admin",
            Details = $"Emergency Kill-Switch triggered. Paused {activeCampaigns.Count} active campaigns.",
            Reason = dto.Reason ?? "Emergency kill-switch activated by user",
            Timestamp = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return Ok(new { success = true, pausedCount = activeCampaigns.Count, message = $"Successfully paused {activeCampaigns.Count} active campaigns." });
    }

    // Helper data generators
    private static List<ChannelPerformanceDto> GetDefaultChannelPerformance()
    {
        return new List<ChannelPerformanceDto>
        {
            new ChannelPerformanceDto
            {
                Channel = "Apartment Society Events",
                Category = "Offline",
                TotalSpend = 42000,
                Leads = 145,
                QualifiedLeads = 122,
                Visits = 84,
                Enrollments = 36,
                CostPerLead = 289.65m,
                CostPerVisit = 500.00m,
                CostPerEnrollment = 1166.67m,
                EnrollmentConversion = 24.8,
                RevenueGenerated = 5040000,
                ReturnOnSpend = 120.0m
            },
            new ChannelPerformanceDto
            {
                Channel = "Google High-Intent Search",
                Category = "Digital",
                TotalSpend = 64500,
                Leads = 265,
                QualifiedLeads = 195,
                Visits = 102,
                Enrollments = 44,
                CostPerLead = 243.40m,
                CostPerVisit = 632.35m,
                CostPerEnrollment = 1465.91m,
                EnrollmentConversion = 16.6,
                RevenueGenerated = 6160000,
                ReturnOnSpend = 95.5m
            },
            new ChannelPerformanceDto
            {
                Channel = "Facebook & Instagram Ads",
                Category = "Digital",
                TotalSpend = 38400,
                Leads = 320,
                QualifiedLeads = 205,
                Visits = 98,
                Enrollments = 31,
                CostPerLead = 120.00m,
                CostPerVisit = 391.84m,
                CostPerEnrollment = 1238.71m,
                EnrollmentConversion = 9.7,
                RevenueGenerated = 4340000,
                ReturnOnSpend = 113.0m
            },
            new ChannelPerformanceDto
            {
                Channel = "YouTube Video & Seminar",
                Category = "Digital",
                TotalSpend = 39800,
                Leads = 248,
                QualifiedLeads = 175,
                Visits = 92,
                Enrollments = 34,
                CostPerLead = 160.48m,
                CostPerVisit = 432.61m,
                CostPerEnrollment = 1170.59m,
                EnrollmentConversion = 13.7,
                RevenueGenerated = 4760000,
                ReturnOnSpend = 119.6m
            },
            new ChannelPerformanceDto
            {
                Channel = "WhatsApp Nurturing & Direct",
                Category = "Digital",
                TotalSpend = 8500,
                Leads = 74,
                QualifiedLeads = 56,
                Visits = 12,
                Enrollments = 2,
                CostPerLead = 114.86m,
                CostPerVisit = 708.33m,
                CostPerEnrollment = 4250.00m,
                EnrollmentConversion = 2.7,
                RevenueGenerated = 280000,
                ReturnOnSpend = 32.9m
            },
            new ChannelPerformanceDto
            {
                Channel = "Mall Interactive Kiosk",
                Category = "Offline",
                TotalSpend = 28000,
                Leads = 110,
                QualifiedLeads = 38,
                Visits = 14,
                Enrollments = 3,
                CostPerLead = 254.55m,
                CostPerVisit = 2000.00m,
                CostPerEnrollment = 9333.33m,
                EnrollmentConversion = 2.7,
                RevenueGenerated = 420000,
                ReturnOnSpend = 15.0m
            }
        };
    }

    private static List<CampaignRecommendation> GetDefaultRecommendations()
    {
        return new List<CampaignRecommendation>
        {
            new CampaignRecommendation
            {
                Title = "Reallocate ₹20,000 from Mall Kiosk to Gated Society Events",
                Category = "ChannelShift",
                Description = "Society activations in Sector 14 deliver 24.8% enrollment conversion at ₹1,166 CAC vs Mall Kiosk at ₹9,333 CAC. Shifting ₹20k will unlock an estimated 14 additional enrollments.",
                SupportingEvidence = "Prestige Ozone event: 36 admissions from ₹42k spend. Mall Kiosk: 3 admissions from ₹28k spend.",
                ConfidenceLevel = 0.94,
                ExpectedImpact = "+14 Confirmed Enrollments (~₹19.6L Revenue)",
                SuggestedBudget = 20000,
                TargetChannel = "Society Event",
                TargetGeography = "Sector 14 / Palm Meadows Complex",
                Status = "Pending"
            },
            new CampaignRecommendation
            {
                Title = "Launch Automated 2-Minute WhatsApp Video Brochure",
                Category = "Optimization",
                Description = "Leads contacted by counselors under 30 minutes convert at 72% for campus tours. Adding automated instant WhatsApp delivery bridges latency during non-working hours.",
                SupportingEvidence = "Historical analysis shows 51% drop-off between lead creation and visit booking when initial contact exceeds 2 hours.",
                ConfidenceLevel = 0.91,
                ExpectedImpact = "+32% Higher Visit Show-up Rate",
                SuggestedBudget = 5000,
                TargetChannel = "WhatsApp",
                TargetGeography = "All Active Catchments",
                Status = "Pending"
            },
            new CampaignRecommendation
            {
                Title = "Target PIN Code 560066 with Grade 1-4 Sibling Referral Campaign",
                Category = "Retargeting",
                Description = "Over 110 existing families in Whitefield have younger siblings approaching Nursery/Grade 1 eligibility. Direct outreach yields near 50% conversion.",
                SupportingEvidence = "Sibling enrollment historically has 98% retention and zero advertising media CAC.",
                ConfidenceLevel = 0.97,
                ExpectedImpact = "+22 Sibling Enrollments",
                SuggestedBudget = 8000,
                TargetChannel = "Parent App & Email",
                TargetGeography = "PIN Code 560066",
                Status = "Pending"
            },
            new CampaignRecommendation
            {
                Title = "Expand Meta Video Ad Budget by 25% for Nursery Intake",
                Category = "BudgetIncrease",
                Description = "Nursery seat occupancy is currently at 68% of capacity with 45 days remaining before Cycle 1 closure. Meta lead costs are currently at seasonal low (₹120 CPL).",
                SupportingEvidence = "Ad set 'Young Moms 28-35' has frequency of only 1.4, indicating ample headroom without ad fatigue.",
                ConfidenceLevel = 0.88,
                ExpectedImpact = "+18 Confirmed Nursery Admissions",
                SuggestedBudget = 15000,
                TargetChannel = "Facebook & Instagram",
                TargetGeography = "0-5 km Radius",
                Status = "Pending"
            }
        };
    }

    private static List<CampaignLearning> GetDefaultLearnings()
    {
        return new List<CampaignLearning>
        {
            new CampaignLearning
            {
                CampaignName = "Prestige Ozone Society Showcase 2026",
                Channel = "Society Event",
                Geography = "PIN 560066",
                TotalSpend = 42000,
                TotalLeads = 145,
                TotalVisits = 84,
                TotalEnrollments = 36,
                CostPerEnrollment = 1166,
                WhatWorked = "Hands-on LEGO robotics booth attracted children while parents engaged with STEM faculty. QR scan for weekend slot booking worked seamlessly.",
                WhatFailed = "Flyers distributed under apartment doors had zero tracked responses compared to personal booth engagement.",
                KeyTakeaway = "Physical presence with experiential activity beats passive paper drops by 10x in gated communities.",
                RecommendedNextAction = "Scale format to 4 additional societies within 3 km of campus."
            },
            new CampaignLearning
            {
                CampaignName = "Mall Kiosk Curiosity Booth 2026",
                Channel = "Mall Kiosk",
                Geography = "PIN 560048",
                TotalSpend = 28000,
                TotalLeads = 110,
                TotalVisits = 14,
                TotalEnrollments = 3,
                CostPerEnrollment = 9333,
                WhatWorked = "High footfall and high enthusiasm for on-the-spot science quiz giveaways.",
                WhatFailed = "Over 65% of parents lived beyond the school's 10 km bus transport boundary, leading to immediate post-qualification drop-off.",
                KeyTakeaway = "Never run mall marketing without a strict geographic screening filter at the moment of lead capture.",
                RecommendedNextAction = "Pause mall kiosk activations unless co-located in neighborhood hyper-local shopping centers."
            },
            new CampaignLearning
            {
                CampaignName = "Meta Video Testimonials Phase 1",
                Channel = "Facebook & Instagram",
                Geography = "Sector 14 & Indiranagar",
                TotalSpend = 38400,
                TotalLeads = 320,
                TotalVisits = 98,
                TotalEnrollments = 31,
                CostPerEnrollment = 1238,
                WhatWorked = "Authentic video of a working mother talking about the school's safe day-care and robotics lab had 3.8x higher CTR than studio photos.",
                WhatFailed = "Carousel ads featuring fee structures without emotional storytelling performed poorly.",
                KeyTakeaway = "Parent peer storytelling out-converts corporate institutional messaging every time.",
                RecommendedNextAction = "Produce 3 new short-form videos featuring Kindergarten and Grade 9 parents."
            }
        };
    }

    private static List<CampaignQrCode> GetDefaultQrCodes()
    {
        var disId = "fc49d553-b44f-4c4c-96ad-4bf599016c01";
        var svisId = "a48d7782-dda9-42ad-b21a-046d517f1ce5";
        return new List<CampaignQrCode>
        {
            new CampaignQrCode
            {
                CodeKey = "QR-SOC-OZONE-26",
                Title = "Prestige Ozone Society Banner & Booth",
                TargetLocation = "Prestige Ozone Club House",
                ChannelType = "Society Event",
                DestinationUrl = $"https://www.myschooladmissions.com/apply?src=qr&code=QR-SOC-OZONE-26&instId={svisId}",
                QrImageUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://www.myschooladmissions.com/apply?src=qr%26code=QR-SOC-OZONE-26%26instId={svisId}",
                TotalScans = 340,
                LeadsGenerated = 145,
                EnrollmentsGenerated = 36,
                IsActive = true
            },
            new CampaignQrCode
            {
                CodeKey = "QR-MALL-PHOENIX",
                Title = "Phoenix Marketcity Curiosity Kiosk",
                TargetLocation = "Phoenix Marketcity Ground Atrium",
                ChannelType = "Mall Kiosk",
                DestinationUrl = $"https://www.myschooladmissions.com/apply?src=qr&code=QR-MALL-PHOENIX&instId={svisId}",
                QrImageUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://www.myschooladmissions.com/apply?src=qr%26code=QR-MALL-PHOENIX%26instId={svisId}",
                TotalScans = 420,
                LeadsGenerated = 110,
                EnrollmentsGenerated = 3,
                IsActive = false
            },
            new CampaignQrCode
            {
                CodeKey = "QR-FLYER-SECTOR14",
                Title = "Sector 14 Residential Standee & Flyer",
                TargetLocation = "Sector 14 Community Park",
                ChannelType = "Flyer",
                DestinationUrl = $"https://www.myschooladmissions.com/apply?src=qr&code=QR-FLYER-SECTOR14&instId={disId}",
                QrImageUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://www.myschooladmissions.com/apply?src=qr%26code=QR-FLYER-SECTOR14%26instId={disId}",
                TotalScans = 195,
                LeadsGenerated = 68,
                EnrollmentsGenerated = 14,
                IsActive = true
            },
            new CampaignQrCode
            {
                CodeKey = "QR-METRO-DWARKA",
                Title = "Dwarka Sector 21 Metro Gateway Display",
                TargetLocation = "Dwarka Sector 21 Metro Station Concourse",
                ChannelType = "Hoarding",
                DestinationUrl = $"https://www.myschooladmissions.com/apply?src=qr&code=QR-METRO-DWARKA&instId={disId}",
                QrImageUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://www.myschooladmissions.com/apply?src=qr%26code=QR-METRO-DWARKA%26instId={disId}",
                TotalScans = 280,
                LeadsGenerated = 94,
                EnrollmentsGenerated = 22,
                IsActive = true
            }
        };
    }
}

public class RecommendationActionDto
{
    public string Action { get; set; } = "Adopted"; // Adopted, Dismissed
    public string? PerformedBy { get; set; }
    public string? Reason { get; set; }
}

public class PauseAllDto
{
    public string? PerformedBy { get; set; }
    public string? Reason { get; set; }
}
