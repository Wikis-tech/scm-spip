// SCM Prospect Intelligence Platform - Enterprise Apollo Enrichment Cache Engine
// High-performance double-buffering cache (PostgreSQL apollo_enrichment_cache + In-Memory Fallback)

export interface CachedExecutiveRecord {
  id: string;
  fullName: string;
  position: string;
  department?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  confidenceScore?: number;
}

export interface CachedOrganizationRecord {
  apolloOrgId: string;
  companyName: string;
  domain?: string;
  website?: string;
  industry?: string;
  employeeCount?: string;
  revenueEstimate?: string;
  headquarters?: string;
  linkedinUrl?: string;
  executives?: CachedExecutiveRecord[];
  rawApolloData?: any;
  cacheStatus: "Active" | "Expired" | "Pending";
  lastSyncedAt: string;
  createdAt: string;
}

export class EnrichmentCache {
  private static instance: EnrichmentCache | null = null;
  private memoryCache: Map<string, CachedOrganizationRecord> = new Map();

  public static getInstance(): EnrichmentCache {
    if (!EnrichmentCache.instance) {
      EnrichmentCache.instance = new EnrichmentCache();
    }
    return EnrichmentCache.instance;
  }

  /**
   * Normalizes lookup key (domain or org ID) to lowercase clean string
   */
  private normalizeKey(key: string): string {
    if (!key) return "";
    let clean = key.trim().toLowerCase();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/, "");
    const slashIdx = clean.indexOf("/");
    if (slashIdx !== -1) clean = clean.substring(0, slashIdx);
    return clean;
  }

  /**
   * Checks if cached record is still valid (default max age: 30 days)
   */
  public isCacheValid(record: CachedOrganizationRecord, maxAgeDays: number = 30): boolean {
    if (!record || record.cacheStatus === "Expired") return false;
    const syncedTime = new Date(record.lastSyncedAt).getTime();
    if (isNaN(syncedTime)) return false;
    const ageMs = Date.now() - syncedTime;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    return ageMs <= maxAgeMs;
  }

  /**
   * Retrieves organization record from Cache (Memory first, DB second)
   */
  public async getCompany(
    domainOrId: string,
    ctx?: { db?: any; apolloEnrichmentCacheTable?: any; eqFn?: any; orFn?: any }
  ): Promise<CachedOrganizationRecord | null> {
    const key = this.normalizeKey(domainOrId);
    if (!key) return null;

    // 1. Memory lookup
    for (const record of this.memoryCache.values()) {
      if (
        record.apolloOrgId.toLowerCase() === key ||
        (record.domain && this.normalizeKey(record.domain) === key) ||
        (record.website && this.normalizeKey(record.website) === key) ||
        (record.companyName && record.companyName.toLowerCase().trim() === key)
      ) {
        if (this.isCacheValid(record)) {
          return record;
        }
      }
    }

    // 2. Database lookup
    if (ctx && ctx.db && ctx.apolloEnrichmentCacheTable && ctx.eqFn) {
      try {
        const rows = await ctx.db
          .select()
          .from(ctx.apolloEnrichmentCacheTable)
          .where(
            ctx.orFn
              ? ctx.orFn(
                  ctx.eqFn(ctx.apolloEnrichmentCacheTable.apolloOrgId, domainOrId),
                  ctx.eqFn(ctx.apolloEnrichmentCacheTable.domain, key),
                  ctx.eqFn(ctx.apolloEnrichmentCacheTable.companyName, domainOrId)
                )
              : ctx.eqFn(ctx.apolloEnrichmentCacheTable.domain, key)
          );

        if (rows && rows.length > 0) {
          const row = rows[0];
          const record: CachedOrganizationRecord = {
            apolloOrgId: row.apolloOrgId,
            companyName: row.companyName,
            domain: row.domain || undefined,
            website: row.website || undefined,
            industry: row.industry || undefined,
            employeeCount: row.employeeCount || undefined,
            revenueEstimate: row.revenueEstimate || undefined,
            headquarters: row.headquarters || undefined,
            linkedinUrl: row.linkedinUrl || undefined,
            executives: Array.isArray(row.executivesJson) ? row.executivesJson : [],
            rawApolloData: row.rawApolloData || {},
            cacheStatus: row.cacheStatus as any || "Active",
            lastSyncedAt: row.lastSyncedAt,
            createdAt: row.createdAt,
          };

          // Store in memory cache for subsequent calls
          this.memoryCache.set(record.apolloOrgId, record);

          if (this.isCacheValid(record)) {
            return record;
          }
        }
      } catch (dbErr: any) {
        console.warn("[ENRICHMENT CACHE] Non-critical DB lookup warning:", dbErr?.message || dbErr);
      }
    }

    return null;
  }

  /**
   * Saves or updates an enriched organization record in Cache & DB
   */
  public async saveCompany(
    record: CachedOrganizationRecord,
    ctx?: { db?: any; apolloEnrichmentCacheTable?: any; eqFn?: any }
  ): Promise<void> {
    if (!record || !record.apolloOrgId) return;

    // 1. Memory update
    this.memoryCache.set(record.apolloOrgId, record);
    if (record.domain) {
      this.memoryCache.set(this.normalizeKey(record.domain), record);
    }
    if (record.website) {
      this.memoryCache.set(this.normalizeKey(record.website), record);
    }

    // 2. Database upsert
    if (ctx && ctx.db && ctx.apolloEnrichmentCacheTable && ctx.eqFn) {
      try {
        const dbData = {
          apolloOrgId: record.apolloOrgId,
          companyName: record.companyName,
          domain: record.domain || null,
          website: record.website || null,
          industry: record.industry || null,
          employeeCount: record.employeeCount || null,
          revenueEstimate: record.revenueEstimate || null,
          headquarters: record.headquarters || null,
          linkedinUrl: record.linkedinUrl || null,
          executivesJson: record.executives || [],
          rawApolloData: record.rawApolloData || {},
          cacheStatus: record.cacheStatus || "Active",
          lastSyncedAt: record.lastSyncedAt || new Date().toISOString(),
          createdAt: record.createdAt || new Date().toISOString(),
        };

        const existing = await ctx.db
          .select()
          .from(ctx.apolloEnrichmentCacheTable)
          .where(ctx.eqFn(ctx.apolloEnrichmentCacheTable.apolloOrgId, record.apolloOrgId));

        if (existing && existing.length > 0) {
          await ctx.db
            .update(ctx.apolloEnrichmentCacheTable)
            .set(dbData)
            .where(ctx.eqFn(ctx.apolloEnrichmentCacheTable.apolloOrgId, record.apolloOrgId));
        } else {
          await ctx.db.insert(ctx.apolloEnrichmentCacheTable).values(dbData);
        }
      } catch (dbErr: any) {
        console.warn("[ENRICHMENT CACHE] Non-critical DB save warning:", dbErr?.message || dbErr);
      }
    }
  }

  /**
   * Returns memory cache stats
   */
  public getStats() {
    return {
      memoryEntriesCount: this.memoryCache.size,
      activeEntries: Array.from(this.memoryCache.values()).filter((r) => this.isCacheValid(r)).length,
    };
  }
}

export const enrichmentCache = EnrichmentCache.getInstance();
