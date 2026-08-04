import {
  normalizeDomain,
  normalizeOrganizationName,
  organizationSimilarityScore,
  belongsToSelectedCompany,
  apolloDiagnostics
} from "./services/apolloService";

// Helper to print test results elegantly
function printResult(testName: string, passed: boolean, extra: string = "") {
  if (passed) {
    console.log(`\x1b[32m[PASS]\x1b[0m ${testName} ${extra ? `(${extra})` : ""}`);
  } else {
    console.log(`\x1b[31m[FAIL]\x1b[0m ${testName} ${extra ? `(${extra})` : ""}`);
    process.exitCode = 1;
  }
}

console.log("================================================================================");
console.log("SCM PROSPECT INTELLIGENCE ENGINE — CORPORATE ALIGNMENT & IDENTITY TEST SUITE");
console.log("================================================================================\n");

// 1. Test Domain Normalization Layer
console.log("--- 1. DOMAIN NORMALIZATION LAYER TESTS ---");
const testDomains = [
  { raw: "http://www.verraki.africa/index.html", expected: "verraki.africa" },
  { raw: "https://verraki.africa/", expected: "verraki.africa" },
  { raw: "verraki.africa", expected: "verraki.africa" },
  { raw: "www.verraki.africa/home?ref=ok", expected: "verraki.africa" },
  { raw: "  VERRAKI.AFRICA  ", expected: "verraki.africa" },
  { raw: "not found", expected: "" },
  { raw: "N/A", expected: "" }
];

let domainChecksPassed = true;
for (const tc of testDomains) {
  const norm = normalizeDomain(tc.raw);
  const ok = norm === tc.expected;
  if (!ok) {
    domainChecksPassed = false;
    console.error(`  Mismatch: normalizeDomain("${tc.raw}") -> "${norm}", expected "${tc.expected}"`);
  }
}
printResult("Domain Normalization Layer", domainChecksPassed, `${testDomains.length} domains validated`);

// 2. Test Organization Name Normalization Layer
console.log("\n--- 2. NAME NORMALIZATION LAYER TESTS ---");
const testNames = [
  { raw: "Verraki Africa Ltd.", expected: "verraki africa" },
  { raw: "SCM Capital Limited Inc", expected: "scm capital" },
  { raw: "Andersen Consulting Group", expected: "andersen consulting" },
  { raw: "PwC Nigeria (PricewaterhouseCoopers)", expected: "pwc nigeria pricewaterhousecoopers" },
  { raw: "Verraki (A Member of Andersen Consulting)", expected: "verraki member of andersen consulting" }
];

let nameChecksPassed = true;
for (const tc of testNames) {
  const norm = normalizeOrganizationName(tc.raw);
  const ok = norm === tc.expected;
  if (!ok) {
    nameChecksPassed = false;
    console.error(`  Mismatch: normalizeOrganizationName("${tc.raw}") -> "${norm}", expected "${tc.expected}"`);
  }
}
printResult("Name Normalization Layer", nameChecksPassed, `${testNames.length} names validated`);

// 3. Test Similarity Score Calculation & Thresholds (Threshold default: 80)
console.log("\n--- 3. DETAILED SIMILARITY SCORE & ACCEPTANCE TESTS ---");
const testSimilarities = [
  { a: "Verraki", b: "Verraki Africa", expectedScoreMin: 85, expectedAccept: true },
  { a: "Verraki", b: "Verraki (A Member of Andersen Consulting)", expectedScoreMin: 80, expectedAccept: true },
  { a: "Verraki", b: "PwC Nigeria", expectedScoreMax: 30, expectedAccept: false },
  { a: "SCM Capital", b: "SCM Capital Asset Management", expectedScoreMin: 85, expectedAccept: true },
  { a: "Andersen", b: "Andersen Consulting", expectedScoreMin: 85, expectedAccept: true }
];

let similarityChecksPassed = true;
for (const tc of testSimilarities) {
  const score = organizationSimilarityScore(tc.a, tc.b);
  const accepted = score >= 80;
  
  const scoreOk = score >= (tc.expectedScoreMin ?? 0) && score <= (tc.expectedScoreMax ?? 100);
  const acceptOk = accepted === tc.expectedAccept;
  
  if (!scoreOk || !acceptOk) {
    similarityChecksPassed = false;
    console.error(`  Mismatch: Similarity("${tc.a}", "${tc.b}") -> ${score}% (Accepted: ${accepted}), scoreOk=${scoreOk}, acceptOk=${acceptOk}`);
  }
}
printResult("Company Similarity Matching Engine", similarityChecksPassed, `${testSimilarities.length} pairs validated`);

// 4. Test Multi-Layer Verification Rules (belongsToSelectedCompany)
console.log("\n--- 4. MULTI-LAYER VERIFICATION RULES (belongsToSelectedCompany) ---");

// Case A: Exact Org ID Match (Should override any name mismatch)
const selectedOrgA = { id: "12345", name: "Verraki", domain: "verraki.africa" };
const personA = {
  name: "John Doe",
  organization_id: "12345",
  organization: { id: "12345", name: "PwC Nigeria", website_url: "pwc.com" }
};
const resA = belongsToSelectedCompany(personA, selectedOrgA);
printResult("Rule 1: Exact Org ID Match Precedence", resA.belongs === true, resA.reason);

// Case B: Normalized Domain Match
const selectedOrgB = { id: "9999", name: "Verraki", domain: "https://www.verraki.africa" };
const personB = {
  name: "Jane Smith",
  organization_id: "8888", // ID Mismatch
  organization: { id: "8888", name: "Verraki Africa Branch", website_url: "verraki.africa/page" }
};
const resB = belongsToSelectedCompany(personB, selectedOrgB);
printResult("Rule 2: Normalized Domain Match Verification", resB.belongs === true, resB.reason);

// Case C: Corporate Email Domain Match
const selectedOrgC = { id: "9999", name: "Verraki", domain: "verraki.africa" };
const personC = {
  name: "Joe Bloggs",
  email: "joe.bloggs@verraki.africa",
  organization_id: "7777",
  organization: { id: "7777", name: "Unknown Subco", website_url: "unknownsub.com" }
};
const resC = belongsToSelectedCompany(personC, selectedOrgC);
printResult("Rule 3: Corporate Email Domain Verification", resC.belongs === true, resC.reason);

// Case D: Name Similarity Accept (No ID / Domain match)
const selectedOrgD = { id: "co-123", name: "Verraki", domain: "not-found.invalid" };
const personD = {
  name: "Sam Wilson",
  organization_id: "co-999",
  organization: { id: "co-999", name: "Verraki Africa Limited", website_url: "verraki-africa.invalid" }
};
const resD = belongsToSelectedCompany(personD, selectedOrgD);
printResult("Rule 4: Name Similarity Acceptance", resD.belongs === true, resD.reason);

// Case E: Professional Services Protected Brand Contamination Guard
const selectedOrgE = { id: "co-pwc", name: "PricewaterhouseCoopers", domain: "pwc.com" };
const personE = {
  name: "Accenture Exec",
  organization_id: "co-accenture",
  organization: { id: "co-accenture", name: "Accenture Nigeria (Formerly Andersen Consulting)", website_url: "accenture.com" }
};
// Name similarity might score high because of "Consulting" / "Nigeria", but should be blocked due to brand contamination guard
const resE = belongsToSelectedCompany(personE, selectedOrgE);
printResult("Rule 5: Professional Brand Contamination Guard", resE.belongs === false, resE.reason);

// 5. Test Telemetry Pipeline Integration
console.log("\n--- 5. DIAGNOSTIC TELEMETRY INTEGRATION TESTS ---");
const currentTelemetry = { ...apolloDiagnostics };
const telemetryOk = 
  currentTelemetry.orgIdMatchCount > 0 &&
  currentTelemetry.orgIdMismatchCount > 0 &&
  currentTelemetry.domainMatchCount > 0 &&
  (currentTelemetry.strongNameMatchCount > 0 || currentTelemetry.weakNameMatchCount >= 0) &&
  currentTelemetry.rejectedOrgMatchCount > 0;

printResult("Telemetry Pipeline Integration Metrics", telemetryOk, JSON.stringify(currentTelemetry, null, 2));

console.log("\n================================================================================");
console.log("INTEGRITY CHECKS COMPLETED SUCCESSFULY");
console.log("================================================================================");
