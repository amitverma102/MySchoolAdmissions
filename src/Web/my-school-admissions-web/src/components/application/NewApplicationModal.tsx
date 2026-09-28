import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  Trash2, 
  User, 
  GraduationCap, 
  Building2, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  FileText
} from 'lucide-react';
import api from '../../lib/api';
import { type Application } from '../../types';

interface NewApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newApp: Application) => void;
}

interface SchoolOption {
  id: string;
  name: string;
  campuses: { id: string; name: string }[];
}

const DEFAULT_SCHOOL_OPTIONS: SchoolOption[] = [
  {
    id: 'fc49d553-b44f-4c4c-96ad-4bf599016c01',
    name: 'Delhi International School',
    campuses: [
      { id: '866bc5ca-0dbd-4482-b52c-102398d4c65d', name: 'DIS Sector 23 Campus (Dwarka)' },
      { id: 'campus-dis-2', name: 'DIS Rohini Campus (Sector 9)' },
    ]
  },
  {
    id: 'school-heritage-02',
    name: 'The Heritage School',
    campuses: [
      { id: 'campus-heritage-1', name: 'Vasant Kunj Main Campus' },
      { id: 'campus-heritage-2', name: 'Gurugram Extension Campus' },
    ]
  },
  {
    id: 'school-dps-03',
    name: 'Delhi Public School (DPS)',
    campuses: [
      { id: 'campus-dps-1', name: 'RK Puram Main Campus' },
      { id: 'campus-dps-2', name: 'East of Kailash Junior Branch' },
    ]
  }
];

const GRADES = [
  'Pre-Nursery',
  'Nursery',
  'Kindergarten',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11 (Science)',
  'Grade 11 (Commerce)',
  'Grade 11 (Humanities)',
  'Grade 12'
];

export default function NewApplicationModal({ isOpen, onClose, onSuccess }: NewApplicationModalProps) {
  // Form fields
  const [applicantName, setApplicantName] = useState('');
  const [gradeApplyingFor, setGradeApplyingFor] = useState('Grade 1');
  const [gender, setGender] = useState('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  
  // Institution & Campus
  const [institutions, setInstitutions] = useState<SchoolOption[]>(DEFAULT_SCHOOL_OPTIONS);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(DEFAULT_SCHOOL_OPTIONS[0].id);
  const [selectedCampusId, setSelectedCampusId] = useState(DEFAULT_SCHOOL_OPTIONS[0].campuses[0].id);

  // Guardian details
  const [parentName, setParentName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [relationship, setRelationship] = useState('Father');

  // Additional info
  const [previousSchool, setPreviousSchool] = useState('');
  const [status, setStatus] = useState('Submitted');
  const [notes, setNotes] = useState('');

  // Photograph state
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdApplicationNumber, setCreatedApplicationNumber] = useState('');

  // Fetch live institutions if available
  useEffect(() => {
    if (!isOpen) return;
    const activeTenantId = localStorage.getItem('selectedInstitutionId');
    api.get('/api/institutions')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const mapped: SchoolOption[] = res.data.map((inst: any) => ({
            id: inst.id,
            name: inst.name,
            campuses: Array.isArray(inst.campuses) && inst.campuses.length > 0
              ? inst.campuses.map((c: any) => ({ id: c.id, name: c.name }))
              : [{ id: inst.id, name: `${inst.name} Main Campus` }]
          }));
          setInstitutions(mapped);
          const chosen = mapped.find(m => m.id === activeTenantId) || mapped[0];
          setSelectedInstitutionId(chosen.id);
          setSelectedCampusId(chosen.campuses[0]?.id || chosen.id);
        }
      })
      .catch(() => {
        // Fall back to default options
        if (activeTenantId) {
          const chosen = DEFAULT_SCHOOL_OPTIONS.find(m => m.id === activeTenantId);
          if (chosen) {
            setSelectedInstitutionId(chosen.id);
            setSelectedCampusId(chosen.campuses[0]?.id || chosen.id);
          }
        }
      });
  }, [isOpen]);

  // Update campus when institution changes
  const handleInstitutionChange = (instId: string) => {
    setSelectedInstitutionId(instId);
    const found = institutions.find(i => i.id === instId);
    if (found && found.campuses.length > 0) {
      setSelectedCampusId(found.campuses[0].id);
    }
  };

  // Image upload and client-side resize
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('Image size exceeds 8MB. Please select a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 360;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setStudentPhoto(compressedDataUrl);
        } catch {
          // Fallback to original data URL if canvas manipulation fails
          setStudentPhoto(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setStudentPhoto(null);
    setPhotoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!applicantName.trim()) {
      setSubmitError('Student / Applicant Name is required.');
      return;
    }

    if (!parentName.trim()) {
      setSubmitError('Parent / Guardian Name is required.');
      return;
    }

    if (!contactPhone.trim()) {
      setSubmitError('Contact Phone Number is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const customFields = {
        studentPhoto: studentPhoto || undefined,
        gender,
        dateOfBirth: dateOfBirth || undefined,
        academicYear,
        parentName: parentName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim() || undefined,
        relationship,
        previousSchool: previousSchool.trim() || undefined,
        notes: notes.trim() || undefined
      };

      const payload = {
        applicantName: applicantName.trim(),
        gradeApplyingFor,
        institutionId: selectedInstitutionId,
        campusId: selectedCampusId,
        status,
        customFieldsJson: JSON.stringify(customFields)
      };

      const response = await api.post<Application>('/api/applications', payload);
      const created = response.data;

      setCreatedApplicationNumber(created.applicationNumber || 'APP-CONFIRMED');
      setIsSuccess(true);
      onSuccess(created);

      // Reset form after short delay if modal is dismissed
    } catch (err: any) {
      console.error('Failed to create application:', err);
      const msg = err.response?.data?.message || err.response?.data || err.message || 'Failed to submit application. Please check input details.';
      setSubmitError(typeof msg === 'string' ? msg : 'An unexpected error occurred while saving the application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    if (isSubmitting) return;
    setIsSuccess(false);
    setApplicantName('');
    setParentName('');
    setContactPhone('');
    setContactEmail('');
    setStudentPhoto(null);
    setNotes('');
    setPreviousSchool('');
    setSubmitError(null);
    onClose();
  };

  if (!isOpen) return null;

  const currentCampuses = institutions.find(i => i.id === selectedInstitutionId)?.campuses || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
          onClick={handleModalClose}
        />

        <div className="relative inline-block w-full max-w-3xl my-8 text-left bg-white rounded-2xl shadow-2xl transform transition-all z-10 border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight">Direct Student Admission Application</h3>
                <p className="text-xs text-blue-200">Register a direct walk-in application with student photograph & guardian details</p>
              </div>
            </div>
            <button
              onClick={handleModalClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success Screen */}
          {isSuccess ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">Application Registered Successfully!</h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                The admission application file for <strong className="text-slate-900">{applicantName}</strong> has been created with reference number:
              </p>
              <div className="inline-block bg-slate-100 border border-slate-300 px-4 py-2 rounded-xl font-mono text-base font-bold text-blue-700 shadow-inner">
                {createdApplicationNumber}
              </div>
              <div className="flex justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow-sm"
                >
                  View in Applications Table
                </button>
              </div>
            </div>
          ) : (
            /* Application Form */
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {submitError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* 1. Student Photograph Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    Student Photograph
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">Passport size (JPG, PNG, WebP)</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Photo Preview Circle / Card */}
                  <div className="relative group shrink-0">
                    {studentPhoto ? (
                      <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md">
                        <img 
                          src={studentPhoto} 
                          alt="Student Preview" 
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm opacity-90 hover:opacity-100 transition"
                          title="Remove Photograph"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 cursor-pointer transition group-hover:shadow-xs"
                      >
                        <User className="w-8 h-8 mb-1 text-slate-300 group-hover:text-blue-500 transition" />
                        <span className="text-[10px] font-bold">Add Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handlePhotoSelect} 
                      accept="image/png, image/jpeg, image/webp" 
                      className="hidden" 
                    />
                    <div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 transition shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        {studentPhoto ? 'Replace Photograph' : 'Choose Photograph File'}
                      </button>
                      {studentPhoto && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="ml-2 text-xs text-rose-600 hover:underline font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Upload a front-facing formal passport photograph for student ID card, examination slip, and permanent admission archive.
                    </p>
                    {photoError && (
                      <p className="text-xs text-rose-600 font-semibold">{photoError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Student Basic Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  Student Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={e => setApplicantName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Applying For Grade *
                    </label>
                    <select
                      value={gradeApplyingFor}
                      onChange={e => setGradeApplyingFor(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      {GRADES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={e => setDateOfBirth(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Institution & Campus Choice */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  School & Campus Enrollment
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Institution / School
                    </label>
                    <select
                      value={selectedInstitutionId}
                      onChange={e => handleInstitutionChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Campus
                    </label>
                    <select
                      value={selectedCampusId}
                      onChange={e => setSelectedCampusId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      {currentCampuses.map(camp => (
                        <option key={camp.id} value={camp.id}>{camp.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      value={academicYear}
                      onChange={e => setAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Parent / Guardian Details */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-500" />
                  Parent / Guardian Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Parent / Guardian Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={parentName}
                      onChange={e => setParentName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Relationship
                    </label>
                    <select
                      value={relationship}
                      onChange={e => setRelationship(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Legal Guardian">Legal Guardian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Previous School, Status & Intake Notes */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                  Academic History & Intake Notes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Previous School Attended (if applicable)
                    </label>
                    <input
                      type="text"
                      value={previousSchool}
                      onChange={e => setPreviousSchool(e.target.value)}
                      placeholder="e.g. Modern Public School, CBSE"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Initial Application Status
                    </label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="Submitted">Submitted (Ready for Assessment)</option>
                      <option value="UnderReview">Under Review</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Special Notes / Requirements
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. Transport required on Route 4, Sibling enrolled in Grade 5, Sports scholarship candidate..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Application...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Create Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
