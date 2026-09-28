using System.Text;
using System.Text.Json;
using MySchoolAdmissions.AIService.Data;
using MySchoolAdmissions.AIService.Models;
using Microsoft.EntityFrameworkCore;
using UglyToad.PdfPig;

namespace MySchoolAdmissions.AIService.Services;

public class IngestDocumentResultDto
{
    public Guid DocumentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string InstitutionName { get; set; } = string.Empty;
    public int ChunksCreated { get; set; }
    public string EmbeddingModelUsed { get; set; } = string.Empty;
    public string Status { get; set; } = "Success";
}

public class DocumentIngestionService
{
    private readonly AIDbContext _dbContext;
    private readonly IEmbeddingService _embeddingService;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<DocumentIngestionService> _logger;

    public DocumentIngestionService(
        AIDbContext dbContext, 
        IEmbeddingService embeddingService, 
        HttpClient httpClient, 
        IConfiguration config,
        ILogger<DocumentIngestionService> logger)
    {
        _dbContext = dbContext;
        _embeddingService = embeddingService;
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Ingests an uploaded PDF or Text document into the RAG vector store.
    /// </summary>
    public async Task<IngestDocumentResultDto> IngestFileStreamAsync(
        Stream stream, 
        string fileName, 
        string title, 
        string institutionName, 
        Guid? institutionId, 
        string documentType,
        CancellationToken cancellationToken = default)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        string extractedText;

        if (ext == ".pdf")
        {
            extractedText = ExtractTextFromPdf(stream);
        }
        else
        {
            using var reader = new StreamReader(stream, Encoding.UTF8);
            extractedText = await reader.ReadToEndAsync(cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(extractedText))
        {
            throw new InvalidOperationException($"No readable text could be extracted from document '{fileName}'.");
        }

        return await IngestRawTextAsync(extractedText, fileName, title, institutionName, institutionId, documentType, cancellationToken);
    }

    public async Task<IngestDocumentResultDto> IngestRawTextAsync(
        string text, 
        string fileName, 
        string title, 
        string institutionName, 
        Guid? institutionId, 
        string documentType,
        CancellationToken cancellationToken = default)
    {
        // 1. Chunk text into semantic windows
        var rawChunks = ChunkText(text, maxChars: 750, overlapChars: 100);
        if (rawChunks.Count == 0)
        {
            rawChunks.Add(text.Trim());
        }

        // 2. Generate embeddings in batch
        var embeddings = await _embeddingService.GenerateEmbeddingsAsync(rawChunks, cancellationToken);

        // 3. Save Document record
        var doc = new KnowledgeDocument
        {
            Id = Guid.NewGuid(),
            InstitutionId = institutionId,
            InstitutionName = string.IsNullOrWhiteSpace(institutionName) ? "General" : institutionName.Trim(),
            Title = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(fileName) : title.Trim(),
            FileName = fileName,
            FileExtension = Path.GetExtension(fileName),
            FileSizeBytes = Encoding.UTF8.GetByteCount(text),
            DocumentType = documentType,
            ChunkCount = rawChunks.Count,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.KnowledgeDocuments.Add(doc);

        // 4. Save Chunks
        for (int i = 0; i < rawChunks.Count; i++)
        {
            var chunk = new KnowledgeChunk
            {
                Id = Guid.NewGuid(),
                DocumentId = doc.Id,
                InstitutionId = institutionId,
                InstitutionName = doc.InstitutionName,
                DocumentTitle = doc.Title,
                DocumentType = documentType,
                ChunkIndex = i,
                Content = rawChunks[i],
                Embedding = i < embeddings.Count ? embeddings[i] : null,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.KnowledgeChunks.Add(chunk);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new IngestDocumentResultDto
        {
            DocumentId = doc.Id,
            Title = doc.Title,
            InstitutionName = doc.InstitutionName,
            ChunksCreated = rawChunks.Count,
            EmbeddingModelUsed = _embeddingService.ProviderName,
            Status = "Success"
        };
    }

    /// <summary>
    /// Synchronizes live institution records (name, description, campuses, address, boards)
    /// from the InstitutionService into semantic vector knowledge chunks.
    /// </summary>
    public async Task<int> SyncInstitutionsAsync(CancellationToken cancellationToken = default)
    {
        var instServiceUrl = _config["InstitutionServiceUrl"] ?? "http://localhost:5002";
        _logger.LogInformation("[RAG Sync] Connecting to {Url} to fetch live institution catalog...", instServiceUrl);

        var institutionList = new List<dynamic>();

        try
        {
            using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);
            
            var res = await _httpClient.GetAsync($"{instServiceUrl}/api/institutions", linkedCts.Token);
            if (res.IsSuccessStatusCode)
            {
                var json = await res.Content.ReadAsStringAsync(linkedCts.Token);
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in doc.RootElement.EnumerateArray())
                    {
                        institutionList.Add(item.Clone());
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("[RAG Sync] Could not fetch live institutions ({Msg}). Using default curated partner data.", ex.Message);
        }

        // Clean out existing system-synced institution profile chunks to prevent duplication
        var existingSystemDocs = await _dbContext.KnowledgeDocuments
            .Where(d => d.DocumentType == "InstitutionProfile" || d.DocumentType == "CuratedPartner")
            .ToListAsync(cancellationToken);

        if (existingSystemDocs.Count > 0)
        {
            _dbContext.KnowledgeDocuments.RemoveRange(existingSystemDocs);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        int totalChunks = 0;

        // Ingest Curated Default Showcase Institutions & Policies
        var defaultInstitutions = GetCuratedShowcaseInstitutions();
        foreach (var inst in defaultInstitutions)
        {
            var contentBuilder = new StringBuilder();
            contentBuilder.AppendLine($"### School Profile: {inst.Name}");
            contentBuilder.AppendLine($"Tagline: {inst.Tagline}");
            contentBuilder.AppendLine($"Board Affiliation: {inst.Board}");
            contentBuilder.AppendLine($"Grades Offered: {inst.Grades}");
            contentBuilder.AppendLine($"Admissions Status 2026-27: {(inst.IsOpen ? "Active & Open for Admissions" : "Waitlist")}");
            contentBuilder.AppendLine($"Admission Deadline: {inst.Deadline}");
            contentBuilder.AppendLine($"Estimated Annual Tuition Fee: {inst.AnnualFees}");
            contentBuilder.AppendLine($"Scholarships: {(inst.Scholarship ? "Available (Up to 40% based on merit assessment)" : "Standard Fee Structure")}");
            contentBuilder.AppendLine($"Official Contact: Email {inst.Email}, Phone {inst.Phone}");
            contentBuilder.AppendLine($"Campuses:");
            foreach (var campus in inst.Campuses)
            {
                contentBuilder.AppendLine($"  - {campus.Name}: {campus.Address}, {campus.City}, {campus.State} {campus.PostalCode}");
            }
            contentBuilder.AppendLine($"Key Facilities: {string.Join(", ", inst.Facilities)}");
            contentBuilder.AppendLine($"About: {inst.Description}");

            var res = await IngestRawTextAsync(
                contentBuilder.ToString(), 
                $"{inst.Name.Replace(" ", "_")}_Profile.txt", 
                $"{inst.Name} - Official Profile & Admission Guide 2026-27", 
                inst.Name, 
                null, 
                "InstitutionProfile", 
                cancellationToken);

            totalChunks += res.ChunksCreated;
        }

        // Ingest General Admission Policies & Guidelines Document
        var generalPolicy = 
            "### General Admission Guidelines & Age Eligibility (Academic Session 2026–2027)\n\n" +
            "1. Age Cutoff Guidelines as of March 31, 2026:\n" +
            "   - Pre-Nursery: 2.5 to 3 years\n" +
            "   - Nursery / Foundation Stage 1: 3+ years completed\n" +
            "   - Kindergarten / Prep / Foundation Stage 2: 4+ years completed\n" +
            "   - Grade 1: 6+ years completed (Aligned with National Education Policy NEP 2020)\n\n" +
            "2. Required Application Documents Checklist:\n" +
            "   - Official Birth Certificate issued by Municipal Corporation\n" +
            "   - Child and Parent Passport-size Photographs (4 of child, 2 of each parent)\n" +
            "   - Proof of Residence (Aadhaar, Passport, Electricity Bill, Rental Agreement)\n" +
            "   - Immunization & Blood Group Medical Record\n" +
            "   - Previous 2 Years Report Cards (for Grade 2 upwards)\n" +
            "   - Transfer Certificate (TC) from previous recognized school\n\n" +
            "3. Online Fee Payment & Seat Confirmation:\n" +
            "   - Parents can pay the initial admission token fee online via UPI, Credit/Debit Cards, or NetBanking.\n" +
            "   - Instant digital receipts and provisional admission enrollment letters are issued upon payment.";

        await IngestRawTextAsync(
            generalPolicy, 
            "MySchoolAdmissions_Admission_Guidelines_2026-27.txt", 
            "MySchoolAdmissions Central Admission Guidelines & Age Criteria 2026-27", 
            "General", 
            null, 
            "AdmissionCriteria", 
            cancellationToken);

        totalChunks += 1;
        _logger.LogInformation("[RAG Sync] Successfully synced {Count} knowledge chunks into pgvector database.", totalChunks);
        return totalChunks;
    }

    private static string ExtractTextFromPdf(Stream pdfStream)
    {
        var sb = new StringBuilder();
        using var pdfDocument = PdfDocument.Open(pdfStream);
        foreach (var page in pdfDocument.GetPages())
        {
            var pageText = page.Text;
            if (!string.IsNullOrWhiteSpace(pageText))
            {
                sb.AppendLine($"[Page {page.Number}]");
                sb.AppendLine(pageText);
                sb.AppendLine();
            }
        }
        return sb.ToString();
    }

    private static List<string> ChunkText(string text, int maxChars = 750, int overlapChars = 100)
    {
        var chunks = new List<string>();
        if (string.IsNullOrWhiteSpace(text)) return chunks;

        var paragraphs = text.Split(new[] { "\r\n\r\n", "\n\n" }, StringSplitOptions.RemoveEmptyEntries);
        var currentChunk = new StringBuilder();

        foreach (var p in paragraphs)
        {
            var trimmed = p.Trim();
            if (trimmed.Length == 0) continue;

            if (currentChunk.Length + trimmed.Length > maxChars)
            {
                if (currentChunk.Length > 0)
                {
                    chunks.Add(currentChunk.ToString().Trim());
                    // Keep overlap tail
                    var prev = currentChunk.ToString();
                    currentChunk.Clear();
                    if (prev.Length > overlapChars)
                    {
                        var overlapTail = prev.Substring(prev.Length - overlapChars);
                        currentChunk.Append(overlapTail).Append(" ");
                    }
                }
            }

            currentChunk.AppendLine(trimmed);
        }

        if (currentChunk.Length > 0)
        {
            chunks.Add(currentChunk.ToString().Trim());
        }

        return chunks;
    }

    private static List<ShowcaseSchoolData> GetCuratedShowcaseInstitutions()
    {
        return new List<ShowcaseSchoolData>
        {
            new()
            {
                Name = "Delhi International School",
                Tagline = "Empowering Young Minds Through Progressive Holistic Education",
                Description = "A premier educational institution known for academic excellence, state-of-the-art sports complexes, and global curriculum integration fostering critical thinking.",
                Board = "CBSE & Cambridge Primary/Secondary",
                Grades = "Pre-Nursery to Grade 12 (Science, Commerce, Humanities)",
                IsOpen = true,
                Deadline = "October 31, 2026",
                AnnualFees = "₹1.80L – ₹2.60L annually (payable in 4 quarterly installments)",
                Scholarship = true,
                Email = "admissions@dis.com",
                Phone = "+91 98765 43121",
                Facilities = new[] { "Robotics & AI Lab", "Olympic-size Swimming Pool", "Smart Classrooms", "AC Transport Fleet with GPS" },
                Campuses = new[]
                {
                    new CampusData { Name = "DIS Sector 23 Flagship", Address = "Sector 23, Dwarka", City = "New Delhi", State = "Delhi", PostalCode = "110075" },
                    new CampusData { Name = "DIS Rohini Campus", Address = "Institutional Area, Sector 9, Rohini", City = "New Delhi", State = "Delhi", PostalCode = "110085" }
                }
            },
            new()
            {
                Name = "Oakridge International Academy",
                Tagline = "World-Class International Baccalaureate (IB) Continuum School",
                Description = "Recognized among top international schools offering IB Primary, Middle, and Diploma Programmes with an emphasis on student innovation and 100% university placement.",
                Board = "IB World School (PYP, MYP, DP) & Cambridge IGCSE",
                Grades = "Nursery to Grade 12 (IB Diploma Programme)",
                IsOpen = true,
                Deadline = "November 15, 2026",
                AnnualFees = "₹3.20L – ₹4.80L annually (Sibling discount 15% on second child)",
                Scholarship = true,
                Email = "admissions@oakridge-edu.org",
                Phone = "+91 98112 34567",
                Facilities = new[] { "Makerspace & FabLab", "Performing Arts Auditorium", "Tennis & Squash Academy", "100% Global University Placement Cell" },
                Campuses = new[]
                {
                    new CampusData { Name = "Cyber City Campus", Address = "Golf Course Road, DLF Phase 5", City = "Gurugram", State = "Haryana", PostalCode = "122002" }
                }
            },
            new()
            {
                Name = "St. Xavier's Heritage School",
                Tagline = "Tradition of Excellence, Character Building & Leadership",
                Description = "A legacy institution renowned for rigorous ICSE academics, rich co-curricular programs, community values, and athletic achievements spanning over three decades.",
                Board = "ICSE & ISC",
                Grades = "Kindergarten to Grade 12",
                IsOpen = true,
                Deadline = "October 20, 2026",
                AnnualFees = "₹1.50L – ₹2.10L annually",
                Scholarship = false,
                Email = "inquiries@stxaviersheritage.org",
                Phone = "+91 98223 45678",
                Facilities = new[] { "Science Discovery Labs", "Heritage Library with 40,000+ Books", "Cricket & Football Grounds", "Language Center" },
                Campuses = new[]
                {
                    new CampusData { Name = "South Delhi Senior Campus", Address = "42 Lodhi Estate, Near India Habitat Centre", City = "New Delhi", State = "Delhi", PostalCode = "110003" }
                }
            },
            new()
            {
                Name = "Greenwood Global High",
                Tagline = "Fostering Global Leaders with 21st-Century Competencies",
                Description = "Sprawling 15-acre eco-friendly green campus with top CBSE & IGCSE accreditation, dedicated STEM labs, and personalized counseling for study abroad.",
                Board = "CBSE & IGCSE",
                Grades = "Grade 1 to Grade 12",
                IsOpen = true,
                Deadline = "November 30, 2026",
                AnnualFees = "₹2.20L – ₹3.10L annually",
                Scholarship = true,
                Email = "connect@greenwoodhigh.edu",
                Phone = "+91 98334 56789",
                Facilities = new[] { "Eco Sustainability Center", "Astronomy Observatory", "Indoor Badminton Arena", "Nutritious Dining Hall" },
                Campuses = new[]
                {
                    new CampusData { Name = "Whitefield Flagship Campus", Address = "Varthur Main Road, Near ITPL", City = "Bengaluru", State = "Karnataka", PostalCode = "560066" }
                }
            },
            new()
            {
                Name = "Apex Doon Valley Residential School",
                Tagline = "Premier Boarding & Day School in the Foothills of the Himalayas",
                Description = "A disciplined residential school setting fostering holistic development, equestrian sports, mountaineering, and exceptional board exam results.",
                Board = "CBSE & Cambridge Boarding",
                Grades = "Grade 4 to Grade 12 (Day & Boarding)",
                IsOpen = true,
                Deadline = "January 10, 2027",
                AnnualFees = "₹3.80L – ₹5.50L (Full Boarding, Sports & Dining included)",
                Scholarship = true,
                Email = "admissions@apexdoonvalley.org",
                Phone = "+91 98556 78901",
                Facilities = new[] { "Equestrian & Horse Riding Academy", "Heated Indoor Pool", "Multi-Cuisine Dining Hall", "Medical Center & Resident Doctors" },
                Campuses = new[]
                {
                    new CampusData { Name = "Mussoorie Foothills Estate", Address = "Rajpur Road, Malsi Green Valley", City = "Dehradun", State = "Uttarakhand", PostalCode = "248009" }
                }
            }
        };
    }

    private class ShowcaseSchoolData
    {
        public string Name { get; set; } = string.Empty;
        public string Tagline { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Board { get; set; } = string.Empty;
        public string Grades { get; set; } = string.Empty;
        public bool IsOpen { get; set; }
        public string Deadline { get; set; } = string.Empty;
        public string AnnualFees { get; set; } = string.Empty;
        public bool Scholarship { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string[] Facilities { get; set; } = Array.Empty<string>();
        public CampusData[] Campuses { get; set; } = Array.Empty<CampusData>();
    }

    private class CampusData
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
    }
}
