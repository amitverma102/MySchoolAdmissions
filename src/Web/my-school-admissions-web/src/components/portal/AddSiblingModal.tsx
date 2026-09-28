import { useState, useRef } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Sparkles, UserPlus } from 'lucide-react';
import api from '../../lib/api';

interface AddSiblingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newApplication: any) => void;
  parentInfo: {
    name: string;
    email: string;
    phone: string;
    relationship: string;
    address?: string;
  };
  siblingReference?: {
    name: string;
    grade: string;
    applicationNumber: string;
  };
}

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

export default function AddSiblingModal({
  isOpen,
  onClose,
  onSuccess,
  parentInfo,
  siblingReference
}: AddSiblingModalProps) {
  const [applicantName, setApplicantName] = useState('');
  const [gradeApplyingFor, setGradeApplyingFor] = useState('Grade 1');
  const [gender, setGender] = useState('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdAppNumber, setCreatedAppNumber] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 360;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setStudentPhoto(compressed);
          setError(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim()) {
      setError('Please provide student full name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const customFields = {
        parentName: parentInfo.name,
        contactEmail: parentInfo.email,
        contactPhone: parentInfo.phone,
        relationship: parentInfo.relationship,
        address: parentInfo.address,
        gender,
        dateOfBirth,
        previousSchool: previousSchool.trim() || undefined,
        studentPhoto: studentPhoto || undefined,
        notes: notes.trim() || undefined,
        isSiblingApplication: true,
        siblingReferenceName: siblingReference?.name,
        siblingReferenceApp: siblingReference?.applicationNumber,
        siblingDiscountEligible: true,
        academicYear: '2026-2027',
        schoolName: 'Delhi International School',
        campusName: 'DIS Sector 23 Campus'
      };

      const payload = {
        applicantName: applicantName.trim(),
        gradeApplyingFor,
        institutionId: 'fc49d553-b44f-4c4c-96ad-4bf599016c01',
        campusId: '866bc5ca-0dbd-4482-b52c-102398d4c65d',
        status: 'Submitted',
        customFieldsJson: JSON.stringify(customFields)
      };

      const response = await api.post('/api/applications', payload);
      const created = response.data;

      setCreatedAppNumber(created.applicationNumber || 'APP-CONFIRMED');
      setIsSuccess(true);
      onSuccess(created);
    } catch (err: any) {
      console.error('Failed to submit sibling application:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsSuccess(false);
    setApplicantName('');
    setStudentPhoto(null);
    setNotes('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={handleClose} />

        <div className="relative inline-block w-full max-w-2xl p-6 sm:p-8 my-8 text-left bg-white rounded-3xl shadow-2xl transform transition-all border border-slate-100">
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Register Sibling Admission
                </h3>
                <p className="text-xs text-slate-500">
                  Add another child to your account with auto-applied Sibling Concession
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sibling Advantage Notice */}
          <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Sibling Privilege Benefit Active
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                {siblingReference ? (
                  <>Linked with enrolled ward <strong>{siblingReference.name} ({siblingReference.grade})</strong>. This child automatically qualifies for a <strong>10% Sibling Fee Concession</strong> on annual tuition fees.</>
                ) : (
                  <>Parent identity pre-filled. New student automatically qualifies for sibling discount privileges.</>
                )}
              </p>
            </div>
          </div>

          {isSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">Sibling Application Submitted!</h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Application reference <strong>{createdAppNumber}</strong> for <strong>{applicantName}</strong> has been successfully linked to your parent account.
              </p>
              <div className="pt-4">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md hover:bg-blue-700 transition"
                >
                  View in Family Portal
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Photo & Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                {/* Photo Dropzone */}
                <div className="sm:col-span-4 flex flex-col items-center text-center">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 flex flex-col items-center justify-center cursor-pointer transition overflow-hidden group shadow-2xs"
                  >
                    {studentPhoto ? (
                      <img src={studentPhoto} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-600 mb-1" />
                        <span className="text-[11px] font-semibold text-slate-500 group-hover:text-blue-600">Student Photo</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <span className="text-[11px] text-slate-400 mt-1">Click to upload photo</span>
                </div>

                {/* Name & Grade */}
                <div className="sm:col-span-8 space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Child's Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aarav Malhotra"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Grade Applying *
                      </label>
                      <select
                        value={gradeApplyingFor}
                        onChange={(e) => setGradeApplyingFor(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      >
                        {GRADES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* DOB & Previous School */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Previous School (if any)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lotus Valley Preschool"
                    value={previousSchool}
                    onChange={(e) => setPreviousSchool(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* Pre-filled Parent Info Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Inherited Parent Account Details (Fixed)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div><span className="text-slate-500">Guardian:</span> <strong className="text-slate-800">{parentInfo.name}</strong></div>
                  <div><span className="text-slate-500">Email:</span> <strong className="text-slate-800">{parentInfo.email}</strong></div>
                  <div><span className="text-slate-500">Phone:</span> <strong className="text-slate-800">{parentInfo.phone}</strong></div>
                </div>
              </div>

              {/* Intake Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Special Notes / Sibling Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sibling discount requested, same school transport needed..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Submit Sibling Application</span>
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
