import fs from 'node:fs';

function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Unable to apply ${label}: source pattern not found`);
  return source.replace(from, to);
}

// 1) Make signup use the already-configured browser Supabase client and the Phase 2C Auth->profile trigger.
{
  const file = 'src/components/AuthScreen.tsx';
  let source = fs.readFileSync(file, 'utf8');
  const startMarker = "      const response = await fetch('/api/auth/register-v2', {";
  const endMarker = "      setMessage(payload?.message || 'Access request submitted. Wait for administrator approval before signing in.');";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Unable to locate legacy signup request block.');
  const endInclusive = end + endMarker.length;
  const replacement = `      const { data, error } = await supabase.auth.signUp({\n        email: normalizedEmail,\n        password,\n        options: {\n          data: {\n            full_name: fullName.trim(),\n            department: department.trim() || 'Asset Management',\n            job_title: jobTitle.trim() || null,\n          },\n        },\n      });\n      if (error) throw error;\n      if (!data.user) throw new Error('Unable to create your SPIP access request.');\n      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {\n        throw new Error('An SPIP account already exists for this corporate email. Use Sign in or Forgot password.');\n      }\n\n      // Even when Supabase email confirmation is disabled, a newly-created employee must\n      // never remain signed in before administrator approval. Phase 2C creates STAFF/PENDING.\n      await supabase.auth.signOut();\n\n      setMode('login');\n      setPassword('');\n      setConfirmPassword('');\n      setFullName('');\n      setJobTitle('');\n      setMessage('Access request submitted. An administrator must approve the account before it can be used.');`;
  source = source.slice(0, start) + replacement + source.slice(endInclusive);
  fs.writeFileSync(file, source);
}

// 2) Repair Apollo account-vs-organization identity, contact discovery, and truthful contact rendering.
{
  const file = 'src/services/apolloService.ts';
  let source = fs.readFileSync(file, 'utf8');

  source = replaceRequired(
    source,
    "  const id = String(org?.id || org?.organization_id || '');",
    "  const id = String(org?.organization_id || org?.id || '');",
    'Apollo organization id priority'
  );

  source = replaceRequired(
    source,
    "    email: person?.email || '',\n    emailValidationType: person?.email_status || undefined,\n    phone: person?.phone_numbers?.[0]?.sanitized_number || person?.phone_numbers?.[0]?.raw_number || '',",
    "    email: (() => {\n      const value = String(person?.email || '').trim();\n      return value && !value.includes('[email') ? value : '';\n    })(),\n    emailValidationType: person?.email_status || undefined,\n    phone: person?.phone_numbers?.find((entry: any) => entry?.sanitized_number || entry?.raw_number)?.sanitized_number\n      || person?.phone_numbers?.find((entry: any) => entry?.sanitized_number || entry?.raw_number)?.raw_number\n      || person?.sanitized_phone\n      || person?.phone\n      || '',",
    'Apollo contact field mapping'
  );

  const functionStart = source.indexOf('export async function discoverDecisionMakers(');
  if (functionStart < 0) throw new Error('Unable to locate discoverDecisionMakers.');
  const newFunction = `export async function discoverDecisionMakers(companyId: string, domain: string, companyName = ''): Promise<ApolloPerson[]> {\n  const cleanDomain = normalizeDomain(domain);\n  const validOrgId = companyId && !companyId.startsWith('co-') ? companyId : '';\n  if (!cleanDomain && !validOrgId && !companyName.trim()) return [];\n\n  const selected = { id: validOrgId || companyId, name: companyName || cleanDomain, domain: cleanDomain };\n\n  const runPeopleSearch = async (payload: any) => {\n    const response = await apolloClient.request<any>('https://api.apollo.io/api/v1/mixed_people/api_search', 'POST', {\n      page: 1,\n      per_page: 100,\n      ...payload,\n    });\n    syncDiagnostics();\n    return response.ok && Array.isArray(response.data?.people) ? response.data.people : [];\n  };\n\n  // Apollo Accounts have their own account id. We now prioritize organization_id in mapCompany,\n  // but still retry by domain/name because historical saved-account records may not contain it.\n  let people: any[] = [];\n  let constrainedSearch = false;\n  if (validOrgId) {\n    people = await runPeopleSearch({ organization_ids: [validOrgId] });\n    constrainedSearch = people.length > 0;\n  }\n  if (people.length === 0 && cleanDomain) {\n    people = await runPeopleSearch({ q_organization_domains_list: [cleanDomain] });\n    constrainedSearch = people.length > 0;\n  }\n  if (people.length === 0 && companyName.trim()) {\n    people = await runPeopleSearch({ q_keywords: companyName.trim() });\n    constrainedSearch = false;\n  }\n\n  // Saved Apollo Contacts are already enriched records and can contain email/phone data.\n  // Merge them with net-new People Search so staff see names immediately and any contact details\n  // that are already available in the team's Apollo workspace without fabricating data.\n  let savedContacts: any[] = [];\n  if (companyName.trim()) {\n    const savedResponse = await apolloClient.request<any>('https://api.apollo.io/api/v1/contacts/search', 'POST', {\n      q_keywords: companyName.trim(),\n      page: 1,\n      per_page: 100,\n    });\n    syncDiagnostics();\n    if (savedResponse.ok && Array.isArray(savedResponse.data?.contacts)) {\n      savedContacts = savedResponse.data.contacts;\n    }\n  }\n\n  const acceptedPeople = people.filter((person: any) => {\n    if (constrainedSearch) return true;\n    return belongsToSelectedCompany(person, selected, 65).belongs;\n  });\n  const acceptedContacts = savedContacts.filter((person: any) => belongsToSelectedCompany(person, selected, 65).belongs);\n\n  const merged = new Map<string, ApolloPerson>();\n  for (const raw of [...acceptedPeople, ...acceptedContacts]) {\n    const mapped = mapPerson(raw, selected);\n    if (!mapped.fullName || mapped.fullName === 'Unknown') continue;\n    const key = String(raw?.id || mapped.linkedin || mapped.email || (mapped.fullName + '|' + mapped.position)).toLowerCase();\n    const existing = merged.get(key);\n    if (!existing) {\n      merged.set(key, mapped);\n      continue;\n    }\n    // Prefer the richer saved-contact version when Apollo has already revealed contact data.\n    merged.set(key, {\n      ...existing,\n      ...mapped,\n      email: mapped.email || existing.email,\n      phone: mapped.phone || existing.phone,\n      linkedin: mapped.linkedin || existing.linkedin,\n      linkedin_url: mapped.linkedin_url || existing.linkedin_url,\n    });\n  }\n\n  const rank: Record<string, number> = { owner: 12, founder: 11, c_suite: 10, partner: 9, vp: 8, head: 7, director: 6, manager: 5, senior: 4 };\n  const result = [...merged.values()].sort((a, b) => {\n    const contactDataA = (a.email ? 2 : 0) + (a.phone ? 2 : 0) + (a.linkedin ? 1 : 0);\n    const contactDataB = (b.email ? 2 : 0) + (b.phone ? 2 : 0) + (b.linkedin ? 1 : 0);\n    if (contactDataA !== contactDataB) return contactDataB - contactDataA;\n    return (rank[String(b.seniority).toLowerCase()] || 0) - (rank[String(a.seniority).toLowerCase()] || 0);\n  });\n\n  apolloDiagnostics.peopleReturned = result.length;\n  apolloDiagnostics.selectedOrganization = selected.name;\n  apolloDiagnostics.selectedOrganizationId = selected.id;\n  apolloDiagnostics.lastAcceptanceMethodUsed = savedContacts.length\n    ? 'Apollo People + Saved Contacts'\n    : constrainedSearch ? 'Apollo Organization/Domain People Search' : 'Apollo Keyword People Search';\n  return result;\n}\n`;
  source = source.slice(0, functionStart) + newFunction;
  fs.writeFileSync(file, source);
}

// 3) Remove residual fabricated contact-card fallback values and misleading verification label.
{
  const file = 'src/pages/Intelligence.tsx';
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace('VERIFIED APOLLO CONTACT', 'APOLLO PERSON MATCH');
  source = source.replace('selectedCo?.name || c.organizationName || c.companyName || "Verraki (A Member of Andersen Consulting)"', 'selectedCo?.name || c.organizationName || c.companyName || "Information Not Found"');
  source = source.replace('c.department || "Executive Management"', 'c.department || "Information Not Found"');
  source = source.replace('(c as any).location || "Lagos, Nigeria"', '(c as any).location || "Information Not Found"');
  source = source.replace('Apollo returned zero matching contacts for this organization.', 'Apollo returned no people or saved contacts for this organization.');
  source = source.replace('Try adjusting the Division filter above or typing a different keyword to locate exact department decision makers.', 'SPIP checks Apollo People Search and your team\'s saved Apollo Contacts. Try another organization match if this company has no indexed people.');
  fs.writeFileSync(file, source);
}

console.log('Applied Phase 3 signup and Apollo contact reliability fixes.');
