// SCM Prospect Intelligence Platform - Discovery Apollo Provider (Phase 2A Architecture)
// Dedicated Apollo Intelligence Provider prepared for future Discovery Queue enrichment (Phase 2B).
// IMPORTANT: This provider is fully operational but is intentionally NOT invoked by Discovery Queue during Phase 2A.

import { apolloClient, ApolloClient } from "./apolloClient.ts";
import { enrichmentCache, EnrichmentCache, CachedOrganizationRecord } from "./enrichmentCache.ts";
import { DiscoveredLeadOutput, DecisionMaker } from "../discovery/types.ts";

export interface DiscoveryApolloCompanyResult {
  apolloOrgId: string;
  companyName: string;
  domain: string;
  websiteUrl: string;
  linkedinUrl: string;
  industry: string;
  headquarters: string;
  employeeCount: string;
  revenueEstimate: string;
  description: string;
  techStack: string[];
  rawApolloData?: any;
}

export interface DiscoveryApolloExecutiveResult {
  id: string;
  companyId: string;
  companyName: string;
  fullName: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  confidenceScore: number;
}

export class DiscoveryApolloProvider {
  private static instance: DiscoveryApolloProvider | null = null;
  private client: ApolloClient;
  private cache: EnrichmentCache;

  constructor(client?: ApolloClient, cache?: EnrichmentCache) {
    this.client = client || apolloClient;
    this.cache = cache || enrichmentCache;
  }

  public static getInstance(): DiscoveryApolloProvider {
    if (!DiscoveryApolloProvider.instance) {
      DiscoveryApolloProvider.instance = new DiscoveryApolloProvider();
    }
    return DiscoveryApolloProvider.instance;
  }

  /**
   * Search organizations for Discovery candidates
   */
  public async searchOrganizationsForDiscovery(
    query: string
  ): Promise<DiscoveryApolloCompanyResult[]> {
    const cleanQ = query.trim();
    if (!cleanQ) return [];

    const response = await this.client.request("/organizations/search", "POST", {
      q_organization_name: cleanQ,
      page: 1,
      per_page: 10,
    });

    if (!response.ok || !response.data || !Array.isArray(response.data.organizations)) {
      return [];
    }

    return response.data.organizations.map((org: any) => ({
      apolloOrgId: org.id || `co-${Date.now()}`,
      companyName: org.name || cleanQ,
      domain: org.primary_domain || org.domain || "",
      websiteUrl: org.website_url || (org.primary_domain ? `https://${org.primary_domain}` : ""),
      linkedinUrl: org.linkedin_url || "",
      industry: org.industry || "General Commercial",
      headquarters: org.raw_address || org.hq_address || org.city || "Nigeria",
      employeeCount: org.estimated_num_employees ? String(org.estimated_num_employees) : "N/A",
      revenueEstimate: org.annual_revenue ? `$${org.annual_revenue.toLocaleString()}` : "N/A",
      description: org.short_description || org.seo_description || "",
      techStack: org.technology_names || [],
      rawApolloData: org,
    }));
  }

  /**
   * Organization Lookup & Enrichment for Discovery
   */
  public async lookupOrganizationForDiscovery(
    domain: string,
    name?: string,
    ctx?: any
  ): Promise<DiscoveryApolloCompanyResult | null> {
    const cleanDomain = domain.trim().toLowerCase();
    if (!cleanDomain) return null;

    // Check cache first
    const cached = await this.cache.getCompany(cleanDomain, ctx);
    if (cached) {
      return {
        apolloOrgId: cached.apolloOrgId,
        companyName: cached.companyName,
        domain: cached.domain || cleanDomain,
        websiteUrl: cached.website || `https://${cleanDomain}`,
        linkedinUrl: cached.linkedinUrl || "",
        industry: cached.industry || "General Commercial",
        headquarters: cached.headquarters || "Nigeria",
        employeeCount: cached.employeeCount || "N/A",
        revenueEstimate: cached.revenueEstimate || "N/A",
        description: cached.rawApolloData?.short_description || "",
        techStack: cached.rawApolloData?.technology_names || [],
        rawApolloData: cached.rawApolloData,
      };
    }

    // Fetch from Apollo
    const response = await this.client.request("/organizations/enrich", "GET", {
      domain: cleanDomain,
    });

    if (!response.ok || !response.data || !response.data.organization) {
      return null;
    }

    const org = response.data.organization;
    const result: DiscoveryApolloCompanyResult = {
      apolloOrgId: org.id || `co-${Date.now()}`,
      companyName: org.name || name || cleanDomain,
      domain: org.primary_domain || org.domain || cleanDomain,
      websiteUrl: org.website_url || `https://${cleanDomain}`,
      linkedinUrl: org.linkedin_url || "",
      industry: org.industry || "General Commercial",
      headquarters: org.raw_address || org.hq_address || "Nigeria",
      employeeCount: org.estimated_num_employees ? String(org.estimated_num_employees) : "N/A",
      revenueEstimate: org.annual_revenue ? `$${org.annual_revenue.toLocaleString()}` : "N/A",
      description: org.short_description || "",
      techStack: org.technology_names || [],
      rawApolloData: org,
    };

    // Save to cache asynchronously
    const record: CachedOrganizationRecord = {
      apolloOrgId: result.apolloOrgId,
      companyName: result.companyName,
      domain: result.domain,
      website: result.websiteUrl,
      industry: result.industry,
      employeeCount: result.employeeCount,
      revenueEstimate: result.revenueEstimate,
      headquarters: result.headquarters,
      linkedinUrl: result.linkedinUrl,
      rawApolloData: org,
      cacheStatus: "Active",
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await this.cache.saveCompany(record, ctx);

    return result;
  }

  /**
   * Executive Lookup for Discovery
   */
  public async lookupExecutivesForDiscovery(
    companyId: string,
    domain: string,
    companyName?: string
  ): Promise<DiscoveryApolloExecutiveResult[]> {
    const cleanDomain = domain.trim().toLowerCase();
    if (!cleanDomain) return [];

    const response = await this.client.request("/mixed_people/api_search", "POST", {
      organization_domains: [cleanDomain],
      page: 1,
      per_page: 25,
    });

    if (!response.ok || !response.data || !Array.isArray(response.data.people)) {
      return [];
    }

    return response.data.people.map((p: any) => ({
      id: p.id || `pe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      companyId: companyId,
      companyName: p.organization?.name || companyName || cleanDomain,
      fullName: p.name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Executive",
      firstName: p.first_name || "",
      lastName: p.last_name || "",
      position: p.title || "Director",
      department: p.departments?.[0] || "Executive Management",
      email: p.email || (p.has_email ? "Available In Apollo" : "N/A"),
      phone: p.phone_numbers?.[0]?.raw_number || (p.has_phone ? "Available In Apollo" : "N/A"),
      linkedinUrl: p.linkedin_url || "Not Found",
      confidenceScore: p.email ? 95 : 70,
    }));
  }

  /**
   * Metadata Lookup for Discovery
   */
  public async lookupMetadataForDiscovery(domain: string): Promise<Record<string, any> | null> {
    const company = await this.lookupOrganizationForDiscovery(domain);
    if (!company) return null;
    return {
      apolloOrgId: company.apolloOrgId,
      companyName: company.companyName,
      techStack: company.techStack,
      headquarters: company.headquarters,
      revenueEstimate: company.revenueEstimate,
      employeeCount: company.employeeCount,
    };
  }

  /**
   * Retrieve Contacts for Discovery
   */
  public async retrieveContactsForDiscovery(
    domain: string
  ): Promise<DiscoveryApolloExecutiveResult[]> {
    return this.lookupExecutivesForDiscovery(`co-${domain}`, domain);
  }

  /**
   * Helper to extract a clean domain from a website URL or company name
   */
  private extractDomain(website?: string, companyName?: string): string {
    if (website && website.trim()) {
      let clean = website.trim().toLowerCase();
      clean = clean.replace(/^(https?:\/\/)?(www\.)?/, "");
      const slashIdx = clean.indexOf("/");
      if (slashIdx !== -1) clean = clean.substring(0, slashIdx);
      if (clean.includes(".")) return clean;
    }
    if (companyName && companyName.trim()) {
      let clean = companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (clean) return `${clean}.com`;
    }
    return "";
  }

  /**
   * Enriches a single Discovered Lead following SCM priority, cache-first, and graceful fallback
   */
  public async enrichSingleLead(
    lead: DiscoveredLeadOutput,
    ctx?: any
  ): Promise<DiscoveredLeadOutput> {
    try {
      const domain = this.extractDomain(lead.website, lead.name);
      let companyResult: DiscoveryApolloCompanyResult | null = null;

      // 1. Check Cache first (or lookup with automatic cache check)
      if (domain) {
        companyResult = await this.lookupOrganizationForDiscovery(domain, lead.name, ctx);
      }

      // 2. If domain lookup returned null, try searching by organization name
      if (!companyResult && lead.name) {
        const searchMatches = await this.searchOrganizationsForDiscovery(lead.name);
        if (searchMatches && searchMatches.length > 0) {
          const topMatch = searchMatches[0];
          if (topMatch.domain) {
            companyResult = await this.lookupOrganizationForDiscovery(topMatch.domain, lead.name, ctx);
          } else {
            companyResult = topMatch;
          }
        }
      }

      if (!companyResult) {
        // Apollo returned no match -> mark Unavailable, keep local SCM data intact
        return {
          ...lead,
          enrichmentStatus: "Unavailable",
          lastSyncedAt: new Date().toISOString(),
        };
      }

      // 3. Retrieve Executives / Decision Makers from Apollo
      let apolloExecutives: DiscoveryApolloExecutiveResult[] = [];
      if (companyResult.domain) {
        try {
          apolloExecutives = await this.lookupExecutivesForDiscovery(
            companyResult.apolloOrgId,
            companyResult.domain,
            companyResult.companyName
          );
        } catch (execErr: any) {
          console.warn(`[DISCOVERY APOLLO] Non-critical executive fetch error for ${lead.name}:`, execErr?.message || execErr);
        }
      }

      // 4. Merge Policy Implementation
      // RULE: Never overwrite manual/verified internal SCM data
      const mergedWebsite = (lead.website && lead.website.trim()) ? lead.website : companyResult.websiteUrl;
      const mergedIndustry = (lead.industry && lead.industry !== "General Commercial") ? lead.industry : companyResult.industry;
      const mergedLocation = (lead.location && lead.location !== "Nigeria") ? lead.location : companyResult.headquarters;
      const mergedSize = (lead.size && lead.size !== "N/A") ? lead.size : companyResult.employeeCount;
      const linkedinUrl = companyResult.linkedinUrl || "Unavailable";

      // Merge Decision Makers without replacing existing catalog contacts
      const existingDMs = lead.decisionMakers || [];
      const updatedDMs: DecisionMaker[] = existingDMs.map((dm) => {
        const matchedExec = apolloExecutives.find(
          (e) => e.fullName.toLowerCase() === dm.name.toLowerCase() || e.position.toLowerCase() === (dm.title || "").toLowerCase()
        );
        if (matchedExec) {
          return {
            name: dm.name,
            title: dm.title || matchedExec.position,
            position: dm.position || matchedExec.position,
            email: (dm.email && dm.email !== "N/A") ? dm.email : matchedExec.email,
            phone: (dm.phone && dm.phone !== "N/A") ? dm.phone : matchedExec.phone,
            linkedin: (dm.linkedin && dm.linkedin !== "Not Found") ? dm.linkedin : matchedExec.linkedinUrl,
          };
        }
        return dm;
      });

      // Append new executives from Apollo if existing list is sparse
      apolloExecutives.forEach((exec) => {
        const alreadyIncluded = updatedDMs.some((dm) => dm.name.toLowerCase() === exec.fullName.toLowerCase());
        if (!alreadyIncluded && updatedDMs.length < 5) {
          updatedDMs.push({
            name: exec.fullName,
            title: exec.position,
            position: exec.position,
            email: exec.email,
            phone: exec.phone,
            linkedin: exec.linkedinUrl,
          });
        }
      });

      return {
        ...lead,
        website: mergedWebsite,
        industry: mergedIndustry,
        location: mergedLocation,
        size: mergedSize,
        linkedinUrl: linkedinUrl,
        decisionMakers: updatedDMs,
        apolloOrgId: companyResult.apolloOrgId,
        enrichmentStatus: "Enriched",
        lastSyncedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn(`[DISCOVERY APOLLO ENRICHMENT FALLBACK] Lead ${lead.name} fallback to local data:`, err?.message || err);
      return {
        ...lead,
        enrichmentStatus: "Unavailable",
        lastSyncedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Enriches a batch of Discovered Leads sequentially/in parallel with safe fallback
   */
  public async enrichLeadsBatch(
    leads: DiscoveredLeadOutput[],
    ctx?: any
  ): Promise<DiscoveredLeadOutput[]> {
    if (!Array.isArray(leads) || leads.length === 0) return [];

    const enrichedBatch: DiscoveredLeadOutput[] = [];
    for (const lead of leads) {
      const enrichedLead = await this.enrichSingleLead(lead, ctx);
      enrichedBatch.push(enrichedLead);
    }
    return enrichedBatch;
  }
}

export const discoveryApolloProvider = DiscoveryApolloProvider.getInstance();
