import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  CheckCircle2, 
  Sparkles,
  Layers,
  GitFork,
  ArrowDown,
  Check,
  RotateCcw,
  Sliders,
  Workflow,
  X,
  Play
} from 'lucide-react';
import api from '../lib/api';
import { 
  type FormField, 
  type FormSchema, 
  type FormFieldCondition, 
  evaluateCondition, 
  getConditionDescription
} from '../lib/formConditionEvaluator';

export default function FormBuilder() {
  const [schemas, setSchemas] = useState<FormSchema[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [activeSchema, setActiveSchema] = useState<FormSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'flowchart' | 'simulator'>('flowchart');

  // Condition modal state
  const [conditionModalField, setConditionModalField] = useState<FormField | null>(null);
  const [conditionEnabled, setConditionEnabled] = useState(false);
  const [conditionDependsOn, setConditionDependsOn] = useState('grade');
  const [conditionOperator, setConditionOperator] = useState<FormFieldCondition['operator']>('greaterThan');
  const [conditionValue, setConditionValue] = useState('5');
  const [conditionAction, setConditionAction] = useState<'show' | 'hide'>('show');

  // New field form state
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FormField['fieldType']>('text');
  const [newFieldSection, setNewFieldSection] = useState('Academic & Student Details');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldHelp, setNewFieldHelp] = useState('');
  const [newFieldOptionsRaw, setNewFieldOptionsRaw] = useState('');
  const [newFieldHasCondition, setNewFieldHasCondition] = useState(false);
  const [newFieldDependsOn, setNewFieldDependsOn] = useState('grade');
  const [newFieldOperator, setNewFieldOperator] = useState<FormFieldCondition['operator']>('greaterThan');
  const [newFieldCondValue, setNewFieldCondValue] = useState('5');

  // Simulator state
  const [simulatedGrade, setSimulatedGrade] = useState('Grade 6');
  const [simulatedValues, setSimulatedValues] = useState<Record<string, any>>({
    requiresTransport: 'Yes, provide transport route details',
    hasSiblingInSchool: 'Yes, sibling currently enrolled'
  });

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
      section: newFieldSection,
      condition: newFieldHasCondition ? {
        dependsOn: newFieldDependsOn,
        operator: newFieldOperator,
        value: newFieldCondValue.trim(),
        action: 'show'
      } : undefined
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
    setNewFieldHasCondition(false);
    setIsAddFieldOpen(false);
  };

  const handleDeleteField = (fieldId: string) => {
    if (!activeSchema) return;
    setActiveSchema({
      ...activeSchema,
      fields: activeSchema.fields.filter(f => f.id !== fieldId)
    });
  };

  const handleOpenConditionModal = (field: FormField) => {
    setConditionModalField(field);
    if (field.condition) {
      setConditionEnabled(true);
      setConditionDependsOn(field.condition.dependsOn || 'grade');
      setConditionOperator(field.condition.operator || 'equals');
      setConditionValue(field.condition.value || '');
      setConditionAction(field.condition.action || 'show');
    } else {
      setConditionEnabled(false);
      setConditionDependsOn('grade');
      setConditionOperator('greaterThan');
      setConditionValue('5');
      setConditionAction('show');
    }
  };

  const handleSaveCondition = () => {
    if (!activeSchema || !conditionModalField) return;

    const updatedFields = activeSchema.fields.map(f => {
      if (f.id === conditionModalField.id) {
        return {
          ...f,
          condition: conditionEnabled && conditionDependsOn ? {
            dependsOn: conditionDependsOn,
            operator: conditionOperator,
            value: conditionValue.trim(),
            action: conditionAction
          } : undefined
        };
      }
      return f;
    });

    setActiveSchema({
      ...activeSchema,
      fields: updatedFields
    });
    setConditionModalField(null);
  };

  const handleRemoveCondition = (fieldId: string) => {
    if (!activeSchema) return;
    const updatedFields = activeSchema.fields.map(f => {
      if (f.id === fieldId) {
        const copy = { ...f };
        delete copy.condition;
        return copy;
      }
      return f;
    });
    setActiveSchema({
      ...activeSchema,
      fields: updatedFields
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

  // Group fields for flowchart visualization
  const unconditionalFields = activeSchema?.fields.filter(f => !f.condition) || [];
  const conditionalFields = activeSchema?.fields.filter(f => Boolean(f.condition)) || [];

  const gradeLanguageFields = activeSchema?.fields.filter(
    f => f.condition?.dependsOn === 'grade' && (Number(f.condition.value) || 0) <= 6
  ) || [];
  const seniorSecondaryFields = activeSchema?.fields.filter(
    f => (f.condition?.dependsOn === 'grade' && (Number(f.condition.value) || 0) > 6) ||
         f.fieldName === 'academicStream' || f.fieldName === 'grade10Aggregate' || f.fieldName === 'integratedCoaching'
  ) || [];
  const coachingTrackFields = activeSchema?.fields.filter(
    f => f.condition?.dependsOn === 'integratedCoaching'
  ) || [];

  // Group conditional fields by trigger parent
  const branchGroups: Record<string, FormField[]> = {};
  conditionalFields.forEach(f => {
    const parentKey = f.condition?.dependsOn || 'unknown';
    if (!branchGroups[parentKey]) {
      branchGroups[parentKey] = [];
    }
    branchGroups[parentKey].push(f);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
            <Workflow className="w-4 h-4" />
            <span>Conditional Form Engine & Decision Flow</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Dynamic Form Flowchart & Logic Builder
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure admission questions and branch conditions. Fields evaluate live rules (e.g. Grade &gt; 5, Sibling Enrolled, AC Transport) to dynamically reveal or bypass questions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('flowchart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'flowchart'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-indigo-600" />
              <span>Flowchart Graph</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Form Structure (List)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('simulator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'simulator'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              <span>Live Simulator</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveSchema}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Publish Schema</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Form flowchart schema saved and deployed successfully! New conditions take effect immediately on incoming applications.</span>
        </div>
      )}

      {/* Grade / Program Selector Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            Loading schema...
          </div>
        )}
      </div>

      {/* Main Mode 1: FLOWCHART LOGIC GRAPH VIEW */}
      {viewMode === 'flowchart' && activeSchema && (
        <div className="space-y-6">
          {/* Legend and Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <GitFork className="w-4 h-4 text-indigo-600" />
                Flowchart Graph Legend:
              </span>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-semibold">
                  Standard Input (Unconditional)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-800 font-bold flex items-center gap-1">
                  ◆ Decision Condition
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold">
                  ✓ Conditional Branch (Revealed)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-500 font-medium">
                  Bypass / Skip Node
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {unconditionalFields.length} Core · {conditionalFields.length} Branches
              </span>
              <button
                type="button"
                onClick={() => setIsAddFieldOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question to Flow</span>
              </button>
            </div>
          </div>

          {/* Flowchart Visual Diagram Canvas */}
          <div className="bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] bg-slate-50/70 border border-slate-200 rounded-2xl p-8 min-h-[600px] overflow-x-auto space-y-8">
            {/* 1. START NODE */}
            <div className="flex flex-col items-center">
              <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md flex items-center gap-2 border-2 border-white ring-4 ring-blue-500/20">
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start: Admission Application Intake</span>
              </div>
              <div className="w-0.5 h-8 bg-blue-300"></div>
              <ArrowDown className="w-4 h-4 text-blue-400 -mt-1.5" />
            </div>

            {/* 2. BASE APPLICANT & GRADE INFORMATION */}
            <div className="max-w-2xl mx-auto bg-white border border-slate-300 rounded-xl p-4 shadow-xs text-center space-y-1 relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Core Intake Stage
              </span>
              <h4 className="text-xs font-bold text-slate-900">
                Student Profile, Grade Selection & Campus Enrollment
              </h4>
              <p className="text-[11px] text-slate-500">
                Collects Student Name, Date of Birth, Grade Applying For, School Campus, and Parent Details
              </p>
            </div>

            {/* Flow line to Decision Branches */}
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-8 bg-indigo-300"></div>
              <ArrowDown className="w-4 h-4 text-indigo-400 -mt-1.5" />
            </div>

            {/* 3. DECISION BRANCHES CONTAINER */}
            <div className="space-y-10 max-w-4xl mx-auto">
              {/* BRANCH 1: GRADE LEVEL DECISION (e.g. Grade > 5 -> Optional Language) */}
              <div className="bg-white border-2 border-amber-300/80 rounded-2xl p-5 shadow-sm space-y-4 relative">
                <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                      ◆
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                        Decision Node 1A • Language Curriculum Rule
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        Is Student Applying For Grade &gt; 5 (Middle School &amp; Above)?
                      </h4>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                    System Evaluator
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* TRUE BRANCH: Grade > 5 */}
                  <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs">
                        <Check className="w-3 h-3" /> YES (Grade 6 to 12)
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Reveals Dependent Field</span>
                    </div>

                    {/* Find field depending on grade */}
                    {gradeLanguageFields.map(field => (
                      <div key={field.id} className="bg-white p-3 rounded-lg border border-emerald-300 shadow-2xs space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{field.label}</span>
                            <span className="text-[10px] text-slate-500">{field.helpText || 'Curriculum language preference'}</span>
                          </div>
                          <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200 uppercase">
                            {field.fieldType}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                          <span className="text-emerald-700 font-semibold">Rule: Grade &gt; 5 (Grade 6+)</span>
                          <button
                            type="button"
                            onClick={() => handleOpenConditionModal(field)}
                            className="text-blue-600 hover:text-blue-800 font-bold underline"
                          >
                            Edit Condition
                          </button>
                        </div>
                      </div>
                    ))}
                    {gradeLanguageFields.length === 0 && (
                      <div className="text-xs text-slate-400 italic p-3 text-center">
                        No second language configured for Grade &gt; 5 in this template.
                      </div>
                    )}
                  </div>

                  {/* FALSE BRANCH: Grade <= 5 */}
                  <div className="border border-slate-200 bg-slate-100/60 rounded-xl p-4 flex flex-col justify-center items-center text-center space-y-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-300 text-slate-700 font-bold text-[10px]">
                      NO (Pre-Nursery – Grade 5)
                    </span>
                    <span className="text-xs font-bold text-slate-700 mt-2">Bypass Optional Language</span>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Primary syllabus adheres to standard universal curriculum without elective second language.
                    </p>
                  </div>
                </div>
              </div>

              {/* BRANCH 1B: SENIOR SECONDARY RULE (Grade 11 & 12 -> Academic Stream Selection) */}
              {(seniorSecondaryFields.length > 0 || selectedGrade === 'ALL' || selectedGrade === 'Grade 11') && (
                <div className="bg-white border-2 border-indigo-300/80 rounded-2xl p-5 shadow-sm space-y-4 relative">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm">
                        ◆
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">
                          Decision Node 1B • Senior Secondary Specialization
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">
                          Is Student Applying For Grade 11 &amp; 12 (Senior Secondary)?
                        </h4>
                      </div>
                    </div>
                    <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                      Grade 11 &amp; 12 Only
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* TRUE BRANCH: Grade 11 & 12 */}
                    <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs">
                          <Check className="w-3 h-3" /> YES (Grade 11 &amp; 12)
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold">Reveals Stream Selection &amp; Electives</span>
                      </div>

                      {seniorSecondaryFields.map(field => (
                        <div key={field.id} className="bg-white p-3 rounded-lg border border-emerald-300 shadow-2xs space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{field.label}</span>
                              <span className="text-[10px] text-slate-500">{field.helpText || field.section}</span>
                            </div>
                            <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200 uppercase">
                              {field.fieldType}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                            <span className="text-emerald-700 font-semibold">Rule: Applicable to Grade 11 &amp; 12</span>
                            <button
                              type="button"
                              onClick={() => handleOpenConditionModal(field)}
                              className="text-blue-600 hover:text-blue-800 font-bold underline"
                            >
                              Edit Condition
                            </button>
                          </div>
                        </div>
                      ))}
                      {seniorSecondaryFields.length === 0 && (
                        <div className="text-xs text-slate-400 italic p-3 text-center">
                          Academic Stream Selection configured for Senior Secondary.
                        </div>
                      )}
                    </div>

                    {/* FALSE BRANCH: Grade < 11 */}
                    <div className="border border-slate-200 bg-slate-100/60 rounded-xl p-4 flex flex-col justify-center items-center text-center space-y-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-300 text-slate-700 font-bold text-[10px]">
                        NO (Pre-Nursery – Grade 10)
                      </span>
                      <span className="text-xs font-bold text-slate-700 mt-2">Bypass Academic Stream</span>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Students follow standard comprehensive academic curriculum without specialized streams.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* BRANCH 2: SIBLING ENROLLED DECISION */}
              <div className="bg-white border-2 border-indigo-300/80 rounded-2xl p-5 shadow-sm space-y-4 relative">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm">
                      ◆
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">
                        Decision Node 2 • Sibling Rule
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        Does Applicant Have Sibling Currently Enrolled in this School?
                      </h4>
                    </div>
                  </div>
                  <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                    Trigger Field: hasSiblingInSchool
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* TRUE BRANCH: Sibling = Yes */}
                  <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs">
                        <Check className="w-3 h-3" /> YES (Sibling Enrolled)
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Reveals 2 Dependent Fields</span>
                    </div>

                    {activeSchema.fields.filter(f => f.condition?.dependsOn === 'hasSiblingInSchool').map(field => (
                      <div key={field.id} className="bg-white p-3 rounded-lg border border-emerald-300 shadow-2xs space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{field.label}</span>
                            <span className="text-[10px] text-slate-500">{field.helpText}</span>
                          </div>
                          <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200 uppercase">
                            {field.fieldType}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                          <span className="text-emerald-700 font-semibold">Rule: Sibling == Yes</span>
                          <button
                            type="button"
                            onClick={() => handleOpenConditionModal(field)}
                            className="text-blue-600 hover:text-blue-800 font-bold underline"
                          >
                            Edit Condition
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* FALSE BRANCH: Sibling = No */}
                  <div className="border border-slate-200 bg-slate-100/60 rounded-xl p-4 flex flex-col justify-center items-center text-center space-y-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-300 text-slate-700 font-bold text-[10px]">
                      NO (No Sibling)
                    </span>
                    <span className="text-xs font-bold text-slate-700 mt-2">Bypass Sibling Verification & Waiver</span>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Application proceeds directly with standard fee schedule without sibling discount processing.
                    </p>
                  </div>
                </div>
              </div>

              {/* BRANCH 3: TRANSPORTATION DECISION */}
              <div className="bg-white border-2 border-blue-300/80 rounded-2xl p-5 shadow-sm space-y-4 relative">
                <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                      ◆
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">
                        Decision Node 3 • Logistics Rule
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">
                        Opt-in for AC School Bus Fleet Transportation?
                      </h4>
                    </div>
                  </div>
                  <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                    Trigger Field: requiresTransport
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* TRUE BRANCH: Transport = Yes */}
                  <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs">
                        <Check className="w-3 h-3" /> YES (Bus Transport Opted)
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Reveals Route Landmark</span>
                    </div>

                    {activeSchema.fields.filter(f => f.condition?.dependsOn === 'requiresTransport').map(field => (
                      <div key={field.id} className="bg-white p-3 rounded-lg border border-emerald-300 shadow-2xs space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{field.label}</span>
                            <span className="text-[10px] text-slate-500">{field.placeholder}</span>
                          </div>
                          <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200 uppercase">
                            {field.fieldType}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                          <span className="text-emerald-700 font-semibold">Rule: requiresTransport contains Yes</span>
                          <button
                            type="button"
                            onClick={() => handleOpenConditionModal(field)}
                            className="text-blue-600 hover:text-blue-800 font-bold underline"
                          >
                            Edit Condition
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* FALSE BRANCH: Transport = No */}
                  <div className="border border-slate-200 bg-slate-100/60 rounded-xl p-4 flex flex-col justify-center items-center text-center space-y-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-300 text-slate-700 font-bold text-[10px]">
                      NO (Self-Drop & Pick Up)
                    </span>
                    <span className="text-xs font-bold text-slate-700 mt-2">Bypass Route Routing</span>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      No transport fee applied. Parents arrange personal transportation.
                    </p>
                  </div>
                </div>
              </div>

              {/* BRANCH 4: INTEGRATED COACHING SPECIALIZATION DECISION */}
              {coachingTrackFields.length > 0 && (
                <div className="bg-white border-2 border-purple-300/80 rounded-2xl p-5 shadow-sm space-y-4 relative">
                  <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
                        ◆
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider">
                          Decision Node 4 • Competitive Exam Coaching Rule
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">
                          Opt for Integrated JEE / NEET / SAT In-Campus Coaching?
                        </h4>
                      </div>
                    </div>
                    <span className="text-[10px] bg-purple-50 border border-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                      Trigger Field: integratedCoaching
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* TRUE BRANCH: Coaching = Yes */}
                    <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs">
                          <Check className="w-3 h-3" /> YES (Enrolled in Integrated Batch)
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold">Reveals Exam Specialization Track</span>
                      </div>

                      {coachingTrackFields.map(field => (
                        <div key={field.id} className="bg-white p-3 rounded-lg border border-emerald-300 shadow-2xs space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{field.label}</span>
                              <span className="text-[10px] text-slate-500">{field.helpText || field.section}</span>
                            </div>
                            <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-200 uppercase">
                              {field.fieldType}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                            <span className="text-emerald-700 font-semibold">Rule: integratedCoaching contains Yes</span>
                            <button
                              type="button"
                              onClick={() => handleOpenConditionModal(field)}
                              className="text-blue-600 hover:text-blue-800 font-bold underline"
                            >
                              Edit Condition
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* FALSE BRANCH: Coaching = No */}
                    <div className="border border-slate-200 bg-slate-100/60 rounded-xl p-4 flex flex-col justify-center items-center text-center space-y-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-300 text-slate-700 font-bold text-[10px]">
                        NO (Regular Board Classes Only)
                      </span>
                      <span className="text-xs font-bold text-slate-700 mt-2">Bypass Entrance Track Selection</span>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Student focuses exclusively on core school board syllabus without evening coaching sessions.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Flow line to Completion */}
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-8 bg-emerald-400"></div>
              <ArrowDown className="w-4 h-4 text-emerald-600 -mt-1.5" />
            </div>

            {/* 4. APPLICATION SUBMISSION & ASSESSMENT COMPLETION */}
            <div className="max-w-md mx-auto text-center space-y-2">
              <div className="px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-xs shadow-md inline-flex items-center gap-2 border-2 border-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Form Completed: Review, Assessment & Fee Deposit</span>
              </div>
              <p className="text-[11px] text-slate-500">
                All conditionally evaluated responses are serialized into application archive
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Mode 2: FORM STRUCTURE (LIST VIEW) */}
      {viewMode === 'list' && activeSchema && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Description / Instructions</label>
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

              <div className="space-y-3">
                {activeSchema.fields.map((field, idx) => (
                  <div 
                    key={field.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition flex items-start justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
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
                        {field.condition ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200 flex items-center gap-1">
                            <GitFork className="w-3 h-3" />
                            {getConditionDescription(field.condition, activeSchema.fields)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded">
                            Always Visible
                          </span>
                        )}
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
                      <div className="pl-7 pt-1 flex items-center gap-3 text-[10px] text-slate-400">
                        <span>Section: {field.section}</span>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => handleOpenConditionModal(field)}
                          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 underline"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>{field.condition ? 'Modify Flow Rule' : 'Add Flow Rule'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenConditionModal(field)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Configure Flowchart Rule"
                      >
                        <GitFork className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Guidance */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-indigo-700 to-blue-800 text-white p-5 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Flowchart Logic Rules</h4>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Connect fields in a visual flowchart. For example, if Sibling is in School, reveal Sibling Roll Number and Concession Discount. If Grade &gt; 5, reveal Optional Language.
              </p>
              <div className="text-[11px] bg-white/10 p-3 rounded-lg border border-white/10 space-y-1.5">
                <div>✓ Live condition evaluation in New Application form</div>
                <div>✓ No duplicate fields or redundant parent inputs</div>
                <div>✓ Multi-branch support for electives & concessions</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Mode 3: INTERACTIVE LIVE FORM SIMULATOR */}
      {viewMode === 'simulator' && activeSchema && (
        <div className="space-y-6">
          {/* Simulator Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                1. Test with Simulated Grade Level:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['Pre-Nursery', 'Grade 1', 'Grade 4', 'Grade 6', 'Grade 8', 'Grade 11'].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSimulatedGrade(g)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      simulatedGrade === g
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-500 block">Evaluated Visibility:</span>
                <span className="text-xs font-extrabold text-emerald-700">
                  {activeSchema.fields.filter(f => evaluateCondition(f.condition, simulatedValues, simulatedGrade)).length} of {activeSchema.fields.length} Fields Active
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSimulatedValues({})}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Answers</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Interactive Form */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                  Live Flowchart Simulator • Testing {simulatedGrade}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{activeSchema.formTitle}</h3>
                <p className="text-xs text-slate-500">Interact with choices below to see flowchart conditions evaluate live.</p>
              </div>

              <div className="space-y-4">
                {activeSchema.fields.map(field => {
                  const isVisible = evaluateCondition(field.condition, simulatedValues, simulatedGrade);
                  if (!isVisible) return null;

                  return (
                    <div 
                      key={field.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        field.condition 
                          ? 'border-emerald-300 bg-emerald-50/20' 
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{field.label}</span>
                          {field.isRequired && <span className="text-red-500">*</span>}
                        </label>
                        {field.condition && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Flow Condition Met
                          </span>
                        )}
                      </div>

                      {field.helpText && (
                        <p className="text-[11px] text-slate-400 mb-2">{field.helpText}</p>
                      )}

                      {/* Input based on type */}
                      {field.fieldType === 'text' && (
                        <input
                          type="text"
                          value={simulatedValues[field.fieldName] || ''}
                          onChange={e => setSimulatedValues({ ...simulatedValues, [field.fieldName]: e.target.value })}
                          placeholder={field.placeholder || 'Type test input...'}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      )}

                      {field.fieldType === 'number' && (
                        <input
                          type="number"
                          value={simulatedValues[field.fieldName] || ''}
                          onChange={e => setSimulatedValues({ ...simulatedValues, [field.fieldName]: e.target.value })}
                          placeholder={field.placeholder || '0'}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      )}

                      {field.fieldType === 'select' && (
                        <select
                          value={simulatedValues[field.fieldName] || ''}
                          onChange={e => setSimulatedValues({ ...simulatedValues, [field.fieldName]: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                        >
                          <option value="">{field.placeholder || 'Choose option...'}</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}

                      {field.fieldType === 'radio' && (
                        <div className="space-y-1.5 pt-1">
                          {field.options?.map(opt => (
                            <label key={opt} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name={`sim-${field.id}`}
                                value={opt}
                                checked={simulatedValues[field.fieldName] === opt}
                                onChange={() => setSimulatedValues({ ...simulatedValues, [field.fieldName]: opt })}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {field.fieldType === 'file' && (
                        <div className="border border-dashed border-slate-300 p-3 rounded-lg text-center text-xs text-slate-500 bg-slate-50">
                          📎 Document upload simulator
                        </div>
                      )}

                      {field.fieldType === 'textarea' && (
                        <textarea
                          rows={2}
                          value={simulatedValues[field.fieldName] || ''}
                          onChange={e => setSimulatedValues({ ...simulatedValues, [field.fieldName]: e.target.value })}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Flow Conditions Inspector */}
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Live Flow Condition Inspector
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {conditionalFields.map(cf => {
                    const isMet = evaluateCondition(cf.condition, simulatedValues, simulatedGrade);
                    return (
                      <div 
                        key={cf.id}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          isMet 
                            ? 'border-emerald-300 bg-emerald-50/50' 
                            : 'border-slate-200 bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{cf.label}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isMet ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {isMet ? 'VISIBLE' : 'BYPASSED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {getConditionDescription(cf.condition, activeSchema.fields)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONDITION CONFIGURATION MODAL */}
      {conditionModalField && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setConditionModalField(null)}></div>

            <div className="relative inline-block w-full max-w-lg p-6 my-8 text-left bg-white rounded-2xl shadow-2xl z-10 border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <GitFork className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Configure Flowchart Branch Logic
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Target Field: <strong className="text-slate-800">{conditionModalField.label}</strong>
                    </p>
                  </div>
                </div>
                <button onClick={() => setConditionModalField(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Enable toggle */}
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-indigo-200 bg-indigo-50/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={conditionEnabled}
                    onChange={e => setConditionEnabled(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Enable Conditional Visibility for this Field
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Field will only appear when predecessor question meets the specified condition
                    </span>
                  </div>
                </label>

                {conditionEnabled && (
                  <div className="space-y-3 pt-2">
                    {/* Presets */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Quick Preset Templates:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setConditionDependsOn('grade');
                            setConditionOperator('greaterThan');
                            setConditionValue('5');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                        >
                          Grade &gt; 5 (Middle/Senior)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConditionDependsOn('hasSiblingInSchool');
                            setConditionOperator('equals');
                            setConditionValue('Yes, sibling currently enrolled');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100"
                        >
                          Sibling in School = Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConditionDependsOn('requiresTransport');
                            setConditionOperator('contains');
                            setConditionValue('Yes');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                        >
                          AC Bus Fleet = Yes
                        </button>
                      </div>
                    </div>

                    {/* Trigger variable */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        1. When Predecessor Variable / Question:
                      </label>
                      <select
                        value={conditionDependsOn}
                        onChange={e => setConditionDependsOn(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                      >
                        <option value="grade">Grade Level Applied (system variable)</option>
                        {activeSchema?.fields
                          .filter(f => f.id !== conditionModalField.id)
                          .map(f => (
                            <option key={f.fieldName || f.id} value={f.fieldName || f.id}>
                              {f.label} ({f.fieldName})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Operator */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          2. Evaluation Operator:
                        </label>
                        <select
                          value={conditionOperator}
                          onChange={e => setConditionOperator(e.target.value as any)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                        >
                          <option value="equals">Equals (=)</option>
                          <option value="notEquals">Not Equals (!=)</option>
                          <option value="contains">Contains text</option>
                          <option value="greaterThan">Greater than (&gt;)</option>
                          <option value="greaterThanOrEqual">Greater than or equal (&gt;=)</option>
                          <option value="lessThan">Less than (&lt;)</option>
                          <option value="lessThanOrEqual">Less than or equal (&lt;=)</option>
                          <option value="isTruthy">Is Checked / Yes</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          3. Expected Value:
                        </label>
                        <input
                          type="text"
                          value={conditionValue}
                          onChange={e => setConditionValue(e.target.value)}
                          placeholder="e.g. 5 or Yes"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                        />
                      </div>
                    </div>

                    {/* Clickable options of trigger if radio/select */}
                    {(() => {
                      const parent = activeSchema?.fields.find(f => (f.fieldName || f.id) === conditionDependsOn);
                      if (parent && parent.options && parent.options.length > 0) {
                        return (
                          <div>
                            <span className="text-[10px] text-slate-400 block mb-1">Pick value from {parent.label}:</span>
                            <div className="flex flex-wrap gap-1">
                              {parent.options.map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setConditionValue(opt)}
                                  className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 border border-slate-200"
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Visual branch preview */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Rule Preview:</span>
                      <p className="font-semibold text-slate-800">
                        Show <span className="text-indigo-600">"{conditionModalField.label}"</span> only when{' '}
                        <span className="text-blue-600">{conditionDependsOn}</span>{' '}
                        <span className="text-amber-700">{conditionOperator}</span>{' '}
                        <span className="text-emerald-700">"{conditionValue}"</span>.
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      handleRemoveCondition(conditionModalField.id);
                      setConditionModalField(null);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold"
                  >
                    Clear Condition (Always Visible)
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConditionModalField(null)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCondition}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-xs"
                    >
                      Apply Flow Rule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD QUESTION MODAL */}
      {isAddFieldOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsAddFieldOpen(false)}></div>

            <div className="relative inline-block w-full max-w-lg p-6 my-8 text-left bg-white rounded-2xl shadow-2xl z-10 border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-900">Add New Application Question</h3>
                <button onClick={() => setIsAddFieldOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
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
                    placeholder="e.g. Sibling Full Name & Grade"
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
                      <option value="Sibling & Concession Details">Sibling & Concession Details</option>
                      <option value="Specialization & Electives">Specialization & Electives</option>
                      <option value="Logistics & Transport">Logistics & Transport</option>
                      <option value="Required Documents">Required Documents</option>
                      <option value="Emergency Information">Emergency Information</option>
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
                      placeholder="e.g. Yes, sibling enrolled, No sibling"
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
                      placeholder="e.g. Applicable from Grade 6 upwards"
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

                {/* Conditional Branch Option */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="flex items-center space-x-2 text-xs font-bold text-indigo-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFieldHasCondition}
                      onChange={e => setNewFieldHasCondition(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Enable Flowchart Decision Branch (Conditional Display)</span>
                  </label>

                  {newFieldHasCondition && (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Trigger Variable</span>
                        <select
                          value={newFieldDependsOn}
                          onChange={e => setNewFieldDependsOn(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                        >
                          <option value="grade">Grade Level (grade)</option>
                          <option value="hasSiblingInSchool">Sibling in School</option>
                          <option value="requiresTransport">AC Bus Transport</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Operator</span>
                        <select
                          value={newFieldOperator}
                          onChange={e => setNewFieldOperator(e.target.value as any)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                        >
                          <option value="greaterThan">Greater Than (&gt;)</option>
                          <option value="greaterThanOrEqual">Greater Than or Equal (&gt;=)</option>
                          <option value="equals">Equals (==)</option>
                          <option value="contains">Contains text</option>
                          <option value="lessThan">Less Than (&lt;)</option>
                          <option value="lessThanOrEqual">Less Than or Equal (&lt;=)</option>
                          <option value="notEquals">Not Equals (!=)</option>
                          <option value="isTruthy">Is Checked / Yes</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Expected Value</span>
                        <input
                          type="text"
                          value={newFieldCondValue}
                          onChange={e => setNewFieldCondValue(e.target.value)}
                          placeholder="e.g. 5 or Yes"
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>
                  )}
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm"
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
