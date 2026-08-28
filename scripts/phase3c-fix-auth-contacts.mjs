import fs from 'node:fs';

function replaceBlock(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Patch marker not found: ${startMarker}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

// Signup: bypass broken server auth.admin.createUser and use normal Supabase signup.
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
    '      if (data.session) await supabase.auth.signOut();',
    '',
    "      setMode('login');",
    "      setPassword('');",
    "      setConfirmPassword('');",
    "      setFullName('');",
    "      setJobTitle('');",
    '      setMessage(',
    '        data.user.email_confirmed_at',
    "          ? 'Access request submitted. An administrator must approve the account before sign in.'",
    "          : 'Access request submitted. Confirm your corporate email if prompted, then wait for administrator approval.'",
    '      );',
    '    } catch (error) {',
    '      setErrorMessage(friendlyAuthError(error));',
    '    } finally {',
    '      setLoading(false);',
    '    }',
    '  };',
    '',
  ];
  source = replaceBlock(
    source,
    '  const signup = async (event: React.FormEvent) => {',
    '  const sendReset = async (event: React.FormEvent) => {',
    lines.join('\n')
  );
  fs.writeFileSync(file, source);
}

// Apollo: correct account-vs-organization identity and merge global people with saved contacts.
{
  const file = 'src/services/apolloService.ts';
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(
    "  const id = String(org?.id || org?.organization_id || '');",
    "  // Saved Apollo Accounts have their own account id; people search needs organization_id.\n  const id = String(org?.organization_id || org?.id || '');"
  );

  const lines = [
    "export async function discoverDecisionMakers(companyId: string, domain: string, companyName = ''): Promise<ApolloPerson[]> {",
    '  const cleanDomain = normalizeDomain(domain);',
    "  const validOrgId = companyId && !companyId.startsWith('co-') ? companyId : '';",
    '  if (!cleanDomain && !validOrgId && !companyName.trim()) return [];',
    '',
    '  const buildPeoplePayload = (useOrgId: boolean) => {',
    '    const payload: any = {',
    '      page: 1,',
    '      per_page: 100,',
    "      person_seniorities: ['owner', 'founder', 'c_suite', 'partner', 'vp', 'head', 'director', 'manager', 'senior'],",
    '    };',
    '    if (useOrgId && validOrgId) payload.organization_ids = [validOrgId];',
    '    else if (cleanDomain) payload.q_organization_domains_list = [cleanDomain];',
    '    else if (companyName.trim()) payload.q_keywords = companyName.trim();',
    '    return payload;',
    '  };',
    '',
    '  let peopleResponse = await apolloClient.request<any>(',
    "    'https://api.apollo.io/api/v1/mixed_people/api_search',",
    "    'POST',",
    '    buildPeoplePayload(Boolean(validOrgId)),',
    '  );',
    '  let globalPeople = peopleResponse.ok && Array.isArray(peopleResponse.data?.people) ? peopleResponse.data.people : [];',
    '',
    '  if (globalPeople.length === 0 && validOrgId && cleanDomain) {',
    '    peopleResponse = await apolloClient.request<any>(',
    "      'https://api.apollo.io/api/v1/mixed_people/api_search',",
    "      'POST',",
    '      buildPeoplePayload(false),',
    '    );',
    '    globalPeople = peopleResponse.ok && Array.isArray(peopleResponse.data?.people) ? peopleResponse.data.people : [];',
    '  }',
    '',
    '  const contactsResponse = companyName.trim()',
    "    ? await apolloClient.request<any>('https://api.apollo.io/api/v1/contacts/search', 'POST', {",
    '        q_keywords: companyName.trim(), page: 1, per_page: 100,',
    '      })',
    '    : ({ ok: false, data: null } as any);',
    '',
    '  syncDiagnostics();',
    '  const savedContacts = contactsResponse.ok && Array.isArray(contactsResponse.data?.contacts) ? contactsResponse.data.contacts : [];',
    '  const selected = { id: validOrgId || companyId, name: companyName || cleanDomain, domain: cleanDomain };',
    '',
    "  const personOrgName = (p: any) => p?.organization?.name || p?.account?.name || p?.organization_name || '';",
    "  const personOrgId = (p: any) => p?.organization_id || p?.organization?.id || p?.account?.organization_id || '';",
    '  const belongs = (p: any) => {',
    "    const pid = String(personOrgId(p) || '').toLowerCase();",
    '    if (validOrgId && pid && pid === validOrgId.toLowerCase()) return true;',
    '    const pd = normalizeDomain(p?.organization?.primary_domain || p?.organization?.domain || p?.account?.domain || p?.account?.website_url || "");',
    '    if (cleanDomain && pd && pd === cleanDomain) return true;',
    '    const pn = personOrgName(p);',
    '    if (companyName.trim() && pn && organizationSimilarityScore(companyName, pn) >= 65) return true;',
    '    return false;',
    '  };',
    '',
    '  const mapFlexible = (p: any): ApolloPerson => {',
    '    const organization = p?.organization || p?.account || {};',
    '    return mapPerson({',
    '      ...p,',
    '      organization_id: personOrgId(p) || validOrgId || companyId,',
    '      organization: {',
    '        ...organization,',
    '        name: personOrgName(p) || companyName,',
    '        primary_domain: organization?.primary_domain || organization?.domain || cleanDomain,',
    '      },',
    '    }, selected);',
    '  };',
    '',
    '  const combined = [...savedContacts.filter(belongs), ...globalPeople.filter(belongs)].map(mapFlexible);',
    '  const byIdentity = new Map<string, ApolloPerson>();',
    '  for (const person of combined) {',
    "    const key = person.id || (person.fullName.toLowerCase() + '|' + person.position.toLowerCase());",
    '    const existing = byIdentity.get(key);',
    '    if (!existing) { byIdentity.set(key, person); continue; }',
    '    const er = Number(Boolean(existing.email)) + Number(Boolean(existing.phone)) + Number(Boolean(existing.linkedin));',
    '    const nr = Number(Boolean(person.email)) + Number(Boolean(person.phone)) + Number(Boolean(person.linkedin));',
    '    if (nr > er) byIdentity.set(key, person);',
    '  }',
    '',
    '  const rank: Record<string, number> = { owner: 10, founder: 9, c_suite: 8, partner: 7, vp: 6, head: 5, director: 4, manager: 3, senior: 2 };',
    '  const people = [...byIdentity.values()].sort((a, b) => (rank[String(b.seniority).toLowerCase()] || 0) - (rank[String(a.seniority).toLowerCase()] || 0));',
    '  apolloDiagnostics.peopleReturned = people.length;',
    '  apolloDiagnostics.selectedOrganization = selected.name;',
    '  apolloDiagnostics.selectedOrganizationId = selected.id;',
    '  return people;',
    '}',
    '',
  ];

  const start = source.indexOf('export async function discoverDecisionMakers(');
  if (start < 0) throw new Error('Apollo discoverDecisionMakers function not found');
  source = source.slice(0, start) + lines.join('\n');
  fs.writeFileSync(file, source);
}

console.log('Phase 3C auth + Apollo contact fixes applied.');
