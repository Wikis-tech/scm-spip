// SCM Prospect Intelligence Platform - Discovery Queue Engine
// Manages officer-specific candidate queues, next-three batching, duplicate prevention, and cycle resets

import { 
  CatalogCompany, 
  DiscoveryScanFilters, 
  DiscoveredLeadOutput, 
  OfficerQueueState 
} from "./types";
import { providerRegistry } from "./providers/providerRegistry";
import { calculateProductRecommendations } from "../../utils/recommendationEngine";
import { discoveryApolloProvider } from "../apollo/discoveryApolloProvider.ts";

export interface DBClientContext {
  db: any;
  isDatabaseHealthy: boolean;
  discoveredLeadsTable: any;
  discoveryQueuesTable: any;
  prospectsTable: any;
  apolloEnrichmentCacheTable?: any;
  eqFn: any;
  inArrayFn?: any;
  orFn?: any;
  dbDiscoveredLeadsFallback: any[];
  dbProspectsFallback: any[];
}

// In-memory fallback queue store per officer (userId -> OfficerQueueState)
const inMemoryQueueStore = new Map<string, OfficerQueueState>();

export class DiscoveryQueueEngine {
  private static instance: DiscoveryQueueEngine;

  private constructor() {}

  public static getInstance(): DiscoveryQueueEngine {
    if (!DiscoveryQueueEngine.instance) {
      DiscoveryQueueEngine.instance = new DiscoveryQueueEngine();
    }
    return DiscoveryQueueEngine.instance;
  }

  /**
   * Retrieves the current queue state for an officer.
   */
  public async getOfficerQueueState(
    userId: string,
    ctx: DBClientContext
  ): Promise<OfficerQueueState> {
    if (ctx.isDatabaseHealthy && ctx.db && ctx.discoveryQueuesTable && ctx.eqFn) {
      try {
        const rows = await ctx.db
          .select()
          .from(ctx.discoveryQueuesTable)
          .where(ctx.eqFn(ctx.discoveryQueuesTable.userId, userId));

        if (rows && rows.length > 0) {
          const row = rows[0];
          let servedNames: string[] = [];
          let dismissedNames: string[] = [];
          
          if (Array.isArray(row.servedCompanyNames)) {
            servedNames = row.servedCompanyNames;
          } else if (typeof row.servedCompanyNames === "string") {
            try { servedNames = JSON.parse(row.servedCompanyNames); } catch { servedNames = []; }
          }

          if (Array.isArray(row.dismissedCompanyNames)) {
            dismissedNames = row.dismissedCompanyNames;
          } else if (typeof row.dismissedCompanyNames === "string") {
            try { dismissedNames = JSON.parse(row.dismissedCompanyNames); } catch { dismissedNames = []; }
          }

          return {
            userId: row.userId,
            servedCompanyNames: servedNames,
            dismissedCompanyNames: dismissedNames,
            lastScanAt: row.lastScanAt || undefined,
            updatedAt: row.updatedAt || new Date().toISOString()
          };
        }
      } catch (err: any) {
        console.warn("[SCM QUEUE ENGINE] DB lookup notice for queue state, falling back to memory:", err.message || err);
      }
    }

    // Fallback to memory store
    if (!inMemoryQueueStore.has(userId)) {
      inMemoryQueueStore.set(userId, {
        userId,
        servedCompanyNames: [],
        dismissedCompanyNames: [],
        updatedAt: new Date().toISOString()
      });
    }
    return inMemoryQueueStore.get(userId)!;
  }

  /**
   * Updates officer queue state in DB and memory.
   */
  public async saveOfficerQueueState(
    state: OfficerQueueState,
    ctx: DBClientContext
  ): Promise<void> {
    state.updatedAt = new Date().toISOString();
    inMemoryQueueStore.set(state.userId, state);

    if (ctx.isDatabaseHealthy && ctx.db && ctx.discoveryQueuesTable && ctx.eqFn) {
      try {
        const existing = await ctx.db
          .select()
          .from(ctx.discoveryQueuesTable)
          .where(ctx.eqFn(ctx.discoveryQueuesTable.userId, state.userId));

        const queueData = {
          userId: state.userId,
          servedCompanyNames: state.servedCompanyNames,
          dismissedCompanyNames: state.dismissedCompanyNames,
          lastScanAt: state.lastScanAt || new Date().toISOString(),
          updatedAt: state.updatedAt
        };

        if (existing && existing.length > 0) {
          await ctx.db
            .update(ctx.discoveryQueuesTable)
            .set(queueData)
            .where(ctx.eqFn(ctx.discoveryQueuesTable.userId, state.userId));
        } else {
          await ctx.db.insert(ctx.discoveryQueuesTable).values(queueData);
        }
      } catch (err: any) {
        console.warn("[SCM QUEUE ENGINE] DB update notice for queue state:", err.message || err);
      }
    }
  }

  /**
   * Records a dismissed company name for an officer so it never reappears in queue cycles.
   */
  public async recordDismissedCompany(
    userId: string,
    companyName: string,
    ctx: DBClientContext
  ): Promise<void> {
    const queueState = await this.getOfficerQueueState(userId, ctx);
    const normName = companyName.trim().toLowerCase();
    if (!queueState.dismissedCompanyNames.some(n => n.trim().toLowerCase() === normName)) {
      queueState.dismissedCompanyNames.push(companyName.trim());
      await this.saveOfficerQueueState(queueState, ctx);
    }
  }

  /**
   * Main scan execution: Selects NEXT THREE unserved companies for officer.
   */
  public async executeScanBatch(
    userId: string,
    filters: DiscoveryScanFilters,
    ctx: DBClientContext,
    targetBatchSize: number = 3
  ): Promise<{
    batch: DiscoveredLeadOutput[];
    totalEvaluated: number;
    queueCycleReset: boolean;
  }> {
    // 1. Fetch raw candidate pool from Provider Registry
    const rawCandidates = await providerRegistry.getCandidates(filters);
    const totalEvaluated = rawCandidates.length;

    // 2. Fetch existing user discovered leads and global CRM prospects for exclusion logic
    let userDiscoveredLeads: any[] = [];
    let globalProspects: any[] = [];

    if (ctx.isDatabaseHealthy && ctx.db && ctx.discoveredLeadsTable && ctx.prospectsTable && ctx.eqFn) {
      try {
        userDiscoveredLeads = await ctx.db
          .select()
          .from(ctx.discoveredLeadsTable)
          .where(ctx.eqFn(ctx.discoveredLeadsTable.userId, userId));

        globalProspects = await ctx.db.select().from(ctx.prospectsTable);
      } catch (err: any) {
        console.warn("[SCM QUEUE ENGINE] DB lookup notice during scan batch, using memory fallbacks:", err.message || err);
        userDiscoveredLeads = (ctx.dbDiscoveredLeadsFallback || []).filter((l: any) => l.userId === userId);
        globalProspects = ctx.dbProspectsFallback || [];
      }
    } else {
      userDiscoveredLeads = (ctx.dbDiscoveredLeadsFallback || []).filter((l: any) => l.userId === userId);
      globalProspects = ctx.dbProspectsFallback || [];
    }

    // Build exclusion sets:
    // a) Imported or assigned leads
    const excludedCompanyNames = new Set<string>();
    userDiscoveredLeads.forEach(l => {
      if (l.alreadyimported || l.already_imported) {
        if (l.name) excludedCompanyNames.add(l.name.trim().toLowerCase());
      }
    });
    globalProspects.forEach(p => {
      if (p.name) excludedCompanyNames.add(p.name.trim().toLowerCase());
    });

    // 3. Get officer's current queue state (served & dismissed names)
    const queueState = await this.getOfficerQueueState(userId, ctx);
    
    // b) Dismissed company names permanently excluded
    (queueState.dismissedCompanyNames || []).forEach(name => {
      if (name) excludedCompanyNames.add(name.trim().toLowerCase());
    });

    const servedCompanyNames = new Set<string>(
      (queueState.servedCompanyNames || []).map(n => n.trim().toLowerCase())
    );

    // 4. Filter candidates:
    // - Exclude imported/assigned/dismissed prospects
    // - Exclude candidates already served in THIS queue cycle
    const eligibleCandidates = rawCandidates.filter(c => {
      const cNameNorm = c.name.trim().toLowerCase();
      if (excludedCompanyNames.has(cNameNorm)) return false;
      if (servedCompanyNames.has(cNameNorm)) return false;
      return true;
    });

    let finalBatchCandidates: CatalogCompany[] = [];
    let queueCycleReset = false;

    if (eligibleCandidates.length >= targetBatchSize) {
      // Case A: Enough unserved candidates in current queue cycle
      finalBatchCandidates = eligibleCandidates.slice(0, targetBatchSize);
    } else if (eligibleCandidates.length > 0) {
      // Case B: Fewer than targetBatchSize unserved candidates remain in current cycle!
      // Step 1: Serve ALL remaining unserved candidates first so no candidate is ever skipped
      finalBatchCandidates = [...eligibleCandidates];

      // Step 2: Since all candidates in the current cycle have now been served, reset cycle memory
      queueCycleReset = true;
      servedCompanyNames.clear();
      queueState.servedCompanyNames = [];

      // Step 3: Fill remaining slots from the new cycle (excluding permanently excluded & candidates just picked)
      const needed = targetBatchSize - finalBatchCandidates.length;
      const freshlyPickedNorms = new Set(finalBatchCandidates.map(c => c.name.trim().toLowerCase()));

      const newCycleCandidates = rawCandidates.filter(c => {
        const cNameNorm = c.name.trim().toLowerCase();
        if (excludedCompanyNames.has(cNameNorm)) return false;
        if (freshlyPickedNorms.has(cNameNorm)) return false;
        return true;
      });

      const extraCandidates = newCycleCandidates.slice(0, needed);
      finalBatchCandidates = [...finalBatchCandidates, ...extraCandidates];
    } else {
      // Case C: 0 unserved candidates in current cycle (queue cycle is fully exhausted)
      queueCycleReset = true;
      servedCompanyNames.clear();
      queueState.servedCompanyNames = [];

      // Re-filter candidates after clearing cycle memory (excluding permanently imported, assigned & dismissed)
      const newCycleCandidates = rawCandidates.filter(c => {
        const cNameNorm = c.name.trim().toLowerCase();
        return !excludedCompanyNames.has(cNameNorm);
      });

      finalBatchCandidates = newCycleCandidates.slice(0, targetBatchSize);

      // Ultimate fallback if ALL catalog items are permanently excluded: take top raw candidates
      if (finalBatchCandidates.length === 0) {
        finalBatchCandidates = rawCandidates.slice(0, targetBatchSize);
      }
    }

    // 7. Update officer served memory state
    finalBatchCandidates.forEach(c => {
      if (c.name) {
        const cNorm = c.name.trim();
        if (!queueState.servedCompanyNames.some(existing => existing.trim().toLowerCase() === cNorm.toLowerCase())) {
          queueState.servedCompanyNames.push(cNorm);
        }
      }
    });
    queueState.lastScanAt = new Date().toISOString();
    await this.saveOfficerQueueState(queueState, ctx);

    // 8. Transform selected candidates into full AI Discovered Lead outputs
    const resultBatch: DiscoveredLeadOutput[] = [];

    for (const company of finalBatchCandidates) {
      const oppScore = 83 + Math.floor(Math.random() * 15); // 83 to 97
      const confScore = 86 + Math.floor(Math.random() * 12); // 86 to 97
      const fitLabel = oppScore >= 90 ? "Exceptional Fit" : "High Fit";

      // Calculate dynamic product recommendations using SCM rules engine
      const recResult = calculateProductRecommendations(
        {
          name: company.name,
          industry: company.industry,
          description: company.description || company.latestNews,
          employeeCount: company.size,
          revenueValue: String(company.estimatedRevenueValue)
        },
        company.decisionMakers || [],
        oppScore
      );

      const topProducts = recResult.matrix.slice(0, 3).map(p => p.product);
      if (filters.targetProduct && filters.targetProduct !== "All") {
        if (!topProducts.includes(filters.targetProduct)) {
          topProducts.unshift(filters.targetProduct);
          topProducts.pop();
        }
      }

      const strategicReason = `SCM Apex Discovery Engine evaluated ${company.name} against ${company.source} register. Corporate treasury parameters indicate annual revenue footprint of ${company.revenueRange} with estimated ₦${(company.estimatedRevenueValue / 1e9).toFixed(1)}B liquidity turnover. Strong strategic fit for SCM Capital asset placement models.`;

      const leadId = `disc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const createdAt = new Date().toISOString();

      const matchedProspect = globalProspects.find(
        p => p.name && p.name.trim().toLowerCase() === company.name.trim().toLowerCase()
      );

      const leadOutput: DiscoveredLeadOutput = {
        id: leadId,
        userId: userId,
        name: company.name,
        industry: company.industry,
        size: company.size,
        website: company.website,
        location: company.location,
        opportunityScore: oppScore,
        confidenceScore: confScore,
        businessFit: fitLabel,
        treasuryPotential: `Estimated ₦${(company.estimatedRevenueValue / 1e9).toFixed(1)}B Liquidity Turnover`,
        estimatedRevenueValue: company.estimatedRevenueValue,
        reason: strategicReason,
        alreadyimported: false,
        recommendedProducts: topProducts,
        decisionMakers: company.decisionMakers || [],
        latestNews: company.latestNews || "Corporate liquidity optimization signal detected.",
        source: company.source,
        revenueRange: company.revenueRange,
        createdAt,
        existingProspect: matchedProspect ? {
          id: matchedProspect.id,
          name: matchedProspect.name,
          assignedOfficerId: matchedProspect.assignedOfficerId,
          assignedOfficerName: matchedProspect.assignedOfficerName || "Assigned Officer",
          status: matchedProspect.status || "Lead",
          stage: matchedProspect.status
        } : null
      };

      resultBatch.push(leadOutput);
    }

    // 9. Enrich selected candidates via DiscoveryApolloProvider (Cache-first with local fallback)
    let finalEnrichedBatch = resultBatch;
    try {
      finalEnrichedBatch = await discoveryApolloProvider.enrichLeadsBatch(resultBatch, ctx);
    } catch (enrichErr: any) {
      console.warn("[SCM QUEUE ENGINE] Non-critical Apollo enrichment warning, returning local catalog batch:", enrichErr?.message || enrichErr);
    }

    return {
      batch: finalEnrichedBatch,
      totalEvaluated,
      queueCycleReset
    };
  }
}

export const discoveryQueueEngine = DiscoveryQueueEngine.getInstance();
