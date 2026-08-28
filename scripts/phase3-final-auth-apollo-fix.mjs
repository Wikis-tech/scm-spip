import fs from 'node:fs';

const authPath = 'src/components/AuthScreen.tsx';
const apolloPath = 'src/services/apolloService.ts';

let auth = fs.readFileSync(authPath, 'utf8');
const signupPattern = /  const signup = async \(event: React\.FormEvent\) => \{[\s\S]*?\n  \};\n\n  const sendReset/;
const signupReplacement = `  const signup = async (event: React.FormEvent) => {
    event.preventDefault();
    clearFeedback();
    const normalizedEmail = email.trim().toLowerCase();

    if (fullName.trim().length < 2) return setErrorMessage('Enter your full name.');
    if (!isScmCorporateEmail(normalizedEmail)) return setErrorMessage('Registration is restricted to @scmcapitalng.com email addresses.');
    if (password.length < 12) return setErrorMessage('Use a password with at least 12 characters.');
    if (password !== confirmPassword) return setErrorMessage('Passwords do not match.');

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          fullName: fullName.trim(),
          department: department.trim() || 'Asset Management',
          jobTitle: jobTitle.trim() || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to create your SPIP access request.');

      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setJobTitle('');
      setMessage(payload?.message || 'Access request submitted. Wait for administrator approval before signing in.');
    } catch (error) {
      setErrorMessage(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const sendReset`;
if (!signupPattern.test(auth)) throw new Error('Auth signup function pattern not found');
auth = auth.replace(signupPattern, signupReplacement);
fs.writeFileSync(authPath, auth);

let apollo = fs.readFileSync(apolloPath, 'utf8');
const searchPattern = /export async function searchOrganizations\(query: string\): Promise<ApolloCompany\[]> \{[\s\S]*?\n\}\n\nexport async function enrichOrganization/;
const searchReplacement = `export async function searchOrganizations(query: string): Promise<ApolloCompany[]> {
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

export async function enrichOrganization`;
if (!searchPattern.test(apollo)) throw new Error('Apollo organization search pattern not found');
apollo = apollo.replace(searchPattern, searchReplacement);
fs.writeFileSync(apolloPath, apollo);

console.log('Applied reliable server-side signup and Apollo UI-parity company search.');
