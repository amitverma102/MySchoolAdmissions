using Microsoft.AspNetCore.Mvc;

namespace MySchoolAdmissions.ConfigurationService.Controllers;

public class FormFieldCondition
{
    public string DependsOn { get; set; } = string.Empty; // fieldName or system variable "grade"
    public string Operator { get; set; } = "equals"; // equals, notEquals, greaterThan, lessThan, contains, isTruthy, isFalsy
    public string Value { get; set; } = string.Empty;
    public string Action { get; set; } = "show"; // show, hide
}

public class FormFieldDefinition
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
    public string FieldName { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string FieldType { get; set; } = "text"; // text, number, select, radio, checkbox, file, textarea
    public List<string> Options { get; set; } = new();
    public bool IsRequired { get; set; }
    public string Placeholder { get; set; } = string.Empty;
    public string HelpText { get; set; } = string.Empty;
    public string Section { get; set; } = "Academic & Student Details"; // Academic, Parent, Documents, Health
    public FormFieldCondition? Condition { get; set; }
}

public class FormSchemaDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
    public string FormTitle { get; set; } = "Standard Admission Application Form";
    public string GradeApplicable { get; set; } = "ALL"; // e.g. "ALL", "Pre-Nursery", "Grade 11 - Science"
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<FormFieldDefinition> Fields { get; set; } = new();
}

[ApiController]
[Route("api/[controller]")]
public class FormSchemasController : ControllerBase
{
    private static readonly List<FormSchemaDto> _schemas = new()
    {
        new FormSchemaDto
        {
            Id = "schema-general",
            FormTitle = "General Admission Application Form",
            GradeApplicable = "ALL",
            Description = "Default application questions collected for all incoming students across grades.",
            IsActive = true,
            UpdatedAt = DateTime.UtcNow,
            Fields = new List<FormFieldDefinition>
            {
                new()
                {
                    Id = "fld-prev-school",
                    FieldName = "previousSchool",
                    Label = "Previous School Name & Affiliation Board",
                    FieldType = "text",
                    IsRequired = false,
                    Placeholder = "e.g. Modern Public School (CBSE)",
                    HelpText = "Leave blank if applying for Nursery/Kindergarten entry level.",
                    Section = "Academic & Student Details"
                },
                new()
                {
                    Id = "fld-second-lang",
                    FieldName = "secondLanguage",
                    Label = "Optional / Second Language Preference",
                    FieldType = "select",
                    Options = new List<string> { "Hindi", "French", "Sanskrit", "Spanish", "German" },
                    IsRequired = true,
                    Placeholder = "Choose language option",
                    HelpText = "Language curriculum applicable from Grade 6 upwards (Grade > 5).",
                    Section = "Academic & Student Details",
                    Condition = new FormFieldCondition
                    {
                        DependsOn = "grade",
                        Operator = "greaterThan",
                        Value = "5",
                        Action = "show"
                    }
                },
                new()
                {
                    Id = "fld-bus-transport",
                    FieldName = "requiresTransport",
                    Label = "Opt-in for AC School Bus Fleet Transportation?",
                    FieldType = "radio",
                    Options = new List<string> { "Yes, provide transport route details", "No, self-drop and pick up" },
                    IsRequired = true,
                    HelpText = "Routes cover a 25km radius from campus.",
                    Section = "Logistics & Transport"
                },
                new()
                {
                    Id = "fld-bus-landmark",
                    FieldName = "preferredBusRoute",
                    Label = "Preferred Bus Route / Pickup Landmark",
                    FieldType = "text",
                    IsRequired = true,
                    Placeholder = "e.g. Sector 21 Metro Gate 2 / Near Golf Course Road",
                    HelpText = "Our transport coordinator will allocate the nearest stop point.",
                    Section = "Logistics & Transport",
                    Condition = new FormFieldCondition
                    {
                        DependsOn = "requiresTransport",
                        Operator = "contains",
                        Value = "Yes",
                        Action = "show"
                    }
                },
                new()
                {
                    Id = "fld-has-sibling",
                    FieldName = "hasSiblingInSchool",
                    Label = "Does the applicant have a sibling currently studying in our school?",
                    FieldType = "radio",
                    Options = new List<string> { "Yes, sibling currently enrolled", "No sibling in this school" },
                    IsRequired = true,
                    HelpText = "Enables sibling verification and fee concession processing.",
                    Section = "Sibling & Concession Details"
                },
                new()
                {
                    Id = "fld-sibling-info",
                    FieldName = "siblingDetails",
                    Label = "Sibling Full Name, Admission ID & Current Grade",
                    FieldType = "text",
                    IsRequired = true,
                    Placeholder = "e.g. Priyansh Sharma (Adm #DIS-2023-412, Grade 7-B)",
                    HelpText = "Used by admissions office to link student records and verify sibling status.",
                    Section = "Sibling & Concession Details",
                    Condition = new FormFieldCondition
                    {
                        DependsOn = "hasSiblingInSchool",
                        Operator = "equals",
                        Value = "Yes, sibling currently enrolled",
                        Action = "show"
                    }
                },
                new()
                {
                    Id = "fld-sibling-discount",
                    FieldName = "siblingDiscountOptIn",
                    Label = "Apply for Sibling Concession (15% Tuition Fee Waiver)?",
                    FieldType = "radio",
                    Options = new List<string> { "Yes, apply for 15% sibling tuition waiver", "No, standard fee schedule" },
                    IsRequired = true,
                    HelpText = "Applicable upon successful verification of active sibling enrollment.",
                    Section = "Sibling & Concession Details",
                    Condition = new FormFieldCondition
                    {
                        DependsOn = "hasSiblingInSchool",
                        Operator = "equals",
                        Value = "Yes, sibling currently enrolled",
                        Action = "show"
                    }
                },
                new()
                {
                    Id = "fld-doc-tc",
                    FieldName = "transferCertificateReq",
                    Label = "School Transfer Certificate (TC) / Migration Proof",
                    FieldType = "file",
                    IsRequired = false,
                    HelpText = "Upload PDF/JPG of previous school TC if available.",
                    Section = "Required Documents"
                },
                new()
                {
                    Id = "fld-emergency-contact",
                    FieldName = "emergencyContact",
                    Label = "Emergency Contact Person & Relation",
                    FieldType = "text",
                    IsRequired = true,
                    Placeholder = "e.g. Uncle / Grandparent +91 9876543210",
                    HelpText = "Secondary contact person in case parents are unreachable.",
                    Section = "Emergency Information"
                }
            }
        },
        new FormSchemaDto
        {
            Id = "schema-senior-secondary",
            FormTitle = "Senior Secondary (Grade 11 & 12) Specialized Form",
            GradeApplicable = "Grade 11",
            Description = "Stream specialization, competitive exam prep, and elective subject preferences.",
            IsActive = true,
            UpdatedAt = DateTime.UtcNow,
            Fields = new List<FormFieldDefinition>
            {
                new()
                {
                    Id = "fld-stream",
                    FieldName = "academicStream",
                    Label = "Academic Stream Selection",
                    FieldType = "select",
                    Options = new List<string> 
                    { 
                        "Science (PCM) with Computer Science / AI", 
                        "Science (PCB) with Biotechnology", 
                        "Commerce with Applied Mathematics", 
                        "Commerce with Entrepreneurship",
                        "Humanities / Liberal Arts with Psychology" 
                    },
                    IsRequired = true,
                    Section = "Specialization & Electives"
                },
                new()
                {
                    Id = "fld-grade10-score",
                    FieldName = "grade10Aggregate",
                    Label = "Grade 10 Board Aggregate Percentage",
                    FieldType = "number",
                    IsRequired = true,
                    Placeholder = "e.g. 88.5",
                    HelpText = "Minimum 75% aggregate required for PCM stream.",
                    Section = "Academic & Student Details"
                },
                new()
                {
                    Id = "fld-integrated-coaching",
                    FieldName = "integratedCoaching",
                    Label = "Opt for Integrated JEE / NEET / SAT In-Campus Coaching?",
                    FieldType = "radio",
                    Options = new List<string> { "Yes, enroll in integrated batch", "No, regular board classes only" },
                    IsRequired = true,
                    Section = "Specialization & Electives"
                },
                new()
                {
                    Id = "fld-coaching-track",
                    FieldName = "coachingSpecialization",
                    Label = "Integrated Competitive Exam Track",
                    FieldType = "select",
                    Options = new List<string> 
                    { 
                        "IIT-JEE Advanced Engineering Foundation", 
                        "NEET-UG Medical Entrance Accelerator", 
                        "SAT & AP Prep for Ivy League & Global Universities" 
                    },
                    IsRequired = true,
                    Section = "Specialization & Electives",
                    Condition = new FormFieldCondition
                    {
                        DependsOn = "integratedCoaching",
                        Operator = "contains",
                        Value = "Yes",
                        Action = "show"
                    }
                }
            }
        }
    };

    [HttpGet]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public IActionResult GetAllSchemas()
    {
        return Ok(_schemas);
    }

    [HttpGet("{grade}")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public IActionResult GetSchemaForGrade(string grade)
    {
        var general = _schemas.FirstOrDefault(s => s.GradeApplicable.Equals("ALL", StringComparison.OrdinalIgnoreCase));
        
        var specific = _schemas.FirstOrDefault(s =>
            !s.GradeApplicable.Equals("ALL", StringComparison.OrdinalIgnoreCase) && (
                s.GradeApplicable.Equals(grade, StringComparison.OrdinalIgnoreCase) ||
                grade.StartsWith(s.GradeApplicable, StringComparison.OrdinalIgnoreCase) ||
                s.GradeApplicable.StartsWith(grade, StringComparison.OrdinalIgnoreCase)
            ));

        if (specific == null)
        {
            return Ok(general ?? _schemas.FirstOrDefault());
        }

        if (general == null)
        {
            return Ok(specific);
        }

        // Merge general fields with specific fields without any duplicates
        var mergedFields = new List<FormFieldDefinition>();
        var seenKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Add general fields first
        foreach (var field in general.Fields)
        {
            var key = string.IsNullOrWhiteSpace(field.FieldName) ? field.Id : field.FieldName;
            if (seenKeys.Add(key))
            {
                mergedFields.Add(field);
            }
        }

        // Add or override with specific fields
        foreach (var field in specific.Fields)
        {
            var key = string.IsNullOrWhiteSpace(field.FieldName) ? field.Id : field.FieldName;
            if (seenKeys.Add(key))
            {
                mergedFields.Add(field);
            }
            else
            {
                var existingIdx = mergedFields.FindIndex(m => 
                    (string.IsNullOrWhiteSpace(m.FieldName) ? m.Id : m.FieldName).Equals(key, StringComparison.OrdinalIgnoreCase));
                if (existingIdx >= 0)
                {
                    mergedFields[existingIdx] = field;
                }
            }
        }

        var combinedSchema = new FormSchemaDto
        {
            Id = specific.Id,
            FormTitle = specific.FormTitle,
            GradeApplicable = grade,
            Description = specific.Description,
            IsActive = specific.IsActive,
            UpdatedAt = specific.UpdatedAt > general.UpdatedAt ? specific.UpdatedAt : general.UpdatedAt,
            Fields = mergedFields
        };

        return Ok(combinedSchema);
    }

    [HttpPost]
    public IActionResult SaveSchema([FromBody] FormSchemaDto schema)
    {
        if (string.IsNullOrWhiteSpace(schema.FormTitle))
        {
            return BadRequest(new { message = "Form Title is required." });
        }

        var existing = _schemas.FirstOrDefault(s => s.Id == schema.Id || (s.GradeApplicable == schema.GradeApplicable && schema.GradeApplicable != "ALL"));
        if (existing != null)
        {
            _schemas.Remove(existing);
        }

        if (string.IsNullOrWhiteSpace(schema.Id))
        {
            schema.Id = $"schema-{Guid.NewGuid().ToString("N")[..8]}";
        }
        schema.UpdatedAt = DateTime.UtcNow;

        _schemas.Add(schema);

        return Ok(schema);
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteSchema(string id)
    {
        var existing = _schemas.FirstOrDefault(s => s.Id == id);
        if (existing != null)
        {
            _schemas.Remove(existing);
            return NoContent();
        }
        return NotFound();
    }
}
