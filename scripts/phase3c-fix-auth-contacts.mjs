import fs from 'node:fs';

function replaceBlock(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Patch marker not found: ${startMarker}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

// Signup: use the normal Supabase client and the Phase 2C Auth->profile trigger.
{
  const file = 'src/components/AuthScreen.tsx';
  let source = fs.readFileSync(file, 'utf8');
  const lines = [
    '  const signup = async (event: React.FormEvent) => {',
    '    event.preventDefault();',
    '    clearFeedback();',
    '    const normalizedEmail = email.trim().toLowerCase();',
    '',
    "    if (fullName.trim().length < 2) return setErrorMessage('Enter your full name.');",
    "    if (!isScmCorporateEmail(normalizedEmail)) return setErrorMessage('Registration is restricted to @scmcapitalng.com email addresses.');",
    "    if (password.length < 12) return setErrorMessage('Use a password with at least 12 characters.');",
    "    if (password !== confirmPassword) return setErrorMessage('Passwords do not match.');",
    '',
    '    setLoading(true);',
    '    try {',
    '      const { data, error } = await supabase.auth.signUp({',
    '        email: normalizedEmail,',
    '        password,',
    '        options: {',
    '          data: {',
    '            full_name: fullName.trim(),',
    "            department: department.trim() || 'Asset Management',",
    '            job_title: jobTitle.trim() || null,',
    '          },',
    '        },',
    '      });',
    '',
    '      if (error) throw error;',
    "      if (!data.user?.id) throw new Error('Supabase did not create the staff identity. Please try again.');",
    '      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {',
    "        throw new Error('An SPIP account already exists for this corporate email. Use Sign in or Forgot password.');",
    '      }',
    '      if (data.session) await supabase.auth.signOut();',
    '',
    "      setMode('login');",
    "      setPassword('');",
    "      setConfirmPassword('');",
    "      setFullName('');",
    "      setJobTitle('');",
    "      setMessage('Access request submitted. An administrator must approve the account before it can be used.');",
    '    } catch (error) {',
    '      setErrorMessage(friendlyAuthError(error));',
    '    } finally {',
    '      setLoading(false);',
    '    }',
    '  };',
    '',
  ];
  source = replaceBlock(source, '  const signup = async (event: React.FormEvent) => {', '  const sendReset = async (event: React.FormEvent) => {', lines.join('\n'));
  fs.writeFileSync(file, source);
}

// Apollo: correct saved-account identity, retry people searches, and merge already-enriched saved contacts.
{
  const file = 'src/services/apolloService.ts';
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(
    "  const id = String(org?.id || org?.organization_id || '');",
    "  const id = String(org?.organization_id || org?.id || '');"
  );
  source = source.replace(
    "  const lastName = person?.last_name || '';",
    "  const lastName = person?.last_name || person?.last_name_obfuscated || '';"
  );

  const lines = [
    "export async function discoverDecisionMakers(companyId: string, domain: string, companyName = ''): Promise<ApolloPerson[]> {",
    '  const cleanDomain = normalizeDomain(domain);',
    "  const validOrgId = companyId && !companyId.startsWith('co-') ? companyId : '';",
    '  if (!cleanDomain && !validOrgId && !companyName.trim()) return [];',
    '  const selected = { id: validOrgId || companyId, name: companyName || cleanDomain, domain: cleanDomain };',
    '',
    '  const runPeopleSearch = async (payload: any) => {',
    "    const response = await apolloClient.request<any>('https://api.apollo.io/api/v1/mixed_people/api_search', 'POST', {",
    '      page: 1,',
    '      per_page: 100,',
    "      person_seniorities: ['owner', 'founder', 'c_suite', 'partner', 'vp', 'head', 'director', 'manager', 'senior'],",
    '      ...payload,',
    '    });',
    '    syncDiagnostics();',
    '    return response.ok && Array.isArray(response.data?.people) ? response.data.people : [];',
    '  };',
    '',
    '  let globalPeople: any[] = [];',
    '  let constrainedSearch = false;',
    '  if (validOrgId) {',
    '    globalPeople = await runPeopleSearch({ organization_ids: [validOrgId] });',
    '    constrainedSearch = globalPeople.length > 0;',
    '  }',
    '  if (globalPeople.length === 0 && cleanDomain) {',
    '    globalPeople = await runPeopleSearch({ q_organization_domains_list: [cleanDomain] });',
    '    constrainedSearch = globalPeople.length > 0;',
    '  }',
    '  if (globalPeople.length === 0 && companyName.trim()) {',
    '    globalPeople = await runPeopleSearch({ q_keywords: companyName.trim() });',
    '    constrainedSearch = false;',
    '  }',
    '',
    '  let savedContacts: any[] = [];',
    '  if (companyName.trim()) {',
    "    const contactsResponse = await apolloClient.request<any>('https://api.apollo.io/api/v1/contacts/search', 'POST', {",
    '      q_keywords: companyName.trim(), page: 1, per_page: 100,',
    '    });',
    '    syncDiagnostics();',
    '    if (contactsResponse.ok && Array.isArray(contactsResponse.data?.contacts)) savedContacts = contactsResponse.data.contacts;',
    '  }',
    '',
    '  const personOrgName = (p: any) => p?.organization?.name || p?.account?.name || p?.organization_name || "";',
    '  const personOrgId = (p: any) => p?.organization_id || p?.organization?.id || p?.account?.organization_id || "";',
    '  const belongs = (p: any) => {',
    '    if (constrainedSearch && globalPeople.includes(p)) return true;',
    '    const pid = String(personOrgId(p) || "").toLowerCase();',
    '    if (validOrgId && pid && pid === validOrgId.toLowerCase()) return true;',
    '    const pd = normalizeDomain(p?.organization?.primary_domain || p?.organization?.domain || p?.account?.domain || p?.account?.website_url || "");',
    '    if (cleanDomain && pd && pd === cleanDomain) return true;',
    '    const pn = personOrgName(p);',
    '    return Boolean(companyName.trim() && pn && organizationSimilarityScore(companyName, pn) >= 65);',
    '  };',
    '',
    '  const mapFlexible = (p: any): ApolloPerson => {',
    '    const organization = p?.organization || p?.account || {};',
    '    return mapPerson({',
    '      ...p,',
    '      organization_id: personOrgId(p) || validOrgId || companyId,',
    '      organization: { ...organization, name: personOrgName(p) || companyName, primary_domain: organization?.primary_domain || organization?.domain || cleanDomain },',
    '    }, selected);',
    '  };',
    '',
    '  const combined = [...savedContacts.filter(belongs), ...globalPeople.filter(belongs)].map(mapFlexible);',
    '  const merged = new Map<string, ApolloPerson>();',
    '  for (const person of combined) {',
    "    if (!person.fullName || person.fullName === 'Unknown') continue;",
    "    const key = String(person.id || person.linkedin || person.email || (person.fullName + '|' + person.position)).toLowerCase();",
    '    const existing = merged.get(key);',
    '    if (!existing) { merged.set(key, person); continue; }',
    '    merged.set(key, { ...existing, ...person, email: person.email || existing.email, phone: person.phone || existing.phone, linkedin: person.linkedin || existing.linkedin, linkedin_url: person.linkedin_url || existing.linkedin_url });',
    '  }',
    '',
    '  const rank: Record<string, number> = { owner: 12, founder: 11, c_suite: 10, partner: 9, vp: 8, head: 7, director: 6, manager: 5, senior: 4 };',
    '  const result = [...merged.values()].sort((a, b) => {',
    '    const ar = (a.email ? 2 : 0) + (a.phone ? 2 : 0) + (a.linkedin ? 1 : 0);',
    '    const br = (b.email ? 2 : 0) + (b.phone ? 2 : 0) + (b.linkedin ? 1 : 0);',
    '    return br !== ar ? br - ar : (rank[String(b.seniority).toLowerCase()] || 0) - (rank[String(a.seniority).toLowerCase()] || 0);',
    '  });',
    '  apolloDiagnostics.peopleReturned = result.length;',
    '  apolloDiagnostics.selectedOrganization = selected.name;',
    '  apolloDiagnostics.selectedOrganizationId = selected.id;',
    "  apolloDiagnostics.lastAcceptanceMethodUsed = savedContacts.length ? 'Apollo People + Saved Contacts' : constrainedSearch ? 'Apollo Organization/Domain People Search' : 'Apollo Keyword People Search';",
    '  return result;',
    '}',
    '',
  ];

  const start = source.indexOf('export async function discoverDecisionMakers(');
  if (start < 0) throw new Error('Apollo discoverDecisionMakers function not found');
  source = source.slice(0, start) + lines.join('\n');
  fs.writeFileSync(file, source);
}

console.log('Phase 3C auth + Apollo contact fixes applied.');
