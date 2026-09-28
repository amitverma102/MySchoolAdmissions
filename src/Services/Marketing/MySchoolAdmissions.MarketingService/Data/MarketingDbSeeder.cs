using MySchoolAdmissions.MarketingService.Models;
using Microsoft.EntityFrameworkCore;

namespace MySchoolAdmissions.MarketingService.Data;

public static class MarketingDbSeeder
{
    public static readonly Guid DisInstitutionId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
    public static readonly Guid SvisInstitutionId = Guid.Parse("a48d7782-dda9-42ad-b21a-046d517f1ce5");

    public static async Task SeedAsync(MarketingDbContext context)
    {
        // 1. Backfill any existing campaigns that have null or empty InstitutionId to DIS
        var orphanedCampaigns = await context.Campaigns
            .Where(c => c.InstitutionId == null || c.InstitutionId == Guid.Empty)
            .ToListAsync();

        if (orphanedCampaigns.Any())
        {
            foreach (var c in orphanedCampaigns)
            {
                c.InstitutionId = DisInstitutionId;
                if (string.IsNullOrWhiteSpace(c.SchoolName))
                {
                    c.SchoolName = "Delhi International School";
                }
            }
            await context.SaveChangesAsync();
        }

        // 2. Ensure DIS campaigns exist
        var hasDis = await context.Campaigns.AnyAsync(c => c.InstitutionId == DisInstitutionId);
        if (!hasDis)
        {
            context.Campaigns.AddRange(GetDisCampaigns(DisInstitutionId));
            await context.SaveChangesAsync();
        }

        // 3. Ensure SVIS campaigns exist
        var hasSvis = await context.Campaigns.AnyAsync(c => c.InstitutionId == SvisInstitutionId);
        if (!hasSvis)
        {
            context.Campaigns.AddRange(GetSvisCampaigns(SvisInstitutionId));
            await context.SaveChangesAsync();
        }

        // 4. Ensure Recommendations exist
        if (!await context.Recommendations.AnyAsync())
        {
            context.Recommendations.AddRange(GetDefaultRecommendations());
            await context.SaveChangesAsync();
        }
    }

    public static List<Campaign> GetDisCampaigns(Guid institutionId)
    {
        var now = DateTime.UtcNow;
        return new List<Campaign>
        {
            new Campaign
            {
                Name = "Early Bird Admissions 2026-27 - Meta Lead Blitz",
                Type = "Digital",
                Objective = "LeadGeneration",
                InstitutionId = institutionId,
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
                InstitutionId = institutionId,
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
                InstitutionId = institutionId,
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
                InstitutionId = institutionId,
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
                InstitutionId = institutionId,
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
                InstitutionId = institutionId,
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
    }

    public static List<Campaign> GetSvisCampaigns(Guid institutionId)
    {
        var now = DateTime.UtcNow;
        return new List<Campaign>
        {
            new Campaign
            {
                Name = "SVIS Academic Excellence & Cambridge Admissions 2026-27",
                Type = "Digital",
                Objective = "LeadGeneration",
                InstitutionId = institutionId,
                SchoolName = "Swami Vivekananda International School",
                CampusName = "Main Campus",
                AcademicSession = "2026–2027",
                TargetAdmissionCycle = "Cycle 1 (April 2026)",
                StartDate = now.AddDays(-18),
                EndDate = now.AddDays(12),
                Status = "Active",
                Priority = "High",
                Budget = 55000,
                ActualCost = 41200,
                PrimaryChannel = "Facebook",
                Channels = "Facebook,Instagram",
                TargetGrades = "Nursery,Kindergarten,Grade 1,Grade 2",
                TargetGeography = "Dwarka & West Delhi Sector 10-22 (0-5 km)",
                TargetPinCodes = "110075,110078",
                Impressions = 125000,
                Clicks = 5100,
                ExpectedLeads = 310,
                ActualLeads = 290,
                ExpectedQualified = 195,
                ActualQualified = 185,
                ExpectedVisits = 100,
                ActualVisits = 90,
                ExpectedApplications = 55,
                ActualApplications = 48,
                ExpectedEnrollments = 32,
                ActualEnrollments = 28,
                UtmSource = "meta",
                UtmMedium = "cpc",
                UtmCampaign = "svis_excellence_2026",
                IsAiGenerated = true,
                AiConfidenceScore = 0.93,
                AiStrategySummary = "Dual curriculum (ICSE + Cambridge) spotlight campaign with video testimonials of parent community.",
                AiDiagnosisSummary = "Healthy lead velocity and strong conversion to booked campus visits.",
                Owner = "Rahul Mehta",
                CreatedAt = now.AddDays(-19)
            },
            new Campaign
            {
                Name = "SVIS Robotics, AI & STEAM Horizon Exhibition",
                Type = "Hybrid",
                Objective = "CampusVisits",
                InstitutionId = institutionId,
                SchoolName = "Swami Vivekananda International School",
                CampusName = "Main Campus",
                AcademicSession = "2026–2027",
                TargetAdmissionCycle = "Cycle 1 (April 2026)",
                StartDate = now.AddDays(-10),
                EndDate = now.AddDays(20),
                Status = "Active",
                Priority = "High",
                Budget = 48000,
                ActualCost = 36500,
                PrimaryChannel = "Society Event",
                Channels = "Society Event,WhatsApp",
                TargetGrades = "Grade 4,Grade 5,Grade 6,Grade 7,Grade 8",
                TargetGeography = "Dwarka Expressway & Palam Vihar Societies (3 km)",
                TargetPinCodes = "110077,122017",
                Impressions = 9200,
                Clicks = 2400,
                ExpectedLeads = 135,
                ActualLeads = 130,
                ExpectedQualified = 115,
                ActualQualified = 110,
                ExpectedVisits = 80,
                ActualVisits = 75,
                ExpectedApplications = 55,
                ActualApplications = 52,
                ExpectedEnrollments = 35,
                ActualEnrollments = 32,
                QrCodeKey = "QR-SVIS-STEAM-26",
                IsAiGenerated = true,
                AiConfidenceScore = 0.94,
                AiStrategySummary = "Weekend experiential innovation workshop with on-the-spot tour scheduling.",
                AiDiagnosisSummary = "Highest lead-to-visit conversion among offline initiatives (57.7%).",
                Owner = "SVIS Admissions Office",
                CreatedAt = now.AddDays(-11)
            },
            new Campaign
            {
                Name = "SVIS Secondary Leadership & Olympiad Entrance Drive",
                Type = "Digital",
                Objective = "ScholarshipPromotion",
                InstitutionId = institutionId,
                SchoolName = "Swami Vivekananda International School",
                CampusName = "Main Campus",
                AcademicSession = "2026–2027",
                TargetAdmissionCycle = "Cycle 1 (April 2026)",
                StartDate = now.AddDays(-28),
                EndDate = now.AddDays(15),
                Status = "Active",
                Priority = "Urgent",
                Budget = 65000,
                ActualCost = 52000,
                PrimaryChannel = "Google Search",
                Channels = "Google Search,YouTube",
                TargetGrades = "Grade 9,Grade 10,Grade 11 Science & Commerce",
                TargetGeography = "West Delhi & NCR Catchment",
                TargetPinCodes = "110058,110075,110085",
                Impressions = 72000,
                Clicks = 4300,
                ExpectedLeads = 230,
                ActualLeads = 215,
                ExpectedQualified = 170,
                ActualQualified = 160,
                ExpectedVisits = 88,
                ActualVisits = 82,
                ExpectedApplications = 62,
                ActualApplications = 58,
                ExpectedEnrollments = 38,
                ActualEnrollments = 35,
                UtmSource = "google",
                UtmMedium = "cpc",
                UtmCampaign = "svis_olympiad_drive",
                IsAiGenerated = false,
                AiConfidenceScore = 0.90,
                AiStrategySummary = "Merit scholarship test for competitive entrance with specialized coaching faculty introduction.",
                AiDiagnosisSummary = "Quality index exceptionally high; 70.7% visit-to-application rate.",
                Owner = "Rahul Mehta",
                CreatedAt = now.AddDays(-29)
            },
            new Campaign
            {
                Name = "SVIS Kindergarten & Early Explorers Open Day",
                Type = "Hybrid",
                Objective = "OpenHouse",
                InstitutionId = institutionId,
                SchoolName = "Swami Vivekananda International School",
                CampusName = "Main Campus",
                AcademicSession = "2026–2027",
                TargetAdmissionCycle = "Cycle 1 (April 2026)",
                StartDate = now.AddDays(7),
                EndDate = now.AddDays(27),
                Status = "Scheduled",
                Priority = "Medium",
                Budget = 30000,
                ActualCost = 14000,
                PrimaryChannel = "WhatsApp",
                Channels = "WhatsApp,Email",
                TargetGrades = "Playgroup,Pre-Nursery,KG",
                TargetGeography = "Dwarka Sectors 1-12 (3 km radius)",
                TargetPinCodes = "110075,110078",
                Impressions = 28000,
                Clicks = 1600,
                ExpectedLeads = 110,
                ActualLeads = 95,
                ExpectedQualified = 75,
                ActualQualified = 68,
                ExpectedVisits = 50,
                ActualVisits = 45,
                ExpectedApplications = 30,
                ActualApplications = 22,
                ExpectedEnrollments = 20,
                ActualEnrollments = 16,
                UtmSource = "whatsapp",
                UtmMedium = "direct",
                UtmCampaign = "svis_early_explorers",
                IsAiGenerated = true,
                AiConfidenceScore = 0.88,
                AiStrategySummary = "Personalized WhatsApp invites highlighting Montessori foundation and play-based discovery zones.",
                AiDiagnosisSummary = "Registration pacing steady ahead of upcoming discovery open day.",
                Owner = "SVIS Admissions Office",
                CreatedAt = now.AddDays(-5)
            }
        };
    }

    public static List<CampaignRecommendation> GetDefaultRecommendations()
    {
        return new List<CampaignRecommendation>
        {
            new CampaignRecommendation
            {
                Title = "Scale Apartment Society Activations in High-Density Societies",
                Category = "ChannelShift",
                Description = "Historical society weekend events showed a 24.8% Lead-to-Enrollment conversion (highest across all channels) at a low CAC of ₹1,166 per enrollment.",
                SupportingEvidence = "Prestige Ozone and Palm Meadows events generated 36 enrollments against only ₹42,000 spend.",
                HistoricalPeriod = "Last 60 Days",
                SampleSize = 450,
                ConfidenceLevel = 0.95,
                ExpectedImpact = "+38% Higher Lead-to-Enrollment Rate",
                Assumptions = "Requires coordination with Resident Welfare Associations (RWAs) for clubhouse space approval.",
                SuggestedBudget = 45000,
                TargetChannel = "Apartment Society Event",
                TargetGeography = "Societies within 4 km of Campus",
                Status = "Pending"
            },
            new CampaignRecommendation
            {
                Title = "Automate Instant WhatsApp Campus Tour Confirmation",
                Category = "Optimization",
                Description = "Funnel analysis reveals 51% drop-off between Qualified Lead and Campus Visit. Automated WhatsApp scheduling reduces no-shows by 31%.",
                SupportingEvidence = "Leads contacted within 30 minutes convert to campus visits at 72% vs 43% for >4h latency.",
                HistoricalPeriod = "Current Admission Cycle",
                SampleSize = 620,
                ConfidenceLevel = 0.92,
                ExpectedImpact = "+22% Increase in Completed Campus Visits",
                Assumptions = "Leverages WhatsApp Business API with automated calendar sync.",
                SuggestedBudget = 15000,
                TargetChannel = "WhatsApp",
                TargetGeography = "All Inbound Leads",
                Status = "Pending"
            },
            new CampaignRecommendation
            {
                Title = "Reallocate 30% of Broad Meta Ad Budget to Google High-Intent Search",
                Category = "BudgetIncrease",
                Description = "Google Search campaigns generate high-intent secondary grade parents who convert to applications at 69.6%, with ₹1,465 cost per enrollment.",
                SupportingEvidence = "CBSE Search keywords generated 71 applications and 44 enrollments with zero creative fatigue.",
                HistoricalPeriod = "Last 45 Days",
                SampleSize = 580,
                ConfidenceLevel = 0.89,
                ExpectedImpact = "-18% Reduction in Cost Per Qualified Admission",
                Assumptions = "Maintains top 2 position for target keyword bid auctions.",
                SuggestedBudget = 50000,
                TargetChannel = "Google Search",
                TargetGeography = "5-10 km radius covering secondary feeder schools",
                Status = "Pending"
            }
        };
    }
}
