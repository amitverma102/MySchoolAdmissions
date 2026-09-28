import React from 'react';
import { 
  Lightbulb, 
  Sparkles, 
  MapPin, 
  Users, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import type { CampaignIdea } from '../../types/campaign';

interface Props {
  ideas: CampaignIdea[];
  loading: boolean;
  onLaunchIdea: (idea: CampaignIdea) => void;
}

export const AICampaignIdeas: React.FC<Props> = ({
  ideas,
  loading,
  onLaunchIdea
}) => {
  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-bold text-gray-900">AI Admissions Campaign Ideas & Opportunities</h2>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Proactively identified admission opportunities based on feeder school cycles, society cluster density, and grade seat vacancies
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-xl border">Scanning opportunities...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ideas.map((idea) => {
            const conf = Math.round(idea.confidenceLevel * 100);
            return (
              <div 
                key={idea.id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {idea.objective}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-bold text-gray-800 text-[11px]">{conf}% Confidence</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 text-sm mb-2">{idea.ideaTitle}</h3>
                  
                  <p className="text-xs text-gray-600 mb-3">
                    <strong className="text-gray-700">Target:</strong> {idea.targetAudience}
                  </p>

                  <div className="space-y-1.5 text-xs text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{idea.targetGeography}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span>Channel: <strong className="text-gray-800">{idea.recommendedChannel}</strong></span>
                    </div>
                  </div>

                  {/* Funnel Expectation */}
                  <div className="grid grid-cols-3 gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100 text-center mb-4">
                    <div>
                      <span className="text-[10px] text-gray-500 block">Est. Leads</span>
                      <span className="font-bold text-blue-900 text-xs">{idea.expectedLeads}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Est. Visits</span>
                      <span className="font-bold text-amber-800 text-xs">{idea.expectedVisits}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Est. Admits</span>
                      <span className="font-bold text-emerald-800 text-xs">{idea.expectedEnrollments}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 italic mb-2">
                    "{idea.reasonForRecommendation}"
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-gray-400">Budget: </span>
                    <span className="font-bold text-gray-900">{formatCurrency(idea.estimatedBudget)}</span>
                    <span className="text-[10px] text-gray-400 ml-1">({idea.durationDays} days)</span>
                  </div>

                  <button
                    onClick={() => onLaunchIdea(idea)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Launch Campaign <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
