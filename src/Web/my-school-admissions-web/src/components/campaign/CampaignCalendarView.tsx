import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  Clock, 
  MapPin
} from 'lucide-react';
import type { CampaignCalendarEvent } from '../../types/campaign';

interface Props {
  events: CampaignCalendarEvent[];
  loading: boolean;
}

export const CampaignCalendarView: React.FC<Props> = ({ events, loading }) => {
  const [filterType, setFilterType] = useState<string>('All');

  const filtered = events.filter(e => {
    if (filterType === 'All') return true;
    return e.eventType === filterType;
  });

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'Campaign':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Campaign</span>;
      case 'OpenHouse':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Open House</span>;
      case 'AdmissionDeadline':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">Deadline</span>;
      case 'ExamPeriod':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Exam Window</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">Admissions Campaign Timeline & AI Conflict Engine</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Synchronized calendar of digital campaigns, society showcases, open house walkthroughs, and academic exam periods
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['All', 'Campaign', 'OpenHouse', 'AdmissionDeadline', 'ExamPeriod'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                filterType === type 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {type === 'AdmissionDeadline' ? 'Deadlines' : type === 'ExamPeriod' ? 'Exams' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Conflict Alert Banner */}
      {events.some(e => e.hasConflict) && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-amber-900">AI Scheduling Conflict Detected</h4>
            <p className="text-amber-800 mt-1">
              {events.find(e => e.hasConflict)?.conflictReason}
            </p>
          </div>
        </div>
      )}

      {/* Calendar Event Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-gray-500 bg-white rounded-xl border">Loading calendar events...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
          {filtered.map(evt => (
            <div 
              key={evt.id} 
              className={`p-4 hover:bg-gray-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                evt.hasConflict ? 'bg-amber-50/20' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getEventBadge(evt.eventType)}
                  <h3 className="font-bold text-sm text-gray-900">{evt.title}</h3>
                  {evt.hasConflict && (
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Schedule Overlap
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {new Date(evt.startDate).toLocaleDateString()} — {new Date(evt.endDate).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span>Channel: <strong className="text-gray-700">{evt.channel}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" /> {evt.schoolName}
                  </span>
                </div>

                {evt.conflictReason && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                    ⚠️ {evt.conflictReason}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  evt.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                }`}>
                  {evt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
