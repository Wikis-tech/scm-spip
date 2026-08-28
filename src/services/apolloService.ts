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
  const id = String(org?.organization_id || org?.id || '');
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

  // Apollo's web UI blends net-new Organizations with Accounts already saved in the
  // workspace. Query both APIs so SPIP mirrors what staff see when searching Apollo.
  const [organizationResponse, accountResponse] = await Promise.all([
    apolloClient.request<any>('https://api.apollo.io/api/v1/mixed_companies/search', 'POST', {
      q_organization_name: cleanQuery,
      page: 1,
      per_page: 100,
    }),
    apolloClient.request<any>('https://api.apollo.io/api/v1/accounts/search', 'POST', {
      q_organization_name: cleanQuery,
      page: 1,
      per_page: 100,
    }),
  ]);
  syncDiagnostics();

  const organizations = organizationResponse.ok && Array.isArray(organizationResponse.data?.organizations)
    ? organizationResponse.data.organizations
    : [];
  const accounts = accountResponse.ok && Array.isArray(accountResponse.data?.accounts)
    ? accountResponse.data.accounts
    : [];

  if (!organizationResponse.ok && !accountResponse.ok) {
    apolloDiagnostics.organizationsReturned = 0;
    return [];
  }

  const byIdentity = new Map<string, ApolloCompany>();
  for (const raw of [...accounts, ...organizations]) {
    const company = mapCompany(raw);
    if (!company.name || company.name === 'Information Not Found') continue;
    const normalizedName = normalizeOrganizationName(company.name);
    const domain = normalizeDomain(company.domain);
    const identity = company.id || domain || normalizedName;
    if (!identity) continue;
    const existing = byIdentity.get(identity);
    if (!existing || (existing.domain === 'Not Found' && company.domain !== 'Not Found')) {
      byIdentity.set(identity, company);
    }
  }

  const ranked = [...byIdentity.values()]
    .map((company: ApolloCompany) => ({ company, score: organizationSimilarityScore(cleanQuery, company.name) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.company.name.localeCompare(b.company.name))
    .map((row) => row.company);

  apolloDiagnostics.organizationsReturned = ranked.length;
  apolloDiagnostics.exactMatchFound = ranked.some((company: ApolloCompany) => normalizeOrganizationName(company.name) === normalizeOrganizationName(cleanQuery)) ? 'YES' : 'NO';
  apolloDiagnostics.lastAcceptanceMethodUsed = accounts.length && organizations.length
    ? 'Apollo Organizations + Saved Accounts'
    : accounts.length ? 'Apollo Saved Accounts' : 'Apollo Organizations';
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
    email: (() => {
      const value = String(person?.email || '').trim();
      return value && !value.includes('[email') ? value : '';
    })(),
    emailValidationType: person?.email_status || undefined,
    phone: person?.phone_numbers?.find((entry: any) => entry?.sanitized_number || entry?.raw_number)?.sanitized_number
      || person?.phone_numbers?.find((entry: any) => entry?.sanitized_number || entry?.raw_number)?.raw_number
      || person?.sanitized_phone
      || person?.phone
      || '',
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
  if (!cleanDomain && !validOrgId && !companyName.trim()) return [];

  const buildPeoplePayload = (useOrgId: boolean) => {
    const payload: any = {
      page: 1,
      per_page: 100,
      person_seniorities: ['owner', 'founder', 'c_suite', 'partner', 'vp', 'head', 'director', 'manager', 'senior'],
    };
    if (useOrgId && validOrgId) payload.organization_ids = [validOrgId];
    else if (cleanDomain) payload.q_organization_domains_list = [cleanDomain];
    else if (companyName.trim()) payload.q_keywords = companyName.trim();
    return payload;
  };

  let peopleResponse = await apolloClient.request<any>(
    'https://api.apollo.io/api/v1/mixed_people/api_search',
    'POST',
    buildPeoplePayload(Boolean(validOrgId)),
  );
  let globalPeople = peopleResponse.ok && Array.isArray(peopleResponse.data?.people) ? peopleResponse.data.people : [];

  if (globalPeople.length === 0 && validOrgId && cleanDomain) {
    peopleResponse = await apolloClient.request<any>(
      'https://api.apollo.io/api/v1/mixed_people/api_search',
      'POST',
      buildPeoplePayload(false),
    );
    globalPeople = peopleResponse.ok && Array.isArray(peopleResponse.data?.people) ? peopleResponse.data.people : [];
  }

  const contactsResponse = companyName.trim()
    ? await apolloClient.request<any>('https://api.apollo.io/api/v1/contacts/search', 'POST', {
        q_keywords: companyName.trim(), page: 1, per_page: 100,
      })
    : ({ ok: false, data: null } as any);

  syncDiagnostics();
  const savedContacts = contactsResponse.ok && Array.isArray(contactsResponse.data?.contacts) ? contactsResponse.data.contacts : [];
  const selected = { id: validOrgId || companyId, name: companyName || cleanDomain, domain: cleanDomain };

  const personOrgName = (p: any) => p?.organization?.name || p?.account?.name || p?.organization_name || '';
  const personOrgId = (p: any) => p?.organization_id || p?.organization?.id || p?.account?.organization_id || '';
  const belongs = (p: any) => {
    const pid = String(personOrgId(p) || '').toLowerCase();
    if (validOrgId && pid && pid === validOrgId.toLowerCase()) return true;
    const pd = normalizeDomain(p?.organization?.primary_domain || p?.organization?.domain || p?.account?.domain || p?.account?.website_url || "");
    if (cleanDomain && pd && pd === cleanDomain) return true;
    const pn = personOrgName(p);
    if (companyName.trim() && pn && organizationSimilarityScore(companyName, pn) >= 65) return true;
    return false;
  };

  const mapFlexible = (p: any): ApolloPerson => {
    const organization = p?.organization || p?.account || {};
    return mapPerson({
      ...p,
      organization_id: personOrgId(p) || validOrgId || companyId,
      organization: {
        ...organization,
        name: personOrgName(p) || companyName,
        primary_domain: organization?.primary_domain || organization?.domain || cleanDomain,
      },
    }, selected);
  };

  const combined = [...savedContacts.filter(belongs), ...globalPeople.filter(belongs)].map(mapFlexible);
  const byIdentity = new Map<string, ApolloPerson>();
  for (const person of combined) {
    const key = person.id || (person.fullName.toLowerCase() + '|' + person.position.toLowerCase());
    const existing = byIdentity.get(key);
    if (!existing) { byIdentity.set(key, person); continue; }
    const er = Number(Boolean(existing.email)) + Number(Boolean(existing.phone)) + Number(Boolean(existing.linkedin));
    const nr = Number(Boolean(person.email)) + Number(Boolean(person.phone)) + Number(Boolean(person.linkedin));
    if (nr > er) byIdentity.set(key, person);
  }

  const rank: Record<string, number> = { owner: 10, founder: 9, c_suite: 8, partner: 7, vp: 6, head: 5, director: 4, manager: 3, senior: 2 };
  const people = [...byIdentity.values()].sort((a, b) => (rank[String(b.seniority).toLowerCase()] || 0) - (rank[String(a.seniority).toLowerCase()] || 0));
  apolloDiagnostics.peopleReturned = people.length;
  apolloDiagnostics.selectedOrganization = selected.name;
  apolloDiagnostics.selectedOrganizationId = selected.id;
  return people;
}
