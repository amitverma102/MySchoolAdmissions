import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  CheckCircle2, 
  AlertOctagon, 
  Lock, 
  Save
} from 'lucide-react';
import type { CampaignAutopilotConfig } from '../../types/campaign';
import api from '../../lib/api';

interface Props {
  onKillSwitchTriggered: () => void;
}

export const CampaignAutopilotSettings: React.FC<Props> = ({ onKillSwitchTriggered }) => {
  const [config, setConfig] = useState<CampaignAutopilotConfig>({
    autopilotLevel: 2,
    maxMonthlyBudgetCap: 250000,
    maxSingleCampaignBudget: 60000,
    requireHumanApprovalForPublishing: true,
    emergencyPauseAllActive: false,
    approvedChannels: 'Facebook,Instagram,Google,WhatsApp,Society'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [killSwitchModalOpen, setKillSwitchModalOpen] = useState(false);
  const [killReason, setKillReason] = useState('');
  const [triggeringKill, setTriggeringKill] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/api/campaigns/intelligence/autopilot/config');
      setConfig(res.data);
    } catch (err) {
      console.error('Failed to load autopilot config', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/api/campaigns/intelligence/autopilot/config', config);
      setConfig(res.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save config', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerKillSwitch = async () => {
    setTriggeringKill(true);
    try {
      await api.post('/api/campaigns/intelligence/autopilot/pause-all', {
        reason: killReason || 'Emergency Kill-Switch triggered by marketing director',
        performedBy: 'Safety Officer / Principal'
      });
      setKillSwitchModalOpen(false);
      onKillSwitchTriggered();
    } catch (err) {
      console.error('Failed to trigger kill switch', err);
    } finally {
      setTriggeringKill(false);
    }
  };

  const levels = [
    { level: 1, title: 'Level 1: Recommend Only', desc: 'AI observes data and suggests recommendations; zero automated actions.' },
    { level: 2, title: 'Level 2: 1-Click Human Approval (Standard)', desc: 'AI generates campaign copy, budgets, and schedules; requires human click to deploy.' },
    { level: 3, title: 'Level 3: Auto-Draft & Stage', desc: 'AI prepares campaigns automatically and queues them for human 24h prior inspection.' },
    { level: 4, title: 'Level 4: Guardrailed Auto-Optimization', desc: 'AI shifts up to 15% budget from losing to winning campaigns within strict budget caps.' },
    { level: 5, title: 'Level 5: Full Autopilot Bidding', desc: 'Continuous dynamic budget balancing, pause triggers, and creative rotation.' }
  ];

  if (loading) {
    return <div className="p-12 text-center text-xs text-gray-500">Loading autopilot configuration...</div>;
  }

  return (
    <div className="space-y-6 text-xs">
      <div>
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-gray-900">AI Autopilot & Governance Safety Controls</h2>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Define human-in-the-loop boundaries, budget caps, channel permissions, and emergency circuit breakers
        </p>
      </div>

      {/* Emergency Kill-Switch Card */}
      <div className="p-5 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border-2 border-red-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-red-100 text-red-700 flex-shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block">Emergency Safety Protocol</span>
            <h3 className="text-sm font-bold text-red-950">Immediate Circuit Breaker — Pause All Active Campaigns</h3>
            <p className="text-xs text-red-900/80 mt-1 max-w-xl">
              Instantly halts all active digital and offline campaigns, disables autopilot optimization, and sends urgent SMS/email notifications to school leadership.
            </p>
          </div>
        </div>

        <button
          onClick={() => setKillSwitchModalOpen(true)}
          className="flex-shrink-0 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2"
        >
          <AlertOctagon className="w-4 h-4" /> Trigger Emergency Kill-Switch
        </button>
      </div>

      {/* Form: Autopilot Level & Guardrails */}
      <form onSubmit={handleSaveConfig} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        {/* Autopilot Level Radios */}
        <div>
          <label className="block font-bold text-sm text-gray-900 mb-3">Autonomous Operation Level</label>
          <div className="space-y-2.5">
            {levels.map(l => (
              <label 
                key={l.level} 
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  config.autopilotLevel === l.level 
                    ? 'border-blue-600 bg-blue-50/40 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="autopilotLevel"
                  value={l.level}
                  checked={config.autopilotLevel === l.level}
                  onChange={() => setConfig({ ...config, autopilotLevel: l.level })}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-gray-900 block">{l.title}</span>
                  <p className="text-gray-500 text-[11px] mt-0.5">{l.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Financial Guardrails */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-gray-600" /> Hard Financial Boundaries
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Max Monthly Admissions Marketing Budget (₹)</label>
              <input
                type="number"
                value={config.maxMonthlyBudgetCap}
                onChange={(e) => setConfig({ ...config, maxMonthlyBudgetCap: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900"
              />
              <p className="text-[10px] text-gray-400 mt-1">Total spend across all active campaigns cannot exceed this cap</p>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Single Campaign Ceiling (₹)</label>
              <input
                type="number"
                value={config.maxSingleCampaignBudget}
                onChange={(e) => setConfig({ ...config, maxSingleCampaignBudget: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border border-gray-300 rounded-lg font-bold text-gray-900"
              />
              <p className="text-[10px] text-gray-400 mt-1">Maximum allocation for any individual ad set or event</p>
            </div>
          </div>
        </div>

        {/* Human Sign-Off Checkbox */}
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.requireHumanApprovalForPublishing}
              onChange={(e) => setConfig({ ...config, requireHumanApprovalForPublishing: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span className="font-bold text-gray-800">Require explicit Human Sign-off before any creative or media budget is published</span>
          </label>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Approved Marketing Channels</label>
            <input
              type="text"
              value={config.approvedChannels}
              onChange={(e) => setConfig({ ...config, approvedChannels: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {/* Save Bar */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Safety guardrails updated successfully
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save Governance Configuration
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Kill-Switch */}
      {killSwitchModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertOctagon className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-sm text-red-950">Confirm Emergency Kill-Switch</h3>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              Are you sure you want to pause <strong>ALL</strong> active marketing campaigns immediately? This will halt ad spend and society event registrations.
            </p>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Reason for Emergency Pause</label>
              <textarea
                rows={2}
                value={killReason}
                onChange={(e) => setKillReason(e.target.value)}
                placeholder="e.g. Annual admission intake reached / Technical glitch on landing page"
                className="w-full p-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setKillSwitchModalOpen(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerKillSwitch}
                disabled={triggeringKill}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow transition disabled:opacity-50"
              >
                {triggeringKill ? 'Halting Campaigns...' : 'Confirm & Kill All Campaigns'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
