export interface Campaign {
  id: string;
  name: string;
  type: string; // Digital, Offline, Hybrid, Referral
  objective: string; // LeadGeneration, CampusVisits, OpenHouse, ApplicationGeneration, Enrollment, ScholarshipPromotion
  schoolName: string;
  campusId?: string;
  campusName: string;
  academicSession: string;
  targetAdmissionCycle: string;
  institutionId?: string;
  startDate: string;
  endDate: string;
  status: string; // Draft, AiGenerated, PendingApproval, Approved, Scheduled, Active, Paused, Completed, Analyzing, Learned, Cancelled
  priority: string; // Low, Medium, High, Urgent
  budget: number;
  actualCost: number;
  primaryChannel: string;
  channels: string;
  targetGrades: string;
  targetGeography: string;
  targetPinCodes: string;
  
  // Funnel
  impressions: number;
  clicks: number;
  expectedLeads: number;
  actualLeads: number;
  expectedQualified: number;
  actualQualified: number;
  expectedVisits: number;
  actualVisits: number;
  expectedApplications: number;
  actualApplications: number;
  expectedEnrollments: number;
  actualEnrollments: number;

  // Calculated
  costPerLead: number;
  costPerVisit: number;
  costPerApplication: number;
  costPerEnrollment: number;
  leadToEnrollmentConversion: number;

  // Tracking & UTM
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  qrCodeKey?: string;

  // AI Metadata
  isAiGenerated: boolean;
  aiConfidenceScore: number;
  aiDiagnosisSummary?: string;
  aiStrategySummary?: string;
  owner: string;
  createdAt: string;
}

export interface CampaignAlert {
  id: string;
  severity: 'Info' | 'Warning' | 'Critical' | 'Opportunity';
  title: string;
  description: string;
  recommendedAction: string;
}

export interface ChannelPerformance {
  channel: string;
  category: 'Digital' | 'Offline' | 'Referral';
  totalSpend: number;
  leads: number;
  qualifiedLeads: number;
  visits: number;
  enrollments: number;
  costPerLead: number;
  costPerVisit: number;
  costPerEnrollment: number;
  enrollmentConversion: number;
  revenueGenerated: number;
  returnOnSpend: number;
}

export interface CampaignDashboardSummary {
  totalCampaigns: number;
  activeCampaigns: number;
  scheduledCampaigns: number;
  completedCampaigns: number;

  totalImpressions: number;
  totalClicks: number;
  totalLeads: number;
  totalQualifiedLeads: number;
  totalVisits: number;
  totalApplications: number;
  totalEnrollments: number;

  totalBudget: number;
  totalSpend: number;
  costPerLead: number;
  costPerVisit: number;
  costPerApplication: number;
  costPerEnrollment: number;
  marketingRoi: number;

  leadGrowthPercentage: number;
  visitGrowthPercentage: number;
  enrollmentGrowthPercentage: number;
  cplEfficiencyPercentage: number;

  impressionToClickRate: number;
  clickToLeadRate: number;
  leadToQualifiedRate: number;
  qualifiedToVisitRate: number;
  visitToApplicationRate: number;
  applicationToEnrollmentRate: number;
  overallConversionRate: number;

  urgentAlerts: CampaignAlert[];
  channelHighlights: ChannelPerformance[];
}

export interface CampaignRecommendation {
  id: string;
  title: string;
  category: string; // ChannelShift, BudgetIncrease, NewCampaign, Retargeting, GeographicExpansion, Optimization
  description: string;
  supportingEvidence: string;
  historicalPeriod: string;
  sampleSize: number;
  confidenceLevel: number;
  expectedImpact: string;
  assumptions: string;
  suggestedBudget: number;
  targetChannel: string;
  targetGeography: string;
  status: 'Pending' | 'Adopted' | 'Dismissed';
  createdAt: string;
}

export interface CreateAiCampaignRequest {
  objective: string;
  schoolName: string;
  campusName: string;
  academicSession: string;
  targetGrades: string;
  targetGeography: string;
  budget: number;
  durationDays: number;
  preferredChannels: string;
  specialOffer: string;
}

export interface AiCampaignResult {
  campaignName: string;
  objective: string;
  strategySummary: string;
  targetAudienceProfile: string;
  recommendedChannels: string;
  recommendedBudget: number;
  expectedLeads: number;
  expectedVisits: number;
  expectedEnrollments: number;
  confidenceScore: number;

  headline: string;
  primaryText: string;
  callToAction: string;
  whatsAppCopy: string;
  smsCopy: string;
  emailSubject: string;
  emailBody: string;
  facebookAdCopy: string;
  googleHeadline1: string;
  googleHeadline2: string;
  googleDescription: string;
  counselorFollowupScript: string;
}

export interface CampaignDiagnosis {
  campaignId: string;
  campaignName: string;
  overallAssessment: string;
  whatWorked: string[];
  whatDidNotWork: string[];
  audienceDiagnosis: string;
  creativeDiagnosis: string;
  channelDiagnosis: string;
  geographyDiagnosis: string;
  timingDiagnosis: string;
  counselorFollowupDiagnosis: string;
  recommendedActions: string[];
}

export interface CampaignCopilotRequest {
  query: string;
  schoolFilter?: string;
  sessionFilter?: string;
}

export interface CampaignCopilotResponse {
  answer: string;
  dataPeriod: string;
  dataPointsCited: string[];
  suggestedFollowups: string[];
  actionableButtonText?: string;
  actionableRoute?: string;
}

export interface GeographyPerformance {
  pinCode: string;
  locality: string;
  distanceBracket: string;
  leads: number;
  visits: number;
  enrollments: number;
  totalSpend: number;
  costPerEnrollment: number;
  visitConversionRate: number;
  enrollmentConversionRate: number;
}

export interface CampaignIdea {
  id: string;
  ideaTitle: string;
  objective: string;
  targetAudience: string;
  recommendedChannel: string;
  targetGeography: string;
  durationDays: number;
  estimatedBudget: number;
  expectedLeads: number;
  expectedVisits: number;
  expectedEnrollments: number;
  reasonForRecommendation: string;
  historicalEvidence: string;
  confidenceLevel: number;
}

export interface CampaignCalendarEvent {
  id: string;
  title: string;
  eventType: 'Campaign' | 'OpenHouse' | 'AdmissionDeadline' | 'SchoolEvent' | 'Holiday' | 'ExamPeriod';
  startDate: string;
  endDate: string;
  channel: string;
  status: string;
  schoolName: string;
  hasConflict: boolean;
  conflictReason?: string;
}

export interface CampaignLearning {
  id?: string;
  campaignId?: string;
  campaignName: string;
  channel: string;
  geography: string;
  totalSpend: number;
  totalLeads: number;
  totalVisits: number;
  totalEnrollments: number;
  costPerEnrollment: number;
  whatWorked: string;
  whatFailed: string;
  keyTakeaway: string;
  recommendedNextAction: string;
  loggedAt?: string;
}

export interface CampaignQrCode {
  id?: string;
  campaignId?: string;
  codeKey: string;
  title: string;
  targetLocation: string;
  channelType: string;
  destinationUrl: string;
  qrImageUrl: string;
  totalScans: number;
  leadsGenerated: number;
  enrollmentsGenerated: number;
  isActive: boolean;
  createdAt?: string;
}

export interface CampaignAutopilotConfig {
  id?: string;
  autopilotLevel: number; // 1 to 5
  maxMonthlyBudgetCap: number;
  maxSingleCampaignBudget: number;
  requireHumanApprovalForPublishing: boolean;
  emergencyPauseAllActive: boolean;
  approvedChannels: string;
  lastUpdatedAt?: string;
}
