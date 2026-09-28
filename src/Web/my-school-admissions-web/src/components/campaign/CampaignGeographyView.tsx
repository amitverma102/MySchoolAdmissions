import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  Navigation, 
  Bus
} from 'lucide-react';
import type { GeographyPerformance } from '../../types/campaign';

interface Props {
  geographies: GeographyPerformance[];
  loading: boolean;
}

export const CampaignGeographyView: React.FC<Props> = ({ geographies, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = geographies.filter(g => 
    g.pinCode.includes(searchTerm) ||
    g.locality.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.distanceBracket.includes(searchTerm)
  );

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-bold text-gray-900">Geographic & PIN Code Intelligence</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Catchment analysis, distance thresholds, bus route alignment, and neighborhood conversion density
          </p>
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search PIN code or locality..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Proximity Insight Callout */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-xs">
        <Bus className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-blue-900">Commute Threshold Finding (0–5 km vs 7+ km)</h4>
          <p className="text-blue-800 mt-0.5">
            Leads residing within 5 km of campus convert at <strong>19.6%</strong> with an average CAC of ₹1,166. Conversion drops sharply to <strong>5.3%</strong> beyond 7 km, where parent exit interviews cite bus transit times exceeding 45 minutes as the #1 objection.
          </p>
        </div>
      </div>

      {/* Geography Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">Loading geography data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">PIN Code & Locality</th>
                  <th className="py-3 px-3">Catchment Radius</th>
                  <th className="py-3 px-3 text-right">Inquiries</th>
                  <th className="py-3 px-3 text-right">Campus Visits</th>
                  <th className="py-3 px-3 text-right">Admissions</th>
                  <th className="py-3 px-3 text-right">Admit Rate %</th>
                  <th className="py-3 px-3 text-right">Total Spend</th>
                  <th className="py-3 px-4 text-right">Cost / Admit (CAC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((geo, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                          {geo.pinCode}
                        </span>
                        <span className="font-semibold text-gray-900">{geo.locality}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-600 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-gray-400" /> {geo.distanceBracket}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700 font-medium">{geo.leads}</td>
                    <td className="py-3 px-3 text-right text-amber-800 font-medium">{geo.visits}</td>
                    <td className="py-3 px-3 text-right text-emerald-800 font-bold">{geo.enrollments}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-bold ${geo.enrollmentConversionRate > 10 ? 'text-emerald-600' : 'text-gray-700'}`}>
                        {geo.enrollmentConversionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700">{formatCurrency(geo.totalSpend)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${geo.costPerEnrollment <= 1500 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(geo.costPerEnrollment)}
                      </span>
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
