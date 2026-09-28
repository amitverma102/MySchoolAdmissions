import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Megaphone, 
  Sparkles, 
  Lightbulb, 
  Calendar, 
  Layers, 
  MapPin, 
  Radio, 
  BookOpen, 
  Sliders, 
  MessageSquare, 
  QrCode, 
  RefreshCw, 
  School,
  X
} from 'lucide-react';
import api from '../lib/api';
import type { 
  Campaign, 
  CampaignDashboardSummary, 
  CampaignRecommendation, 
  CampaignIdea, 
  CampaignCalendarEvent,
  GeographyPerformance,
  ChannelPerformance,
  CampaignLearning
} from '../types/campaign';

// Modular Components
import { CampaignOverviewDashboard } from '../components/campaign/CampaignOverviewDashboard';
import { CampaignsTable } from '../components/campaign/CampaignsTable';
import { AICampaignRecommendations } from '../components/campaign/AICampaignRecommendations';
import { AICampaignGeneratorModal } from '../components/campaign/AICampaignGeneratorModal';
import { AICampaignIdeas } from '../components/campaign/AICampaignIdeas';
import { CampaignCalendarView } from '../components/campaign/CampaignCalendarView';
import { CampaignFunnelAttribution } from '../components/campaign/CampaignFunnelAttribution';
import { CampaignGeographyView } from '../components/campaign/CampaignGeographyView';
import { CampaignChannelIntelligence } from '../components/campaign/CampaignChannelIntelligence';
import { CampaignLearningsView } from '../components/campaign/CampaignLearningsView';
import { CampaignCopilotDrawer } from '../components/campaign/CampaignCopilotDrawer';
import { CampaignQrCodeModal } from '../components/campaign/CampaignQrCodeModal';
import { CampaignDiagnosisModal } from '../components/campaign/CampaignDiagnosisModal';
import { CampaignAutopilotSettings } from '../components/campaign/CampaignAutopilotSettings';

export default function Campaigns() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Core Datasets
  const [summary, setSummary] = useState<CampaignDashboardSummary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recommendations, setRecommendations] = useState<CampaignRecommendation[]>([]);
  const [ideas, setIdeas] = useState<CampaignIdea[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CampaignCalendarEvent[]>([]);
  const [geographies, setGeographies] = useState<GeographyPerformance[]>([]);
  const [channels, setChannels] = useState<ChannelPerformance[]>([]);
  const [learnings, setLearnings] = useState<CampaignLearning[]>([]);

  // Loading States
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingGeographies, setLoadingGeographies] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingLearnings, setLoadingLearnings] = useState(false);

  // Modals & Drawers
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorPresetRec, setGeneratorPresetRec] = useState<CampaignRecommendation | null>(null);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedQrCampaign, setSelectedQrCampaign] = useState<Campaign | undefined>(undefined);
  const [isDiagnosisOpen, setIsDiagnosisOpen] = useState(false);
  const [diagnosingCampaign, setDiagnosingCampaign] = useState<Campaign | null>(null);

  // Manual Creation Modal
  const [isManualCreateOpen, setIsManualCreateOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualType, setManualType] = useState('Digital');
  const [manualChannel, setManualChannel] = useState('Facebook');
  const [manualBudget, setManualBudget] = useState('30000');
  const [manualGrades, setManualGrades] = useState('Grade 1,Grade 2');
  const [manualStartDate, setManualStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualEndDate, setManualEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);

  // Tenant & Institution Context
  const [activeInstitutionId, setActiveInstitutionId] = useState<string | null>(() => {
    const id = localStorage.getItem('selectedInstitutionId');
    return id && id !== 'all' ? id : null;
  });
  const [activeInstitutionName, setActiveInstitutionName] = useState<string>(() => {
    return localStorage.getItem('selectedInstitutionName') || 'Assigned Institution';
  });
  const [selectedSession, setSelectedSession] = useState('2026–2027');

  useEffect(() => {
    fetchAll();

    const handleTenantChanged = (e: any) => {
      const newId = e?.detail?.id ?? localStorage.getItem('selectedInstitutionId');
      const newName = e?.detail?.name ?? localStorage.getItem('selectedInstitutionName');
      setActiveInstitutionId(newId && newId !== 'all' ? newId : null);
      if (newName) setActiveInstitutionName(newName);
    };

    window.addEventListener('tenantChanged', handleTenantChanged);
    return () => {
      window.removeEventListener('tenantChanged', handleTenantChanged);
    };
  }, [activeInstitutionId, selectedSession]);

  const fetchAll = () => {
    fetchSummary();
    fetchCampaigns();
    fetchRecommendations();
    fetchIdeas();
    fetchCalendar();
    fetchGeography();
    fetchChannels();
    fetchLearnings();
  };

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const params: Record<string, string> = { session: selectedSession };
      if (activeInstitutionId) {
        params.institutionId = activeInstitutionId;
      }
      const res = await api.get('/api/campaigns/intelligence/summary', { params });
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load summary', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const params: Record<string, string> = { session: selectedSession };
      if (activeInstitutionId) {
        params.institutionId = activeInstitutionId;
      }
      const res = await api.get('/api/campaigns', { params });
      setCampaigns(res.data);
    } catch (err) {
      console.error('Failed to load campaigns', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const res = await api.get('/api/campaigns/intelligence/recommendations');
      setRecommendations(res.data);
    } catch (err) {
      console.error('Failed to load recommendations', err);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const fetchIdeas = async () => {
    setLoadingIdeas(true);
    try {
      const res = await api.get('/api/campaigns/intelligence/ideas');
      setIdeas(res.data);
    } catch (err) {
      console.error('Failed to load ideas', err);
    } finally {
      setLoadingIdeas(false);
    }
  };

  const fetchCalendar = async () => {
    setLoadingCalendar(true);
    try {
      const res = await api.get('/api/campaigns/intelligence/calendar');
      setCalendarEvents(res.data);
    } catch (err) {
      console.error('Failed to load calendar', err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const fetchGeography = async () => {
    setLoadingGeographies(true);
    try {
      const res = await api.get('/api/campaigns/intelligence/geography');
      setGeographies(res.data);
    } catch (err) {
      console.error('Failed to load geography', err);
    } finally {
      setLoadingGeographies(false);
    }
  };

  const fetchChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await api.get('/api/campaigns/intelligence/channels');
      setChannels(res.data);
    } catch (err) {
      console.error('Failed to load channels', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const fetchLearnings = async () => {
    setLoadingLearnings(true);
    try {
      const res = await api.get('/api/campaigns/intelligence/learnings');
      setLearnings(res.data);
    } catch (err) {
      console.error('Failed to load learnings', err);
    } finally {
      setLoadingLearnings(false);
    }
  };

  // Actions
  const handleActionRecommendation = async (id: string, action: 'Adopted' | 'Dismissed') => {
    try {
      await api.post(`/api/campaigns/intelligence/recommendations/${id}/action`, {
        action,
        performedBy: 'Marketing Lead'
      });
      fetchRecommendations();
    } catch (err) {
      console.error('Failed to action recommendation', err);
    }
  };

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    try {
      await api.post(`/api/campaigns/${campaignId}/status`, { status: newStatus });
      fetchCampaigns();
      fetchSummary();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await api.delete(`/api/campaigns/${campaignId}`);
      fetchCampaigns();
      fetchSummary();
    } catch (err) {
      console.error('Failed to delete campaign', err);
    }
  };

  const handleSaveLearning = async (learning: CampaignLearning) => {
    try {
      await api.post('/api/campaigns/intelligence/learnings', learning);
      fetchLearnings();
    } catch (err) {
      console.error('Failed to save learning', err);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/campaigns', {
        name: manualName,
        type: manualType,
        schoolName: activeInstitutionName,
        academicSession: selectedSession,
        budget: parseFloat(manualBudget) || 0,
        primaryChannel: manualChannel,
        channels: manualChannel,
        targetGrades: manualGrades,
        startDate: new Date(manualStartDate).toISOString(),
        endDate: new Date(manualEndDate).toISOString(),
        status: 'Scheduled'
      });
      setIsManualCreateOpen(false);
      setManualName('');
      fetchCampaigns();
      fetchSummary();
    } catch (err) {
      console.error('Failed to manually create campaign', err);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview & Funnel', icon: BarChart3 },
    { id: 'campaigns', label: 'All Campaigns', icon: Megaphone, count: campaigns.length },
    { id: 'recommendations', label: 'AI Recommendations', icon: Sparkles, badge: recommendations.filter((r: CampaignRecommendation) => r.status === 'Pending').length },
    { id: 'ideas', label: 'Campaign Ideas', icon: Lightbulb },
    { id: 'calendar', label: 'Calendar & Timeline', icon: Calendar },
    { id: 'attribution', label: 'Multi-Touch Attribution', icon: Layers },
    { id: 'geography', label: 'Geography & PIN Codes', icon: MapPin },
    { id: 'channels', label: 'Channel Matrix', icon: Radio },
    { id: 'learnings', label: 'Knowledge Base', icon: BookOpen },
    { id: 'autopilot', label: 'Autopilot & Safety', icon: Sliders },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Bar with Branding & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white shadow-md">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Campaign Management & Intelligence</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Omnichannel Marketing Automation: Leads $\rightarrow$ Qualified $\rightarrow$ Visits $\rightarrow$ Applications $\rightarrow$ Admissions
            </p>
          </div>
        </div>

        {/* Global Selectors & Fast Launch Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Active Institution Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 border border-indigo-200/80 rounded-xl font-medium text-indigo-900 shadow-sm">
            <School className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold text-xs text-indigo-950 truncate max-w-[280px]">
              {activeInstitutionName}
            </span>
          </div>

          {/* Session Selector */}
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900 focus:outline-none"
          >
            <option value="2026–2027">Session 2026–2027</option>
            <option value="2025–2026">Session 2025–2026</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchAll}
            title="Refresh Intelligence Data"
            className="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* AI Copilot Button */}
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-indigo-600" /> Copilot
          </button>

          {/* Offline QR Button */}
          <button
            onClick={() => { setSelectedQrCampaign(undefined); setIsQrModalOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition"
          >
            <QrCode className="w-4 h-4 text-gray-500" /> QR Codes
          </button>

          {/* AI Generator Button */}
          <button
            onClick={() => { setGeneratorPresetRec(null); setIsGeneratorOpen(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" /> AI Campaign Generator
          </button>
        </div>
      </div>

      {/* Tab Navigation Ribbon */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto no-scrollbar text-xs font-semibold">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition ${
                isActive
                  ? 'border-blue-600 text-blue-700 font-bold bg-blue-50/40 rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-gray-700">
                  {tab.count}
                </span>
              )}
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content Panels */}
      <div>
        {activeTab === 'overview' && (
          <CampaignOverviewDashboard
            summary={summary}
            loading={loadingSummary}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenGenerator={() => setIsGeneratorOpen(true)}
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignsTable
            campaigns={campaigns}
            loading={loadingCampaigns}
            onSelectCampaignDiagnosis={(c) => {
              setDiagnosingCampaign(c);
              setIsDiagnosisOpen(true);
            }}
            onOpenQrModal={(c) => {
              setSelectedQrCampaign(c);
              setIsQrModalOpen(true);
            }}
            onStatusChange={handleStatusChange}
            onDeleteCampaign={handleDeleteCampaign}
            onOpenCreateModal={() => setIsManualCreateOpen(true)}
            onOpenGeneratorModal={() => setIsGeneratorOpen(true)}
          />
        )}

        {activeTab === 'recommendations' && (
          <AICampaignRecommendations
            recommendations={recommendations}
            loading={loadingRecommendations}
            onActionRecommendation={handleActionRecommendation}
            onOpenGeneratorWithPrompt={(rec) => {
              setGeneratorPresetRec(rec);
              setIsGeneratorOpen(true);
            }}
          />
        )}

        {activeTab === 'ideas' && (
          <AICampaignIdeas
            ideas={ideas}
            loading={loadingIdeas}
            onLaunchIdea={(idea) => {
              setGeneratorPresetRec({
                id: idea.id,
                title: idea.ideaTitle,
                category: 'NewCampaign',
                description: idea.reasonForRecommendation,
                supportingEvidence: idea.historicalEvidence,
                historicalPeriod: 'Active Cycle',
                sampleSize: 300,
                confidenceLevel: idea.confidenceLevel,
                expectedImpact: `${idea.expectedEnrollments} Admissions`,
                assumptions: 'Based on current admissions gap',
                suggestedBudget: idea.estimatedBudget,
                targetChannel: idea.recommendedChannel,
                targetGeography: idea.targetGeography,
                status: 'Pending',
                createdAt: new Date().toISOString()
              });
              setIsGeneratorOpen(true);
            }}
          />
        )}

        {activeTab === 'calendar' && (
          <CampaignCalendarView
            events={calendarEvents}
            loading={loadingCalendar}
          />
        )}

        {activeTab === 'attribution' && (
          <CampaignFunnelAttribution />
        )}

        {activeTab === 'geography' && (
          <CampaignGeographyView
            geographies={geographies}
            loading={loadingGeographies}
          />
        )}

        {activeTab === 'channels' && (
          <CampaignChannelIntelligence
            channels={channels}
            loading={loadingChannels}
          />
        )}

        {activeTab === 'learnings' && (
          <CampaignLearningsView
            learnings={learnings}
            loading={loadingLearnings}
            onSaveLearning={handleSaveLearning}
          />
        )}

        {activeTab === 'autopilot' && (
          <CampaignAutopilotSettings
            onKillSwitchTriggered={() => {
              fetchCampaigns();
              fetchSummary();
              setActiveTab('campaigns');
            }}
          />
        )}
      </div>

      {/* AI Campaign Generator Modal */}
      <AICampaignGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onCampaignCreated={() => {
          fetchCampaigns();
          fetchSummary();
          setActiveTab('campaigns');
        }}
        initialRecommendation={generatorPresetRec}
        institutionName={activeInstitutionName}
        institutionId={activeInstitutionId}
      />

      {/* Interactive AI Copilot Drawer */}
      <CampaignCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        institutionName={activeInstitutionName}
      />

      {/* Offline QR Code Generator Modal */}
      <CampaignQrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        selectedCampaign={selectedQrCampaign}
        institutionId={activeInstitutionId}
        institutionName={activeInstitutionName}
      />

      {/* Campaign Diagnosis Modal ("Why did this perform this way?") */}
      <CampaignDiagnosisModal
        isOpen={isDiagnosisOpen}
        onClose={() => setIsDiagnosisOpen(false)}
        campaign={diagnosingCampaign}
      />

      {/* Standard Custom Campaign Creation Modal */}
      {isManualCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg p-6 text-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-gray-900">Create Custom Admissions Campaign</h3>
              <button onClick={() => setIsManualCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualCreate} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Nursery Early Admission Drive 2026"
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Campaign Type</label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  >
                    <option value="Digital">Digital</option>
                    <option value="Offline">Offline</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Referral">Referral</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Primary Channel</label>
                  <select
                    value={manualChannel}
                    onChange={(e) => setManualChannel(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  >
                    <option value="Facebook">Facebook & Instagram</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Society Event">Society Event / Club House</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Mall Kiosk">Mall Kiosk</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Budget (₹)</label>
                  <input
                    type="number"
                    required
                    value={manualBudget}
                    onChange={(e) => setManualBudget(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Target Grades</label>
                  <input
                    type="text"
                    value={manualGrades}
                    onChange={(e) => setManualGrades(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={manualStartDate}
                    onChange={(e) => setManualStartDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={manualEndDate}
                    onChange={(e) => setManualEndDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsManualCreateOpen(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
