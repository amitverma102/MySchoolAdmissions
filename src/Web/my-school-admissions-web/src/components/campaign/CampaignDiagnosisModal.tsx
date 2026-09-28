import React, { useState, useEffect } from 'react';
import { 
  X, 
  Stethoscope, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Clock, 
  MapPin, 
  Radio, 
  Users, 
  Sparkles,
  PhoneCall
} from 'lucide-react';
import type { CampaignDiagnosis, Campaign } from '../../types/campaign';
import api from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
}

export const CampaignDiagnosisModal: React.FC<Props> = ({ isOpen, onClose, campaign }) => {
  const [diagnosis, setDiagnosis] = useState<CampaignDiagnosis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && campaign) {
      fetchDiagnosis(campaign.id);
    }
  }, [isOpen, campaign]);

  const fetchDiagnosis = async (id: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/campaigns/intelligence/diagnosis/${id}`);
      setDiagnosis(res.data);
    } catch (err) {
      console.error('Failed to load diagnosis', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Campaign Performance Diagnosis</h2>
                <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 text-[10px] font-bold">
                  Root Cause Intelligence
                </span>
              </div>
              <p className="text-xs text-indigo-200">{campaign.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading || !diagnosis ? (
            <div className="p-16 text-center text-gray-500">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Running multi-dimensional attribution & counselor latency diagnosis...
            </div>
          ) : (
            <>
              {/* Overall Assessment Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
                  Executive Assessment
                </span>
                <p className="text-xs font-semibold text-gray-900 leading-relaxed">
                  {diagnosis.overallAssessment}
                </p>
              </div>

              {/* What Worked vs What Failed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> What Succeeded
                  </div>
                  <ul className="space-y-1.5 text-emerald-950">
                    {diagnosis.whatWorked.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-red-50/50 rounded-xl border border-red-200 space-y-2">
                  <div className="font-bold text-red-900 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-600" /> Funnel Bottlenecks & Friction
                  </div>
                  <ul className="space-y-1.5 text-red-950">
                    {diagnosis.whatDidNotWork.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-red-600 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 6 Diagnostic Dimensions */}
              <div>
                <h3 className="font-bold text-sm text-gray-900 mb-3">Dimensional Diagnostic Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Dimension 1: Audience */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-gray-800">
                      <Users className="w-3.5 h-3.5 text-blue-600" /> Audience Resonance
                    </div>
                    <p className="text-gray-600 leading-relaxed text-[11px]">
                      {diagnosis.audienceDiagnosis}
                    </p>
                  </div>

                  {/* Dimension 2: Creative */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-gray-800">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Creative & Format
                    </div>
                    <p className="text-gray-600 leading-relaxed text-[11px]">
                      {diagnosis.creativeDiagnosis}
                    </p>
                  </div>

                  {/* Dimension 3: Channel */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-gray-800">
                      <Radio className="w-3.5 h-3.5 text-purple-600" /> Channel Fit
                    </div>
                    <p className="text-gray-600 leading-relaxed text-[11px]">
                      {diagnosis.channelDiagnosis}
                    </p>
                  </div>

                  {/* Dimension 4: Geography */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-gray-800">
                      <MapPin className="w-3.5 h-3.5 text-red-500" /> Geographic Catchment
                    </div>
                    <p className="text-gray-600 leading-relaxed text-[11px]">
                      {diagnosis.geographyDiagnosis}
                    </p>
                  </div>

                  {/* Dimension 5: Timing */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-gray-800">
                      <Clock className="w-3.5 h-3.5 text-teal-600" /> Day & Hour Timing
                    </div>
                    <p className="text-gray-600 leading-relaxed text-[11px]">
                      {diagnosis.timingDiagnosis}
                    </p>
                  </div>

                  {/* Dimension 6: Counselor Followup */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-gray-800">
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-600" /> Counselor Speed
                    </div>
                    <p className="text-gray-600 leading-relaxed text-[11px]">
                      {diagnosis.counselorFollowupDiagnosis}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommended Action Plan */}
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-2">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4 text-indigo-700" /> AI Prescribed Optimization Steps
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-indigo-950 pt-1">
                  {diagnosis.recommendedActions.map((action, i) => (
                    <div key={i} className="p-2.5 bg-white rounded-lg border border-indigo-100 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl text-xs transition"
          >
            Close Diagnosis
          </button>
        </div>
      </div>
    </div>
  );
};
