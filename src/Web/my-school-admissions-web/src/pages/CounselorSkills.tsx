import { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, SlidersHorizontal, Sparkles, RefreshCw, Edit2, 
  CheckCircle2, Users, Languages, GraduationCap, MapPin, 
  Heart, Clock, X, Zap
} from 'lucide-react';
import api from '../lib/api';
import { 
  type CounselorSkillProfile, 
  type AutoAssignmentConfig, 
  type CounselorMatchCandidate, 
  type LeadMatchCriteria 
} from '../types';

export default function CounselorSkills() {
  const [profiles, setProfiles] = useState<CounselorSkillProfile[]>([]);
  const [config, setConfig] = useState<AutoAssignmentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matrix' | 'simulator' | 'rules'>('matrix');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<CounselorSkillProfile | null>(null);
  const [formData, setFormData] = useState<{
    userId: string;
    counselorName: string;
    email: string;
    institutionId?: string;
    campusId?: string;
    languagesKnown: string[];
    handledClasses: string[];
    regions: string[];
    religions: string[];
    dailyLeadCapacity: number;
    maxActiveLeads: number;
    isActive: boolean;
  }>({
    userId: '',
    counselorName: '',
    email: '',
    institutionId: undefined,
    campusId: undefined,
    languagesKnown: [],
    handledClasses: [],
    regions: [],
    religions: [],
    dailyLeadCapacity: 15,
    maxActiveLeads: 50,
    isActive: true
  });

  // Simulator State
  const [simCriteria, setSimCriteria] = useState<LeadMatchCriteria>({
    gradeInterested: 'Grade 11 - Science',
    preferredLanguage: 'Punjabi',
    region: 'Rohini',
    religion: 'Sikh'
  });
  const [simResults, setSimResults] = useState<CounselorMatchCandidate[]>([]);
  const [simLoading, setSimLoading] = useState(false);

  // Batch Auto-assignment State
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState('');

  // Available options for selection
  const availableLanguages = ['English', 'Hindi', 'Punjabi', 'Bengali', 'Malayalam', 'Tamil', 'Telugu', 'Gujarati', 'Marathi', 'Urdu', 'All'];
  const availableGrades = [
    'Nursery', 'KG', 'Pre-Primary', 'Grade 1-5', 'Primary', 
    'Grade 6-8', 'Middle School', 'Grade 9-10', 'Secondary', 
    'Grade 11 - Science', 'Grade 12 - Science', 'Grade 11 - Commerce', 
    'Grade 12 - Commerce', 'Grade 11 - Humanities', 'Grade 12 - Humanities', 'All'
  ];
  const availableRegions = [
    'North Delhi', 'Rohini', 'Pitampura', 'Shalimar Bagh', 'Model Town',
    'South Delhi', 'Dwarka', 'Gurugram', 'Vasant Kunj', 'Janakpuri',
    'Noida', 'East Delhi', 'Mayur Vihar', 'Indirapuram', 'West Delhi',
    'NCR', 'Outstation', 'International', 'All'
  ];
  const availableReligions = ['All', 'Hindu', 'Sikh', 'Christian', 'Jain', 'Muslim', 'Buddhist'];

  useEffect(() => {
    fetchData();

    const handleTenantChanged = () => {
      fetchData();
    };

    window.addEventListener('tenantChanged', handleTenantChanged);
    return () => {
      window.removeEventListener('tenantChanged', handleTenantChanged);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const currentInstId = localStorage.getItem('selectedInstitutionId');
      const params = currentInstId && currentInstId !== 'all' ? { institutionId: currentInstId } : {};
      const [profRes, cfgRes] = await Promise.all([
        api.get<CounselorSkillProfile[]>('/api/counselors/profiles', { params }),
        api.get<AutoAssignmentConfig>('/api/counselors/assignment-config', { params })
      ]);
      setProfiles(profRes.data || []);
      setConfig(cfgRes.data);
    } catch (err) {
      console.error('Failed to load counselor skill data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.put(`/api/counselors/profiles/${userId}/status`, !currentStatus);
      setProfiles(prev => prev.map(p => p.userId === userId ? { ...p, isActive: !currentStatus } : p));
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const openEditModal = (profile: CounselorSkillProfile) => {
    setSelectedProfile(profile);
    setFormData({
      userId: profile.userId,
      counselorName: profile.counselorName,
      email: profile.email,
      institutionId: profile.institutionId,
      campusId: profile.campusId,
      languagesKnown: [...profile.languagesKnown],
      handledClasses: [...profile.handledClasses],
      regions: [...profile.regions],
      religions: [...profile.religions],
      dailyLeadCapacity: profile.dailyLeadCapacity || 15,
      maxActiveLeads: profile.maxActiveLeads || 50,
      isActive: profile.isActive
    });
    setIsEditModalOpen(true);
  };

  const toggleArrayItem = (field: 'languagesKnown' | 'handledClasses' | 'regions' | 'religions', item: string) => {
    setFormData(prev => {
      const current = prev[field];
      const next = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, [field]: next };
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/counselors/profiles', formData);
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save counselor profile', err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    try {
      const res = await api.put<AutoAssignmentConfig>('/api/counselors/assignment-config', config);
      setConfig(res.data);
      setBatchMessage('Assignment configuration updated successfully!');
      setTimeout(() => setBatchMessage(''), 4000);
    } catch (err) {
      console.error('Failed to save config', err);
    }
  };

  const runSimulation = async () => {
    setSimLoading(true);
    try {
      const currentInstId = localStorage.getItem('selectedInstitutionId');
      const instId = (currentInstId && currentInstId !== 'all') ? currentInstId : 'fc49d553-b44f-4c4c-96ad-4bf599016c01';
      const res = await api.post<CounselorMatchCandidate[]>('/api/counselors/match-simulator', {
        ...simCriteria,
        institutionId: instId
      });
      setSimResults(res.data || []);
    } catch (err) {
      console.error('Failed to run match simulation', err);
    } finally {
      setSimLoading(false);
    }
  };

  const handleBatchAutoAssign = async () => {
    setBatchLoading(true);
    try {
      const res = await api.post<{ assignedCount: number; message: string }>('/api/counselors/auto-assign-unassigned');
      setBatchMessage(res.data.message || `Auto-assigned ${res.data.assignedCount} leads.`);
      fetchData();
    } catch (err) {
      console.error('Failed to batch auto-assign', err);
      setBatchMessage('Failed to execute batch auto-assignment.');
    } finally {
      setBatchLoading(false);
      setTimeout(() => setBatchMessage(''), 5000);
    }
  };

  // Run simulator initially when simulator tab is opened
  useEffect(() => {
    if (activeTab === 'simulator') {
      runSimulation();
    }
  }, [activeTab]);

  const stats = useMemo(() => {
    const total = profiles.length;
    const active = profiles.filter(p => p.isActive).length;
    const onLeave = total - active;
    const totalCapacity = profiles.reduce((sum, p) => sum + p.dailyLeadCapacity, 0);
    const totalAssignedToday = profiles.reduce((sum, p) => sum + p.assignedCountToday, 0);
    return { total, active, onLeave, totalCapacity, totalAssignedToday };
  }, [profiles]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Counselor Skills & Lead Auto-Assignment</h1>
          <p className="text-sm text-gray-500 mt-1">Configure language, class, region, and community skill parameters to route student leads to the most compatible counselor.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition shadow-xs"
          >
            <RefreshCw className="h-4 w-4 mr-1.5 text-gray-500" />
            Refresh
          </button>
          <button
            onClick={handleBatchAutoAssign}
            disabled={batchLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-lg shadow-xs text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            <Zap className="h-4 w-4 mr-1.5" />
            {batchLoading ? 'Routing...' : 'Auto-Assign Backlog Leads'}
          </button>
        </div>
      </div>

      {batchMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{batchMessage}</span>
          </div>
          <button onClick={() => setBatchMessage('')} className="text-emerald-700 hover:text-emerald-900 font-bold text-sm">×</button>
        </div>
      )}

      {/* Top Overview Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-inner border border-white/20">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-blue-300">
                  Intelligent Routing Command
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Multi-Criteria Engine Active
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Counselor Skill Matrix & Routing Engine
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-300" />
              <span className="text-blue-100">Daily Intake:</span>
              <span className="font-extrabold text-white">{stats.totalAssignedToday} / {stats.totalCapacity} Leads</span>
            </div>
          </div>
        </div>

        {/* 4 Overview Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="bg-white/10 border border-white/10 rounded-xl p-3.5">
            <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">Total Counselors</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{stats.total}</span>
              <span className="text-xs text-blue-200">Admissions team</span>
            </div>
          </div>

          <div className="bg-white/10 border border-emerald-400/40 rounded-xl p-3.5">
            <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Active & Available</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{stats.active}</span>
              <span className="text-xs text-emerald-200">Receiving leads</span>
            </div>
          </div>

          <div className="bg-white/10 border border-amber-400/40 rounded-xl p-3.5">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">On Leave / Paused</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{stats.onLeave}</span>
              <span className="text-xs text-amber-200">Bypassed by engine</span>
            </div>
          </div>

          <div className="bg-white/10 border border-indigo-400/40 rounded-xl p-3.5">
            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Min Match Threshold</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{config?.minimumMatchThreshold || 40}%</span>
              <span className="text-xs text-indigo-200">Quality cutoff</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'matrix'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Counselor Skills Matrix ({profiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Live Match Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Assignment Rules & Weights</span>
        </button>
      </div>

      {/* TAB 1: COUNSELOR SKILLS MATRIX TABLE */}
      {activeTab === 'matrix' && (
        <div className="bg-white shadow-xs border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading counselor skill profiles...</div>
          ) : profiles.length === 0 ? (
            <div className="p-12 text-center">
              <UserCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-900">No counselor skill profiles defined</h3>
              <p className="text-sm text-gray-500 mt-1">Add skill parameters to allow the system to route incoming leads.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Counselor
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Handled Classes
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Languages Known
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Regions / Zones
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Workload & Capacity
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {profiles.map(p => {
                    const capacityPercent = Math.min(100, Math.round((p.currentActiveLeads / (p.maxActiveLeads || 50)) * 100));
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                              {p.counselorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-bold text-gray-900">{p.counselorName}</div>
                              <div className="text-xs text-gray-500">{p.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {p.handledClasses.slice(0, 3).map(c => (
                              <span key={c} className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {c}
                              </span>
                            ))}
                            {p.handledClasses.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 font-semibold">
                                +{p.handledClasses.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {p.languagesKnown.map(l => (
                              <span key={l} className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {l}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-5 py-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {p.regions.slice(0, 2).map(r => (
                              <span key={r} className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                {r}
                              </span>
                            ))}
                            {p.regions.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 font-semibold">
                                +{p.regions.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="w-36">
                            <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                              <span>Active: <b>{p.currentActiveLeads}</b> / {p.maxActiveLeads}</span>
                              <span>{capacityPercent}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  capacityPercent > 85 ? 'bg-rose-500' : capacityPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} 
                                style={{ width: `${capacityPercent}%` }}
                              ></div>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">
                              Today: {p.assignedCountToday} / {p.dailyLeadCapacity} max
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStatus(p.userId, p.isActive)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                              p.isActive 
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${p.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                            <span>{p.isActive ? 'Available' : 'On Leave'}</span>
                          </button>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditModal(p)}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-xs border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit Skills</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE MATCH SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Criteria Inputs */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-gray-900 text-base">Student Lead Parameters</h3>
            </div>
            <p className="text-xs text-gray-500">
              Test how the auto-assignment engine evaluates student inquiries across diverse classes, languages, regions, and community backgrounds.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Class / Grade Applying For
              </label>
              <select
                value={simCriteria.gradeInterested}
                onChange={e => setSimCriteria(prev => ({ ...prev, gradeInterested: e.target.value }))}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                {availableGrades.filter(g => g !== 'All').map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Parent's Preferred Language
              </label>
              <select
                value={simCriteria.preferredLanguage}
                onChange={e => setSimCriteria(prev => ({ ...prev, preferredLanguage: e.target.value }))}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                {availableLanguages.filter(l => l !== 'All').map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Residential Region / Catchment Zone
              </label>
              <select
                value={simCriteria.region}
                onChange={e => setSimCriteria(prev => ({ ...prev, region: e.target.value }))}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                {availableRegions.filter(r => r !== 'All').map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Religion / Cultural Affinity (Optional)
              </label>
              <select
                value={simCriteria.religion}
                onChange={e => setSimCriteria(prev => ({ ...prev, religion: e.target.value }))}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                {availableReligions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <button
              onClick={runSimulation}
              disabled={simLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{simLoading ? 'Evaluating Compatibility...' : 'Simulate Match Compatibility'}</span>
            </button>
          </div>

          {/* Ranked Results */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span>Ranked Counselor Compatibility</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                  {simResults.length} Evaluated
                </span>
              </h3>
              <span className="text-xs text-gray-500">Highest compatibility selected first</span>
            </div>

            {simLoading ? (
              <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-200">
                <Sparkles className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                Evaluating candidate skill profiles using Artificial Intelligence match scoring...
              </div>
            ) : simResults.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center text-gray-500 border border-gray-200">
                Click "Simulate Match Compatibility" to preview ranked counselors.
              </div>
            ) : (() => {
              const topMatch = simResults.find((c, idx) => idx === 0 && c.isEligible && c.totalScore >= (config?.minimumMatchThreshold || 40));
              const coMatch = simResults.find(c => c.userId !== topMatch?.userId && (c.isRecommendedCoCounselor || (c.isEligible && c.totalScore >= (config?.minimumMatchThreshold || 40) * 0.7)));

              return (
                <div className="space-y-4">
                  {/* AI Counselor Team Dual-Card Hero */}
                  {topMatch && coMatch && (
                    <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-indigo-700/50">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-indigo-400" />
                          <span className="text-xs font-black uppercase tracking-wider text-indigo-200">AI Counselor Team Pairing</span>
                        </div>
                        <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                          Dual-Coverage Active
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Primary Counselor Card */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15">
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-500 text-white uppercase tracking-wider">
                              Primary Counselor
                            </span>
                            <span className="text-xl font-black text-indigo-300">{topMatch.totalScore}% Match</span>
                          </div>
                          <h4 className="text-base font-bold text-white">{topMatch.counselorName}</h4>
                          <p className="text-xs text-indigo-200 mt-0.5">{topMatch.email}</p>
                          <div className="mt-2.5 p-2 rounded-lg bg-black/20 border border-white/10 text-xs text-indigo-100">
                            <strong>AI Match Rationale: </strong>{topMatch.aiAnalysis || topMatch.matchSummary}
                          </div>
                        </div>

                        {/* Co-Counselor Card */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-teal-500/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-teal-500 text-white uppercase tracking-wider">
                              👥 Recommended Co-Counselor
                            </span>
                            <span className="text-xl font-black text-teal-300">{coMatch.totalScore}% Match</span>
                          </div>
                          <h4 className="text-base font-bold text-white">{coMatch.counselorName}</h4>
                          <p className="text-xs text-teal-200 mt-0.5">{coMatch.email}</p>
                          <div className="mt-2.5 p-2 rounded-lg bg-black/20 border border-teal-500/20 text-xs text-teal-100">
                            <strong>AI Synergy: </strong>{coMatch.coCounselorSynergy || `Complementary pairing (${coMatch.totalScore}% compatibility) providing backup and regional coverage.`}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Complete Candidate List */}
                  <div className="space-y-3">
                    {simResults.map((candidate, idx) => {
                      const isTopMatch = candidate.userId === topMatch?.userId;
                      const isCoMatch = candidate.userId === coMatch?.userId;

                      return (
                        <div 
                          key={candidate.userId}
                          className={`p-4 rounded-xl border transition-all ${
                            isTopMatch 
                              ? 'bg-indigo-50/60 border-indigo-300 shadow-sm ring-2 ring-indigo-500/20' 
                              : isCoMatch
                              ? 'bg-teal-50/50 border-teal-300 shadow-xs'
                              : candidate.isEligible 
                              ? 'bg-white border-gray-200 hover:border-gray-300'
                              : 'bg-gray-50 border-gray-200 opacity-60'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                                isTopMatch 
                                  ? 'bg-indigo-600 text-white shadow-xs' 
                                  : isCoMatch
                                  ? 'bg-teal-600 text-white shadow-xs'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                #{idx + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-gray-900 text-sm">{candidate.counselorName}</h4>
                                  {isTopMatch && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                                      Primary Match
                                    </span>
                                  )}
                                  {isCoMatch && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-600 text-white">
                                      👥 Recommended Co-Counselor
                                    </span>
                                  )}
                                  {!candidate.isEligible && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                      Ineligible: {candidate.ineligibilityReason}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{candidate.email}</p>
                              </div>
                            </div>

                            <div className="flex items-baseline gap-2 self-start sm:self-auto">
                              <span className={`text-2xl font-black ${
                                candidate.totalScore >= 80 ? 'text-emerald-600' :
                                candidate.totalScore >= 50 ? 'text-blue-600' : 'text-gray-600'
                              }`}>
                                {candidate.totalScore}%
                              </span>
                              <span className="text-xs text-gray-500">AI Compatibility</span>
                            </div>
                          </div>

                          {/* Score Breakdown Bars */}
                          <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-gray-100 text-center">
                            <div className="p-2 rounded bg-slate-50 border border-slate-200">
                              <span className="text-[10px] text-gray-500 font-semibold block">Class Match</span>
                              <span className="font-bold text-xs text-gray-900">{candidate.gradeScore} / {config?.gradeWeight || 35}</span>
                            </div>
                            <div className="p-2 rounded bg-slate-50 border border-slate-200">
                              <span className="text-[10px] text-gray-500 font-semibold block">Language</span>
                              <span className="font-bold text-xs text-gray-900">{candidate.languageScore} / {config?.languageWeight || 25}</span>
                            </div>
                            <div className="p-2 rounded bg-slate-50 border border-slate-200">
                              <span className="text-[10px] text-gray-500 font-semibold block">Region</span>
                              <span className="font-bold text-xs text-gray-900">{candidate.regionScore} / {config?.regionWeight || 20}</span>
                            </div>
                            <div className="p-2 rounded bg-slate-50 border border-slate-200">
                              <span className="text-[10px] text-gray-500 font-semibold block">Community</span>
                              <span className="font-bold text-xs text-gray-900">{candidate.religionScore} / {config?.religionWeight || 10}</span>
                            </div>
                            <div className="p-2 rounded bg-slate-50 border border-slate-200">
                              <span className="text-[10px] text-gray-500 font-semibold block">Load Balance</span>
                              <span className="font-bold text-xs text-gray-900">{candidate.workloadScore} / {config?.workloadBalanceWeight || 10}</span>
                            </div>
                          </div>

                          {/* Match explanation & Synergy */}
                          <div className="mt-2 text-xs text-gray-600 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{candidate.aiAnalysis || candidate.matchSummary}</span>
                            </div>
                            {candidate.coCounselorSynergy && (
                              <div className="flex items-center gap-1.5 text-teal-700 font-medium">
                                <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span>Synergy: {candidate.coCounselorSynergy}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 3: ASSIGNMENT RULES & WEIGHTS */}
      {activeTab === 'rules' && config && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 max-w-3xl">
          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div className="pb-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-lg">Auto-Assignment Algorithm Rules & Weights</h3>
              <p className="text-xs text-gray-500 mt-1">
                Customize the percentage weighting assigned to each matching parameter. The total must equal 100%.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="font-bold text-sm text-gray-900">Enable Skill-Based Auto-Assignment</div>
                  <div className="text-xs text-gray-500">Automatically assign web and external webhook inquiries to the top-scoring counselor</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.isAutoAssignmentEnabled} 
                    onChange={e => setConfig({ ...config, isAutoAssignmentEnabled: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50/60 rounded-xl border border-purple-200">
                <div>
                  <div className="font-bold text-sm text-purple-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>AI Compatibility Scoring Engine</span>
                  </div>
                  <div className="text-xs text-purple-800">Use Artificial Intelligence to compute multi-factor compatibility scores and evaluate counselor synergy</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.useAiScoring !== false} 
                    onChange={e => setConfig({ ...config, useAiScoring: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-teal-50/60 rounded-xl border border-teal-200">
                <div>
                  <div className="font-bold text-sm text-teal-950 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-teal-600" />
                    <span>Auto-Assign Co-Counselor (Dual-Coverage)</span>
                  </div>
                  <div className="text-xs text-teal-800">Automatically pair a recommended Co-Counselor to assist with language, region, or curriculum coverage</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.autoAssignCoCounselor !== false} 
                    onChange={e => setConfig({ ...config, autoAssignCoCounselor: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>Class / Grade Match Weight</span>
                  <span className="text-blue-600 font-extrabold">{config.gradeWeight}%</span>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={60} 
                  value={config.gradeWeight} 
                  onChange={e => setConfig({ ...config, gradeWeight: parseInt(e.target.value) || 0 })}
                  className="w-full accent-blue-600" 
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>Preferred Language Match Weight</span>
                  <span className="text-blue-600 font-extrabold">{config.languageWeight}%</span>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={50} 
                  value={config.languageWeight} 
                  onChange={e => setConfig({ ...config, languageWeight: parseInt(e.target.value) || 0 })}
                  className="w-full accent-blue-600" 
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>Region / Catchment Zone Weight</span>
                  <span className="text-blue-600 font-extrabold">{config.regionWeight}%</span>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={40} 
                  value={config.regionWeight} 
                  onChange={e => setConfig({ ...config, regionWeight: parseInt(e.target.value) || 0 })}
                  className="w-full accent-blue-600" 
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>Religion / Cultural Context Weight</span>
                  <span className="text-blue-600 font-extrabold">{config.religionWeight}%</span>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={30} 
                  value={config.religionWeight} 
                  onChange={e => setConfig({ ...config, religionWeight: parseInt(e.target.value) || 0 })}
                  className="w-full accent-blue-600" 
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>Workload Balancing Weight</span>
                  <span className="text-blue-600 font-extrabold">{config.workloadBalanceWeight}%</span>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={30} 
                  value={config.workloadBalanceWeight} 
                  onChange={e => setConfig({ ...config, workloadBalanceWeight: parseInt(e.target.value) || 0 })}
                  className="w-full accent-blue-600" 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                <span>Minimum Compatibility Threshold</span>
                <span className="text-indigo-600 font-extrabold">{config.minimumMatchThreshold}%</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Leads whose best match score falls below this threshold will be routed to the fallback queue for manual assignment.
              </p>
              <input 
                type="range" 
                min={20} 
                max={80} 
                value={config.minimumMatchThreshold} 
                onChange={e => setConfig({ ...config, minimumMatchThreshold: parseInt(e.target.value) || 40 })}
                className="w-full accent-indigo-600" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Designated Fallback Counselor
              </label>
              <select
                value={config.fallbackCounselorId || ''}
                onChange={e => setConfig({ ...config, fallbackCounselorId: e.target.value || undefined })}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">General Unassigned Queue</option>
                {profiles.map(p => (
                  <option key={p.userId} value={p.userId}>
                    {p.counselorName} ({p.email})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition shadow-xs"
            >
              Save Algorithm Weights & Settings
            </button>
          </form>
        </div>
      )}

      {/* COUNSELOR SKILL EDIT MODAL */}
      {isEditModalOpen && selectedProfile && (
        <div className="fixed z-30 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-xs transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-2xl px-6 pt-5 pb-6 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              
              <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Edit Counselor Skills: {formData.counselorName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{formData.email}</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
                {/* Languages Known */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-blue-600" />
                    <span>Languages Known</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    {availableLanguages.map(lang => {
                      const isSelected = formData.languagesKnown.includes(lang);
                      return (
                        <button
                          type="button"
                          key={lang}
                          onClick={() => toggleArrayItem('languagesKnown', lang)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            isSelected 
                              ? 'bg-blue-600 text-white shadow-2xs' 
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Handled Classes */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Handled Classes & Grades</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-36 overflow-y-auto">
                    {availableGrades.map(grade => {
                      const isSelected = formData.handledClasses.includes(grade);
                      return (
                        <button
                          type="button"
                          key={grade}
                          onClick={() => toggleArrayItem('handledClasses', grade)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            isSelected 
                              ? 'bg-indigo-600 text-white shadow-2xs' 
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {grade}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Regions / Zones */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>Regions / Catchment Zones</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200 max-h-32 overflow-y-auto">
                    {availableRegions.map(region => {
                      const isSelected = formData.regions.includes(region);
                      return (
                        <button
                          type="button"
                          key={region}
                          onClick={() => toggleArrayItem('regions', region)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            isSelected 
                              ? 'bg-amber-600 text-white shadow-2xs' 
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {region}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Religion / Community */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-600" />
                    <span>Religion / Community Affinity</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    {availableReligions.map(rel => {
                      const isSelected = formData.religions.includes(rel);
                      return (
                        <button
                          type="button"
                          key={rel}
                          onClick={() => toggleArrayItem('religions', rel)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            isSelected 
                              ? 'bg-rose-600 text-white shadow-2xs' 
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {rel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Capacity & Limits */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Daily Lead Intake Cap
                    </label>
                    <input 
                      type="number"
                      min={1}
                      max={100}
                      value={formData.dailyLeadCapacity}
                      onChange={e => setFormData({ ...formData, dailyLeadCapacity: parseInt(e.target.value) || 15 })}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Max Concurrent Active Leads
                    </label>
                    <input 
                      type="number"
                      min={1}
                      max={200}
                      value={formData.maxActiveLeads}
                      onChange={e => setFormData({ ...formData, maxActiveLeads: parseInt(e.target.value) || 50 })}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-xs font-semibold text-gray-700">Counselor Availability Status</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                      formData.isActive 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {formData.isActive ? 'Active (Receiving Leads)' : 'On Leave (Bypassed)'}
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                  >
                    Save Skill Matrix
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
