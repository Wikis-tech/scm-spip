// SCM Prospect Intelligence Platform - Discovery Engine Types

export interface DecisionMaker {
  name: string;
  title: string;
  position?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
}

export interface CatalogCompany {
  id: string;
  name: string;
  industry: string;
  size: string;
  website: string;
  location: string;
  source: string;
  sizeTier: string;
  revenueRange: string;
  estimatedRevenueValue: number;
  decisionMakers: DecisionMaker[];
  latestNews: string;
  description?: string;
  keywords?: string[];
  yearFounded?: number;
}

export interface DiscoveryScanFilters {
  source?: string;
  industry?: string;
  location?: string;
  sizeTier?: string;
  revenueRange?: string;
  targetProduct?: string;
}

export interface DiscoveredLeadOutput {
  id: string;
  userId: string;
  name: string;
  industry: string;
  size: string;
  website: string;
  location: string;
  opportunityScore: number;
  confidenceScore: number;
  businessFit: string;
  treasuryPotential: string;
  estimatedRevenueValue: number;
  reason: string;
  alreadyimported: boolean;
  recommendedProducts: string[];
  decisionMakers: DecisionMaker[];
  latestNews: string;
  source: string;
  revenueRange: string;
  createdAt: string;
  existingProspect?: any;
  enrichmentStatus?: "Enriched" | "Unavailable" | "Pending";
  lastSyncedAt?: string;
  apolloOrgId?: string;
  linkedinUrl?: string;
}

export interface OfficerQueueState {
  userId: string;
  servedCompanyNames: string[];
  dismissedCompanyNames: string[];
  lastScanAt?: string;
  updatedAt: string;
}

export interface DiscoveryProvider {
  name: string;
  getCandidates(filters: DiscoveryScanFilters): Promise<CatalogCompany[]>;
}
