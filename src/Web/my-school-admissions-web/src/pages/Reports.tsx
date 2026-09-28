import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, CalendarDays, RefreshCw, Users } from 'lucide-react';
import api from '../lib/api';
import type { Application, CounselorSkillProfile, Enquiry } from '../types';

type ReportRecordType = 'Lead' | 'Application';
type SortField = 'counselor' | 'date' | 'status';

interface ReportRecord {
  id: string;
  type: ReportRecordType;
  name: string;
  reference: string;
  status: string;
  counselorId: string;
  counselorName: string;
  date: string;
  grade: string;
}

const getDateOnly = (value?: string) => value ? value.slice(0, 10) : '';

export default function Reports() {
  const [leads, setLeads] = useState<Enquiry[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [counselors, setCounselors] = useState<CounselorSkillProfile[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [counselorFilter, setCounselorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ReportRecordType>('all');
  const [sortField, setSortField] = useState<SortField>('counselor');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [leadsResponse, applicationsResponse, counselorsResponse] = await Promise.all([
        api.get<Enquiry[]>('/api/leads'),
        api.get<Application[]>('/api/applications'),
        api.get<CounselorSkillProfile[]>('/api/counselors/profiles').catch(() => ({ data: [] as CounselorSkillProfile[] }))
      ]);
      setLeads(Array.isArray(leadsResponse.data) ? leadsResponse.data : []);
      setApplications(Array.isArray(applicationsResponse.data) ? applicationsResponse.data : []);
      setCounselors(Array.isArray(counselorsResponse.data) ? counselorsResponse.data : []);
    } catch {
      setError('Could not load report data. Check your access and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport();
    window.addEventListener('tenantChanged', loadReport);
    return () => window.removeEventListener('tenantChanged', loadReport);
  }, [loadReport]);

  const records = useMemo<ReportRecord[]>(() => {
    const leadById = new Map(leads.filter(lead => lead.id).map(lead => [lead.id!, lead]));
    const leadRecords: ReportRecord[] = leads.map(lead => ({
      id: `lead-${lead.id}`,
      type: 'Lead',
      name: `${lead.firstName} ${lead.lastName}`.trim() || 'Unnamed lead',
      reference: lead.email || lead.phone || lead.id || '',
      status: lead.status || 'Unknown',
      counselorId: lead.assignedToId || '',
      counselorName: lead.assignedToName || 'Unassigned',
      date: lead.createdAt || '',
      grade: lead.gradeInterested || ''
    }));

    const applicationRecords: ReportRecord[] = applications.map(application => {
      const lead = application.enquiryId ? leadById.get(application.enquiryId) : undefined;
      return {
        id: `application-${application.id}`,
        type: 'Application',
        name: application.applicantName || 'Unnamed applicant',
        reference: application.applicationNumber || application.id || '',
        status: application.status || 'Unknown',
        counselorId: lead?.assignedToId || '',
        counselorName: lead?.assignedToName || 'Unassigned',
        date: application.submittedDate || application.createdAt || '',
        grade: application.gradeApplyingFor || ''
      };
    });

    return [...leadRecords, ...applicationRecords];
  }, [applications, leads]);

  const counselorOptions = useMemo(() => {
    const names = new Map<string, string>();
    counselors.forEach(counselor => names.set(counselor.userId, counselor.counselorName));
    records.forEach(record => {
      if (record.counselorId && !names.has(record.counselorId)) {
        names.set(record.counselorId, record.counselorName);
      }
    });
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [counselors, records]);

  const statusOptions = useMemo(() => [...new Set(records.map(record => record.status))].sort(), [records]);

  const filteredRecords = useMemo(() => records
    .filter(record => {
      const date = getDateOnly(record.date);
      if (fromDate && (!date || date < fromDate)) return false;
      if (toDate && (!date || date > toDate)) return false;
      if (counselorFilter !== 'all' && record.counselorId !== counselorFilter) return false;
      if (statusFilter !== 'all' && record.status !== statusFilter) return false;
      if (typeFilter !== 'all' && record.type !== typeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const left = sortField === 'date' ? getDateOnly(a.date) : a[sortField === 'status' ? 'status' : 'counselorName'].toLocaleLowerCase();
      const right = sortField === 'date' ? getDateOnly(b.date) : b[sortField === 'status' ? 'status' : 'counselorName'].toLocaleLowerCase();
      const compared = left.localeCompare(right) || a.name.localeCompare(b.name);
      return sortDirection === 'asc' ? compared : -compared;
    }), [counselorFilter, fromDate, records, sortDirection, sortField, statusFilter, toDate, typeFilter]);

  const filteredLeads = filteredRecords.filter(record => record.type === 'Lead').length;
  const filteredApplications = filteredRecords.filter(record => record.type === 'Application').length;

  const setSort = (field: SortField) => {
    if (field === sortField) setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setCounselorFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-blue-200">
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-[0.18em]">Admissions reporting</span>
            </div>
            <h2 className="text-2xl font-bold">Leads & applications report</h2>
            <p className="mt-1 text-sm text-blue-100">Review status and counselor workload for the selected institution.</p>
          </div>
          <button onClick={() => void loadReport()} className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-slate-500">Leads in view</p><p className="mt-1 text-3xl font-bold text-slate-900">{filteredLeads}</p></div>
            <span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Users className="h-6 w-6" /></span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-slate-500">Applications in view</p><p className="mt-1 text-3xl font-bold text-slate-900">{filteredApplications}</p></div>
            <span className="rounded-xl bg-indigo-50 p-3 text-indigo-700"><CalendarDays className="h-6 w-6" /></span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-semibold text-slate-900">Filter report</h3><p className="text-xs text-slate-500">Date range includes both selected days.</p></div>
          <button onClick={resetFilters} className="text-sm font-semibold text-blue-700 hover:text-blue-900">Clear filters</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-semibold text-slate-600">From date<input type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-600">To date<input type="date" value={toDate} min={fromDate || undefined} onChange={event => setToDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
          <label className="text-xs font-semibold text-slate-600">Counselor<select value={counselorFilter} onChange={event => setCounselorFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"><option value="all">All counselors</option><option value="">Unassigned</option>{counselorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"><option value="all">All statuses</option>{statusOptions.map(status => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Record type<select value={typeFilter} onChange={event => setTypeFilter(event.target.value as 'all' | ReportRecordType)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"><option value="all">Leads & applications</option><option value="Lead">Leads</option><option value="Application">Applications</option></select></label>
        </div>
      </section>

      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="h-4 w-4" />{error}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div><h3 className="font-semibold text-slate-900">Status details</h3><p className="text-xs text-slate-500">{filteredRecords.length} records</p></div>
          <label className="text-xs font-semibold text-slate-600">Sort by<select value={sortField} onChange={event => { setSortField(event.target.value as SortField); setSortDirection('asc'); }} className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"><option value="counselor">Counselor</option><option value="date">Date</option><option value="status">Status</option></select></label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Type</th><th className="px-5 py-3">Name / reference</th><th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"><button onClick={() => setSort('counselor')} className="font-bold hover:text-blue-700">Counselor {sortField === 'counselor' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</button></th>
                <th className="px-5 py-3">Grade</th><th className="px-5 py-3"><button onClick={() => setSort('date')} className="font-bold hover:text-blue-700">Date {sortField === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</button></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Loading report…</td></tr> : filteredRecords.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No records match these filters.</td></tr> : filteredRecords.map(record => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record.type === 'Lead' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'}`}>{record.type}</span></td>
                  <td className="px-5 py-3"><div className="font-semibold text-slate-900">{record.name}</div><div className="text-xs text-slate-500">{record.reference}</div></td>
                  <td className="whitespace-nowrap px-5 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{record.status}</span></td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-700">{record.counselorName}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-600">{record.grade || '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-600">{record.date ? new Date(record.date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
