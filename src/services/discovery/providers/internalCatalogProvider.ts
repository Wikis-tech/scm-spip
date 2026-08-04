// SCM Prospect Intelligence Platform - Internal Catalog Discovery Provider

import { DiscoveryProvider, CatalogCompany, DiscoveryScanFilters } from "../types";
import { INSTITUTIONAL_PROSPECT_CATALOG } from "../institutionalCatalog";

export class InternalCatalogProvider implements DiscoveryProvider {
  public name = "Internal Institutional Catalog";

  public async getCandidates(filters: DiscoveryScanFilters): Promise<CatalogCompany[]> {
    const {
      source = "All",
      industry = "All",
      location = "All",
      sizeTier = "All",
      revenueRange = "All"
    } = filters;

    // Filter institutional catalog based on criteria
    const matches = INSTITUTIONAL_PROSPECT_CATALOG.filter(item => {
      if (source !== "All" && item.source !== source && source !== "Custom Targeted AI Search") {
        return false;
      }
      if (industry !== "All" && item.industry !== industry) {
        return false;
      }
      if (location !== "All" && !item.location.toLowerCase().includes(location.toLowerCase().split(" ")[0])) {
        return false;
      }
      if (sizeTier !== "All" && item.sizeTier !== sizeTier) {
        return false;
      }
      if (revenueRange !== "All" && item.revenueRange !== revenueRange) {
        return false;
      }
      return true;
    });

    // Always append remaining catalog candidates so that when matching companies are served,
    // the discovery queue continues smoothly through the broader institutional catalog without premature resets
    const nonMatches = INSTITUTIONAL_PROSPECT_CATALOG.filter(
      c => !matches.some(m => m.name.trim().toLowerCase() === c.name.trim().toLowerCase())
    );

    return [...matches, ...nonMatches];
  }
}
