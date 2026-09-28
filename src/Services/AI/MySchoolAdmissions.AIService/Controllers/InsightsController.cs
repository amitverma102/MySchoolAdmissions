using MySchoolAdmissions.AIService.Services;
using Microsoft.AspNetCore.Mvc;

namespace MySchoolAdmissions.AIService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InsightsController : ControllerBase
{
    private readonly LeadScoringService _scoringService;
    private readonly ChatService _chatService;

    public InsightsController(LeadScoringService scoringService, ChatService chatService)
    {
        _scoringService = scoringService;
        _chatService = chatService;
    }

    [HttpGet("lead/{id}")]
    public IActionResult GetLeadInsight(Guid id, [FromQuery] string grade = "Any", [FromQuery] string status = "New")
    {
        var insight = _scoringService.GenerateInsight(id, grade, status);
        return Ok(insight);
    }

    [HttpPost("draft-counselor-email")]
    public IActionResult DraftCounselorEmail([FromBody] MySchoolAdmissions.AIService.DTOs.CounselorDraftRequestDto request)
    {
        var draft = _scoringService.GenerateCounselorDraft(request);
        return Ok(draft);
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequestDto request)
    {
        var response = await _chatService.ProcessChatAsync(request);
        return Ok(response);
    }

    [HttpPost("match-counselors")]
    public IActionResult MatchCounselors([FromBody] MySchoolAdmissions.AIService.DTOs.AICounselorMatchRequestDto request)
    {
        var response = _scoringService.EvaluateCounselorMatchesWithAI(request);
        return Ok(response);
    }
}

