import React, { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Clock
} from 'lucide-react';
import type { CampaignRecommendation } from '../../types/campaign';

interface Props {
  recommendations: CampaignRecommendation[];
  loading: boolean;
  onActionRecommendation: (id: string, action: 'Adopted' | 'Dismissed') => Promise<void>;
  onOpenGeneratorWithPrompt?: (rec: CampaignRecommendation) => void;
}

export const AICampaignRecommendations: React.FC<Props> = ({
  recommendations,
  loading,
  onActionRecommendation,
  onOpenGeneratorWithPrompt
}) => {
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Adopted'>('Pending');

  const filtered = recommendations.filter(r => {
    if (filter === 'All') return true;
    return r.status === filter;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ChannelShift':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'BudgetIncrease':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Retargeting':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Optimization':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">AI Admissions Intelligence Recommendations</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Data-driven strategic recommendations synthesized from previous admission cycles, current channel CAC, and conversion bottlenecks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Filter:</span>
          {(['Pending', 'Adopted', 'All'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                filter === tab 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-xl border">Loading recommendations...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
          <p className="text-sm font-semibold text-gray-700">No {filter.toLowerCase()} recommendations found</p>
          <p className="text-xs text-gray-400 mt-1">All active AI suggestions have been reviewed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((rec) => {
            const confidencePercent = Math.round(rec.confidenceLevel * 100);
            return (
              <div 
                key={rec.id} 
                className={`bg-white rounded-xl border transition-all p-5 flex flex-col justify-between ${
                  rec.status === 'Adopted' ? 'border-emerald-300 bg-emerald-50/10' : 'border-gray-200 shadow-sm hover:border-blue-300'
                }`}
              >
                <div>
                  {/* Top Tags & Confidence Meter */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getCategoryColor(rec.category)}`}>
                      {rec.category.replace(/([A-Z])/g, ' $1').trim()}
                    </span>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] font-medium text-gray-500">AI Confidence</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all" 
                            style={{ width: `${confidencePercent}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-800 text-[11px]">{confidencePercent}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2">
                    {rec.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed mb-4">
                    {rec.description}
                  </p>

                  {/* Supporting Evidence Card */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1.5 mb-4">
                    <div className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Historical Evidence:
                    </div>
                    <p className="text-gray-600 text-[11px]">
                      {rec.supportingEvidence}
                    </p>
                    <div className="flex items-center gap-4 text-[10px] text-gray-400 pt-1 border-t border-gray-200/60">
                      <span>Period: {rec.historicalPeriod}</span>
                      <span>Sample Size: {rec.sampleSize} applicants</span>
                    </div>
                  </div>

                  {/* Expected Impact & Channel */}
                  <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 text-[11px]">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      {rec.expectedImpact}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-[11px]">
                      Channel: <span className="font-semibold">{rec.targetChannel}</span>
                    </span>
                    <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-[11px]">
                      Budget: <span className="font-semibold">{formatCurrency(rec.suggestedBudget)}</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Logged {new Date(rec.createdAt).toLocaleDateString()}
                  </span>

                  {rec.status === 'Pending' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onActionRecommendation(rec.id, 'Dismissed')}
                        className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => {
                          onActionRecommendation(rec.id, 'Adopted');
                          if (onOpenGeneratorWithPrompt) {
                            onOpenGeneratorWithPrompt(rec);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Adopt & Execute
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Adopted in Strategy
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
