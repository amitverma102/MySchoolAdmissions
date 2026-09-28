import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  ArrowRight,
  X
} from 'lucide-react';
import type { CampaignLearning } from '../../types/campaign';

interface Props {
  learnings: CampaignLearning[];
  loading: boolean;
  onSaveLearning: (learning: CampaignLearning) => Promise<void>;
}

export const CampaignLearningsView: React.FC<Props> = ({ learnings, loading, onSaveLearning }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [channel, setChannel] = useState('Society Event');
  const [geography, setGeography] = useState('');
  const [totalSpend, setTotalSpend] = useState('');
  const [totalLeads, setTotalLeads] = useState('');
  const [totalVisits, setTotalVisits] = useState('');
  const [totalEnrollments, setTotalEnrollments] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatFailed, setWhatFailed] = useState('');
  const [keyTakeaway, setKeyTakeaway] = useState('');
  const [recommendedNextAction, setRecommendedNextAction] = useState('');

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const spend = parseFloat(totalSpend) || 0;
    const enrollments = parseInt(totalEnrollments) || 0;
    const cpe = enrollments > 0 ? Math.round(spend / enrollments) : 0;

    await onSaveLearning({
      campaignName,
      channel,
      geography,
      totalSpend: spend,
      totalLeads: parseInt(totalLeads) || 0,
      totalVisits: parseInt(totalVisits) || 0,
      totalEnrollments: enrollments,
      costPerEnrollment: cpe,
      whatWorked,
      whatFailed,
      keyTakeaway,
      recommendedNextAction
    });

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCampaignName('');
    setChannel('Society Event');
    setGeography('');
    setTotalSpend('');
    setTotalLeads('');
    setTotalVisits('');
    setTotalEnrollments('');
    setWhatWorked('');
    setWhatFailed('');
    setKeyTakeaway('');
    setRecommendedNextAction('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">Institutional Marketing Knowledge Base ("What We Learned")</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Permanent institutional intelligence preventing repeated campaign mistakes and preserving winning marketing playbooks
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" /> Log New Learning
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-xl border">Loading knowledge repository...</div>
      ) : (
        <div className="space-y-4">
          {learnings.map((l, idx) => (
            <div key={l.id || idx} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{l.campaignName}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span>Channel: <strong className="text-gray-700">{l.channel}</strong></span>
                    <span>•</span>
                    <span>Geography: <strong className="text-gray-700">{l.geography}</strong></span>
                    {l.loggedAt && (
                      <>
                        <span>•</span>
                        <span>Logged: {new Date(l.loggedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-700">
                    Spend: <strong className="text-gray-900">{formatCurrency(l.totalSpend)}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-50 rounded-lg text-emerald-800 font-bold border border-emerald-200">
                    {l.totalEnrollments} Admits (CAC {formatCurrency(l.costPerEnrollment)})
                  </span>
                </div>
              </div>

              {/* 4 Quadrants: What Worked, What Failed, Key Takeaway, Next Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* What Worked */}
                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> What Worked Well
                  </div>
                  <p className="text-emerald-950 leading-relaxed pt-1">
                    {l.whatWorked}
                  </p>
                </div>

                {/* What Failed */}
                <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-200 space-y-1">
                  <div className="font-bold text-red-900 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-600" /> What Failed / Friction Points
                  </div>
                  <p className="text-red-950 leading-relaxed pt-1">
                    {l.whatFailed}
                  </p>
                </div>

                {/* Key Takeaway */}
                <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-blue-600" /> Core Institutional Takeaway
                  </div>
                  <p className="text-blue-950 leading-relaxed pt-1 font-medium">
                    {l.keyTakeaway}
                  </p>
                </div>

                {/* Recommended Next Action */}
                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-1">
                  <div className="font-bold text-purple-900 flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4 text-purple-600" /> Recommended Action for Next Campaign
                  </div>
                  <p className="text-purple-950 leading-relaxed pt-1 font-medium">
                    {l.recommendedNextAction}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Log New Learning */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-xl p-6 text-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-gray-900">Record Institutional Campaign Learning</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Campaign Name</label>
                  <input
                    type="text"
                    required
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Palm Meadows Science Booth 2026"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Primary Channel</label>
                  <input
                    type="text"
                    required
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Geography / PIN</label>
                  <input
                    type="text"
                    value={geography}
                    onChange={(e) => setGeography(e.target.value)}
                    placeholder="PIN 560066"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Spend (₹)</label>
                  <input
                    type="number"
                    value={totalSpend}
                    onChange={(e) => setTotalSpend(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Admits Generated</label>
                  <input
                    type="number"
                    value={totalEnrollments}
                    onChange={(e) => setTotalEnrollments(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-emerald-800 mb-1">What Worked Well</label>
                <textarea
                  rows={2}
                  required
                  value={whatWorked}
                  onChange={(e) => setWhatWorked(e.target.value)}
                  placeholder="e.g. Hands-on robotics activity attracted 40 kids..."
                  className="w-full p-2 border border-emerald-200 bg-emerald-50/20 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-red-800 mb-1">What Failed / Bottlenecks</label>
                <textarea
                  rows={2}
                  required
                  value={whatFailed}
                  onChange={(e) => setWhatFailed(e.target.value)}
                  placeholder="e.g. Distributing paper flyers under doors had 0 responses..."
                  className="w-full p-2 border border-red-200 bg-red-50/20 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-blue-800 mb-1">Core Key Takeaway</label>
                <input
                  type="text"
                  required
                  value={keyTakeaway}
                  onChange={(e) => setKeyTakeaway(e.target.value)}
                  placeholder="e.g. In-person experiential engagement beats passive paper drops by 10x"
                  className="w-full p-2 border border-blue-200 bg-blue-50/20 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-purple-800 mb-1">Recommended Next Action</label>
                <input
                  type="text"
                  required
                  value={recommendedNextAction}
                  onChange={(e) => setRecommendedNextAction(e.target.value)}
                  placeholder="e.g. Expand booth setup to 4 nearby gated communities"
                  className="w-full p-2 border border-purple-200 bg-purple-50/20 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                >
                  Save to Knowledge Base
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
