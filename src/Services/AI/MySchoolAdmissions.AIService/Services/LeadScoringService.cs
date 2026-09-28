using MySchoolAdmissions.AIService.DTOs;

namespace MySchoolAdmissions.AIService.Services;

public class LeadScoringService
{
    // Multi-signal AI engine to calculate conversion probability and lead warmth
    public AIInsight GenerateInsight(Guid leadId, string gradeInterested, string status)
    {
        var random = new Random(leadId.GetHashCode()); // Deterministic based on LeadId
        
        int baseScore = status switch
        {
            "Qualified" => 85,
            "Contacted" => 60,
            "New" => 35,
            "Lost" => 10,
            _ => 25
        };

        // Simulated signal boosts based on grade demand & velocity
        int gradeBoost = gradeInterested.Contains("10") || gradeInterested.Contains("12") || gradeInterested.Contains("Science") ? 10 : 0;
        int variance = random.Next(-8, 12);
        int finalScore = Math.Clamp(baseScore + gradeBoost + variance, 1, 99);

        string category = finalScore >= 75 ? "HOT" : (finalScore >= 45 ? "WARM" : "COLD");
        string action;
        string intent;

        if (finalScore >= 75)
        {
            intent = "High Enrollment Intent - Candidate actively evaluating options.";
            action = "Urgent: Call candidate within 2 hours to book an exclusive campus visit.";
        }
        else if (finalScore >= 45)
        {
            intent = "Moderate Interest - Comparing curriculum and fee structures.";
            action = "Send WhatsApp brochure and invite to upcoming webinar / open day.";
        }
        else
        {
            intent = "Low Engagement - Inquiry cold or passive.";
            action = "Enroll in low-touch monthly newsletter and automated email drip.";
        }

        return new AIInsight
        {
            LeadId = leadId,
            ConversionProbability = finalScore,
            LeadHeatCategory = category,
            IntentSummary = intent,
            SuggestedAction = action,
            GeneratedAt = DateTime.UtcNow
        };
    }

    public CounselorDraftResponseDto GenerateCounselorDraft(CounselorDraftRequestDto request)
    {
        var name = string.IsNullOrWhiteSpace(request.StudentName) ? "Prospective Student" : request.StudentName;
        var grade = string.IsNullOrWhiteSpace(request.GradeInterested) ? "our academic program" : $"Grade {request.GradeInterested}";
        var notesSnippet = !string.IsNullOrWhiteSpace(request.CounselorNotes) ? $" Regarding your question on {request.CounselorNotes}," : "";

        string subject;
        string body;
        string whatsApp;
        var talkingPoints = new List<string>();

        switch (request.Objective.ToLowerInvariant())
        {
            case "campustour":
            case "tour":
                subject = $"Invitation: Private Campus Tour & Faculty Interaction for {name}";
                body = $"Dear {name},\n\n" +
                       $"Thank you for exploring admissions into {grade} at MySchoolAdmissions Premier Academy.{notesSnippet} We would be delighted to host you and your family for a personalized campus tour this week.\n\n" +
                       $"During your visit, you will have the opportunity to:\n" +
                       $" • Tour our STEM labs, creative arts studios, and athletic complexes\n" +
                       $" • Meet 1-on-1 with senior department faculty\n" +
                       $" • Review curriculum timelines and scholarship prerequisites\n\n" +
                       $"Please reply with your preferred day (Thursday or Saturday) or confirm directly via phone.\n\n" +
                       $"Warm regards,\nAdmissions Office\nMySchoolAdmissions Academy";
                whatsApp = $"Hi {name}! 🏫 We'd love to invite you for a 1-on-1 Campus Tour for {grade} this Saturday. Would morning (11 AM) or afternoon (2:30 PM) suit you best?";
                talkingPoints.AddRange(new[] { "Highlight modern STEM & sports infrastructure", "Offer 1-on-1 faculty meet", "Flexible weekend slot availability" });
                break;

            case "scholarship":
                subject = $"Merit Scholarship Evaluation Details for {name} ({grade})";
                body = $"Dear {name},\n\n" +
                       $"Based on your demonstrated academic focus in {grade}, you are eligible to be considered for our Merit Excellence Grant (covering up to 35% tuition support).{notesSnippet}\n\n" +
                       $"To proceed with the scholarship review:\n" +
                       $" 1. Submit your latest semester marksheet / report card\n" +
                       $" 2. Complete our online diagnostic assessment (45 mins)\n\n" +
                       $"Slots are limited for this admission cycle, so we encourage submission by Friday.\n\n" +
                       $"Best regards,\nAdmissions & Scholarships Committee";
                whatsApp = $"Hello {name}, great news! 🌟 You qualify for consideration under our Merit Scholarship Scheme for {grade}. Can we connect for 5 mins today to discuss the eligibility steps?";
                talkingPoints.AddRange(new[] { "Up to 35% tuition scholarship eligibility", "Simple 45-min diagnostic assessment", "Deadline urgency" });
                break;

            case "feereminder":
                subject = $"Admissions Update: Provisional Seat Confirmation for {name}";
                body = $"Dear {name},\n\n" +
                       $"We are pleased to share that your application for {grade} has been approved by the admissions panel! 🎉{notesSnippet}\n\n" +
                       $"To lock your seat and complete provisional enrollment before registration closes for this batch, please finalize the token fee using the verified admission portal link below:\n\n" +
                       $"Portal Link: https://portal.myschooladmissions.edu/pay\n\n" +
                       $"If you require installment guidance or assistance with payment receipts, our team is available to assist you immediately.\n\n" +
                       $"Warm regards,\nOffice of the Registrar";
                whatsApp = $"Congratulations {name}! 🎓 Your seat for {grade} has been approved. To confirm your enrollment before the batch is capped, please complete the token fee online: https://portal.myschooladmissions.edu/pay";
                talkingPoints.AddRange(new[] { "Application approved by panel", "Limited batch seats remaining", "Direct online payment link" });
                break;

            default: // General Follow Up
                subject = $"Following up on your admission inquiry for {name} - MySchoolAdmissions Academy";
                body = $"Dear {name},\n\n" +
                       $"I hope this email finds you well. I am following up on your recent inquiry regarding enrollment for {grade}.{notesSnippet}\n\n" +
                       $"We understand that choosing the right academic environment is a major decision. Whether you have questions regarding syllabus, co-curricular options, or student life, I am here to help.\n\n" +
                       $"Would you have 10 minutes for a brief call tomorrow afternoon?\n\n" +
                       $"Warm regards,\nAdmissions Counselor\nMySchoolAdmissions Academy";
                whatsApp = $"Hi {name}! 👋 Just following up on your admission query for {grade}. Do you have 5 minutes for a quick chat today to answer any questions?";
                talkingPoints.AddRange(new[] { "Re-engage inquiry", "Offer immediate guidance on curriculum & admissions", "Low-friction call booking" });
                break;
        }

        return new CounselorDraftResponseDto
        {
            Subject = subject,
            Body = body,
            WhatsAppShortText = whatsApp,
            Tone = "Supportive & Professional",
            KeyTalkingPoints = talkingPoints,
            GeneratedAt = DateTime.UtcNow
        };
    }

    // AI-Powered Counselor Matching and Co-Counselor Selection Engine
    public AICounselorMatchResponseDto EvaluateCounselorMatchesWithAI(AICounselorMatchRequestDto request)
    {
        var lead = request.Lead;
        var counselors = request.Counselors ?? new List<AICounselorCandidateProfileDto>();
        var config = request.Config ?? new AIMatchConfigDto();

        if (counselors.Count == 0)
        {
            return new AICounselorMatchResponseDto
            {
                Success = false,
                PrimaryReason = "No active counselor profiles available for AI evaluation."
            };
        }

        var evaluations = new List<AICounselorEvaluationDto>();

        foreach (var c in counselors)
        {
            var eval = new AICounselorEvaluationDto
            {
                CounselorId = c.UserId,
                CounselorName = c.CounselorName,
                IsEligible = c.IsActive
            };

            if (!c.IsActive)
            {
                eval.IneligibilityReason = "Counselor is currently marked inactive or on leave.";
                eval.TotalScore = 0;
                evaluations.Add(eval);
                continue;
            }

            if (c.AssignedToday >= c.DailyCapacity)
            {
                eval.IsEligible = false;
                eval.IneligibilityReason = $"Daily lead intake limit reached ({c.AssignedToday}/{c.DailyCapacity}).";
                eval.TotalScore = 0;
                evaluations.Add(eval);
                continue;
            }

            if (c.ActiveLeads >= c.MaxActiveLeads)
            {
                eval.IsEligible = false;
                eval.IneligibilityReason = $"Active caseload cap reached ({c.ActiveLeads}/{c.MaxActiveLeads}).";
                eval.TotalScore = 0;
                evaluations.Add(eval);
                continue;
            }

            // 1. Academic & Stream Fit (Config.GradeWeight)
            int academicScore = 0;
            string academicMatchNote = "";
            var targetGrade = (lead.GradeInterested ?? "").Trim();
            if (string.IsNullOrEmpty(targetGrade) || c.HandledClasses.Any(x => x.Equals("All", StringComparison.OrdinalIgnoreCase)))
            {
                academicScore = config.GradeWeight;
                academicMatchNote = "Universal class handling";
            }
            else if (c.HandledClasses.Any(x => x.Equals(targetGrade, StringComparison.OrdinalIgnoreCase)))
            {
                academicScore = config.GradeWeight;
                academicMatchNote = $"Direct class match for {targetGrade}";
            }
            else
            {
                // Partial stream / level match
                var streams = new[] { "Science", "Commerce", "Humanities", "Primary", "Middle", "Secondary", "Nursery", "KG", "Pre-Primary" };
                var matchingStream = streams.FirstOrDefault(s => targetGrade.Contains(s, StringComparison.OrdinalIgnoreCase) && 
                                                               c.HandledClasses.Any(h => h.Contains(s, StringComparison.OrdinalIgnoreCase)));
                if (matchingStream != null)
                {
                    academicScore = (int)(config.GradeWeight * 0.85);
                    academicMatchNote = $"{matchingStream} stream affinity";
                }
                else
                {
                    academicScore = (int)(config.GradeWeight * 0.3);
                    academicMatchNote = "General grade advisory";
                }
            }
            eval.AcademicScore = academicScore;

            // 2. Linguistic Affinity (Config.LanguageWeight)
            int languageScore = 0;
            string langMatchNote = "";
            var prefLang = (lead.PreferredLanguage ?? "").Trim();
            if (string.IsNullOrEmpty(prefLang) || c.LanguagesKnown.Any(x => x.Equals("All", StringComparison.OrdinalIgnoreCase)))
            {
                languageScore = (int)(config.LanguageWeight * 0.9);
                langMatchNote = "Universal multilingual coverage";
            }
            else if (c.LanguagesKnown.Any(x => x.Equals(prefLang, StringComparison.OrdinalIgnoreCase)))
            {
                languageScore = config.LanguageWeight;
                langMatchNote = $"Fluent in {prefLang}";
            }
            else if (c.LanguagesKnown.Any(x => x.Equals("English", StringComparison.OrdinalIgnoreCase) || x.Equals("Hindi", StringComparison.OrdinalIgnoreCase)))
            {
                languageScore = (int)(config.LanguageWeight * 0.6);
                langMatchNote = "Proficient in common link languages";
            }
            else
            {
                languageScore = (int)(config.LanguageWeight * 0.2);
                langMatchNote = "Secondary language capability";
            }
            eval.LanguageScore = languageScore;

            // 3. Catchment & Regional Alignment (Config.RegionWeight)
            int regionScore = 0;
            string regionMatchNote = "";
            var region = (lead.Region ?? "").Trim();
            if (string.IsNullOrEmpty(region) || c.Regions.Any(x => x.Equals("All", StringComparison.OrdinalIgnoreCase)))
            {
                regionScore = (int)(config.RegionWeight * 0.85);
                regionMatchNote = "All-zones catchment coverage";
            }
            else if (c.Regions.Any(x => x.Equals(region, StringComparison.OrdinalIgnoreCase)))
            {
                regionScore = config.RegionWeight;
                regionMatchNote = $"Assigned to {region} catchment zone";
            }
            else
            {
                regionScore = (int)(config.RegionWeight * 0.35);
                regionMatchNote = "Cross-region assistance";
            }
            eval.RegionScore = regionScore;

            // 4. Cultural & Community Affinity (Config.ReligionWeight)
            int religionScore = 0;
            var religion = (lead.Religion ?? "").Trim();
            if (string.IsNullOrEmpty(religion) || c.Religions.Any(x => x.Equals("All", StringComparison.OrdinalIgnoreCase)))
            {
                religionScore = (int)(config.ReligionWeight * 0.85);
            }
            else if (c.Religions.Any(x => x.Equals(religion, StringComparison.OrdinalIgnoreCase)))
            {
                religionScore = config.ReligionWeight;
            }
            else
            {
                religionScore = (int)(config.ReligionWeight * 0.5);
            }
            eval.ReligionScore = religionScore;

            // 5. Workload & Capacity Load-Balancing (Config.WorkloadBalanceWeight)
            double dailyUsage = (double)c.AssignedToday / Math.Max(1, c.DailyCapacity);
            double activeUsage = (double)c.ActiveLeads / Math.Max(1, c.MaxActiveLeads);
            double loadRatio = (dailyUsage * 0.6) + (activeUsage * 0.4);
            int workloadScore = Math.Max(1, (int)(config.WorkloadBalanceWeight * (1.0 - Math.Clamp(loadRatio, 0.0, 0.9))));
            eval.WorkloadScore = workloadScore;

            // Total Score
            eval.TotalScore = Math.Clamp(academicScore + languageScore + regionScore + religionScore + workloadScore, 0, 100);

            // Construct contextual AI evaluation narrative
            var keyStrengths = new List<string>();
            if (!string.IsNullOrEmpty(academicMatchNote)) keyStrengths.Add(academicMatchNote);
            if (!string.IsNullOrEmpty(langMatchNote)) keyStrengths.Add(langMatchNote);
            if (!string.IsNullOrEmpty(regionMatchNote)) keyStrengths.Add(regionMatchNote);

            eval.Analysis = $"AI Compatibility: {eval.TotalScore}% — {string.Join(", ", keyStrengths)}. Workload score: {workloadScore}/{config.WorkloadBalanceWeight}.";
            evaluations.Add(eval);
        }

        // Rank eligible counselors descending by TotalScore
        var ranked = evaluations
            .Where(e => e.IsEligible)
            .OrderByDescending(e => e.TotalScore)
            .ToList();

        var primary = ranked.FirstOrDefault(e => e.TotalScore >= config.MinimumMatchThreshold);

        if (primary == null)
        {
            return new AICounselorMatchResponseDto
            {
                Success = false,
                PrimaryScore = ranked.FirstOrDefault()?.TotalScore ?? 0,
                PrimaryReason = $"No counselor reached the required AI compatibility threshold of {config.MinimumMatchThreshold}%.",
                AllEvaluations = evaluations
            };
        }

        primary.IsPrimaryMatch = true;

        // Select Recommended Co-Counselor (second best candidate that differs from primary)
        AICounselorEvaluationDto? coCounselor = null;
        if (config.AutoAssignCoCounselor && ranked.Count > 1)
        {
            coCounselor = ranked.FirstOrDefault(e => e.CounselorId != primary.CounselorId && e.TotalScore >= 30);
            if (coCounselor != null)
            {
                coCounselor.IsRecommendedCoCounselor = true;
                coCounselor.CoCounselorSynergy = $"Complementary support pairing with {primary.CounselorName}: Provides dual-counselor touchpoint, secondary academic advisory, and backup communication bandwidth ({coCounselor.TotalScore}% score).";
            }
        }

        return new AICounselorMatchResponseDto
        {
            Success = true,
            PrimaryCounselorId = primary.CounselorId,
            PrimaryCounselorName = primary.CounselorName,
            PrimaryScore = primary.TotalScore,
            PrimaryReason = $"AI Best Match ({primary.TotalScore}% score): {primary.Analysis}",

            CoCounselorId = coCounselor?.CounselorId,
            CoCounselorName = coCounselor?.CounselorName,
            CoCounselorScore = coCounselor?.TotalScore,
            CoCounselorReason = coCounselor?.CoCounselorSynergy,

            AllEvaluations = evaluations,
            EvaluationModel = "MySchoolAdmissions AI Multi-Parameter Intelligence Engine"
        };
    }
}

public class AIInsight
{
    public Guid LeadId { get; set; }
    public int ConversionProbability { get; set; }
    public string LeadHeatCategory { get; set; } = "WARM"; // HOT, WARM, COLD
    public string IntentSummary { get; set; } = string.Empty;
    public string SuggestedAction { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
}
