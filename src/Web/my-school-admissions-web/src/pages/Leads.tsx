import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, MessageSquare, Phone, Send, Sparkles, Flame, CheckCircle, Clock, 
  ExternalLink, RefreshCw, BookOpen, Calendar, Search, Filter, 
  ArrowUpDown, ArrowUp, ArrowDown, X, Users, User, AlertCircle, Building2, UserCheck,
  Zap, Mic, Cloud, Volume2, Download, Megaphone, QrCode, UserPlus, Edit3, Check
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import api from '../lib/api';
import { type Enquiry, type CommunicationLog, type CommunicationTemplate, type CounselorSkillProfile, type CounselorMatchCandidate } from '../types';
import CallRecorderModal from '../components/telephony/CallRecorderModal';

interface CustomJwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  role?: string | string[];
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string | string[];
}

interface ActivityItem {
  id: string;
  enquiryId: string;
  title: string;
  activityType: string;
  scheduledStartTime: string;
  status: string;
  assignedToName?: string;
  assignedToUserId?: string;
}

interface AIInsightData {
  conversionProbability: number;
  leadHeatCategory: string; // HOT, WARM, COLD
  intentSummary: string;
  suggestedAction: string;
}

interface AIDraftResult {
  subject: string;
  body: string;
  whatsAppShortText: string;
  tone: string;
  keyTalkingPoints: string[];
}

export default function Leads() {
  const [leads, setLeads] = useState<Enquiry[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Enquiry | null>(null);

  // Form State (New Lead)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gradeInterested, setGradeInterested] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [region, setRegion] = useState('');
  const [religion, setReligion] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [coCounselorId, setCoCounselorId] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('Website / Direct');
  const [newLeadCampaign, setNewLeadCampaign] = useState('');

  // Counselors and Auto-assignment status state
  const [counselorProfiles, setCounselorProfiles] = useState<CounselorSkillProfile[]>([]);
  const [autoAssigningLeadId, setAutoAssigningLeadId] = useState<string | null>(null);
  const [autoAssigningCoCounselorId, setAutoAssigningCoCounselorId] = useState<string | null>(null);
  const [batchAssigning, setBatchAssigning] = useState(false);
  const [batchAssignResult, setBatchAssignResult] = useState<string | null>(null);

  // Manual Counselor & Co-Counselor Assignment Modal State
  const [isAssignCounselorModalOpen, setIsAssignCounselorModalOpen] = useState(false);
  const [assignModalLead, setAssignModalLead] = useState<Enquiry | null>(null);
  const [modalPrimaryCounselorId, setModalPrimaryCounselorId] = useState('');
  const [modalCoCounselorId, setModalCoCounselorId] = useState('');
  const [modalAssignmentNotes, setModalAssignmentNotes] = useState('');
  const [modalCoCounselorReason, setModalCoCounselorReason] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentSuccessToast, setAssignmentSuccessToast] = useState<string | null>(null);
  const [aiMatchCandidates, setAiMatchCandidates] = useState<CounselorMatchCandidate[]>([]);
  const [loadingAiCandidates, setLoadingAiCandidates] = useState(false);
  const [newLeadInstitutionId, setNewLeadInstitutionId] = useState('');
  const [institutionsList, setInstitutionsList] = useState<{ id: string; name: string }[]>([]);

  // Helper to restrict counselors strictly to the lead's institute
  const getCounselorsForLead = (lead?: Enquiry | null, customInstId?: string | null): CounselorSkillProfile[] => {
    const disId = 'fc49d553-b44f-4c4c-96ad-4bf599016c01';
    const svisId = 'a48d7782-dda9-42ad-b21a-046d517f1ce5';
    let targetInstId: string;

    if (customInstId) {
      targetInstId = customInstId;
    } else if (lead && (lead.institutionId || (lead as any).InstitutionId)) {
      targetInstId = lead.institutionId || (lead as any).InstitutionId;
    } else {
      // When creating a new lead or with no specific lead:
      const stored = localStorage.getItem('selectedInstitutionId');
      if (stored && stored !== 'all') {
        targetInstId = stored;
      } else if (newLeadInstitutionId) {
        targetInstId = newLeadInstitutionId;
      } else {
        targetInstId = disId;
      }
    }

    const tInst = (targetInstId || disId).toLowerCase();

    return counselorProfiles.filter(p => {
      let pInst = (p.institutionId || (p as any).InstitutionId || '').toLowerCase();

      // If missing, attempt domain inference
      if (!pInst && p.email) {
        const e = p.email.toLowerCase();
        if (e.includes('@svis') || e.includes('svis')) pInst = svisId.toLowerCase();
        else if (e.includes('@dis') || e.includes('dis')) pInst = disId.toLowerCase();
      }

      // Strictly must belong to the target institution - never leak across institutions
      if (!pInst || pInst !== tInst) {
        return false;
      }

      // Inactive counselors filtered out unless already assigned to this lead
      if (!p.isActive && p.userId !== lead?.assignedToId && p.userId !== lead?.coCounselorId) {
        return false;
      }

      return true;
    });
  };

  // Form State (Call / Interaction Logging)
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [callType, setCallType] = useState('Phone Call');
  const [callDisposition, setCallDisposition] = useState('Interested - Qualified');
  const [callNotes, setCallNotes] = useState('');

  // WhatsApp Outreach State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // AI Assistant State
  const [aiInsight, setAiInsight] = useState<AIInsightData | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [isAiDraftModalOpen, setIsAiDraftModalOpen] = useState(false);
  const [draftObjective, setDraftObjective] = useState('CampusTour');
  const [draftNotes, setDraftNotes] = useState('');
  const [aiDraft, setAiDraft] = useState<AIDraftResult | null>(null);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // Timeline / Communication Logs
  const [commHistory, setCommHistory] = useState<CommunicationLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [assignmentFilter, setAssignmentFilter] = useState('All');
  const [sortField, setSortField] = useState<'date' | 'name' | 'grade' | 'status' | 'interactions' | 'source'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Logged-in User & KPI State
  const [userScope, setUserScope] = useState<'all' | 'my'>('all');
  const [onlyNoFollowup, setOnlyNoFollowup] = useState(false);
  const [activeKpiFilter, setActiveKpiFilter] = useState<'all' | 'new' | 'pending' | 'noFollowup' | null>(null);

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
      const name = decoded.name || email.split('@')[0];
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

  // Unique Grades extracted from leads data
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    leads.forEach(l => {
      if (l.gradeInterested && l.gradeInterested.trim()) {
        grades.add(l.gradeInterested.trim());
      }
    });
    return Array.from(grades).sort();
  }, [leads]);

  // Map each lead to its scheduled follow-up activity
  const leadFollowupMap = useMemo(() => {
    const map = new Map<string, { hasFollowup: boolean; nextActivity?: ActivityItem }>();
    leads.forEach(l => {
      if (!l.id) return;
      const scheduled = activities
        .filter(a => a.enquiryId === l.id && a.status === 'Scheduled')
        .sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime());
      map.set(l.id, {
        hasFollowup: scheduled.length > 0,
        nextActivity: scheduled[0]
      });
    });
    return map;
  }, [leads, activities]);

  // Scoped leads based on user workload (My vs All, including Primary & Co-Counselor)
  const scopedLeads = useMemo(() => {
    if (userScope === 'my') {
      return leads.filter(l => l.assignedToId === loggedInUser.id || l.coCounselorId === loggedInUser.id);
    }
    return leads;
  }, [leads, userScope, loggedInUser.id]);

  // KPI Metrics (Total, New, Pending, No Followup)
  const kpiMetrics = useMemo(() => {
    const targetLeads = scopedLeads;
    const total = targetLeads.length;
    let newCount = 0;
    let pendingCount = 0;
    let noFollowupCount = 0;
    let qualifiedCount = 0;
    let lostCount = 0;

    targetLeads.forEach(l => {
      const st = (l.status || '').toLowerCase();
      if (st === 'new') {
        newCount++;
      } else if (st === 'contacted' || st === 'pending' || st === 'in progress') {
        pendingCount++;
      } else if (st === 'qualified') {
        qualifiedCount++;
      } else if (st === 'lost') {
        lostCount++;
      }

      // Check if lead has no followup scheduled
      const followupInfo = l.id ? leadFollowupMap.get(l.id) : null;
      if (!followupInfo?.hasFollowup && st !== 'lost') {
        noFollowupCount++;
      }
    });

    const myAssignedCount = leads.filter(l => l.assignedToId === loggedInUser.id || l.coCounselorId === loggedInUser.id).length;

    return {
      total,
      newCount,
      pendingCount,
      noFollowupCount,
      qualifiedCount,
      lostCount,
      myAssignedCount
    };
  }, [scopedLeads, leadFollowupMap, leads, loggedInUser.id]);

  // Status counts for tab pills (based on current scope)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: scopedLeads.length,
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Lost: 0,
    };
    scopedLeads.forEach(l => {
      const st = l.status || '';
      if (counts[st] !== undefined) {
        counts[st]++;
      } else {
        counts[st] = (counts[st] || 0) + 1;
      }
    });
    return counts;
  }, [scopedLeads]);

  // Filtered and Sorted leads
  const filteredAndSortedLeads = useMemo(() => {
    const result = leads.filter(lead => {
      // User scope filter (My Inquiries vs All Inquiries: primary or co-counselor)
      if (userScope === 'my' && lead.assignedToId !== loggedInUser.id && lead.coCounselorId !== loggedInUser.id) {
        return false;
      }

      // No Followup filter
      if (onlyNoFollowup) {
        const followup = lead.id ? leadFollowupMap.get(lead.id) : null;
        if (followup?.hasFollowup || lead.status?.toLowerCase() === 'lost') {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${lead.firstName} ${lead.lastName}`.toLowerCase();
        const email = (lead.email || '').toLowerCase();
        const phone = (lead.phone || '');
        const grade = (lead.gradeInterested || '').toLowerCase();
        const campaign = (lead.campaignName || '').toLowerCase();
        const source = (lead.leadSourceName || '').toLowerCase();
        if (!fullName.includes(q) && !email.includes(q) && !phone.includes(q) && !grade.includes(q) && !campaign.includes(q) && !source.includes(q)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'All') {
        const leadStatus = (lead.status || '').toLowerCase();
        const targetStatus = statusFilter.toLowerCase();
        if (targetStatus === 'pending') {
          if (leadStatus !== 'pending' && leadStatus !== 'contacted') return false;
        } else if (leadStatus !== targetStatus) {
          return false;
        }
      }

      // Grade filter
      if (gradeFilter !== 'All' && lead.gradeInterested !== gradeFilter) {
        return false;
      }

      // Assignment filter
      if (assignmentFilter === 'Assigned' && !lead.assignedToId) {
        return false;
      }
      if (assignmentFilter === 'Unassigned' && lead.assignedToId) {
        return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name': {
          const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'grade': {
          const gradeA = (a.gradeInterested || '').toLowerCase();
          const gradeB = (b.gradeInterested || '').toLowerCase();
          comparison = gradeA.localeCompare(gradeB);
          break;
        }
        case 'status': {
          const statusA = (a.status || '').toLowerCase();
          const statusB = (b.status || '').toLowerCase();
          comparison = statusA.localeCompare(statusB);
          break;
        }
        case 'interactions': {
          const countA = a.interactions?.length || 0;
          const countB = b.interactions?.length || 0;
          comparison = countA - countB;
          break;
        }
        case 'source': {
          const srcA = `${a.leadSourceName || ''} ${a.campaignName || ''}`.toLowerCase();
          const srcB = `${b.leadSourceName || ''} ${b.campaignName || ''}`.toLowerCase();
          comparison = srcA.localeCompare(srcB);
          break;
        }
        case 'date':
        default: {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [leads, userScope, loggedInUser.id, onlyNoFollowup, leadFollowupMap, searchQuery, statusFilter, gradeFilter, assignmentFilter, sortField, sortDirection]);

  const handleSort = (field: 'date' | 'name' | 'grade' | 'status' | 'interactions' | 'source') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIndicator = (field: 'date' | 'name' | 'grade' | 'status' | 'interactions' | 'source') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1.5 text-gray-400 opacity-50 group-hover:opacity-100 transition" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1.5 text-blue-600 stroke-[2.5]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1.5 text-blue-600 stroke-[2.5]" />
    );
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setGradeFilter('All');
    setAssignmentFilter('All');
    setOnlyNoFollowup(false);
    setActiveKpiFilter(null);
    setUserScope('all');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'All' || gradeFilter !== 'All' || assignmentFilter !== 'All' || onlyNoFollowup || userScope === 'my';

  useEffect(() => {
    fetchLeadsAndActivities();
    fetchTemplates();

    const handleTenant = () => {
      fetchLeadsAndActivities();
    };
    window.addEventListener('tenantChanged', handleTenant);
    return () => window.removeEventListener('tenantChanged', handleTenant);
  }, []);

  const fetchLeadsAndActivities = async () => {
    setLoading(true);
    const instId = localStorage.getItem('selectedInstitutionId') || 'all';
    const instQuery = instId && instId !== 'all' ? `?institutionId=${instId}` : '';
    try {
      const [leadsRes, actsRes, profilesRes, usersRes, instsRes] = await Promise.all([
        api.get<Enquiry[]>(`/api/leads${instQuery}`),
        api.get<ActivityItem[]>(`/api/leads/activities${instQuery}`).catch(() => ({ data: [] })),
        api.get<CounselorSkillProfile[]>('/api/counselors/profiles').catch(() => ({ data: [] })),
        api.get<any[]>('/api/users').catch(() => ({ data: [] })),
        api.get<{ id: string; name: string }[]>('/api/institutions').catch(() => ({ data: [] }))
      ]);
      setLeads(leadsRes.data || []);
      setActivities(actsRes.data || []);

      const institutions = instsRes.data || [];
      setInstitutionsList(institutions);
      if (institutions.length > 0) {
        setNewLeadInstitutionId(prev => prev || (instId && instId !== 'all' ? instId : institutions[0].id));
      }

      const disId = 'fc49d553-b44f-4c4c-96ad-4bf599016c01';
      const svisId = 'a48d7782-dda9-42ad-b21a-046d517f1ce5';

      const profileMap = new Map<string, CounselorSkillProfile>();
      (profilesRes.data || []).forEach(p => {
        const uId = (p.userId || p.id || '').toString().toLowerCase();
        if (uId) {
          let instId = p.institutionId || (p as any).InstitutionId || null;
          if (!instId && p.email) {
            const e = p.email.toLowerCase();
            if (e.includes('@svis') || e.includes('svis')) instId = svisId;
            else if (e.includes('@dis') || e.includes('dis')) instId = disId;
          }
          profileMap.set(uId, { ...p, institutionId: instId || undefined });
        }
      });

      // Build user map from IdentityService
      const userMap = new Map<string, any>();
      (usersRes.data || []).forEach((u: any) => {
        const uId = (u.id || '').toString().toLowerCase();
        if (uId) userMap.set(uId, u);
      });

      // Synchronize existing profiles with IdentityService user institution data
      profileMap.forEach((p, uId) => {
        const u = userMap.get(uId);
        if (u) {
          const uInstId = u.institutionId || u.InstitutionId || null;
          if (uInstId && (!p.institutionId || p.institutionId !== uInstId)) {
            p.institutionId = uInstId;
          }
          if (u.campusId && !p.campusId) {
            p.campusId = u.campusId;
          }
        }
      });

      // Merge additional users with counselor / admissions / staff roles (excluding pure SuperAdmins)
      (usersRes.data || []).forEach((u: any) => {
        const uId = (u.id || '').toString().toLowerCase();
        const roles = (u.roles || (u.role ? [u.role] : [])).map((r: string) => r.toLowerCase());
        
        // Exclude global superadmin user without specific counselor role
        const isPureSuperAdmin = roles.includes('superadmin') && !roles.some((r: string) => r.includes('counsel') || r.includes('couns'));
        if (isPureSuperAdmin) return;

        const isCounselor = roles.some((r: string) =>
          r.includes('counsel') || r.includes('couns') || r.includes('staff') || r.includes('admissions')
        );

        if (uId && isCounselor && !profileMap.has(uId)) {
          let uInstId = u.institutionId || u.InstitutionId || null;
          if (!uInstId && u.email) {
            const e = u.email.toLowerCase();
            if (e.includes('@svis') || e.includes('svis')) uInstId = svisId;
            else if (e.includes('@dis') || e.includes('dis')) uInstId = disId;
          }
          profileMap.set(uId, {
            id: u.id,
            userId: u.id,
            counselorName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Counselor',
            email: u.email || '',
            institutionId: uInstId || undefined,
            languagesKnown: [],
            handledClasses: [],
            regions: [],
            religions: [],
            dailyLeadCapacity: 20,
            maxActiveLeads: 50,
            isActive: u.isActive !== false,
            assignedCountToday: 0,
            currentActiveLeads: 0
          });
        }
      });

      setCounselorProfiles(Array.from(profileMap.values()));
    } catch (error) {
      console.error('Error fetching leads and activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = () => {
    fetchLeadsAndActivities();
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get<CommunicationTemplate[]>('/api/communications/templates');
      const whatsappTemplates = response.data.filter(template => template.channel.toLowerCase() === 'whatsapp');
      setTemplates(whatsappTemplates);
      if (whatsappTemplates.length > 0) {
        setSelectedTemplateId(whatsappTemplates[0].id);
        setCustomMessage(whatsappTemplates[0].content);
      }
    } catch (error) {
      console.error('Error fetching communication templates:', error);
    }
  };

  const fetchCommHistory = async (leadId: string) => {
    setLoadingHistory(true);
    try {
      const response = await api.get<CommunicationLog[]>(`/api/communications/history/${leadId}`);
      setCommHistory(response.data);
    } catch (error) {
      console.error('Error fetching communication history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const storedInst = localStorage.getItem('selectedInstitutionId');
      const currentInstId = (storedInst && storedInst !== 'all') ? storedInst : (newLeadInstitutionId || 'fc49d553-b44f-4c4c-96ad-4bf599016c01');
      const newLead: Enquiry = {
        firstName,
        lastName,
        email,
        phone,
        gradeInterested,
        leadSourceName: newLeadSource.trim() || 'Website / Direct',
        campaignName: newLeadCampaign.trim() || undefined,
        assignedToId: assignedToId || undefined,
        coCounselorId: coCounselorId || undefined,
        preferredLanguage: preferredLanguage.trim() || undefined,
        region: region.trim() || undefined,
        religion: religion.trim() || undefined,
        status: 'New',
        institutionId: currentInstId
      };
      await api.post('/api/leads', newLead);
      setIsNewLeadModalOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setGradeInterested('');
      setNewLeadSource('Website / Direct');
      setNewLeadCampaign('');
      setAssignedToId('');
      setCoCounselorId('');
      setPreferredLanguage('');
      setRegion('');
      setReligion('');
      fetchLeads();
    } catch (error) {
      console.error('Error creating lead:', error);
    }
  };

  const handleAutoAssignSingle = async (leadId: string) => {
    setAutoAssigningLeadId(leadId);
    try {
      const res = await api.post<{ success: boolean; message: string; enquiry: Enquiry }>(`/api/leads/${leadId}/auto-assign`);
      if (res.data?.success) {
        await fetchLeadsAndActivities();
        if (selectedLead && selectedLead.id === leadId) {
          const response = await api.get<Enquiry>(`/api/leads/${leadId}`);
          setSelectedLead(response.data);
        }
      }
    } catch (err) {
      console.error('Failed to auto-assign lead:', err);
    } finally {
      setAutoAssigningLeadId(null);
    }
  };

  const handleBatchAutoAssign = async () => {
    setBatchAssigning(true);
    setBatchAssignResult(null);
    try {
      const res = await api.post<{ totalUnassigned: number; assignedCount: number; remainingUnassigned: number; results: any[] }>(
        '/api/counselors/auto-assign-unassigned'
      );
      setBatchAssignResult(
        `Auto-routed ${res.data.assignedCount} of ${res.data.totalUnassigned} unassigned leads to matching counselors!`
      );
      await fetchLeadsAndActivities();
      setTimeout(() => setBatchAssignResult(null), 7000);
    } catch (err) {
      console.error('Failed batch auto-assignment:', err);
      setBatchAssignResult('Batch auto-assignment failed. Please check counselor configuration.');
      setTimeout(() => setBatchAssignResult(null), 7000);
    } finally {
      setBatchAssigning(false);
    }
  };

  const handleConvertToApplication = async (lead: Enquiry) => {
    try {
      await api.put(`/api/leads/${lead.id}/status`, { status: 'Qualified' });
      fetchLeads();
      if (selectedLead && selectedLead.id === lead.id) {
        openDetails({ ...selectedLead, status: 'Qualified' });
      }
    } catch (error) {
      console.error('Error converting lead:', error);
    }
  };

  const openAssignModal = async (lead: Enquiry) => {
    const activeStored = localStorage.getItem('selectedInstitutionId');
    const resolvedLead: Enquiry = {
      ...lead,
      institutionId: lead.institutionId || (lead as any).InstitutionId || ((activeStored && activeStored !== 'all') ? activeStored : 'fc49d553-b44f-4c4c-96ad-4bf599016c01')
    };
    setAssignModalLead(resolvedLead);
    setModalPrimaryCounselorId(resolvedLead.assignedToId || '');
    setModalCoCounselorId(resolvedLead.coCounselorId || '');
    setModalAssignmentNotes(resolvedLead.autoAssignmentReason || '');
    setModalCoCounselorReason(resolvedLead.coCounselorReason || '');
    setIsAssignCounselorModalOpen(true);

    // Fetch AI match recommendations for this lead in the background
    setLoadingAiCandidates(true);
    try {
      const targetInstId = resolvedLead.institutionId;
      const res = await api.post<CounselorMatchCandidate[]>('/api/counselors/match-simulator', {
        gradeInterested: resolvedLead.gradeInterested,
        preferredLanguage: resolvedLead.preferredLanguage,
        region: resolvedLead.region,
        religion: resolvedLead.religion,
        institutionId: targetInstId,
        campusId: resolvedLead.campusId
      });
      setAiMatchCandidates(res.data || []);
    } catch (err) {
      console.error('Failed to load match simulator for modal:', err);
      setAiMatchCandidates([]);
    } finally {
      setLoadingAiCandidates(false);
    }
  };

  const handleSaveCounselorAssignment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!assignModalLead || !assignModalLead.id) return;
    setSavingAssignment(true);
    try {
      const res = await api.put<Enquiry>(`/api/leads/${assignModalLead.id}/counselors`, {
        assignedToId: modalPrimaryCounselorId || null,
        coCounselorId: modalCoCounselorId || null,
        assignmentNotes: modalAssignmentNotes || null,
        coCounselorReason: modalCoCounselorReason || null
      });

      const updatedLead = res.data;
      if (!updatedLead.institutionId && assignModalLead?.institutionId) {
        updatedLead.institutionId = assignModalLead.institutionId;
      }
      setLeads(prev => prev.map(l => l.id === assignModalLead.id ? { ...l, ...updatedLead } : l));
      if (selectedLead && selectedLead.id === assignModalLead.id) {
        setSelectedLead(prev => prev ? { ...prev, ...updatedLead } : null);
      }

      setAssignmentSuccessToast(
        `Counselor team updated for ${updatedLead.firstName} ${updatedLead.lastName}!`
      );
      setTimeout(() => setAssignmentSuccessToast(null), 5000);
      setIsAssignCounselorModalOpen(false);
      fetchLeadsAndActivities();
    } catch (error: any) {
      console.error('Error saving counselor assignment:', error);
      const msg = error?.response?.data?.message || 'Failed to update counselor assignment. Please try again.';
      alert(msg);
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleAssignToMe = async (leadId: string) => {
    try {
      const myId = loggedInUser.id || "99999999-9999-9999-9999-999999999999";
      const targetLead = leads.find(l => l.id === leadId) || selectedLead;
      const res = await api.put<Enquiry>(`/api/leads/${leadId}/counselors`, {
        assignedToId: myId,
        coCounselorId: targetLead?.coCounselorId || null,
        assignmentNotes: "Assigned to self by Counselor.",
        coCounselorReason: targetLead?.coCounselorReason || null
      });
      const updated = res.data;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updated } : l));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(updated);
      }
      setAssignmentSuccessToast(`Assigned to yourself!`);
      setTimeout(() => setAssignmentSuccessToast(null), 4000);
      fetchLeadsAndActivities();
    } catch (error: any) {
      console.error('Error assigning lead:', error);
      const msg = error?.response?.data?.message || 'Error assigning lead to yourself.';
      alert(msg);
    }
  };

  const handleAssignPrimary = async (leadId: string, counselorId: string | null) => {
    try {
      const targetLead = leads.find(l => l.id === leadId) || selectedLead;
      const res = await api.put<Enquiry>(`/api/leads/${leadId}/counselors`, {
        assignedToId: counselorId || null,
        coCounselorId: targetLead?.coCounselorId || null,
        assignmentNotes: counselorId ? "Manually assigned primary counselor." : null,
        coCounselorReason: targetLead?.coCounselorReason || null
      });
      const updated = res.data;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updated } : l));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(updated);
      }
      setAssignmentSuccessToast(`Primary counselor updated!`);
      setTimeout(() => setAssignmentSuccessToast(null), 4000);
      fetchLeadsAndActivities();
    } catch (error: any) {
      console.error('Error setting primary counselor:', error);
      const msg = error?.response?.data?.message || 'Error setting primary counselor.';
      alert(msg);
    }
  };

  const handleAssignCoCounselor = async (leadId: string, coId: string | null) => {
    try {
      const targetLead = leads.find(l => l.id === leadId) || selectedLead;
      const res = await api.put<Enquiry>(`/api/leads/${leadId}/counselors`, {
        assignedToId: targetLead?.assignedToId || null,
        coCounselorId: coId || null,
        assignmentNotes: targetLead?.autoAssignmentReason || null,
        coCounselorReason: coId ? "Manually designated co-counselor." : null
      });
      const updated = res.data;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updated } : l));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(updated);
      }
      setAssignmentSuccessToast(`Co-counselor updated!`);
      setTimeout(() => setAssignmentSuccessToast(null), 4000);
      fetchLeadsAndActivities();
    } catch (error: any) {
      console.error('Error setting co-counselor:', error);
      const msg = error?.response?.data?.message || 'Error setting co-counselor.';
      alert(msg);
    }
  };

  const handleAutoAssignCoCounselor = async (leadId: string) => {
    setAutoAssigningCoCounselorId(leadId);
    try {
      const res = await api.post<{ success: boolean; coCounselorName?: string; coCounselorReason?: string }>(`/api/leads/${leadId}/auto-assign-co-counselor`);
      if (res.data?.success) {
        await fetchLeadsAndActivities();
        if (selectedLead && selectedLead.id === leadId) {
          const response = await api.get<Enquiry>(`/api/leads/${leadId}`);
          setSelectedLead(response.data);
        }
      }
    } catch (err) {
      console.error('Failed to auto-assign co-counselor:', err);
    } finally {
      setAutoAssigningCoCounselorId(null);
    }
  };

  const handleLogInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !selectedLead.id) return;

    try {
      await api.post(`/api/leads/${selectedLead.id}/interactions`, {
        interactionType: callType,
        disposition: callDisposition,
        notes: callNotes,
        handledByUserId: "00000000-0000-0000-0000-000000000001"
      });
      setCallNotes('');
      setIsCallModalOpen(false);
      
      const response = await api.get<Enquiry>(`/api/leads/${selectedLead.id}`);
      setSelectedLead(response.data);
      fetchLeads();
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!selectedLead || !selectedLead.id) return;
    setSendingMessage(true);

    try {
      const selectedTpl = templates.find(t => t.id === selectedTemplateId);
      const studentFullName = `${selectedLead.firstName} ${selectedLead.lastName}`.trim();
      const messageToSend = customMessage.replace('{StudentName}', studentFullName);

      const response = await api.post('/api/communications/send', {
        referenceId: selectedLead.id,
        studentName: studentFullName,
        recipient: selectedLead.phone,
        channel: 'WhatsApp',
        templateName: selectedTpl?.name || 'Custom Outreach',
        subject: selectedTpl?.subject || 'Admissions Outreach',
        content: messageToSend,
        handledBy: 'Admissions Counselor'
      });

      alert(response.data.message || 'WhatsApp accepted the message for submission.');
      setIsWhatsAppModalOpen(false);
      fetchCommHistory(selectedLead.id);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      const apiMessage = (error as any)?.response?.data?.details || (error as any)?.response?.data?.message;
      alert(apiMessage || 'WhatsApp could not accept the message. Check the number and WhatsApp API configuration.');
    } finally {
      setSendingMessage(false);
    }
  };

  const [brochureSending, setBrochureSending] = useState(false);
  const [brochureSuccessMsg, setBrochureSuccessMsg] = useState('');

  const handleSendBrochure = async (lead: Enquiry) => {
    setBrochureSending(true);
    try {
      const studentFullName = `${lead.firstName} ${lead.lastName}`.trim();
      const res = await api.post('/api/communications/whatsapp/brochure', {
        referenceId: lead.id,
        studentName: studentFullName,
        phone: lead.phone,
        schoolName: 'Delhi International School',
        targetGrade: lead.gradeInterested || 'Grade 1'
      });

      setBrochureSuccessMsg(res.data.message || `WhatsApp accepted the brochure message for ${lead.phone}.`);
      setTimeout(() => setBrochureSuccessMsg(''), 4000);
      if (lead.id && selectedLead?.id === lead.id) {
        fetchCommHistory(lead.id);
      }
    } catch (err) {
      console.error('Failed to send brochure', err);
      const apiMessage = (err as any)?.response?.data?.details || (err as any)?.response?.data?.message;
      alert(apiMessage || 'WhatsApp could not accept the brochure message. Check the number and WhatsApp API configuration.');
    } finally {
      setBrochureSending(false);
    }
  };

  const handleGenerateAIDraft = async () => {
    if (!selectedLead || !selectedLead.id) return;
    setGeneratingDraft(true);

    try {
      const studentFullName = `${selectedLead.firstName} ${selectedLead.lastName}`.trim();
      const response = await api.post<AIDraftResult>('/api/ai/draft-counselor-email', {
        leadId: selectedLead.id,
        studentName: studentFullName,
        gradeInterested: selectedLead.gradeInterested,
        objective: draftObjective,
        counselorNotes: draftNotes,
        preferredChannel: 'Email'
      });
      setAiDraft(response.data);
    } catch (error) {
      console.error('Error generating AI draft:', error);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const openDetails = async (lead: Enquiry) => {
    try {
      setAiInsight(null);
      setCommHistory([]);
      const response = await api.get<Enquiry>(`/api/leads/${lead.id}`);
      const leadData = response.data;
      if (!leadData.institutionId) {
        leadData.institutionId = lead.institutionId || (lead as any).InstitutionId;
      }
      setSelectedLead(leadData);
      
      // Fetch AI Insight
      setLoadingInsight(true);
      try {
        const aiResponse = await api.get<AIInsightData>(`/api/ai/lead/${lead.id}?grade=${encodeURIComponent(lead.gradeInterested || '')}&status=${encodeURIComponent(lead.status)}`);
        setAiInsight(aiResponse.data);
      } catch (aiErr) {
        console.error('Failed to fetch AI insights', aiErr);
      } finally {
        setLoadingInsight(false);
      }

      // Fetch Communication History
      if (lead.id) {
        fetchCommHistory(lead.id);
      }
    } catch (error) {
      console.error('Error fetching lead details:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Leads & Student Inquiries</h1>
          <p className="text-sm text-gray-500 mt-1">Multi-channel inquiry ingestion, AI intent scoring, and 1-click counselor outreach.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLeads()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            <RefreshCw className="h-4 w-4 mr-1 text-gray-500" />
            Refresh
          </button>
          <button
            onClick={handleBatchAutoAssign}
            disabled={batchAssigning}
            className="inline-flex items-center px-3.5 py-2 border border-purple-200 text-sm font-semibold rounded-lg text-purple-700 bg-purple-50 hover:bg-purple-100 transition shadow-xs"
            title="Automatically match and assign all unassigned leads to counselors based on skills"
          >
            <Zap className={`h-4 w-4 mr-1.5 text-purple-600 ${batchAssigning ? 'animate-spin' : ''}`} />
            {batchAssigning ? 'Auto-Routing...' : 'Auto-Route Unassigned'}
          </button>
          <button
            onClick={() => setIsNewLeadModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New Enquiry
          </button>
        </div>
      </div>

      {/* Auto-Assignment Notification Banner */}
      {batchAssignResult && (
        <div className="bg-purple-50 border border-purple-300 text-purple-900 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
            <span>{batchAssignResult}</span>
          </div>
          <button onClick={() => setBatchAssignResult(null)} className="text-purple-700 hover:text-purple-900 font-bold text-sm">×</button>
        </div>
      )}

      {/* WhatsApp Cloud API Notification Banner */}
      {brochureSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{brochureSuccessMsg}</span>
          </div>
          <button onClick={() => setBrochureSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 font-bold text-sm">×</button>
        </div>
      )}

      {/* Logged in User Context & KPI Indicators Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-inner border border-white/20">
              {(loggedInUser.name || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-blue-300">
                  Admissions Counselor Workspace
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

          {/* Scope Selector: My Inquiries vs All School Inquiries */}
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
            <button
              onClick={() => {
                setUserScope('my');
                setActiveKpiFilter(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                userScope === 'my'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>My Enquiries</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                userScope === 'my' ? 'bg-white/25 text-white' : 'bg-white/15 text-blue-200'
              }`}>
                {kpiMetrics.myAssignedCount}
              </span>
            </button>

            <button
              onClick={() => {
                setUserScope('all');
                setActiveKpiFilter(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                userScope === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>All Campus Enquiries</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                userScope === 'all' ? 'bg-white/25 text-white' : 'bg-white/15 text-blue-200'
              }`}>
                {leads.length}
              </span>
            </button>
          </div>
        </div>

        {/* 4 KPI Indicator Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {/* KPI 1: Total Enquiries */}
          <div 
            onClick={() => {
              setActiveKpiFilter('all');
              setStatusFilter('All');
              setOnlyNoFollowup(false);
            }}
            className={`cursor-pointer rounded-xl p-4 transition-all duration-200 bg-white/10 hover:bg-white/15 border ${
              activeKpiFilter === 'all' || (activeKpiFilter === null && statusFilter === 'All' && !onlyNoFollowup)
                ? 'ring-2 ring-blue-400 bg-white/20 border-blue-400/60 shadow-md'
                : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Total Enquiries</span>
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{kpiMetrics.total}</span>
              <span className="text-[11px] text-blue-200">
                {userScope === 'my' ? 'Assigned to you' : 'Total pipeline'}
              </span>
            </div>
          </div>

          {/* KPI 2: New Enquiries */}
          <div 
            onClick={() => {
              setActiveKpiFilter('new');
              setStatusFilter('New');
              setOnlyNoFollowup(false);
            }}
            className={`cursor-pointer rounded-xl p-4 transition-all duration-200 bg-white/10 hover:bg-white/15 border ${
              activeKpiFilter === 'new' || (statusFilter.toLowerCase() === 'new' && !onlyNoFollowup)
                ? 'ring-2 ring-emerald-400 bg-white/20 border-emerald-400/60 shadow-md'
                : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">New</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{kpiMetrics.newCount}</span>
              <span className="text-[11px] text-emerald-200">Awaiting contact</span>
            </div>
          </div>

          {/* KPI 3: Pending Enquiries */}
          <div 
            onClick={() => {
              setActiveKpiFilter('pending');
              setStatusFilter('Pending');
              setOnlyNoFollowup(false);
            }}
            className={`cursor-pointer rounded-xl p-4 transition-all duration-200 bg-white/10 hover:bg-white/15 border ${
              activeKpiFilter === 'pending' || ((statusFilter.toLowerCase() === 'pending' || statusFilter.toLowerCase() === 'contacted') && !onlyNoFollowup)
                ? 'ring-2 ring-amber-400 bg-white/20 border-amber-400/60 shadow-md'
                : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Pending</span>
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{kpiMetrics.pendingCount}</span>
              <span className="text-[11px] text-amber-200">Contacted / in progress</span>
            </div>
          </div>

          {/* KPI 4: No Followup */}
          <div 
            onClick={() => {
              setActiveKpiFilter('noFollowup');
              setOnlyNoFollowup(true);
              setStatusFilter('All');
            }}
            className={`cursor-pointer rounded-xl p-4 transition-all duration-200 bg-white/10 hover:bg-white/15 border ${
              onlyNoFollowup || activeKpiFilter === 'noFollowup'
                ? 'ring-2 ring-rose-400 bg-white/20 border-rose-400/60 shadow-md'
                : 'border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">No Follow-up</span>
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{kpiMetrics.noFollowupCount}</span>
              <span className="text-[11px] text-rose-200">Needs scheduling</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs & Active Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200">
        {(['All', 'New', 'Contacted', 'Qualified', 'Lost'] as const).map(status => {
          const count = statusCounts[status] || 0;
          const isActive = statusFilter === status && !onlyNoFollowup;
          return (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setOnlyNoFollowup(false);
                setActiveKpiFilter(status === 'All' ? 'all' : status.toLowerCase() as any);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{status === 'Contacted' ? 'Pending / Contacted' : status}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}

        {onlyNoFollowup && (
          <button
            onClick={() => {
              setOnlyNoFollowup(false);
              setActiveKpiFilter(null);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>No Follow-up Scheduled ({kpiMetrics.noFollowupCount})</span>
            <X className="w-3.5 h-3.5 hover:opacity-75 ml-1" />
          </button>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search candidate, email, phone, grade..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Grade Dropdown */}
          <div className="w-48">
            <select
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Grades & Programs</option>
              {uniqueGrades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Counselor Assignment Dropdown */}
          <div className="w-40">
            <select
              value={assignmentFilter}
              onChange={e => setAssignmentFilter(e.target.value)}
              className="w-full px-2.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Assignments</option>
              <option value="Assigned">Assigned</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Lead Count Summary */}
        <div className="text-xs font-bold text-gray-500 shrink-0 self-end md:self-center">
          Showing <span className="text-gray-900">{filteredAndSortedLeads.length}</span> of <span className="text-gray-900">{scopedLeads.length}</span> {userScope === 'my' ? 'assigned' : ''} leads
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white shadow-sm border border-gray-200 overflow-hidden rounded-xl">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-base font-medium text-gray-900">No student inquiries found.</p>
            <p className="text-sm text-gray-500 mt-1">Create an enquiry manually or test the external webhook.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center">
                      Candidate Name
                      {renderSortIndicator('name')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('grade')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center">
                      Grade / Program
                      {renderSortIndicator('grade')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center">
                      Status
                      {renderSortIndicator('status')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('source')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center">
                      Source / Campaign
                      {renderSortIndicator('source')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Follow-up
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Counselor
                  </th>
                  <th 
                    onClick={() => handleSort('interactions')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center">
                      Interactions
                      {renderSortIndicator('interactions')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('date')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center">
                      Received
                      {renderSortIndicator('date')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      <Filter className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-800">No leads match your active filters.</p>
                      <p className="text-xs text-gray-500 mt-1">Try adjusting your search terms or clearing specific filters.</p>
                      <button
                        onClick={resetFilters}
                        className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
                      >
                        Reset all filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-blue-50/50 cursor-pointer transition-colors" onClick={() => openDetails(lead)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {(lead.firstName || '?')[0]}{(lead.lastName || '')[0] || ''}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.firstName || 'Candidate'} {lead.lastName || ''}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                              <span>{lead.email}</span>
                              {lead.phone && (
                                <>
                                  <span>•</span>
                                  <a 
                                    href={`tel:${lead.phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold"
                                    title="Click-to-Call Telephony via VoIP"
                                  >
                                    <Phone className="w-3 h-3 mr-0.5" />
                                    {lead.phone}
                                  </a>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLead(lead);
                                      setIsRecordModalOpen(true);
                                    }}
                                    className="inline-flex items-center text-rose-600 hover:text-rose-800 font-semibold p-1 hover:bg-rose-50 rounded ml-1"
                                    title="Record Telephone Conversation to Google Drive"
                                  >
                                    <Mic className="w-3 h-3 text-rose-500" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span className="font-medium">{lead.gradeInterested}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                          lead.status === 'New' ? 'bg-emerald-100 text-emerald-800' : 
                          (lead.status === 'Converted' || lead.status === 'Qualified') ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'Lost' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      {/* Source & Campaign Column */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start min-w-[130px] max-w-[250px]">
                          <span className="px-2 py-0.5 inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md border border-slate-200/90 shadow-2xs">
                            <span className={`w-1.5 h-1.5 rounded-full ${lead.campaignName ? 'bg-indigo-500' : 'bg-slate-400'}`}></span>
                            {lead.leadSourceName || (lead.campaignName ? 'QR Campaign' : 'Website / Direct')}
                          </span>
                          {lead.campaignName && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200/80 shadow-2xs hover:bg-indigo-100/80 transition truncate max-w-full"
                              title={`Campaign Applied Through: ${lead.campaignName}`}
                            >
                              <Megaphone className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span className="truncate">{lead.campaignName}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Follow-up Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {(() => {
                          const followup = lead.id ? leadFollowupMap.get(lead.id) : null;
                          if (followup?.hasFollowup && followup.nextActivity) {
                            const act = followup.nextActivity;
                            const dateStr = new Date(act.scheduledStartTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
                            return (
                              <a
                                href={`/calendar?enquiryId=${lead.id}`}
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold hover:bg-emerald-100 transition"
                                title={`Scheduled ${act.activityType}: ${act.title}`}
                              >
                                <Calendar className="w-3 h-3 text-emerald-600" />
                                <span>{dateStr} ({act.activityType})</span>
                              </a>
                            );
                          }
                          if (lead.status === 'Lost' || lead.status === 'Qualified') {
                            return <span className="text-gray-400 italic text-[11px]">N/A ({lead.status})</span>;
                          }
                          return (
                            <a
                              href={`/calendar?enquiryId=${lead.id}&studentName=${encodeURIComponent((lead.firstName || '') + ' ' + (lead.lastName || ''))}`}
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold hover:bg-rose-100 transition"
                              title="No follow-up activity scheduled! Click to plan."
                            >
                              <AlertCircle className="w-3 h-3 text-rose-500" />
                              <span>No Follow-up</span>
                              <span className="text-[10px] text-blue-600 underline ml-0.5 font-bold">+ Plan</span>
                            </a>
                          );
                        })()}
                      </td>
                      {/* Counselor Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {lead.assignedToId ? (
                              lead.assignedToId === loggedInUser.id ? (
                                <span className="inline-flex items-center font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                  <UserCheck className="w-3 h-3 mr-1 text-blue-600" />
                                  You (Primary)
                                </span>
                              ) : (
                                <span className="inline-flex items-center font-semibold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                                  <User className="w-3 h-3 mr-1 text-purple-600" />
                                  {lead.assignedToName || 'Primary'}
                                </span>
                              )
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">Unassigned</span>
                            )}

                            {lead.coCounselorId && (
                              lead.coCounselorId === loggedInUser.id ? (
                                <span className="inline-flex items-center font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md text-[11px]">
                                  <Users className="w-3 h-3 mr-1 text-teal-600" />
                                  You (Co)
                                </span>
                              ) : (
                                <span 
                                  className="inline-flex items-center font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md text-[11px] cursor-help"
                                  title={lead.coCounselorReason || 'Assigned Co-Counselor'}
                                >
                                  <Users className="w-3 h-3 mr-1 text-teal-600" />
                                  Co: {lead.coCounselorName || 'Co-Counselor'}
                                </span>
                              )
                            )}

                            {/* Direct edit button right next to counselor pills */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssignModal(lead);
                              }}
                              className="inline-flex items-center text-[10px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded transition shadow-2xs"
                              title="Manually assign or edit Counselor / Co-Counselor"
                            >
                              <Edit3 className="w-2.5 h-2.5 mr-1 text-purple-600" />
                              {lead.assignedToId ? 'Edit Team' : 'Assign'}
                            </button>
                          </div>

                          {lead.autoAssignmentScore !== undefined && lead.autoAssignmentScore !== null && (
                            <span
                              className="inline-flex items-center text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.2 w-fit cursor-help"
                              title={lead.autoAssignmentReason || `AI Compatibility match: ${lead.autoAssignmentScore}%`}
                            >
                              <Sparkles className="w-2.5 h-2.5 mr-1 text-indigo-500" />
                              AI: {lead.autoAssignmentScore}% Match
                            </span>
                          )}

                          {!lead.assignedToId && (
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAssignModal(lead);
                                }}
                                className="inline-flex items-center font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded-md transition shadow-2xs text-[11px]"
                                title="Manually choose primary counselor and co-counselor"
                              >
                                <UserPlus className="w-3 h-3 mr-1 text-purple-600" />
                                Assign Manually
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (lead.id) handleAutoAssignSingle(lead.id);
                                }}
                                disabled={autoAssigningLeadId === lead.id}
                                className="inline-flex items-center font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-md transition shadow-2xs text-[11px]"
                                title="Auto-assign best counselor team via AI"
                              >
                                <Sparkles className={`w-3 h-3 mr-1 text-indigo-600 ${autoAssigningLeadId === lead.id ? 'animate-spin' : ''}`} />
                                Auto AI
                              </button>
                              {loggedInUser.id && getCounselorsForLead(lead).some(p => p.userId === loggedInUser.id) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (lead.id) handleAssignToMe(lead.id);
                                  }}
                                  className="inline-flex items-center font-medium text-gray-500 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-dashed border-gray-300 px-1.5 py-1 rounded-md transition text-[11px]"
                                  title="Assign this enquiry to yourself"
                                >
                                  Me
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                          <MessageSquare className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {lead.interactions?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {lead.createdAt ? (
                          <div>
                            <div className="font-semibold text-gray-800">
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition"
                              title="Click-to-Call Telephony"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSendBrochure(lead); }}
                            className="inline-flex items-center px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition"
                            title="Send Admission Brochure via WhatsApp"
                          >
                            <Send className="w-3 h-3 mr-1 text-emerald-600" />
                            Brochure
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openAssignModal(lead); }}
                            className="inline-flex items-center text-purple-700 bg-purple-50 hover:bg-purple-100 font-semibold text-xs border border-purple-200 px-2.5 py-1 rounded transition"
                            title="Assign or edit Counselor & Co-Counselor"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1 text-purple-600" />
                            Assign
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openDetails(lead); }}
                            className="text-blue-600 hover:text-blue-900 font-semibold text-xs border border-blue-200 px-2.5 py-1 rounded hover:bg-blue-50 transition"
                          >
                            Outreach
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details & Outreach Drawer Modal */}
      {selectedLead && (
        <div className="fixed z-30 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-600/70 backdrop-blur-xs transition-opacity" onClick={() => setSelectedLead(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-2xl px-6 pt-5 pb-6 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                    {selectedLead.firstName[0]}{selectedLead.lastName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-gray-900">{selectedLead.firstName} {selectedLead.lastName}</h3>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                        selectedLead.status === 'New' ? 'bg-emerald-100 text-emerald-800' : 
                        (selectedLead.status === 'Qualified' || selectedLead.status === 'Converted') ? 'bg-blue-100 text-blue-800' :
                        selectedLead.status === 'Lost' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedLead.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedLead.email} • {selectedLead.phone} • Grade: {selectedLead.gradeInterested}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAssignModal(selectedLead)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition"
                    title="Edit Counselor and Co-Counselor Assignment"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                    Assign Counselors
                  </button>
                  <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600 p-1">
                    ✕
                  </button>
                </div>
              </div>

              {/* Attribution & Campaign Source Banner */}
              <div className="my-3 p-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/60 rounded-xl border border-indigo-100 flex items-center justify-between flex-wrap gap-2 text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Lead Source / Touchpoint</span>
                    <span className="font-semibold text-gray-900">{selectedLead.leadSourceName || (selectedLead.campaignName ? 'QR Campaign' : 'Website / Direct')}</span>
                  </div>
                </div>
                {selectedLead.campaignName ? (
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block">Campaign Applied Through</span>
                      <span className="font-bold text-purple-900">{selectedLead.campaignName}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500 italic">
                    Direct applicant (Organic Website)
                  </div>
                )}
              </div>

              {/* Counselor Action Bar */}
              <div className="my-4 flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200/80">
                <button
                  onClick={() => {
                    const studentFullName = `${selectedLead.firstName} ${selectedLead.lastName}`.trim();
                    const defaultTpl = templates[0];
                    if (defaultTpl) {
                      setSelectedTemplateId(defaultTpl.id);
                      setCustomMessage(defaultTpl.content.replace('{StudentName}', studentFullName));
                    }
                    setIsWhatsAppModalOpen(true);
                  }}
                  className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  1-Click WhatsApp
                </button>

                <button
                  onClick={() => handleSendBrochure(selectedLead)}
                  disabled={brochureSending}
                  className="inline-flex items-center px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                  title="Send official prospectus via Meta WhatsApp Cloud API"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  {brochureSending ? 'Sending...' : 'Meta WhatsApp Brochure'}
                </button>

                <button
                  onClick={() => setIsCallModalOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  <Phone className="w-3.5 h-3.5 mr-1.5" />
                  Log Call / Disposition
                </button>

                <button
                  onClick={() => setIsRecordModalOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                  title="Record live telephone call or upload audio and sync to Google Drive"
                >
                  <Mic className="w-3.5 h-3.5 mr-1.5" />
                  Record Call to Drive
                </button>

                <a
                  href="/calendar"
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Schedule Tour / Follow-up
                </a>

                <button
                  onClick={() => {
                    setIsAiDraftModalOpen(true);
                    handleGenerateAIDraft();
                  }}
                  className="inline-flex items-center px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  AI Outreach Drafter
                </button>

                {selectedLead.status !== 'Qualified' && selectedLead.status !== 'Converted' && (
                  <button
                    onClick={() => handleConvertToApplication(selectedLead)}
                    className="inline-flex items-center px-3 py-1.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 text-xs font-semibold rounded-lg transition ml-auto"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Qualify Lead
                  </button>
                )}

                {!selectedLead.assignedToId && (
                  <button
                    onClick={() => handleAssignToMe(selectedLead.id!)}
                    className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold rounded-lg transition"
                  >
                    Assign to Me
                  </button>
                )}
              </div>

              {/* AI Counselor & Co-Counselor Team Routing Card */}
              <div className="mb-4 bg-gradient-to-r from-slate-50 via-purple-50/50 to-indigo-50/40 border border-purple-200/80 rounded-xl p-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-950">AI Counselor & Co-Counselor Team</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-2">
                      {selectedLead.autoAssignmentScore !== undefined && selectedLead.autoAssignmentScore !== null && (
                        <span className="inline-flex items-center text-xs font-bold text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded-full">
                          ✨ AI Match: {selectedLead.autoAssignmentScore}%
                        </span>
                      )}
                      {selectedLead.assignedToName && (
                        <span className="text-gray-700">Primary: <strong className="text-gray-900">{selectedLead.assignedToName}</strong></span>
                      )}
                      {selectedLead.coCounselorName && (
                        <span className="text-teal-800">Co-Counselor: <strong className="text-teal-950">{selectedLead.coCounselorName}</strong></span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => openAssignModal(selectedLead)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                      title="Open full manual assignment and AI advisor"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Manage Counselors
                    </button>
                    <button
                      onClick={() => selectedLead.id && handleAutoAssignSingle(selectedLead.id)}
                      disabled={autoAssigningLeadId === selectedLead.id}
                      className="inline-flex items-center px-3 py-1.5 bg-white border border-purple-200 hover:bg-purple-50 text-purple-700 text-xs font-bold rounded-lg shadow-xs transition"
                      title="Re-evaluate and pair primary & co-counselor using Artificial Intelligence"
                    >
                      <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${autoAssigningLeadId === selectedLead.id ? 'animate-spin' : ''}`} />
                      {selectedLead.assignedToId ? 'Re-Score Team with AI' : 'Auto-Assign Team with AI'}
                    </button>
                    {!selectedLead.assignedToId && loggedInUser.id && getCounselorsForLead(selectedLead).some(p => p.userId === loggedInUser.id) && (
                      <button
                        onClick={() => selectedLead.id && handleAssignToMe(selectedLead.id)}
                        className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold rounded-lg transition"
                      >
                        Assign to Me
                      </button>
                    )}
                  </div>
                </div>

                {/* Team Assignment Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                  {/* Primary Counselor Selector */}
                  <div className="p-3 bg-white rounded-lg border border-purple-100 shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-purple-600" />
                        Primary Counselor
                      </label>
                      {selectedLead.assignedToId && (
                        <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                          Assigned
                        </span>
                      )}
                    </div>
                    <select
                      value={selectedLead.assignedToId || ''}
                      onChange={(e) => selectedLead.id && handleAssignPrimary(selectedLead.id, e.target.value || null)}
                      className="w-full text-xs p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 font-medium"
                    >
                      <option value="">Unassigned</option>
                      {getCounselorsForLead(selectedLead).map(p => (
                        <option key={p.userId} value={p.userId}>
                          {p.counselorName} ({p.currentActiveLeads}/{p.maxActiveLeads} active)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Co-Counselor Selector */}
                  <div className="p-3 bg-white rounded-lg border border-teal-100 shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-teal-600" />
                        Co-Counselor
                      </label>
                      <button
                        onClick={() => selectedLead.id && handleAutoAssignCoCounselor(selectedLead.id)}
                        disabled={autoAssigningCoCounselorId === selectedLead.id}
                        className="text-[10px] text-teal-700 font-bold bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 transition flex items-center gap-1"
                        title="Auto-pick compatible Co-Counselor using AI"
                      >
                        <Sparkles className={`w-3 h-3 ${autoAssigningCoCounselorId === selectedLead.id ? 'animate-spin' : ''}`} />
                        Auto-Pair AI
                      </button>
                    </div>
                    <select
                      value={selectedLead.coCounselorId || ''}
                      onChange={(e) => selectedLead.id && handleAssignCoCounselor(selectedLead.id, e.target.value || null)}
                      className="w-full text-xs p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 font-medium"
                    >
                      <option value="">None (Single Counselor)</option>
                      {getCounselorsForLead(selectedLead)
                        .filter(p => p.userId !== selectedLead.assignedToId)
                        .map(p => (
                          <option key={p.userId} value={p.userId}>
                            {p.counselorName} ({p.currentActiveLeads}/{p.maxActiveLeads} active)
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* AI Synergy or Match Explanation */}
                {selectedLead.coCounselorReason && (
                  <div className="mt-2.5 p-2.5 bg-teal-50/70 rounded-lg border border-teal-200 text-xs text-teal-900 flex items-start gap-2">
                    <Users className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Co-Counselor Synergy: </span>{selectedLead.coCounselorReason}
                    </div>
                  </div>
                )}

                {selectedLead.autoAssignmentReason && (
                  <div className="mt-2 p-2.5 bg-white/90 rounded-lg border border-purple-100 text-xs text-purple-900 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">AI Match Evaluation: </span>{selectedLead.autoAssignmentReason}
                    </div>
                  </div>
                )}

                {/* Candidate Demographics */}
                <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-purple-100/80 shadow-2xs">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Preferred Language</span>
                    <span className="font-semibold text-gray-900">{selectedLead.preferredLanguage || 'Not specified'}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-purple-100/80 shadow-2xs">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Region / Zone</span>
                    <span className="font-semibold text-gray-900">{selectedLead.region || 'Not specified'}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-purple-100/80 shadow-2xs">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Religion / Community</span>
                    <span className="font-semibold text-gray-900">{selectedLead.religion || 'Not specified'}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-purple-100/80 shadow-2xs">
                    <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider">Target Class</span>
                    <span className="font-semibold text-gray-900">{selectedLead.gradeInterested || 'General'}</span>
                  </div>
                </div>
              </div>

              {/* AI Intent & Warmth Section */}
              <div className="mb-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/70 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-900">AI Intent Scoring & Heat Category</span>
                  </div>
                  {aiInsight && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide ${
                      aiInsight.leadHeatCategory === 'HOT' ? 'bg-rose-600 text-white shadow-xs animate-pulse' :
                      aiInsight.leadHeatCategory === 'WARM' ? 'bg-amber-500 text-white' :
                      'bg-slate-400 text-white'
                    }`}>
                      <Flame className="w-3 h-3 mr-1" />
                      {aiInsight.leadHeatCategory} LEAD ({aiInsight.conversionProbability}%)
                    </span>
                  )}
                </div>

                {loadingInsight ? (
                  <div className="text-xs text-purple-600 animate-pulse py-2">Analyzing inquiry behavior and conversion probability...</div>
                ) : aiInsight ? (
                  <div className="space-y-2 text-xs">
                    <p className="text-gray-700"><span className="font-semibold text-gray-900">Intent Analysis:</span> {aiInsight.intentSummary}</p>
                    <p className="text-purple-900 bg-white/80 p-2.5 rounded-lg border border-purple-100 font-medium">
                      🎯 <span className="font-bold">Next Best Action:</span> {aiInsight.suggestedAction}
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">AI insights unavailable for this lead.</div>
                )}
              </div>

              {/* Integrated Timeline (Interactions + Dispatched Communications) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-600" />
                    Activity & Communication Timeline
                  </h4>
                  <span className="text-xs text-gray-500">
                    {(selectedLead.interactions?.length || 0) + commHistory.length} total touchpoints
                  </span>
                </div>

                <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-3 max-h-60 overflow-y-auto space-y-2.5">
                  {loadingHistory ? (
                    <div className="text-center py-4 text-xs text-gray-400">Loading timeline history...</div>
                  ) : (
                    <>
                      {/* Render WhatsApp/Email Communications */}
                      {commHistory.map(comm => (
                        <div key={comm.id} className="p-3 bg-white rounded-lg border border-emerald-100 shadow-xs flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                            <Send className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-emerald-900">{comm.channel}: {comm.templateName}</span>
                              <span className="text-gray-400">{new Date(comm.sentAt).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-gray-700 mt-1 line-clamp-2">{comm.content}</p>
                            {comm.whatsAppDeepLink && (
                              <a href={comm.whatsAppDeepLink} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-emerald-600 font-medium mt-1 hover:underline">
                                Open Chat <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Render Call/Inquiry Interactions */}
                      {selectedLead.interactions && selectedLead.interactions.map(interaction => (
                        <div 
                          key={interaction.id} 
                          className={`p-3.5 rounded-xl border shadow-xs flex items-start gap-3 transition ${
                            interaction.recordingUrl 
                              ? 'bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/30 border-blue-200' 
                              : 'bg-white border-gray-100'
                          }`}
                        >
                          <div className={`p-2 rounded-xl mt-0.5 ${
                            interaction.recordingUrl ? 'bg-blue-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {interaction.recordingUrl ? <Mic className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap justify-between items-center gap-1 text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-gray-900">{interaction.interactionType}</span>
                                {interaction.disposition && (
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-full text-[10px]">
                                    {interaction.disposition}
                                  </span>
                                )}
                                {interaction.driveStatus && (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px] flex items-center gap-1">
                                    <Cloud className="w-3 h-3" />
                                    {interaction.driveStatus}
                                  </span>
                                )}
                              </div>
                              <span className="text-gray-400 text-[11px]">{new Date(interaction.interactionDate).toLocaleString()}</span>
                            </div>
                            
                            <p className="text-xs text-gray-700 leading-relaxed">{interaction.notes}</p>

                            {/* Embedded Telephone Audio Recording Player */}
                            {interaction.recordingUrl && (
                              <div className="mt-2 bg-white/95 border border-blue-200/90 rounded-xl p-3 space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                                    Telephone Call Audio Recording
                                  </span>
                                  {interaction.recordingDurationSeconds && (
                                    <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                                      ⏱️ {Math.floor(interaction.recordingDurationSeconds / 60)}:{(interaction.recordingDurationSeconds % 60).toString().padStart(2, '0')}
                                    </span>
                                  )}
                                </div>
                                <audio controls src={interaction.recordingUrl} className="w-full h-8" />
                                {interaction.driveFolder && (
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                                    <span className="truncate max-w-[280px]">📁 {interaction.driveFolder}</span>
                                    <a
                                      href={interaction.recordingUrl}
                                      download={`call_recording_${interaction.id.substring(0, 8)}.webm`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline"
                                    >
                                      <Download className="w-3 h-3" /> Download / Drive
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {(!selectedLead.interactions || selectedLead.interactions.length === 0) && commHistory.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">No outreach logged yet. Send a WhatsApp or log a call outcome above.</p>
                      )}
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 1-Click WhatsApp Modal */}
      {isWhatsAppModalOpen && selectedLead && (
        <div className="fixed z-40 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-600/75" onClick={() => setIsWhatsAppModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-xl px-6 pt-5 pb-6 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">1-Click WhatsApp Outreach</h3>
                    <p className="text-xs text-gray-500">Recipient: {selectedLead.firstName} {selectedLead.lastName} ({selectedLead.phone})</p>
                  </div>
                </div>
                <button onClick={() => setIsWhatsAppModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select WhatsApp Message Draft</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      setSelectedTemplateId(e.target.value);
                      const tpl = templates.find(t => t.id === e.target.value);
                      if (tpl) {
                        const studentFullName = `${selectedLead.firstName} ${selectedLead.lastName}`.trim();
                        setCustomMessage(tpl.content.replace('{StudentName}', studentFullName));
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.channel})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Message Content (Personalized)</label>
                  <textarea
                    rows={5}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs font-sans focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <p className="text-xs text-amber-700">
                  WhatsApp may reject free-form messages if the recipient has not messaged your business in the last 24 hours. The API error will be shown if that happens.
                </p>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWhatsAppModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={sendingMessage}
                    onClick={handleSendWhatsApp}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                  >
                    {sendingMessage ? 'Sending...' : 'Send WhatsApp Message'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Disposition Logging Modal */}
      {isCallModalOpen && selectedLead && (
        <div className="fixed z-40 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-600/75" onClick={() => setIsCallModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-xl px-6 pt-5 pb-6 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Log Call Disposition</h3>
                    <p className="text-xs text-gray-500">{selectedLead.firstName} {selectedLead.lastName}</p>
                  </div>
                </div>
                <button onClick={() => setIsCallModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleLogInteraction} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Interaction Channel</label>
                    <select
                      value={callType}
                      onChange={(e) => setCallType(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Phone Call">Phone Call</option>
                      <option value="Campus Visit">Campus Visit</option>
                      <option value="Video Counseling">Video Counseling</option>
                      <option value="WhatsApp Followup">WhatsApp Followup</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Call Outcome / Disposition</label>
                    <select
                      value={callDisposition}
                      onChange={(e) => setCallDisposition(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Interested - Qualified">Connected: Interested (Qualify Lead)</option>
                      <option value="Callback Scheduled">Connected: Callback Scheduled</option>
                      <option value="Busy / No Answer">Unreachable: Busy / No Answer</option>
                      <option value="Invalid Number">Unreachable: Invalid Number</option>
                      <option value="Not Interested">Not Interested / Lost</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Counselor Call Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Candidate discussed scholarship requirements, parents visiting Friday..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCallModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                  >
                    Save Call Disposition
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AI Outreach Drafter Modal */}
      {isAiDraftModalOpen && selectedLead && (
        <div className="fixed z-40 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-600/75" onClick={() => setIsAiDraftModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-2xl px-6 pt-5 pb-6 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">AI Counselor Outreach Drafter</h3>
                    <p className="text-xs text-gray-500">Tailored message generator for {selectedLead.firstName} ({selectedLead.gradeInterested})</p>
                  </div>
                </div>
                <button onClick={() => setIsAiDraftModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target Objective</label>
                    <select
                      value={draftObjective}
                      onChange={(e) => setDraftObjective(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                    >
                      <option value="CampusTour">Campus Tour Invitation</option>
                      <option value="Scholarship">Merit Scholarship Grant</option>
                      <option value="FeeReminder">Offer Approval & Fee Payment Link</option>
                      <option value="FollowUp">General Admission Follow-Up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Specific Candidate Note / Objection</label>
                    <input
                      type="text"
                      placeholder="e.g. Inquired about robotics, hostel..."
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAIDraft}
                  disabled={generatingDraft}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  {generatingDraft ? 'Generating AI Contextual Draft...' : 'Regenerate Draft with AI'}
                </button>

                {aiDraft && (
                  <div className="mt-4 p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3">
                    <div>
                      <span className="font-bold text-purple-950 block mb-1">Email Subject:</span>
                      <input
                        type="text"
                        readOnly
                        value={aiDraft.subject}
                        className="w-full bg-white border border-purple-200 rounded p-2 text-xs font-medium text-gray-900"
                      />
                    </div>
                    <div>
                      <span className="font-bold text-purple-950 block mb-1">Email Body:</span>
                      <textarea
                        rows={6}
                        readOnly
                        value={aiDraft.body}
                        className="w-full bg-white border border-purple-200 rounded p-2 text-xs text-gray-800 font-sans"
                      />
                    </div>
                    <div>
                      <span className="font-bold text-emerald-950 block mb-1">WhatsApp Quick Text:</span>
                      <p className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-900 text-xs">{aiDraft.whatsAppShortText}</p>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`Subject: ${aiDraft.subject}\n\n${aiDraft.body}`);
                          alert('Email copied to clipboard!');
                        }}
                        className="px-3 py-1.5 bg-white border border-purple-300 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-50"
                      >
                        Copy Email
                      </button>
                      <button
                        onClick={() => {
                          setCustomMessage(aiDraft.whatsAppShortText);
                          setIsAiDraftModalOpen(false);
                          setIsWhatsAppModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                      >
                        Send via WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {isNewLeadModalOpen && (
        <div className="fixed z-30 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => setIsNewLeadModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-2xl px-6 pt-5 pb-6 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Enquiry</h3>
              <form onSubmit={handleCreateLead} className="space-y-4 text-xs">
                {/* School / Institution Selection (Displayed in Global View) */}
                {(!localStorage.getItem('selectedInstitutionId') || localStorage.getItem('selectedInstitutionId') === 'all') && institutionsList.length > 0 && (
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Target School / Institution *</label>
                    <select
                      value={newLeadInstitutionId}
                      onChange={e => {
                        setNewLeadInstitutionId(e.target.value);
                        setAssignedToId('');
                        setCoCounselorId('');
                      }}
                      className="p-2 w-full border border-purple-300 bg-purple-50/50 rounded-lg text-xs font-semibold text-purple-900 focus:ring-2 focus:ring-purple-500"
                    >
                      {institutionsList.map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">First Name</label>
                    <input type="text" required className="p-2 w-full border border-gray-300 rounded-lg" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Last Name</label>
                    <input type="text" required className="p-2 w-full border border-gray-300 rounded-lg" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Email</label>
                  <input type="email" required className="p-2 w-full border border-gray-300 rounded-lg" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Phone</label>
                  <input type="text" required className="p-2 w-full border border-gray-300 rounded-lg" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Grade / Program Interested</label>
                  <input type="text" required placeholder="e.g. Grade 11 - Science, Grade 1, Nursery" className="p-2 w-full border border-gray-300 rounded-lg" value={gradeInterested} onChange={e => setGradeInterested(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Lead Source</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Website / Direct, Walk-in, QR Campaign" 
                      className="p-2 w-full border border-gray-300 rounded-lg text-xs" 
                      value={newLeadSource} 
                      onChange={e => setNewLeadSource(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Campaign (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Prestige Ozone Society Banner & Booth" 
                      className="p-2 w-full border border-gray-300 rounded-lg text-xs" 
                      value={newLeadCampaign} 
                      onChange={e => setNewLeadCampaign(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Compatibility Attributes */}
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Compatibility Attributes (Auto-Routing)
                    </span>
                    <span className="text-[10px] text-purple-700 font-semibold bg-white/80 px-2 py-0.5 rounded-full border border-purple-200">
                      Multi-Skill Matching
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Language</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Punjabi, Bengali, Hindi" 
                        className="p-2 w-full bg-white border border-gray-200 rounded-lg text-xs" 
                        value={preferredLanguage} 
                        onChange={e => setPreferredLanguage(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Region / Zone</label>
                      <input 
                        type="text" 
                        placeholder="e.g. North Delhi, South Delhi, Noida" 
                        className="p-2 w-full bg-white border border-gray-200 rounded-lg text-xs" 
                        value={region} 
                        onChange={e => setRegion(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Religion / Community</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Sikh, Hindu, Muslim, Christian" 
                        className="p-2 w-full bg-white border border-gray-200 rounded-lg text-xs" 
                        value={religion} 
                        onChange={e => setReligion(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-purple-200/50">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Assign Primary Counselor</label>
                      <select
                        value={assignedToId}
                        onChange={e => setAssignedToId(e.target.value)}
                        className="p-2 w-full bg-white border border-gray-200 rounded-lg text-xs"
                      >
                        <option value="">Auto-Assign with AI (Recommended)</option>
                        {getCounselorsForLead(null, newLeadInstitutionId).map(p => (
                          <option key={p.userId} value={p.userId}>
                            {p.counselorName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Assign Co-Counselor</label>
                      <select
                        value={coCounselorId}
                        onChange={e => setCoCounselorId(e.target.value)}
                        className="p-2 w-full bg-white border border-gray-200 rounded-lg text-xs"
                      >
                        <option value="">Auto-Assign with AI / None</option>
                        {getCounselorsForLead(null, newLeadInstitutionId)
                          .filter(p => p.userId !== assignedToId)
                          .map(p => (
                            <option key={p.userId} value={p.userId}>
                              {p.counselorName}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <p className="text-[10px] text-purple-800">
                    ✨ Our AI intelligence engine will evaluate candidate parameters and automatically calculate multi-factor compatibility scores for counselor and co-counselor assignment upon save.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsNewLeadModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Save & Auto-Route Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Telephone Call Recorder with Drive Storage Modal */}
      {isRecordModalOpen && selectedLead && (
        <CallRecorderModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          lead={selectedLead}
          onSuccess={() => {
            fetchLeadsAndActivities();
            if (selectedLead.id) {
              api.get<Enquiry>(`/api/leads/${selectedLead.id}`).then(res => {
                setSelectedLead(res.data);
              }).catch(() => {});
            }
          }}
        />
      )}

      {/* Manual Counselor & Co-Counselor Assignment Modal */}
      {isAssignCounselorModalOpen && assignModalLead && (() => {
        const leadCounselors = getCounselorsForLead(assignModalLead);
        const filteredAiCandidates = aiMatchCandidates.filter(c => leadCounselors.some(lc => lc.userId === c.userId));

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="assign-modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div 
                className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity" 
                onClick={() => setIsAssignCounselorModalOpen(false)}
              ></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-100">
                {/* Modal Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 text-white flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-purple-200">
                      <UserPlus className="w-6 h-6 text-purple-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Assign / Edit Counselors
                      </h3>
                      <p className="text-xs text-purple-200 mt-0.5">
                        Designate Primary Counselor, Co-Counselor, or apply AI-guided synergy pairing.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAssignCounselorModalOpen(false)}
                    className="text-purple-200 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSaveCounselorAssignment}>
                  <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    {/* Lead Summary Header Card */}
                    <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50/60 to-blue-50/60 rounded-xl border border-purple-100/80 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                          {(assignModalLead.firstName || '?')[0]}{(assignModalLead.lastName || '')[0] || ''}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">
                              {assignModalLead.firstName} {assignModalLead.lastName}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                              {assignModalLead.gradeInterested}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {assignModalLead.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5 flex-wrap">
                            <span>{assignModalLead.email}</span>
                            <span>•</span>
                            <span>{assignModalLead.phone}</span>
                            {assignModalLead.preferredLanguage && (
                              <>
                                <span>•</span>
                                <span className="text-purple-700 font-medium">Lang: {assignModalLead.preferredLanguage}</span>
                              </>
                            )}
                            {assignModalLead.region && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-700 font-medium">Region: {assignModalLead.region}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Primary Counselor Selector */}
                    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-purple-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-4 h-4 text-purple-600" />
                          Primary Counselor (Lead Owner)
                        </label>
                        {loggedInUser.id && leadCounselors.some(p => p.userId === loggedInUser.id) && (
                          <button
                            type="button"
                            onClick={() => setModalPrimaryCounselorId(loggedInUser.id)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition"
                          >
                            Assign to Myself
                          </button>
                        )}
                      </div>
                      <select
                        value={modalPrimaryCounselorId}
                        onChange={(e) => setModalPrimaryCounselorId(e.target.value)}
                        className="w-full text-xs p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 font-medium text-gray-900"
                      >
                        <option value="">-- Unassigned (No Primary Counselor) --</option>
                        {leadCounselors.map(p => (
                          <option key={p.userId} value={p.userId}>
                            {p.counselorName} • {p.currentActiveLeads}/{p.maxActiveLeads} active leads {p.userId === loggedInUser.id ? ' (You)' : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-gray-500 mt-1.5">
                        Main point of contact responsible for consultation calls, parent engagement, and pipeline progression.
                      </p>
                    </div>

                    {/* Co-Counselor Selector */}
                    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-teal-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-teal-600" />
                          Co-Counselor (Dual-Coverage Partner)
                        </label>
                        <div className="flex items-center gap-1.5">
                          {filteredAiCandidates.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const recommended = filteredAiCandidates.find(c => c.userId !== modalPrimaryCounselorId);
                                if (recommended) {
                                  setModalCoCounselorId(recommended.userId);
                                  setModalCoCounselorReason(recommended.coCounselorSynergy || `AI synergy match: ${recommended.counselorName} (${recommended.totalScore}% match)`);
                                }
                              }}
                              className="text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 transition flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3 text-teal-600" />
                              Auto-Pick Best Match
                            </button>
                          )}
                          {modalCoCounselorId && (
                            <button
                              type="button"
                              onClick={() => {
                                setModalCoCounselorId('');
                                setModalCoCounselorReason('');
                              }}
                              className="text-[11px] font-medium text-gray-500 hover:text-rose-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 transition"
                            >
                              Clear Co-Counselor
                            </button>
                          )}
                        </div>
                      </div>
                      <select
                        value={modalCoCounselorId}
                        onChange={(e) => {
                          setModalCoCounselorId(e.target.value);
                          if (!e.target.value) setModalCoCounselorReason('');
                        }}
                        className="w-full text-xs p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 font-medium text-gray-900"
                      >
                        <option value="">-- None (Single Counselor Model) --</option>
                        {leadCounselors
                          .filter(p => p.userId !== modalPrimaryCounselorId)
                          .map(p => (
                            <option key={p.userId} value={p.userId}>
                              {p.counselorName} • {p.currentActiveLeads}/{p.maxActiveLeads} active leads {p.userId === loggedInUser.id ? ' (You)' : ''}
                            </option>
                          ))}
                      </select>
                      <p className="text-[11px] text-gray-500 mt-1.5">
                        Collaborates with the primary counselor, covers absence periods, and provides specialized grade or regional language assistance.
                      </p>
                    </div>

                    {/* Notes & Synergy Reasons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Primary Assignment Notes (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Assigned by Admissions Head for VIP visit"
                          value={modalAssignmentNotes}
                          onChange={(e) => setModalAssignmentNotes(e.target.value)}
                          className="w-full text-xs p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-teal-800 uppercase tracking-wider mb-1">
                          Co-Counselor Synergy Rationale (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Bilingual Hindi assistance & senior grade specialist"
                          value={modalCoCounselorReason}
                          onChange={(e) => setModalCoCounselorReason(e.target.value)}
                          className="w-full text-xs p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    {/* Interactive AI Match Advisor */}
                    <div className="p-3.5 bg-gradient-to-r from-purple-50/70 via-indigo-50/60 to-blue-50/60 rounded-xl border border-indigo-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                            AI Compatibility Advisor
                          </span>
                        </div>
                        <span className="text-[11px] text-purple-700">
                          {loadingAiCandidates ? 'Calculating live scores...' : `${filteredAiCandidates.length} eligible candidates`}
                        </span>
                      </div>

                      {loadingAiCandidates ? (
                        <div className="py-3 flex items-center justify-center text-xs text-purple-700 gap-2">
                          <Sparkles className="w-4 h-4 animate-spin text-purple-600" />
                          Analyzing candidate criteria with counselor skill profiles...
                        </div>
                      ) : filteredAiCandidates.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {filteredAiCandidates.slice(0, 4).map((c) => (
                            <div 
                              key={c.userId} 
                              className="p-2 bg-white rounded-lg border border-purple-100 flex items-center justify-between text-xs hover:border-purple-300 transition"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">{c.counselorName}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {c.totalScore}% Match
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  ({c.activeLeads}/{c.dailyCapacity} active)
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setModalPrimaryCounselorId(c.userId)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                    modalPrimaryCounselorId === c.userId
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                                  }`}
                                >
                                  {modalPrimaryCounselorId === c.userId ? '✓ Primary' : 'Set Primary'}
                                </button>
                                <button
                                  type="button"
                                  disabled={modalPrimaryCounselorId === c.userId}
                                  onClick={() => {
                                    setModalCoCounselorId(c.userId);
                                    setModalCoCounselorReason(c.coCounselorSynergy || `AI synergy candidate (${c.totalScore}% match)`);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                    modalCoCounselorId === c.userId
                                      ? 'bg-teal-600 text-white'
                                      : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 disabled:opacity-40'
                                  }`}
                                >
                                  {modalCoCounselorId === c.userId ? '✓ Co' : 'Set Co'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic py-1">
                          No specific AI match recommendations found for this lead's criteria.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setModalPrimaryCounselorId('');
                        setModalCoCounselorId('');
                        setModalAssignmentNotes('');
                        setModalCoCounselorReason('');
                      }}
                      className="text-xs font-semibold text-gray-500 hover:text-rose-600 transition"
                    >
                      Clear All Assignments
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAssignCounselorModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-white transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingAssignment}
                        className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        {savingAssignment ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            Saving Team...
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Save Assignment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Assignment Success Toast */}
      {assignmentSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-gray-700 animate-slide-up">
          <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">{assignmentSuccessToast}</span>
          <button
            onClick={() => setAssignmentSuccessToast(null)}
            className="text-gray-400 hover:text-white p-1 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
