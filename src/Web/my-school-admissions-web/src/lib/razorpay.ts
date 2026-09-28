export interface RazorpayCheckoutOptions {
  key?: string;
  amount: number; // in INR
  currency?: string;
  name?: string;
  description?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature?: string;
  }) => void;
  onDismiss?: () => void;
  onError?: (error: any) => void;
}

export interface RazorpayGatewayConfig {
  keyId: string;
  keySecret?: string;
  webhookSecret?: string;
  merchantName: string;
  themeColor: string;
  isTestMode: boolean;
}

export interface SchoolFeeType {
  id: string;
  name: string;
  category: string;
  defaultAmount: number;
  description: string;
  isAdHoc: boolean;
}

export const DEFAULT_RAZORPAY_KEY = 'rzp_test_myschooladmissions2026';

export const ALL_PAYMENT_TYPES: SchoolFeeType[] = [
  { id: 'application', name: 'Application Processing Fee', category: 'ApplicationFee', defaultAmount: 1500, description: 'Prospectus, entrance assessment & document verification', isAdHoc: false },
  { id: 'seatLock', name: 'Provisional Seat Reservation', category: 'SeatReservation', defaultAmount: 25000, description: 'Provisional admission confirmation seat guarantee deposit', isAdHoc: false },
  { id: 'tuitionTerm1', name: 'Term 1 Academic Tuition', category: 'TuitionFee', defaultAmount: 50000, description: 'Academic curriculum, digital smart classes & lab facilities', isAdHoc: false },
  { id: 'tuitionTerm2', name: 'Term 2 Academic Tuition', category: 'TuitionFee', defaultAmount: 50000, description: 'Second semester academic instruction & co-curricular activities', isAdHoc: false },
  { id: 'transport', name: 'Transport / Bus Route Fee', category: 'TransportFee', defaultAmount: 4500, description: 'Route-specific AC bus transportation pass', isAdHoc: true },
  { id: 'booksUniform', name: 'Books & Uniform Package', category: 'BooksUniform', defaultAmount: 6200, description: 'Complete syllabus textbooks, school diary & uniform kits', isAdHoc: true },
  { id: 'labDeposit', name: 'STEM & Robotics Lab Deposit', category: 'LabDeposit', defaultAmount: 5000, description: 'Robotics kit allocation & science laboratory caution deposit', isAdHoc: true },
  { id: 'sportsCoaching', name: 'Sports Academy Coaching', category: 'SportsCoaching', defaultAmount: 3500, description: 'Professional sports academy coaching and team equipment', isAdHoc: true },
  { id: 'cautionDeposit', name: 'Refundable Caution Money', category: 'CautionDeposit', defaultAmount: 10000, description: 'Institutional library & campus assets security deposit', isAdHoc: true },
  { id: 'lateFee', name: 'Late Processing Surcharge', category: 'LateFee', defaultAmount: 1500, description: 'Delayed document verification / seat revalidation surcharge', isAdHoc: true },
  { id: 'customAdHoc', name: 'Custom Ad-Hoc Fee', category: 'CustomAdHoc', defaultAmount: 2000, description: 'Special institutional activity charge or field trip fee', isAdHoc: true },
];

export function getStoredRazorpayConfig(): RazorpayGatewayConfig {
  try {
    const saved = localStorage.getItem('razorpay_gateway_config');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Could not parse razorpay_gateway_config from localStorage:', e);
  }

  const storedKey = localStorage.getItem('razorpay_key_id') || DEFAULT_RAZORPAY_KEY;
  return {
    keyId: storedKey,
    keySecret: localStorage.getItem('razorpay_key_secret') || '',
    webhookSecret: localStorage.getItem('razorpay_webhook_secret') || '',
    merchantName: 'MySchoolAdmissions Premier Academy',
    themeColor: '#2563eb',
    isTestMode: storedKey.startsWith('rzp_test'),
  };
}

export function saveStoredRazorpayConfig(config: Partial<RazorpayGatewayConfig>): void {
  const current = getStoredRazorpayConfig();
  const updated: RazorpayGatewayConfig = { ...current, ...config };
  localStorage.setItem('razorpay_gateway_config', JSON.stringify(updated));
  if (updated.keyId) {
    localStorage.setItem('razorpay_key_id', updated.keyId);
  }
  if (updated.keySecret !== undefined) {
    localStorage.setItem('razorpay_key_secret', updated.keySecret);
  }
  if (updated.webhookSecret !== undefined) {
    localStorage.setItem('razorpay_webhook_secret', updated.webhookSecret);
  }
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

/**
 * Dynamically loads the official Razorpay Checkout v1 script if not already present.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      console.warn('Razorpay SDK failed to load from CDN. Falling back to built-in gateway simulator.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Initiates Razorpay Checkout. If the script is loaded, opens standard Razorpay modal.
 * Returns true if launched via official SDK, or false if fallback mode should be used.
 */
export async function launchRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<boolean> {
  const isLoaded = await loadRazorpayScript();
  const config = getStoredRazorpayConfig();
  const effectiveKey = options.key || config.keyId || DEFAULT_RAZORPAY_KEY;

  if (isLoaded && window.Razorpay) {
    try {
      const rzp = new window.Razorpay({
        key: effectiveKey,
        amount: Math.round(options.amount * 100), // convert to paise
        currency: options.currency || 'INR',
        name: options.name || config.merchantName || 'MySchoolAdmissions',
        description: options.description || 'Admissions Fee Payment',
        image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=128&auto=format&fit=crop&q=80',
        order_id: options.order_id,
        handler: (response: any) => {
          options.onSuccess({
            razorpay_payment_id: response.razorpay_payment_id || `pay_${Date.now()}`,
            razorpay_order_id: response.razorpay_order_id || options.order_id || `order_${Date.now()}`,
            razorpay_signature: response.razorpay_signature || `sig_${Math.random().toString(36).substring(7)}`,
          });
        },
        prefill: {
          name: options.prefill?.name || '',
          email: options.prefill?.email || 'parent@myschooladmissions.com',
          contact: options.prefill?.contact || '+919876543210',
        },
        notes: options.notes || {},
        theme: {
          color: options.theme?.color || config.themeColor || '#2563eb', // Brand theme
        },
        modal: {
          ondismiss: () => {
            if (options.onDismiss) options.onDismiss();
          },
        },
      });

      rzp.on('payment.failed', (resp: any) => {
        if (options.onError) {
          options.onError(resp.error);
        }
      });

      rzp.open();
      return true;
    } catch (err) {
      console.warn('Error launching Razorpay SDK instance:', err);
      return false;
    }
  }

  return false;
}
