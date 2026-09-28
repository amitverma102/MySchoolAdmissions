import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CreditCard, 
  Download, 
  ExternalLink, 
  Sparkles, 
  Phone, 
  Mail, 
  UserPlus, 
  LogOut, 
  Building2, 
  Award, 
  ShieldCheck, 
  Upload, 
  MessageSquare,
  RefreshCw,
  Check
} from 'lucide-react';
import api from '../lib/api';
import AddSiblingModal from '../components/portal/AddSiblingModal';
import PaymentCheckoutModal from '../components/payment/PaymentCheckoutModal';

interface Assessment {
  id: string;
  type: string;
  scheduledDate: string;
  status: string;
  score?: string;
  feedback?: string;
}

interface ApplicationDoc {
  id: string;
  documentType: string;
  documentName: string;
  status: string;
  uploadedAt: string;
}

interface Application {
  id: string;
  applicationNumber: string;
  applicantName: string;
  gradeApplyingFor: string;
  status: string;
  submittedDate: string;
  createdAt: string;
  customFieldsJson?: string;
  assessments?: Assessment[];
  documents?: ApplicationDoc[];
}

interface CustomFields {
  parentName?: string;
  contactEmail?: string;
  contactPhone?: string;
  relationship?: string;
  gender?: string;
  dateOfBirth?: string;
  previousSchool?: string;
  studentPhoto?: string;
  notes?: string;
  address?: string;
  isSiblingApplication?: boolean;
  siblingReferenceName?: string;
  siblingReferenceApp?: string;
  siblingDiscountEligible?: boolean;
  schoolName?: string;
  campusName?: string;
}

function deriveNameFromEmail(userEmail: string): string {
  const local = (userEmail || '').split('@')[0] || 'Parent User';
  return local
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export default function ParentPortal() {
  const navigate = useNavigate();
  const [wards, setWards] = useState<Application[]>([]);
  const [selectedWardIndex, setSelectedWardIndex] = useState(0);
  const [, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'fees' | 'counselor'>('overview');
  
  // Modals
  const [isAddSiblingOpen, setIsAddSiblingOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  
  // Parent details
  const initialEmail = localStorage.getItem('userEmail') || 'parent@example.com';
  const initialName = localStorage.getItem('userName') || deriveNameFromEmail(initialEmail);
  const [parentEmail, setParentEmail] = useState<string>(initialEmail);
  const [parentName, setParentName] = useState<string>(initialName);
  const [parentPhone, setParentPhone] = useState<string>('+91 98112 23344');

  // Document upload state
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [docUploadSuccess, setDocUploadSuccess] = useState<string | null>(null);

  const fetchWards = async () => {
    setIsRefreshing(true);
    try {
      const email = localStorage.getItem('userEmail') || parentEmail;
      setParentEmail(email);
      const storedName = localStorage.getItem('userName');
      if (storedName) {
        setParentName(storedName);
      }

      let loadedWards: Application[] = [];

      // 1. Try querying my-wards with parent email
      try {
        const response = await api.get<Application[]>(`/api/applications/my-wards?email=${encodeURIComponent(email)}`);
        if (Array.isArray(response.data) && response.data.length > 0) {
          loadedWards = response.data;
        }
      } catch (err) {
        console.warn('my-wards API call failed, falling back:', err);
      }

      // Fallback: Query all applications and filter locally
      if (loadedWards.length === 0) {
        const allRes = await api.get<Application[]>('/api/applications');
        const searchEmail = email.toLowerCase();
        const currentName = (localStorage.getItem('userName') || parentName).toLowerCase();
        const lastName = currentName.split(' ').slice(-1)[0] || '';

        const matched = allRes.data.filter(a => {
          if (!a.customFieldsJson) return false;
          const json = a.customFieldsJson.toLowerCase();
          return json.includes(searchEmail) || 
                 (currentName && json.includes(currentName)) ||
                 (lastName.length > 2 && json.includes(lastName));
        });

        if (matched.length > 0) {
          loadedWards = matched;
        }
      }

      if (loadedWards.length > 0) {
        setWards(loadedWards);

        // Inspect customFieldsJson for parent contact details
        for (const w of loadedWards) {
          if (w.customFieldsJson) {
            try {
              const parsed = JSON.parse(w.customFieldsJson);
              if (parsed.parentName && !localStorage.getItem('userName')) {
                setParentName(parsed.parentName);
                localStorage.setItem('userName', parsed.parentName);
              }
              if (parsed.contactPhone) {
                setParentPhone(parsed.contactPhone);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch wards:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  const activeWard = wards[selectedWardIndex] || null;

  // Parse custom fields safely
  const parsedCustomFields: CustomFields = (() => {
    if (!activeWard?.customFieldsJson) return {};
    try {
      return JSON.parse(activeWard.customFieldsJson);
    } catch {
      return {};
    }
  })();

  const handleSiblingSuccess = (newApp: Application) => {
    setWards(prev => [newApp, ...prev]);
    setSelectedWardIndex(0);
    setIsAddSiblingOpen(false);
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRoles');
    navigate('/login');
  };

  const handleSimulateDocUpload = (docKey: string) => {
    setUploadedDocs(prev => ({
      ...prev,
      [docKey]: 'Uploaded & Verified ✓'
    }));
    setDocUploadSuccess(`Document "${docKey}" successfully uploaded and queued for counselor review.`);
    setTimeout(() => setDocUploadSuccess(null), 4000);
  };

  const handleDownloadCalendarInvite = () => {
    const assessment = activeWard?.assessments?.[0];
    const dateStr = assessment?.scheduledDate || new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MySchoolAdmissions//ParentPortal//EN',
      'BEGIN:VEVENT',
      `SUMMARY:School Admission Interaction - ${activeWard?.applicantName || 'Student'}`,
      `DESCRIPTION:Campus tour and interaction with Academic Principal for ${activeWard?.applicantName || 'Student'}. Venue: Delhi International School, Sector 23.`,
      `DTSTART:${dateStr.replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${dateStr.replace(/[-:]/g, '').split('.')[0]}Z`,
      'LOCATION:Delhi International School, Sector 23, Dwarka, New Delhi',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `Admission_Interaction_${activeWard?.applicantName || 'Ward'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Determine stage progression (1 to 6)
  const getStageStatus = (stageNum: number) => {
    const status = activeWard?.status?.toLowerCase() || '';
    const hasAssessments = (activeWard?.assessments?.length || 0) > 0;

    if (stageNum === 1) return 'completed'; // Application submitted
    if (stageNum === 2) return 'completed'; // Documents uploaded
    if (stageNum === 3) {
      if (status === 'onboarded' || status === 'enrolled' || status === 'approved') return 'completed';
      if (hasAssessments || status === 'submitted' || status === 'underreview') return 'current';
      return 'upcoming';
    }
    if (stageNum === 4) {
      if (status === 'onboarded' || status === 'enrolled' || status === 'approved') return 'completed';
      return 'upcoming';
    }
    if (stageNum === 5) {
      if (status === 'onboarded' || status === 'enrolled') return 'completed';
      if (status === 'approved') return 'current';
      return 'upcoming';
    }
    if (stageNum === 6) {
      if (status === 'onboarded' || status === 'enrolled') return 'completed';
      return 'upcoming';
    }
    return 'upcoming';
  };

  const stages = [
    { num: 1, title: 'Application Form', desc: 'Submitted & Reference Assigned' },
    { num: 2, title: 'Document Verification', desc: 'Proof of Age & Prior Records' },
    { num: 3, title: 'Interaction & Assessment', desc: 'Diagnostic & Principal Meeting' },
    { num: 4, title: 'Offer & Sibling Concession', desc: 'Admission Offer Letter' },
    { num: 5, title: 'Fee Payment & Seat Lock', desc: 'Deposit Online' },
    { num: 6, title: 'Confirmed Enrollment', desc: 'Class Section & Welcome Kit' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                  MySchoolAdmissions
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-400/30 uppercase tracking-widest">
                  Parent & Student Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">Unified Family Admission & Ward Tracking Hub</p>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchWards}
              disabled={isRefreshing}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
              title="Refresh Admission Status"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            {/* Parent Account Card */}
            <div className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
                {parentName.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || 'PA'}
              </div>
              <div>
                <div className="font-bold text-slate-200">{parentName}</div>
                <div className="text-[11px] text-slate-400 font-mono">{parentEmail}</div>
              </div>
            </div>

            <Link
              to="/dashboard"
              className="hidden lg:inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              title="Switch to Staff Admissions CRM View"
            >
              <span>Staff CRM</span>
              <ExternalLink className="w-3 h-3 ml-1.5 text-slate-400" />
            </Link>

            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        {/* Family Greeting & Multi-Student Notice */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-purple-900/60 border border-blue-500/20 p-6 sm:p-8 shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{parentName.trim().split(' ').length > 1 ? parentName.trim().split(' ').slice(-1)[0] : parentName.trim()} Family Admissions Account • Active Academic Session 2026–2027</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {parentName}
              </h1>
              <p className="mt-1.5 text-sm text-slate-300 max-w-2xl leading-relaxed">
                You have <strong>{wards.length} children</strong> linked to this account. Easily monitor application stages, schedule campus interactions, verify documents, and claim sibling concessions from one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsAddSiblingOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition transform hover:-translate-y-0.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Apply for Another Child (Sibling)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 1. Multi-Student Ward Switcher Bar */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Select Student / Ward to View Progress</span>
            </div>
            <span className="text-xs text-slate-400">
              Showing <strong>{wards.length}</strong> linked student records
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wards.map((ward, idx) => {
              const isSelected = idx === selectedWardIndex;
              let fields: CustomFields = {};
              try {
                if (ward.customFieldsJson) fields = JSON.parse(ward.customFieldsJson);
              } catch {}

              const isSibling = fields.isSiblingApplication || idx > 0;

              return (
                <div
                  key={ward.id}
                  onClick={() => setSelectedWardIndex(idx)}
                  className={`cursor-pointer rounded-2xl p-4.5 border transition-all duration-200 relative overflow-hidden flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-slate-800/95 border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/40'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Avatar */}
                    <div className="relative">
                      {fields.studentPhoto ? (
                        <img
                          src={fields.studentPhoto}
                          alt={ward.applicantName}
                          className="w-13 h-13 rounded-2xl object-cover border-2 border-slate-700 shadow-xs"
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
                          {ward.applicantName.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base">
                          {ward.applicantName}
                        </h4>
                        {isSibling && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Sibling
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 font-medium mt-0.5">
                        {ward.gradeApplyingFor} • {fields.schoolName || 'Delhi International School'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">
                        Ref: {ward.applicationNumber}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      ward.status === 'Onboarded' || ward.status === 'Enrolled'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : ward.status === 'UnderReview'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                    }`}>
                      {ward.status === 'Submitted' ? 'Under Review' : ward.status}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {isSelected ? '● Active View' : 'Click to View'}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick Sibling Card */}
            <div
              onClick={() => setIsAddSiblingOpen(true)}
              className="cursor-pointer rounded-2xl p-4.5 border-2 border-dashed border-slate-700 hover:border-purple-500 bg-slate-800/20 hover:bg-purple-950/20 transition-all flex items-center justify-center text-center group"
            >
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-300 group-hover:text-purple-300">
                  + Apply for Another Sibling
                </span>
                <span className="text-[10px] text-slate-500">Auto 10% Fee Concession</span>
              </div>
            </div>
          </div>
        </div>

        {activeWard ? (
          <>
            {/* 2. Admission Journey Stepper */}
            <div className="bg-slate-800/60 rounded-3xl border border-slate-700/80 p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-700/60 gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    Admission Progression Tracker
                  </div>
                  <h3 className="text-xl font-bold text-white mt-0.5">
                    {activeWard.applicantName}’s Admission Journey
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Application #{activeWard.applicationNumber} • Applied for {activeWard.gradeApplyingFor} (Session 2026–2027)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Current Stage: {activeWard.status === 'Onboarded' ? 'Confirmed Enrolled' : 'Assessment & Interaction'}</span>
                  </span>
                </div>
              </div>

              {/* Stepper Progression */}
              <div className="mt-8 relative">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6 relative">
                  {stages.map((stage) => {
                    const status = getStageStatus(stage.num);

                    return (
                      <div key={stage.num} className="flex md:flex-col items-start gap-3 relative">
                        {/* Circle Indicator */}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 transition shadow-md ${
                          status === 'completed'
                            ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                            : status === 'current'
                            ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white ring-4 ring-blue-500/30 shadow-blue-500/30 animate-pulse'
                            : 'bg-slate-700/60 text-slate-400 border border-slate-600'
                        }`}>
                          {status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            stage.num
                          )}
                        </div>

                        <div>
                          <div className={`text-xs font-bold ${
                            status === 'completed'
                              ? 'text-emerald-400'
                              : status === 'current'
                              ? 'text-blue-300 font-extrabold'
                              : 'text-slate-400'
                          }`}>
                            {stage.title}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            {stage.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Detail Navigation Tabs */}
            <div className="flex border-b border-slate-800 space-x-2 sm:space-x-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 font-bold text-sm rounded-t-xl transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Overview & Schedule</span>
              </button>

              <button
                onClick={() => setActiveTab('documents')}
                className={`py-3 px-4 font-bold text-sm rounded-t-xl transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Document Locker</span>
              </button>

              <button
                onClick={() => setActiveTab('fees')}
                className={`py-3 px-4 font-bold text-sm rounded-t-xl transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'fees'
                    ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Fees & Sibling Concession</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>

              <button
                onClick={() => setActiveTab('counselor')}
                className={`py-3 px-4 font-bold text-sm rounded-t-xl transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'counselor'
                    ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Counselor Notes</span>
              </button>
            </div>

            {/* 4. Tab Content Views */}

            {/* TAB 1: OVERVIEW & SCHEDULE */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Assessment & Appointment Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Scheduled Interaction Card */}
                  <div className="rounded-3xl bg-slate-800/70 border border-slate-700/80 p-6 sm:p-7 shadow-xl">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base">
                            Upcoming Campus Interaction & Assessment
                          </h4>
                          <p className="text-xs text-slate-400">Scheduled in-person meeting with Admissions Committee</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Confirmed Slot
                      </span>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50">
                        <span className="text-xs text-slate-400 block mb-1">Interaction Type</span>
                        <strong className="text-sm text-slate-100 block">
                          {activeWard.assessments?.[0]?.type || 'Principal Interaction & Diagnostic Evaluation'}
                        </strong>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50">
                        <span className="text-xs text-slate-400 block mb-1">Date & Reporting Time</span>
                        <strong className="text-sm text-amber-300 block">
                          Wednesday, Sep 30, 2026 • 09:30 AM IST
                        </strong>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50">
                        <span className="text-xs text-slate-400 block mb-1">Campus Venue</span>
                        <strong className="text-sm text-slate-100 block">
                          Delhi International School, Sector 23, Dwarka
                        </strong>
                        <span className="text-[11px] text-slate-500">Main Administrative Block, Conference Hall 2</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/50">
                        <span className="text-xs text-slate-400 block mb-1">Panel Members</span>
                        <strong className="text-sm text-slate-100 block">
                          Academic Principal & Senior Counselor
                        </strong>
                        <span className="text-[11px] text-slate-500">Contact Counselor: Rani Devi (+91 98765 43121)</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-400">
                        📌 <em>Please arrive 15 minutes before the slot with your ward's portfolio & passport photos.</em>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDownloadCalendarInvite}
                          className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs transition flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Add to Calendar (.ics)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sibling Privilege Banner */}
                  <div className="rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/40 border border-purple-500/30 p-6 shadow-xl flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-300 flex items-center justify-center shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base flex items-center gap-2">
                        <span>Sibling Privilege Program Active</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Pre-Approved
                        </span>
                      </h4>
                      {(() => {
                        const otherWard = wards.find((_, i) => i !== selectedWardIndex);
                        const elderSiblingName = parsedCustomFields.siblingReferenceName 
                          || otherWard?.applicantName 
                          || 'elder sibling';
                        const elderSiblingGrade = otherWard?.gradeApplyingFor || 'Senior School';
                        return (
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            Because your ward <strong>{elderSiblingName}</strong> is already enrolled in {elderSiblingGrade} at Delhi International School, <strong>{activeWard.applicantName}</strong> is automatically entitled to our <strong>10% Sibling Fee Concession</strong> on the annual tuition fee upon final admission confirmation.
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Right Col: Student Details Summary */}
                <div className="space-y-6">
                  <div className="rounded-3xl bg-slate-800/70 border border-slate-700/80 p-6 shadow-xl space-y-4">
                    <h4 className="font-bold text-white text-sm uppercase tracking-wider text-slate-400">
                      Ward Application Profile
                    </h4>

                    <div className="flex items-center gap-3 pb-3 border-b border-slate-700/60">
                      {parsedCustomFields.studentPhoto ? (
                        <img
                          src={parsedCustomFields.studentPhoto}
                          alt="Ward"
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                          {activeWard.applicantName[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white text-base">{activeWard.applicantName}</div>
                        <div className="text-xs text-slate-400">{activeWard.gradeApplyingFor}</div>
                        <div className="text-[11px] text-blue-400 font-mono mt-0.5">{activeWard.applicationNumber}</div>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-700/40">
                        <span className="text-slate-400">Target Academic Session</span>
                        <strong className="text-slate-200">2026–2027</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/40">
                        <span className="text-slate-400">Gender</span>
                        <strong className="text-slate-200">{parsedCustomFields.gender || 'Male'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/40">
                        <span className="text-slate-400">Date of Birth</span>
                        <strong className="text-slate-200">{parsedCustomFields.dateOfBirth || 'May 14, 2018'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/40">
                        <span className="text-slate-400">Previous School</span>
                        <strong className="text-slate-200">{parsedCustomFields.previousSchool || 'Lotus Valley Public School'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-700/40">
                        <span className="text-slate-400">Registered Guardian</span>
                        <strong className="text-slate-200">{parsedCustomFields.parentName || parentName} ({parsedCustomFields.relationship || 'Father'})</strong>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => setActiveTab('fees')}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>View Fee Breakdown & Sibling Rebate</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DOCUMENT LOCKER */}
            {activeTab === 'documents' && (
              <div className="rounded-3xl bg-slate-800/70 border border-slate-700/80 p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/60 gap-4">
                  <div>
                    <h4 className="font-bold text-white text-lg">
                      Digital Document Verification Locker
                    </h4>
                    <p className="text-xs text-slate-400">
                      Upload and track required credentials for <strong>{activeWard.applicantName}</strong>
                    </p>
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>4 of 5 Mandatory Documents Verified</span>
                  </div>
                </div>

                {docUploadSuccess && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{docUploadSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Doc 1 */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-200">Birth Certificate</div>
                        <div className="text-[11px] text-slate-400">Municipal Corporation Proof of Age</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Verified ✓
                    </span>
                  </div>

                  {/* Doc 2 */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-200">Previous Term Report Card</div>
                        <div className="text-[11px] text-slate-400">Grade 2 Cumulative Transcript</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Verified ✓
                    </span>
                  </div>

                  {/* Doc 3 */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-200">Parent ID & Address Proof</div>
                        <div className="text-[11px] text-slate-400">Aadhaar / Passport copy</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Verified ✓
                    </span>
                  </div>

                  {/* Doc 4 */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-200">Student Passport Photograph</div>
                        <div className="text-[11px] text-slate-400">High-resolution color headshot</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Verified ✓
                    </span>
                  </div>

                  {/* Doc 5 - Pending / Action Required */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-amber-500/40 flex items-center justify-between md:col-span-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-200">Medical Record & Immunization Chart</div>
                        <div className="text-[11px] text-slate-400">Required prior to orientation day</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {uploadedDocs['medical'] ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {uploadedDocs['medical']}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSimulateDocUpload('medical')}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Immunization PDF</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FEES & SIBLING CONCESSION */}
            {activeTab === 'fees' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Fee Breakdown Card */}
                <div className="lg:col-span-8 rounded-3xl bg-slate-800/70 border border-slate-700/80 p-6 sm:p-8 shadow-xl space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
                    <div>
                      <h4 className="font-bold text-white text-lg">
                        Fee Schedule & Sibling Concession Breakdown
                      </h4>
                      <p className="text-xs text-slate-400">
                        Annual academic fees for {activeWard.gradeApplyingFor} (Session 2026–2027)
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Sibling Rebate Applied
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-700/40">
                      <span className="text-slate-300">Annual Tuition Fee ({activeWard.gradeApplyingFor})</span>
                      <span className="text-slate-100 font-mono font-semibold">₹2,20,000</span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-slate-700/40">
                      <span className="text-slate-300">Admission & Registration Fee (One-Time)</span>
                      <span className="text-slate-100 font-mono font-semibold">₹30,000</span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-slate-700/40 text-emerald-400">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>Sibling Concession (10% on Tuition Fee)</span>
                      </span>
                      <span className="font-mono font-bold">-₹22,000</span>
                    </div>

                    <div className="flex justify-between py-3 pt-4 border-t-2 border-slate-700 text-base font-bold">
                      <span className="text-white">Net Annual Payable</span>
                      <span className="text-emerald-400 font-mono text-xl">₹2,28,000</span>
                    </div>
                  </div>

                  {/* Seat Lock Notice */}
                  <div className="p-4 rounded-2xl bg-blue-900/30 border border-blue-500/30 flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                        Seat Reservation Policy
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        To lock the provisional admission seat for <strong>{activeWard.applicantName}</strong>, parents can deposit a seat confirmation advance of <strong>₹25,000</strong> (fully adjusted against Q1 tuition fees).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Col: Instant Payment CTA Card */}
                <div className="lg:col-span-4 rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 p-6 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Online Payment Gateway
                    </div>
                    <div className="text-3xl font-extrabold text-white font-mono">
                      ₹25,000
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Advance Seat Confirmation Deposit
                    </p>

                    <div className="mt-6 space-y-2 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Instant digital receipt & SMS trigger</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Accepted: UPI, Cards, NetBanking, EMI</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>100% Secure 256-bit encrypted checkout</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-700/60">
                    <button
                      onClick={() => setIsPaymentOpen(true)}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Seat Deposit Online</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: COUNSELOR COMMUNICATIONS */}
            {activeTab === 'counselor' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-3xl bg-slate-800/70 border border-slate-700/80 p-6 sm:p-8 shadow-xl space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
                    <div>
                      <h4 className="font-bold text-white text-lg">
                        Admissions Counselor Log & Call History
                      </h4>
                      <p className="text-xs text-slate-400">
                        Record of telephone consultations & counselor updates
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Call Record 1 */}
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300">
                            📞 Outbound Telephone Call
                          </span>
                          <span className="text-slate-400">Sep 24, 2026 • 02:15 PM</span>
                        </div>
                        <span className="px-2 py-0.5 rounded font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                          Synced to Google Drive ✓
                        </span>
                      </div>
                      {(() => {
                        const otherWard = wards.find((_, i) => i !== selectedWardIndex);
                        const elderSiblingName = parsedCustomFields.siblingReferenceName 
                          || otherWard?.applicantName 
                          || 'elder sibling';
                        const elderSiblingGrade = otherWard?.gradeApplyingFor || 'Grade 9';
                        return (
                          <p className="text-xs text-slate-300 leading-relaxed">
                            <em>"Consultation held with parent {parentName}. Discussed curriculum options for {activeWard.applicantName}, verified Sibling concession eligibility with {elderSiblingName} ({elderSiblingGrade}), and scheduled Principal diagnostic interaction for Sep 30, 2026."</em>
                          </p>
                        );
                      })()}
                      <div className="text-[11px] text-slate-500">
                        Counselor: <strong>Rani Devi</strong> • Duration: <strong>02:25</strong>
                      </div>
                    </div>

                    {/* Inquiry Submission Record */}
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300">
                          📝 Online Application Registered
                        </span>
                        <span className="text-slate-400">{new Date(activeWard.submittedDate).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Application submitted for {activeWard.applicantName} ({activeWard.gradeApplyingFor}). Automated capacity-aware counselor routing triggered.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Counselor Contact Profile */}
                <div className="rounded-3xl bg-slate-800/70 border border-slate-700/80 p-6 shadow-xl space-y-4">
                  <h4 className="font-bold text-white text-sm uppercase tracking-wider text-slate-400">
                    Assigned Admissions Counselor
                  </h4>

                  <div className="flex items-center gap-3 pb-3 border-b border-slate-700/60">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
                      RD
                    </div>
                    <div>
                      <div className="font-bold text-white text-base">Rani Devi</div>
                      <div className="text-xs text-slate-400">Senior Admissions Counselor</div>
                      <div className="text-[11px] text-emerald-400">● Available on Campus</div>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>+91 98765 43121</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>admissions.counselor@dis.com</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-300">
                      <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Admissions Desk, Sector 23 Campus</span>
                    </div>
                  </div>

                  <div className="pt-3 space-y-2">
                    <a
                      href="https://wa.me/919876543121"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Counselor</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center bg-slate-800/40 rounded-3xl border border-slate-700">
            <Users className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No active student records found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Start by submitting an application for your child to monitor their journey here.
            </p>
            <button
              onClick={() => setIsAddSiblingOpen(true)}
              className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition"
            >
              + Register New Child Application
            </button>
          </div>
        )}
      </main>

      {/* Sibling Application Modal */}
      <AddSiblingModal
        isOpen={isAddSiblingOpen}
        onClose={() => setIsAddSiblingOpen(false)}
        onSuccess={handleSiblingSuccess}
        parentInfo={{
          name: parentName,
          email: parentEmail,
          phone: parentPhone,
          relationship: parsedCustomFields.relationship || 'Parent',
          address: parsedCustomFields.address || 'DLF Phase 5, Gurugram, Haryana'
        }}
        siblingReference={activeWard ? {
          name: activeWard.applicantName,
          grade: activeWard.gradeApplyingFor,
          applicationNumber: activeWard.applicationNumber
        } : undefined}
      />

      {/* Payment Gateway Modal */}
      <PaymentCheckoutModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onPaymentSuccess={() => {
          setIsPaymentOpen(false);
          fetchWards();
        }}
        applicationNumber={activeWard?.applicationNumber || 'APP2026-SEAT-LOCK'}
        applicantName={activeWard?.applicantName || 'Student Ward'}
        schoolName="Delhi International School"
        grade={activeWard?.gradeApplyingFor || 'Grade 3'}
        initialAmount={25000}
        defaultFeeType="seatLock"
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>MySchoolAdmissions Family Admission Portal • Session 2026–2027</div>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-slate-300">Public Portal</Link>
            <Link to="/dashboard" className="hover:text-slate-300">Staff Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
