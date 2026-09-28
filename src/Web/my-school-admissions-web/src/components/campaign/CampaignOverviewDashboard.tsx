import React from 'react';
import { 
  DollarSign, 
  Users, 
  CheckCircle2, 
  MapPin, 
  FileText, 
  GraduationCap, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight,
  Eye,
  MousePointer,
  ChevronRight
} from 'lucide-react';
import type { CampaignDashboardSummary, CampaignAlert } from '../../types/campaign';

interface Props {
  summary: CampaignDashboardSummary | null;
  loading: boolean;
  onNavigateTab: (tab: string) => void;
  onOpenGenerator: () => void;
}

export const CampaignOverviewDashboard: React.FC<Props> = ({ 
  summary, 
  loading, 
  onNavigateTab, 
  onOpenGenerator 
}) => {
  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium text-sm">Aggregating admissions intelligence & conversion funnels...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  const getAlertIcon = (severity: CampaignAlert['severity']) => {
    switch (severity) {
      case 'Critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'Opportunity':
        return <Sparkles className="w-5 h-5 text-emerald-600" />;
      case 'Warning':
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
  };

  const getAlertBg = (severity: CampaignAlert['severity']) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'Opportunity':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      case 'Warning':
      default:
        return 'bg-amber-50 border-amber-200 text-amber-900';
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Alert Ribbon */}
      {summary.urgentAlerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.urgentAlerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:shadow-sm ${getAlertBg(alert.severity)}`}
            >
              <div>
                <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
                  {getAlertIcon(alert.severity)}
                  <span>{alert.title}</span>
                </div>
                <p className="text-xs opacity-90 line-clamp-3 mb-3 leading-relaxed">
                  {alert.description}
                </p>
              </div>
              <div className="pt-2 border-t border-black/5 flex items-center justify-between text-xs font-semibold">
                <span className="opacity-75">AI Recommendation</span>
                <button 
                  onClick={() => onNavigateTab('recommendations')} 
                  className="inline-flex items-center gap-1 hover:underline text-blue-700"
                >
                  Take Action <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Spend */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Total Spend
            </span>
            <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalSpend)}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Budget: <span className="font-medium text-gray-700">{formatCurrency(summary.totalBudget)}</span>
          </div>
        </div>

        {/* Leads */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" /> Leads (Inquiries)
            </span>
            <div className="text-xl font-bold text-gray-900 mt-1">{summary.totalLeads.toLocaleString()}</div>
          </div>
          <div className="mt-2 text-xs flex items-center justify-between">
            <span className="text-gray-500">CPL: {formatCurrency(summary.costPerLead)}</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +{summary.leadGrowthPercentage}%
            </span>
          </div>
        </div>

        {/* Qualified */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Qualified Leads
            </span>
            <div className="text-xl font-bold text-gray-900 mt-1">{summary.totalQualifiedLeads.toLocaleString()}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Qual. Rate: <span className="font-semibold text-teal-700">{summary.leadToQualifiedRate}%</span>
          </div>
        </div>

        {/* Campus Visits */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-600" /> Campus Visits
            </span>
            <div className="text-xl font-bold text-gray-900 mt-1">{summary.totalVisits.toLocaleString()}</div>
          </div>
          <div className="mt-2 text-xs flex items-center justify-between">
            <span className="text-gray-500">CPV: {formatCurrency(summary.costPerVisit)}</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +{summary.visitGrowthPercentage}%
            </span>
          </div>
        </div>

        {/* Applications */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-orange-600" /> Applications
            </span>
            <div className="text-xl font-bold text-gray-900 mt-1">{summary.totalApplications.toLocaleString()}</div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            CPA: <span className="font-medium text-gray-700">{formatCurrency(summary.costPerApplication)}</span>
          </div>
        </div>

        {/* Confirmed Enrollments */}
        <div className="bg-white p-4 rounded-xl border border-emerald-300 bg-emerald-50/20 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-emerald-600" /> Confirmed Admissions
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{summary.totalEnrollments.toLocaleString()}</div>
          </div>
          <div className="mt-2 text-xs flex items-center justify-between">
            <span className="text-gray-600">CAC: {formatCurrency(summary.costPerEnrollment)}</span>
            <span className="text-emerald-700 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +{summary.enrollmentGrowthPercentage}%
            </span>
          </div>
        </div>

        {/* Marketing ROI */}
        <div className="bg-gradient-to-br from-indigo-900 to-blue-950 p-4 rounded-xl shadow-sm text-white flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-blue-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Marketing ROI
            </span>
            <div className="text-xl font-black text-amber-400 mt-1">+{summary.marketingRoi.toFixed(0)}%</div>
          </div>
          <div className="mt-2 text-[11px] text-blue-200">
            Conv: <span className="font-bold text-white">{summary.overallConversionRate}%</span> (Lead $\rightarrow$ Admit)
          </div>
        </div>
      </div>

      {/* Complete Step-Down Funnel Visualizer */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">End-to-End Admissions Conversion Funnel</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Active Cycle 2026–2027
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Tracking impressions to confirmed student admissions with step-down conversion efficiencies and leak detection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('attribution')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition"
            >
              Multi-Touch Attribution $\rightarrow$
            </button>
            <button
              onClick={onOpenGenerator}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Generate AI Campaign
            </button>
          </div>
        </div>

        {/* Funnel Pipeline Visual Flow */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 relative">
          {/* Stage 1: Impressions */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-gray-400" /> Impressions</span>
              <span className="text-[10px] text-gray-400">100%</span>
            </div>
            <div className="text-lg font-bold text-gray-800">{(summary.totalImpressions / 1000).toFixed(0)}k</div>
            <div className="mt-3 pt-2 border-t border-gray-200 text-[11px] text-gray-500">
              Reach & Awareness
            </div>
          </div>

          {/* Stage 2: Clicks */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium mb-1">
              <span className="flex items-center gap-1"><MousePointer className="w-3.5 h-3.5 text-blue-500" /> Clicks</span>
              <span className="text-[10px] font-semibold text-blue-600">{summary.impressionToClickRate}% CTR</span>
            </div>
            <div className="text-lg font-bold text-gray-800">{(summary.totalClicks / 1000).toFixed(1)}k</div>
            <div className="mt-3 pt-2 border-t border-gray-200 text-[11px] text-gray-500">
              Ad Engagement
            </div>
          </div>

          {/* Stage 3: Leads */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-blue-800 font-medium mb-1">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-blue-600" /> Inquiries</span>
              <span className="text-[10px] font-semibold text-blue-700">{summary.clickToLeadRate}% CVR</span>
            </div>
            <div className="text-lg font-bold text-blue-900">{summary.totalLeads}</div>
            <div className="mt-3 pt-2 border-t border-blue-200/60 text-[11px] text-blue-700 font-medium">
              ₹{summary.costPerLead} CPL
            </div>
          </div>

          {/* Stage 4: Qualified Leads */}
          <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-indigo-800 font-medium mb-1">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Qualified</span>
              <span className="text-[10px] font-semibold text-indigo-700">{summary.leadToQualifiedRate}%</span>
            </div>
            <div className="text-lg font-bold text-indigo-900">{summary.totalQualifiedLeads}</div>
            <div className="mt-3 pt-2 border-t border-indigo-200/60 text-[11px] text-indigo-700 font-medium">
              Grade & Geo Fit
            </div>
          </div>

          {/* Stage 5: Campus Visits (Leak detected indicator) */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 border-2 border-amber-300 flex flex-col justify-between relative shadow-sm">
            <div className="absolute -top-2.5 right-2 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-extrabold rounded-full uppercase tracking-wider">
              Bottleneck
            </div>
            <div className="flex items-center justify-between text-xs text-amber-900 font-medium mb-1">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-amber-600" /> Visits</span>
              <span className="text-[10px] font-bold text-amber-700">{summary.qualifiedToVisitRate}%</span>
            </div>
            <div className="text-lg font-bold text-amber-950">{summary.totalVisits}</div>
            <div className="mt-3 pt-2 border-t border-amber-200 text-[11px] text-amber-800 font-semibold flex items-center justify-between">
              <span>₹{summary.costPerVisit} CPV</span>
              <span className="text-[10px] text-red-600 font-bold">-49% Drop</span>
            </div>
          </div>

          {/* Stage 6: Applications */}
          <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-purple-800 font-medium mb-1">
              <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-purple-600" /> Applied</span>
              <span className="text-[10px] font-semibold text-purple-700">{summary.visitToApplicationRate}%</span>
            </div>
            <div className="text-lg font-bold text-purple-900">{summary.totalApplications}</div>
            <div className="mt-3 pt-2 border-t border-purple-200/60 text-[11px] text-purple-700 font-medium">
              ₹{summary.costPerApplication} CPA
            </div>
          </div>

          {/* Stage 7: Admissions */}
          <div className="p-3.5 rounded-xl bg-emerald-100/70 border-2 border-emerald-400 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-emerald-900 font-bold mb-1">
              <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4 text-emerald-700" /> Enrolled</span>
              <span className="text-[10px] font-extrabold text-emerald-800">{summary.applicationToEnrollmentRate}%</span>
            </div>
            <div className="text-2xl font-black text-emerald-950">{summary.totalEnrollments}</div>
            <div className="mt-3 pt-2 border-t border-emerald-300 text-[11px] text-emerald-800 font-bold">
              ₹{summary.costPerEnrollment} CAC
            </div>
          </div>
        </div>

        {/* Funnel Leak Diagnosis Bar */}
        <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold text-amber-900">AI Diagnostic Alert: Qualified-to-Visit Bottleneck (50.8% Attendance)</span>
              <p className="text-amber-800 mt-0.5">
                389 qualified families did not show up for scheduled campus walkthroughs. Weekday tours have a 54% no-show rate vs 18% on weekends.
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigateTab('recommendations')}
            className="flex-shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition"
          >
            Apply Weekend Shift Strategy
          </button>
        </div>
      </div>

      {/* Channel Highlights Comparison Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Channel Efficiency & Conversion Rankings</h3>
            <p className="text-xs text-gray-500 mt-0.5">Comparative ROI across Digital and Offline admissions channels</p>
          </div>
          <button
            onClick={() => onNavigateTab('channels')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Deep Channel Analytics <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
                <th className="pb-3">Channel</th>
                <th className="pb-3">Type</th>
                <th className="pb-3 text-right">Spend</th>
                <th className="pb-3 text-right">Leads</th>
                <th className="pb-3 text-right">Visits</th>
                <th className="pb-3 text-right">Enrollments</th>
                <th className="pb-3 text-right">Cost / Admit</th>
                <th className="pb-3 text-right">Lead $\rightarrow$ Admit %</th>
                <th className="pb-3 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summary.channelHighlights.map((ch, idx) => (
                <tr key={idx} className="hover:bg-gray-50/70 transition">
                  <td className="py-3 font-semibold text-gray-900">{ch.channel}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      ch.category === 'Offline' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {ch.category}
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-700">{formatCurrency(ch.totalSpend)}</td>
                  <td className="py-3 text-right text-gray-700">{ch.leads}</td>
                  <td className="py-3 text-right text-gray-700">{ch.visits}</td>
                  <td className="py-3 text-right font-bold text-emerald-700">{ch.enrollments}</td>
                  <td className="py-3 text-right font-semibold text-gray-900">{formatCurrency(ch.costPerEnrollment)}</td>
                  <td className="py-3 text-right">
                    <span className={`font-bold ${ch.enrollmentConversion > 15 ? 'text-emerald-600' : 'text-gray-800'}`}>
                      {ch.enrollmentConversion}%
                    </span>
                  </td>
                  <td className="py-3 text-right font-black text-indigo-700">{ch.returnOnSpend.toFixed(1)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
