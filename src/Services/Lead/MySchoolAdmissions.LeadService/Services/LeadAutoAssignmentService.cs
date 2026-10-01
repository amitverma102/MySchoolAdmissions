using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MySchoolAdmissions.LeadService.Data;
using MySchoolAdmissions.LeadService.DTOs;
using MySchoolAdmissions.LeadService.Models;

namespace MySchoolAdmissions.LeadService.Services;

public class LeadAutoAssignmentService : ILeadAutoAssignmentService
{
    private readonly LeadDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LeadAutoAssignmentService> _logger;

    public LeadAutoAssignmentService(
        LeadDbContext context,
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<LeadAutoAssignmentService> logger)
    {
        _context = context;
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AutoAssignmentResultDto> EvaluateAndAssignAsync(Enquiry enquiry, bool saveChanges = true)
    {
        var config = await GetOrCreateConfigAsync(enquiry.InstitutionId);
        if (!config.IsAutoAssignmentEnabled)
        {
            return new AutoAssignmentResultDto
            {
                Success = false,
                MatchReason = "Auto-assignment is currently disabled in school settings."
            };
        }

        var criteria = new LeadMatchCriteriaDto
        {
            GradeInterested = enquiry.GradeInterested,
            PreferredLanguage = enquiry.PreferredLanguage,
            Region = enquiry.Region,
            Religion = enquiry.Religion,
            InstitutionId = enquiry.InstitutionId ?? Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01"),
            CampusId = enquiry.CampusId
        };

        var rankedCandidates = await CalculateRankedCandidatesAsync(criteria, config, enquiry.StudentName);

        var bestMatch = rankedCandidates.FirstOrDefault(c => c.IsEligible && c.TotalScore >= config.MinimumMatchThreshold);

        if (bestMatch != null)
        {
            enquiry.AssignedToId = bestMatch.UserId;
            enquiry.AutoAssignmentScore = bestMatch.TotalScore;
            enquiry.AutoAssignmentReason = !string.IsNullOrWhiteSpace(bestMatch.AiAnalysis)
                ? bestMatch.AiAnalysis
                : bestMatch.MatchSummary;
            enquiry.AssignedAt = DateTime.UtcNow;

            // Update primary counselor profile tracking
            var profile = await _context.CounselorProfiles.FirstOrDefaultAsync(p => p.UserId == bestMatch.UserId);
            if (profile != null)
            {
                profile.AssignedCountToday++;
                profile.LastAssignedAt = DateTime.UtcNow;
            }

            // Co-Counselor Auto-Assignment if enabled
            CounselorMatchCandidateDto? coCounselor = null;
            if (config.AutoAssignCoCounselor)
            {
                coCounselor = rankedCandidates.FirstOrDefault(c => 
                    c.UserId != bestMatch.UserId && 
                    c.IsEligible && 
                    (c.IsRecommendedCoCounselor || c.TotalScore >= (config.MinimumMatchThreshold * 0.7)));

                if (coCounselor != null)
                {
                    enquiry.CoCounselorId = coCounselor.UserId;
                    enquiry.CoCounselorReason = !string.IsNullOrWhiteSpace(coCounselor.CoCounselorSynergy)
                        ? coCounselor.CoCounselorSynergy
                        : $"AI Co-Counselor Recommendation: {coCounselor.CounselorName} ({coCounselor.TotalScore}% match) selected to assist lead.";
                }
            }

            // Interaction History Log
            string notes = enquiry.CoCounselorId.HasValue && coCounselor != null
                ? $"AI Counselor Team Auto-Assigned: Primary -> {bestMatch.CounselorName} ({bestMatch.TotalScore}% match). Co-Counselor -> {coCounselor.CounselorName} ({coCounselor.TotalScore}% match). Synergy: {enquiry.CoCounselorReason}"
                : $"AI Counselor Auto-Assigned: {bestMatch.CounselorName} ({bestMatch.TotalScore}% match). {enquiry.AutoAssignmentReason}";

            var assignmentLog = new InteractionHistory
            {
                EnquiryId = enquiry.Id,
                InteractionType = "Auto-Assignment",
                Disposition = "Auto-Assigned",
                Notes = notes,
                InteractionDate = DateTime.UtcNow
            };
            _context.InteractionHistories.Add(assignmentLog);

            if (saveChanges)
            {
                await _context.SaveChangesAsync();
            }

            return new AutoAssignmentResultDto
            {
                Success = true,
                AssignedCounselorId = bestMatch.UserId,
                AssignedCounselorName = bestMatch.CounselorName,
                MatchScore = bestMatch.TotalScore,
                MatchReason = enquiry.AutoAssignmentReason,
                CoCounselorId = coCounselor?.UserId,
                CoCounselorName = coCounselor?.CounselorName,
                CoCounselorScore = coCounselor?.TotalScore,
                CoCounselorReason = enquiry.CoCounselorReason,
                IsFallback = false,
                EvaluationEngine = config.UseAiScoring ? "Artificial Intelligence Match Engine" : "Rule-Based Heuristic Match Engine"
            };
        }

        // Fallback handling
        if (config.FallbackCounselorId.HasValue)
        {
            var fallbackProfile = await _context.CounselorProfiles.FirstOrDefaultAsync(p => p.UserId == config.FallbackCounselorId.Value);
            string fallbackName = fallbackProfile?.CounselorName ?? config.FallbackCounselorName ?? "Head of Admissions";

            enquiry.AssignedToId = config.FallbackCounselorId.Value;
            enquiry.AutoAssignmentScore = rankedCandidates.FirstOrDefault()?.TotalScore ?? 0;
            enquiry.AutoAssignmentReason = $"Assigned to Fallback Queue ({fallbackName}): No active counselor met the minimum compatibility threshold of {config.MinimumMatchThreshold}%.";
            enquiry.AssignedAt = DateTime.UtcNow;
            enquiry.CoCounselorId = null;
            enquiry.CoCounselorReason = null;

            var fallbackLog = new InteractionHistory
            {
                EnquiryId = enquiry.Id,
                InteractionType = "Auto-Assignment",
                Disposition = "Fallback Assigned",
                Notes = enquiry.AutoAssignmentReason,
                InteractionDate = DateTime.UtcNow
            };
            _context.InteractionHistories.Add(fallbackLog);

            if (saveChanges)
            {
                await _context.SaveChangesAsync();
            }

            return new AutoAssignmentResultDto
            {
                Success = true,
                AssignedCounselorId = config.FallbackCounselorId.Value,
                AssignedCounselorName = fallbackName,
                MatchScore = enquiry.AutoAssignmentScore.Value,
                MatchReason = enquiry.AutoAssignmentReason,
                IsFallback = true
            };
        }

        // No fallback configured
        enquiry.AutoAssignmentScore = rankedCandidates.FirstOrDefault()?.TotalScore ?? 0;
        enquiry.AutoAssignmentReason = $"Remains Unassigned: No active counselor reached the minimum {config.MinimumMatchThreshold}% compatibility threshold.";

        if (saveChanges)
        {
            await _context.SaveChangesAsync();
        }

        return new AutoAssignmentResultDto
        {
            Success = false,
            MatchScore = enquiry.AutoAssignmentScore.Value,
            MatchReason = enquiry.AutoAssignmentReason,
            IsFallback = false
        };
    }

    public async Task<AutoAssignmentResultDto> AutoAssignCoCounselorAsync(Guid enquiryId)
    {
        var enquiry = await _context.Enquiries.FirstOrDefaultAsync(e => e.Id == enquiryId);
        if (enquiry == null)
        {
            return new AutoAssignmentResultDto
            {
                Success = false,
                MatchReason = "Enquiry not found."
            };
        }

        var config = await GetOrCreateConfigAsync(enquiry.InstitutionId);

        var criteria = new LeadMatchCriteriaDto
        {
            GradeInterested = enquiry.GradeInterested,
            PreferredLanguage = enquiry.PreferredLanguage,
            Region = enquiry.Region,
            Religion = enquiry.Religion,
            InstitutionId = enquiry.InstitutionId ?? Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01"),
            CampusId = enquiry.CampusId
        };

        var rankedCandidates = await CalculateRankedCandidatesAsync(criteria, config, enquiry.StudentName);

        // Filter out existing primary counselor
        var eligibleCoCandidates = rankedCandidates
            .Where(c => c.IsEligible && c.UserId != enquiry.AssignedToId)
            .ToList();

        var bestCo = eligibleCoCandidates.FirstOrDefault(c => c.IsRecommendedCoCounselor)
            ?? eligibleCoCandidates.FirstOrDefault(c => c.TotalScore >= (config.MinimumMatchThreshold * 0.7));

        if (bestCo == null)
        {
            return new AutoAssignmentResultDto
            {
                Success = false,
                MatchReason = "No eligible co-counselor found meeting compatibility requirements."
            };
        }

        enquiry.CoCounselorId = bestCo.UserId;
        enquiry.CoCounselorReason = !string.IsNullOrWhiteSpace(bestCo.CoCounselorSynergy)
            ? bestCo.CoCounselorSynergy
            : $"AI Co-Counselor recommendation: {bestCo.CounselorName} ({bestCo.TotalScore}% compatibility) selected to assist lead.";

        var log = new InteractionHistory
        {
            EnquiryId = enquiry.Id,
            InteractionType = "Co-Counselor Assignment",
            Disposition = "AI Co-Counselor Assigned",
            Notes = $"AI Co-Counselor assigned: {bestCo.CounselorName} ({bestCo.TotalScore}% match). Synergy: {enquiry.CoCounselorReason}",
            InteractionDate = DateTime.UtcNow
        };
        _context.InteractionHistories.Add(log);

        await _context.SaveChangesAsync();

        return new AutoAssignmentResultDto
        {
            Success = true,
            AssignedCounselorId = enquiry.AssignedToId,
            CoCounselorId = bestCo.UserId,
            CoCounselorName = bestCo.CounselorName,
            CoCounselorScore = bestCo.TotalScore,
            CoCounselorReason = enquiry.CoCounselorReason,
            MatchReason = enquiry.AutoAssignmentReason ?? "AI Co-Counselor successfully paired."
        };
    }

    public async Task<List<CounselorMatchCandidateDto>> PreviewMatchesAsync(LeadMatchCriteriaDto criteria)
    {
        var config = await GetOrCreateConfigAsync(criteria.InstitutionId);
        return await CalculateRankedCandidatesAsync(criteria, config, null);
    }

    public async Task<int> AutoAssignUnassignedLeadsAsync(Guid? institutionId)
    {
        var unassignedQuery = _context.Enquiries
            .Where(e => e.AssignedToId == null && e.Status != "Lost");

        if (institutionId.HasValue)
        {
            unassignedQuery = unassignedQuery.Where(e => e.InstitutionId == institutionId.Value);
        }

        var unassignedLeads = await unassignedQuery.ToListAsync();
        int assignedCount = 0;

        foreach (var lead in unassignedLeads)
        {
            var result = await EvaluateAndAssignAsync(lead, saveChanges: false);
            if (result.Success && result.AssignedCounselorId.HasValue)
            {
                assignedCount++;
            }
        }

        if (assignedCount > 0)
        {
            await _context.SaveChangesAsync();
        }

        return assignedCount;
    }

    public async Task<AutoAssignmentConfigDto> GetConfigAsync(Guid? institutionId)
    {
        var config = await GetOrCreateConfigAsync(institutionId);
        return MapToDto(config);
    }

    public async Task<AutoAssignmentConfigDto> UpdateConfigAsync(AutoAssignmentConfigDto dto)
    {
        var config = await GetOrCreateConfigAsync(dto.InstitutionId);

        config.GradeWeight = dto.GradeWeight;
        config.LanguageWeight = dto.LanguageWeight;
        config.RegionWeight = dto.RegionWeight;
        config.ReligionWeight = dto.ReligionWeight;
        config.WorkloadBalanceWeight = dto.WorkloadBalanceWeight;
        config.MinimumMatchThreshold = dto.MinimumMatchThreshold;
        config.FallbackCounselorId = dto.FallbackCounselorId;
        config.FallbackCounselorName = dto.FallbackCounselorName;
        config.IsAutoAssignmentEnabled = dto.IsAutoAssignmentEnabled;
        config.AutoAssignCoCounselor = dto.AutoAssignCoCounselor;
        config.UseAiScoring = dto.UseAiScoring;
        config.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(config);
    }

    private async Task<List<CounselorMatchCandidateDto>> CalculateRankedCandidatesAsync(
        LeadMatchCriteriaDto criteria, 
        AutoAssignmentConfig config,
        string? studentName)
    {
        var profilesQuery = _context.CounselorProfiles.AsQueryable();
        if (criteria.InstitutionId.HasValue)
        {
            profilesQuery = profilesQuery.Where(p => p.InstitutionId == criteria.InstitutionId.Value);
        }

        var profiles = await profilesQuery.ToListAsync();

        // Calculate current active lead counts per counselor
        var activeLeadsPerCounselor = await _context.Enquiries
            .Where(e => e.AssignedToId != null && e.Status != "Qualified" && e.Status != "Lost")
            .GroupBy(e => e.AssignedToId!.Value)
            .Select(g => new { CounselorId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.CounselorId, g => g.Count);

        // Try AI Scoring if enabled
        if (config.UseAiScoring && profiles.Count > 0)
        {
            var aiResponse = await CallAiServiceMatchAsync(criteria, profiles, activeLeadsPerCounselor, config, studentName);
            if (aiResponse != null && aiResponse.AllEvaluations.Count > 0)
            {
                var aiCandidates = new List<CounselorMatchCandidateDto>();

                foreach (var eval in aiResponse.AllEvaluations)
                {
                    var p = profiles.FirstOrDefault(x => x.UserId == eval.CounselorId);
                    int currentActive = p != null && activeLeadsPerCounselor.TryGetValue(p.UserId, out int count) ? count : 0;

                    aiCandidates.Add(new CounselorMatchCandidateDto
                    {
                        UserId = eval.CounselorId,
                        CounselorName = eval.CounselorName,
                        Email = p?.Email ?? "",
                        TotalScore = eval.TotalScore,
                        GradeScore = eval.AcademicScore,
                        LanguageScore = eval.LanguageScore,
                        RegionScore = eval.RegionScore,
                        ReligionScore = eval.ReligionScore,
                        WorkloadScore = eval.WorkloadScore,
                        IsEligible = eval.IsEligible,
                        IneligibilityReason = eval.IneligibilityReason,
                        MatchSummary = eval.Analysis,
                        AiAnalysis = eval.Analysis,
                        IsRecommendedCoCounselor = eval.IsRecommendedCoCounselor,
                        CoCounselorSynergy = eval.CoCounselorSynergy,
                        ActiveLeads = currentActive,
                        AssignedToday = p?.AssignedCountToday ?? 0,
                        DailyCapacity = p?.DailyLeadCapacity ?? 15,
                        MatchingSkills = new List<string> { $"AI Evaluation ({eval.TotalScore}%)" }
                    });
                }

                return aiCandidates
                    .OrderByDescending(c => c.IsEligible)
                    .ThenByDescending(c => c.TotalScore)
                    .ThenBy(c => c.AssignedToday)
                    .ToList();
            }
        }

        // Deterministic Heuristic Fallback
        var candidates = new List<CounselorMatchCandidateDto>();

        foreach (var p in profiles)
        {
            int currentActive = activeLeadsPerCounselor.TryGetValue(p.UserId, out int count) ? count : 0;
            bool isEligible = true;
            string ineligibilityReason = "";

            if (!p.IsActive)
            {
                isEligible = false;
                ineligibilityReason = "Counselor is currently marked On Leave / Inactive.";
            }
            else if (p.AssignedCountToday >= p.DailyLeadCapacity && p.DailyLeadCapacity > 0)
            {
                isEligible = false;
                ineligibilityReason = $"Daily capacity reached ({p.AssignedCountToday}/{p.DailyLeadCapacity} leads).";
            }
            else if (currentActive >= p.MaxActiveLeads && p.MaxActiveLeads > 0)
            {
                isEligible = false;
                ineligibilityReason = $"Max active leads cap reached ({currentActive}/{p.MaxActiveLeads} active).";
            }

            var matchingSkills = new List<string>();

            int gradeScore = CalculateGradeScore(criteria.GradeInterested, p.HandledClasses, config.GradeWeight, matchingSkills);
            int languageScore = CalculateLanguageScore(criteria.PreferredLanguage, p.LanguagesKnown, config.LanguageWeight, matchingSkills);
            int regionScore = CalculateRegionScore(criteria.Region, p.Regions, config.RegionWeight, matchingSkills);
            int religionScore = CalculateReligionScore(criteria.Religion, p.Religions, config.ReligionWeight, matchingSkills);
            int workloadScore = CalculateWorkloadScore(currentActive, p.MaxActiveLeads, config.WorkloadBalanceWeight);

            int totalScore = gradeScore + languageScore + regionScore + religionScore + workloadScore;
            totalScore = Math.Clamp(totalScore, 0, 100);

            string summary = matchingSkills.Count > 0
                ? $"Matched on {string.Join(", ", matchingSkills)} (Score: {totalScore}%)"
                : $"General match based on availability & workload (Score: {totalScore}%)";

            candidates.Add(new CounselorMatchCandidateDto
            {
                UserId = p.UserId,
                CounselorName = p.CounselorName,
                Email = p.Email,
                TotalScore = totalScore,
                GradeScore = gradeScore,
                LanguageScore = languageScore,
                RegionScore = regionScore,
                ReligionScore = religionScore,
                WorkloadScore = workloadScore,
                IsEligible = isEligible,
                IneligibilityReason = ineligibilityReason,
                MatchSummary = summary,
                AiAnalysis = summary,
                ActiveLeads = currentActive,
                AssignedToday = p.AssignedCountToday,
                DailyCapacity = p.DailyLeadCapacity,
                MatchingSkills = matchingSkills
            });
        }

        var ranked = candidates
            .OrderByDescending(c => c.IsEligible)
            .ThenByDescending(c => c.TotalScore)
            .ThenBy(c => c.AssignedToday)
            .ToList();

        // Mark second eligible candidate as recommended Co-Counselor in heuristic mode
        if (ranked.Count > 1)
        {
            var eligibleCo = ranked.Skip(1).FirstOrDefault(c => c.IsEligible);
            if (eligibleCo != null)
            {
                eligibleCo.IsRecommendedCoCounselor = true;
                eligibleCo.CoCounselorSynergy = $"Complementary pairing ({eligibleCo.TotalScore}% compatibility). Provides backup coverage.";
            }
        }

        return ranked;
    }

    private async Task<AiServiceMatchResponse?> CallAiServiceMatchAsync(
        LeadMatchCriteriaDto criteria,
        List<CounselorSkillProfile> profiles,
        Dictionary<Guid, int> activeCounts,
        AutoAssignmentConfig config,
        string? studentName)
    {
        var baseUrls = new List<string>();
        
        var configuredUrl = _configuration["Services:AiServiceUrl"] 
                         ?? _configuration["AIService:BaseUrl"];
        if (!string.IsNullOrWhiteSpace(configuredUrl))
        {
            baseUrls.Add(configuredUrl.TrimEnd('/'));
        }
        
        // Common defaults in docker and host
        if (!baseUrls.Contains("http://ai-service:8080")) baseUrls.Add("http://ai-service:8080");
        if (!baseUrls.Contains("http://localhost:5009")) baseUrls.Add("http://localhost:5009");

        var payload = new AiServiceMatchRequest
        {
            Lead = new AiServiceLeadProfile
            {
                StudentName = studentName ?? "Prospective Student",
                GradeInterested = criteria.GradeInterested ?? string.Empty,
                PreferredLanguage = criteria.PreferredLanguage,
                Region = criteria.Region,
                Religion = criteria.Religion,
                Notes = criteria.Notes
            },
            Counselors = profiles.Select(p => new AiServiceCounselorProfile
            {
                UserId = p.UserId,
                CounselorName = p.CounselorName,
                Email = p.Email,
                HandledClasses = p.HandledClasses,
                LanguagesKnown = p.LanguagesKnown,
                Regions = p.Regions,
                Religions = p.Religions,
                ActiveLeads = activeCounts.TryGetValue(p.UserId, out var c) ? c : 0,
                AssignedToday = p.AssignedCountToday,
                DailyCapacity = p.DailyLeadCapacity,
                MaxActiveLeads = p.MaxActiveLeads,
                IsActive = p.IsActive
            }).ToList(),
            Config = new AiServiceMatchConfig
            {
                GradeWeight = config.GradeWeight,
                LanguageWeight = config.LanguageWeight,
                RegionWeight = config.RegionWeight,
                ReligionWeight = config.ReligionWeight,
                WorkloadBalanceWeight = config.WorkloadBalanceWeight,
                MinimumMatchThreshold = config.MinimumMatchThreshold,
                AutoAssignCoCounselor = config.AutoAssignCoCounselor
            }
        };

        foreach (var baseUrl in baseUrls)
        {
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                var response = await _httpClient.PostAsJsonAsync($"{baseUrl}/api/insights/match-counselors", payload, cts.Token);
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<AiServiceMatchResponse>();
                    if (result != null && result.Success)
                    {
                        return result;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to call AI match endpoint at {BaseUrl}. Trying fallback.", baseUrl);
            }
        }

        return null;
    }

    private static int CalculateGradeScore(string? grade, List<string> handledClasses, int maxWeight, List<string> matchingSkills)
    {
        if (handledClasses == null || handledClasses.Count == 0 || handledClasses.Any(c => c.Equals("All", StringComparison.OrdinalIgnoreCase)))
        {
            return (int)(maxWeight * 0.7);
        }

        if (string.IsNullOrWhiteSpace(grade))
        {
            return (int)(maxWeight * 0.5);
        }

        var normalizedGrade = grade.Trim().ToLowerInvariant();

        var exact = handledClasses.FirstOrDefault(c => c.Trim().Equals(normalizedGrade, StringComparison.OrdinalIgnoreCase));
        if (exact != null)
        {
            matchingSkills.Add($"Grade: {exact}");
            return maxWeight;
        }

        var partial = handledClasses.FirstOrDefault(c => 
            normalizedGrade.Contains(c.ToLowerInvariant()) || c.ToLowerInvariant().Contains(normalizedGrade));
        
        if (partial != null)
        {
            matchingSkills.Add($"Grade: {partial}");
            return (int)(maxWeight * 0.75);
        }

        return 0;
    }

    private static int CalculateLanguageScore(string? language, List<string> languagesKnown, int maxWeight, List<string> matchingSkills)
    {
        if (languagesKnown == null || languagesKnown.Count == 0 || languagesKnown.Any(l => l.Equals("All", StringComparison.OrdinalIgnoreCase)))
        {
            return (int)(maxWeight * 0.6);
        }

        if (string.IsNullOrWhiteSpace(language))
        {
            if (languagesKnown.Any(l => l.Equals("Hindi", StringComparison.OrdinalIgnoreCase) || l.Equals("English", StringComparison.OrdinalIgnoreCase)))
            {
                return (int)(maxWeight * 0.8);
            }
            return (int)(maxWeight * 0.5);
        }

        var normalized = language.Trim().ToLowerInvariant();

        var exact = languagesKnown.FirstOrDefault(l => l.Trim().Equals(normalized, StringComparison.OrdinalIgnoreCase));
        if (exact != null)
        {
            matchingSkills.Add($"Language: {exact}");
            return maxWeight;
        }

        var secondary = languagesKnown.FirstOrDefault(l => normalized.Contains(l.ToLowerInvariant()) || l.ToLowerInvariant().Contains(normalized));
        if (secondary != null)
        {
            matchingSkills.Add($"Language: {secondary}");
            return (int)(maxWeight * 0.7);
        }

        if (languagesKnown.Any(l => l.Equals("English", StringComparison.OrdinalIgnoreCase)))
        {
            return (int)(maxWeight * 0.4);
        }

        return 0;
    }

    private static int CalculateRegionScore(string? region, List<string> regions, int maxWeight, List<string> matchingSkills)
    {
        if (regions == null || regions.Count == 0 || regions.Any(r => r.Equals("All", StringComparison.OrdinalIgnoreCase)))
        {
            return (int)(maxWeight * 0.6);
        }

        if (string.IsNullOrWhiteSpace(region))
        {
            return (int)(maxWeight * 0.5);
        }

        var normalized = region.Trim().ToLowerInvariant();

        var exact = regions.FirstOrDefault(r => r.Trim().Equals(normalized, StringComparison.OrdinalIgnoreCase));
        if (exact != null)
        {
            matchingSkills.Add($"Region: {exact}");
            return maxWeight;
        }

        var partial = regions.FirstOrDefault(r => normalized.Contains(r.ToLowerInvariant()) || r.ToLowerInvariant().Contains(normalized));
        if (partial != null)
        {
            matchingSkills.Add($"Region: {partial}");
            return (int)(maxWeight * 0.7);
        }

        if (regions.Any(r => r.Equals("NCR", StringComparison.OrdinalIgnoreCase) || r.Equals("Delhi NCR", StringComparison.OrdinalIgnoreCase)))
        {
            return (int)(maxWeight * 0.4);
        }

        return 0;
    }

    private static int CalculateReligionScore(string? religion, List<string> religions, int maxWeight, List<string> matchingSkills)
    {
        if (string.IsNullOrWhiteSpace(religion))
        {
            return maxWeight;
        }

        if (religions == null || religions.Count == 0 || religions.Any(r => r.Equals("All", StringComparison.OrdinalIgnoreCase)))
        {
            return (int)(maxWeight * 0.8);
        }

        var normalized = religion.Trim().ToLowerInvariant();
        var exact = religions.FirstOrDefault(r => r.Trim().Equals(normalized, StringComparison.OrdinalIgnoreCase));
        if (exact != null)
        {
            matchingSkills.Add($"Community: {exact}");
            return maxWeight;
        }

        return (int)(maxWeight * 0.3);
    }

    private static int CalculateWorkloadScore(int currentActive, int maxActive, int maxWeight)
    {
        if (maxActive <= 0) maxActive = 50;
        double ratio = (double)currentActive / maxActive;
        double remainingCapacity = Math.Clamp(1.0 - ratio, 0.0, 1.0);
        return (int)(remainingCapacity * maxWeight);
    }

    private async Task<AutoAssignmentConfig> GetOrCreateConfigAsync(Guid? institutionId)
    {
        var config = await _context.AutoAssignmentConfigs
            .FirstOrDefaultAsync(c => c.InstitutionId == institutionId);

        if (config == null)
        {
            config = new AutoAssignmentConfig
            {
                InstitutionId = institutionId,
                GradeWeight = 35,
                LanguageWeight = 25,
                RegionWeight = 20,
                ReligionWeight = 10,
                WorkloadBalanceWeight = 10,
                MinimumMatchThreshold = 40,
                IsAutoAssignmentEnabled = true,
                AutoAssignCoCounselor = true,
                UseAiScoring = true
            };
            _context.AutoAssignmentConfigs.Add(config);
            await _context.SaveChangesAsync();
        }

        return config;
    }

    private static AutoAssignmentConfigDto MapToDto(AutoAssignmentConfig config)
    {
        return new AutoAssignmentConfigDto
        {
            InstitutionId = config.InstitutionId,
            GradeWeight = config.GradeWeight,
            LanguageWeight = config.LanguageWeight,
            RegionWeight = config.RegionWeight,
            ReligionWeight = config.ReligionWeight,
            WorkloadBalanceWeight = config.WorkloadBalanceWeight,
            MinimumMatchThreshold = config.MinimumMatchThreshold,
            FallbackCounselorId = config.FallbackCounselorId,
            FallbackCounselorName = config.FallbackCounselorName,
            IsAutoAssignmentEnabled = config.IsAutoAssignmentEnabled,
            AutoAssignCoCounselor = config.AutoAssignCoCounselor,
            UseAiScoring = config.UseAiScoring
        };
    }

    // AI Payload Contracts
    private class AiServiceMatchRequest
    {
        public AiServiceLeadProfile Lead { get; set; } = new();
        public List<AiServiceCounselorProfile> Counselors { get; set; } = new();
        public AiServiceMatchConfig Config { get; set; } = new();
    }

    private class AiServiceLeadProfile
    {
        public Guid? LeadId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string GradeInterested { get; set; } = string.Empty;
        public string? PreferredLanguage { get; set; }
        public string? Region { get; set; }
        public string? Religion { get; set; }
        public string? Notes { get; set; }
    }

    private class AiServiceCounselorProfile
    {
        public Guid UserId { get; set; }
        public string CounselorName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public List<string> HandledClasses { get; set; } = new();
        public List<string> LanguagesKnown { get; set; } = new();
        public List<string> Regions { get; set; } = new();
        public List<string> Religions { get; set; } = new();
        public int ActiveLeads { get; set; }
        public int AssignedToday { get; set; }
        public int DailyCapacity { get; set; }
        public int MaxActiveLeads { get; set; }
        public bool IsActive { get; set; }
    }

    private class AiServiceMatchConfig
    {
        public int GradeWeight { get; set; }
        public int LanguageWeight { get; set; }
        public int RegionWeight { get; set; }
        public int ReligionWeight { get; set; }
        public int WorkloadBalanceWeight { get; set; }
        public int MinimumMatchThreshold { get; set; }
        public bool AutoAssignCoCounselor { get; set; }
    }

    private class AiServiceMatchResponse
    {
        public bool Success { get; set; }
        public Guid? PrimaryCounselorId { get; set; }
        public string? PrimaryCounselorName { get; set; }
        public int PrimaryScore { get; set; }
        public string PrimaryReason { get; set; } = string.Empty;
        public Guid? CoCounselorId { get; set; }
        public string? CoCounselorName { get; set; }
        public int? CoCounselorScore { get; set; }
        public string? CoCounselorReason { get; set; }
        public List<AiServiceEvaluation> AllEvaluations { get; set; } = new();
        public string EvaluationModel { get; set; } = string.Empty;
    }

    private class AiServiceEvaluation
    {
        public Guid CounselorId { get; set; }
        public string CounselorName { get; set; } = string.Empty;
        public int TotalScore { get; set; }
        public int AcademicScore { get; set; }
        public int LanguageScore { get; set; }
        public int RegionScore { get; set; }
        public int ReligionScore { get; set; }
        public int WorkloadScore { get; set; }
        public string Analysis { get; set; } = string.Empty;
        public bool IsEligible { get; set; }
        public string IneligibilityReason { get; set; } = string.Empty;
        public bool IsPrimaryMatch { get; set; }
        public bool IsRecommendedCoCounselor { get; set; }
        public string? CoCounselorSynergy { get; set; }
    }
}
