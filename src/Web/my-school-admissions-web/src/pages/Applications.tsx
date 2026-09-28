import { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, Search, RefreshCw, FileText, 
  CreditCard, UserCheck, GraduationCap, ArrowUpDown, ArrowUp, ArrowDown,
  Building2, CheckCircle2, Clock, AlertCircle, X, Plus, Share2
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import api from '../lib/api';
import { type Application, type Assessment, type Enrollment } from '../types';
import NewApplicationModal from '../components/application/NewApplicationModal';
import PaymentCheckoutModal from '../components/payment/PaymentCheckoutModal';
import SharePaymentLinkModal from '../components/payment/SharePaymentLinkModal';

interface CustomJwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  role?: string | string[];
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string | string[];
}

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetApp, setPaymentTargetApp] = useState<Application | null>(null);
  const [isShareLinkOpen, setIsShareLinkOpen] = useState(false);
  const [shareTargetApp, setShareTargetApp] = useState<Application | null>(null);


  // Helper to extract student photo from customFieldsJson
  const getStudentPhoto = (customFieldsJson?: string): string | null => {
    if (!customFieldsJson) return null;
    try {
      const parsed = JSON.parse(customFieldsJson);
      return parsed.studentPhoto || null;
    } catch {
      return null;
    }
  };

  // Form State (New Assessment)
  const [assessmentType, setAssessmentType] = useState('Entrance Exam');
  const [assessmentDate, setAssessmentDate] = useState('');

  // Form State (Score Assessment)
  const [scoringAssessmentId, setScoringAssessmentId] = useState<string | null>(null);
  const [scoreStatus, setScoreStatus] = useState('Completed');
  const [scoreValue, setScoreValue] = useState('');
  const [scoreFeedback, setScoreFeedback] = useState('');

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeKpiFilter, setActiveKpiFilter] = useState<'all' | 'feePending' | 'onboarded' | 'enrolled' | null>(null);
  const [sortField, setSortField] = useState<'name' | 'grade' | 'appNumber' | 'date' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Decode Logged-in User from JWT
  const token = localStorage.getItem('token');
  const loggedInUser = useMemo(() => {
    if (!token) return { id: '', email: 'counselor@myschooladmissions.com', role: 'Counselor', name: 'Counselor' };
    try {
      const decoded = jwtDecode<CustomJwtPayload>(token);
      const roleClaim = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role;
      let role = 'Counselor';
      if (Array.isArray(roleClaim) && roleClaim.length > 0) role = roleClaim[0];
      else if (typeof roleClaim === 'string') role = roleClaim;
      const email = decoded.email || 'counselor@myschooladmissions.com';
      const name = decoded.name || email.split('@')[0];
      return {
        id: decoded.sub || '',
        email,
        role,
        name: name.charAt(0).toUpperCase() + name.slice(1)
      };
    } catch {
      return { id: '', email: 'counselor@myschooladmissions.com', role: 'Counselor', name: 'Counselor' };
    }
  }, [token]);

  // Initial Data Fetch
  useEffect(() => {
    fetchApplicationsAndEnrollments();
    const handleTenant = () => {
      fetchApplicationsAndEnrollments();
    };
    window.addEventListener('tenantChanged', handleTenant);
    return () => window.removeEventListener('tenantChanged', handleTenant);
  }, []);

  // Handle URL Query Params (e.g. ?status=Onboarded, ?status=Pending, etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    if (statusParam) {
      const s = statusParam.toLowerCase();
      if (s === 'pending' || s === 'feepending' || s === 'fee pending') {
        setActiveKpiFilter('feePending');
      } else if (s === 'onboarded') {
        setActiveKpiFilter('onboarded');
      } else if (s === 'enrolled' || s === 'confirmed') {
        setActiveKpiFilter('enrolled');
      } else {
        setStatusFilter(statusParam);
      }
    }
  }, []);

  const fetchApplicationsAndEnrollments = async () => {
    setLoading(true);
    const instId = localStorage.getItem('selectedInstitutionId') || 'all';
    const instQuery = instId && instId !== 'all' ? `?institutionId=${instId}` : '';
    try {
      const [appsRes, enrRes] = await Promise.all([
        api.get<Application[]>(`/api/applications${instQuery}`),
        api.get<Enrollment[]>('/api/enrollments').catch(() => ({ data: [] }))
      ]);
      setApplications(appsRes.data || []);
      setEnrollments(enrRes.data || []);
    } catch (error) {
      console.error('Error fetching applications or enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = () => {
    fetchApplicationsAndEnrollments();
  };

  // Map each application to its enrollment record
  const appEnrollmentMap = useMemo(() => {
    const map = new Map<string, Enrollment>();
    enrollments.forEach(enr => {
      if (enr.applicationId) {
        map.set(enr.applicationId, enr);
      }
    });
    return map;
  }, [enrollments]);

  // Helper to categorize application stage
  const getAdmissionsStage = (app: Application) => {
    const enr = app.id ? appEnrollmentMap.get(app.id) : undefined;
    const enrStatus = (enr?.status || '').toLowerCase();
    const appStatus = (app.status || '').toLowerCase();

    const hasPendingPayment = enr?.payments && enr.payments.some(p => p.status === 'Pending');
    const hasCompletedPayment = enr?.payments && enr.payments.some(p => p.status === 'Completed');
    const totalPaid = enr?.payments?.reduce((sum, p) => p.status === 'Completed' ? sum + p.amount : sum, 0) || 0;

    if (enrStatus === 'confirmed' || enrStatus === 'enrolled' || appStatus === 'enrolled') {
      return {
        stage: 'Enrolled' as const,
        label: 'Enrolled & Confirmed',
        feeBadge: totalPaid > 0 ? `Paid ₹${totalPaid.toLocaleString('en-IN')}` : 'Fee Cleared',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      };
    }

    if (enrStatus === 'onboarded' || appStatus === 'onboarded') {
      return {
        stage: 'Onboarded' as const,
        label: 'Onboarded',
        feeBadge: totalPaid > 0 ? `Paid ₹${totalPaid.toLocaleString('en-IN')}` : 'Verified',
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-300'
      };
    }

    if (hasPendingPayment || enrStatus === 'offered' || (!hasCompletedPayment && (appStatus === 'approved' || appStatus === 'underreview' || appStatus === 'submitted'))) {
      return {
        stage: 'Fee Pending' as const,
        label: 'Fee Pending',
        feeBadge: hasPendingPayment ? 'Awaiting Payment' : 'Fee Due',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
      };
    }

    return {
      stage: 'UnderReview' as const,
      label: app.status,
      feeBadge: 'Pending Review',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-300'
    };
  };

  // Admissions Summary KPI Metrics
  const admissionsKpis = useMemo(() => {
    const totalApplications = applications.length;
    let feePending = 0;
    let onboarded = 0;
    let enrolled = 0;

    applications.forEach(app => {
      const stage = getAdmissionsStage(app).stage;
      if (stage === 'Enrolled') enrolled++;
      else if (stage === 'Onboarded') onboarded++;
      else if (stage === 'Fee Pending') feePending++;
    });

    return {
      totalApplications,
      feePending,
      onboarded,
      enrolled
    };
  }, [applications, enrollments, appEnrollmentMap]);

  // Unique Grades extracted from applications
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    applications.forEach(a => {
      if (a.gradeApplyingFor && a.gradeApplyingFor.trim()) {
        grades.add(a.gradeApplyingFor.trim());
      }
    });
    return Array.from(grades).sort();
  }, [applications]);

  // Filtered and Sorted Applications
  const filteredApplications = useMemo(() => {
    const result = applications.filter(app => {
      const stageInfo = getAdmissionsStage(app);

      // KPI Card Filter
      if (activeKpiFilter === 'feePending' && stageInfo.stage !== 'Fee Pending') {
        return false;
      }
      if (activeKpiFilter === 'onboarded' && stageInfo.stage !== 'Onboarded') {
        return false;
      }
      if (activeKpiFilter === 'enrolled' && stageInfo.stage !== 'Enrolled') {
        return false;
      }

      // Status Pill Filter
      if (statusFilter !== 'All') {
        const appStatus = (app.status || '').toLowerCase();
        const filterLower = statusFilter.toLowerCase();
        if (filterLower === 'fee pending') {
          if (stageInfo.stage !== 'Fee Pending') return false;
        } else if (filterLower === 'onboarded') {
          if (stageInfo.stage !== 'Onboarded' && appStatus !== 'onboarded') return false;
        } else if (filterLower === 'enrolled') {
          if (stageInfo.stage !== 'Enrolled' && appStatus !== 'enrolled') return false;
        } else if (appStatus !== filterLower) {
          return false;
        }
      }

      // Grade Filter
      if (gradeFilter !== 'All' && app.gradeApplyingFor !== gradeFilter) {
        return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (app.applicantName || '').toLowerCase();
        const appNum = (app.applicationNumber || '').toLowerCase();
        const grade = (app.gradeApplyingFor || '').toLowerCase();
        if (!name.includes(q) && !appNum.includes(q) && !grade.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = (a.applicantName || '').localeCompare(b.applicantName || '');
          break;
        case 'grade':
          comparison = (a.gradeApplyingFor || '').localeCompare(b.gradeApplyingFor || '');
          break;
        case 'appNumber':
          comparison = (a.applicationNumber || '').localeCompare(b.applicationNumber || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'date':
        default: {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.submittedDate ? new Date(a.submittedDate).getTime() : 0);
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.submittedDate ? new Date(b.submittedDate).getTime() : 0);
          comparison = dateA - dateB;
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [applications, activeKpiFilter, statusFilter, gradeFilter, searchQuery, sortField, sortDirection, appEnrollmentMap]);

  const handleSort = (field: 'name' | 'grade' | 'appNumber' | 'date' | 'status') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIndicator = (field: 'name' | 'grade' | 'appNumber' | 'date' | 'status') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-gray-400 opacity-60" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1 text-blue-600 stroke-[2.5]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1 text-blue-600 stroke-[2.5]" />
    );
  };

  const resetFilters = () => {
    setSearchQuery('');
    setGradeFilter('All');
    setStatusFilter('All');
    setActiveKpiFilter(null);
  };

  const hasActiveFilters = searchQuery.trim() !== '' || gradeFilter !== 'All' || statusFilter !== 'All' || activeKpiFilter !== null;

  const handleUpdateStatus = async (appId: string | undefined, newStatus: string) => {
    if (!appId) return;
    try {
      await api.put(`/api/applications/${appId}/status`, { status: newStatus });
      fetchApplications();
      if (selectedApp && selectedApp.id === appId) {
        openDetails({ ...selectedApp, id: appId, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  const handleScheduleAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !selectedApp.id) return;

    try {
      await api.post(`/api/applications/${selectedApp.id}/assessments`, {
        type: assessmentType,
        scheduledDate: new Date(assessmentDate).toISOString()
      });
      setAssessmentDate('');
      
      openDetails(selectedApp);
      fetchApplications();
    } catch (error) {
      console.error('Error scheduling assessment:', error);
    }
  };

  const handleScoreAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !selectedApp.id || !scoringAssessmentId) return;

    try {
      await api.put(`/api/applications/${selectedApp.id}/assessments/${scoringAssessmentId}`, {
        status: scoreStatus,
        score: scoreValue,
        feedback: scoreFeedback
      });
      
      setScoringAssessmentId(null);
      setScoreValue('');
      setScoreFeedback('');
      setScoreStatus('Completed');
      
      openDetails(selectedApp);
      fetchApplications();
    } catch (error) {
      console.error('Error scoring assessment:', error);
    }
  };

  const openDetails = async (app: Application) => {
    try {
      const response = await api.get<Application>(`/api/applications/${app.id}`);
      setSelectedApp(response.data);
    } catch (error) {
      console.error('Error fetching application details:', error);
      setSelectedApp(app);
    }
  };

  const startScoring = (assessment: Assessment) => {
    setScoringAssessmentId(assessment.id);
    setScoreStatus(assessment.status === 'Scheduled' ? 'Completed' : assessment.status);
    setScoreValue(assessment.score || '');
    setScoreFeedback(assessment.feedback || '');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Applications & Admissions Management</h1>
          <p className="text-sm text-gray-500 mt-1">Lifecycle tracking from candidate submission, assessment scoring, fee deposit, to onboarded enrollments.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewAppModalOpen(true)}
            className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
          >
            <Plus className="h-4 w-4 mr-1.5 stroke-[2.5]" />
            New Application
          </button>
          <button
            onClick={() => fetchApplicationsAndEnrollments()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs"
          >
            <RefreshCw className="h-4 w-4 mr-1.5 text-gray-500" />
            Refresh
          </button>
        </div>
      </div>

      {/* Logged in User Persona Ribbon & Admissions Summary KPI Indicators */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-base shadow-inner border border-white/20">
              {(loggedInUser.name || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-blue-300">
                  Admissions Evaluation Workspace
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {loggedInUser.role}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                {loggedInUser.name} <span className="text-xs font-normal text-blue-200">({loggedInUser.email})</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-xs">
              <Building2 className="w-4 h-4 text-blue-300" />
              <span className="text-blue-100 font-medium">Active Campus Admissions</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white">
                {admissionsKpis.totalApplications} Active
              </span>
            </div>
          </div>
        </div>

        {/* 4 Core Admissions Summary KPI Indicator Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {/* KPI 1: Total Applications */}
          <div
            onClick={() => {
              setActiveKpiFilter(activeKpiFilter === 'all' ? null : 'all');
              setStatusFilter('All');
            }}
            className={`cursor-pointer rounded-xl p-4 transition-all duration-200 bg-white/10 hover:bg-white/15 border ${
              activeKpiFilter === 'all' || (activeKpiFilter === null && statusFilter === 'All')
                ? 'ring-2 ring-indigo-400 bg-white/20 border-indigo-400/60 shadow-md'
                : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Total Applications</span>
              <div className="p-2 rounded-lg bg-indigo-500/30 text-indigo-200">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{admissionsKpis.totalApplications}</span>
              <span className="text-[11px] text-indigo-200">Candidates in pipeline</span>
            </div>
          </div>

          {/* KPI 2: Fee Pending */}
          <div
            onClick={() => {
              setActiveKpiFilter(activeKpiFilter === 'feePending' ? null : 'feePending');
              setStatusFilter('All');
            }}
            className={`cursor-pointer rounded-xl p-4 transition-all duration-200 bg-white/10 hover:bg-white/15 border ${
              activeKpiFilter === 'feePending'
                ? 'ring-2 ring-amber-400 bg-white/20 border-amber-400/60 shadow-md'
                : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Fee Pending</span>
              <div className="p-2 rounded-lg bg-amber-500/30 text-amber-200">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{admissionsKpis.feePending}</span>
              <span className="text-[11px] text-amber-200">Awaiting clearance</span>
            </div>
          </div>

          {/* KPI 3: Onboarded */}
          <div
            onClick={() => {
              setActiveKpiFilter(activeKpiFilter === 'onboarded' ? null : 'onboarded');
              setStatusFilter('All');
            }}
            className={`cursor-pointer rounded-xl p-4 transition-all duration-200 bg-white/10 hover:bg-white/15 border ${
              activeKpiFilter === 'onboarded'
                ? 'ring-2 ring-teal-400 bg-white/20 border-teal-400/60 shadow-md'
                : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">Onboarded</span>
              <div className="p-2 rounded-lg bg-teal-500/30 text-teal-200">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{admissionsKpis.onboarded}</span>
              <span className="text-[11px] text-teal-200">Verified & onboarded</span>
            </div>
          </div>

          {/* KPI 4: Enrolled */}
          <div
            onClick={() => {
              setActiveKpiFilter(activeKpiFilter === 'enrolled' ? null : 'enrolled');
              setStatusFilter('All');
            }}
            className={`cursor-pointer rounded-xl p-4 transition-all duration-200 bg-white/10 hover:bg-white/15 border ${
              activeKpiFilter === 'enrolled'
                ? 'ring-2 ring-emerald-400 bg-white/20 border-emerald-400/60 shadow-md'
                : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Enrolled</span>
              <div className="p-2 rounded-lg bg-emerald-500/30 text-emerald-200">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{admissionsKpis.enrolled}</span>
              <span className="text-[11px] text-emerald-200">Seats confirmed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidate name, application #, or grade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Grade Filter */}
          <div className="flex items-center gap-2">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="All">All Grades</option>
              {uniqueGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-500 mr-1">Status:</span>
          {['All', 'Fee Pending', 'Onboarded', 'Enrolled', 'UnderReview', 'Submitted', 'Approved', 'Rejected'].map((st) => {
            const isActive = (statusFilter === st && activeKpiFilter === null) || 
              (activeKpiFilter === 'feePending' && st === 'Fee Pending') ||
              (activeKpiFilter === 'onboarded' && st === 'Onboarded') ||
              (activeKpiFilter === 'enrolled' && st === 'Enrolled');

            return (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  if (st === 'Fee Pending') setActiveKpiFilter('feePending');
                  else if (st === 'Onboarded') setActiveKpiFilter('onboarded');
                  else if (st === 'Enrolled') setActiveKpiFilter('enrolled');
                  else setActiveKpiFilter(null);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {st === 'UnderReview' ? 'Under Review' : st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white shadow-xs border border-gray-200 overflow-hidden rounded-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading applications...</div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No applications match your criteria</h3>
            <p className="text-sm text-gray-500 mt-1">Try clearing filters or adjusting your search terms.</p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900"
                  >
                    <div className="flex items-center">
                      Candidate Name
                      {renderSortIndicator('name')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('grade')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900"
                  >
                    <div className="flex items-center">
                      Grade
                      {renderSortIndicator('grade')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('appNumber')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900"
                  >
                    <div className="flex items-center">
                      Application #
                      {renderSortIndicator('appNumber')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900"
                  >
                    <div className="flex items-center">
                      Admissions Stage
                      {renderSortIndicator('status')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Assessments
                  </th>
                  <th 
                    onClick={() => handleSort('date')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900"
                  >
                    <div className="flex items-center">
                      Submitted
                      {renderSortIndicator('date')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((app) => {
                  const stageInfo = getAdmissionsStage(app);
                  const assessmentsCount = app.assessments?.length || 0;
                  const completedAssessments = app.assessments?.filter(a => a.status === 'Completed').length || 0;

                  return (
                    <tr 
                      key={app.id} 
                      onClick={() => openDetails(app)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {(() => {
                            const photo = getStudentPhoto(app.customFieldsJson);
                            return photo ? (
                              <img 
                                src={photo} 
                                alt={app.applicantName} 
                                className="h-10 w-10 flex-shrink-0 rounded-full object-cover border border-blue-300 shadow-2xs" 
                              />
                            ) : (
                              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-sm">
                                {(app.applicantName || 'A').split(' ').map(n => n[0]).join('')}
                              </div>
                            );
                          })()}
                          <div className="ml-3">
                            <div className="text-sm font-semibold text-gray-900">{app.applicantName}</div>
                            <div className="text-xs text-gray-500">ID: {app.id?.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          {app.gradeApplyingFor}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-gray-700 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                          {app.applicationNumber || 'N/A'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2.5 py-0.5 inline-flex items-center gap-1 text-xs font-bold rounded-full border w-fit ${stageInfo.badgeColor}`}>
                            {stageInfo.stage === 'Enrolled' && <GraduationCap className="w-3 h-3" />}
                            {stageInfo.stage === 'Onboarded' && <UserCheck className="w-3 h-3" />}
                            {stageInfo.stage === 'Fee Pending' && <CreditCard className="w-3 h-3" />}
                            {stageInfo.stage === 'UnderReview' && <Clock className="w-3 h-3" />}
                            {app.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                            {app.status === 'Rejected' && <AlertCircle className="w-3 h-3" />}
                            <span>{stageInfo.label}</span>
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {stageInfo.feeBadge}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {assessmentsCount > 0 ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-700">
                            <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                            <span>{completedAssessments}/{assessmentsCount} done</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">None scheduled</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : (app.submittedDate ? new Date(app.submittedDate).toLocaleDateString() : 'N/A')}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetails(app);
                          }}
                          className="text-blue-700 bg-blue-50 hover:bg-blue-100 font-semibold text-xs border border-blue-200 px-3 py-1.5 rounded-lg transition"
                        >
                          Review & Assess
                        </button>
                        {stageInfo.stage === 'Fee Pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentTargetApp(app);
                              setIsPaymentModalOpen(true);
                            }}
                            className="ml-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs border border-emerald-300 px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1 shadow-xs"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Collect Fee</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedApp && (
        <div className="fixed z-20 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-xs transition-opacity" aria-hidden="true" onClick={() => {
              setSelectedApp(null);
              setScoringAssessmentId(null);
            }}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-2xl px-6 pt-6 pb-6 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                <div className="flex items-start gap-4">
                  {(() => {
                    const detailPhoto = getStudentPhoto(selectedApp.customFieldsJson);
                    return detailPhoto ? (
                      <img 
                        src={detailPhoto} 
                        alt={selectedApp.applicantName} 
                        className="h-16 w-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md shrink-0" 
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-xl shrink-0">
                        {(selectedApp.applicantName || 'A').split(' ').map(n => n[0]).join('')}
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-gray-900" id="modal-title">
                        {selectedApp.applicantName}
                      </h3>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                        {selectedApp.applicationNumber}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Grade Applying: <span className="font-semibold text-gray-700">{selectedApp.gradeApplyingFor}</span> | 
                      Status: <span className="font-bold text-blue-600">{selectedApp.status}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedApp(null);
                    setScoringAssessmentId(null);
                  }} 
                  className="text-gray-400 hover:text-gray-500 p-1 rounded-lg hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Action Buttons & Razorpay Fee Actions */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {selectedApp.status !== 'Approved' && selectedApp.status !== 'Rejected' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(selectedApp.id, 'UnderReview')}
                        className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-100 transition"
                      >
                        Mark Under Review
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedApp.id, 'Approved')}
                        className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-100 transition"
                      >
                        Approve Application
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedApp.id, 'Rejected')}
                        className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg font-medium hover:bg-rose-100 transition"
                      >
                        Reject Application
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentTargetApp(selectedApp);
                      setIsPaymentModalOpen(true);
                    }}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Collect Fee (Razorpay)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShareTargetApp(selectedApp);
                      setIsShareLinkOpen(true);
                    }}
                    className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Payment Link</span>
                  </button>
                </div>
              </div>

              {/* Program-Specific Dynamic Form Fields */}
              <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>Program-Specific Dynamic Form Fields</span>
                  <span className="text-xs text-slate-500 font-normal">Custom Schema</span>
                </h4>
                {selectedApp.customFieldsJson ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(JSON.parse(selectedApp.customFieldsJson || '{}'))
                      .filter(([key]) => key !== 'studentPhoto')
                      .map(([key, val]) => (
                        <div key={key} className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="text-slate-400 capitalize block text-[10px] font-semibold">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-bold text-slate-900">{String(val)}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                    <span>No custom questions answered yet.</span>
                    <button
                      onClick={async () => {
                        const sampleFields = {
                          previousBoard: "CBSE / State Board",
                          qualifyingMarks: "88.4%",
                          hostelRequirement: "Yes",
                          preferredSpecialization: "Robotics & AI"
                        };
                        const jsonStr = JSON.stringify(sampleFields);
                        await api.put(`/api/applications/${selectedApp.id}/custom-fields`, jsonStr, {
                          headers: { 'Content-Type': 'application/json' }
                        });
                        openDetails({ ...selectedApp, customFieldsJson: jsonStr });
                        fetchApplications();
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                    >
                      + Add Program Fields
                    </button>
                  </div>
                )}
              </div>

              {/* Assessments Section */}
              <div className="mt-5 border-t border-gray-200 pt-4">
                <h4 className="text-base font-bold text-gray-900 flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2 text-indigo-600" />
                  Candidate Assessments
                </h4>
                
                <div className="mt-3 bg-gray-50 rounded-xl p-4">
                  {selectedApp.assessments && selectedApp.assessments.length > 0 ? (
                    <ul className="space-y-3">
                      {selectedApp.assessments.map(assessment => (
                        <li key={assessment.id} className="bg-white p-4 rounded-lg shadow-xs border border-gray-200">
                          {scoringAssessmentId === assessment.id ? (
                            <form onSubmit={handleScoreAssessment} className="space-y-3">
                              <h5 className="font-semibold text-sm text-gray-800">Score {assessment.type}</h5>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">Status</label>
                                <select 
                                  value={scoreStatus} 
                                  onChange={e => setScoreStatus(e.target.value)} 
                                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm"
                                >
                                  <option>Completed</option>
                                  <option>Missed</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">Score / Result</label>
                                <input 
                                  type="text" 
                                  value={scoreValue} 
                                  onChange={e => setScoreValue(e.target.value)} 
                                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm" 
                                  placeholder="e.g. 85/100, Pass" 
                                  required 
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">Feedback</label>
                                <textarea 
                                  value={scoreFeedback} 
                                  onChange={e => setScoreFeedback(e.target.value)} 
                                  rows={2} 
                                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm" 
                                />
                              </div>
                              <div className="flex space-x-2">
                                <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition">Save Result</button>
                                <button type="button" onClick={() => setScoringAssessmentId(null)} className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-300 transition">Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-semibold text-sm text-gray-900">{assessment.type}</span>
                                  <span className={`ml-2 px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full ${
                                    assessment.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 
                                    assessment.status === 'Missed' ? 'bg-rose-100 text-rose-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {assessment.status}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">Scheduled: {new Date(assessment.scheduledDate).toLocaleString()}</span>
                              </div>
                              {assessment.score && (
                                <p className="text-sm font-bold text-gray-800 mt-2">Score: {assessment.score}</p>
                              )}
                              {assessment.feedback && (
                                <p className="text-xs text-gray-600 mt-1 italic">"{assessment.feedback}"</p>
                              )}
                              {assessment.status === 'Scheduled' && (
                                <button 
                                  onClick={() => startScoring(assessment)} 
                                  className="mt-3 text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md hover:bg-gray-200 font-medium transition"
                                >
                                  Record Score
                                </button>
                              )}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">No assessments scheduled yet.</p>
                  )}
                </div>
                
                {/* Schedule Assessment Form */}
                <div className="mt-4 border-t border-gray-200 pt-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Schedule Assessment</h4>
                  <form onSubmit={handleScheduleAssessment} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 items-end">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select 
                        value={assessmentType} 
                        onChange={e => setAssessmentType(e.target.value)}
                        className="block w-full p-2 border-gray-300 border focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
                      >
                        <option>Entrance Exam</option>
                        <option>Interview</option>
                        <option>Document Verification</option>
                      </select>
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time</label>
                      <input 
                        type="datetime-local" 
                        value={assessmentDate}
                        onChange={e => setAssessmentDate(e.target.value)}
                        required
                        className="block w-full p-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
                      />
                    </div>
                    <button type="submit" className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-transparent shadow-xs px-4 py-2 bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none transition">
                      Schedule
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Add New Application Modal with Student Photograph */}
      <NewApplicationModal
        isOpen={isNewAppModalOpen}
        onClose={() => setIsNewAppModalOpen(false)}
        onSuccess={(newApp) => {
          setApplications(prev => [newApp, ...prev]);
          fetchApplicationsAndEnrollments();
        }}
      />

      {/* Razorpay Payment Checkout Modal */}
      {paymentTargetApp && (
        <PaymentCheckoutModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentTargetApp(null);
          }}
          applicantName={paymentTargetApp.applicantName}
          applicationNumber={paymentTargetApp.applicationNumber}
          grade={paymentTargetApp.gradeApplyingFor}
          defaultFeeType="seatLock"
          defaultAmount={25000}
          onPaymentSuccess={() => {
            setIsPaymentModalOpen(false);
            setPaymentTargetApp(null);
            fetchApplicationsAndEnrollments();
          }}
        />
      )}

      {/* Share Razorpay Payment Link Modal */}
      {shareTargetApp && (
        <SharePaymentLinkModal
          isOpen={isShareLinkOpen}
          onClose={() => {
            setIsShareLinkOpen(false);
            setShareTargetApp(null);
          }}
          enrollments={enrollments.length > 0 ? enrollments : [{
            id: shareTargetApp.id,
            applicationId: shareTargetApp.id || '',
            studentName: shareTargetApp.applicantName,
            grade: shareTargetApp.gradeApplyingFor,
            status: shareTargetApp.status
          }]}
          selectedEnrollment={enrollments.find(e => e.applicationId === shareTargetApp.id || e.studentName === shareTargetApp.applicantName) || {
            id: shareTargetApp.id,
            applicationId: shareTargetApp.id || '',
            studentName: shareTargetApp.applicantName,
            grade: shareTargetApp.gradeApplyingFor,
            status: shareTargetApp.status
          }}
          onLinkCreated={() => {
            fetchApplicationsAndEnrollments();
          }}
        />
      )}
    </div>
  );
}
