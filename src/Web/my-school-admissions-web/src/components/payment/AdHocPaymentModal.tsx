import { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  CreditCard, 
  DollarSign, 
  X, 
  Bus, 
  BookOpen, 
  FlaskConical, 
  Trophy, 
  AlertTriangle, 
  Building, 
  CheckCircle2,
  Share2
} from 'lucide-react';
import api from '../../lib/api';
import { launchRazorpayCheckout } from '../../lib/razorpay';
import { type Enrollment, type Payment, type Receipt } from '../../types';

interface AdHocPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollments: Enrollment[];
  selectedEnrollment?: Enrollment | null;
  onPaymentCompleted: (payment: Payment, receipt?: Receipt) => void;
  onOpenShareLink?: (enrollment: Enrollment, defaultCategory: string, defaultAmount: string, defaultNotes: string) => void;
}

const AD_HOC_CATEGORIES = [
  { id: 'TransportFee', label: 'Transport / Bus Route Fee', icon: Bus, defaultAmt: '4500', sampleNote: 'Route 14 (Indiranagar to Campus) AC Bus Pass for Term 1' },
  { id: 'BooksUniform', label: 'Books & Uniform Kit', icon: BookOpen, defaultAmt: '6200', sampleNote: 'Complete syllabus textbooks, workbooks, school diary, and 2 sets uniform' },
  { id: 'LabDeposit', label: 'STEM & Robotics Lab Deposit', icon: FlaskConical, defaultAmt: '5000', sampleNote: 'Robotics kit allocation and science laboratory caution deposit' },
  { id: 'SportsCoaching', label: 'Sports Academy & Coaching', icon: Trophy, defaultAmt: '3500', sampleNote: 'After-school professional football/cricket coaching and kit' },
  { id: 'CautionDeposit', label: 'Refundable Caution Money', icon: Building, defaultAmt: '10000', sampleNote: 'Institutional library and campus assets security deposit' },
  { id: 'LateFee', label: 'Late Processing Surcharge', icon: AlertTriangle, defaultAmt: '1500', sampleNote: 'Late document submission and admission seat revalidation fee' },
  { id: 'CustomAdHoc', label: 'Other Custom Ad-Hoc Fee', icon: PlusCircle, defaultAmt: '', sampleNote: 'Specific purpose and reason for this ad-hoc charge' },
];

export default function AdHocPaymentModal({
  isOpen,
  onClose,
  enrollments,
  selectedEnrollment,
  onPaymentCompleted,
  onOpenShareLink
}: AdHocPaymentModalProps) {
  const [enrollmentId, setEnrollmentId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('TransportFee');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('4500');
  const [notes, setNotes] = useState<string>('Route 14 (Indiranagar to Campus) AC Bus Pass for Term 1');
  const [paymentMode, setPaymentMode] = useState<'razorpay' | 'counter'>('razorpay');
  const [counterRef, setCounterRef] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isFallbackModalOpen, setIsFallbackModalOpen] = useState<boolean>(false);
  const [fallbackOrderData, setFallbackOrderData] = useState<any>(null);

  useEffect(() => {
    if (selectedEnrollment && selectedEnrollment.id) {
      setEnrollmentId(selectedEnrollment.id);
    } else if (enrollments.length > 0 && !enrollmentId) {
      setEnrollmentId(enrollments[0].id || '');
    }
  }, [selectedEnrollment, enrollments, isOpen]);

  if (!isOpen) return null;

  const currentEnrollment = enrollments.find(e => e.id === enrollmentId) || selectedEnrollment;

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const found = AD_HOC_CATEGORIES.find(c => c.id === catId);
    if (found && found.defaultAmt) {
      setAmount(found.defaultAmt);
    }
    if (found && found.sampleNote && catId !== 'CustomAdHoc') {
      setNotes(found.sampleNote);
    }
  };

  const effectiveCategoryTitle = categoryId === 'CustomAdHoc' 
    ? (customTitle.trim() || 'Custom Ad-Hoc Fee') 
    : (AD_HOC_CATEGORIES.find(c => c.id === categoryId)?.label || 'Ad-Hoc Fee');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentId || !notes.trim()) return;

    const parsedAmount = parseFloat(amount || '0');
    if (parsedAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setIsProcessing(true);

    try {
      if (paymentMode === 'counter') {
        // Record offline counter payment
        const refNo = counterRef.trim() || `MAN-ADHOC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const response = await api.post(`/api/enrollments/${enrollmentId}/payments`, {
          amount: parsedAmount,
          referenceNumber: refNo,
          remarks: `Ad-hoc: ${effectiveCategoryTitle}`,
          notes: notes.trim(),
          feeCategory: effectiveCategoryTitle,
          isAdHoc: true
        });

        const receiptRes = await api.get<Receipt>(`/api/enrollments/${enrollmentId}/receipts/${response.data.id}`).catch(() => null);
        onPaymentCompleted(response.data, receiptRes?.data);
        onClose();
      } else {
        // Online Razorpay Payment
        // 1. Create order on backend
        const orderRes = await api.post(`/api/enrollments/${enrollmentId}/payments/create-order`, {
          amount: parsedAmount,
          currency: 'INR',
          paymentMethod: 'Razorpay Online',
          feeCategory: effectiveCategoryTitle,
          isAdHoc: true,
          notes: notes.trim(),
          description: `Ad-Hoc Fee: ${effectiveCategoryTitle} for ${currentEnrollment?.studentName}`
        });

        const { orderId, paymentId } = orderRes.data;

        // 2. Launch Razorpay Checkout
        const launched = await launchRazorpayCheckout({
          key: 'rzp_test_myschooladmissions2026',
          amount: parsedAmount,
          currency: 'INR',
          name: 'MySchoolAdmissions',
          description: `Ad-Hoc Fee: ${effectiveCategoryTitle}`,
          order_id: orderId,
          prefill: {
            name: currentEnrollment?.studentName || '',
            email: 'parent@example.com',
            contact: '+919876543210',
          },
          notes: {
            enrollmentId,
            category: effectiveCategoryTitle,
            notes: notes.trim()
          },
          onSuccess: async (rzpRes) => {
            // Webhook/verification
            const webhookRes = await api.post('/api/enrollments/payments/webhook', {
              orderId: rzpRes.razorpay_order_id || orderId,
              gatewayPaymentId: rzpRes.razorpay_payment_id,
              signature: rzpRes.razorpay_signature || `sig_${Math.random().toString(36).substring(7)}`,
              status: 'Captured',
              paymentMethod: 'Razorpay UPI'
            });

            const receiptId = webhookRes.data.paymentId || paymentId;
            const receiptRes = await api.get<Receipt>(`/api/enrollments/${enrollmentId}/receipts/${receiptId}`).catch(() => null);
            
            onPaymentCompleted({
              id: receiptId,
              enrollmentId,
              amount: parsedAmount,
              paymentDate: new Date().toISOString(),
              referenceNumber: rzpRes.razorpay_payment_id,
              status: 'Completed',
              remarks: `Ad-hoc: ${effectiveCategoryTitle}`,
              notes: notes.trim(),
              feeCategory: effectiveCategoryTitle,
              isAdHoc: true,
              paymentMethod: 'Razorpay Online'
            }, receiptRes?.data);
            
            onClose();
          },
          onError: (err) => {
            console.error('Razorpay payment error:', err);
            alert('Razorpay payment authorization was cancelled or failed.');
          }
        });

        // If Razorpay SDK couldn't load (offline/ad-blocked), show fallback modal
        if (!launched) {
          setFallbackOrderData({
            orderId,
            paymentId,
            amount: parsedAmount,
            category: effectiveCategoryTitle
          });
          setIsFallbackModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Error processing ad-hoc payment:', error);
      alert('Could not record payment. Please check inputs and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulatedFallbackSuccess = async () => {
    if (!fallbackOrderData) return;
    setIsProcessing(true);

    try {
      const webhookRes = await api.post('/api/enrollments/payments/webhook', {
        orderId: fallbackOrderData.orderId,
        gatewayPaymentId: `pay_${Date.now()}`,
        signature: `sig_mock_${Math.random().toString(36).substring(7)}`,
        status: 'Captured',
        paymentMethod: 'Razorpay UPI'
      });

      const receiptId = webhookRes.data.paymentId || fallbackOrderData.paymentId;
      const receiptRes = await api.get<Receipt>(`/api/enrollments/${enrollmentId}/receipts/${receiptId}`).catch(() => null);

      onPaymentCompleted({
        id: receiptId,
        enrollmentId,
        amount: fallbackOrderData.amount,
        paymentDate: new Date().toISOString(),
        referenceNumber: `RZP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'Completed',
        remarks: `Ad-hoc: ${fallbackOrderData.category}`,
        notes: notes.trim(),
        feeCategory: fallbackOrderData.category,
        isAdHoc: true,
        paymentMethod: 'Razorpay UPI'
      }, receiptRes?.data);

      setIsFallbackModalOpen(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-xs transition-opacity" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white p-5 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/15 rounded-xl border border-white/20 shadow-xs">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Collect Ad Hoc Payment</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-amber-100 border border-white/25 uppercase">
                    Ad Hoc Ledger
                  </span>
                </div>
                <p className="text-xs text-amber-100 mt-0.5">Collect irregular fees (Transport, Books, Caution Deposit) with mandatory notes</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            
            {/* Candidate Selector */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Candidate / Student *
              </label>
              <select
                value={enrollmentId}
                onChange={e => setEnrollmentId(e.target.value)}
                required
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {enrollments.map(enr => (
                  <option key={enr.id} value={enr.id}>
                    {enr.studentName} — {enr.grade} ({enr.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Fee Category Pills */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1.5">
                Ad Hoc Fee Category *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AD_HOC_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-start space-x-2 transition ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/90 text-amber-900 ring-2 ring-amber-500/20 font-bold'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-amber-700' : 'text-gray-400'}`} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[11px]">{cat.label}</div>
                        {cat.defaultAmt && (
                          <div className="text-[10px] text-amber-700 font-bold mt-0.5">₹{parseFloat(cat.defaultAmt).toLocaleString('en-IN')}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {categoryId === 'CustomAdHoc' && (
                <div className="mt-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter custom ad-hoc fee title (e.g. Lost ID card fine, Field trip pass)"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    className="w-full p-2 border border-amber-300 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Ad Hoc Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">₹</span>
                <input
                  type="number"
                  required
                  min="50"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="e.g. 4500"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg font-bold text-base text-gray-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Mandatory Notes / Details */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-gray-700 flex items-center gap-1">
                  <span>Ad Hoc Fee Notes / Reason *</span>
                  <span className="text-[10px] text-amber-600 font-bold">(Mandatory)</span>
                </label>
                <span className="text-[10px] text-gray-400">Printed on official receipt</span>
              </div>
              <textarea
                rows={3}
                required
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Route 14 AC Bus Pass charges for Term 1, pickup from Indiranagar Metro Station"
                className="w-full p-2.5 border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none bg-amber-50/20"
              />
            </div>

            {/* Payment Collection Channel */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1.5">
                Collection Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('razorpay')}
                  className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition ${
                    paymentMode === 'razorpay'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Razorpay Online</span>
                  </div>
                  <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded font-bold">Live</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('counter')}
                  className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition ${
                    paymentMode === 'counter'
                      ? 'border-gray-800 bg-gray-100 text-gray-900 ring-2 ring-gray-700/20 font-bold'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-gray-700" />
                    <span>Counter / Cash / POS</span>
                  </div>
                  <span className="text-[9px] bg-gray-200 text-gray-700 px-1 rounded font-semibold">Offline</span>
                </button>
              </div>

              {paymentMode === 'counter' && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Enter Cheque / Demand Draft / POS Swipe Ref No. (Optional)"
                    value={counterRef}
                    onChange={e => setCounterRef(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>

            {/* Alternative Option: Share as Payment Link instead */}
            {onOpenShareLink && currentEnrollment && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-900 block text-[11px]">Want parents to pay from home?</span>
                  <span className="text-[10px] text-blue-600">Send this Ad Hoc fee as a secure Razorpay payment link via WhatsApp</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenShareLink(currentEnrollment, effectiveCategoryTitle, amount, notes);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Share Link</span>
                </button>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Authorizing Payment...</span>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Confirm & Collect ₹{parseFloat(amount || '0').toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Simulated Razorpay Test Dialog Fallback when offline or SDK blocked */}
          {isFallbackModalOpen && fallbackOrderData && (
            <div className="fixed z-60 inset-0 overflow-y-auto bg-gray-900/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-xs">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold">RZP</div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900">Razorpay Standard Checkout</h4>
                      <p className="text-[10px] text-gray-500">Test Sandbox Mode</p>
                    </div>
                  </div>
                  <button onClick={() => setIsFallbackModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex justify-between font-semibold text-gray-700">
                    <span>Fee Purpose:</span>
                    <span className="font-bold text-gray-900">{fallbackOrderData.category}</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-emerald-800 mt-1">
                    <span>Amount:</span>
                    <span>₹{fallbackOrderData.amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Select Test Payment Method</span>
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                    <span className="font-semibold text-gray-800">⚡ Instant UPI (GPay / PhonePe / QR)</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSimulatedFallbackSuccess}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition"
                >
                  {isProcessing ? 'Authorizing...' : `Simulate Razorpay Payment Success`}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
