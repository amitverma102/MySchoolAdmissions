import React, { useState } from 'react';
import { 
  GitCommit, 
  ArrowRight, 
  CheckCircle2, 
  Layers
} from 'lucide-react';

export const CampaignFunnelAttribution: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<'FirstTouch' | 'LastTouch' | 'Linear' | 'TimeDecay' | 'Position' | 'AiWeighted'>('AiWeighted');

  const models = [
    { id: 'AiWeighted', name: 'AI Data-Driven (Shapley)', desc: 'Algorithmic attribution weighting based on incremental lift towards final admission' },
    { id: 'FirstTouch', name: 'First Touch', desc: '100% credit to the discovery channel (e.g. Meta Lead Ad or Mall Kiosk)' },
    { id: 'LastTouch', name: 'Last Touch', desc: '100% credit to the final channel before enrollment (e.g. WhatsApp payment link)' },
    { id: 'Position', name: 'Position-Based (40-20-40)', desc: '40% discovery, 40% decision close, 20% intermediate nurturing' },
    { id: 'TimeDecay', name: 'Time Decay', desc: 'Gradually increases credit for touchpoints closer in time to admission' },
    { id: 'Linear', name: 'Linear (Equal)', desc: 'Equal split across every ad, booth, call, and visit touchpoint' },
  ] as const;

  // Mock attribution share by channel based on model
  const getAttributionShares = () => {
    switch (selectedModel) {
      case 'FirstTouch':
        return [
          { channel: 'Facebook & Instagram Ads', share: 44, admitsCredited: 66, revenueCredited: '₹92.4 Lakh' },
          { channel: 'Google High-Intent Search', share: 29, admitsCredited: 44, revenueCredited: '₹61.6 Lakh' },
          { channel: 'Apartment Society Events', share: 16, admitsCredited: 24, revenueCredited: '₹33.6 Lakh' },
          { channel: 'Parent App Referrals', share: 8, admitsCredited: 12, revenueCredited: '₹16.8 Lakh' },
          { channel: 'Mall Kiosk', share: 3, admitsCredited: 4, revenueCredited: '₹5.6 Lakh' },
        ];
      case 'LastTouch':
        return [
          { channel: 'Saturday Campus Discovery Walk', share: 48, admitsCredited: 72, revenueCredited: '₹1.01 Cr' },
          { channel: 'WhatsApp One-on-One Counselor Chat', share: 26, admitsCredited: 39, revenueCredited: '₹54.6 Lakh' },
          { channel: 'Apartment Society On-Spot Booking', share: 14, admitsCredited: 21, revenueCredited: '₹29.4 Lakh' },
          { channel: 'Direct Website Portal', share: 12, admitsCredited: 18, revenueCredited: '₹25.2 Lakh' },
        ];
      case 'AiWeighted':
      default:
        return [
          { channel: 'Apartment Society Showcase', share: 32, admitsCredited: 48, revenueCredited: '₹67.2 Lakh' },
          { channel: 'Campus Discovery Walk Experience', share: 28, admitsCredited: 42, revenueCredited: '₹58.8 Lakh' },
          { channel: 'Google CBSE High-Intent Search', share: 21, admitsCredited: 31, revenueCredited: '₹43.4 Lakh' },
          { channel: 'Meta Parent Testimonial Videos', share: 13, admitsCredited: 20, revenueCredited: '₹28.0 Lakh' },
          { channel: 'Automated WhatsApp Nurture Kit', share: 6, admitsCredited: 9, revenueCredited: '₹12.6 Lakh' },
        ];
    }
  };

  const shares = getAttributionShares();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-gray-900">Multi-Touch Admissions Attribution Intelligence</h2>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Unraveling the full parent journey: from first ad impression to final Razorpay seat acceptance fee payment
        </p>
      </div>

      {/* Typical Parent Multi-Touch Journey Visualizer */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-lg">
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block mb-2">
          Representative High-Converting Parent Journey (Average 18-Day Cycle)
        </span>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
          {/* Touch 1 */}
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 w-full text-center">
            <span className="text-[10px] text-blue-300 block">Day 1 • Discovery</span>
            <div className="text-xs font-bold text-white mt-1">Meta Video Reel Ad</div>
            <span className="text-[10px] text-blue-200">Parent clicks form</span>
          </div>

          <ArrowRight className="w-4 h-4 text-blue-300 hidden md:block" />

          {/* Touch 2 */}
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 w-full text-center">
            <span className="text-[10px] text-blue-300 block">Day 1 (+12m) • Nurture</span>
            <div className="text-xs font-bold text-emerald-300 mt-1">WhatsApp Welcome Kit</div>
            <span className="text-[10px] text-blue-200">Reviews curriculum PDF</span>
          </div>

          <ArrowRight className="w-4 h-4 text-blue-300 hidden md:block" />

          {/* Touch 3 */}
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 w-full text-center">
            <span className="text-[10px] text-blue-300 block">Day 6 • Community</span>
            <div className="text-xs font-bold text-amber-300 mt-1">Society STEM Booth</div>
            <span className="text-[10px] text-blue-200">Child does robot build</span>
          </div>

          <ArrowRight className="w-4 h-4 text-blue-300 hidden md:block" />

          {/* Touch 4 */}
          <div className="bg-white/10 p-3 rounded-xl border border-white/10 w-full text-center">
            <span className="text-[10px] text-blue-300 block">Day 12 • Validation</span>
            <div className="text-xs font-bold text-indigo-300 mt-1">Campus Discovery Walk</div>
            <span className="text-[10px] text-blue-200">Meets Principal & Labs</span>
          </div>

          <ArrowRight className="w-4 h-4 text-blue-300 hidden md:block" />

          {/* Touch 5 */}
          <div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-400/40 w-full text-center">
            <span className="text-[10px] text-emerald-300 block font-bold">Day 18 • Enrollment</span>
            <div className="text-xs font-extrabold text-emerald-200 mt-1">Seat Fee Payment</div>
            <span className="text-[10px] text-emerald-300">₹25,000 via Razorpay</span>
          </div>
        </div>
      </div>

      {/* Model Selection Buttons */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">Select Attribution Logic</h3>
          <p className="text-xs text-gray-500">Compare how different models assign revenue credit across the marketing mix</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {models.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id as any)}
              className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                selectedModel === m.id
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div>
                <span className={`text-xs font-bold block ${selectedModel === m.id ? 'text-blue-900' : 'text-gray-900'}`}>
                  {m.name}
                </span>
                <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{m.desc}</p>
              </div>
              {selectedModel === m.id && (
                <div className="mt-2 text-[10px] text-blue-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active Model
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Model Results Table */}
        <div className="pt-4 border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Attributed Touchpoint / Channel</th>
                  <th className="pb-3 text-right">Attribution Weight %</th>
                  <th className="pb-3 text-right">Estimated Admissions Credited</th>
                  <th className="pb-3 text-right">Tuition Revenue Credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shares.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition">
                    <td className="py-3 font-semibold text-gray-900 flex items-center gap-2">
                      <GitCommit className="w-3.5 h-3.5 text-blue-600" />
                      {row.channel}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-20 bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${row.share}%` }} />
                        </div>
                        <span className="font-bold text-gray-900 w-8">{row.share}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-bold text-emerald-700">{row.admitsCredited}</td>
                    <td className="py-3 text-right font-semibold text-gray-900">{row.revenueCredited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
