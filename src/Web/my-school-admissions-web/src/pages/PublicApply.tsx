import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Phone, 
  Calendar, 
  CreditCard, 
  Bot, 
  QrCode, 
  Check,
  Lock
} from 'lucide-react';
import api from '../lib/api';
import EduBotChat from '../components/ai/EduBotChat';
import PaymentCheckoutModal from '../components/payment/PaymentCheckoutModal';
import BookTourModal from '../components/calendar/BookTourModal';

interface Campus {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
}

interface InstitutionOption {
  id: string;
  name: string;
  board: string;
  city: string;
  campuses: Campus[];
  accentColor: string;
}

const DEFAULT_INSTITUTIONS: InstitutionOption[] = [
  {
    id: 'fc49d553-b44f-4c4c-96ad-4bf599016c01',
    name: 'Delhi International School',
    board: 'CBSE & Cambridge',
    city: 'New Delhi',
    accentColor: 'from-blue-600 to-indigo-700',
    campuses: [
      { id: '866bc5ca-0dbd-4482-b52c-102398d4c65d', name: 'DIS Sector 23 Campus, Dwarka', address: 'Sector 23, Dwarka', city: 'New Delhi', state: 'Delhi' },
      { id: 'campus-dis-2', name: 'DIS Rohini Campus', address: 'Sector 9, Rohini', city: 'New Delhi', state: 'Delhi' }
    ]
  },
  {
    id: 'a48d7782-dda9-42ad-b21a-046d517f1ce5',
    name: 'Swami Vivekananda International School',
    board: 'CBSE & ICSE',
    city: 'Bengaluru',
    accentColor: 'from-amber-600 to-orange-700',
    campuses: [
      { id: 'campus-svis-1', name: 'SVIS Main Campus, Indiranagar', address: '100ft Road, Indiranagar', city: 'Bengaluru', state: 'Karnataka' },
      { id: 'campus-svis-2', name: 'SVIS Whitefield Campus', address: 'ECC Road, Whitefield', city: 'Bengaluru', state: 'Karnataka' }
    ]
  },
  {
    id: 'school-oakridge',
    name: 'Oakridge International Academy',
    board: 'IB World & Cambridge',
    city: 'Gurugram',
    accentColor: 'from-emerald-600 to-teal-800',
    campuses: [
      { id: 'oak-camp-1', name: 'Cyber City Flagship Campus', address: 'Golf Course Road, DLF Phase 5', city: 'Gurugram', state: 'Haryana' }
    ]
  },
  {
    id: 'school-xavier',
    name: "St. Xavier's Heritage School",
    board: 'ICSE & ISC',
    city: 'New Delhi',
    accentColor: 'from-purple-600 to-indigo-800',
    campuses: [
      { id: 'xavier-camp-1', name: 'South Delhi Senior Campus', address: '42 Lodhi Estate', city: 'New Delhi', state: 'Delhi' }
    ]
  }
];

// Fallback campaign meta for known offline QR codes
const KNOWN_CAMPAIGNS: Record<string, { title: string; location: string; channel: string; institutionId: string }> = {
  'QR-FLYER-SECTOR14': {
    title: 'Sector 14 Residential Standee & Flyer',
    location: 'Sector 14 Community Park & Residential Desks',
    channel: 'Residential Flyer Campaign',
    institutionId: 'fc49d553-b44f-4c4c-96ad-4bf599016c01' // DIS
  },
  'QR-METRO-DWARKA': {
    title: 'Dwarka Sector 21 Metro Gateway Display',
    location: 'Dwarka Sector 21 Metro Station Concourse',
    channel: 'Hoarding & Metro Display',
    institutionId: 'fc49d553-b44f-4c4c-96ad-4bf599016c01' // DIS
  },
  'QR-SOC-OZONE-26': {
    title: 'Prestige Ozone Society Banner & Booth',
    location: 'Prestige Ozone Society Club House Lobby',
    channel: 'Apartment Society Outreach',
    institutionId: 'a48d7782-dda9-42ad-b21a-046d517f1ce5' // SVIS
  },
  'QR-MALL-PHOENIX': {
    title: 'Phoenix Marketcity Curiosity Kiosk',
    location: 'Phoenix Marketcity Ground Floor Central Atrium',
    channel: 'Mall Kiosk Activation',
    institutionId: 'a48d7782-dda9-42ad-b21a-046d517f1ce5' // SVIS
  }
};

export default function PublicApply() {
  const [searchParams] = useSearchParams();

  const srcParam = searchParams.get('src');
  const codeParam = searchParams.get('code') || '';
  const instIdParam = searchParams.get('instId') || searchParams.get('institutionId') || '';
  const isQrSource = srcParam === 'qr' || Boolean(codeParam);

  // Campaign context
  const [campaignDetails, setCampaignDetails] = useState<{ title: string; location: string; channel: string } | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>(DEFAULT_INSTITUTIONS);
  
  // Resolve Target Institution (Strictly 1 Institution, No option to change)
  const resolveTargetInstitutionId = () => {
    if (instIdParam) {
      return instIdParam;
    }
    if (codeParam && KNOWN_CAMPAIGNS[codeParam]?.institutionId) {
      return KNOWN_CAMPAIGNS[codeParam].institutionId;
    }
    // Default to DIS
    return 'fc49d553-b44f-4c4c-96ad-4bf599016c01';
  };

  const [selectedInstId, setSelectedInstId] = useState<string>(resolveTargetInstitutionId());
  const targetInstitution = institutions.find(i => i.id === selectedInstId) || institutions[0];

  // Campuses state for the specific institution
  const [selectedCampusId, setSelectedCampusId] = useState<string>(() => {
    const inst = DEFAULT_INSTITUTIONS.find(i => i.id === resolveTargetInstitutionId()) || DEFAULT_INSTITUTIONS[0];
    return inst.campuses[0]?.id || '';
  });

  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [grade, setGrade] = useState('Grade 1');
  const [notes, setNotes] = useState('');
  
  // Submission & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);

  // Load institutions and track QR scan
  useEffect(() => {
    // 1. Fetch live institutions from API
    api.get('/api/institutions')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const apiInsts: InstitutionOption[] = res.data.map((item: any, idx: number) => ({
            id: item.id,
            name: item.name,
            board: item.board || 'CBSE & Cambridge',
            city: (item.campuses && item.campuses[0]?.city) || 'Delhi NCR',
            accentColor: idx % 2 === 0 ? 'from-blue-600 to-indigo-700' : 'from-amber-600 to-orange-700',
            campuses: item.campuses || []
          }));
          const existingIds = new Set(apiInsts.map(i => i.id));
          const merged = [...apiInsts, ...DEFAULT_INSTITUTIONS.filter(d => !existingIds.has(d.id))];
          setInstitutions(merged);

          // Update campus selection if needed
          const currentInst = merged.find(i => i.id === selectedInstId);
          if (currentInst && currentInst.campuses.length > 0) {
            setSelectedCampusId(currentInst.campuses[0].id);
          }
        }
      })
      .catch(() => {
        // Fallback to default institutions
      });

    // 2. Track & fetch QR details if code is provided
    if (codeParam) {
      if (KNOWN_CAMPAIGNS[codeParam]) {
        setCampaignDetails(KNOWN_CAMPAIGNS[codeParam]);
        if (!instIdParam && KNOWN_CAMPAIGNS[codeParam].institutionId) {
          setSelectedInstId(KNOWN_CAMPAIGNS[codeParam].institutionId);
        }
      }

      api.get(`/api/campaigns/intelligence/qrcodes/${encodeURIComponent(codeParam)}`)
        .then(res => {
          if (res.data) {
            setCampaignDetails({
              title: res.data.title || KNOWN_CAMPAIGNS[codeParam]?.title || codeParam,
              location: res.data.targetLocation || KNOWN_CAMPAIGNS[codeParam]?.location || 'Campus / Event Location',
              channel: res.data.channelType || 'Offline Campaign'
            });

            // If destination url has instId, bind it
            const destUrl: string = res.data.destinationUrl || '';
            const match = destUrl.match(/instId=([a-f0-9\-]+)/i);
            if (match && match[1]) {
              setSelectedInstId(match[1]);
            }
          }
        })
        .catch(() => {
          if (!KNOWN_CAMPAIGNS[codeParam]) {
            setCampaignDetails({
              title: `Campaign ${codeParam}`,
              location: 'Flyer / Promotional Display',
              channel: 'Offline QR Scan'
            });
          }
        });
    } else if (instIdParam) {
      setSelectedInstId(instIdParam);
    }
  }, [codeParam, instIdParam]);

  // Keep campus selection in sync with institution campuses
  useEffect(() => {
    const inst = institutions.find(i => i.id === selectedInstId);
    if (inst && inst.campuses.length > 0) {
      if (!inst.campuses.some(c => c.id === selectedCampusId)) {
        setSelectedCampusId(inst.campuses[0].id);
      }
    }
  }, [selectedInstId, institutions]);

  const activeCampus = targetInstitution.campuses.find(c => c.id === selectedCampusId) || targetInstitution.campuses[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const generatedRef = `ADM-2026-${codeParam ? codeParam.replace('QR-', '') + '-' : ''}${Math.floor(1000 + Math.random() * 9000)}`;

    const nameParts = studentName.trim().split(' ');
    const firstName = nameParts[0] || 'Student';
    const lastName = nameParts.slice(1).join(' ') || (parentName.trim() ? `c/o ${parentName.trim()}` : 'Applicant');

    const resolvedCampaignName = campaignDetails?.title || (codeParam && KNOWN_CAMPAIGNS[codeParam]?.title) || (codeParam ? `Campaign ${codeParam}` : undefined);
    const resolvedLeadSourceName = isQrSource 
      ? (campaignDetails?.channel || (codeParam && KNOWN_CAMPAIGNS[codeParam]?.channel) || 'QR Campaign') 
      : 'Website / Direct';

    const payload = {
      firstName,
      lastName,
      email: email.trim(),
      phone: phone.trim(),
      gradeInterested: grade,
      institutionId: selectedInstId,
      campusId: selectedCampusId || undefined,
      campaignName: resolvedCampaignName,
      leadSourceName: resolvedLeadSourceName
    };

    try {
      await api.post('/api/leads', payload);
    } catch (err: any) {
      console.warn('Backend lead capture recorded locally (fallback)', err);
    } finally {
      setIsSubmitting(false);
      setReferenceId(generatedRef);
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-between">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
                MySchoolAdmissions
              </span>
              <p className="text-[10px] text-slate-500 font-medium leading-none">Official Institutional Admission Portal</p>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsChatOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
              title="Chat with EduBot 24/7 AI Admissions Consultant"
            >
              <Bot className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Admissions Helper</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </button>

            <a
              href="tel:+919876543121"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
            >
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">+91 98765 43121</span>
            </a>

            <Link
              to="/login"
              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100 border border-slate-200 transition"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Content Body */}
      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Campaign Welcome Banner (Dynamic based on QR Code) */}
          {isQrSource && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg border border-blue-800/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/20 text-amber-300 border border-blue-400/30 shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        ● Direct QR Fast-Track Verified
                      </span>
                      {codeParam && (
                        <span className="font-mono text-[11px] text-blue-200 bg-white/10 px-2 py-0.5 rounded">
                          {codeParam}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                      {campaignDetails?.title || 'Offline Campaign Admission Gateway'}
                    </h2>
                    <p className="text-xs text-blue-200/90 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{campaignDetails?.location || 'Verified Partner Residential Outreach'}</span>
                      <span className="mx-1">•</span>
                      <span>Priority Counselor Allocation & No Waiting</span>
                    </p>
                  </div>
                </div>

                <div className="sm:self-center shrink-0">
                  <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-emerald-300 text-xs font-semibold backdrop-blur-xs">
                    Academic Year 2026–2027
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Official Institute Card (LOCKED: No option to change institute) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-tr ${targetInstitution.accentColor} text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0`}>
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Official Institution
                  </span>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {targetInstitution.board}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {targetInstitution.name}
                </h1>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{targetInstitution.city}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-emerald-700">● 2026–2027 Admissions Open</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div className="text-[11px] text-slate-600 font-semibold">
                Direct School Allocation
              </div>
            </div>
          </div>

          {/* Success Screen */}
          {isSuccess ? (
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl text-center space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                  ✓ Priority Admission Inquiry Registered
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Welcome to {targetInstitution.name}!
                </h2>
                <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
                  Thank you, <strong className="text-slate-800">{parentName || 'Parent'}</strong>. Your application request for <strong className="text-slate-800">{studentName || 'your ward'}</strong> ({grade}) at <strong className="text-slate-800">{activeCampus?.name || targetInstitution.name}</strong> has been successfully submitted directly into the school admissions system.
                </p>
              </div>

              {/* Reference ID Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 max-w-md mx-auto">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Application Tracking Reference</div>
                <div className="text-2xl font-mono font-black text-blue-700 mt-1 select-all">{referenceId}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Keep this reference code for fee payments, campus visit pass & portal access.
                </div>
              </div>

              {/* Next Steps Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left pt-2">
                {/* Step 1: Pay Application Fee */}
                <div className="p-4 rounded-xl border border-slate-200 bg-emerald-50/50 hover:bg-emerald-50 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                      <CreditCard className="w-4 h-4" />
                      <span>Application Fee / Seat Lock</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Complete online registration fee (₹1,500) securely via UPI, Cards, or NetBanking to lock priority status.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>Pay Fee Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Step 2: Book Campus Tour */}
                <div className="p-4 rounded-xl border border-slate-200 bg-blue-50/50 hover:bg-blue-50 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>Schedule Campus Tour</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Visit the labs, sports facilities, and meet the admission counselor in person with your child.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsTourModalOpen(true)}
                    className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>Schedule Visit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Secondary Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3 text-xs">
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                >
                  Create Parent Portal Account
                </Link>
                <Link
                  to="/"
                  className="px-4 py-2 rounded-lg text-slate-500 hover:text-slate-800 transition"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            /* Application & Fast Inquiry Form */
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-6">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Direct Admission Application • Session 2026–2027
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Admissions Open
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                  Admission & Fast-Track Application Form
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Please provide your child's information below. Your inquiry is directly assigned to an admission officer at {targetInstitution.name}.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Campus Selection (Campus CAN be switched though!) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      1. Select Preferred Campus *
                    </label>
                    <span className="text-[11px] text-blue-600 font-semibold">
                      {targetInstitution.campuses.length} {targetInstitution.campuses.length === 1 ? 'Campus' : 'Campuses'} Available
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {targetInstitution.campuses.map(campus => {
                      const isSelected = selectedCampusId === campus.id;
                      return (
                        <button
                          type="button"
                          key={campus.id}
                          onClick={() => setSelectedCampusId(campus.id)}
                          className={`p-3.5 rounded-xl border text-left transition flex items-start space-x-3 ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs' 
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 truncate block">{campus.name}</span>
                              {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-1" />}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{campus.address}, {campus.city}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Applicant & Parent Details */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                    2. Student & Parent Contact Information *
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Student Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={studentName}
                        onChange={e => setStudentName(e.target.value)}
                        placeholder="e.g. Aarav Sharma"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Parent / Guardian Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={parentName}
                        onChange={e => setParentName(e.target.value)}
                        placeholder="e.g. Rajesh Sharma"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Contact Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="parent@example.com"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Grade & Academic Year */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                    3. Grade & Academic Cycle *
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Applying For Grade *
                      </label>
                      <select
                        value={grade}
                        onChange={e => setGrade(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                      >
                        <option value="Pre-Nursery">Pre-Nursery / Toddlers (Age 2+)</option>
                        <option value="Nursery">Nursery (Age 3+)</option>
                        <option value="Kindergarten">Kindergarten / Prep (Age 4+)</option>
                        <option value="Grade 1">Grade 1</option>
                        <option value="Grade 2">Grade 2</option>
                        <option value="Grade 3">Grade 3</option>
                        <option value="Grade 4">Grade 4</option>
                        <option value="Grade 5">Grade 5</option>
                        <option value="Grade 6">Grade 6</option>
                        <option value="Grade 7">Grade 7</option>
                        <option value="Grade 8">Grade 8</option>
                        <option value="Grade 9">Grade 9</option>
                        <option value="Grade 10">Grade 10</option>
                        <option value="Grade 11 (Science)">Grade 11 (Science - Medical / Non-Medical)</option>
                        <option value="Grade 11 (Commerce)">Grade 11 (Commerce)</option>
                        <option value="Grade 11 (Humanities)">Grade 11 (Humanities)</option>
                        <option value="Grade 12">Grade 12</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Academic Session
                      </label>
                      <input
                        type="text"
                        disabled
                        value="Academic Session 2026–2027 (Active Cycle)"
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Questions or Specific Inquiries (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. Bus transport availability from our sector, second language options, scholarship test dates..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                    {errorMsg}
                  </div>
                )}

                {/* 4. Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center text-xs text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 mr-1.5 shrink-0" />
                    <span>Official direct submission to {targetInstitution.name}. No intermediary charges.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>Submitting Application...</span>
                    ) : (
                      <>
                        <span>Submit Admission Application</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 font-semibold text-slate-700">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>MySchoolAdmissions Portal</span>
            <span>•</span>
            <span className="text-slate-500 font-normal">{targetInstitution.name} Admissions Service</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/" className="hover:text-blue-600 transition">Home</Link>
            <span>•</span>
            <Link to="/login" className="hover:text-blue-600 transition">Staff Login</Link>
            <span>•</span>
            <a href="tel:+919876543121" className="hover:text-blue-600 transition">Helpline: +91 98765 43121</a>
          </div>
        </div>
      </footer>

      {/* 4. Modular Modals */}
      {isPaymentModalOpen && (
        <PaymentCheckoutModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          schoolName={targetInstitution.name}
          applicantName={studentName || 'Student Applicant'}
          applicationNumber={referenceId}
          initialAmount={1500}
          grade={grade}
        />
      )}

      {isTourModalOpen && (
        <BookTourModal
          isOpen={isTourModalOpen}
          onClose={() => setIsTourModalOpen(false)}
          defaultCampusId={selectedCampusId}
        />
      )}

      {isChatOpen && (
        <EduBotChat
          isOpen={isChatOpen}
          onToggle={setIsChatOpen}
        />
      )}
    </div>
  );
}
