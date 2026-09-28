import { useState, useEffect } from 'react';
import { 
  Percent, 
  CheckCircle, 
  XCircle, 
  X 
} from 'lucide-react';
import api from '../../lib/api';

export interface FeeConcession {
  id: string;
  enrollmentId: string;
  studentName: string;
  grade: string;
  category: string;
  concessionType: string;
  value: number;
  calculatedDiscountAmount: number;
  reason: string;
  siblingReference: string;
  requestedByCounselorName: string;
  requestedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedByUserName?: string;
  reviewedAt?: string;
  reviewRemarks?: string;
}

interface ConcessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollmentId?: string;
  studentName?: string;
  mode: 'request' | 'managePending';
  onUpdated?: () => void;
}

export default function ConcessionModal({
  isOpen,
  onClose,
  enrollmentId,
  studentName,
  mode,
  onUpdated
}: ConcessionModalProps) {
  // Request mode states
  const [category, setCategory] = useState('Sibling');
  const [concessionType, setConcessionType] = useState('Percentage');
  const [value, setValue] = useState('15');
  const [reason, setReason] = useState('');
  const [siblingRef, setSiblingRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Manage pending mode states
  const [pendingList, setPendingList] = useState<FeeConcession[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && mode === 'managePending') {
      fetchPendingConcessions();
    }
  }, [isOpen, mode]);

  const fetchPendingConcessions = async () => {
    setLoadingPending(true);
    try {
      const res = await api.get('/api/enrollments/concessions/pending');
      setPendingList(res.data);
    } catch (err) {
      console.error('Failed to load pending concessions', err);
    } finally {
      setLoadingPending(false);
    }
  };

  if (!isOpen) return null;

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentId) return;

    setSubmitting(true);
    try {
      await api.post(`/api/enrollments/${enrollmentId}/concessions`, {
        category,
        concessionType,
        value: Number(value),
        reason: reason.trim(),
        siblingReference: siblingRef.trim(),
        counselorName: 'Admission Counselor'
      });
      setRequestSuccess(true);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to submit concession', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewDecision = async (concessionId: string, status: 'Approved' | 'Rejected') => {
    setActionInProgress(concessionId);
    try {
      await api.put(`/api/enrollments/concessions/${concessionId}/review`, {
        status,
        reviewerName: 'School Principal (Admin)',
        remarks: status === 'Approved' ? 'Granted concession' : 'Declined policy criteria'
      });
      // Refresh list
      await fetchPendingConcessions();
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to review concession', err);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {mode === 'request' ? `Request Fee Concession / Scholarship` : `Fee Concession Approvals`}
              </h3>
              <p className="text-xs text-purple-100">
                {mode === 'request' 
                  ? `Submit concession for ${studentName || 'Student'} for Principal approval`
                  : `Review and authorize fee discounts requested by counselors`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'request' ? (
          requestSuccess ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Concession Request Submitted!</h4>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Your request for a <strong>{value}{concessionType === 'Percentage' ? '%' : ' INR'} {category} concession</strong> for <strong>{studentName}</strong> has been routed to the School Principal / SuperAdmin dashboard for approval.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Concession Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium"
                  >
                    <option value="Sibling">Sibling Concession (15-20%)</option>
                    <option value="Merit">Academic / Sports Merit Scholarship</option>
                    <option value="Defense">Defense / Armed Forces Concession</option>
                    <option value="Staff">School Staff Ward Concession</option>
                    <option value="FinancialAid">Need-Based Financial Assistance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Concession Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setConcessionType('Percentage'); setValue('15'); }}
                      className={`py-2 text-xs font-semibold rounded-lg border transition ${
                        concessionType === 'Percentage'
                          ? 'bg-purple-50 border-purple-600 text-purple-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setConcessionType('FixedAmount'); setValue('10000'); }}
                      className={`py-2 text-xs font-semibold rounded-lg border transition ${
                        concessionType === 'FixedAmount'
                          ? 'bg-purple-50 border-purple-600 text-purple-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Fixed Amount (₹)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Discount Value ({concessionType === 'Percentage' ? 'e.g. 15 for 15%' : 'Amount in INR'}) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={concessionType === 'Percentage' ? 100 : 200000}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {category === 'Sibling' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Elder Sibling Name & Roll Number / Grade *
                  </label>
                  <input
                    type="text"
                    required
                    value={siblingRef}
                    onChange={(e) => setSiblingRef(e.target.value)}
                    placeholder="e.g. Priya Sharma (Grade 7, Roll #24)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason & Counselor Justification *
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Parent confirmed elder daughter studies in Grade 7. Documents verified."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="pt-2 flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting Request...' : 'Submit for Principal Approval'}
                </button>
              </div>
            </form>
          )
        ) : (
          /* Manage Pending Concessions Screen for Admins */
          <div className="p-6 space-y-4">
            {loadingPending ? (
              <div className="py-12 text-center text-sm text-gray-500">
                Loading pending concession requests...
              </div>
            ) : pendingList.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-gray-800">All Concession Requests Cleared!</h4>
                <p className="text-xs text-gray-500">There are no pending fee concessions awaiting approval.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {pendingList.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl border border-gray-200 bg-slate-50 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-gray-900">{item.studentName}</span>
                          <span className="text-xs text-gray-500">({item.grade})</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Requested: <strong>{item.value}{item.concessionType === 'Percentage' ? '%' : ' INR'}</strong> (Approx. ₹{item.calculatedDiscountAmount.toLocaleString()})
                        </p>
                        {item.siblingReference && (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Sibling: {item.siblingReference}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                          "{item.reason}"
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          disabled={actionInProgress === item.id}
                          onClick={() => handleReviewDecision(item.id, 'Approved')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center space-x-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionInProgress === item.id}
                          onClick={() => handleReviewDecision(item.id, 'Rejected')}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-lg transition flex items-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
