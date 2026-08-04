// SCM Capital - Product Recommendation Engine Version 1 (Rules-Based)

export interface ProductRecommendation {
  product: string;
  score: number;
  reason: string;
}

export interface RecommendationEngineResult {
  matrix: ProductRecommendation[];
  industryMatched: string;
  hasExecutiveKeyman: boolean;
}

/**
 * Calculates rules-based prospect product recommendations based on SCM Capital's V1 core rules engine.
 * 
 * SUPPORTED SCM PRODUCTS:
 * 1. Money Market Fund (MMF)
 * 2. Fixed Income Solutions
 * 3. Commercial Paper
 * 4. Treasury Management Solutions
 * 5. Private Trust
 * 6. Wealth Advisory
 * 7. Corporate Investment Advisory
 * 8. Institutional Portfolio Management
 */
export function calculateProductRecommendations(
  company: {
    name: string;
    industry: string;
    description: string;
    employeeCount?: string | number;
    revenueValue?: string;
  },
  people: { position?: string; title?: string }[] = [],
  opportunityScore: number = 80
): RecommendationEngineResult {
  const products = [
    "Money Market Fund (MMF)",
    "Fixed Income Solutions",
    "Commercial Paper",
    "Treasury Management Solutions",
    "Private Trust",
    "Wealth Advisory",
    "Corporate Investment Advisory",
    "Institutional Portfolio Management"
  ];

  // Seed baseline scores
  const scores: Record<string, number> = {
    "Money Market Fund (MMF)": 60,
    "Fixed Income Solutions": 55,
    "Commercial Paper": 50,
    "Treasury Management Solutions": 52,
    "Private Trust": 45,
    "Wealth Advisory": 40,
    "Corporate Investment Advisory": 42,
    "Institutional Portfolio Management": 48
  };

  // 1. Scale scores based on the general Opportunity Score to reflect overall lead quality
  const scale = 0.6 + (opportunityScore / 250); // for oppScore 85, scale = 0.94
  for (const p of products) {
    scores[p] = Math.round(scores[p] * scale);
  }

  // 2. Identify the active industry sector matching SCM's rules
  const industryStr = (company.industry || "").toLowerCase();
  const nameStr = (company.name || "").toLowerCase();
  const descStr = (company.description || "").toLowerCase();

  const isFinancial = 
    industryStr.includes("financial") || 
    industryStr.includes("bank") || 
    industryStr.includes("finance") || 
    industryStr.includes("capital") || 
    industryStr.includes("insurance") || 
    industryStr.includes("investment") ||
    nameStr.includes("bank") || 
    nameStr.includes("capital") || 
    nameStr.includes("fcmb");

  const isManufacturing = 
    industryStr.includes("manufacturing") || 
    industryStr.includes("goods") || 
    industryStr.includes("industrial") || 
    industryStr.includes("food") || 
    industryStr.includes("beverage") || 
    industryStr.includes("consumer pack") ||
    nameStr.includes("dangote") || 
    nameStr.includes("nestle") || 
    descStr.includes("manufacturing") || 
    descStr.includes("cement") || 
    descStr.includes("factory") || 
    descStr.includes("consumer goods");

  const isTech = 
    industryStr.includes("technology") || 
    industryStr.includes("software") || 
    industryStr.includes("internet") || 
    industryStr.includes("information tech") ||
    nameStr.includes("tech") || 
    descStr.includes("technology") || 
    descStr.includes("software") || 
    descStr.includes("digital");

  const isEnergy = 
    industryStr.includes("energy") || 
    industryStr.includes("oil") || 
    industryStr.includes("gas") || 
    industryStr.includes("power") || 
    industryStr.includes("utility") || 
    industryStr.includes("petroleum") ||
    nameStr.includes("oando") || 
    descStr.includes("energy") || 
    descStr.includes("exploration") || 
    descStr.includes("petroleum");

  const isTelecom = 
    industryStr.includes("telecommunications") || 
    industryStr.includes("telecom") || 
    industryStr.includes("mobile network") ||
    nameStr.includes("mtn") || 
    descStr.includes("telecom") || 
    descStr.includes("telecommunication") || 
    descStr.includes("telephonic");

  let industryMatched = "Other";

  // Apply Industry Rule Scores
  if (isFinancial) {
    industryMatched = "Financial Services";
    scores["Commercial Paper"] += 36;
    scores["Fixed Income Solutions"] += 32;
    scores["Treasury Management Solutions"] += 28;
    scores["Money Market Fund (MMF)"] += 22;
  } else if (isManufacturing) {
    industryMatched = "Manufacturing";
    scores["Treasury Management Solutions"] += 32;
    scores["Money Market Fund (MMF)"] += 28;
    scores["Fixed Income Solutions"] += 24;
  } else if (isTech) {
    industryMatched = "Technology";
    scores["Money Market Fund (MMF)"] += 35;
    scores["Wealth Advisory"] += 30;
    scores["Treasury Management Solutions"] += 25;
  } else if (isEnergy) {
    industryMatched = "Energy";
    scores["Fixed Income Solutions"] += 35;
    scores["Treasury Management Solutions"] += 30;
    scores["Institutional Portfolio Management"] += 28;
  } else if (isTelecom) {
    industryMatched = "Telecommunications";
    scores["Treasury Management Solutions"] += 36;
    scores["Fixed Income Solutions"] += 28;
    scores["Money Market Fund (MMF)"] += 22;
  }

  // 3. Executive Enhancement rule: increase Private Trust and Wealth Advisory
  let hasExecutiveKeyman = false;
  for (const person of people) {
    const pTitle = (person.position || person.title || "").toUpperCase();
    if (
      pTitle.includes("CEO") || 
      pTitle.includes("MD") || 
      pTitle.includes("FOUNDER") || 
      pTitle.includes("CHAIRMAN") || 
      pTitle.includes("MANAGING DIRECTOR") ||
      pTitle.includes("CHIEF EXECUTIVE")
    ) {
      hasExecutiveKeyman = true;
      break;
    }
  }

  if (hasExecutiveKeyman) {
    scores["Private Trust"] += 30;
    scores["Wealth Advisory"] += 30;
  }

  // Bound all scores between 10 and 98 to ensure they fit nicely and look professional
  for (const p of products) {
    scores[p] = Math.min(98, Math.max(10, scores[p]));
  }

  // Build the sorted matrix with tailored local fallback descriptions (which Serena can override if requested)
  const matrix: ProductRecommendation[] = Object.entries(scores).map(([product, score]) => {
    let reason = `SCM product suited to support long-term corporate liquidity and asset protection directives.`;

    if (product === "Money Market Fund (MMF)") {
      reason = `Highly recommended for SCM Corporate Money Market Fund to optimize yield on ${company.name}'s short-term operations cash.`;
    } else if (product === "Fixed Income Solutions") {
      reason = `Long-term structured yields providing stable interest cushions on ${company.name}'s balance sheet.`;
    } else if (product === "Commercial Paper") {
      reason = `Enables ${company.name} to earn high-yield corporate arbitrage on seasonal treasury buffers.`;
    } else if (product === "Treasury Management Solutions") {
      reason = `Streamlined corporate sweep account advisory to minimize idle deposit drags and maximize liquidity.`;
    } else if (product === "Private Trust") {
      reason = `Discretionary asset structure protecting wealth transitions for key decision-makers at ${company.name}.`;
    } else if (product === "Wealth Advisory") {
      reason = `Custom global assets matching the personal investment outlook profiles of ${company.name}'s key executives.`;
    } else if (product === "Corporate Investment Advisory") {
      reason = `Fiduciary capital advisory matching ${company.name}'s ongoing expansion requirements and macro hedging needs.`;
    } else if (product === "Institutional Portfolio Management") {
      reason = `Professional portfolio management structured strictly on SCM's premier safety and asset duration policies.`;
    }

    return { product, score, reason };
  }).sort((a, b) => b.score - a.score);

  return { matrix, industryMatched, hasExecutiveKeyman };
}
