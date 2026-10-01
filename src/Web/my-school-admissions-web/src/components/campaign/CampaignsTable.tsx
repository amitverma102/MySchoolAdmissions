import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Stethoscope, 
  QrCode, 
  Play, 
  Pause, 
  Trash2, 
  Plus
} from 'lucide-react';
import type { Campaign } from '../../types/campaign';

interface Props {
  campaigns: Campaign[];
  loading: boolean;
  onSelectCampaignDiagnosis: (campaign: Campaign) => void;
  onOpenQrModal: (campaign?: Campaign) => void;
  onStatusChange: (campaignId: string, newStatus: string) => Promise<void>;
  onDeleteCampaign: (campaignId: string) => Promise<void>;
  onOpenCreateModal: () => void;
  onOpenGeneratorModal: () => void;
}

export const CampaignsTable: React.FC<Props> = ({
  campaigns,
  loading,
  onSelectCampaignDiagnosis,
  onOpenQrModal,
  onStatusChange,
  onDeleteCampaign,
  onOpenCreateModal,
  onOpenGeneratorModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [channelFilter, setChannelFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.targetGrades.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.targetGeography.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.primaryChannel.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || c.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesChannel = channelFilter === 'All' || 
      c.primaryChannel.toLowerCase().includes(channelFilter.toLowerCase()) ||
      c.channels.toLowerCase().includes(channelFilter.toLowerCase());
    const matchesType = typeFilter === 'All' || c.type.toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesChannel && matchesType;
  });

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Active</span>;
      case 'scheduled':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Scheduled</span>;
      case 'paused':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Paused</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Completed</span>;
      case 'draft':
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">Draft</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Multi-Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaigns by name, target grades, geography, or channel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Paused">Paused</option>
            <option value="Completed">Completed</option>
            <option value="Draft">Draft</option>
          </select>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Channels</option>
            <option value="Facebook">Facebook & Instagram</option>
            <option value="Google">Google Search</option>
            <option value="Society">Society Events</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="YouTube">YouTube</option>
            <option value="Mall">Mall Kiosk</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Digital">Digital</option>
            <option value="Offline">Offline</option>
            <option value="Hybrid">Hybrid</option>
          </select>

          <button
            onClick={onOpenGeneratorModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Generator
          </button>

          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> New Campaign
          </button>
        </div>
      </div>

      {/* Campaigns Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">Loading campaigns...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-gray-800">No campaigns match your filters</p>
            <p className="text-xs text-gray-500 mt-1">Try resetting filters or generate a new admissions campaign with AI.</p>
            <button
              onClick={onOpenGeneratorModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              <Sparkles className="w-4 h-4 text-amber-300" /> Generate AI Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Campaign & Strategy</th>
                  <th className="py-3 px-3">Channel & Target</th>
                  <th className="py-3 px-3 text-right">Spend / Budget</th>
                  <th className="py-3 px-3 text-center">Funnel (Leads $\rightarrow$ Admits)</th>
                  <th className="py-3 px-3 text-right">Cost / Admit</th>
                  <th className="py-3 px-3 text-right">Conversion %</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Intelligence & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-blue-50/20 transition group">
                    {/* Name & Strategy */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-start gap-1.5">
                        {camp.isAiGenerated && (
                          <span 
                            title={`AI Optimized (${Math.round(camp.aiConfidenceScore * 100)}% Confidence)`}
                            className="mt-0.5 p-0.5 rounded bg-indigo-100 text-indigo-700"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <div>
                          <span className="font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600">
                            {camp.name}
                          </span>
                          <span className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                            {camp.schoolName} • {camp.campusName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Channels & Targets */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            camp.type === 'Offline' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {camp.primaryChannel}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 truncate max-w-[140px]" title={camp.targetGrades}>
                          {camp.targetGrades}
                        </span>
                      </div>
                    </td>

                    {/* Spend / Budget */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-semibold text-gray-900">{formatCurrency(camp.actualCost)}</div>
                      <div className="text-[10px] text-gray-400">Budget: {formatCurrency(camp.budget)}</div>
                    </td>

                    {/* Funnel: Leads -> Visits -> Admits */}
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-center">
                          <span className="text-[10px] text-gray-400 block">Leads</span>
                          <span className="font-bold text-gray-800">{camp.actualLeads}</span>
                        </div>
                        <span className="text-gray-300">$\rightarrow$</span>
                        <div className="text-center">
                          <span className="text-[10px] text-gray-400 block">Visits</span>
                          <span className="font-bold text-amber-700">{camp.actualVisits}</span>
                        </div>
                        <span className="text-gray-300">$\rightarrow$</span>
                        <div className="text-center">
                          <span className="text-[10px] text-gray-400 block">Admits</span>
                          <span className="font-bold text-emerald-700">{camp.actualEnrollments}</span>
                        </div>
                      </div>
                    </td>

                    {/* Cost Per Admit */}
                    <td className="py-3 px-3 text-right">
                      <span className="font-bold text-gray-900">
                        {camp.actualEnrollments > 0 ? formatCurrency(camp.costPerEnrollment) : '—'}
                      </span>
                      <div className="text-[10px] text-gray-400">
                        CPL: {formatCurrency(camp.costPerLead)}
                      </div>
                    </td>

                    {/* Conversion Rate */}
                    <td className="py-3 px-3 text-right">
                      <span className={`font-bold ${camp.leadToEnrollmentConversion >= 10 ? 'text-emerald-600' : 'text-gray-700'}`}>
                        {camp.leadToEnrollmentConversion}%
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(camp.status)}
                    </td>

                    {/* Intelligence & Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Diagnose Button */}
                        <button
                          onClick={() => onSelectCampaignDiagnosis(camp)}
                          title="Diagnose: Why did this perform this way?"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Stethoscope className="w-4 h-4" />
                        </button>

                        {/* QR Code generator */}
                        <button
                          onClick={() => onOpenQrModal(camp)}
                          title="View / Generate Offline QR Code"
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>


                        {/* Pause / Resume */}
                        {camp.status === 'Active' ? (
                          <button
                            onClick={() => onStatusChange(camp.id, 'Paused')}
                            title="Pause Campaign"
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onStatusChange(camp.id, 'Active')}
                            title="Resume / Activate Campaign"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => onDeleteCampaign(camp.id)}
                          title="Delete Campaign"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
