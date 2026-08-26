// SCM Prospect Intelligence Platform - Intelligence Apollo Provider (Phase 2A Architecture)
// Dedicated Intelligence Provider backing Company Dossiers, Executive Research, and AI Reports.

import { apolloClient, ApolloClient } from "./apolloClient.ts";
import { enrichmentCache, EnrichmentCache, CachedOrganizationRecord } from "./enrichmentCache.ts";
import {
  ApolloCompany,
  ApolloPerson,
  ApolloDiagnostic,
  apolloDiagnostics,
  normalizeDomain,
  normalizeOrganizationName,
  organizationSimilarityScore,
  belongsToSelectedCompany,
} from "../apolloService.ts";

export class IntelligenceApolloProvider {
  private static instance: IntelligenceApolloProvider | null = null;
  private client: ApolloClient;
  private cache: EnrichmentCache;

  constructor(client?: ApolloClient, cache?: EnrichmentCache) {
    this.client = client || apolloClient;
    this.cache = cache || enrichmentCache;
  }

  public static getInstance(): IntelligenceApolloProvider {
    if (!IntelligenceApolloProvider.instance) {
      IntelligenceApolloProvider.instance = new IntelligenceApolloProvider();
    }
    return IntelligenceApolloProvider.instance;
  }

  /**
   * Search Organizations for Intelligence Workspace
   */
  public async searchOrganizations(query: string): Promise<ApolloCompany[]> {
    const cleanQ = query.trim();
    if (!cleanQ) return [];

    apolloDiagnostics.lastSearch = cleanQ;
    apolloDiagnostics.queryEntered = cleanQ;

    const response = await this.client.request("/organizations/search", "POST", {
      q_organization_name: cleanQ,
      page: 1,
      per_page: 20,
    });

    if (response.ok && response.data && Array.isArray(response.data.organizations)) {
      const results: ApolloCompany[] = response.data.organizations.map((org: any) => ({
        id: org.id || `co-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: org.name || "Information Not Found",
        domain: org.primary_domain || org.domain || "Not Found",
        website_url: org.website_url || `https://${org.primary_domain || org.domain || ""}`,
        linkedin_url: org.linkedin_url || "Information Not Found",
        industry: org.industry || "Information Not Found",
        estimated_num_employees: org.estimated_num_employees || undefined,
        employeeCount: org.estimated_num_employees ? `${org.estimated_num_employees}` : "Information Not Found",
        revenueValue: org.annual_revenue
          ? `$${org.annual_revenue.toLocaleString()}`
          : org.organization_revenue
          ? `$${org.organization_revenue.toLocaleString()}`
          : "Information Not Found",
        description: org.short_description || org.seo_description || "Information Not Found",
        linkedinUrl: org.linkedin_url || "Not Found",
        yearFounded: org.founded_year || undefined,
        companyType: org.public_paper_symbol ? "Public Limited Corporation" : "Private Commercial Enterprise",
        techStack: org.technology_names || org.keywords || [],
        city: org.city || "Information Not Found",
        state: org.state || "Information Not Found",
        country: org.country || "Information Not Found",
        phone: org.phone || (org.primary_phone ? org.primary_phone.number : "Information Not Found"),
        headquarters: org.raw_address || org.hq_address || (org.city ? `${org.city}, ${org.country || "Nigeria"}` : "Information Not Found"),
        annual_revenue: org.annual_revenue || undefined,
        keywords: org.keywords || [],
        total_funding: org.total_funding || undefined,
        funding_rounds: org.funding_rounds || [],
        hiring_trends: org.hiring_trends || undefined,
        employee_growth: org.employee_growth || undefined,
        locations: org.locations || [],
        departments: org.departments || [],
        similar_companies: org.similar_companies || [],
        signals: org.signals || [],
        metadata: {
          facebook_url: org.facebook_url,
          twitter_url: org.twitter_url,
          subindustry: org.subindustry,
          market_cap: org.market_cap,
        },
      }));

      // Relevance scoring
      const scoredResults = results.map((company) => {
        let score = 0;
        const normName = (company.name || "").toLowerCase().trim();
        const normQuery = cleanQ.toLowerCase().trim();
        const normDomain = (company.domain || "").toLowerCase().trim();

        if (normName === normQuery) score = 100;
        else if (normName.startsWith(normQuery)) score = 80 + (normQuery.length / normName.length) * 15;
        else if (normName.includes(normQuery)) score = 60 + (normQuery.length / normName.length) * 15;
        else if (normDomain.includes(normQuery)) score = 40;

        return { company, score };
      });

      scoredResults.sort((a, b) => b.score - a.score);
      const sortedCompanies = scoredResults.map((item) => item.company);

      apolloDiagnostics.organizationsReturned = sortedCompanies.length;
      apolloDiagnostics.exactMatchFound = sortedCompanies.some(
        (co) => co.name.toLowerCase().trim() === cleanQ.toLowerCase().trim()
      ) ? "YES" : "NO";

      return sortedCompanies;
    }

    apolloDiagnostics.organizationsReturned = 0;
    apolloDiagnostics.exactMatchFound = "NO";
    return [];
  }

  /**
   * Enrich Organization for Intelligence Workspace
   */
  public async enrichOrganization(
    domain: string,
    name?: string,
    originalId?: string,
    ctx?: any
  ): Promise<ApolloCompany | null> {
    const cleanDomain = domain.trim().toLowerCase();
    if (!cleanDomain || cleanDomain === "not found") return null;

    // Check Cache first
    const cached = await this.cache.getCompany(cleanDomain, ctx);
    if (cached) {
      const preservedId = originalId || cached.apolloOrgId;
      return {
        id: preservedId,
        apollo_org_id: preservedId,
        name: cached.companyName || name || "Information Not Found",
        domain: cached.domain || cleanDomain,
        industry: cached.industry || "Information Not Found",
        headquarters: cached.headquarters || "Information Not Found",
        employeeCount: cached.employeeCount || "Information Not Found",
        revenueValue: cached.revenueEstimate || "Information Not Found",
        description: cached.rawApolloData?.short_description || "Information Not Found",
        linkedinUrl: cached.linkedinUrl || "Not Found",
        companyType: "Private Commercial Enterprise",
        techStack: cached.rawApolloData?.technology_names || [],
        metadata: cached.rawApolloData,
      };
    }

    const response = await this.client.request("/organizations/enrich", "GET", {
      domain: cleanDomain,
    });

    if (response.ok && response.data && response.data.organization) {
      const org = response.data.organization;
      const preservedId = originalId || org.id || `co-${Date.now()}`;
      const result: ApolloCompany = {
        id: preservedId,
        apollo_org_id: preservedId,
        name: org.name || name || "Information Not Found",
        domain: org.primary_domain || org.domain || cleanDomain,
        industry: org.industry || "Information Not Found",
        headquarters: org.raw_address || org.hq_address || "Information Not Found",
        employeeCount: org.estimated_num_employees ? `${org.estimated_num_employees}` : "Information Not Found",
        revenueValue: org.annual_revenue ? `$${org.annual_revenue.toLocaleString()}` : "Information Not Found",
        description: org.short_description || org.seo_description || "Information Not Found",
        linkedinUrl: org.linkedin_url || "Not Found",
        yearFounded: org.founded_year || undefined,
        companyType: org.public_paper_symbol ? "Public Limited Corporation" : "Private Commercial Enterprise",
        techStack: org.technology_names || [],
        annual_revenue: org.annual_revenue || undefined,
        keywords: org.keywords || [],
        total_funding: org.total_funding || undefined,
        funding_rounds: org.funding_rounds || [],
        hiring_trends: org.hiring_trends || undefined,
        employee_growth: org.employee_growth || undefined,
        locations: org.locations || [],
        departments: org.departments || [],
        similar_companies: org.similar_companies || [],
        signals: org.signals || [],
        metadata: {
          facebook_url: org.facebook_url,
          twitter_url: org.twitter_url,
          subindustry: org.subindustry,
        },
      };

      // Asynchronously cache
      await this.cache.saveCompany(
        {
          apolloOrgId: preservedId,
          companyName: result.name,
          domain: result.domain,
          website: `https://${result.domain}`,
          industry: result.industry,
          employeeCount: result.employeeCount,
          revenueEstimate: result.revenueValue,
          headquarters: result.headquarters,
          linkedinUrl: result.linkedinUrl,
          rawApolloData: org,
          cacheStatus: "Active",
          lastSyncedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        ctx
      );

      return result;
    }

    return null;
  }
}

export const intelligenceApolloProvider = IntelligenceApolloProvider.getInstance();
