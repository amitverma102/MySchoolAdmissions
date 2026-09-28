export interface Interaction {
  id: string;
  enquiryId: string;
  interactionType: string;
  disposition?: string;
  notes: string;
  interactionDate: string;
  handledByUserId?: string;
  recordingUrl?: string;
  recordingDurationSeconds?: number;
  driveFileId?: string;
  driveStatus?: string;
  driveFolder?: string;
}

export interface CommunicationLog {
  id: string;
  referenceId: string;
  studentName: string;
  recipient: string;
  channel: string;
  templateName: string;
  subject: string;
  content: string;
  status: string;
  whatsAppDeepLink?: string;
  sentAt: string;
  handledBy: string;
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  channel: string;
  subject: string;
  content: string;
  description: string;
}

export interface Enquiry {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gradeInterested: string;
  status: string;
  institutionId?: string;
  campusId?: string;
  leadSourceId?: string;
  leadSourceName?: string;
  campaignId?: string;
  campaignName?: string;
  assignedToId?: string;
  assignedToName?: string;
  coCounselorId?: string;
  coCounselorName?: string;
  coCounselorReason?: string;
  preferredLanguage?: string;
  region?: string;
  religion?: string;
  autoAssignmentScore?: number;
  autoAssignmentReason?: string;
  assignedAt?: string;
  interactions?: Interaction[];
  createdAt?: string;
}

export interface CounselorSkillProfile {
  id: string;
  userId: string;
  counselorName: string;
  email: string;
  institutionId?: string;
  campusId?: string;
  languagesKnown: string[];
  handledClasses: string[];
  regions: string[];
  religions: string[];
  dailyLeadCapacity: number;
  maxActiveLeads: number;
  isActive: boolean;
  lastAssignedAt?: string;
  assignedCountToday: number;
  currentActiveLeads: number;
}

export interface AutoAssignmentConfig {
  institutionId?: string;
  gradeWeight: number;
  languageWeight: number;
  regionWeight: number;
  religionWeight: number;
  workloadBalanceWeight: number;
  minimumMatchThreshold: number;
  fallbackCounselorId?: string;
  fallbackCounselorName?: string;
  isAutoAssignmentEnabled: boolean;
  autoAssignCoCounselor?: boolean;
  useAiScoring?: boolean;
}

export interface CounselorMatchCandidate {
  userId: string;
  counselorName: string;
  email: string;
  totalScore: number;
  gradeScore: number;
  languageScore: number;
  regionScore: number;
  religionScore: number;
  workloadScore: number;
  isEligible: boolean;
  ineligibilityReason: string;
  matchSummary: string;
  aiAnalysis?: string;
  isRecommendedCoCounselor?: boolean;
  coCounselorSynergy?: string;
  activeLeads: number;
  assignedToday: number;
  dailyCapacity: number;
  matchingSkills: string[];
}

export interface AutoAssignmentResult {
  success: boolean;
  assignedCounselorId?: string;
  assignedCounselorName?: string;
  matchScore: number;
  matchReason: string;
  coCounselorId?: string;
  coCounselorName?: string;
  coCounselorScore?: number;
  coCounselorReason?: string;
  isFallback: boolean;
  evaluationEngine?: string;
}

export interface LeadMatchCriteria {
  gradeInterested?: string;
  preferredLanguage?: string;
  region?: string;
  religion?: string;
  notes?: string;
  institutionId?: string;
  campusId?: string;
}


export interface Assessment {
  id: string;
  applicationId: string;
  type: string;
  scheduledDate: string;
  status: string;
  score: string;
  feedback: string;
}

export interface Application {
  id?: string;
  applicationNumber?: string;
  enquiryId?: string;
  studentId?: string;
  applicantName: string;
  status: string;
  institutionId?: string;
  campusId?: string;
  gradeApplyingFor: string;
  submittedDate?: string;
  createdAt?: string;
  customFieldsJson?: string;
  assessments?: Assessment[];
}

export interface Payment {
  id: string;
  enrollmentId: string;
  amount: number;
  paymentDate: string;
  referenceNumber: string;
  status: string;
  remarks: string;
  gatewayOrderId?: string;
  transactionId?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  receiptDate?: string;
  isAdHoc?: boolean;
  feeCategory?: string;
  notes?: string;
  paymentLink?: string;
  paymentLinkId?: string;
  paymentLinkStatus?: string;
  expiresAt?: string;
}

export interface Receipt {
  receiptNumber: string;
  receiptDate: string;
  enrollmentId: string;
  studentName: string;
  grade: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  status: string;
  institutionName: string;
  isAdHoc?: boolean;
  feeCategory?: string;
  notes?: string;
}

export interface PaymentLinkInfo {
  paymentId?: string;
  enrollmentId: string;
  paymentLinkId: string;
  shortUrl: string;
  amount: number;
  currency?: string;
  feeCategory: string;
  description: string;
  notes?: string;
  recipientName: string;
  recipientPhone?: string;
  recipientEmail?: string;
  status: string;
  qrCodeUrl?: string;
  whatsAppShareUrl?: string;
  emailShareUrl?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface Enrollment {
  id?: string;
  applicationId: string;
  studentName: string;
  grade: string;
  status: string;
  enrollmentDate?: string;
  payments?: Payment[];
  concessions?: any[];
}

export * from './campaign';

