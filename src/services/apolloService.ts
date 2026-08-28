// SCM Prospect Intelligence Platform - Apollo Integration Layer
// Current Apollo API endpoints, no mock/fallback prospect data.

import { apolloClient } from './apollo/apolloClient.ts';

export interface ApolloCompany {
  id: string;
  apollo_org_id?: string;
  name: string;
  domain: string;
  website_url?: string;
  linkedin_url?: string;
  industry: string;
  headquarters: string;
  estimated_num_employees?: number;
  employeeCount: string;
  revenueValue: string;
  description: string;
  linkedinUrl: string;
  logoUrl?: string;
  yearFounded?: number;
  companyType?: string;
  techStack?: string[];
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  annual_revenue?: number;
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
}

export interface ApolloPerson {
  id: string;
  companyId: string;
  companyName: string;
  fullName: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  seniority: string;
  email: string;
  emailValidationType?: string;
  phone: string;
  linkedin: string;
  bio: string;
  confidenceScore: number;
  source: string;
  name?: string;
  title?: string;
  linkedin_url?: string;
  validationLevel?: string;
  location?: string;
  organizationName?: string;
}

export const FACTS_REGISTRY_COMPANIES: Record<string, ApolloCompany> = {};
export const FACTS_REGISTRY_PEOPLE: Record<string, ApolloPerson[]> = {};

export interface ApolloDiagnostic {
  apolloConnected: boolean;
  apolloKeyLoaded: boolean;
  apolloKeySource: string;
  apolloKeyLength: number;
  apolloStatusCode: number | null;
  organizationsReturned: number;
  peopleReturned: number;
  lastError: string | null;
  lastSearch: string | null;
  lastEndpointCalled: string | null;
  lastResponseTimeMs: number | null;
  lastPayload: string | null;
  lastResponseBodyPreview: string | null;
  queryEntered?: string | null;
  exactMatchFound?: string | null;
  selectedOrganization?: string | null;
  selectedOrganizationId?: string | null;
  orgIdMatchCount?: number;
  orgIdMismatchCount?: number;
  domainMatchCount?: number;
  domainMismatchCount?: number;
  strongNameMatchCount?: number;
  weakNameMatchCount?: number;
  rejectedOrgMatchCount?: number;
  lastAcceptanceMethodUsed?: string | null;
}

export const apolloDiagnostics: ApolloDiagnostic = {
  apolloConnected: false,
  apolloKeyLoaded: false,
  apolloKeySource: 'None',
  apolloKeyLength: 0,
  apolloStatusCode: null,
  organizationsReturned: 0,
  peopleReturned: 0,
  lastError: null,
  lastSearch: null,
  lastEndpointCalled: null,
  lastResponseTimeMs: null,
  lastPayload: null,
  lastResponseBodyPreview: null,
  queryEntered: null,
  exactMatchFound: null,
  selectedOrganization: null,
  selectedOrganizationId: null,
  orgIdMatchCount: 0,
  orgIdMismatchCount: 0,
  domainMatchCount: 0,
  domainMismatchCount: 0,
  strongNameMatchCount: 0,
  weakNameMatchCount: 0,
  rejectedOrgMatchCount: 0,
  lastAcceptanceMethodUsed: null,
};

function syncDiagnostics() {
  const telemetry = apolloClient.getTelemetry();
  apolloDiagnostics.apolloKeyLoaded = telemetry.apiKeyLoaded;
  apolloDiagnostics.apolloConnected = telemetry.apiKeyLoaded && telemetry.lastResponseStatus !== 401 && telemetry.lastResponseStatus !== 403;
  apolloDiagnostics.apolloKeySource = telemetry.apiKeySource;
  apolloDiagnostics.apolloKeyLength = telemetry.apiKeyLength;
  apolloDiagnostics.apolloStatusCode = telemetry.lastResponseStatus;
  apolloDiagnostics.lastEndpointCalled = telemetry.lastEndpointCalled;
  apolloDiagnostics.lastResponseTimeMs = telemetry.lastResponseTimeMs;
  apolloDiagnostics.lastError = telemetry.lastError;
  apolloDiagnostics.lastPayload = telemetry.lastPayloadPreview;
  apolloDiagnostics.lastResponseBodyPreview = telemetry.lastResponseBodyPreview;
}

export function normalizeDomain(domain: string): string {
  if (!domain || typeof domain !== 'string') return '';
  let value = domain.trim().toLowerCase();
  if (['not found', 'n/a', 'na', 'unknown'].includes(value)) return '';
  value = value.replace(/^https?:\/\//, '').replace(/^www\./, '');
  value = value.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
  return value.trim();
}

export function normalizeOrganizationName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  const suffixes = new Set(['ltd', 'limited', 'inc', 'incorporated', 'company', 'corp', 'corporation', 'group', 'holdings', 'llc', 'plc']);
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .filter((token) => !['a', 'an', 'the'].includes(token));
  while (tokens.length > 1 && suffixes.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(' ');
}

export function organizationSimilarityScore(nameA: string, nameB: string): number {
  const a = normalizeOrganizationName(nameA);
  const b = normalizeOrganizationName(nameB);
  if (!a || !b) return 0;
  if (a === b) return 100;
  const aTokens = new Set(a.split(' '));
  const bTokens = new Set(b.split(' '));
  const shared = [...aTokens].filter((token) => bTokens.has(token)).length;
  const overlap = shared / Math.max(1, Math.min(aTokens.size, bTokens.size));
  if ((a.includes(b) || b.includes(a)) && overlap >= 0.75) return 95;
  if (overlap >= 0.75) return 88;
  if (overlap >= 0.5) return 72;
  if (a.includes(b) || b.includes(a)) return 65;
  return Math.round(overlap * 60);
}

function formatMoney(value: any) {
  const numeric = Number(value || 0);
  return numeric > 0 ? `$${numeric.toLocaleString()}` : 'Information Not Found';
}

function mapCompany(org: any): ApolloCompany {
  const id = String(org?.id || org?.organization_id || '');
  const domain = normalizeDomain(org?.primary_domain || org?.domain || org?.website_url || '');
  return {
    id,
    apollo_org_id: id || undefined,
    name: org?.name || 'Information Not Found',
    domain: domain || 'Not Found',
    website_url: org?.website_url || (domain ? `https://${domain}` : undefined),
    linkedin_url: org?.linkedin_url || undefined,
    industry: org?.industry || 'Information Not Found',
    headquarters: org?.raw_address || org?.hq_address || [org?.city, org?.state, org?.country].filter(Boolean).join(', ') || 'Information Not Found',
    estimated_num_employees: org?.estimated_num_employees || undefined,
    employeeCount: org?.estimated_num_employees ? String(org.estimated_num_employees) : 'Information Not Found',
    revenueValue: formatMoney(org?.annual_revenue || org?.organization_revenue),
    description: org?.short_description || org?.seo_description || 'Information Not Found',
    linkedinUrl: org?.linkedin_url || 'Not Found',
    logoUrl: org?.logo_url || undefined,
    yearFounded: org?.founded_year || undefined,
    companyType: org?.publicly_traded_symbol || org?.public_paper_symbol ? 'Public company' : 'Private company',
    techStack: org?.technology_names || [],
    city: org?.city || undefined,
    state: org?.state || undefined,
    country: org?.country || undefined,
    phone: org?.phone || org?.primary_phone?.number || undefined,
    annual_revenue: org?.annual_revenue || undefined,
    keywords: org?.keywords || [],
    total_funding: org?.total_funding || org?.funding_total_amount || undefined,
    funding_rounds: org?.funding_rounds || [],
    hiring_trends: org?.hiring_trends || org?.num_active_job_openings || undefined,
    employee_growth: org?.employee_growth || undefined,
    locations: org?.locations || [],
    departments: org?.departments || [],
    similar_companies: org?.similar_companies || org?.similar_organizations || [],
    signals: org?.signals || [],
    metadata: {
      subindustry: org?.subindustry,
      market_cap: org?.market_cap,
      last_funding_round_date: org?.last_funding_round_date,
    },
  };
}

export async function searchOrganizations(query: string): Promise<ApolloCompany[]> {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) return [];

  apolloDiagnostics.lastSearch = cleanQuery;
  apolloDiagnostics.queryEntered = cleanQuery;

  const response = await apolloClient.request<any>('https://api.apollo.io/api/v1/mixed_companies/search', 'POST', {
    q_organization_name: cleanQuery,
    page: 1,
    per_page: 25,
  });
  syncDiagnostics();

  if (!response.ok) {
    apolloDiagnostics.organizationsReturned = 0;
    return [];
  }

  const raw = Array.isArray(response.data?.organizations)
    ? response.data.organizations
    : Array.isArray(response.data?.accounts)
      ? response.data.accounts
      : [];

  const ranked = raw
    .map(mapCompany)
    .filter((company: ApolloCompany) => company.id && company.name !== 'Information Not Found')
    .map((company: ApolloCompany) => ({ company, score: organizationSimilarityScore(cleanQuery, company.name) }))
    .sort((a: any, b: any) => b.score - a.score)
    .map((row: any) => row.company);

  apolloDiagnostics.organizationsReturned = ranked.length;
  apolloDiagnostics.exactMatchFound = ranked.some((company: ApolloCompany) => normalizeOrganizationName(company.name) === normalizeOrganizationName(cleanQuery)) ? 'YES' : 'NO';
  return ranked;
}

export async function enrichOrganization(domain: string, name?: string, originalId?: string): Promise<ApolloCompany | null> {
  const cleanDomain = normalizeDomain(domain);
  if (!cleanDomain) return null;
  const response = await apolloClient.request<any>('https://api.apollo.io/api/v1/organizations/enrich', 'GET', {
    domain: cleanDomain,
    organization_name: name || undefined,
  });
  syncDiagnostics();
  if (!response.ok || !response.data?.organization) return null;
  const mapped = mapCompany(response.data.organization);
  if (originalId) {
    mapped.id = originalId;
    mapped.apollo_org_id = response.data.organization?.id || originalId;
  }
  return mapped;
}

export function belongsToSelectedCompany(person: any, selectedOrg: { id: string; name: string; domain: string }, threshold = 80) {
  const selectedId = String(selectedOrg?.id || '').replace(/^co-/, '').toLowerCase();
  const personId = String(person?.organization_id || person?.organization?.id || '').replace(/^co-/, '').toLowerCase();
  if (selectedId && personId && selectedId === personId) {
    apolloDiagnostics.orgIdMatchCount = (apolloDiagnostics.orgIdMatchCount || 0) + 1;
    apolloDiagnostics.lastAcceptanceMethodUsed = 'Org ID';
    return { belongs: true, reason: 'Apollo organization ID matched.' };
  }

  const selectedDomain = normalizeDomain(selectedOrg?.domain || '');
  const personDomain = normalizeDomain(person?.organization?.primary_domain || person?.organization?.domain || person?.organization?.website_url || '');
  if (selectedDomain && personDomain && selectedDomain === personDomain) {
    apolloDiagnostics.domainMatchCount = (apolloDiagnostics.domainMatchCount || 0) + 1;
    apolloDiagnostics.lastAcceptanceMethodUsed = 'Domain';
    return { belongs: true, reason: 'Corporate domain matched.' };
  }

  const score = organizationSimilarityScore(selectedOrg?.name || '', person?.organization?.name || person?.organization_name || '');
  if (score >= threshold) {
    apolloDiagnostics.strongNameMatchCount = (apolloDiagnostics.strongNameMatchCount || 0) + 1;
    apolloDiagnostics.lastAcceptanceMethodUsed = 'Name Similarity';
    return { belongs: true, reason: `Organization name matched at ${score}%.` };
  }

  apolloDiagnostics.rejectedOrgMatchCount = (apolloDiagnostics.rejectedOrgMatchCount || 0) + 1;
  return { belongs: false, reason: 'Organization identity did not match the selected company.' };
}

function mapPerson(person: any, company: { id: string; name: string; domain: string }): ApolloPerson {
  const firstName = person?.first_name || '';
  const lastName = person?.last_name || '';
  const fullName = person?.name || [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
  return {
    id: String(person?.id || `${company.id}-${fullName}`),
    companyId: String(person?.organization_id || company.id),
    companyName: person?.organization?.name || company.name,
    fullName,
    firstName,
    lastName,
    position: person?.title || 'Information Not Found',
    department: person?.departments?.[0] || person?.functions?.[0] || 'Information Not Found',
    seniority: person?.seniority || 'Information Not Found',
    email: person?.email || '',
    emailValidationType: person?.email_status || undefined,
    phone: person?.phone_numbers?.[0]?.sanitized_number || person?.phone_numbers?.[0]?.raw_number || '',
    linkedin: person?.linkedin_url || '',
    bio: person?.headline || '',
    confidenceScore: 90,
    source: 'Apollo',
    name: fullName,
    title: person?.title || '',
    linkedin_url: person?.linkedin_url || '',
    validationLevel: person?.email_status || 'Search result',
    location: [person?.city, person?.state, person?.country].filter(Boolean).join(', '),
    organizationName: person?.organization?.name || company.name,
  };
}

export async function discoverDecisionMakers(companyId: string, domain: string, companyName = ''): Promise<ApolloPerson[]> {
  const cleanDomain = normalizeDomain(domain);
  const validOrgId = companyId && !companyId.startsWith('co-') ? companyId : '';
  if (!cleanDomain && !validOrgId) return [];

  const payload: any = {
    page: 1,
    per_page: 50,
    person_seniorities: ['owner', 'founder', 'c_suite', 'partner', 'vp', 'head', 'director'],
  };
  if (validOrgId) payload.organization_ids = [validOrgId];
  else payload.q_organization_domains_list = [cleanDomain];

  const response = await apolloClient.request<any>('https://api.apollo.io/api/v1/mixed_people/api_search', 'POST', payload);
  syncDiagnostics();
  if (!response.ok || !Array.isArray(response.data?.people)) {
    apolloDiagnostics.peopleReturned = 0;
    return [];
  }

  const selected = { id: validOrgId || companyId, name: companyName || cleanDomain, domain: cleanDomain };
  const people = response.data.people
    .filter((person: any) => belongsToSelectedCompany(person, selected, 72).belongs)
    .map((person: any) => mapPerson(person, selected))
    .sort((a: ApolloPerson, b: ApolloPerson) => {
      const rank: Record<string, number> = { owner: 10, founder: 9, c_suite: 8, partner: 7, vp: 6, head: 5, director: 4 };
      return (rank[String(b.seniority).toLowerCase()] || 0) - (rank[String(a.seniority).toLowerCase()] || 0);
    });

  apolloDiagnostics.peopleReturned = people.length;
  apolloDiagnostics.selectedOrganization = selected.name;
  apolloDiagnostics.selectedOrganizationId = selected.id;
  return people;
}
