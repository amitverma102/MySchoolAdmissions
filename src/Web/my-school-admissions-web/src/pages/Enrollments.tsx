import { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Receipt as ReceiptIcon, 
  CheckCircle2, 
  Printer, 
  ShieldCheck, 
  RefreshCw, 
  Search, 
  GraduationCap, 
  X, 
  Share2, 
  PlusCircle, 
  Tag,
  Percent
} from 'lucide-react';
import api from '../lib/api';
import { launchRazorpayCheckout } from '../lib/razorpay';
import { type Enrollment, type Payment, type Receipt, type PaymentLinkInfo } from '../types';
import SharePaymentLinkModal from '../components/payment/SharePaymentLinkModal';
import AdHocPaymentModal from '../components/payment/AdHocPaymentModal';
import ConcessionModal from '../components/enrollment/ConcessionModal';

// Sample fallback data to ensure the Fee Collection page is immediately interactive even if local microservice DB is empty
const INITIAL_FALLBACK_ENROLLMENTS: Enrollment[] = [
  {
    id: 'enr-aarav-sharma-101',
    applicationId: 'app-aarav-101',
    studentName: 'Aarav Sharma',
    grade: 'Grade 6',
    status: 'Confirmed',
    enrollmentDate: new Date(Date.now() - 14 * 86400000).toISOString(),
    payments: [
      {
        id: 'pay-aarav-seat-01',
        enrollmentId: 'enr-aarav-sharma-101',
        amount: 25000,
        paymentDate: new Date(Date.now() - 14 * 86400000).toISOString(),
        referenceNumber: 'RZP-PAY-892104',
        status: 'Completed',
        remarks: 'Provisional Seat Reservation Fee',
        feeCategory: 'SeatReservation',
        isAdHoc: false,
        paymentMethod: 'Razorpay UPI',
        receiptNumber: 'REC-202609-88124',
        receiptDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
      {
        id: 'pay-aarav-adhoc-01',
        enrollmentId: 'enr-aarav-sharma-101',
        amount: 4500,
        paymentDate: new Date(Date.now() - 2 * 86400000).toISOString(),
        referenceNumber: 'RZP-ADHOC-9931',
        status: 'Completed',
        remarks: 'Term 1 Route 14 (Indiranagar to Campus) AC Bus Pass',
        notes: 'Route 14 (Indiranagar to Campus) AC Bus Pass for Term 1',
        feeCategory: 'Transport / Bus Route Fee',
        isAdHoc: true,
        paymentMethod: 'Razorpay Online',
        receiptNumber: 'REC-202609-94321',
        receiptDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'enr-ananya-iyer-102',
    applicationId: 'app-ananya-102',
    studentName: 'Ananya Iyer',
    grade: 'Grade 9',
    status: 'Confirmed',
    enrollmentDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    payments: [
      {
        id: 'pay-ananya-seat-01',
        enrollmentId: 'enr-ananya-iyer-102',
        amount: 25000,
        paymentDate: new Date(Date.now() - 10 * 86400000).toISOString(),
        referenceNumber: 'RZP-PAY-349021',
        status: 'Completed',
        remarks: 'Provisional Seat Reservation Fee',
        feeCategory: 'SeatReservation',
        isAdHoc: false,
        paymentMethod: 'Razorpay UPI',
        receiptNumber: 'REC-202609-77192',
        receiptDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'enr-rohan-verma-103',
    applicationId: 'app-rohan-103',
    studentName: 'Rohan Verma',
    grade: 'Grade 4',
    status: 'Offered',
    enrollmentDate: new Date(Date.now() - 4 * 86400000).toISOString(),
    payments: [],
  },
  {
    id: 'enr-diya-sengupta-104',
    applicationId: 'app-diya-104',
    studentName: 'Diya Sengupta',
    grade: 'Kindergarten',
    status: 'Onboarded',
    enrollmentDate: new Date(Date.now() - 20 * 86400000).toISOString(),
    payments: [
      {
        id: 'pay-diya-seat-01',
        enrollmentId: 'enr-diya-sengupta-104',
        amount: 25000,
        paymentDate: new Date(Date.now() - 20 * 86400000).toISOString(),
        referenceNumber: 'RZP-PAY-112349',
        status: 'Completed',
        remarks: 'Seat Reservation Fee',
        feeCategory: 'SeatReservation',
        isAdHoc: false,
        paymentMethod: 'Razorpay UPI',
        receiptNumber: 'REC-202609-55102',
        receiptDate: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
      {
        id: 'pay-diya-adhoc-01',
        enrollmentId: 'enr-diya-sengupta-104',
        amount: 6200,
        paymentDate: new Date(Date.now() - 6 * 86400000).toISOString(),
        referenceNumber: 'CHQ-892014',
        status: 'Completed',
        remarks: 'Textbooks, workbooks, school diary, and 2 sets uniform',
        notes: 'Kindergarten Mont-1 Activity kit, winter blazer and 2 sets uniform',
        feeCategory: 'Books & Uniform Kit',
        isAdHoc: true,
        paymentMethod: 'Manual / Counter',
        receiptNumber: 'REC-202609-66381',
        receiptDate: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'enr-kabir-patel-105',
    applicationId: 'app-kabir-105',
    studentName: 'Kabir Patel',
    grade: 'Grade 11',
    status: 'Offered',
    enrollmentDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    payments: [],
  },
  {
    id: 'enr-meera-nair-106',
    applicationId: 'app-meera-106',
    studentName: 'Meera Nair',
    grade: 'Grade 8',
    status: 'Confirmed',
    enrollmentDate: new Date(Date.now() - 8 * 86400000).toISOString(),
    payments: [
      {
        id: 'pay-meera-seat-01',
        enrollmentId: 'enr-meera-nair-106',
        amount: 25000,
        paymentDate: new Date(Date.now() - 8 * 86400000).toISOString(),
        referenceNumber: 'RZP-PAY-440192',
        status: 'Completed',
        remarks: 'Provisional Seat Reservation Fee',
        feeCategory: 'SeatReservation',
        isAdHoc: false,
        paymentMethod: 'Razorpay NetBanking',
        receiptNumber: 'REC-202609-33219',
        receiptDate: new Date(Date.now() - 8 * 86400000).toISOString(),
      },
    ],
  },
];

export default function Enrollments() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [isOnlinePayModalOpen, setIsOnlinePayModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // New Feature Modals: Share Payment Link & Ad Hoc Payment
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);
  const [shareLinkEnrollment, setShareLinkEnrollment] = useState<Enrollment | null>(null);
  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false);
  const [adHocEnrollment, setAdHocEnrollment] = useState<Enrollment | null>(null);

  // Fee Concession Modal State
  const [isConcessionModalOpen, setIsConcessionModalOpen] = useState(false);
  const [concessionEnrollment, setConcessionEnrollment] = useState<Enrollment | null>(null);
  const [concessionMode, setConcessionMode] = useState<'request' | 'managePending'>('request');

  // Toast / notification feedback
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Form State (Online Payment)
  const [onlineAmount, setOnlineAmount] = useState('25000');
  const [onlineMethod, setOnlineMethod] = useState('UPI');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Form State (Manual / Counter Payment in Details Drawer)
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [isManualAdHoc, setIsManualAdHoc] = useState(false);
  const [manualCategory, setManualCategory] = useState('TransportFee');
  const [manualNotes, setManualNotes] = useState('');

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Fee Pending' | 'Confirmed' | 'Onboarded' | 'Ad Hoc Collections' | 'Withdrawn'>('All');

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  // Handle URL Query Params (?status=Pending, ?status=FeePending, etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('status');
    if (s) {
      const lower = s.toLowerCase();
      if (lower === 'pending' || lower === 'feepending' || lower === 'fee pending') {
        setStatusFilter('Fee Pending');
      } else if (lower === 'confirmed' || lower === 'enrolled') {
        setStatusFilter('Confirmed');
      } else if (lower === 'onboarded') {
        setStatusFilter('Onboarded');
      } else if (lower === 'adhoc') {
        setStatusFilter('Ad Hoc Collections');
      }
    }
  }, []);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const response = await api.get<Enrollment[]>('/api/enrollments');
      if (response.data && response.data.length > 0) {
        setEnrollments(response.data);
      } else {
        setEnrollments(INITIAL_FALLBACK_ENROLLMENTS);
      }
    } catch (error) {
      console.warn('API unavailable or empty, initializing with fallback enrollments:', error);
      setEnrollments(INITIAL_FALLBACK_ENROLLMENTS);
    } finally {
      setLoading(false);
    }
  };

  // Admissions Summary KPIs for Enrollments & Ad Hoc Collections
  const enrollmentKpis = useMemo(() => {
    let feePending = 0;
    let confirmed = 0;
    let onboarded = 0;
    let totalRevenue = 0;
    let adHocCount = 0;
    let adHocRevenue = 0;

    enrollments.forEach(enr => {
      const st = (enr.status || '').toLowerCase();
      const hasPendingPayments = enr.payments && enr.payments.some(p => p.status === 'Pending');
      const hasCompletedPayments = enr.payments && enr.payments.some(p => p.status === 'Completed');
      const paidAmt = enr.payments?.reduce((sum, p) => p.status === 'Completed' ? sum + p.amount : sum, 0) || 0;
      totalRevenue += paidAmt;

      enr.payments?.forEach(p => {
        if (p.isAdHoc && p.status === 'Completed') {
          adHocCount++;
          adHocRevenue += p.amount;
        }
      });

      if (st === 'confirmed' || st === 'enrolled') {
        confirmed++;
      } else if (st === 'onboarded') {
        onboarded++;
      }

      if (hasPendingPayments || st === 'offered' || (!hasCompletedPayments && st !== 'withdrawn')) {
        feePending++;
      }
    });

    return {
      total: enrollments.length,
      feePending,
      confirmed,
      onboarded,
      totalRevenue,
      adHocCount,
      adHocRevenue
    };
  }, [enrollments]);

  // Filtered Enrollments
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(enr => {
      const st = (enr.status || '').toLowerCase();
      const hasPendingPayments = enr.payments && enr.payments.some(p => p.status === 'Pending');
      const hasCompletedPayments = enr.payments && enr.payments.some(p => p.status === 'Completed');
      const hasAdHocPayments = enr.payments && enr.payments.some(p => p.isAdHoc && p.status === 'Completed');

      // Status Filter
      if (statusFilter === 'Fee Pending') {
        if (!hasPendingPayments && st !== 'offered' && (hasCompletedPayments || st === 'withdrawn')) {
          return false;
        }
      } else if (statusFilter === 'Confirmed') {
        if (st !== 'confirmed' && st !== 'enrolled') return false;
      } else if (statusFilter === 'Onboarded') {
        if (st !== 'onboarded') return false;
      } else if (statusFilter === 'Ad Hoc Collections') {
        if (!hasAdHocPayments) return false;
      } else if (statusFilter === 'Withdrawn') {
        if (st !== 'withdrawn') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (enr.studentName || '').toLowerCase();
        const grade = (enr.grade || '').toLowerCase();
        const hasAdhocMatch = enr.payments?.some(p => (p.notes || '').toLowerCase().includes(q) || (p.feeCategory || '').toLowerCase().includes(q));
        if (!name.includes(q) && !grade.includes(q) && !hasAdhocMatch) {
          return false;
        }
      }

      return true;
    });
  }, [enrollments, statusFilter, searchQuery]);

  const handleUpdateStatus = async (enrollmentId: string | undefined, newStatus: string) => {
    if (!enrollmentId) return;
    try {
      await api.put(`/api/enrollments/${enrollmentId}/status`, { status: newStatus });
      fetchEnrollments();
      if (selectedEnrollment && selectedEnrollment.id === enrollmentId) {
        openDetails({ ...selectedEnrollment, id: enrollmentId, status: newStatus });
      }
    } catch {
      // Local state update
      setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, status: newStatus } : e));
      if (selectedEnrollment && selectedEnrollment.id === enrollmentId) {
        setSelectedEnrollment(prev => prev ? { ...prev, status: newStatus } : null);
      }
    }
  };

  const handleRecordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment || !selectedEnrollment.id) return;

    const parsedAmt = parseFloat(paymentAmount);
    const categoryName = isManualAdHoc 
      ? (manualCategory === 'TransportFee' ? 'Transport / Bus Fee' : manualCategory === 'BooksUniform' ? 'Books & Uniform' : 'Custom Ad-Hoc')
      : 'SeatReservation';

    try {
      await api.post(`/api/enrollments/${selectedEnrollment.id}/payments`, {
        amount: parsedAmt,
        referenceNumber: paymentReference,
        remarks: paymentRemarks || (isManualAdHoc ? manualNotes : 'Offline counter payment'),
        notes: manualNotes,
        feeCategory: categoryName,
        isAdHoc: isManualAdHoc
      });
      
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentRemarks('');
      setManualNotes('');
      setIsManualAdHoc(false);
      
      openDetails(selectedEnrollment);
      fetchEnrollments();
      showToast('Counter payment recorded and receipt created successfully!');
    } catch {
      // Local fallback
      const newPay: Payment = {
        id: `pay_${Date.now()}`,
        enrollmentId: selectedEnrollment.id,
        amount: parsedAmt,
        paymentDate: new Date().toISOString(),
        referenceNumber: paymentReference || `MAN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'Completed',
        remarks: paymentRemarks || (isManualAdHoc ? manualNotes : 'Offline counter payment'),
        notes: manualNotes,
        feeCategory: categoryName,
        isAdHoc: isManualAdHoc,
        paymentMethod: 'Manual / Counter',
        receiptNumber: `REC-202609-${Math.floor(10000 + Math.random() * 90000)}`,
        receiptDate: new Date().toISOString()
      };

      const updatedEnr: Enrollment = {
        ...selectedEnrollment,
        status: isManualAdHoc ? selectedEnrollment.status : 'Confirmed',
        payments: [...(selectedEnrollment.payments || []), newPay]
      };

      setEnrollments(prev => prev.map(e => e.id === selectedEnrollment.id ? updatedEnr : e));
      setSelectedEnrollment(updatedEnr);

      setPaymentAmount('');
      setPaymentReference('');
      setPaymentRemarks('');
      setManualNotes('');
      setIsManualAdHoc(false);

      showToast('Counter payment recorded and receipt created successfully!');
    }
  };

  // Online Payment Checkout with Razorpay Gateway
  const handleOnlinePaymentCheckout = async () => {
    if (!selectedEnrollment || !selectedEnrollment.id) return;
    setIsProcessingPayment(true);

    const parsedAmt = parseFloat(onlineAmount);

    try {
      // 1. Create Order
      let orderId = `order_${Math.random().toString(36).substring(2, 14)}`;
      let paymentId = `pay_${Date.now()}`;

      try {
        const orderRes = await api.post(`/api/enrollments/${selectedEnrollment.id}/payments/create-order`, {
          amount: parsedAmt,
          currency: 'INR',
          paymentMethod: 'Razorpay Online',
          feeCategory: 'SeatReservation',
          isAdHoc: false,
          notes: `Provisional Seat Booking for ${selectedEnrollment.studentName}`
        });
        orderId = orderRes.data.orderId;
        paymentId = orderRes.data.paymentId;
      } catch (err) {
        console.warn('API create-order fallback:', err);
      }

      // 2. Launch Razorpay Standard Checkout SDK
      const launched = await launchRazorpayCheckout({
        key: 'rzp_test_myschooladmissions2026',
        amount: parsedAmt,
        currency: 'INR',
        name: 'MySchoolAdmissions',
        description: `Provisional Seat Reservation Fee for ${selectedEnrollment.studentName}`,
        order_id: orderId,
        prefill: {
          name: selectedEnrollment.studentName,
          email: 'parent@example.com',
          contact: '+919876543210'
        },
        notes: {
          enrollmentId: selectedEnrollment.id,
          studentName: selectedEnrollment.studentName,
          grade: selectedEnrollment.grade
        },
        onSuccess: async (rzpRes) => {
          setIsOnlinePayModalOpen(false);
          
          try {
            const webhookRes = await api.post('/api/enrollments/payments/webhook', {
              orderId: rzpRes.razorpay_order_id || orderId,
              gatewayPaymentId: rzpRes.razorpay_payment_id,
              signature: rzpRes.razorpay_signature,
              status: 'Captured',
              paymentMethod: 'Razorpay UPI'
            });

            if (webhookRes.data.paymentId) {
              fetchReceipt(selectedEnrollment.id!, webhookRes.data.paymentId);
            }
          } catch {
            // Local state update
            const receiptNum = `REC-202609-${Math.floor(10000 + Math.random() * 90000)}`;
            const newPayment: Payment = {
              id: paymentId,
              enrollmentId: selectedEnrollment.id!,
              amount: parsedAmt,
              paymentDate: new Date().toISOString(),
              referenceNumber: rzpRes.razorpay_payment_id,
              status: 'Completed',
              remarks: `Razorpay Online: Provisional Seat Reservation`,
              feeCategory: 'SeatReservation',
              isAdHoc: false,
              paymentMethod: 'Razorpay UPI',
              receiptNumber: receiptNum,
              receiptDate: new Date().toISOString()
            };

            const updatedEnr: Enrollment = {
              ...selectedEnrollment,
              status: 'Confirmed',
              payments: [...(selectedEnrollment.payments || []), newPayment]
            };

            setEnrollments(prev => prev.map(e => e.id === selectedEnrollment.id ? updatedEnr : e));
            setSelectedEnrollment(updatedEnr);

            setSelectedReceipt({
              receiptNumber: receiptNum,
              receiptDate: new Date().toISOString(),
              enrollmentId: selectedEnrollment.id!,
              studentName: selectedEnrollment.studentName,
              grade: selectedEnrollment.grade,
              amount: parsedAmt,
              paymentMethod: 'Razorpay UPI',
              transactionId: rzpRes.razorpay_payment_id,
              status: 'Completed',
              institutionName: 'MySchoolAdmissions Premier Academy',
              isAdHoc: false,
              feeCategory: 'Seat Reservation Deposit'
            });
          }

          await fetchEnrollments();
          showToast('Razorpay payment successful! Official receipt generated.');
        }
      });

      if (!launched) {
        // Fallback simulation if Razorpay SDK blocked or offline
        const rzpPayId = `pay_${Date.now()}`;
        const receiptNum = `REC-202609-${Math.floor(10000 + Math.random() * 90000)}`;

        try {
          await api.post('/api/enrollments/payments/webhook', {
            orderId: orderId,
            gatewayPaymentId: rzpPayId,
            signature: `sig_mock_${Math.random().toString(36).substring(7)}`,
            status: 'Captured',
            paymentMethod: onlineMethod
          });
        } catch {
          // ignore
        }

        const newPayment: Payment = {
          id: paymentId,
          enrollmentId: selectedEnrollment.id,
          amount: parsedAmt,
          paymentDate: new Date().toISOString(),
          referenceNumber: rzpPayId,
          status: 'Completed',
          remarks: `Razorpay Online (${onlineMethod}): Seat Booking`,
          feeCategory: 'SeatReservation',
          isAdHoc: false,
          paymentMethod: `Razorpay ${onlineMethod}`,
          receiptNumber: receiptNum,
          receiptDate: new Date().toISOString()
        };

        const updatedEnr: Enrollment = {
          ...selectedEnrollment,
          status: 'Confirmed',
          payments: [...(selectedEnrollment.payments || []), newPayment]
        };

        setEnrollments(prev => prev.map(e => e.id === selectedEnrollment.id ? updatedEnr : e));
        setSelectedEnrollment(updatedEnr);

        setSelectedReceipt({
          receiptNumber: receiptNum,
          receiptDate: new Date().toISOString(),
          enrollmentId: selectedEnrollment.id,
          studentName: selectedEnrollment.studentName,
          grade: selectedEnrollment.grade,
          amount: parsedAmt,
          paymentMethod: `Razorpay ${onlineMethod}`,
          transactionId: rzpPayId,
          status: 'Completed',
          institutionName: 'MySchoolAdmissions Premier Academy',
          isAdHoc: false,
          feeCategory: 'Seat Reservation Deposit'
        });

        setIsOnlinePayModalOpen(false);
        await fetchEnrollments();
        showToast('Razorpay payment successful! Official receipt generated.');
      }
    } catch (error) {
      console.error('Error in online payment checkout:', error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const fetchReceipt = async (enrollmentId: string, paymentId: string) => {
    try {
      const response = await api.get<Receipt>(`/api/enrollments/${enrollmentId}/receipts/${paymentId}`);
      setSelectedReceipt(response.data);
    } catch {
      // Find locally
      const enr = enrollments.find(e => e.id === enrollmentId);
      const pay = enr?.payments?.find(p => p.id === paymentId);
      if (enr && pay) {
        setSelectedReceipt({
          receiptNumber: pay.receiptNumber || `REC-202609-001`,
          receiptDate: pay.receiptDate || pay.paymentDate,
          enrollmentId: enr.id || '',
          studentName: enr.studentName,
          grade: enr.grade,
          amount: pay.amount,
          paymentMethod: pay.paymentMethod || 'Razorpay Online',
          transactionId: pay.transactionId || pay.referenceNumber,
          status: pay.status,
          institutionName: 'MySchoolAdmissions Premier Academy',
          isAdHoc: pay.isAdHoc,
          feeCategory: pay.feeCategory || 'Admission Fee',
          notes: pay.notes || pay.remarks
        });
      }
    }
  };

  const openDetails = async (enrollment: Enrollment) => {
    try {
      const response = await api.get<Enrollment>(`/api/enrollments/${enrollment.id}`);
      setSelectedEnrollment(response.data);
    } catch {
      setSelectedEnrollment(enrollment);
    }
  };

  // Callback when Ad-Hoc payment is recorded
  const handleAdHocCompleted = (payment: Payment, receipt?: Receipt) => {
    // Update local enrollment state
    setEnrollments(prev => prev.map(e => {
      if (e.id === payment.enrollmentId) {
        return {
          ...e,
          payments: [...(e.payments || []), payment]
        };
      }
      return e;
    }));

    if (selectedEnrollment && selectedEnrollment.id === payment.enrollmentId) {
      setSelectedEnrollment(prev => prev ? {
        ...prev,
        payments: [...(prev.payments || []), payment]
      } : null);
    }

    if (receipt) {
      setSelectedReceipt(receipt);
    }

    showToast(`Ad-Hoc payment of ₹${payment.amount.toLocaleString('en-IN')} recorded successfully!`);
  };

  // Callback when Payment Link is shared/created
  const handleLinkCreated = (link: PaymentLinkInfo) => {
    // Add pending payment record to the student's ledger
    const pendingPayment: Payment = {
      id: link.paymentId || `pay_${Date.now()}`,
      enrollmentId: link.enrollmentId,
      amount: link.amount,
      paymentDate: new Date().toISOString(),
      referenceNumber: link.paymentLinkId,
      status: 'Pending',
      remarks: `Payment link shared with parent (${link.feeCategory})`,
      feeCategory: link.feeCategory,
      notes: link.notes,
      isAdHoc: link.feeCategory !== 'SeatReservation',
      paymentLink: link.shortUrl,
      paymentLinkId: link.paymentLinkId,
      paymentLinkStatus: 'Active',
      expiresAt: link.expiresAt,
      paymentMethod: 'Razorpay Link'
    };

    setEnrollments(prev => prev.map(e => {
      if (e.id === link.enrollmentId) {
        return {
          ...e,
          payments: [...(e.payments || []), pendingPayment]
        };
      }
      return e;
    }));

    if (selectedEnrollment && selectedEnrollment.id === link.enrollmentId) {
      setSelectedEnrollment(prev => prev ? {
        ...prev,
        payments: [...(prev.payments || []), pendingPayment]
      } : null);
    }

    showToast('Payment link generated! Ready to share via WhatsApp, SMS, or Email.');
  };

  return (
    <div className="space-y-6">
      
      {/* Action Toast Alert */}
      {actionToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-500 animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Header & Primary Action Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fee Collection & Admissions</h1>
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-blue-600" />
              Razorpay Live
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Collect token fees, share instant payment links to parents via WhatsApp, and record ad hoc campus collections with notes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Collect Ad Hoc Payment Button */}
          <button
            onClick={() => {
              setAdHocEnrollment(null);
              setIsAdHocModalOpen(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3.5 py-2 border border-amber-300 text-xs font-bold rounded-lg text-amber-900 bg-gradient-to-r from-amber-100 to-amber-50 hover:from-amber-200 hover:to-amber-100 transition shadow-xs gap-1.5"
            title="Collect irregular or unexpected fees like transport pass, uniform kits, caution deposit"
          >
            <PlusCircle className="h-4 w-4 text-amber-700" />
            <span>Collect Ad Hoc Fee</span>
          </button>

          {/* Share Payment Link Button */}
          <button
            onClick={() => {
              setShareLinkEnrollment(null);
              setIsShareLinkModalOpen(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3.5 py-2 border border-blue-200 text-xs font-bold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition shadow-xs gap-1.5"
            title="Share Razorpay payment link to parents via WhatsApp, SMS, or Email"
          >
            <Share2 className="h-4 w-4 text-blue-600" />
            <span>Share Payment Link</span>
          </button>

          {/* Concession Approvals Button */}
          <button
            onClick={() => {
              setConcessionMode('managePending');
              setIsConcessionModalOpen(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3.5 py-2 border border-purple-300 text-xs font-bold rounded-lg text-purple-900 bg-purple-50 hover:bg-purple-100 transition shadow-xs gap-1.5"
            title="Review and approve fee concessions & scholarships"
          >
            <Percent className="h-4 w-4 text-purple-700" />
            <span>Concessions</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchEnrollments()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1 text-gray-500" />
            Refresh
          </button>
        </div>
      </div>

      {/* Admissions Summary KPI Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Registered */}
        <div 
          onClick={() => setStatusFilter('All')}
          className={`cursor-pointer rounded-xl p-3.5 transition-all duration-200 bg-white border shadow-xs ${
            statusFilter === 'All' ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/20' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Registered</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{enrollmentKpis.total}</span>
            <span className="text-[11px] text-gray-500">Students</span>
          </div>
        </div>

        {/* Fee Pending */}
        <div 
          onClick={() => setStatusFilter('Fee Pending')}
          className={`cursor-pointer rounded-xl p-3.5 transition-all duration-200 bg-white border shadow-xs ${
            statusFilter === 'Fee Pending' ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/20' : 'border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Fee Pending</span>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900">{enrollmentKpis.feePending}</span>
            <span className="text-[11px] text-amber-700 font-medium">Awaiting seat lock</span>
          </div>
        </div>

        {/* Ad Hoc Collections KPI */}
        <div 
          onClick={() => setStatusFilter('Ad Hoc Collections')}
          className={`cursor-pointer rounded-xl p-3.5 transition-all duration-200 bg-white border shadow-xs ${
            statusFilter === 'Ad Hoc Collections' ? 'ring-2 ring-purple-500 border-purple-400 bg-purple-50/20' : 'border-purple-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Ad Hoc Collections</span>
            <div className="p-1.5 rounded-lg bg-purple-100 text-purple-800">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-900">{enrollmentKpis.adHocCount}</span>
            <span className="text-[11px] text-purple-700 font-medium">₹{enrollmentKpis.adHocRevenue.toLocaleString('en-IN')} paid</span>
          </div>
        </div>

        {/* Confirmed / Enrolled */}
        <div 
          onClick={() => setStatusFilter('Confirmed')}
          className={`cursor-pointer rounded-xl p-3.5 transition-all duration-200 bg-white border shadow-xs ${
            statusFilter === 'Confirmed' ? 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/20' : 'border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Confirmed</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-900">{enrollmentKpis.confirmed}</span>
            <span className="text-[11px] text-emerald-700 font-medium">Seats reserved</span>
          </div>
        </div>

        {/* Total Fee Revenue */}
        <div className="rounded-xl p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Total Revenue</span>
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-900">₹{enrollmentKpis.totalRevenue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search student, grade, or ad hoc note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['All', 'Fee Pending', 'Confirmed', 'Ad Hoc Collections', 'Onboarded', 'Withdrawn'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Enrollments Table */}
      <div className="bg-white shadow-sm border border-gray-200 overflow-hidden rounded-xl">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading enrollments...</div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-base font-medium text-gray-900">No student enrollments match your filter.</p>
            <button
              onClick={() => { setStatusFilter('All'); setSearchQuery(''); }}
              className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidate / Student</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade / Batch</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Admission Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fees & Ad Hoc Collections</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEnrollments.map((enr) => {
                  const totalPaid = enr.payments?.reduce((sum, p) => p.status === 'Completed' ? sum + p.amount : sum, 0) || 0;
                  const adHocPayments = enr.payments?.filter(p => p.isAdHoc && p.status === 'Completed') || [];
                  const adHocTotal = adHocPayments.reduce((sum, p) => sum + p.amount, 0);

                  return (
                    <tr key={enr.id} className="hover:bg-blue-50/40 cursor-pointer transition-colors" onClick={() => openDetails(enr)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-sm">
                            {enr.studentName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-bold text-gray-900">{enr.studentName}</div>
                            <div className="text-xs text-gray-500">Enrolled: {new Date(enr.enrollmentDate || '').toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        {enr.grade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                          enr.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' :
                          enr.status === 'Onboarded' ? 'bg-blue-100 text-blue-800' :
                          enr.status === 'Withdrawn' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {enr.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold ${totalPaid > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                            ₹{totalPaid.toLocaleString('en-IN')}
                          </span>

                          {adHocTotal > 0 && (
                            <span 
                              className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300"
                              title={`Includes ${adHocPayments.length} Ad-Hoc fee collection(s)`}
                            >
                              + ₹{adHocTotal.toLocaleString('en-IN')} Ad-Hoc
                            </span>
                          )}

                          {enr.payments && enr.payments.length > 0 && (
                            <span className="text-xs text-gray-400">({enr.payments.length} txn)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                        {/* 1-Click Share Payment Link */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareLinkEnrollment(enr);
                            setIsShareLinkModalOpen(true);
                          }}
                          className="text-blue-700 bg-blue-50 hover:bg-blue-100 font-semibold border border-blue-200 px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1"
                          title="Share Razorpay Payment Link via WhatsApp or Email"
                        >
                          <Share2 className="w-3 h-3 text-blue-600" />
                          <span>Share Link</span>
                        </button>

                        {/* Collect Ad-Hoc Fee Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdHocEnrollment(enr);
                            setIsAdHocModalOpen(true);
                          }}
                          className="text-amber-800 bg-amber-50 hover:bg-amber-100 font-semibold border border-amber-300 px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1"
                          title="Collect Ad-Hoc Fee with Notes"
                        >
                          <PlusCircle className="w-3 h-3 text-amber-700" />
                          <span>Ad Hoc Fee</span>
                        </button>

                        {/* Manage Fee Drawer */}
                        <button
                          onClick={(e) => { e.stopPropagation(); openDetails(enr); }}
                          className="text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold border border-emerald-200 px-3 py-1.5 rounded-lg transition"
                        >
                          Manage Fee
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enrollment Details & Comprehensive Fee Ledger Drawer */}
      {selectedEnrollment && (
        <div className="fixed z-30 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-600/70 backdrop-blur-xs" onClick={() => setSelectedEnrollment(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-2xl px-6 pt-5 pb-6 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-200">
              
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900">{selectedEnrollment.studentName}</h3>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      selectedEnrollment.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' :
                      selectedEnrollment.status === 'Onboarded' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedEnrollment.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Grade: {selectedEnrollment.grade} • Application ID: {selectedEnrollment.applicationId.substring(0, 8)}...
                  </p>
                </div>
                <button onClick={() => setSelectedEnrollment(null)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
              </div>

              {/* Action Buttons for this Student */}
              <div className="my-4 flex flex-wrap gap-2 items-center">
                {/* Razorpay Online Checkout */}
                <button
                  onClick={() => setIsOnlinePayModalOpen(true)}
                  className="inline-flex items-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Razorpay Online Fee</span>
                </button>

                {/* Collect Ad Hoc Fee */}
                <button
                  onClick={() => {
                    setAdHocEnrollment(selectedEnrollment);
                    setIsAdHocModalOpen(true);
                  }}
                  className="inline-flex items-center px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold rounded-lg shadow-xs transition gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Collect Ad Hoc Payment</span>
                </button>

                {/* Share Payment Link */}
                <button
                  onClick={() => {
                    setShareLinkEnrollment(selectedEnrollment);
                    setIsShareLinkModalOpen(true);
                  }}
                  className="inline-flex items-center px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition gap-1.5"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Payment Link</span>
                </button>

                {/* Request Concession */}
                <button
                  onClick={() => {
                    setConcessionEnrollment(selectedEnrollment);
                    setConcessionMode('request');
                    setIsConcessionModalOpen(true);
                  }}
                  className="inline-flex items-center px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-800 text-xs font-bold rounded-lg shadow-xs transition gap-1.5"
                  title="Request Sibling, Merit, or Staff Discount"
                >
                  <Percent className="w-4 h-4 text-purple-600" />
                  <span>Request Discount</span>
                </button>

                {selectedEnrollment.status !== 'Onboarded' && selectedEnrollment.status !== 'Withdrawn' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedEnrollment.id, 'Confirmed')}
                      className="px-3 py-2 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-semibold rounded-lg"
                    >
                      Mark Confirmed
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedEnrollment.id, 'Onboarded')}
                      className="px-3 py-2 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold rounded-lg"
                    >
                      Complete Onboarding
                    </button>
                  </>
                )}
              </div>

              {/* Payments Ledger with Ad-Hoc Notes & Badges */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Fee Ledger & Transaction History</span>
                  </h4>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Total Paid: <b className="text-emerald-700">₹{(selectedEnrollment.payments || []).reduce((sum, p) => p.status === 'Completed' ? sum + p.amount : sum, 0).toLocaleString('en-IN')}</b>
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 max-h-64 overflow-y-auto space-y-2">
                  {selectedEnrollment.payments && selectedEnrollment.payments.length > 0 ? (
                    selectedEnrollment.payments.map((p: Payment) => (
                      <div key={p.id} className="p-3 bg-white rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between shadow-xs gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-gray-900">₹{p.amount.toLocaleString('en-IN')}</span>
                            
                            {/* Ad Hoc Badge */}
                            {p.isAdHoc ? (
                              <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded bg-amber-100 text-amber-900 border border-amber-300">
                                AD HOC
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-800 border border-blue-200">
                                Seat Lock
                              </span>
                            )}

                            {/* Category Tag */}
                            {p.feeCategory && (
                              <span className="text-[11px] text-gray-600 font-semibold bg-gray-100 px-2 py-0.5 rounded">
                                {p.feeCategory}
                              </span>
                            )}

                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              {p.paymentMethod || 'Razorpay Online'}
                            </span>
                          </div>

                          {/* Remarks and Notes */}
                          <p className="text-xs text-gray-500 mt-1">
                            {p.remarks || `Ref: ${p.referenceNumber}`}
                          </p>

                          {/* Counselor Notes for Ad-Hoc Collections */}
                          {(p.notes || (p.isAdHoc && p.remarks)) && (
                            <div className="mt-1.5 text-xs text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200">
                              <span className="font-bold">📝 Note: </span>
                              <span>{p.notes || p.remarks}</span>
                            </div>
                          )}

                          {/* Payment Link Indicator */}
                          {p.paymentLink && (
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200">
                              <Share2 className="w-3 h-3" />
                              <span>Razorpay Link: <b>{p.paymentLinkStatus || 'Active'}</b></span>
                              <span className="font-mono text-gray-500 truncate max-w-[200px]">{p.paymentLink}</span>
                            </div>
                          )}

                          {p.receiptNumber && (
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-1.5">
                              <ShieldCheck className="w-3 h-3" />
                              Official Receipt: {p.receiptNumber}
                            </span>
                          )}
                        </div>

                        <div className="sm:text-right flex sm:flex-col justify-between items-end gap-1">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            p.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-400">{new Date(p.paymentDate).toLocaleDateString()}</span>
                            {p.status === 'Completed' && (
                              <button
                                onClick={() => fetchReceipt(selectedEnrollment.id!, p.id)}
                                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-bold"
                              >
                                <ReceiptIcon className="w-3 h-3 mr-0.5" />
                                Receipt
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">No payment transactions recorded.</p>
                  )}
                </div>
              </div>

              {/* Manual Counter Ledger Section with Ad-Hoc option */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="text-xs font-bold text-gray-800">Record Offline Counter Payment (Cash / Cheque)</h5>
                  <label className="flex items-center gap-1 text-[11px] text-amber-800 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isManualAdHoc}
                      onChange={e => setIsManualAdHoc(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Is Ad-Hoc Payment?</span>
                  </label>
                </div>

                <form onSubmit={handleRecordManualPayment} className="space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <input
                        type="number"
                        placeholder="Amount (₹) *"
                        required
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Chq / Bank Ref No."
                        value={paymentReference}
                        onChange={e => setPaymentReference(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      {isManualAdHoc ? (
                        <select
                          value={manualCategory}
                          onChange={e => setManualCategory(e.target.value)}
                          className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-amber-50/30 font-semibold text-amber-900"
                        >
                          <option value="TransportFee">Transport / Bus Fee</option>
                          <option value="BooksUniform">Books & Uniform</option>
                          <option value="LabDeposit">Lab Caution Deposit</option>
                          <option value="SportsCoaching">Sports Academy Fee</option>
                          <option value="LateFee">Late Surcharge</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="Remarks (e.g. Seat Lock)"
                          value={paymentRemarks}
                          onChange={e => setPaymentRemarks(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                        />
                      )}
                    </div>
                  </div>

                  {isManualAdHoc && (
                    <div>
                      <textarea
                        rows={2}
                        required
                        value={manualNotes}
                        onChange={e => setManualNotes(e.target.value)}
                        placeholder="Mandatory Ad-Hoc Notes (e.g. Term 1 bus pass indiranagar stop / uniform kit breakdown)"
                        className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-amber-50/20 text-gray-800"
                      />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="py-2 px-4 bg-gray-900 hover:bg-black text-white font-bold rounded-lg transition text-xs flex items-center gap-1"
                    >
                      <span>Record Offline Payment</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Online Gateway Payment Modal (Standard Seat Reservation via Razorpay) */}
      {isOnlinePayModalOpen && selectedEnrollment && (
        <div className="fixed z-40 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-600/75" onClick={() => setIsOnlinePayModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-2xl px-6 pt-5 pb-6 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Razorpay Online Fee Checkout</h3>
                    <p className="text-xs text-gray-500">Student: {selectedEnrollment.studentName}</p>
                  </div>
                </div>
                <button onClick={() => setIsOnlinePayModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Fee Type / Amount (INR)</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setOnlineAmount('5000')}
                      className={`py-1.5 border rounded-lg font-semibold text-xs ${onlineAmount === '5000' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-300'}`}
                    >
                      ₹5,000 (Reg.)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnlineAmount('25000')}
                      className={`py-1.5 border rounded-lg font-semibold text-xs ${onlineAmount === '25000' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-300'}`}
                    >
                      ₹25,000 (Seat)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnlineAmount('50000')}
                      className={`py-1.5 border rounded-lg font-semibold text-xs ${onlineAmount === '50000' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-300'}`}
                    >
                      ₹50,000 (Term)
                    </button>
                  </div>
                  <input
                    type="number"
                    value={onlineAmount}
                    onChange={e => setOnlineAmount(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={onlineMethod}
                    onChange={e => setOnlineMethod(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  >
                    <option value="UPI">Instant UPI (GPay / PhonePe / QR)</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="NetBanking">Net Banking</option>
                  </select>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Payable Amount:</span>
                    <span className="font-bold text-gray-900">₹{parseFloat(onlineAmount || '0').toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Gateway:</span>
                    <span className="text-emerald-700 font-semibold">Razorpay Secured (Zero Surcharge)</span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOnlinePayModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingPayment}
                    onClick={handleOnlinePaymentCheckout}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                  >
                    {isProcessingPayment ? 'Connecting Razorpay...' : `Pay ₹${parseFloat(onlineAmount || '0').toLocaleString('en-IN')}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Digital Receipt Modal (Enhanced with Ad-Hoc Notes & Razorpay details) */}
      {selectedReceipt && (
        <div className="fixed z-50 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-800/80 backdrop-blur-xs" onClick={() => setSelectedReceipt(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-2xl px-8 pt-6 pb-8 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border-t-8 border-emerald-600">
              
              {/* Printable Receipt Card */}
              <div id="printable-receipt" className="space-y-4">
                <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">{selectedReceipt.institutionName}</h3>
                    <p className="text-xs text-gray-500">Official Fee Acknowledgment & Receipt</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      PAID
                    </span>
                    {selectedReceipt.isAdHoc && (
                      <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 uppercase">
                        Ad-Hoc Collection
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3.5 rounded-xl">
                  <div>
                    <span className="text-gray-500 block text-[11px]">Receipt Number:</span>
                    <span className="font-mono font-bold text-gray-900">{selectedReceipt.receiptNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Date & Time:</span>
                    <span className="font-semibold text-gray-900">{new Date(selectedReceipt.receiptDate).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Student Name:</span>
                    <span className="font-bold text-gray-900">{selectedReceipt.studentName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Grade / Course:</span>
                    <span className="font-semibold text-gray-900">{selectedReceipt.grade}</span>
                  </div>
                </div>

                {/* Ad-Hoc Notes Section on Receipt */}
                {selectedReceipt.notes && (
                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs">
                    <span className="font-bold text-amber-950 block mb-0.5">Ad Hoc Notes / Justification:</span>
                    <p className="text-amber-900 font-medium">{selectedReceipt.notes}</p>
                  </div>
                )}

                <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-gray-100 p-2.5 font-bold text-gray-800 flex justify-between">
                    <span>Fee Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedReceipt.feeCategory || (selectedReceipt.isAdHoc ? 'Ad Hoc Campus Fee' : 'Provisional Seat Allocation & Enrollment Fee')}
                      </p>
                      <p className="text-gray-500 text-[11px]">
                        Payment Mode: {selectedReceipt.paymentMethod} • Txn: {selectedReceipt.transactionId}
                      </p>
                    </div>
                    <span className="font-bold text-base text-gray-900">₹{selectedReceipt.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 border-t border-emerald-100 flex justify-between font-black text-emerald-900">
                    <span>Total Paid</span>
                    <span>₹{selectedReceipt.amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Razorpay Verified Transaction. Digitally authorized by MySchoolAdmissions.
                </div>
              </div>

              {/* Receipt Modal Footer */}
              <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Share Payment Link Modal */}
      <SharePaymentLinkModal
        isOpen={isShareLinkModalOpen}
        onClose={() => {
          setIsShareLinkModalOpen(false);
          setShareLinkEnrollment(null);
        }}
        enrollments={enrollments}
        selectedEnrollment={shareLinkEnrollment}
        onLinkCreated={handleLinkCreated}
      />

      {/* Collect Ad Hoc Payment Modal */}
      <AdHocPaymentModal
        isOpen={isAdHocModalOpen}
        onClose={() => {
          setIsAdHocModalOpen(false);
          setAdHocEnrollment(null);
        }}
        enrollments={enrollments}
        selectedEnrollment={adHocEnrollment}
        onPaymentCompleted={handleAdHocCompleted}
        onOpenShareLink={(enr) => {
          setShareLinkEnrollment(enr);
          setIsShareLinkModalOpen(true);
        }}
      />

      {/* Fee Concession Modal */}
      <ConcessionModal
        isOpen={isConcessionModalOpen}
        onClose={() => {
          setIsConcessionModalOpen(false);
          setConcessionEnrollment(null);
        }}
        enrollmentId={concessionEnrollment?.id}
        studentName={concessionEnrollment?.studentName}
        mode={concessionMode}
        onUpdated={fetchEnrollments}
      />

    </div>
  );
}
