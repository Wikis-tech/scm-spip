// SCM Prospect Intelligence Platform - TypeScript types (Phase 1 & Phase 2)

export type UserRole = 
  | 'Director' 
  | 'Relationship Manager' 
  | 'Business Development Officer' 
  | 'Admin' 
  | 'Administrator' 
  | 'Asset Management Officer' 
  | 'Team Lead' 
  | 'SUPER_ADMIN';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
  status?: string;
}

export type ProspectStage =
  | 'Lead'
  | 'Qualified'
  | 'Meeting Scheduled'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Won'
  | 'Lost'
  | 'Contacted'
  | 'Financial Literacy Session Scheduled'
  | 'Converted'
  | 'Archived';

export type PriorityLevel = 'Low' | 'Medium' | 'High';

export interface Prospect {
  id: string;
  name: string;
  industry: string;
  orgType: string; // e.g., 'Public Corp', 'Private Enterprise', 'Government Body', 'NGO'
  location: string;
  website?: string;
  phone?: string;
  email?: string;
  source?: string; // e.g. LinkedIn, Inbound, Direct Prospecting
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  status: ProspectStage;
  priority: PriorityLevel;
  notes?: string;
  conversionProbability: number; // 0 to 100
  opportunityValue: number; // in Naira (e.g., 250000000)
  
  // Potential Analysis
  treasuryPotential?: string;
  mmfPotential?: string;
  wealthPotential?: string;
  literacyPotential?: string;
  opportunityScore: number; // 0 to 100
  
  primaryContactId?: string;
  stageEnteredDate?: string;
  stageUpdatedDate?: string;
  actualRevenue?: number;
  lastActivityDate?: string;
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContactType =
  | 'CEO'
  | 'Managing Director'
  | 'HR Director'
  | 'Finance Director'
  | 'Treasurer'
  | 'CFO'
  | 'Admin Head'
  | 'Other';

export interface Contact {
  id: string;
  prospectId: string;
  prospectName?: string;
  fullName: string;
  position: string;
  department?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  influenceLevel: PriorityLevel;
  isDecisionMaker: boolean;
  notes?: string;
  createdAt: string;
  validationLevel?: 'Verified' | 'Public' | 'Unverified';
}

export type ActivityType =
  | 'Call'
  | 'Email'
  | 'Meeting'
  | 'Visit'
  | 'Presentation'
  | 'Financial Literacy Session'
  | 'Proposal'
  | 'Follow-up';

export type ActivityStatus = 'Scheduled' | 'Completed' | 'Overdue' | 'Draft';

export interface Activity {
  id: string;
  prospectId: string;
  prospectName?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  officerId?: string;
  officerName?: string;
  activityType: ActivityType;
  outcome?: string;
  notes?: string;
  status: ActivityStatus;
  createdAt: string;
}

export interface Meeting {
  id: string;
  prospectId: string;
  prospectName?: string;
  officerId: string;
  officerName: string;
  date: string;
  time: string;
  durationMinutes: number;
  purpose: string;
  outcome?: string;
  nextAction?: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalProspects: number;
  activeOpportunities: number;
  meetingsScheduled: number;
  followUpsDue: number;
  financialLiteracySessions: number;
  totalEstimatedValue: number; // Total AUM/opportunity value in NGN
}

export interface ContactEnrichment {
  fullName: string;
  position: string;
  department: string;
  seniority: string; // e.g. Executive, Senior, Director, Manager
  email: string;
  phone: string;
  linkedin: string;
  website: string;
  address: string;
  bio: string;
  confidenceScore: number;
  source: string;
  priorityRank: 'Priority 1' | 'Priority 2' | 'Priority 3';
  priorityReason: string;
  recommendedPitch: string;
  pitchReason: string;
  reasoning?: string; // backwards compatibility
  validationLevel?: 'Verified' | 'Public' | 'Unverified';
}

export interface PublicDirectory {
  switchboard: string;
  switchboardSource: string;
  switchboardLevel?: 'Verified' | 'Public' | 'Unverified';
  investorRelations: string;
  investorRelationsSource: string;
  investorRelationsLevel?: 'Verified' | 'Public' | 'Unverified';
  hrContact: string;
  hrContactSource: string;
  hrContactLevel?: 'Verified' | 'Public' | 'Unverified';
  corporateAffairs: string;
  corporateAffairsSource: string;
  corporateAffairsLevel?: 'Verified' | 'Public' | 'Unverified';
  generalInquiryEmail: string;
  generalInquiryEmailSource: string;
  generalInquiryEmailLevel?: 'Verified' | 'Public' | 'Unverified';
  unverifiedPhone?: string;
  unverifiedPhoneSource?: string;
  unverifiedPhoneLevel?: 'Unverified';
}

export interface MeetingPrep {
  beforeMeetingFacts: string[];
  talkingPoints: string[];
  objections: {
    objection: string;
    scmResponse: string;
  }[];
  followUpActions: string[];
}

export interface GrowthIndicators {
  companyGrowth: string;
  treasuryOpportunity: string;
  employeeInvestment: string;
  institutionalInvestment: string;
}

export interface FieldInfo {
  value: string;
  source: string;
  confidence: 'High' | 'Medium' | 'Low' | 'None';
}

export interface IntelligenceResult {
  overview: {
    name: string;
    industry: string;
    website: string;
    headquarters: string;
    description: string;
    employeeCount: string;
    revenueValue: string;
    linkedinUrl?: string;
    companyType?: string;
    yearFounded?: number;
    techStack?: string[];
    keywords?: string[];
    total_funding?: number;
    funding_rounds?: any[];
    hiring_trends?: any;
    employee_growth?: any;
    locations?: any[];
    departments?: any[];
    similar_companies?: any[];
    signals?: any[];
    metadata?: any;
  };
  metrics: {
    treasuryPotential: string;
    mmfOpportunity: string;
    wealthManagementFit: string;
    literacyAdoptionScore: string;
    overallOpportunityScore: number;
  };
  contactDiscovery: ContactEnrichment[];
  recommendationMatrix?: {
    product: string;
    score: number;
    reason: string;
  }[];
  publicDirectory: PublicDirectory;
  meetingPrep: MeetingPrep;
  growthIndicators: GrowthIndicators;
  unverified?: boolean;
  unverifiedReason?: string;
  validationDetails?: {
    status: string;
    dnsResolved: boolean;
    lastChecked: string;
    scrapedAt?: string;
    confidenceScore: number;
    trustedRegistries: string[];
    dnsStatus?: string;
    failures?: string[];
  };
  fieldAttributions?: {
    name?: FieldInfo;
    industry?: FieldInfo;
    website?: FieldInfo;
    headquarters?: FieldInfo;
    description?: FieldInfo;
    employeeCount?: FieldInfo;
    revenueValue?: FieldInfo;
    switchboard?: FieldInfo;
    investorRelations?: FieldInfo;
    hrContact?: FieldInfo;
    corporateAffairs?: FieldInfo;
    generalInquiryEmail?: FieldInfo;
  };
}

export interface Task {
  id: string;
  prospectId?: string;
  prospectName?: string;
  title: string;
  description?: string;
  dueDate: string;
  assignedStaff: string;
  officerId?: string;
  userId?: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  taskType: 'Call' | 'Meeting' | 'Email' | 'Visit' | 'Presentation' | 'Financial Literacy Session';
  isCompleted: boolean;
  notes?: string;
}

export interface InAppNotification {
  id: string;
  type: 'Meeting Scheduled' | 'Follow-Up Due' | 'Prospect Assigned' | 'Prospect Updated' | 'Financial Literacy Session Scheduled' | 'New Opportunity Added' | 'Task Deadline Approaching' | string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface NewsArticle {
  id: string;
  companyName: string;
  title: string;
  content: string;
  category: 'Expansion' | 'Funding' | 'Regulatory' | 'Leadership' | 'Signals';
  date: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface DecisionMaker {
  name: string;
  title: string;
  email?: string;
  phone?: string;
}

export interface ExistingProspectRef {
  id: string;
  name: string;
  assignedOfficerId: string;
  assignedOfficerName: string;
  status: string;
  stage?: string;
}

export interface DiscoveredLead {
  id: string;
  userId?: string;
  name: string;
  industry: string;
  size: string;
  website: string;
  location: string;
  opportunityScore: number;
  confidenceScore?: number;
  reason: string;
  opportunityReason?: string;
  alreadyimported?: boolean;
  businessFit?: string;
  treasuryPotential?: string;
  estimatedRevenueValue?: number;
  recommendedProducts?: string[];
  decisionMakers?: DecisionMaker[];
  latestNews?: string;
  source?: string;
  revenueRange?: string;
  createdAt?: string;
  existingProspect?: ExistingProspectRef | null;
}

export interface DiscoveryScanFilter {
  source: string;
  industry: string;
  location: string;
  sizeTier: string;
  revenueRange: string;
  targetProduct: string;
}

export interface DiscoverySession {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  source: string;
  industry: string;
  location: string;
  sizeTier: string;
  revenueRange: string;
  targetProduct: string;
  evalCount: number;
  recCount: number;
  savedCount: number;
  createdAt: string;
}

export interface DiscoveryAnalytics {
  totalEvaluated: number;
  totalQualified: number;
  totalSaved: number;
  conversionRate: number;
  totalTreasuryValue: number;
  topIndustries: { name: string; count: number }[];
  topProducts: { name: string; count: number }[];
  topSources: { name: string; count: number }[];
  sessionHistory: DiscoverySession[];
}

export interface StaffPerformance {
  name: string;
  assignedCount: number;
  meetingsHeld: number;
  literacySessionsCount: number;
  leadsGenerated: number;
  opportunitiesCreated: number;
  conversions: number;
  pipelineValue: number;
  avatar?: string;
}

export interface Reminder {
  id: string;
  type: 'meeting' | 'activity' | 'task';
  sourceId: string;
  prospectId?: string;
  prospectName?: string;
  title: string;
  reminderTimeText: '1 Hour Before' | '24 Hours Before' | '7 Days Before';
  reminderDateTime: string;
  sent: boolean;
  userId?: string;
  createdAt: string;
}

export type WorkspaceDocType = 'Research' | 'Proposals' | 'Emails' | 'Meeting Briefs' | 'Presentations' | 'Notes';

export interface CopilotProductScore {
  product: string;
  score: number; // 0 to 100
  reasoning: string;
}

export interface CopilotProductEngineResult {
  productScores: CopilotProductScore[];
  bestProduct: string;
  secondaryProduct: string;
  crossSellOpportunity: string;
}

export interface SavedResearchSession {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  type: WorkspaceDocType;
  targetCompany: string;
  userInput: string;
  content: string; // Markdown or compiled structure
  productScoring?: CopilotProductEngineResult | null;
  createdAt: string;
  notes?: string;
}

export interface SerenaAuditLog {
  id: string;
  userEmail: string;
  prompt: string;
  timestamp: string;
  modelUsed: string;
  tokensConsumed: number;
  responseTimeMs: number;
  module: string;
}


