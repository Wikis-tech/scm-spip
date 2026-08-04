// SCM Prospect Intelligence Platform - Provider Registry (Extensible for Apollo & Future Data Providers)

import { DiscoveryProvider, CatalogCompany, DiscoveryScanFilters } from "../types";
import { InternalCatalogProvider } from "./internalCatalogProvider";

export class DiscoveryProviderRegistry {
  private providers: Map<string, DiscoveryProvider> = new Map();
  private primaryProviderName = "Internal Institutional Catalog";

  constructor() {
    // Register default internal catalog provider
    const internal = new InternalCatalogProvider();
    this.providers.set(internal.name, internal);
  }

  public registerProvider(provider: DiscoveryProvider): void {
    this.providers.set(provider.name, provider);
  }

  public setPrimaryProvider(name: string): void {
    if (this.providers.has(name)) {
      this.primaryProviderName = name;
    }
  }

  public async getCandidates(filters: DiscoveryScanFilters): Promise<CatalogCompany[]> {
    const primary = this.providers.get(this.primaryProviderName);
    if (primary) {
      return await primary.getCandidates(filters);
    }
    // Fallback to internal catalog
    const fallback = new InternalCatalogProvider();
    return await fallback.getCandidates(filters);
  }
}

export const providerRegistry = new DiscoveryProviderRegistry();
