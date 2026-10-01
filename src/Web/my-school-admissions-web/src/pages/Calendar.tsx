import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Phone, MapPin, Users, CheckCircle2, 
  AlertCircle, Plus, Search, ChevronLeft, ChevronRight, X, 
  Download, MessageSquare, ExternalLink, CalendarDays, ListFilter,
  Check, Award, UserCheck, RefreshCw, Trash2
} from 'lucide-react';
import api from '../lib/api';
import BookTourModal from '../components/calendar/BookTourModal';

interface Activity {
  id: string;
  enquiryId: string;
  studentName: string;
  parentEmail: string;
  parentPhone: string;
  gradeInterested: string;
  title: string;
  activityType: 'Call' | 'CampusTour' | 'Meeting' | 'Assessment' | 'Task';
  priority: 'High' | 'Normal' | 'Low';
  description: string;
  location: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  disposition: string;
  outcomeNotes: string;
  completedAt?: string;
  assignedToUserId?: string;
  assignedToName: string;
  institutionId?: string;
  campusId?: string;
  createdAt: string;
}

interface LeadOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gradeInterested: string;
  status: string;
  institutionId?: string;
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roles: string[];
  institutionId?: string;
}

interface TourInstitutionOption {
  id: string;
  name: string;
  campuses: { id: string; name: string }[];
}

interface TourAvailabilitySlotItem {
  id: string;
  institutionId: string;
  campusId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
  bookedCount: number;
  assignedRepresentativeId?: string;
  assignedRepresentativeName?: string;
  assignedRepresentativeEmail?: string;
  assignedRepresentativePhone?: string;
}

interface ActivityMetrics {
  todayCount: number;
  overdueCount: number;
  upcomingCount: number;
  campusToursCount: number;
  completedThisWeekCount: number;
}

type ViewMode = 'month' | 'week' | 'day' | 'list';
type ListTab = 'today' | 'overdue' | 'upcoming' | 'completed';

// Formats "2026-09-28T09:30:00Z", "2026-09-28T09:30:00", or "09:30" as "09:30 AM" without UTC-to-local timezone shift
export const formatSlotTime = (timeOrIsoStr: string): string => {
  if (!timeOrIsoStr) return '';
  if (timeOrIsoStr.includes('AM') || timeOrIsoStr.includes('PM')) return timeOrIsoStr;
  const match = timeOrIsoStr.match(/T?(\d{2}):(\d{2})/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const formattedHours = String(hours).padStart(2, '0');
    return `${formattedHours}:${minutes} ${ampm}`;
  }
  return timeOrIsoStr;
};

// Formats "2026-09-28" or "2026-09-28T00:00:00.000Z" as "Mon, Sep 28, 2026" without timezone shifting
export const formatSlotDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const datePart = dateStr.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const localDate = new Date(y, m - 1, d);
  return localDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Formats activity time: for CampusTour (wall-clock) uses formatSlotTime; for other activities uses toLocaleTimeString
export const formatActivityTime = (isoStr: string, activityType?: string): string => {
  if (!isoStr) return '';
  if (activityType === 'CampusTour') {
    return formatSlotTime(isoStr);
  }
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function Calendar() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ActivityMetrics>({
    todayCount: 0,
    overdueCount: 0,
    upcomingCount: 0,
    campusToursCount: 0,
    completedThisWeekCount: 0,
  });

  // Filters & State
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedCounselor, setSelectedCounselor] = useState<string>('all');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [listTab, setListTab] = useState<ListTab>('today');

  // Metadata dropdown options
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Modals & Drawers
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isBookTourModalOpen, setIsBookTourModalOpen] = useState(false);
  const [isTourSlotPanelOpen, setIsTourSlotPanelOpen] = useState(false);
  const [tourInstitutions, setTourInstitutions] = useState<TourInstitutionOption[]>([]);
  const [tourCampusId, setTourCampusId] = useState('');
  const [tourSlotDate, setTourSlotDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [tourSlotStart, setTourSlotStart] = useState('09:30');
  const [tourSlotEnd, setTourSlotEnd] = useState('10:15');
  const [tourSlotCapacity, setTourSlotCapacity] = useState(3);
  const [tourRepresentativeId, setTourRepresentativeId] = useState('');
  const [busyUserIds, setBusyUserIds] = useState<string[]>([]);
  const [loadingBusyUsers, setLoadingBusyUsers] = useState(false);
  const [publishedTourSlots, setPublishedTourSlots] = useState<TourAvailabilitySlotItem[]>([]);
  const [loadingPublishedSlots, setLoadingPublishedSlots] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isSubmittingPublish, setIsSubmittingPublish] = useState(false);
  const [publishSuccessBanner, setPublishSuccessBanner] = useState<string | null>(null);
  const [slotToDelete, setSlotToDelete] = useState<TourAvailabilitySlotItem | null>(null);
  const [isDeletingSlot, setIsDeletingSlot] = useState(false);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activeDrawerActivity, setActiveDrawerActivity] = useState<Activity | null>(null);

  // Form states for Schedule Modal
  const [formEnquiryId, setFormEnquiryId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<'Call' | 'CampusTour' | 'Meeting' | 'Assessment' | 'Task'>('CampusTour');
  const [formPriority, setFormPriority] = useState<'High' | 'Normal' | 'Low'>('Normal');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState('11:00');
  const [formDurationMinutes, setFormDurationMinutes] = useState(60);
  const [formLocation, setFormLocation] = useState('Sector 23 Campus - Main Reception');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Restrict selectable counselors strictly to the institution to which the selected student/lead belongs
  const counselorsForScheduleActivity = useMemo(() => {
    const disId = 'fc49d553-b44f-4c4c-96ad-4bf599016c01';
    if (!formEnquiryId) {
      const stored = localStorage.getItem('selectedInstitutionId');
      if (!stored || stored === 'all') return users;
      return users.filter(u => {
        const uInst = (u.institutionId || '').toLowerCase();
        return stored.toLowerCase() === disId.toLowerCase()
          ? (!uInst || uInst === disId.toLowerCase())
          : (uInst === stored.toLowerCase());
      });
    }

    const lead = leads.find(l => l.id === formEnquiryId);
    const targetInstId = (lead?.institutionId || (lead as any)?.InstitutionId) || disId;
    return users.filter(u => {
      const uInst = (u.institutionId || '').toLowerCase();
      return targetInstId.toLowerCase() === disId.toLowerCase()
        ? (!uInst || uInst === disId.toLowerCase())
        : (uInst === targetInstId.toLowerCase());
    });
  }, [formEnquiryId, leads, users]);

  useEffect(() => {
    if (formAssignedTo && !counselorsForScheduleActivity.some(u => u.id === formAssignedTo)) {
      setFormAssignedTo('');
    }
  }, [counselorsForScheduleActivity, formAssignedTo]);

  // Outcome modal form
  const [outcomeDisposition, setOutcomeDisposition] = useState('Interested - Qualified');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [updateLeadStatus, setUpdateLeadStatus] = useState(true);
  const [nextLeadStatus, setNextLeadStatus] = useState('Qualified');
  const [scheduleNextFollowUp, setScheduleNextFollowUp] = useState(false);
  const [nextFollowUpDate, setNextFollowUpDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [nextFollowUpTime, setNextFollowUpTime] = useState('14:00');
  const [nextFollowUpType, setNextFollowUpType] = useState<'Call' | 'CampusTour' | 'Meeting' | 'Assessment' | 'Task'>('Call');

  // Reschedule form
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('Parent requested updated time slot');

  // Fetch initial data
  useEffect(() => {
    fetchActivities();
    fetchMetrics();
    fetchMetadata();
    fetchPublishedSlots();

    const handleTenant = () => {
      fetchActivities();
      fetchMetrics();
      fetchMetadata();
      fetchPublishedSlots();
    };
    window.addEventListener('tenantChanged', handleTenant);
    return () => window.removeEventListener('tenantChanged', handleTenant);
  }, [selectedCounselor, selectedCampus, selectedType, selectedStatus]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params: any = {};
      const instId = localStorage.getItem('selectedInstitutionId') || 'all';
      if (instId && instId !== 'all') params.institutionId = instId;
      if (selectedCounselor !== 'all') params.counselorId = selectedCounselor;
      if (selectedCampus !== 'all') params.campusId = selectedCampus;
      if (selectedType !== 'all') params.activityType = selectedType;
      if (selectedStatus !== 'all') params.status = selectedStatus;

      const res = await api.get('/api/leads/activities', { params });
      setActivities(res.data);
    } catch (err) {
      console.error('Failed to fetch activities', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const params: any = {};
      const instId = localStorage.getItem('selectedInstitutionId') || 'all';
      if (instId && instId !== 'all') params.institutionId = instId;
      if (selectedCounselor !== 'all') params.counselorId = selectedCounselor;
      const res = await api.get('/api/leads/activities/metrics', { params });
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to fetch metrics', err);
    }
  };

  const fetchMetadata = async () => {
    try {
      const instId = localStorage.getItem('selectedInstitutionId') || 'all';
      const instQuery = instId && instId !== 'all' ? `?institutionId=${instId}` : '';
      const userParams = instId && instId !== 'all' ? { params: { institutionId: instId } } : undefined;
      const [leadsRes, usersRes, counselorsRes, institutionsRes] = await Promise.all([
        api.get(`/api/leads${instQuery}`).catch(() => ({ data: [] })),
        api.get('/api/users', userParams).catch(() => ({ data: [] })),
        api.get(`/api/leads/counselors/profiles${instQuery}`).catch(() => ({ data: [] })),
        api.get<TourInstitutionOption[]>('/api/institutions').catch(() => ({ data: [] }))
      ]);

      setLeads(leadsRes.data || []);

      const userMap = new Map<string, UserOption>();
      const disId = 'fc49d553-b44f-4c4c-96ad-4bf599016c01';
      const matchesTenant = (inst?: string) => {
        if (!instId || instId === 'all') return true;
        const normalized = (inst || '').toLowerCase();
        if (instId.toLowerCase() === disId) {
          return !normalized || normalized === disId;
        }
        return normalized === instId.toLowerCase();
      };

      (usersRes.data || []).forEach((u: any) => {
        const userInstitutionId = (u.institutionId || u.InstitutionId || '').toString();
        if (u.id && matchesTenant(userInstitutionId)) {
          userMap.set(u.id.toLowerCase(), {
            id: u.id,
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            email: u.email || '',
            phone: u.phoneNumber || u.phone || u.mobile || '',
            roles: u.roles || [],
            institutionId: userInstitutionId
          });
        }
      });

      (counselorsRes.data || []).forEach((c: any) => {
        const cId = (c.userId || c.id || '').toString();
        const counselorInstitutionId = (c.institutionId || c.InstitutionId || '').toString();
        if (cId && matchesTenant(counselorInstitutionId) && !userMap.has(cId.toLowerCase())) {
          const names = (c.counselorName || 'Counselor').trim().split(' ');
          userMap.set(cId.toLowerCase(), {
            id: cId,
            firstName: names[0] || 'Counselor',
            lastName: names.slice(1).join(' ') || '',
            email: c.email || '',
            phone: c.phone || c.phoneNumber || '',
            roles: ['Counselor'],
            institutionId: counselorInstitutionId
          });
        }
      });

      setUsers(Array.from(userMap.values()));
      setTourInstitutions(institutionsRes.data || []);
      const selectedInstitution = (institutionsRes.data || []).find(i => i.id === (localStorage.getItem('selectedInstitutionId') || '')) || institutionsRes.data?.[0];
      if (selectedInstitution && !tourCampusId) setTourCampusId(selectedInstitution.campuses[0]?.id || '');
    } catch (err) {
      console.error('Failed to fetch metadata', err);
    }
  };

  const fetchPublishedSlots = async () => {
    try {
      setLoadingPublishedSlots(true);
      const params: any = {};
      const instId = localStorage.getItem('selectedInstitutionId') || 'all';
      if (instId && instId !== 'all') params.institutionId = instId;
      const res = await api.get<TourAvailabilitySlotItem[]>('/api/leads/activities/tour-slots', { params });
      setPublishedTourSlots(res.data || []);
    } catch (err) {
      console.error('Failed to fetch published tour slots', err);
    } finally {
      setLoadingPublishedSlots(false);
    }
  };

  const fetchBusyUsers = async (date: string, start: string, end: string, campusId?: string) => {
    if (!date || !start || !end || end <= start) return;
    try {
      setLoadingBusyUsers(true);
      const startIso = `${date}T${start}:00.000Z`;
      const endIso = `${date}T${end}:00.000Z`;
      const params: any = {
        startTime: startIso,
        endTime: endIso
      };
      if (campusId) params.campusId = campusId;
      const res = await api.get<string[]>('/api/leads/activities/tour-slots/busy-user-ids', { params });
      setBusyUserIds(res.data || []);
    } catch (err) {
      console.error('Failed to fetch busy user IDs', err);
    } finally {
      setLoadingBusyUsers(false);
    }
  };

  useEffect(() => {
    if (isTourSlotPanelOpen && tourSlotDate && tourSlotStart && tourSlotEnd) {
      fetchBusyUsers(tourSlotDate, tourSlotStart, tourSlotEnd, tourCampusId);
    }
  }, [isTourSlotPanelOpen, tourSlotDate, tourSlotStart, tourSlotEnd, tourCampusId]);

  const availableUsers = useMemo(() => {
    if (!tourSlotDate || !tourSlotStart || !tourSlotEnd) return users;
    const slotStartEpoch = new Date(`${tourSlotDate}T${tourSlotStart}:00.000Z`).getTime();
    const slotEndEpoch = new Date(`${tourSlotDate}T${tourSlotEnd}:00.000Z`).getTime();

    const busySet = new Set<string>(busyUserIds.map(id => id.toLowerCase()));

    // Memory activities
    activities.forEach(act => {
      if (act.assignedToUserId && act.status !== 'Cancelled') {
        const actStart = new Date(act.scheduledStartTime).getTime();
        const actEnd = new Date(act.scheduledEndTime).getTime();
        if (actStart < slotEndEpoch && actEnd > slotStartEpoch) {
          busySet.add(act.assignedToUserId.toLowerCase());
        }
      }
    });

    // Published slots
    publishedTourSlots.forEach(s => {
      if (s.assignedRepresentativeId && s.isActive) {
        const sStart = new Date(s.startTime).getTime();
        const sEnd = new Date(s.endTime).getTime();
        if (sStart < slotEndEpoch && sEnd > slotStartEpoch) {
          busySet.add(s.assignedRepresentativeId.toLowerCase());
        }
      }
    });

    return users.filter(u => !busySet.has(u.id.toLowerCase()));
  }, [users, busyUserIds, activities, publishedTourSlots, tourSlotDate, tourSlotStart, tourSlotEnd]);

  useEffect(() => {
    if (tourRepresentativeId && !availableUsers.some(u => u.id === tourRepresentativeId)) {
      setTourRepresentativeId('');
    }
  }, [availableUsers, tourRepresentativeId]);

  const isSameCalendarDay = (slotDateStr: string, calendarDate: Date) => {
    if (!slotDateStr) return false;
    const datePart = slotDateStr.split('T')[0];
    const [y, m, d] = datePart.split('-').map(Number);
    if (!y || !m || !d) return false;
    return (
      calendarDate.getFullYear() === y &&
      calendarDate.getMonth() === m - 1 &&
      calendarDate.getDate() === d
    );
  };

  const isActivityOnDate = (timeStr: string, calendarDate: Date, _activityType?: string) => {
    if (!timeStr) return false;
    const datePart = timeStr.split('T')[0];
    const [y, m, d] = datePart.split('-').map(Number);
    if (calendarDate.getFullYear() === y && calendarDate.getMonth() === m - 1 && calendarDate.getDate() === d) {
      return true;
    }
    const localD = new Date(timeStr);
    return (
      calendarDate.getFullYear() === localD.getFullYear() &&
      calendarDate.getMonth() === localD.getMonth() &&
      calendarDate.getDate() === localD.getDate()
    );
  };

  const handleInitiatePublish = () => {
    const institutionId = localStorage.getItem('selectedInstitutionId');
    if (!institutionId || institutionId === 'all') {
      alert('Select an institute from the top navigation before opening a tour slot.');
      return;
    }
    if (!tourCampusId) {
      alert('Select a campus before opening a tour slot.');
      return;
    }
    if (!tourSlotDate) {
      alert('Select a date for the tour slot.');
      return;
    }
    if (!tourSlotStart || !tourSlotEnd) {
      alert('Provide both start time and end time.');
      return;
    }
    if (tourSlotEnd <= tourSlotStart) {
      alert('End time must be later than start time.');
      return;
    }
    if (tourSlotCapacity < 1) {
      alert('Capacity must be at least 1 seat.');
      return;
    }
    if (!tourRepresentativeId) {
      if (availableUsers.length === 0) {
        alert('There are no staff or counselors free at this slot time. Please pick another time or date.');
      } else {
        alert('Please assign an available representative for this tour slot from the dropdown.');
      }
      return;
    }

    setIsPublishConfirmOpen(true);
  };

  const handleConfirmPublish = async () => {
    const institutionId = localStorage.getItem('selectedInstitutionId');
    if (!institutionId || institutionId === 'all' || !tourCampusId) {
      alert('Select an institute and campus before opening a tour slot.');
      return;
    }
    const selectedRep = users.find(u => u.id === tourRepresentativeId);
    try {
      setIsSubmittingPublish(true);
      await api.post('/api/leads/activities/tour-slots', {
        institutionId,
        campusId: tourCampusId,
        slotDate: `${tourSlotDate}T00:00:00.000Z`,
        startTime: `${tourSlotDate}T${tourSlotStart}:00.000Z`,
        endTime: `${tourSlotDate}T${tourSlotEnd}:00.000Z`,
        capacity: tourSlotCapacity,
        assignedRepresentativeId: selectedRep ? selectedRep.id : undefined,
        assignedRepresentativeName: selectedRep ? `${selectedRep.firstName} ${selectedRep.lastName}`.trim() : undefined,
        assignedRepresentativeEmail: selectedRep?.email,
        assignedRepresentativePhone: selectedRep?.phone
      });
      setIsPublishConfirmOpen(false);

      const targetCampus = tourInstitutions
        .flatMap(i => i.campuses)
        .find(c => c.id === tourCampusId)?.name || 'Campus';
      const formattedDate = formatSlotDate(tourSlotDate);
      const repLabel = selectedRep ? ` • Assigned Rep: ${selectedRep.firstName} ${selectedRep.lastName}` : '';

      setPublishSuccessBanner(
        `Published (${tourSlotCapacity} ${tourSlotCapacity === 1 ? 'seat' : 'seats'})${repLabel} for ${targetCampus} on ${formattedDate} (${formatSlotTime(tourSlotStart)} - ${formatSlotTime(tourSlotEnd)}). Representative has been notified by Email & WhatsApp.`
      );
      setTimeout(() => setPublishSuccessBanner(null), 8000);

      await fetchPublishedSlots();
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Unable to open tour slot.');
    } finally {
      setIsSubmittingPublish(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!slotToDelete) return;
    try {
      setIsDeletingSlot(true);
      await api.delete(`/api/leads/activities/tour-slots/${slotToDelete.id}`);
      setSlotToDelete(null);
      await fetchPublishedSlots();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to unpublish tour slot.');
    } finally {
      setIsDeletingSlot(false);
    }
  };

  // Filtered activities based on search
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const query = searchQuery.toLowerCase();
    return activities.filter(a => 
      a.title.toLowerCase().includes(query) ||
      a.studentName.toLowerCase().includes(query) ||
      a.parentPhone.includes(query) ||
      a.location.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query)
    );
  }, [activities, searchQuery]);

  // Date Navigation handlers
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Schedule Activity Submit
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEnquiryId) {
      alert('Please select a student lead.');
      return;
    }

    try {
      const startDateTime = new Date(`${formDate}T${formStartTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + formDurationMinutes * 60000);

      const assignedUser = users.find(u => u.id === formAssignedTo);

      let scheduledStartIso = startDateTime.toISOString();
      let scheduledEndIso = endDateTime.toISOString();
      if (formType === 'CampusTour') {
        scheduledStartIso = `${formDate}T${formStartTime}:00.000Z`;
        const startParts = formStartTime.split(':').map(Number);
        const totalMinutes = (startParts[0] || 0) * 60 + (startParts[1] || 0) + formDurationMinutes;
        const endH = Math.floor(totalMinutes / 60);
        const endM = totalMinutes % 60;
        scheduledEndIso = `${formDate}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00.000Z`;
      }

      await api.post('/api/leads/activities', {
        enquiryId: formEnquiryId,
        title: formTitle,
        activityType: formType,
        priority: formPriority,
        description: formDescription,
        location: formLocation,
        scheduledStartTime: scheduledStartIso,
        scheduledEndTime: scheduledEndIso,
        assignedToUserId: formAssignedTo || null,
        assignedToName: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : ''
      });

      setIsScheduleModalOpen(false);
      resetScheduleForm();
      fetchActivities();
      fetchMetrics();
    } catch (err: any) {
      alert('Failed to schedule activity: ' + (err.response?.data?.message || err.message));
    }
  };

  const resetScheduleForm = () => {
    setFormEnquiryId('');
    setFormTitle('');
    setFormType('CampusTour');
    setFormPriority('Normal');
    setFormLocation('Sector 23 Campus - Main Reception');
    setFormDescription('');
  };

  // Complete / Log Outcome Submit
  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;

    try {
      let nextActivityPayload: any = null;
      if (scheduleNextFollowUp) {
        const nextStart = new Date(`${nextFollowUpDate}T${nextFollowUpTime}:00`);
        const nextEnd = new Date(nextStart.getTime() + 30 * 60000);
        nextActivityPayload = {
          enquiryId: selectedActivity.enquiryId,
          title: `Follow-up ${nextFollowUpType} with ${selectedActivity.studentName}`,
          activityType: nextFollowUpType,
          priority: 'Normal',
          description: `Scheduled after: ${outcomeDisposition}`,
          location: nextFollowUpType === 'CampusTour' ? 'Campus Reception' : 'Phone Call',
          scheduledStartTime: nextStart.toISOString(),
          scheduledEndTime: nextEnd.toISOString()
        };
      }

      await api.post(`/api/leads/activities/${selectedActivity.id}/complete`, {
        disposition: outcomeDisposition,
        outcomeNotes: outcomeNotes,
        updateLeadStatus: updateLeadStatus,
        nextLeadStatus: nextLeadStatus,
        nextActivity: nextActivityPayload
      });

      setIsOutcomeModalOpen(false);
      setSelectedActivity(null);
      fetchActivities();
      fetchMetrics();
    } catch (err: any) {
      alert('Failed to complete activity: ' + (err.response?.data?.message || err.message));
    }
  };

  // Reschedule Submit
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity || !rescheduleDate || !rescheduleTime) return;

    try {
      const newStart = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      const newEnd = new Date(newStart.getTime() + 45 * 60000);

      await api.post(`/api/leads/activities/${selectedActivity.id}/reschedule`, {
        newStartTime: newStart.toISOString(),
        newEndTime: newEnd.toISOString(),
        reason: rescheduleReason
      });

      setIsRescheduleModalOpen(false);
      setSelectedActivity(null);
      fetchActivities();
      fetchMetrics();
    } catch (err: any) {
      alert('Failed to reschedule: ' + (err.response?.data?.message || err.message));
    }
  };

  // Export iCal (.ics)
  const handleExportIcs = () => {
    if (filteredActivities.length === 0) {
      alert('No activities to export.');
      return;
    }

    let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MySchoolAdmissions//ActivityCalendar//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n";

    filteredActivities.forEach(act => {
      const start = new Date(act.scheduledStartTime).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const end = new Date(act.scheduledEndTime).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      
      icsContent += "BEGIN:VEVENT\r\n";
      icsContent += `UID:${act.id}@myschooladmissions.com\r\n`;
      icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\r\n`;
      icsContent += `DTSTART:${start}\r\n`;
      icsContent += `DTEND:${end}\r\n`;
      icsContent += `SUMMARY:${act.title} - ${act.studentName}\r\n`;
      icsContent += `DESCRIPTION:${act.description} | Parent: ${act.parentPhone} | Grade: ${act.gradeInterested}\r\n`;
      icsContent += `LOCATION:${act.location}\r\n`;
      icsContent += `STATUS:${act.status === 'Completed' ? 'CONFIRMED' : 'TENTATIVE'}\r\n`;
      icsContent += "END:VEVENT\r\n";
    });

    icsContent += "END:VCALENDAR\r\n";

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `Admissions_Calendar_${new Date().toISOString().split('T')[0]}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for type color styles
  const getActivityTypeBadge = (type: string) => {
    switch (type) {
      case 'CampusTour':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: <MapPin className="w-3 h-3" />,
          label: 'Campus Tour'
        };
      case 'Call':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          icon: <Phone className="w-3 h-3" />,
          label: 'Call / Follow-up'
        };
      case 'Meeting':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          dot: 'bg-purple-500',
          icon: <Users className="w-3 h-3" />,
          label: 'Counseling Session'
        };
      case 'Assessment':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          icon: <Award className="w-3 h-3" />,
          label: 'Assessment / Test'
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
          icon: <CheckCircle2 className="w-3 h-3" />,
          label: 'Task'
        };
    }
  };

  // Month Grid Calculation
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month filler days (fill up to 35 or 42)
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER & TITLE */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Activity & Follow-Up Calendar
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                SimplyAdmissions workflow for scheduling parent callbacks, campus tours, entrance assessments, and follow-ups.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            id="export-ics-btn"
            onClick={handleExportIcs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-300 shadow-xs"
            title="Export to Google Calendar or Apple Calendar (.ics)"
          >
            <Download className="w-4 h-4 text-slate-600" />
            Export iCal
          </button>

          <button
            id="book-tour-btn"
            onClick={() => setIsBookTourModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition transform active:scale-95"
            title="Book an in-person Campus Tour"
          >
            <MapPin className="w-4 h-4 text-emerald-200" />
            Book Campus Tour
          </button>

          <button
            onClick={() => setIsTourSlotPanelOpen(value => !value)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition"
          >
            <Clock className="w-4 h-4" />
            Open Tour Slots
          </button>

          <button
            id="schedule-activity-btn"
            onClick={() => setIsScheduleModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Schedule Activity
          </button>
        </div>
      </div>

      {/* Success Notification Banner for Tour Slot Publication */}
      {publishSuccessBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-800">Campus Tour Slot Published</p>
              <p className="text-xs font-bold text-emerald-950 mt-0.5">{publishSuccessBanner}</p>
            </div>
          </div>
          <button
            onClick={() => setPublishSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1.5 rounded-lg hover:bg-emerald-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isTourSlotPanelOpen && (
        <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Manage Campus Tour Availability Slots
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Publish slots for parents to self-book on the admissions portal. Published slots require confirmation.
              </p>
            </div>
            <button onClick={() => setIsTourSlotPanelOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Slot Creation Form */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Publish New Tour Slot</h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Assign representative whose calendar is free for this slot
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="text-xs font-semibold text-slate-600">Institute
                <select
                  value={localStorage.getItem('selectedInstitutionId') || ''}
                  disabled={localStorage.getItem('selectedInstitutionId') === 'all'}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-slate-50"
                >
                  {tourInstitutions.map(institution => (
                    <option key={institution.id} value={institution.id}>{institution.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">Campus
                <select
                  value={tourCampusId}
                  onChange={e => setTourCampusId(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white"
                >
                  {(tourInstitutions.find(i => i.id === localStorage.getItem('selectedInstitutionId'))?.campuses || []).map(campus => (
                    <option key={campus.id} value={campus.id}>{campus.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Tour Representative *
                <select
                  value={tourRepresentativeId}
                  onChange={e => setTourRepresentativeId(e.target.value)}
                  className={`mt-1 w-full border rounded-lg px-2.5 py-2 text-sm bg-white font-medium ${
                    !tourRepresentativeId ? 'border-amber-400 bg-amber-50/20' : 'border-slate-300'
                  }`}
                >
                  <option value="">-- Assign Free Representative ({availableUsers.length} available) --</option>
                  {availableUsers.map(user => {
                    const fullName = `${user.firstName} ${user.lastName}`.trim();
                    return (
                      <option key={user.id} value={user.id}>
                        {fullName} ({user.email || user.roles?.join(', ') || 'Representative'})
                      </option>
                    );
                  })}
                </select>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className={availableUsers.length > 0 ? "text-emerald-700 font-bold flex items-center gap-1" : "text-rose-600 font-bold flex items-center gap-1"}>
                    {loadingBusyUsers ? (
                      <span className="flex items-center gap-1 text-slate-400">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Checking calendars...
                      </span>
                    ) : availableUsers.length > 0 ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        {availableUsers.length} of {users.length} staff free at this slot
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        No staff free at this time slot
                      </>
                    )}
                  </span>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mt-3">
              <label className="text-xs font-semibold text-slate-600">Date
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={tourSlotDate}
                  onChange={e => setTourSlotDate(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white"
                />
              </label>
              <div className="flex gap-2">
                <label className="text-xs font-semibold text-slate-600 flex-1">Start
                  <input
                    type="time"
                    value={tourSlotStart}
                    onChange={e => setTourSlotStart(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600 flex-1">End
                  <input
                    type="time"
                    value={tourSlotEnd}
                    onChange={e => setTourSlotEnd(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
                  />
                </label>
              </div>
              <label className="text-xs font-semibold text-slate-600">Capacity (Seats)
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={tourSlotCapacity}
                  onChange={e => setTourSlotCapacity(Number(e.target.value))}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-white"
                />
              </label>
              <button
                onClick={handleInitiatePublish}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Publish Slot (Review & Confirm)
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              * The assigned representative receives Email & WhatsApp notifications with their slot schedule. When parents book this tour, the representative, admin, and parents all receive instant booking confirmations via Email & WhatsApp.
            </p>
          </div>

          {/* Already Published Tour Slots Section */}
          <div className="pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Already Published Slots
                </h3>
                <p className="text-[11px] text-slate-500">
                  Active availability visible to parents on the public tour booking portal.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                {publishedTourSlots.length} {publishedTourSlots.length === 1 ? 'Slot' : 'Slots'} Published
              </span>
            </div>

            {loadingPublishedSlots ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                Loading published slots...
              </div>
            ) : publishedTourSlots.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No campus tour slots published yet for this institution. Fill out the details above and click "Publish Slot".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {publishedTourSlots.map(slot => {
                  const campusObj = tourInstitutions.flatMap(i => i.campuses).find(c => c.id === slot.campusId);
                  const campusName = campusObj?.name || 'Main Campus';
                  const slotDateStr = formatSlotDate(slot.slotDate);
                  const startTimeStr = formatSlotTime(slot.startTime);
                  const endTimeStr = formatSlotTime(slot.endTime);
                  const seatsLeft = Math.max(0, slot.capacity - (slot.bookedCount || 0));

                  return (
                    <div
                      key={slot.id}
                      className="p-3.5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200 hover:border-emerald-300 shadow-2xs hover:shadow-xs transition space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-300 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Published ({slot.capacity} {slot.capacity === 1 ? 'seat' : 'seats'})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSlotToDelete(slot)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition"
                          title="Unpublish this tour slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-xs font-black text-slate-800">{campusName}</div>

                      {slot.assignedRepresentativeName ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[11px] font-bold border border-purple-200">
                          <UserCheck className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>Rep: {slot.assignedRepresentativeName}</span>
                          {slot.assignedRepresentativePhone && (
                            <span className="text-[10px] text-emerald-700 font-extrabold ml-0.5">📱 WA</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">No representative assigned</div>
                      )}

                      <div className="space-y-1 text-[11px] text-slate-600 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{slotDateStr}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{startTimeStr} - {endTimeStr}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-500">
                          Booked: <b>{slot.bookedCount || 0}</b> / {slot.capacity}
                        </span>
                        <span className={`font-black ${seatsLeft > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {seatsLeft > 0 ? `${seatsLeft} available` : 'Full'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. KPI RIBBON (SimplyAdmission Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{metrics.todayCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Agenda</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex items-center gap-3 bg-gradient-to-br from-amber-50/40 to-white">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700">{metrics.overdueCount}</div>
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Overdue Alerts</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex items-center gap-3 bg-gradient-to-br from-emerald-50/40 to-white">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">{metrics.campusToursCount}</div>
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Campus Tours</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-700">{metrics.upcomingCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Upcoming Tasks</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 col-span-2 lg:col-span-1">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{metrics.completedThisWeekCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed WTD</div>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR (VIEW TOGGLES, DATE CONTROLS & FILTERS) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* View Mode Buttons */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              id="view-month-btn"
              onClick={() => setViewMode('month')}
              className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition ${
                viewMode === 'month' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              id="view-week-btn"
              onClick={() => setViewMode('week')}
              className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition ${
                viewMode === 'week' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week
            </button>
            <button
              id="view-day-btn"
              onClick={() => setViewMode('day')}
              className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition ${
                viewMode === 'day' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day / Agenda
            </button>
            <button
              id="view-list-btn"
              onClick={() => setViewMode('list')}
              className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              Follow-Up Dashboard
            </button>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm font-extrabold text-slate-800 ml-2">
              {currentDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
                ...(viewMode === 'day' ? { day: 'numeric', weekday: 'short' } : {})
              })}
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student, parent, phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Counselor Filter */}
          <div>
            <select
              value={selectedCounselor}
              onChange={e => setSelectedCounselor(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Counselors / Staff</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.roles?.join(', ') || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          {/* Campus Filter */}
          <div>
            <select
              value={selectedCampus}
              onChange={e => setSelectedCampus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Campuses</option>
              <option value="866bc5ca-0dbd-4482-b52c-102398d4c65d">DIS Sector 23 Campus</option>
              <option value="dbf8c7ce-bbf9-4750-b726-5f31b2984ef9">DIS Rohini Campus</option>
            </select>
          </div>

          {/* Activity Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Activity Types</option>
              <option value="CampusTour">🏫 Campus Tours</option>
              <option value="Call">📞 Phone Calls / Callbacks</option>
              <option value="Meeting">👥 Counseling Sessions</option>
              <option value="Assessment">📝 Entrance Assessments</option>
              <option value="Task">📌 Follow-up Tasks</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Scheduled">Scheduled (Pending)</option>
              <option value="Completed">Completed</option>
              <option value="Rescheduled">Rescheduled</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. MAIN VIEW BODY */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[580px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-xs font-bold text-slate-500">Loading admissions calendar...</span>
          </div>
        ) : viewMode === 'month' ? (
          /* ============================================================
             MONTH VIEW
             ============================================================ */
          <div>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Month Day Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
              {monthData.map((d, index) => {
                const dayPublishedSlots = publishedTourSlots.filter(s => isSameCalendarDay(s.slotDate, d.date));
                const dayActivities = filteredActivities.filter(a => 
                  isActivityOnDate(a.scheduledStartTime, d.date, a.activityType)
                );
                const totalDayItems = dayActivities.length + dayPublishedSlots.length;
                const isToday = new Date().toDateString() === d.date.toDateString();

                return (
                  <div
                    key={index}
                    onClick={() => {
                      setCurrentDate(d.date);
                      setViewMode('day');
                    }}
                    className={`min-h-[115px] p-2 transition group hover:bg-slate-50/70 cursor-pointer ${
                      d.isCurrentMonth ? 'bg-white' : 'bg-slate-50/40 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          isToday 
                            ? 'bg-blue-600 text-white font-black shadow-xs' 
                            : d.isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        {d.date.getDate()}
                      </span>
                      {totalDayItems > 0 && (
                        <span className="text-[10px] font-extrabold text-slate-400">
                          {totalDayItems}
                        </span>
                      )}
                    </div>

                    {/* Event Chips */}
                    <div className="space-y-1">
                      {/* Published Tour Slot Chips */}
                      {dayPublishedSlots.map(slot => (
                        <div
                          key={`pub-slot-month-${slot.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTourSlotPanelOpen(true);
                          }}
                          className="p-1 px-1.5 rounded-md text-[10px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-900 truncate flex items-center justify-between shadow-2xs hover:shadow-xs transition cursor-pointer"
                          title={`Campus Tour Slot: ${formatSlotTime(slot.startTime)} - Published (${slot.capacity} seats)`}
                        >
                          <span className="truncate flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                            <span className="font-extrabold">{formatSlotTime(slot.startTime)}</span>
                            <span className="font-semibold text-emerald-800">Published ({slot.capacity} {slot.capacity === 1 ? 'seat' : 'seats'})</span>
                          </span>
                          {slot.bookedCount > 0 && (
                            <span className="text-[9px] px-1 rounded bg-emerald-200 text-emerald-950 font-extrabold shrink-0">
                              {slot.bookedCount} bkd
                            </span>
                          )}
                        </div>
                      ))}

                      {dayActivities.slice(0, 3).map(act => {
                        const badge = getActivityTypeBadge(act.activityType);
                        const isOverdue = new Date(act.scheduledStartTime) < new Date() && act.status === 'Scheduled';
                        return (
                          <div
                            key={act.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDrawerActivity(act);
                            }}
                            className={`p-1 px-1.5 rounded-md text-[10px] font-bold border truncate flex items-center justify-between shadow-2xs hover:shadow-xs transition ${
                              act.status === 'Completed'
                                ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                                : isOverdue
                                ? 'bg-amber-50 text-amber-800 border-amber-200 font-extrabold'
                                : badge.bg
                            }`}
                          >
                            <span className="truncate flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {formatActivityTime(act.scheduledStartTime, act.activityType)} - {act.studentName || act.title}
                            </span>
                          </div>
                        );
                      })}

                      {dayActivities.length > 3 && (
                        <div className="text-[10px] font-black text-blue-600 pl-1 hover:underline">
                          +{dayActivities.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'week' ? (
          /* ============================================================
             WEEK VIEW
             ============================================================ */
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Header Days of Week */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 py-3 text-center divide-x divide-slate-100">
                {Array.from({ length: 7 }).map((_, i) => {
                  const startOfWeek = new Date(currentDate);
                  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + i);
                  const isToday = new Date().toDateString() === startOfWeek.toDateString();

                  return (
                    <div key={i} className="px-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {startOfWeek.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`text-sm font-black mt-0.5 inline-block px-2 py-0.5 rounded-full ${
                        isToday ? 'bg-blue-600 text-white' : 'text-slate-800'
                      }`}>
                        {startOfWeek.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day Columns */}
              <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[500px] p-2 bg-slate-50/20">
                {Array.from({ length: 7 }).map((_, i) => {
                  const dayDate = new Date(currentDate);
                  dayDate.setDate(currentDate.getDate() - currentDate.getDay() + i);
                  const dayPublishedSlots = publishedTourSlots.filter(s => isSameCalendarDay(s.slotDate, dayDate));
                  const dayEvents = filteredActivities.filter(a => 
                    isActivityOnDate(a.scheduledStartTime, dayDate, a.activityType)
                  );

                  return (
                    <div key={i} className="space-y-2 p-1">
                      {dayEvents.length === 0 && dayPublishedSlots.length === 0 ? (
                        <div className="text-center py-8 text-[11px] font-medium text-slate-400">
                          No events
                        </div>
                      ) : (
                        <>
                          {/* Published Tour Slots in Week Column */}
                          {dayPublishedSlots.map(slot => (
                            <div
                              key={`pub-slot-week-${slot.id}`}
                              onClick={() => setIsTourSlotPanelOpen(true)}
                              className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/70 shadow-2xs hover:shadow-xs transition cursor-pointer text-left space-y-1"
                            >
                              <div className="flex items-center justify-between text-[10px] font-black text-emerald-800">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-emerald-600" />
                                  {formatSlotTime(slot.startTime)}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider font-extrabold bg-emerald-200 text-emerald-950">
                                  Open Slot
                                </span>
                              </div>
                              <div className="text-xs font-black text-emerald-950">
                                Published ({slot.capacity} {slot.capacity === 1 ? 'seat' : 'seats'})
                              </div>
                              <div className="text-[10px] text-emerald-800 font-semibold">
                                {slot.bookedCount || 0} booked • {Math.max(0, slot.capacity - (slot.bookedCount || 0))} left
                              </div>
                            </div>
                          ))}

                          {dayEvents.map(act => {
                            const badge = getActivityTypeBadge(act.activityType);
                            return (
                              <div
                                key={act.id}
                                onClick={() => setActiveDrawerActivity(act)}
                                className={`p-2.5 rounded-xl border shadow-xs hover:shadow-md transition cursor-pointer text-left ${badge.bg}`}
                              >
                                <div className="flex items-center justify-between text-[10px] font-black opacity-80 mb-1">
                                  <span className="flex items-center gap-1">
                                    {badge.icon}
                                    {formatActivityTime(act.scheduledStartTime, act.activityType)}
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider font-extrabold ${
                                    act.priority === 'High' ? 'bg-red-500 text-white' : 'bg-black/10'
                                  }`}>
                                    {act.priority}
                                  </span>
                                </div>
                                <div className="text-xs font-black text-slate-900 truncate">{act.title}</div>
                                <div className="text-[11px] font-semibold text-slate-700 truncate mt-0.5">
                                  {act.studentName} ({act.gradeInterested})
                                </div>
                                <div className="text-[10px] text-slate-500 truncate mt-1 flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                                  {act.location}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : viewMode === 'day' ? (
          /* ============================================================
             DAY / AGENDA VIEW
             ============================================================ */
          <div className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Agenda for {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  Detailed timeline of scheduled parent calls, visits, and counseling sessions.
                </p>
              </div>
              <button
                onClick={() => {
                  setFormDate(currentDate.toISOString().split('T')[0]);
                  setIsScheduleModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Event for this Day
              </button>
            </div>

            {(() => {
              const dayPublishedSlots = publishedTourSlots.filter(s => isSameCalendarDay(s.slotDate, currentDate));
              const dayActivities = filteredActivities.filter(a => 
                isActivityOnDate(a.scheduledStartTime, currentDate, a.activityType)
              );

              if (dayActivities.length === 0 && dayPublishedSlots.length === 0) {
                return (
                  <div className="text-center py-16">
                    <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800">No activities scheduled</h3>
                    <p className="text-xs text-slate-400 mt-1">Take this time to follow up on new enquiries or schedule campus visits.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Published Campus Tour Slots for this Day */}
                  {dayPublishedSlots.length > 0 && (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-2xs">
                            <CalendarDays className="w-4 h-4" />
                          </span>
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900">
                              Published Tour Availability For This Day
                            </h3>
                            <p className="text-[11px] text-emerald-700">Parents can self-book these published slots</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsTourSlotPanelOpen(true)}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
                        >
                          Manage Tour Slots
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {dayPublishedSlots.map(slot => {
                          const campusObj = tourInstitutions.flatMap(i => i.campuses).find(c => c.id === slot.campusId);
                          const campusName = campusObj?.name || 'Main Campus';
                          const seatsLeft = Math.max(0, slot.capacity - (slot.bookedCount || 0));

                          return (
                            <div key={slot.id} className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[11px] border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  Published ({slot.capacity} {slot.capacity === 1 ? 'seat' : 'seats'})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSlotToDelete(slot)}
                                  className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                                  title="Unpublish this slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="text-xs font-black text-slate-800">{campusName}</div>
                              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                {formatSlotTime(slot.startTime)} - {formatSlotTime(slot.endTime)}
                              </div>
                              <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                                <span>Booked: <b>{slot.bookedCount || 0}</b> / {slot.capacity}</span>
                                <span className={`font-black ${seatsLeft > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {seatsLeft > 0 ? `${seatsLeft} seats left` : 'Fully Booked'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {dayActivities.map(act => {
                    const badge = getActivityTypeBadge(act.activityType);
                    const isOverdue = new Date(act.scheduledStartTime) < new Date() && act.status === 'Scheduled';

                    return (
                      <div
                        key={act.id}
                        className={`p-5 rounded-2xl border transition shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          act.status === 'Completed'
                            ? 'bg-slate-50 border-slate-200 opacity-80'
                            : isOverdue
                            ? 'bg-amber-50/50 border-amber-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Time & Title info */}
                        <div className="flex items-start gap-4">
                          <div className="text-center shrink-0 w-20 p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                            <div className="text-xs font-black text-slate-900">
                              {formatActivityTime(act.scheduledStartTime, act.activityType)}
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                              {formatActivityTime(act.scheduledEndTime, act.activityType)}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badge.bg}`}>
                                {badge.icon}
                                {badge.label}
                              </span>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                act.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {act.priority} Priority
                              </span>
                              {act.status === 'Completed' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                  <Check className="w-3 h-3" /> Completed
                                </span>
                              ) : isOverdue ? (
                                <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-2 py-0.5 rounded">
                                  Overdue Follow-Up
                                </span>
                              ) : null}
                            </div>

                            <h3 className="text-sm font-black text-slate-900">{act.title}</h3>
                            <div className="text-xs font-bold text-blue-600">
                              Student: {act.studentName} ({act.gradeInterested}) • Parent Phone: {act.parentPhone}
                            </div>
                            <div className="text-xs text-slate-600 flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {act.location}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                                Assigned: {act.assignedToName || 'Unassigned'}
                              </span>
                            </div>
                            {act.description && (
                              <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                "{act.description}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* 1-Click Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {act.parentPhone && (
                            <>
                              <a
                                href={`https://wa.me/${act.parentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                  `Hello from Delhi International School admissions office! Regarding your scheduled ${act.activityType} for ${act.studentName}: please let us know if you need directions or have any questions.`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition"
                                title="Chat on WhatsApp Web"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                WhatsApp
                              </a>
                              <a
                                href={`tel:${act.parentPhone}`}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                                title="Direct Call"
                              >
                                <Phone className="w-3.5 h-3.5 text-slate-600" />
                                Call
                              </a>
                            </>
                          )}

                          {act.status !== 'Completed' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedActivity(act);
                                  setIsOutcomeModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Log Outcome
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedActivity(act);
                                  setRescheduleDate(act.scheduledStartTime.split('T')[0]);
                                  setRescheduleTime('11:00');
                                  setIsRescheduleModalOpen(true);
                                }}
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition border border-slate-200"
                                title="Reschedule"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setActiveDrawerActivity(act)}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition border border-slate-200"
                            title="View Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : (
          /* ============================================================
             FOLLOW-UP DASHBOARD LIST VIEW (SimplyAdmission Style)
             ============================================================ */
          <div className="p-6 space-y-4">
            {/* Sub-tabs */}
            <div className="flex border-b border-slate-200 gap-6">
              <button
                onClick={() => setListTab('today')}
                className={`pb-3 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
                  listTab === 'today'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Today's Follow-Ups ({metrics.todayCount})
              </button>
              <button
                onClick={() => setListTab('overdue')}
                className={`pb-3 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
                  listTab === 'overdue'
                    ? 'border-amber-600 text-amber-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Overdue ({metrics.overdueCount})
              </button>
              <button
                onClick={() => setListTab('upcoming')}
                className={`pb-3 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
                  listTab === 'upcoming'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Upcoming 7 Days ({metrics.upcomingCount})
              </button>
              <button
                onClick={() => setListTab('completed')}
                className={`pb-3 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
                  listTab === 'completed'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Completed History
              </button>
            </div>

            {/* List Tab Content */}
            {(() => {
              const now = new Date();

              let displayList = filteredActivities;
              if (listTab === 'today') {
                displayList = filteredActivities.filter(a => 
                  isActivityOnDate(a.scheduledStartTime, now, a.activityType) && a.status !== 'Cancelled'
                );
              } else if (listTab === 'overdue') {
                displayList = filteredActivities.filter(a => 
                  new Date(a.scheduledStartTime) < now && a.status === 'Scheduled' &&
                  !isActivityOnDate(a.scheduledStartTime, now, a.activityType)
                );
              } else if (listTab === 'upcoming') {
                displayList = filteredActivities.filter(a => 
                  new Date(a.scheduledStartTime) > now && a.status === 'Scheduled' &&
                  !isActivityOnDate(a.scheduledStartTime, now, a.activityType)
                );
              } else if (listTab === 'completed') {
                displayList = filteredActivities.filter(a => a.status === 'Completed');
              }

              if (displayList.length === 0) {
                return (
                  <div className="text-center py-16">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800">All caught up!</h3>
                    <p className="text-xs text-slate-400 mt-1">No activities in this category.</p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-slate-100">
                  {displayList.map(act => {
                    const badge = getActivityTypeBadge(act.activityType);
                    return (
                      <div key={act.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70 px-3 rounded-xl transition">
                        <div className="flex items-center gap-3">
                          <span className={`p-2 rounded-lg border ${badge.bg}`}>
                            {badge.icon}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">{act.title}</span>
                              <span className="text-[10px] font-bold text-slate-500">
                                {formatSlotDate(act.scheduledStartTime)} at {formatActivityTime(act.scheduledStartTime, act.activityType)}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-600 mt-0.5">
                              Student: <b className="text-slate-800">{act.studentName}</b> ({act.gradeInterested}) • Parent: {act.parentPhone}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          {act.status !== 'Completed' && (
                            <button
                              onClick={() => {
                                setSelectedActivity(act);
                                setIsOutcomeModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                            >
                              Log Outcome
                            </button>
                          )}
                          <button
                            onClick={() => setActiveDrawerActivity(act)}
                            className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 font-bold"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ============================================================
          MODAL 1: SCHEDULE NEW ACTIVITY (SimplyAdmissions Style)
          ============================================================ */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">Schedule Admission Activity</h3>
              </div>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs font-semibold">
              {/* Select Lead */}
              <div>
                <label className="block text-slate-700 mb-1">Select Student / Lead *</label>
                <select
                  required
                  value={formEnquiryId}
                  onChange={e => {
                    setFormEnquiryId(e.target.value);
                    const lead = leads.find(l => l.id === e.target.value);
                    if (lead) {
                      setFormTitle(`${formType} with ${lead.firstName} ${lead.lastName}`);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose prospective student --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.firstName} {l.lastName} ({l.gradeInterested}) - {l.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity Type & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Activity Type</label>
                  <select
                    value={formType}
                    onChange={e => {
                      const t = e.target.value as any;
                      setFormType(t);
                      if (t === 'CampusTour') setFormLocation('Sector 23 Campus - Main Reception');
                      else if (t === 'Call') setFormLocation('Phone Call');
                      else if (t === 'Meeting') setFormLocation('Online Google Meet');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="CampusTour">🏫 Campus Tour / Visit</option>
                    <option value="Call">📞 Phone Call / Callback</option>
                    <option value="Meeting">👥 Counseling Session</option>
                    <option value="Assessment">📝 Diagnostic Assessment</option>
                    <option value="Task">📌 Follow-up Task</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="High">🔴 High Priority</option>
                    <option value="Normal">🔵 Normal</option>
                    <option value="Low">⚪ Low</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-slate-700 mb-1">Subject / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Campus Tour & Robotics Lab Demonstration"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date, Time & Duration */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={e => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Duration</label>
                  <select
                    value={formDurationMinutes}
                    onChange={e => setFormDurationMinutes(Number(e.target.value))}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                  </select>
                </div>
              </div>

              {/* Location & Counselor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Sector 23 Reception"
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Assign To Counselor</label>
                  <select
                    value={formAssignedTo}
                      onChange={e => setFormAssignedTo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="">-- Unassigned --</option>
                      {counselorsForScheduleActivity.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                    </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 mb-1">Agenda / Counselor Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes for the visit or key parent talking points..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-extrabold shadow-md hover:from-blue-700 hover:to-indigo-700 transition"
                >
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: COMPLETE ACTIVITY & LOG OUTCOME (SimplyAdmissions)
          ============================================================ */}
      {isOutcomeModalOpen && selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Log Outcome & Complete</h3>
                  <div className="text-[11px] text-slate-500 font-semibold">{selectedActivity.title}</div>
                </div>
              </div>
              <button onClick={() => setIsOutcomeModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOutcomeSubmit} className="space-y-4 text-xs font-semibold">
              {/* Disposition Outcome */}
              <div>
                <label className="block text-slate-700 mb-1">Call / Visit Disposition Outcome *</label>
                <select
                  required
                  value={outcomeDisposition}
                  onChange={e => setOutcomeDisposition(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-slate-800"
                >
                  <option value="Interested - Qualified">Interested - Qualified (Ready for Application)</option>
                  <option value="Tour Completed - Application Requested">Tour Completed - Application Requested</option>
                  <option value="Callback Requested">Callback Requested (Needs follow-up call)</option>
                  <option value="Fee Discussion Ongoing">Fee Discussion Ongoing / Scholarship Review</option>
                  <option value="Not Reachable / Busy">Not Reachable / Busy (Reschedule Needed)</option>
                  <option value="Not Interested - Lost">Not Interested - Lost</option>
                </select>
              </div>

              {/* Counselor Outcome Notes */}
              <div>
                <label className="block text-slate-700 mb-1">Detailed Discussion Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record summary of what parents discussed, questions asked, and next steps..."
                  value={outcomeNotes}
                  onChange={e => setOutcomeNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Lead Status auto-update */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-800">Auto-Update Lead Stage</div>
                  <div className="text-[10px] text-slate-500">Update student status in lead pipeline</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={updateLeadStatus}
                    onChange={e => setUpdateLeadStatus(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <select
                    disabled={!updateLeadStatus}
                    value={nextLeadStatus}
                    onChange={e => setNextLeadStatus(e.target.value)}
                    className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-50 font-bold"
                  >
                    <option value="Qualified">Qualified</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>

              {/* Next follow up scheduler */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleNextFollowUp}
                    onChange={e => setScheduleNextFollowUp(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="font-extrabold text-blue-900">Schedule Next Follow-Up Task</span>
                </label>

                {scheduleNextFollowUp && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div>
                      <label className="text-[10px] text-slate-600">Next Type</label>
                      <select
                        value={nextFollowUpType}
                        onChange={e => setNextFollowUpType(e.target.value as any)}
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                      >
                        <option value="Call">Call</option>
                        <option value="CampusTour">Tour</option>
                        <option value="Meeting">Meeting</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600">Date</label>
                      <input
                        type="date"
                        value={nextFollowUpDate}
                        onChange={e => setNextFollowUpDate(e.target.value)}
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600">Time</label>
                      <input
                        type="time"
                        value={nextFollowUpTime}
                        onChange={e => setNextFollowUpTime(e.target.value)}
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOutcomeModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-md transition"
                >
                  Save & Log to Timeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 3: RESCHEDULE EVENT
          ============================================================ */}
      {isRescheduleModalOpen && selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-black text-slate-900 mb-1">Reschedule Event</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedActivity.title}</p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1">New Date</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">New Start Time</label>
                <input
                  type="time"
                  required
                  value={rescheduleTime}
                  onChange={e => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Reason for Reschedule</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-xs"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          DRAWER: ACTIVITY & LEAD 360 QUICK VIEW
          ============================================================ */}
      {activeDrawerActivity && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-lg border ${getActivityTypeBadge(activeDrawerActivity.activityType).bg}`}>
                  {getActivityTypeBadge(activeDrawerActivity.activityType).icon}
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">{activeDrawerActivity.title}</h3>
                  <span className="text-[11px] font-bold text-slate-400">Activity Details & Lead Context</span>
                </div>
              </div>
              <button onClick={() => setActiveDrawerActivity(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timing & Location Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>
                  {formatSlotDate(activeDrawerActivity.scheduledStartTime)}
                </span>
                <span>•</span>
                <span>
                  {formatActivityTime(activeDrawerActivity.scheduledStartTime, activeDrawerActivity.activityType)} - {formatActivityTime(activeDrawerActivity.scheduledEndTime, activeDrawerActivity.activityType)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{activeDrawerActivity.location}</span>
              </div>

              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span>Assigned: {activeDrawerActivity.assignedToName || 'Unassigned'}</span>
              </div>
            </div>

            {/* Student & Parent Info */}
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2 text-xs">
              <div className="text-[11px] font-black uppercase tracking-wider text-blue-800">Student Profile</div>
              <div className="text-sm font-black text-slate-900">{activeDrawerActivity.studentName}</div>
              <div className="text-slate-600 font-semibold">Grade Applying: <b>{activeDrawerActivity.gradeInterested}</b></div>
              <div className="text-slate-600 font-semibold">Parent Contact: <b>{activeDrawerActivity.parentPhone}</b></div>
              <div className="text-slate-600 font-semibold">Email: <b>{activeDrawerActivity.parentEmail}</b></div>

              <div className="pt-2 flex gap-2">
                {activeDrawerActivity.parentPhone && (
                  <a
                    href={`https://wa.me/${activeDrawerActivity.parentPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-center font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                )}
                {activeDrawerActivity.parentPhone && (
                  <a
                    href={`tel:${activeDrawerActivity.parentPhone}`}
                    className="flex-1 py-2 bg-slate-800 hover:bg-black text-white rounded-xl text-center font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </a>
                )}
              </div>
            </div>

            {/* Description Notes */}
            {activeDrawerActivity.description && (
              <div>
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Agenda / Meeting Notes</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  {activeDrawerActivity.description}
                </div>
              </div>
            )}

            {/* Logged Outcome Info if Completed */}
            {activeDrawerActivity.status === 'Completed' && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-800 font-black">
                  <CheckCircle2 className="w-4 h-4" />
                  Activity Completed
                </div>
                <div className="text-emerald-900 font-bold">Disposition: {activeDrawerActivity.disposition}</div>
                {activeDrawerActivity.outcomeNotes && (
                  <div className="text-slate-600 italic">"{activeDrawerActivity.outcomeNotes}"</div>
                )}
                {activeDrawerActivity.completedAt && (
                  <div className="text-[10px] text-slate-400">
                    Logged on {new Date(activeDrawerActivity.completedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Quick action bar */}
            {activeDrawerActivity.status !== 'Completed' && (
              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedActivity(activeDrawerActivity);
                    setIsOutcomeModalOpen(true);
                  }}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md transition"
                >
                  Log Outcome
                </button>
                <button
                  onClick={() => {
                    setSelectedActivity(activeDrawerActivity);
                    setRescheduleDate(activeDrawerActivity.scheduledStartTime.split('T')[0]);
                    setRescheduleTime('11:00');
                    setIsRescheduleModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Reschedule
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: CONFIRM PUBLISH CAMPUS TOUR SLOT
          ============================================================ */}
      {isPublishConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Confirm Publishing Tour Slot</h3>
                <p className="text-xs text-slate-500">Please review slot availability details before publishing</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-semibold">Institute:</span>
                <span className="font-bold text-slate-800">
                  {tourInstitutions.find(i => i.id === localStorage.getItem('selectedInstitutionId'))?.name || 'Selected Institute'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-semibold">Campus:</span>
                <span className="font-bold text-slate-800">
                  {tourInstitutions.flatMap(i => i.campuses).find(c => c.id === tourCampusId)?.name || 'Selected Campus'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-semibold">Date:</span>
                <span className="font-bold text-slate-800">
                  {formatSlotDate(tourSlotDate)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-semibold">Time Window:</span>
                <span className="font-bold text-indigo-700">
                  {formatSlotTime(tourSlotStart)} - {formatSlotTime(tourSlotEnd)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-semibold">Assigned Representative:</span>
                <span className="font-bold text-purple-800">
                  {(() => {
                    const rep = users.find(u => u.id === tourRepresentativeId);
                    return rep ? `${rep.firstName} ${rep.lastName} (${rep.email || 'Representative'})` : 'Unassigned';
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Published Seats:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Published ({tourSlotCapacity} {tourSlotCapacity === 1 ? 'seat' : 'seats'})
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                Automated Email & WhatsApp Notifications Enabled
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                The assigned representative will receive their slot schedule by Email & WhatsApp upon publishing. When parents self-book this slot, the representative, school admin, and parents all receive instant confirmation notifications across Email & WhatsApp.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingPublish}
                onClick={() => setIsPublishConfirmOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingPublish}
                onClick={handleConfirmPublish}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-md transition text-xs flex items-center gap-2"
              >
                {isSubmittingPublish ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: CONFIRM UNPUBLISH CAMPUS TOUR SLOT
          ============================================================ */}
      {slotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 text-red-700 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Unpublish Tour Slot</h3>
                <p className="text-xs text-slate-500">Remove slot from public booking</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to unpublish the slot for{' '}
              <b>
                {formatSlotDate(slotToDelete.slotDate)}{' '}
                ({formatSlotTime(slotToDelete.startTime)} - {formatSlotTime(slotToDelete.endTime)})
              </b>
              ? It currently shows <b>Published ({slotToDelete.capacity} {slotToDelete.capacity === 1 ? 'seat' : 'seats'})</b>. Parents will no longer be able to select it.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingSlot}
                onClick={() => setSlotToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingSlot}
                onClick={handleDeleteSlot}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold shadow-md transition text-xs flex items-center gap-1.5"
              >
                {isDeletingSlot ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Unpublish Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campus Tour Booking Modal */}
      <BookTourModal
        isOpen={isBookTourModalOpen}
        onClose={() => setIsBookTourModalOpen(false)}
        onTourBooked={fetchActivities}
      />
    </div>
  );
}
