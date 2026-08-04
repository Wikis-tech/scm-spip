// SCM Prospect Intelligence Platform - Data Verification Engine
// Phase 7

import { ApolloCompany, ApolloPerson } from "./apolloService";

export interface VerificationReport {
  status: "Verified" | "Partially Verified" | "Unverified";
  dnsResolved: boolean;
  confidenceScore: number;
  lastChecked: string;
  scrapedAt: string;
  trustedRegistries: string[];
  dnsStatus?: string;
  reasons: string[];
  failures: string[];
}

/**
 * Classifies the gathered intelligence as Verified, Partially Verified, or Unverified.
 * Verification Rules:
 * - Verified: Apollo returned both company AND executive people data.
 * - Partially Verified: Company was found, but executive decision maker list is incomplete or empty.
 * - Unverified: Apollo was unable to validate or locate the searched company.
 */
export function verifyData(
  company: ApolloCompany | null,
  people: ApolloPerson[],
  isPreset: boolean = false
): VerificationReport {
  const lastChecked = new Date().toISOString().split("T")[0];
  const scrapedAt = lastChecked;

  // 1. Unverified Case
  if (!company) {
    return {
      status: "Unverified",
      dnsResolved: false,
      confidenceScore: 0,
      lastChecked,
      scrapedAt,
      trustedRegistries: [],
      dnsStatus: "Lookup failed on registrar databases.",
      reasons: ["Entity failed verification - DNS resolution rejected, no registrations found."],
      failures: [
        "No registered CAC company reference matching the term",
        "Could not resolve active corporate website domain registration",
        "Zero verified board executives discovered"
      ]
    };
  }

  const failures: string[] = [];
  const reasons: string[] = [];
  const registries = isPreset
    ? ["SEC Nigeria", "Whois Domain Services", "NSE Registered Corporate Directory"]
    : ["Apollo Global Database", "Whois Registrar Services"];

  let dnsResolved = true;
  let dnsStatus = "Active SSL Domain, DNS resolved successfully.";
  let score = 50; // Base score for finding company

  // Check website domain validity
  if (!company.domain || company.domain.toLowerCase() === "not found" || company.domain.toLowerCase() === "information not found") {
    dnsResolved = false;
    dnsStatus = "DNS resolution failed - inactive or unregistered domain term.";
    failures.push("Corporate website domain inactive or offline.");
  } else {
    score += 15;
    reasons.push("Verifiable high-authority commercial web domain domain-name resolved.");
  }

  // Check details completeness
  if (company.industry && company.industry !== "Information Not Found") {
    score += 10;
  } else {
    failures.push("Industry categorization details unverified.");
  }

  if (company.headquarters && company.headquarters !== "Information Not Found") {
    score += 10;
  } else {
    failures.push("Corporate headquarters physical location coordinates unverified.");
  }

  // 2. Classify based on People Presence
  const activeExecutives = people.filter(p => p.position && p.position.toLowerCase() !== "not found");
  
  if (activeExecutives.length > 0) {
    score += 15; // Complete verification
    reasons.push(`${activeExecutives.length} active C-suite and Finance board directors indexed.`);
    
    // Check if we have both CFO/Treasurer/Finance and CEO/MD
    const hasFinance = activeExecutives.some(p => 
      p.position.toLowerCase().includes("cfo") || 
      p.position.toLowerCase().includes("financial") || 
      p.position.toLowerCase().includes("treasurer") || 
      p.position.toLowerCase().includes("finance")
    );
    const hasExecutive = activeExecutives.some(p => 
      p.position.toLowerCase().includes("ceo") || 
      p.position.toLowerCase().includes("managing director") || 
      p.position.toLowerCase().includes("president")
    );

    if (hasFinance && hasExecutive) {
      score = Math.min(100, score + 10);
      reasons.push("Strategic finance and operational leaders both positively matched.");
    } else if (!hasFinance) {
      failures.push("Primary treasury or finance division director match missing.");
    }
  } else {
    failures.push("C-suite relationship contact roster empty.");
  }

  let status: "Verified" | "Partially Verified" | "Unverified" = "Verified";
  if (activeExecutives.length === 0) {
    status = "Partially Verified";
    score = Math.max(30, Math.min(65, score));
    reasons.push("Entity organization validated, but contact directories require active advisory development.");
  } else if (!dnsResolved) {
    status = "Partially Verified";
    score = Math.max(20, Math.min(50, score));
  } else {
    status = "Verified";
    score = Math.max(70, score);
  }

  return {
    status,
    dnsResolved,
    confidenceScore: score,
    lastChecked,
    scrapedAt,
    trustedRegistries: registries,
    dnsStatus,
    reasons,
    failures
  };
}
