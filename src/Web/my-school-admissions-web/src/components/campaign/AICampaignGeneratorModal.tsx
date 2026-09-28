import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  MessageSquare, 
  Mail, 
  Search, 
  PhoneCall, 
  Share2, 
  GraduationCap
} from 'lucide-react';
import type { CreateAiCampaignRequest, AiCampaignResult, CampaignRecommendation } from '../../types/campaign';
import api from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: () => void;
  initialRecommendation?: CampaignRecommendation | null;
  institutionName?: string;
  institutionId?: string | null;
}

export const AICampaignGeneratorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCampaignCreated,
  initialRecommendation,
  institutionName,
  institutionId
}) => {
  const [objective, setObjective] = useState('LeadGeneration');
  const [schoolName, setSchoolName] = useState(
    institutionName || localStorage.getItem('selectedInstitutionName') || 'Delhi International School'
  );

  React.useEffect(() => {
    if (institutionName) {
      setSchoolName(institutionName);
    }
  }, [institutionName]);
  const [campusName] = useState('Main Campus');
  const [academicSession, setAcademicSession] = useState('2026–2027');
  const [targetGrades, setTargetGrades] = useState(
    initialRecommendation?.targetChannel.includes('Society') 
      ? 'Grade 3,Grade 4,Grade 5' 
      : 'Nursery,Kindergarten,Grade 1'
  );
  const [targetGeography, setTargetGeography] = useState(
    initialRecommendation?.targetGeography || 'Indiranagar & Sector 14 (0-5 km)'
  );
  const [budget, setBudget] = useState(
    initialRecommendation?.suggestedBudget?.toString() || '35000'
  );
  const [durationDays] = useState(30);
  const [preferredChannels, setPreferredChannels] = useState('Facebook,Instagram,WhatsApp');
  const [specialOffer, setSpecialOffer] = useState('Early Bird Seat Registration Fee Waiver & Campus Tour Kit');

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<AiCampaignResult | null>(null);
  const [activeChannelTab, setActiveChannelTab] = useState<'whatsapp' | 'meta' | 'google' | 'email' | 'script'>('whatsapp');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const payload: CreateAiCampaignRequest = {
        objective,
        schoolName,
        campusName,
        academicSession,
        targetGrades,
        targetGeography,
        budget: parseFloat(budget) || 35000,
        durationDays,
        preferredChannels,
        specialOffer
      };

      const res = await api.post('/api/campaigns/intelligence/generate', payload);
      setGeneratedResult(res.data);
    } catch (err) {
      console.error('Failed to generate AI campaign', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!generatedResult) return;
    setSaving(true);
    try {
      await api.post('/api/campaigns', {
        name: generatedResult.campaignName,
        type: preferredChannels.includes('Society') ? 'Hybrid' : 'Digital',
        objective: generatedResult.objective,
        schoolName,
        campusName,
        academicSession,
        institutionId: institutionId || undefined,
        targetAdmissionCycle: 'Cycle 1 (April 2026)',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + durationDays * 86400000).toISOString(),
        budget: generatedResult.recommendedBudget,
        status: 'Scheduled',
        priority: 'High',
        primaryChannel: preferredChannels.split(',')[0].trim(),
        channels: preferredChannels,
        targetGrades,
        targetGeography,
        isAiGenerated: true,
        aiConfidenceScore: generatedResult.confidenceScore,
        aiStrategySummary: generatedResult.strategySummary,
        expectedLeads: generatedResult.expectedLeads,
        expectedVisits: generatedResult.expectedVisits,
        expectedEnrollments: generatedResult.expectedEnrollments,
        utmSource: 'ai_generator',
        utmMedium: 'omnichannel',
        utmCampaign: generatedResult.campaignName.toLowerCase().replace(/[^a-z0-9]/g, '_')
      });

      onCampaignCreated();
      onClose();
    } catch (err) {
      console.error('Failed to save AI campaign', err);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">AI Admissions Campaign & Content Generator</h2>
              <p className="text-xs text-blue-200">Synthesize strategy, multi-channel ad copy, WhatsApp triggers, and counselor phone scripts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Top Form Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Campaign Objective</label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="LeadGeneration">Lead Generation (Volume)</option>
                <option value="CampusVisits">Campus Visits / Open House</option>
                <option value="ApplicationGeneration">Direct Application Push</option>
                <option value="EarlyAdmission">Early Bird Admissions</option>
                <option value="ScholarshipPromotion">Merit / STEM Scholarship</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">School & Campus</label>
              <input
                type="text"
                value={`${schoolName} (${campusName})`}
                disabled
                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Academic Session</label>
              <input
                type="text"
                value={academicSession}
                onChange={(e) => setAcademicSession(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Target Grades</label>
              <input
                type="text"
                value={targetGrades}
                onChange={(e) => setTargetGrades(e.target.value)}
                placeholder="e.g. Nursery, Kindergarten, Grade 1"
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Target Catchment / Geo</label>
              <input
                type="text"
                value={targetGeography}
                onChange={(e) => setTargetGeography(e.target.value)}
                placeholder="e.g. Sector 14, 0-5 km"
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Allocated Budget (₹)</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white font-semibold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Special Parent Offer / Incentive Hook</label>
              <input
                type="text"
                value={specialOffer}
                onChange={(e) => setSpecialOffer(e.target.value)}
                placeholder="e.g. Early Bird Registration Waiver & Campus Tour Gift Kit"
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Channels</label>
              <input
                type="text"
                value={preferredChannels}
                onChange={(e) => setPreferredChannels(e.target.value)}
                placeholder="Facebook,Instagram,WhatsApp,Society"
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition disabled:opacity-50 text-xs"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Synthesizing High-Converting Campaign Strategy...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" /> Generate Omnichannel Campaign & Copy
                </>
              )}
            </button>
          </div>

          {/* Generated Results Preview */}
          {generatedResult && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              {/* Strategy & Forecast Pill Header */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">AI Generated Strategy Plan</span>
                    <h3 className="text-sm font-bold text-gray-900">{generatedResult.campaignName}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                      {Math.round(generatedResult.confidenceScore * 100)}% Confidence
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-700 mb-3 leading-relaxed">
                  {generatedResult.strategySummary}
                </p>

                {/* Forecast Funnel Pills */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-blue-200/60 text-center">
                  <div className="p-2 bg-white/80 rounded-lg">
                    <span className="text-[10px] text-gray-500 block">Forecast Leads</span>
                    <span className="text-sm font-bold text-blue-900">{generatedResult.expectedLeads}</span>
                  </div>
                  <div className="p-2 bg-white/80 rounded-lg">
                    <span className="text-[10px] text-gray-500 block">Expected Visits</span>
                    <span className="text-sm font-bold text-amber-800">{generatedResult.expectedVisits}</span>
                  </div>
                  <div className="p-2 bg-white/80 rounded-lg">
                    <span className="text-[10px] text-gray-500 block">Expected Admissions</span>
                    <span className="text-sm font-bold text-emerald-800">{generatedResult.expectedEnrollments}</span>
                  </div>
                </div>
              </div>

              {/* Multi-Channel Copy Tabs */}
              <div>
                <div className="flex border-b border-gray-200 gap-2 mb-3">
                  <button
                    onClick={() => setActiveChannelTab('whatsapp')}
                    className={`pb-2 px-3 font-bold border-b-2 flex items-center gap-1.5 transition ${
                      activeChannelTab === 'whatsapp'
                        ? 'border-emerald-600 text-emerald-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" /> WhatsApp & SMS
                  </button>
                  <button
                    onClick={() => setActiveChannelTab('meta')}
                    className={`pb-2 px-3 font-bold border-b-2 flex items-center gap-1.5 transition ${
                      activeChannelTab === 'meta'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Share2 className="w-4 h-4 text-blue-600" /> Meta (FB / Instagram)
                  </button>
                  <button
                    onClick={() => setActiveChannelTab('google')}
                    className={`pb-2 px-3 font-bold border-b-2 flex items-center gap-1.5 transition ${
                      activeChannelTab === 'google'
                        ? 'border-amber-600 text-amber-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Search className="w-4 h-4 text-amber-600" /> Google Search Ads
                  </button>
                  <button
                    onClick={() => setActiveChannelTab('email')}
                    className={`pb-2 px-3 font-bold border-b-2 flex items-center gap-1.5 transition ${
                      activeChannelTab === 'email'
                        ? 'border-purple-600 text-purple-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-purple-600" /> Parent Email
                  </button>
                  <button
                    onClick={() => setActiveChannelTab('script')}
                    className={`pb-2 px-3 font-bold border-b-2 flex items-center gap-1.5 transition ${
                      activeChannelTab === 'script'
                        ? 'border-red-600 text-red-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <PhoneCall className="w-4 h-4 text-red-600" /> Counselor Phone Script
                  </button>
                </div>

                {/* Tab 1: WhatsApp & SMS */}
                {activeChannelTab === 'whatsapp' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-emerald-600" /> Instant Interactive WhatsApp Invite
                        </span>
                        <button
                          onClick={() => copyToClipboard(generatedResult.whatsAppCopy, 'wa')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-[11px]"
                        >
                          {copiedKey === 'wa' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKey === 'wa' ? 'Copied!' : 'Copy WhatsApp'}
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-xs text-gray-800 bg-white p-3 rounded-lg border border-emerald-100 leading-relaxed">
                        {generatedResult.whatsAppCopy}
                      </pre>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-800">Direct SMS Alert</span>
                        <button
                          onClick={() => copyToClipboard(generatedResult.smsCopy, 'sms')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-[11px]"
                        >
                          {copiedKey === 'sms' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKey === 'sms' ? 'Copied!' : 'Copy SMS'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-200">
                        {generatedResult.smsCopy}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab 2: Meta FB / Instagram */}
                {activeChannelTab === 'meta' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-blue-900">Facebook / Instagram Feed Ad</span>
                        <button
                          onClick={() => copyToClipboard(`${generatedResult.headline}\n\n${generatedResult.facebookAdCopy}`, 'meta')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-blue-300 text-blue-800 hover:bg-blue-50 text-[11px]"
                        >
                          {copiedKey === 'meta' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKey === 'meta' ? 'Copied!' : 'Copy Meta Ad'}
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <span className="text-[10px] text-gray-400 block font-semibold uppercase">Headline</span>
                          <span className="font-bold text-gray-900">{generatedResult.headline}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-100">
                          <span className="text-[10px] text-gray-400 block font-semibold uppercase">Primary Ad Text</span>
                          <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed mt-1">
                            {generatedResult.facebookAdCopy}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase">Call To Action Button</span>
                          <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-[11px]">
                            {generatedResult.callToAction}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Google Search */}
                {activeChannelTab === 'google' && (
                  <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-950">Google Responsive Search Ad</span>
                      <button
                        onClick={() => copyToClipboard(`${generatedResult.googleHeadline1} | ${generatedResult.googleHeadline2}\n${generatedResult.googleDescription}`, 'goog')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 text-[11px]"
                      >
                        {copiedKey === 'goog' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'goog' ? 'Copied!' : 'Copy Search Ad'}
                      </button>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm space-y-1">
                      <span className="text-[11px] text-gray-500">Sponsored • https://www.myschooladmissions.com/apply</span>
                      <div className="text-sm font-bold text-blue-700 hover:underline cursor-pointer">
                        {generatedResult.googleHeadline1} | {generatedResult.googleHeadline2}
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        {generatedResult.googleDescription}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab 4: Email */}
                {activeChannelTab === 'email' && (
                  <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-950">Parent Outreach Email</span>
                      <button
                        onClick={() => copyToClipboard(`Subject: ${generatedResult.emailSubject}\n\n${generatedResult.emailBody}`, 'email')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-purple-300 text-purple-900 hover:bg-purple-50 text-[11px]"
                      >
                        {copiedKey === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'email' ? 'Copied!' : 'Copy Email'}
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-purple-100">
                      <span className="text-[10px] text-gray-400 block font-semibold uppercase">Subject Line</span>
                      <span className="font-bold text-gray-900">{generatedResult.emailSubject}</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-purple-100">
                      <span className="text-[10px] text-gray-400 block font-semibold uppercase mb-1">Body Text</span>
                      <pre className="whitespace-pre-wrap font-sans text-xs text-gray-800 leading-relaxed">
                        {generatedResult.emailBody}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Tab 5: Counselor Script */}
                {activeChannelTab === 'script' && (
                  <div className="p-4 bg-red-50/40 rounded-xl border border-red-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-950 flex items-center gap-1.5">
                        <PhoneCall className="w-4 h-4 text-red-600" /> Counselor 30-Minute Inbound Response Script
                      </span>
                      <button
                        onClick={() => copyToClipboard(generatedResult.counselorFollowupScript, 'script')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-red-300 text-red-900 hover:bg-red-50 text-[11px]"
                      >
                        {copiedKey === 'script' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey === 'script' ? 'Copied!' : 'Copy Script'}
                      </button>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-red-100 text-xs text-gray-800 italic leading-relaxed">
                      {generatedResult.counselorFollowupScript}
                    </div>
                    <div className="text-[11px] text-red-700 bg-red-100/60 p-2.5 rounded-lg border border-red-200">
                      💡 <strong>Counselor Tip:</strong> Calling within 30 minutes increases weekend tour confirmation from 38% to 72%.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-white text-xs transition"
          >
            Cancel
          </button>

          {generatedResult && (
            <button
              onClick={handleSaveCampaign}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50 text-xs"
            >
              {saving ? (
                <>Saving & Scheduling...</>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" /> Save as Active Campaign & Launch
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
