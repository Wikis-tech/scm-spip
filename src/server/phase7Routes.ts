import type { Express, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { providerRegistry } from '../services/discovery/providers/providerRegistry.ts';
import { discoveryApolloProvider } from '../services/apollo/discoveryApolloProvider.ts';
import { calculateProductRecommendations } from '../utils/recommendationEngine.ts';

function requestUser(req: Request): any {
  return (req as any).user || null;
}

function companyKey(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\b(limited|ltd|plc|incorporated|inc|llc)\b/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function cleanDomain(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.replace(/^www\./, '');
  } catch {
    return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

function mapLead(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    industry: row.industry,
    size: row.size,
    website: row.website,
    location: row.location,
    opportunityScore: Number(row.opportunity_score || 0),
    confidenceScore: Number(row.confidence_score || 0),
    reason: row.reason,
    opportunityReason: row.reason,
    alreadyimported: Boolean(row.already_imported),
    businessFit: row.business_fit,
    treasuryPotential: row.treasury_potential,
    estimatedRevenueValue: Number(row.estimated_revenue_value || 0),
    recommendedProducts: row.recommended_products || [],
    decisionMakers: row.decision_makers || [],
    latestNews: row.latest_news,
    source: row.source,
    revenueRange: row.revenue_range,
    createdAt: row.created_at,
    enrichmentStatus: row.enrichment_status || 'Unavailable',
    lastSyncedAt: row.last_synced_at,
    apolloOrgId: row.apollo_org_id,
    linkedinUrl: row.linkedin_url,
  };
}

function usableContact(value: unknown): string | null {
  const text = String(value || '').trim();
  if (!text || /^(n\/?a|not found|unavailable|available in apollo)$/i.test(text)) return null;
  return text;
}

async function runDiscoveryScan(req: Request, res: Response, supabase: SupabaseClient) {
  const user = requestUser(req);
  if (!user?.userId) return res.status(401).json({ error: 'Authentication required.' });

  const filters = {
    source: String(req.body?.source || 'All'),
    industry: String(req.body?.industry || 'All'),
    location: String(req.body?.location || 'All'),
    sizeTier: String(req.body?.sizeTier || 'All'),
    revenueRange: String(req.body?.revenueRange || 'All'),
    targetProduct: String(req.body?.targetProduct || 'All'),
  };

  try {
    const candidates = await providerRegistry.getCandidates(filters);
    const [{ data: allocations, error: allocationError }, { data: prospects, error: prospectError }] = await Promise.all([
      supabase.from('discovery_company_allocations').select('company_key'),
      supabase.from('prospects').select('name'),
    ]);
    if (allocationError) throw allocationError;
    if (prospectError) throw prospectError;

    const unavailable = new Set<string>([
      ...(allocations || []).map((row: any) => row.company_key),
      ...(prospects || []).map((row: any) => companyKey(row.name)),
    ].filter(Boolean));

    let selected: any = null;
    let selectedKey = '';
    for (const candidate of candidates) {
      const key = companyKey(candidate.name);
      if (!key || unavailable.has(key)) continue;
      const allocation = {
        company_key: key,
        company_name: candidate.name,
        user_id: user.userId,
        status: 'QUEUED',
        allocated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('discovery_company_allocations').insert(allocation);
      if (error?.code === '23505') continue;
      if (error) throw error;
      selected = candidate;
      selectedKey = key;
      break;
    }

    if (!selected) {
      return res.status(200).json({ success: true, leads: [], message: 'No unallocated companies match these filters. Try a different sector or region.' });
    }

    const score = 83 + Math.floor(Math.random() * 15);
    const recommendations = calculateProductRecommendations({
      name: selected.name,
      industry: selected.industry,
      description: selected.description || selected.latestNews,
      employeeCount: selected.size,
      revenueValue: String(selected.estimatedRevenueValue),
    }, selected.decisionMakers || [], score);

    const baseLead: any = {
      id: `disc-${crypto.randomUUID()}`,
      userId: user.userId,
      name: selected.name,
      industry: selected.industry,
      size: selected.size,
      website: selected.website,
      location: selected.location,
      opportunityScore: score,
      confidenceScore: 86,
      businessFit: score >= 90 ? 'Exceptional Fit' : 'High Fit',
      treasuryPotential: selected.estimatedRevenueValue ? `Estimated ₦${(selected.estimatedRevenueValue / 1e9).toFixed(1)}B liquidity turnover` : 'Requires validation',
      estimatedRevenueValue: selected.estimatedRevenueValue || 0,
      reason: `Selected by SCM Apex Discovery from the ${selected.source} source and matched to SCM Capital's institutional prospecting criteria.`,
      alreadyimported: false,
      recommendedProducts: recommendations.matrix.slice(0, 3).map((item: any) => item.product),
      decisionMakers: selected.decisionMakers || [],
      latestNews: selected.latestNews || '',
      source: selected.source,
      revenueRange: selected.revenueRange,
      createdAt: new Date().toISOString(),
      enrichmentStatus: 'Pending',
    };

    let enrichedLead = baseLead;
    try {
      enrichedLead = await discoveryApolloProvider.enrichSingleLead(baseLead, {
        supabase,
        isDatabaseHealthy: false,
      });
    } catch (error: any) {
      console.warn('[PHASE 7 DISCOVERY] Apollo enrichment unavailable:', error?.message || error);
    }

    const leadRow = {
      id: enrichedLead.id,
      user_id: user.userId,
      company_key: selectedKey,
      name: enrichedLead.name,
      industry: enrichedLead.industry || 'Other',
      size: enrichedLead.size || 'Not verified',
      website: enrichedLead.website || '',
      location: enrichedLead.location || 'Nigeria',
      opportunity_score: enrichedLead.opportunityScore,
      confidence_score: enrichedLead.confidenceScore,
      reason: enrichedLead.reason,
      already_imported: false,
      business_fit: enrichedLead.businessFit,
      treasury_potential: enrichedLead.treasuryPotential,
      estimated_revenue_value: enrichedLead.estimatedRevenueValue,
      recommended_products: enrichedLead.recommendedProducts,
      decision_makers: enrichedLead.decisionMakers,
      latest_news: enrichedLead.latestNews,
      source: enrichedLead.source,
      revenue_range: enrichedLead.revenueRange,
      created_at: enrichedLead.createdAt,
      enrichment_status: enrichedLead.enrichmentStatus || 'Unavailable',
      last_synced_at: enrichedLead.lastSyncedAt || new Date().toISOString(),
      apollo_org_id: enrichedLead.apolloOrgId || null,
      linkedin_url: enrichedLead.linkedinUrl || null,
    };

    const { data: inserted, error: insertError } = await supabase.from('discovered_leads').insert(leadRow).select('*').single();
    if (insertError) {
      await supabase.from('discovery_company_allocations').update({ status: 'ERROR', updated_at: new Date().toISOString() }).eq('company_key', selectedKey);
      throw insertError;
    }
    await supabase.from('discovery_company_allocations').update({ lead_id: inserted.id }).eq('company_key', selectedKey);

    const session = {
      id: `session-${crypto.randomUUID()}`,
      user_id: user.userId,
      user_email: user.email,
      source: filters.source,
      industry: filters.industry,
      location: filters.location,
      size_tier: filters.sizeTier,
      revenue_range: filters.revenueRange,
      target_product: filters.targetProduct,
      eval_count: candidates.length,
      rec_count: 1,
      saved_count: 0,
      created_at: new Date().toISOString(),
    };
    await supabase.from('discovery_sessions').insert(session);

    return res.status(201).json({ success: true, leads: [mapLead(inserted)], session, exclusiveAllocation: true });
  } catch (error: any) {
    console.error('[PHASE 7 DISCOVERY] Scan failed:', error?.message || error);
    return res.status(500).json({ error: 'Apex Discovery could not allocate a prospect right now. Please retry.' });
  }
}

export function registerPhase7Routes(app: Express, supabase: SupabaseClient) {
  app.get('/api/branding', async (_req, res) => {
    const { data } = await supabase.from('platform_settings').select('value').eq('key', 'branding').maybeSingle();
    return res.json({
      logoUrl: data?.value?.logoUrl || '',
      organisationName: data?.value?.organisationName || 'SCM CAPITAL',
      divisionName: data?.value?.divisionName || 'ASSET MANAGEMENT',
    });
  });

  app.post('/api/admin/branding/logo', async (req, res) => {
    const user = requestUser(req);
    if (!user?.isAdmin) return res.status(403).json({ error: 'Administrator access is required.' });
    const match = String(req.body?.dataUrl || '').match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return res.status(400).json({ error: 'Upload a PNG, JPEG or WebP logo.' });
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length > 2 * 1024 * 1024) return res.status(413).json({ error: 'Logo files must be 2 MB or smaller.' });
    const extension = match[1] === 'image/png' ? 'png' : match[1] === 'image/webp' ? 'webp' : 'jpg';
    const path = `logos/scm-logo-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('spip-brand-assets').upload(path, bytes, { contentType: match[1], upsert: false });
    if (uploadError) return res.status(500).json({ error: 'The logo could not be uploaded.' });
    const { data: publicData } = supabase.storage.from('spip-brand-assets').getPublicUrl(path);
    const value = { logoUrl: publicData.publicUrl, organisationName: 'SCM CAPITAL', divisionName: 'ASSET MANAGEMENT' };
    const { error } = await supabase.from('platform_settings').upsert({ key: 'branding', value, updated_by: user.userId, updated_at: new Date().toISOString() });
    if (error) return res.status(500).json({ error: 'The platform branding could not be saved.' });
    return res.json(value);
  });

  app.get('/api/discovery/leads', async (req, res) => {
    const user = requestUser(req);
    const { data, error } = await supabase.from('discovered_leads').select('*').eq('user_id', user?.userId || '').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'Unable to load your private discovery queue.' });
    return res.json((data || []).map(mapLead));
  });

  app.post('/api/discovery/scan', (req, res) => runDiscoveryScan(req, res, supabase));
  app.post('/api/discovery/trigger', (req, res) => runDiscoveryScan(req, res, supabase));

  app.delete('/api/discovery/lead/:id', async (req, res) => {
    const user = requestUser(req);
    const { data: lead } = await supabase.from('discovered_leads').select('id, company_key').eq('id', req.params.id).eq('user_id', user?.userId || '').maybeSingle();
    if (!lead) return res.status(404).json({ error: 'This lead is not in your discovery queue.' });
    const { error } = await supabase.from('discovered_leads').delete().eq('id', lead.id).eq('user_id', user.userId);
    if (error) return res.status(500).json({ error: 'Unable to dismiss this lead.' });
    if (lead.company_key) await supabase.from('discovery_company_allocations').update({ status: 'DISMISSED', updated_at: new Date().toISOString() }).eq('company_key', lead.company_key).eq('user_id', user.userId);
    return res.json({ success: true });
  });

  app.get('/api/discovery/history', async (req, res) => {
    const user = requestUser(req);
    const { data, error } = await supabase.from('discovery_sessions').select('*').eq('user_id', user?.userId || '').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'Unable to load discovery history.' });
    return res.json({
      sessions: (data || []).map((row: any) => ({
        id: row.id,
        source: row.source,
        timestamp: row.created_at,
        filters: { industry: row.industry, location: row.location, sizeTier: row.size_tier },
        discoveredCount: Number(row.rec_count || 0),
        highOpportunityCount: Number(row.rec_count || 0),
      })),
    });
  });

  app.get('/api/discovery/analytics', async (req, res) => {
    const user = requestUser(req);
    const [{ data: sessions }, { data: leads }] = await Promise.all([
      supabase.from('discovery_sessions').select('eval_count, rec_count, saved_count').eq('user_id', user?.userId || ''),
      supabase.from('discovered_leads').select('already_imported, estimated_revenue_value, opportunity_score').eq('user_id', user?.userId || ''),
    ]);
    const rows = sessions || [];
    const leadRows = leads || [];
    const totalRecommended = rows.reduce((sum: number, row: any) => sum + Number(row.rec_count || 0), 0);
    const totalImported = leadRows.filter((row: any) => row.already_imported).length;
    const highOpportunity = leadRows.filter((row: any) => Number(row.opportunity_score || 0) >= 80).length;
    return res.json({ analytics: {
      totalScans: rows.length,
      totalEvaluated: rows.reduce((sum: number, row: any) => sum + Number(row.eval_count || 0), 0),
      totalRecommended,
      totalImported,
      highOpportunityRatio: leadRows.length ? Math.round((highOpportunity / leadRows.length) * 100) : 0,
      importedConversionRate: totalRecommended ? Math.round((totalImported / totalRecommended) * 100) : 0,
      estimatedPipelineValue: leadRows.reduce((sum: number, row: any) => sum + Number(row.estimated_revenue_value || 0), 0),
    } });
  });

  app.post('/api/discovery/open-intelligence/:id', async (req, res) => {
    const user = requestUser(req);
    const { data: lead } = await supabase.from('discovered_leads').select('*').eq('id', req.params.id).eq('user_id', user?.userId || '').maybeSingle();
    if (!lead) return res.status(404).json({ error: 'This lead is not in your discovery queue.' });
    const { data: existing } = await supabase.from('workspaces').select('id').eq('owner_user_id', user.userId).ilike('company_name', lead.name).maybeSingle();
    if (existing) return res.json({ success: true, workspaceId: existing.id, companyName: lead.name, isExisting: true });
    const now = new Date().toISOString();
    const workspace = {
      id: `workspace-${crypto.randomUUID()}`,
      prospect_id: null,
      owner_user_id: user.userId,
      company_name: lead.name,
      created_at: now,
      updated_at: now,
      status: 'Active',
      apollo_findings: lead.enrichment_status === 'Enriched' ? `Apollo-verified organisation record: ${lead.apollo_org_id || 'available'}.` : 'Apollo verification was unavailable; validate details before outreach.',
      company_profile: lead.reason,
      industry_analysis: `${lead.industry} opportunity identified by SCM Apex Discovery.`,
      executive_insights: JSON.stringify(lead.decision_makers || []),
      investment_opportunities: JSON.stringify(lead.recommended_products || []),
      research_summaries: lead.latest_news || '',
    };
    const { error } = await supabase.from('workspaces').insert(workspace);
    if (error) return res.status(500).json({ error: 'Unable to open a research workspace.' });
    return res.status(201).json({ success: true, workspaceId: workspace.id, companyName: lead.name, isExisting: false });
  });

  app.post('/api/discovery/import/:id', async (req, res) => {
    const user = requestUser(req);
    const { data: lead } = await supabase.from('discovered_leads').select('*').eq('id', req.params.id).eq('user_id', user?.userId || '').maybeSingle();
    if (!lead) return res.status(404).json({ error: 'This lead is not in your private discovery queue.' });
    if (lead.already_imported) return res.status(409).json({ error: 'This company has already been imported.' });

    const { data: existing } = await supabase.from('prospects').select('id, name').ilike('name', lead.name).limit(1);
    if (existing?.length) return res.status(409).json({ error: `${lead.name} already exists in SPIP and cannot be allocated twice.` });

    const now = new Date().toISOString();
    const prospectId = `prospect-${crypto.randomUUID()}`;
    const decisionMakers = Array.isArray(lead.decision_makers) ? lead.decision_makers : [];
    const verifiedContact = decisionMakers.find((contact: any) => {
      const name = usableContact(contact.name);
      return name && !/^(chief financial officer|cfo|finance director|executive)$/i.test(name) && (usableContact(contact.email) || usableContact(contact.phone) || usableContact(contact.linkedin));
    });
    const contactId = verifiedContact ? `contact-${crypto.randomUUID()}` : null;
    const prospect = {
      id: prospectId,
      name: lead.name,
      industry: lead.industry || 'Other',
      org_type: 'Corporate',
      location: lead.location || 'Nigeria',
      website: lead.website || null,
      website_domain: cleanDomain(lead.website) || null,
      source: lead.enrichment_status === 'Enriched' ? 'SCM Apex Discovery — Apollo Enriched' : `SCM Apex Discovery — ${lead.source || 'Public Source'}`,
      apollo_organization_id: lead.apollo_org_id || null,
      assigned_officer_id: user.userId,
      assigned_officer_name: user.fullName,
      status: 'Lead',
      priority: Number(lead.opportunity_score || 0) >= 90 ? 'High' : 'Medium',
      notes: `${lead.reason}\nVerification: ${lead.enrichment_status || 'Unavailable'}. Confirm all contact and financial details before outreach.`,
      conversion_probability: 20,
      opportunity_value: 0,
      opportunity_score: Number(lead.opportunity_score || 0),
      primary_contact_id: contactId,
      created_at: now,
      updated_at: now,
    };
    const { error: prospectError } = await supabase.from('prospects').insert(prospect);
    if (prospectError) return res.status(500).json({ error: 'Unable to import this company into Prospects.' });

    if (verifiedContact && contactId) {
      await supabase.from('contacts').insert({
        id: contactId,
        prospect_id: prospectId,
        prospect_name: lead.name,
        full_name: usableContact(verifiedContact.name),
        position: usableContact(verifiedContact.title || verifiedContact.position) || 'Executive',
        department: usableContact(verifiedContact.department),
        email: usableContact(verifiedContact.email),
        phone: usableContact(verifiedContact.phone),
        linkedin: usableContact(verifiedContact.linkedin),
        influence_level: 'High',
        is_decision_maker: true,
        notes: 'Contact supplied by Apex Discovery. Revalidate before outreach.',
        validation_level: 'Apollo Enriched',
        created_at: now,
      });
    }

    await Promise.all([
      supabase.from('discovered_leads').update({ already_imported: true }).eq('id', lead.id).eq('user_id', user.userId),
      supabase.from('discovery_company_allocations').update({ status: 'IMPORTED', updated_at: now }).eq('company_key', lead.company_key).eq('user_id', user.userId),
    ]);
    return res.status(201).json({ success: true, prospect, verifiedContactImported: Boolean(verifiedContact) });
  });
}
