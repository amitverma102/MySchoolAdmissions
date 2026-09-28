import React, { useState } from 'react';
import { Radio } from 'lucide-react';
import type { ChannelPerformance } from '../../types/campaign';

interface Props {
  channels: ChannelPerformance[];
  loading: boolean;
}

export const CampaignChannelIntelligence: React.FC<Props> = ({ channels, loading }) => {
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Digital' | 'Offline'>('All');

  if (loading) {
    return <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-xl border">Loading channel matrix...</div>;
  }

  const filtered = channels.filter(c => {
    if (categoryFilter === 'All') return true;
    return c.category === categoryFilter;
  });

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">Omnichannel Performance Matrix</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Holistic cross-channel comparison of media spend, visit conversion rates, CAC efficiency, and student lifetime value
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['All', 'Digital', 'Offline'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                categoryFilter === cat 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((ch, idx) => (
          <div 
            key={idx}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-blue-300 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  ch.category === 'Offline' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {ch.category}
                </span>

                <span className="font-bold text-xs text-indigo-700">
                  {ch.returnOnSpend.toFixed(1)}x ROAS
                </span>
              </div>

              <h3 className="font-bold text-gray-900 text-sm mb-3">{ch.channel}</h3>

              {/* Top Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-[10px] text-gray-400 block font-semibold">Total Spend</span>
                  <span className="font-bold text-gray-800">{formatCurrency(ch.totalSpend)}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-lg">
                  <span className="text-[10px] text-emerald-600 block font-semibold">Admissions</span>
                  <span className="font-bold text-emerald-800">{ch.enrollments} Students</span>
                </div>
              </div>

              {/* Funnel Metrics */}
              <div className="space-y-2 text-xs border-t border-gray-100 pt-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Inquiries (Leads):</span>
                  <span className="font-semibold text-gray-800">{ch.leads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Campus Visits:</span>
                  <span className="font-semibold text-amber-800">{ch.visits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cost Per Lead (CPL):</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(ch.costPerLead)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cost / Admission (CAC):</span>
                  <span className={`font-bold ${ch.costPerEnrollment <= 1500 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCurrency(ch.costPerEnrollment)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lead $\rightarrow$ Admit Conversion:</span>
                  <span className="font-bold text-gray-900">{ch.enrollmentConversion}%</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-gray-500">Estimated Tuition Value:</span>
              <span className="font-bold text-emerald-700">{formatCurrency(ch.revenueGenerated)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
