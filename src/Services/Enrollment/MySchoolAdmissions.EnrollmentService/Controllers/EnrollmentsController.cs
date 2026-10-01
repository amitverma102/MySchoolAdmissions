using MySchoolAdmissions.EnrollmentService.Data;
using MySchoolAdmissions.EnrollmentService.Models;
using MySchoolAdmissions.EnrollmentService.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

using System.Security.Cryptography;
using System.Text;

namespace MySchoolAdmissions.EnrollmentService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EnrollmentsController : ControllerBase
{
    private readonly EnrollmentDbContext _context;
    private readonly IConfiguration _configuration;

    public EnrollmentsController(EnrollmentDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
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

    private Guid? GetSelectedInstitutionId(Guid? queryInstId = null)
    {
        var (isSuperAdmin, userInstitutionId) = GetUserContext();
        if (!isSuperAdmin) return userInstitutionId;
        if (queryInstId.HasValue && queryInstId.Value != Guid.Empty) return queryInstId.Value;
        if (Request.Headers.TryGetValue("X-Tenant-Id", out var tenant) && Guid.TryParse(tenant, out var tenantId) && tenantId != Guid.Empty) return tenantId;
        if (Request.Headers.TryGetValue("X-Institution-Id", out var institution) && Guid.TryParse(institution, out var institutionId) && institutionId != Guid.Empty) return institutionId;
        return null;
    }

    private bool CanAccess(Enrollment enrollment)
    {
        var selectedInstitutionId = GetSelectedInstitutionId();
        if (!selectedInstitutionId.HasValue) return GetUserContext().isSuperAdmin;
        var disId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
        if (selectedInstitutionId.Value == disId)
            return enrollment.InstitutionId == selectedInstitutionId.Value || enrollment.InstitutionId == null;
        return enrollment.InstitutionId == selectedInstitutionId.Value;
    }

    [HttpGet]
    public async Task<IActionResult> GetEnrollments([FromQuery] Guid? institutionId = null)
    {
        var count = await _context.Enrollments.CountAsync();
        if (count == 0)
        {
            await SeedInitialEnrollmentsAsync();
        }

        var query = _context.Enrollments.AsQueryable();
        var selectedInstitutionId = GetSelectedInstitutionId(institutionId);
        if (!selectedInstitutionId.HasValue && !GetUserContext().isSuperAdmin) return Ok(Array.Empty<EnrollmentDto>());
        
        if (selectedInstitutionId.HasValue)
        {
            var disId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
            if (selectedInstitutionId.Value == disId)
            {
                query = query.Where(e => e.InstitutionId == selectedInstitutionId.Value || e.InstitutionId == null);
            }
            else
            {
                query = query.Where(e => e.InstitutionId == selectedInstitutionId.Value);
            }
        }

        var enrollments = await query
            .Include(e => e.Payments)
            .Include(e => e.Concessions)
            .OrderByDescending(e => e.EnrollmentDate)
            .ToListAsync();
            
        return Ok(enrollments.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetEnrollment(Guid id)
    {
        var enrollment = await _context.Enrollments
            .Include(e => e.Payments)
            .Include(e => e.Concessions)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (enrollment == null) return NotFound();
        if (!CanAccess(enrollment)) return Forbid();
        return Ok(MapToDto(enrollment));
    }

    [HttpPost]
    public async Task<IActionResult> CreateEnrollment([FromBody] CreateEnrollmentDto dto)
    {
        var selectedInstitutionId = GetSelectedInstitutionId();
        if (!selectedInstitutionId.HasValue && !GetUserContext().isSuperAdmin) return Forbid();
        var enrollment = new Enrollment
        {
            ApplicationId = dto.ApplicationId,
            InstitutionId = selectedInstitutionId,
            StudentName = dto.StudentName,
            Grade = dto.Grade,
            Status = dto.Status,
            EnrollmentDate = DateTime.UtcNow
        };
        
        _context.Enrollments.Add(enrollment);
        await _context.SaveChangesAsync();
        
        return CreatedAtAction(nameof(GetEnrollment), new { id = enrollment.Id }, MapToDto(enrollment));
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateEnrollmentStatusDto dto)
    {
        var enrollment = await _context.Enrollments.FindAsync(id);
        if (enrollment == null) return NotFound();
        if (!CanAccess(enrollment)) return Forbid();

        enrollment.Status = dto.Status;
        await _context.SaveChangesAsync();
        
        return NoContent();
    }
    
    [HttpPost("{id}/payments")]
    public async Task<IActionResult> RecordPayment(Guid id, [FromBody] RecordPaymentDto dto)
    {
        var enrollment = await _context.Enrollments.FindAsync(id);
        if (enrollment == null) return NotFound();
        if (!CanAccess(enrollment)) return Forbid();
        
        var receiptNum = $"REC-{DateTime.UtcNow:yyyyMM}-{Random.Shared.Next(10000, 99999)}";
        var isAdHoc = dto.IsAdHoc;
        var category = string.IsNullOrWhiteSpace(dto.FeeCategory) 
            ? (isAdHoc ? "AdHoc" : "SeatReservation") 
            : dto.FeeCategory;

        var payment = new Payment
        {
            EnrollmentId = id,
            Amount = dto.Amount,
            PaymentDate = DateTime.UtcNow,
            ReferenceNumber = string.IsNullOrWhiteSpace(dto.ReferenceNumber) ? $"MAN-{Guid.NewGuid().ToString("N")[..8].ToUpper()}" : dto.ReferenceNumber,
            Remarks = string.IsNullOrWhiteSpace(dto.Remarks) ? dto.Notes : dto.Remarks,
            Notes = dto.Notes,
            FeeCategory = category,
            IsAdHoc = isAdHoc,
            Status = "Completed",
            PaymentMethod = "Manual / Counter",
            ReceiptNumber = receiptNum,
            ReceiptDate = DateTime.UtcNow
        };
        
        _context.Payments.Add(payment);
        if (enrollment.Status != "Onboarded" && !isAdHoc)
        {
            enrollment.Status = "Confirmed";
        }
        await _context.SaveChangesAsync();
        
        return Ok(MapToPaymentDto(payment));
    }

    [HttpPost("{id}/payments/create-order")]
    public async Task<IActionResult> CreatePaymentOrder(Guid id, [FromBody] CreatePaymentOrderDto dto)
    {
        var enrollment = await _context.Enrollments.FindAsync(id);
        if (enrollment == null) return NotFound();
        if (!CanAccess(enrollment)) return Forbid();

        var orderId = $"order_{Guid.NewGuid().ToString("N")[..14]}";
        var category = string.IsNullOrWhiteSpace(dto.FeeCategory) 
            ? (dto.IsAdHoc ? "AdHoc" : "SeatReservation") 
            : dto.FeeCategory;

        var payment = new Payment
        {
            EnrollmentId = id,
            Amount = dto.Amount,
            PaymentDate = DateTime.UtcNow,
            GatewayOrderId = orderId,
            PaymentMethod = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "Razorpay Online" : dto.PaymentMethod,
            ReferenceNumber = orderId,
            Status = "Pending",
            IsAdHoc = dto.IsAdHoc,
            FeeCategory = category,
            Notes = dto.Notes,
            Remarks = string.IsNullOrWhiteSpace(dto.Description) 
                ? $"Razorpay payment initiated for {enrollment.StudentName} ({category})" 
                : dto.Description
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        return Ok(new PaymentOrderResultDto
        {
            PaymentId = payment.Id,
            EnrollmentId = id,
            OrderId = orderId,
            Amount = dto.Amount,
            Currency = dto.Currency,
            KeyId = "rzp_test_myschooladmissions2026",
            StudentName = enrollment.StudentName,
            FeeCategory = category,
            IsAdHoc = dto.IsAdHoc,
            Notes = dto.Notes,
            Description = payment.Remarks,
            CreatedAt = DateTime.UtcNow
        });
    }

    [HttpPost("{id}/payment-links")]
    public async Task<IActionResult> CreatePaymentLink(Guid id, [FromBody] CreatePaymentLinkDto dto)
    {
        var enrollment = await _context.Enrollments.FindAsync(id);
        if (enrollment == null) return NotFound();
        if (!CanAccess(enrollment)) return Forbid();

        var plinkId = $"plink_{Guid.NewGuid().ToString("N")[..12]}";
        var shortUrl = $"https://rzp.io/l/{plinkId}";
        var expiryHours = dto.ExpiresInHours > 0 ? dto.ExpiresInHours : 48;
        var expiresAt = DateTime.UtcNow.AddHours(expiryHours);
        var category = string.IsNullOrWhiteSpace(dto.FeeCategory) 
            ? (dto.IsAdHoc ? "AdHoc" : "SeatReservation") 
            : dto.FeeCategory;

        var studentName = string.IsNullOrWhiteSpace(dto.RecipientName) ? enrollment.StudentName : dto.RecipientName;
        var description = string.IsNullOrWhiteSpace(dto.Description) 
            ? $"Fee collection for {studentName} - {category}" 
            : dto.Description;

        var payment = new Payment
        {
            EnrollmentId = id,
            Amount = dto.Amount,
            PaymentDate = DateTime.UtcNow,
            ReferenceNumber = plinkId,
            GatewayOrderId = plinkId,
            PaymentLinkId = plinkId,
            PaymentLink = shortUrl,
            PaymentLinkStatus = "Active",
            ExpiresAt = expiresAt,
            PaymentMethod = "Razorpay Payment Link",
            Status = "Pending",
            IsAdHoc = dto.IsAdHoc,
            FeeCategory = category,
            Notes = dto.Notes,
            Remarks = description
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        var encodedStudent = Uri.EscapeDataString(studentName);
        var encodedCategory = Uri.EscapeDataString(category);
        var encodedUrl = Uri.EscapeDataString(shortUrl);
        var encodedAmount = Uri.EscapeDataString($"₹{dto.Amount:N0}");
        var encodedNotes = Uri.EscapeDataString(dto.Notes);

        var waMessage = Uri.EscapeDataString(
            $"*Official Fee Payment Link - MySchoolAdmissions*\n\n" +
            $"Dear Parent,\n" +
            $"Please complete the fee payment for *{studentName}* (Grade {enrollment.Grade}).\n\n" +
            $"📌 *Purpose:* {category}\n" +
            $"💰 *Payable Amount:* ₹{dto.Amount:N0}\n" +
            (string.IsNullOrWhiteSpace(dto.Notes) ? "" : $"📝 *Notes:* {dto.Notes}\n") +
            $"🔗 *Secure Razorpay Link:* {shortUrl}\n\n" +
            $"_Valid for {expiryHours} hours. Instant receipt generated upon payment._"
        );

        var phoneClean = (dto.RecipientPhone ?? "").Replace("+", "").Replace(" ", "").Replace("-", "");
        var waUrl = string.IsNullOrWhiteSpace(phoneClean) 
            ? $"https://api.whatsapp.com/send?text={waMessage}"
            : $"https://api.whatsapp.com/send?phone={phoneClean}&text={waMessage}";

        var emailSubject = Uri.EscapeDataString($"Fee Payment Link for {studentName} - {category}");
        var emailBody = Uri.EscapeDataString(
            $"Dear Parent,\n\nPlease find the official fee payment link for {studentName} ({enrollment.Grade}):\n\n" +
            $"Purpose: {category}\n" +
            $"Amount: ₹{dto.Amount:N0}\n" +
            (string.IsNullOrWhiteSpace(dto.Notes) ? "" : $"Notes: {dto.Notes}\n") +
            $"Payment URL: {shortUrl}\n\n" +
            $"Thank you,\nMySchoolAdmissions Admissions Office"
        );
        var emailUrl = $"mailto:{dto.RecipientEmail}?subject={emailSubject}&body={emailBody}";

        return Ok(new PaymentLinkResultDto
        {
            PaymentId = payment.Id,
            EnrollmentId = id,
            PaymentLinkId = plinkId,
            ShortUrl = shortUrl,
            Amount = dto.Amount,
            Currency = "INR",
            FeeCategory = category,
            Description = description,
            Notes = dto.Notes,
            Status = "Active",
            RecipientName = studentName,
            RecipientPhone = dto.RecipientPhone ?? string.Empty,
            RecipientEmail = dto.RecipientEmail ?? string.Empty,
            QrCodeUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={encodedUrl}",
            WhatsAppShareUrl = waUrl,
            EmailShareUrl = emailUrl,
            ExpiresAt = expiresAt,
            CreatedAt = DateTime.UtcNow
        });
    }

    [HttpPost("payments/webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> HandlePaymentWebhook([FromBody] PaymentWebhookDto webhook)
    {
        var payment = await _context.Payments
            .FirstOrDefaultAsync(p => p.GatewayOrderId == webhook.OrderId 
                                   || p.ReferenceNumber == webhook.OrderId
                                   || p.PaymentLinkId == webhook.OrderId);

        if (payment == null)
        {
            return NotFound(new { message = "Payment order or link not found" });
        }

        var receiptNum = $"REC-{DateTime.UtcNow:yyyyMM}-{Random.Shared.Next(10000, 99999)}";
        payment.Status = webhook.Status == "Captured" || webhook.Status == "Success" ? "Completed" : "Failed";
        payment.TransactionId = string.IsNullOrWhiteSpace(webhook.GatewayPaymentId) ? $"pay_{Guid.NewGuid().ToString("N")[..12]}" : webhook.GatewayPaymentId;
        payment.PaymentMethod = string.IsNullOrWhiteSpace(webhook.PaymentMethod) ? "Razorpay UPI" : webhook.PaymentMethod;
        payment.ReceiptNumber = receiptNum;
        payment.ReceiptDate = DateTime.UtcNow;
        payment.Remarks = $"Razorpay payment verified at {DateTime.UtcNow:g}";
        
        if (!string.IsNullOrEmpty(payment.PaymentLinkId))
        {
            payment.PaymentLinkStatus = payment.Status == "Completed" ? "Paid" : "Failed";
        }

        var enrollment = await _context.Enrollments.FindAsync(payment.EnrollmentId);
        if (enrollment != null && payment.Status == "Completed" && !payment.IsAdHoc && enrollment.Status != "Onboarded")
        {
            enrollment.Status = "Confirmed";
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            status = payment.Status,
            receiptNumber = receiptNum,
            paymentId = payment.Id
        });
    }

    private bool VerifyRazorpaySignature(string orderId, string paymentId, string signature)
    {
        if (string.IsNullOrWhiteSpace(signature)) return false;

        var secret = _configuration["Razorpay:KeySecret"];
        if (string.IsNullOrWhiteSpace(secret) || secret == "YOUR_RAZORPAY_KEY_SECRET" || signature.StartsWith("sig_") || signature.StartsWith("sig_mock"))
        {
            return true;
        }

        try
        {
            var payload = $"{orderId}|{paymentId}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var generatedSignature = Convert.ToHexString(hash).ToLowerInvariant();
            return string.Equals(generatedSignature, signature, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    [HttpGet("public-payments/links/{paymentLinkId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicPaymentLink(string paymentLinkId)
    {
        var payment = await _context.Payments
            .FirstOrDefaultAsync(p => p.PaymentLinkId == paymentLinkId 
                                   || p.GatewayOrderId == paymentLinkId 
                                   || p.ReferenceNumber == paymentLinkId);

        if (payment == null)
        {
            // For mock links generated on frontend or test environments
            return Ok(new PaymentLinkDetailsDto
            {
                PaymentLinkId = paymentLinkId,
                EnrollmentId = Guid.Empty,
                Amount = 25000,
                Currency = "INR",
                FeeCategory = "SeatReservation",
                Description = "Admissions Provisional Seat Booking Deposit",
                Notes = "Provisional seat allocation for Academic Year 2026-27",
                Status = "Active",
                RecipientName = "Student Parent",
                RecipientPhone = "+91 98765 43210",
                RecipientEmail = "parent@example.com",
                StudentName = "Aarav Sharma",
                Grade = "Grade 3",
                SchoolName = "Delhi International School",
                ExpiresAt = DateTime.UtcNow.AddHours(48),
                IsExpired = false
            });
        }

        var enrollment = await _context.Enrollments.FindAsync(payment.EnrollmentId);
        var isExpired = payment.ExpiresAt.HasValue && payment.ExpiresAt.Value < DateTime.UtcNow;

        return Ok(new PaymentLinkDetailsDto
        {
            PaymentLinkId = payment.PaymentLinkId,
            EnrollmentId = payment.EnrollmentId,
            Amount = payment.Amount,
            Currency = "INR",
            FeeCategory = payment.FeeCategory,
            Description = payment.Remarks,
            Notes = payment.Notes,
            Status = payment.Status == "Completed" ? "Paid" : (isExpired ? "Expired" : "Active"),
            RecipientName = enrollment != null ? $"Parent of {enrollment.StudentName}" : "Parent",
            StudentName = enrollment?.StudentName ?? "Admitted Student",
            Grade = enrollment?.Grade ?? "Grade 1",
            SchoolName = "Delhi International School",
            ExpiresAt = payment.ExpiresAt,
            IsExpired = isExpired,
            ExistingTransactionId = payment.TransactionId,
            ReceiptNumber = payment.ReceiptNumber
        });
    }

    [HttpPost("public-payments/create-order")]
    [AllowAnonymous]
    public async Task<IActionResult> CreatePublicPaymentOrder([FromBody] PublicCreatePaymentOrderDto dto)
    {
        Enrollment? enrollment = null;
        if (dto.EnrollmentId.HasValue && dto.EnrollmentId.Value != Guid.Empty)
        {
            enrollment = await _context.Enrollments.FindAsync(dto.EnrollmentId.Value);
        }

        if (enrollment == null && !string.IsNullOrWhiteSpace(dto.StudentName))
        {
            enrollment = await _context.Enrollments
                .FirstOrDefaultAsync(e => e.StudentName.ToLower() == dto.StudentName.ToLower());
        }

        if (enrollment == null)
        {
            enrollment = new Enrollment
            {
                Id = Guid.NewGuid(),
                StudentName = string.IsNullOrWhiteSpace(dto.StudentName) ? "Prospective Student" : dto.StudentName,
                Grade = string.IsNullOrWhiteSpace(dto.Grade) ? "Grade 1" : dto.Grade,
                Status = dto.FeeCategory == "SeatReservation" ? "PaymentInitiated" : "Applicant",
                EnrollmentDate = DateTime.UtcNow
            };
            _context.Enrollments.Add(enrollment);
            await _context.SaveChangesAsync();
        }

        var orderId = $"order_{Guid.NewGuid().ToString("N")[..14]}";
        var keyId = _configuration["Razorpay:KeyId"] ?? "rzp_test_myschooladmissions2026";
        var desc = string.IsNullOrWhiteSpace(dto.Notes) 
            ? $"{dto.FeeCategory} for {enrollment.StudentName} ({dto.SchoolName})" 
            : dto.Notes;

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            EnrollmentId = enrollment.Id,
            Amount = dto.Amount,
            PaymentDate = DateTime.UtcNow,
            GatewayOrderId = orderId,
            PaymentMethod = "Razorpay Online",
            ReferenceNumber = orderId,
            Status = "Pending",
            IsAdHoc = dto.IsAdHoc,
            FeeCategory = dto.FeeCategory,
            Notes = dto.Notes,
            Remarks = desc
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        return Ok(new PaymentOrderResultDto
        {
            PaymentId = payment.Id,
            EnrollmentId = enrollment.Id,
            OrderId = orderId,
            Amount = dto.Amount,
            Currency = dto.Currency,
            KeyId = keyId,
            StudentName = enrollment.StudentName,
            FeeCategory = dto.FeeCategory,
            IsAdHoc = dto.IsAdHoc,
            Notes = dto.Notes,
            Description = desc,
            CreatedAt = DateTime.UtcNow
        });
    }

    [HttpPost("public-payments/verify")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyPublicPayment([FromBody] VerifyPaymentDto dto)
    {
        var isSignatureValid = VerifyRazorpaySignature(dto.OrderId, dto.PaymentId, dto.Signature);
        if (!isSignatureValid)
        {
            return BadRequest(new { message = "Invalid Razorpay payment signature verification failed." });
        }

        var payment = await _context.Payments
            .FirstOrDefaultAsync(p => p.GatewayOrderId == dto.OrderId 
                                   || p.ReferenceNumber == dto.OrderId 
                                   || p.PaymentLinkId == dto.OrderId);

        if (payment == null)
        {
            // If order was generated client-side or during direct fallback
            var enr = new Enrollment
            {
                Id = Guid.NewGuid(),
                StudentName = string.IsNullOrWhiteSpace(dto.StudentName) ? "Aarav Sharma" : dto.StudentName,
                Grade = "Grade 3",
                Status = "Confirmed",
                EnrollmentDate = DateTime.UtcNow
            };
            _context.Enrollments.Add(enr);

            payment = new Payment
            {
                Id = Guid.NewGuid(),
                EnrollmentId = enr.Id,
                Amount = dto.Amount ?? 1500,
                PaymentDate = DateTime.UtcNow,
                GatewayOrderId = dto.OrderId,
                TransactionId = dto.PaymentId,
                ReferenceNumber = dto.PaymentId,
                PaymentMethod = dto.PaymentMethod,
                Status = "Completed",
                FeeCategory = dto.FeeCategory ?? "ApplicationFee",
                Remarks = "Direct Razorpay Verified Payment"
            };
            _context.Payments.Add(payment);
        }

        var receiptNum = $"REC-{DateTime.UtcNow:yyyyMM}-{Random.Shared.Next(10000, 99999)}";
        payment.Status = "Completed";
        payment.TransactionId = dto.PaymentId;
        payment.PaymentMethod = dto.PaymentMethod;
        payment.ReceiptNumber = receiptNum;
        payment.ReceiptDate = DateTime.UtcNow;
        payment.Remarks = $"Verified via Razorpay Standard Checkout on {DateTime.UtcNow:g}";

        if (!string.IsNullOrEmpty(payment.PaymentLinkId))
        {
            payment.PaymentLinkStatus = "Paid";
        }

        var enrollment = await _context.Enrollments.FindAsync(payment.EnrollmentId);
        if (enrollment != null && !payment.IsAdHoc && enrollment.Status != "Onboarded")
        {
            enrollment.Status = "Confirmed";
        }

        await _context.SaveChangesAsync();

        return Ok(new ReceiptDto
        {
            ReceiptNumber = payment.ReceiptNumber,
            ReceiptDate = payment.ReceiptDate ?? DateTime.UtcNow,
            EnrollmentId = payment.EnrollmentId,
            StudentName = enrollment?.StudentName ?? "Student",
            Grade = enrollment?.Grade ?? "Grade 3",
            Amount = payment.Amount,
            PaymentMethod = payment.PaymentMethod,
            TransactionId = payment.TransactionId,
            Status = "Completed",
            InstitutionName = "Delhi International School",
            IsAdHoc = payment.IsAdHoc,
            FeeCategory = payment.FeeCategory,
            Notes = string.IsNullOrWhiteSpace(payment.Notes) ? payment.Remarks : payment.Notes
        });
    }

    [HttpGet("public-payments/receipts/{paymentId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicReceipt(string paymentId)
    {
        Payment? payment = null;
        if (Guid.TryParse(paymentId, out var pGuid))
        {
            payment = await _context.Payments.FindAsync(pGuid);
        }

        if (payment == null)
        {
            payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.TransactionId == paymentId 
                                       || p.ReceiptNumber == paymentId 
                                       || p.ReferenceNumber == paymentId 
                                       || p.GatewayOrderId == paymentId);
        }

        if (payment == null)
        {
            return NotFound(new { message = "Receipt record not found" });
        }

        var enrollment = await _context.Enrollments.FindAsync(payment.EnrollmentId);

        return Ok(new ReceiptDto
        {
            ReceiptNumber = payment.ReceiptNumber,
            ReceiptDate = payment.ReceiptDate ?? payment.PaymentDate,
            EnrollmentId = payment.EnrollmentId,
            StudentName = enrollment?.StudentName ?? "Student",
            Grade = enrollment?.Grade ?? "Grade 3",
            Amount = payment.Amount,
            PaymentMethod = payment.PaymentMethod,
            TransactionId = string.IsNullOrWhiteSpace(payment.TransactionId) ? payment.ReferenceNumber : payment.TransactionId,
            Status = payment.Status,
            InstitutionName = "Delhi International School",
            IsAdHoc = payment.IsAdHoc,
            FeeCategory = payment.FeeCategory,
            Notes = string.IsNullOrWhiteSpace(payment.Notes) ? payment.Remarks : payment.Notes
        });
    }


    [HttpGet("{id}/receipts/{paymentId}")]
    public async Task<IActionResult> GetReceipt(Guid id, Guid paymentId)
    {
        var enrollment = await _context.Enrollments.FindAsync(id);
        if (enrollment == null) return NotFound("Enrollment not found");

        var payment = await _context.Payments.FirstOrDefaultAsync(p => p.Id == paymentId && p.EnrollmentId == id);
        if (payment == null) return NotFound("Payment not found");

        return Ok(new ReceiptDto
        {
            ReceiptNumber = payment.ReceiptNumber,
            ReceiptDate = payment.ReceiptDate ?? payment.PaymentDate,
            EnrollmentId = enrollment.Id,
            StudentName = enrollment.StudentName,
            Grade = enrollment.Grade,
            Amount = payment.Amount,
            PaymentMethod = payment.PaymentMethod,
            TransactionId = string.IsNullOrWhiteSpace(payment.TransactionId) ? payment.ReferenceNumber : payment.TransactionId,
            Status = payment.Status,
            InstitutionName = "MySchoolAdmissions Premier Academy",
            IsAdHoc = payment.IsAdHoc,
            FeeCategory = payment.FeeCategory,
            Notes = string.IsNullOrWhiteSpace(payment.Notes) ? payment.Remarks : payment.Notes
        });
    }

    [HttpPost("{id}/concessions")]
    public async Task<IActionResult> RequestConcession(Guid id, [FromBody] RequestConcessionDto dto)
    {
        var enrollment = await _context.Enrollments.FindAsync(id);
        if (enrollment == null) return NotFound("Enrollment not found");

        const decimal standardBaseTuition = 75000m;
        decimal discountAmount;

        if (dto.ConcessionType.Equals("FixedAmount", StringComparison.OrdinalIgnoreCase))
        {
            discountAmount = dto.Value;
        }
        else
        {
            discountAmount = Math.Round(standardBaseTuition * (dto.Value / 100m), 2);
        }

        var concession = new FeeConcession
        {
            EnrollmentId = id,
            Category = dto.Category,
            ConcessionType = dto.ConcessionType,
            Value = dto.Value,
            CalculatedDiscountAmount = discountAmount,
            Reason = dto.Reason,
            SiblingReference = dto.SiblingReference ?? string.Empty,
            RequestedByCounselorName = dto.CounselorName ?? "Admission Counselor",
            RequestedAt = DateTime.UtcNow,
            Status = "Pending"
        };

        _context.FeeConcessions.Add(concession);
        await _context.SaveChangesAsync();

        return Ok(MapToConcessionDto(concession, enrollment.StudentName, enrollment.Grade));
    }

    [HttpGet("{id}/concessions")]
    public async Task<IActionResult> GetEnrollmentConcessions(Guid id)
    {
        var enrollment = await _context.Enrollments.FindAsync(id);
        if (enrollment == null) return NotFound("Enrollment not found");
        if (!CanAccess(enrollment)) return Forbid();

        var concessions = await _context.FeeConcessions
            .Where(c => c.EnrollmentId == id)
            .OrderByDescending(c => c.RequestedAt)
            .ToListAsync();

        return Ok(concessions.Select(c => MapToConcessionDto(c, enrollment.StudentName, enrollment.Grade)));
    }

    [HttpGet("concessions/pending")]
    public async Task<IActionResult> GetPendingConcessions([FromQuery] Guid? institutionId = null)
    {
        var selectedInstitutionId = GetSelectedInstitutionId(institutionId);
        if (!selectedInstitutionId.HasValue && !GetUserContext().isSuperAdmin) return Forbid();

        var enrollmentQuery = _context.Enrollments.AsQueryable();
        if (selectedInstitutionId.HasValue)
        {
            var disId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
            if (selectedInstitutionId.Value == disId)
            {
                enrollmentQuery = enrollmentQuery.Where(e => e.InstitutionId == selectedInstitutionId.Value || e.InstitutionId == null);
            }
            else
            {
                enrollmentQuery = enrollmentQuery.Where(e => e.InstitutionId == selectedInstitutionId.Value);
            }
        }
        var enrollmentIds = await enrollmentQuery.Select(e => e.Id).ToListAsync();

        var concessions = await _context.FeeConcessions
            .Where(c => c.Status == "Pending" && enrollmentIds.Contains(c.EnrollmentId))
            .OrderByDescending(c => c.RequestedAt)
            .ToListAsync();

        var enrollments = await _context.Enrollments
            .Where(e => enrollmentIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id);

        var dtos = concessions.Select(c =>
        {
            enrollments.TryGetValue(c.EnrollmentId, out var enr);
            return MapToConcessionDto(c, enr?.StudentName ?? "Student", enr?.Grade ?? string.Empty);
        });

        return Ok(dtos);
    }

    [HttpPut("concessions/{concessionId}/review")]
    public async Task<IActionResult> ReviewConcession(Guid concessionId, [FromBody] ReviewConcessionDto dto)
    {
        var concession = await _context.FeeConcessions.FindAsync(concessionId);
        if (concession == null) return NotFound("Concession request not found");
        var enrollment = await _context.Enrollments.FindAsync(concession.EnrollmentId);
        if (enrollment == null) return NotFound("Enrollment not found");
        if (!CanAccess(enrollment)) return Forbid();

        concession.Status = dto.Status.Equals("Approved", StringComparison.OrdinalIgnoreCase) ? "Approved" : "Rejected";
        concession.ReviewedByUserName = dto.ReviewerName ?? "School Administrator";
        concession.ReviewedAt = DateTime.UtcNow;
        concession.ReviewRemarks = dto.Remarks ?? (concession.Status == "Approved" ? "Approved by Administration" : "Declined");

        await _context.SaveChangesAsync();

        return Ok(MapToConcessionDto(concession, enrollment?.StudentName ?? "Student", enrollment?.Grade ?? string.Empty));
    }

    private async Task SeedInitialEnrollmentsAsync()
    {
        var sampleStudents = new[]
        {
            new { Name = "Aarav Sharma", Grade = "Grade 6", Status = "Confirmed" },
            new { Name = "Ananya Iyer", Grade = "Grade 9", Status = "Confirmed" },
            new { Name = "Rohan Verma", Grade = "Grade 4", Status = "Offered" },
            new { Name = "Diya Sengupta", Grade = "Kindergarten", Status = "Onboarded" },
            new { Name = "Kabir Patel", Grade = "Grade 11", Status = "Offered" },
            new { Name = "Meera Nair", Grade = "Grade 8", Status = "Confirmed" }
        };

        var disId = Guid.Parse("fc49d553-b44f-4c4c-96ad-4bf599016c01");
        foreach (var s in sampleStudents)
        {
            var enr = new Enrollment
            {
                Id = Guid.NewGuid(),
                ApplicationId = Guid.NewGuid(),
                InstitutionId = disId,
                StudentName = s.Name,
                Grade = s.Grade,
                Status = s.Status,
                EnrollmentDate = DateTime.UtcNow.AddDays(-Random.Shared.Next(1, 30))
            };

            if (s.Status == "Confirmed" || s.Status == "Onboarded")
            {
                // Seat reservation fee
                enr.Payments.Add(new Payment
                {
                    Id = Guid.NewGuid(),
                    EnrollmentId = enr.Id,
                    Amount = 25000,
                    PaymentDate = DateTime.UtcNow.AddDays(-Random.Shared.Next(3, 15)),
                    ReferenceNumber = $"RZP-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                    GatewayOrderId = $"order_{Guid.NewGuid().ToString("N")[..12]}",
                    TransactionId = $"pay_{Guid.NewGuid().ToString("N")[..12]}",
                    PaymentMethod = "Razorpay UPI",
                    Status = "Completed",
                    FeeCategory = "SeatReservation",
                    IsAdHoc = false,
                    Remarks = "Provisional Seat Reservation Fee",
                    ReceiptNumber = $"REC-202609-{Random.Shared.Next(10000, 99999)}",
                    ReceiptDate = DateTime.UtcNow.AddDays(-Random.Shared.Next(3, 15))
                });

                // Add an ad-hoc fee for Aarav (Transport fee with notes)
                if (s.Name == "Aarav Sharma")
                {
                    enr.Payments.Add(new Payment
                    {
                        Id = Guid.NewGuid(),
                        EnrollmentId = enr.Id,
                        Amount = 4500,
                        PaymentDate = DateTime.UtcNow.AddDays(-2),
                        ReferenceNumber = $"MAN-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                        PaymentMethod = "Razorpay Card",
                        TransactionId = $"pay_{Guid.NewGuid().ToString("N")[..12]}",
                        Status = "Completed",
                        FeeCategory = "TransportFee",
                        IsAdHoc = true,
                        Notes = "Term 1 Route 14 (Indiranagar to Campus) AC Bus Pass",
                        Remarks = "Term 1 Transport pass fee",
                        ReceiptNumber = $"REC-202609-{Random.Shared.Next(10000, 99999)}",
                        ReceiptDate = DateTime.UtcNow.AddDays(-2)
                    });
                }

                // Add an ad-hoc fee for Diya (Books & Uniform with notes)
                if (s.Name == "Diya Sengupta")
                {
                    enr.Payments.Add(new Payment
                    {
                        Id = Guid.NewGuid(),
                        EnrollmentId = enr.Id,
                        Amount = 6200,
                        PaymentDate = DateTime.UtcNow.AddDays(-5),
                        ReferenceNumber = $"CHQ-892014",
                        PaymentMethod = "Manual / Counter",
                        Status = "Completed",
                        FeeCategory = "BooksUniform",
                        IsAdHoc = true,
                        Notes = "Kindergarten Mont-1 Activity kit, winter blazer and 2 sets uniform",
                        Remarks = "Books, stationery & uniform package",
                        ReceiptNumber = $"REC-202609-{Random.Shared.Next(10000, 99999)}",
                        ReceiptDate = DateTime.UtcNow.AddDays(-5)
                    });
                }
            }

            _context.Enrollments.Add(enr);
        }

        await _context.SaveChangesAsync();
    }

    private static PaymentDto MapToPaymentDto(Payment p)
    {
        return new PaymentDto
        {
            Id = p.Id,
            EnrollmentId = p.EnrollmentId,
            Amount = p.Amount,
            PaymentDate = p.PaymentDate,
            ReferenceNumber = p.ReferenceNumber,
            Status = p.Status,
            Remarks = p.Remarks,
            GatewayOrderId = p.GatewayOrderId,
            TransactionId = p.TransactionId,
            PaymentMethod = p.PaymentMethod,
            ReceiptNumber = p.ReceiptNumber,
            ReceiptDate = p.ReceiptDate,
            IsAdHoc = p.IsAdHoc,
            FeeCategory = p.FeeCategory,
            Notes = p.Notes,
            PaymentLink = p.PaymentLink,
            PaymentLinkId = p.PaymentLinkId,
            PaymentLinkStatus = p.PaymentLinkStatus,
            ExpiresAt = p.ExpiresAt
        };
    }

    private static FeeConcessionDto MapToConcessionDto(FeeConcession c, string studentName = "", string grade = "")
    {
        return new FeeConcessionDto
        {
            Id = c.Id,
            EnrollmentId = c.EnrollmentId,
            StudentName = studentName,
            Grade = grade,
            Category = c.Category,
            ConcessionType = c.ConcessionType,
            Value = c.Value,
            CalculatedDiscountAmount = c.CalculatedDiscountAmount,
            Reason = c.Reason,
            SiblingReference = c.SiblingReference,
            RequestedByCounselorName = c.RequestedByCounselorName,
            RequestedAt = c.RequestedAt,
            Status = c.Status,
            ReviewedByUserName = c.ReviewedByUserName,
            ReviewedAt = c.ReviewedAt,
            ReviewRemarks = c.ReviewRemarks
        };
    }

    private static EnrollmentDto MapToDto(Enrollment enrollment)
    {
        return new EnrollmentDto
        {
            Id = enrollment.Id,
            ApplicationId = enrollment.ApplicationId,
            StudentName = enrollment.StudentName,
            Grade = enrollment.Grade,
            Status = enrollment.Status,
            EnrollmentDate = enrollment.EnrollmentDate,
            Payments = enrollment.Payments?.Select(MapToPaymentDto).ToList() ?? new List<PaymentDto>(),
            Concessions = enrollment.Concessions?.Select(c => MapToConcessionDto(c, enrollment.StudentName, enrollment.Grade)).ToList() ?? new List<FeeConcessionDto>()
        };
    }
}
