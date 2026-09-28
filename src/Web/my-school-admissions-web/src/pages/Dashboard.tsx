import { useState, useEffect, useMemo } from 'react';
import { 
  Users, Sparkles, Clock, AlertCircle, ArrowRight, User, 
  FileText, CreditCard, UserCheck, GraduationCap, ClipboardList 
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import api from '../lib/api';
import { type Enquiry, type Application, type Enrollment } from '../types';
import ParentDashboard from './ParentDashboard';
import { formatSlotTime } from './Calendar';

interface DashboardMetrics {
  id: number;
  totalEnquiries: number;
  totalApplications: number;
  totalEnrollments: number;
  totalRevenue: number;
}

interface RecentActivity {
  id: string;
  description: string;
  timestamp: string;
  activityType: string;
}

interface CalendarActivity {
  id: string;
  enquiryId: string;
  title: string;
  studentName: string;
  gradeInterested: string;
  activityType: string;
  location: string;
  scheduledStartTime: string;
  assignedToName: string;
  status: string;
}

interface CustomJwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  role?: string | string[];
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string | string[];
}

export default function Dashboard() {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [todayActivities, setTodayActivities] = useState<CalendarActivity[]>([]);
  const [allLeads, setAllLeads] = useState<Enquiry[]>([]);
  const [allCalActivities, setAllCalActivities] = useState<CalendarActivity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  // Decode Logged-in User from JWT
  const token = localStorage.getItem('token');
  const loggedInUser = useMemo(() => {
    if (!token) return { id: '', email: 'Staff User', role: 'Counselor', name: 'Staff' };
    try {
      const decoded = jwtDecode<CustomJwtPayload>(token);
      const roleClaim = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role;
      let role = 'Counselor';
      if (Array.isArray(roleClaim) && roleClaim.length > 0) role = roleClaim[0];
      else if (typeof roleClaim === 'string') role = roleClaim;
      const email = decoded.email || 'staff@myschooladmissions.com';
      const storedName = localStorage.getItem('userName');
      const name = storedName || decoded.name || email.split('@')[0];
      return {
        id: decoded.sub || '',
        email,
        role,
        name: name.charAt(0).toUpperCase() + name.slice(1)
      };
    } catch {
      return { id: '', email: 'staff@myschooladmissions.com', role: 'Counselor', name: 'Staff' };
    }
  }, [token]);

  const resolveTenantName = (instId?: string | null) => {
    const id = (instId || localStorage.getItem('selectedInstitutionId') || localStorage.getItem('userInstitutionId') || '').toLowerCase();
    const stored = localStorage.getItem('selectedInstitutionName');
    if (stored && stored !== 'Delhi International School (DIS)' && stored !== 'Delhi International School') {
      if (id.includes('a48d7782') && stored.toLowerCase().includes('delhi')) {
        return 'Swami Vivekananda International School';
      }
      return stored;
    }
    if (id.includes('a48d7782')) return 'Swami Vivekananda International School';
    if (id.includes('fc49d553')) return 'Delhi International School';
    if (id === 'all') return 'All Institutions (Global)';
    return stored || 'Assigned Institution';
  };

  const [currentTenantName, setCurrentTenantName] = useState(() => resolveTenantName());

  const loadDashboardData = () => {
    const instId = localStorage.getItem('selectedInstitutionId') || localStorage.getItem('userInstitutionId') || 'all';
    const instName = resolveTenantName(instId);
    setCurrentTenantName(instName);

    const instQuery = instId && instId !== 'all' ? `?institutionId=${instId}` : '';

    Promise.all([
      api.get<{ metrics: DashboardMetrics, recentActivities: RecentActivity[] }>('/api/dashboard'),
      api.get<CalendarActivity[]>(`/api/leads/activities${instQuery}`).catch(() => ({ data: [] })),
      api.get<Enquiry[]>(`/api/leads${instQuery}`).catch(() => ({ data: [] })),
      api.get<Application[]>(`/api/applications${instQuery}`).catch(() => ({ data: [] })),
      api.get<Enrollment[]>('/api/enrollments').catch(() => ({ data: [] }))
    ])
      .then(([dashRes, calRes, leadsRes, appsRes, enrRes]) => {
        setActivities(dashRes.data.recentActivities);
        const calData = calRes.data || [];
        setAllCalActivities(calData);
        setAllLeads(leadsRes.data || []);
        setApplications(appsRes.data || []);
        setEnrollments(enrRes.data || []);
        const now = new Date();
        const isSameDay = (timeStr: string, d: Date) => {
          if (!timeStr) return false;
          const p = timeStr.split('T')[0].split('-').map(Number);
          if (p[0] === d.getFullYear() && p[1] === d.getMonth() + 1 && p[2] === d.getDate()) return true;
          const local = new Date(timeStr);
          return local.getFullYear() === d.getFullYear() && local.getMonth() === d.getMonth() && local.getDate() === d.getDate();
        };
        const todays = calData.filter(a => isSameDay(a.scheduledStartTime, now));
        setTodayActivities(todays);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch dashboard data", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDashboardData();
    const handleTenant = (e: any) => {
      const newName = e.detail?.name || resolveTenantName(e.detail?.id);
      if (newName) setCurrentTenantName(newName);
      loadDashboardData();
    };
    window.addEventListener('tenantChanged', handleTenant);
    return () => window.removeEventListener('tenantChanged', handleTenant);
  }, []);

  // Compute Enquiry Status KPIs for Logged in User
  const enquiryKpis = useMemo(() => {
    const scheduledEnquiryIds = new Set(
      allCalActivities.filter(a => a.status === 'Scheduled').map(a => a.enquiryId)
    );

    let total = allLeads.length;
    let newCount = 0;
    let pendingCount = 0;
    let noFollowupCount = 0;

    allLeads.forEach(l => {
      const st = (l.status || '').toLowerCase();
      if (st === 'new') newCount++;
      else if (st === 'contacted' || st === 'pending' || st === 'in progress') pendingCount++;

      if (l.id && !scheduledEnquiryIds.has(l.id) && st !== 'lost') {
        noFollowupCount++;
      }
    });

    const myLeads = allLeads.filter(l => l.assignedToId === loggedInUser.id);
    let myNewCount = 0;
    let myPendingCount = 0;
    let myNoFollowupCount = 0;

    myLeads.forEach(l => {
      const st = (l.status || '').toLowerCase();
      if (st === 'new') myNewCount++;
      else if (st === 'contacted' || st === 'pending' || st === 'in progress') myPendingCount++;

      if (l.id && !scheduledEnquiryIds.has(l.id) && st !== 'lost') {
        myNoFollowupCount++;
      }
    });

    return {
      total,
      newCount,
      pendingCount,
      noFollowupCount,
      myTotal: myLeads.length,
      myNewCount,
      myPendingCount,
      myNoFollowupCount
    };
  }, [allLeads, allCalActivities, loggedInUser.id]);

  // Compute Admissions Summary KPIs (Total Applications, Fee Pending, Onboarded, Enrolled)
  const admissionsKpis = useMemo(() => {
    const totalApplications = applications.length;
    const applicationIds = new Set(applications.map(app => app.id));
    const scopedEnrollments = enrollments.filter(enrollment =>
      enrollment.applicationId ? applicationIds.has(enrollment.applicationId) : false
    );
    let feePending = 0;
    let onboarded = 0;
    let enrolled = 0;
    let totalRevenue = 0;

    // Process enrollments
    scopedEnrollments.forEach(enr => {
      const st = (enr.status || '').toLowerCase();
      const hasPendingPayments = enr.payments && enr.payments.some(p => p.status === 'Pending');
      const hasCompletedPayments = enr.payments && enr.payments.some(p => p.status === 'Completed');
      totalRevenue += enr.payments?.reduce((sum, payment) => payment.status === 'Completed' ? sum + payment.amount : sum, 0) || 0;

      if (st === 'confirmed' || st === 'enrolled') {
        enrolled++;
      } else if (st === 'onboarded') {
        onboarded++;
      }

      if (hasPendingPayments || st === 'offered' || (!hasCompletedPayments && st !== 'withdrawn')) {
        feePending++;
      }
    });

    // Process applications
    applications.forEach(app => {
      const st = (app.status || '').toLowerCase();
      if (st === 'onboarded' || st === 'approved') {
        if (!scopedEnrollments.some(e => e.applicationId === app.id && (e.status.toLowerCase() === 'onboarded' || e.status.toLowerCase() === 'confirmed'))) {
          onboarded++;
        }
      } else if (st === 'enrolled') {
        if (!scopedEnrollments.some(e => e.applicationId === app.id && (e.status.toLowerCase() === 'confirmed' || e.status.toLowerCase() === 'enrolled'))) {
          enrolled++;
        }
      } else if (st === 'underreview' || st === 'submitted') {
        if (!scopedEnrollments.some(e => e.applicationId === app.id)) {
          feePending++;
        }
      }
    });

    return {
      totalApplications,
      totalEnrollments: scopedEnrollments.length,
      totalRevenue,
      feePending,
      onboarded,
      enrolled
    };
  }, [applications, enrollments]);

  if (loading) return <div>Loading dashboard...</div>;

  if (loggedInUser.role === 'Parent') {
    return <ParentDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Logged in User Greeting & Enquiry Status KPI Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-inner border border-white/20">
              {loggedInUser.name.split(' ').map((n: string) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-blue-300">
                  Admissions Pipeline Overview
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {loggedInUser.role}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Tenant: {currentTenantName}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
                Welcome back, {loggedInUser.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/leads"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>Manage Inquiries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* 4 Core Enquiry Status KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* KPI 1: Total */}
          <a
            href="/leads"
            className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-4 transition block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Enquiry Status: Total</span>
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 group-hover:scale-110 transition">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{enquiryKpis.total}</span>
              <span className="text-xs text-blue-200">
                ({enquiryKpis.myTotal} assigned to you)
              </span>
            </div>
            <div className="mt-2 text-[11px] text-blue-300 flex items-center gap-1">
              <span>View full pipeline</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </a>

          {/* KPI 2: New */}
          <a
            href="/leads"
            className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-4 transition block group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">New</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:scale-110 transition">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{enquiryKpis.newCount}</span>
              <span className="text-xs text-emerald-200">
                ({enquiryKpis.myNewCount} assigned)
              </span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-300 flex items-center gap-1">
              <span>Fresh inquiries awaiting response</span>
            </div>
          </a>

          {/* KPI 3: Pending */}
          <a
            href="/leads"
            className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-4 transition block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Pending</span>
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 group-hover:scale-110 transition">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{enquiryKpis.pendingCount}</span>
              <span className="text-xs text-amber-200">
                ({enquiryKpis.myPendingCount} assigned)
              </span>
            </div>
            <div className="mt-2 text-[11px] text-amber-300 flex items-center gap-1">
              <span>In-progress & contacted</span>
            </div>
          </a>

          {/* KPI 4: No Followup */}
          <a
            href="/leads"
            className="bg-white/10 hover:bg-white/15 border border-rose-400/40 rounded-xl p-4 transition block group relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">No Follow-up</span>
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300 group-hover:scale-110 transition">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{enquiryKpis.noFollowupCount}</span>
              <span className="text-xs text-rose-200 font-semibold">
                ({enquiryKpis.myNoFollowupCount} assigned)
              </span>
            </div>
            <div className="mt-2 text-[11px] text-rose-300 font-medium flex items-center gap-1">
              <span>At risk of falling through cracks</span>
            </div>
          </a>
        </div>
      </div>

      {/* Admissions Summary KPI Ribbon (Relevant Onboarded Users) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Admissions Summary</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700">
                  Onboarded Lifecycle
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Application evaluation, fee clearance, onboarding status, and confirmed enrollments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/applications"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition border border-indigo-200"
            >
              <span>Applications ({admissionsKpis.totalApplications})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="/enrollments"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition border border-emerald-200"
            >
              <span>Enrollments & Fees</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* 4 Core Admissions Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* 1. Total Applications */}
          <a
            href="/applications"
            className="p-4 rounded-xl border border-gray-200 bg-slate-50/60 hover:bg-indigo-50/50 hover:border-indigo-300 transition block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-indigo-700">Total Applications</span>
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 group-hover:scale-110 transition">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-gray-900 group-hover:text-indigo-900">{admissionsKpis.totalApplications}</span>
              <span className="text-xs text-gray-500">Candidates applied</span>
            </div>
            <div className="mt-2 text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
              <span>View applications</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </a>

          {/* 2. Fee Pending */}
          <a
            href="/enrollments?status=Pending"
            className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-400 transition block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Fee Pending</span>
              <div className="p-2 rounded-lg bg-amber-200/80 text-amber-800 group-hover:scale-110 transition">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-900">{admissionsKpis.feePending}</span>
              <span className="text-xs text-amber-700 font-medium">Awaiting payment</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-700 font-semibold flex items-center gap-1">
              <span>Collect enrollment fees</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </a>

          {/* 3. Onboarded */}
          <a
            href="/applications?status=Onboarded"
            className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 hover:bg-teal-50 hover:border-teal-400 transition block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Onboarded</span>
              <div className="p-2 rounded-lg bg-teal-200/80 text-teal-800 group-hover:scale-110 transition">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-teal-900">{admissionsKpis.onboarded}</span>
              <span className="text-xs text-teal-700 font-medium">Verified & set up</span>
            </div>
            <div className="mt-2 text-[11px] text-teal-700 font-semibold flex items-center gap-1">
              <span>Verified student profiles</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </a>

          {/* 4. Enrolled */}
          <a
            href="/enrollments?status=Confirmed"
            className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-400 transition block group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Enrolled</span>
              <div className="p-2 rounded-lg bg-blue-200/80 text-blue-800 group-hover:scale-110 transition">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-900">{admissionsKpis.enrolled}</span>
              <span className="text-xs text-blue-700 font-medium">Confirmed seats</span>
            </div>
            <div className="mt-2 text-[11px] text-blue-700 font-semibold flex items-center gap-1">
              <span>Confirmed admissions</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </a>
        </div>
      </div>

      {/* Global Institution Performance Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: 'Total Enquiries', value: allLeads.length },
          { name: 'Total Applications', value: applications.length },
          { name: 'Total Enrollments', value: admissionsKpis.totalEnrollments },
          { name: 'Total Revenue', value: `$${admissionsKpis.totalRevenue}` },
        ].map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow-xs rounded-xl border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stat.value}</dd>
            </div>
          </div>
        ))}
      </div>
      
      {/* Today's Admission Follow-Ups & Tours Widget */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Today's Admission Agenda & Follow-ups</h3>
              <p className="text-xs text-gray-500">Scheduled campus visits, parent callbacks, and counseling sessions</p>
            </div>
          </div>
          <a
            href="/calendar"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
          >
            Open Full Calendar &rarr;
          </a>
        </div>
        <div className="p-6">
          {todayActivities.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500">
              No follow-ups or campus tours scheduled for today.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                      <span className="flex items-center gap-1 text-blue-600">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        {act.activityType === 'CampusTour'
                          ? formatSlotTime(act.scheduledStartTime)
                          : new Date(act.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-extrabold bg-blue-100 text-blue-800">
                        {act.activityType}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{act.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Student: <b>{act.studentName}</b> ({act.gradeInterested})
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                      {act.location}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-[10px] text-slate-400">Assigned: {act.assignedToName || 'Staff'}</span>
                    <a
                      href="/calendar"
                      className="font-bold text-blue-600 hover:underline"
                    >
                      Manage &rarr;
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No recent activities.</td>
                </tr>
              ) : activities.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      activity.activityType === 'Enquiry' ? 'bg-blue-100 text-blue-800' :
                      activity.activityType === 'Application' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {activity.activityType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
