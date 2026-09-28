import { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  CheckCircle2, 
  Settings2,
  Sparkles,
  Layers
} from 'lucide-react';
import api from '../lib/api';

interface FormField {
  id: string;
  fieldName: string;
  label: string;
  fieldType: 'text' | 'number' | 'select' | 'radio' | 'file' | 'textarea';
  options: string[];
  isRequired: boolean;
  placeholder: string;
  helpText: string;
  section: string;
}

interface FormSchema {
  id: string;
  formTitle: string;
  gradeApplicable: string;
  description: string;
  isActive: boolean;
  fields: FormField[];
}

export default function FormBuilder() {
  const [schemas, setSchemas] = useState<FormSchema[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [activeSchema, setActiveSchema] = useState<FormSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // New field form state
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'select' | 'radio' | 'file' | 'textarea'>('text');
  const [newFieldSection, setNewFieldSection] = useState('Academic & Student Details');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldHelp, setNewFieldHelp] = useState('');
  const [newFieldOptionsRaw, setNewFieldOptionsRaw] = useState('');

  const gradeOptions = [
    { value: 'ALL', label: 'All Grades (Universal Master Form)' },
    { value: 'Pre-Nursery', label: 'Pre-Nursery & Kindergarten' },
    { value: 'Grade 1', label: 'Primary (Grade 1 – 5)' },
    { value: 'Grade 6', label: 'Middle School (Grade 6 – 8)' },
    { value: 'Grade 9', label: 'Secondary (Grade 9 & 10)' },
    { value: 'Grade 11', label: 'Senior Secondary (Grade 11 & 12)' }
  ];

  useEffect(() => {
    fetchSchemas();
  }, []);

  const fetchSchemas = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/formschemas');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setSchemas(res.data);
        const current = res.data.find((s: FormSchema) => s.gradeApplicable === selectedGrade) || res.data[0];
        setActiveSchema(current);
      }
    } catch (err) {
      console.error('Failed to load form schemas', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    const found = schemas.find(s => s.gradeApplicable === grade);
    if (found) {
      setActiveSchema(found);
    } else {
      // Create new schema skeleton for selected grade
      const newSchema: FormSchema = {
        id: `schema-${grade.toLowerCase().replace(/\s+/g, '-')}`,
        formTitle: `${grade} Admission Application Form`,
        gradeApplicable: grade,
        description: `Customized application requirements and elective choices for ${grade}.`,
        isActive: true,
        fields: [
          {
            id: 'fld-sample-1',
            fieldName: 'specialRequirements',
            label: 'Specific Learning or Sports Requirements',
            fieldType: 'textarea',
            options: [],
            isRequired: false,
            placeholder: 'e.g. Swimming coaching, remedial math, dietary preferences',
            helpText: 'Helps counselors assign appropriate mentorship.',
            section: 'Student Preferences'
          }
        ]
      };
      setActiveSchema(newSchema);
    }
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchema || !newFieldLabel.trim()) return;

    const parsedOptions = newFieldOptionsRaw
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0);

    const newField: FormField = {
      id: `fld-${Date.now()}`,
      fieldName: newFieldLabel.toLowerCase().replace(/[^a-zA-Z0-9]/g, ''),
      label: newFieldLabel.trim(),
      fieldType: newFieldType,
      options: parsedOptions,
      isRequired: newFieldRequired,
      placeholder: newFieldPlaceholder.trim(),
      helpText: newFieldHelp.trim(),
      section: newFieldSection
    };

    setActiveSchema({
      ...activeSchema,
      fields: [...activeSchema.fields, newField]
    });

    // Reset add field form
    setNewFieldLabel('');
    setNewFieldPlaceholder('');
    setNewFieldHelp('');
    setNewFieldOptionsRaw('');
    setNewFieldRequired(false);
    setIsAddFieldOpen(false);
  };

  const handleDeleteField = (fieldId: string) => {
    if (!activeSchema) return;
    setActiveSchema({
      ...activeSchema,
      fields: activeSchema.fields.filter(f => f.id !== fieldId)
    });
  };

  const handleSaveSchema = async () => {
    if (!activeSchema) return;
    try {
      await api.post('/api/formschemas', activeSchema);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchSchemas();
    } catch (err) {
      console.error('Failed to save schema', err);
      alert('Could not save schema to server.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
            <Settings2 className="w-4 h-4" />
            <span>Admissions Workflow Builder</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            No-Code Dynamic Application Form Builder
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Customize application questions, electives, and document upload requirements per grade. Changes take effect immediately in online applications.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
              previewMode 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewMode ? 'Exit Preview' : 'Interactive Preview'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSchema}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Publish Schema</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Form schema saved and deployed successfully! New questions will be requested on matching applications.</span>
        </div>
      )}

      {/* Grade Selector Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Select Grade / Program Template to Customize
          </label>
          <div className="flex flex-wrap gap-2">
            {gradeOptions.map(g => (
              <button
                key={g.value}
                onClick={() => handleGradeChange(g.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedGrade === g.value
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        {isLoading && (
          <div className="text-xs text-blue-600 font-semibold animate-pulse px-3">
            Loading schemas...
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeSchema && !previewMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form Info & Fields List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Schema Meta Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Form Title</label>
                <input
                  type="text"
                  value={activeSchema.formTitle}
                  onChange={e => setActiveSchema({ ...activeSchema, formTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Description / Instructions to Applicant</label>
                <input
                  type="text"
                  value={activeSchema.description}
                  onChange={e => setActiveSchema({ ...activeSchema, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Active Fields Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Application Questions & Requirements ({activeSchema.fields.length})
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddFieldOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>

              {activeSchema.fields.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No custom questions added for this grade yet.</p>
                  <button
                    onClick={() => setIsAddFieldOpen(true)}
                    className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    + Add First Field
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSchema.fields.map((field, idx) => (
                    <div 
                      key={field.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition flex items-start justify-between gap-4 group"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{field.label}</span>
                          {field.isRequired ? (
                            <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[9px] font-bold rounded">Required</span>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-600 text-[9px] font-bold rounded">Optional</span>
                          )}
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded border border-blue-100 uppercase">
                            {field.fieldType}
                          </span>
                        </div>

                        {field.helpText && (
                          <p className="text-[11px] text-slate-500 pl-7">{field.helpText}</p>
                        )}

                        {field.options && field.options.length > 0 && (
                          <div className="pl-7 flex flex-wrap gap-1 mt-1">
                            {field.options.map((opt, oIdx) => (
                              <span key={oIdx} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400 pl-7 block">Section: {field.section}</span>
                      </div>

                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Guidance & Add Modal */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-5 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <h4 className="text-xs font-bold uppercase tracking-wider">No-Code Benefits</h4>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Add stream electives for Senior Secondary, second-language preferences, sibling roll numbers, or bus route requests without writing any code.
              </p>
              <div className="text-[11px] bg-white/10 p-3 rounded-lg border border-white/10 space-y-1">
                <div>✓ Auto-populates in Applications Table</div>
                <div>✓ Serializes into student profile JSON</div>
                <div>✓ Validated during admission verification</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Live Interactive Preview Mode */
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-lg space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
              Applicant View Preview • {activeSchema?.gradeApplicable}
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">{activeSchema?.formTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{activeSchema?.description}</p>
          </div>

          <div className="space-y-4">
            {activeSchema?.fields.map((fld) => (
              <div key={fld.id} className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  {fld.label} {fld.isRequired && <span className="text-red-500">*</span>}
                </label>
                {fld.helpText && <p className="text-[10px] text-slate-500">{fld.helpText}</p>}

                {fld.fieldType === 'text' && (
                  <input
                    type="text"
                    disabled
                    placeholder={fld.placeholder || 'Enter response...'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                )}

                {fld.fieldType === 'number' && (
                  <input
                    type="number"
                    disabled
                    placeholder={fld.placeholder || '0'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                )}

                {fld.fieldType === 'select' && (
                  <select disabled className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs">
                    <option>Select an option...</option>
                    {fld.options.map((opt, idx) => (
                      <option key={idx}>{opt}</option>
                    ))}
                  </select>
                )}

                {fld.fieldType === 'radio' && (
                  <div className="space-y-1.5 pt-1">
                    {fld.options.map((opt, idx) => (
                      <label key={idx} className="flex items-center space-x-2 text-xs text-slate-700">
                        <input type="radio" disabled name={fld.id} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {fld.fieldType === 'file' && (
                  <div className="border-2 border-dashed border-slate-300 p-4 rounded-xl text-center bg-slate-50">
                    <span className="text-xs text-slate-500">📎 Click to upload document (PDF / JPG up to 5MB)</span>
                  </div>
                )}

                {fld.fieldType === 'textarea' && (
                  <textarea
                    disabled
                    rows={2}
                    placeholder={fld.placeholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Add Custom Question Modal */}
      {isAddFieldOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsAddFieldOpen(false)}></div>

            <div className="relative inline-block w-full max-w-lg p-6 my-8 text-left bg-white rounded-2xl shadow-2xl z-10 border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-900">Add New Custom Application Question</h3>
                <button onClick={() => setIsAddFieldOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <Trash2 className="hidden" /> &times;
                </button>
              </div>

              <form onSubmit={handleAddField} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Question / Label *</label>
                  <input
                    type="text"
                    required
                    value={newFieldLabel}
                    onChange={e => setNewFieldLabel(e.target.value)}
                    placeholder="e.g. Second Language Preference"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Field Input Type</label>
                    <select
                      value={newFieldType}
                      onChange={e => setNewFieldType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                    >
                      <option value="text">Text Input</option>
                      <option value="number">Number</option>
                      <option value="select">Dropdown Select</option>
                      <option value="radio">Radio Choices</option>
                      <option value="file">Document Upload</option>
                      <option value="textarea">Paragraph Textarea</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Form Section</label>
                    <select
                      value={newFieldSection}
                      onChange={e => setNewFieldSection(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                    >
                      <option value="Academic & Student Details">Academic & Student Details</option>
                      <option value="Specialization & Electives">Specialization & Electives</option>
                      <option value="Logistics & Transport">Logistics & Transport</option>
                      <option value="Required Documents">Required Documents</option>
                      <option value="Health & Medical">Health & Medical</option>
                    </select>
                  </div>
                </div>

                {(newFieldType === 'select' || newFieldType === 'radio') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Options (Comma-separated) *</label>
                    <input
                      type="text"
                      required
                      value={newFieldOptionsRaw}
                      onChange={e => setNewFieldOptionsRaw(e.target.value)}
                      placeholder="e.g. Hindi, French, Sanskrit, German"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Placeholder Text</label>
                    <input
                      type="text"
                      value={newFieldPlaceholder}
                      onChange={e => setNewFieldPlaceholder(e.target.value)}
                      placeholder="e.g. Choose preferred option"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Help / Subtitle Text</label>
                    <input
                      type="text"
                      value={newFieldHelp}
                      onChange={e => setNewFieldHelp(e.target.value)}
                      placeholder="e.g. Applicable from Grade 1 upwards"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={newFieldRequired}
                      onChange={e => setNewFieldRequired(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Mandatory Question (Must be answered before submitting application)</span>
                  </label>
                </div>

                <div className="pt-3 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddFieldOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                  >
                    Add Question to Form
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
