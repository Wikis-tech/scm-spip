import type { Express, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function requestUser(req: Request): any {
  return (req as any).user || null;
}

function normalizeName(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\b(limited|ltd|plc|incorporated|inc|llc)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDomain(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  try {
    const url = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return raw
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .trim();
  }
}

function emailDomain(value: unknown): string {
  const email = String(value || '').trim().toLowerCase();
  return email.includes('@') ? email.split('@').pop() || '' : '';
}

function canManageProspect(user: any, prospect: any): boolean {
  if (!user?.userId) return false;
  if (user.isAdmin) return true;
  return String(prospect?.assigned_officer_id || '') === String(user.userId);
}

async function findDuplicate(supabase: SupabaseClient, input: any, excludeId?: string) {
  const { data, error } = await supabase
    .from('prospects')
    .select('id, name, website, website_domain, email, apollo_organization_id, assigned_officer_id, assigned_officer_name, status')
    .limit(2000);

  if (error) throw error;

  const wantedName = normalizeName(input?.name);
  const wantedDomain = normalizeDomain(input?.website || input?.websiteDomain);
  const wantedEmailDomain = emailDomain(input?.email);
  const wantedApolloId = String(input?.apolloOrganizationId || '').trim();

  return (data || []).find((row: any) => {
    if (excludeId && row.id === excludeId) return false;
    const rowName = normalizeName(row.name);
    const rowDomain = normalizeDomain(row.website_domain || row.website);
    const rowEmailDomain = emailDomain(row.email);
    if (wantedApolloId && row.apollo_organization_id && wantedApolloId === String(row.apollo_organization_id)) return true;
    if (wantedDomain && rowDomain && wantedDomain === rowDomain) return true;
    if (wantedEmailDomain && rowEmailDomain && wantedEmailDomain === rowEmailDomain) return true;
    return Boolean(wantedName && rowName && wantedName === rowName);
  }) || null;
}

export function registerPhase3Routes(app: Express, supabase: SupabaseClient) {
  app.get('/api/crm/prospects', async (req, res) => {
    const user = requestUser(req);
    let query = supabase.from('prospects').select('*').order('updated_at', { ascending: false });
    if (!user?.isAdmin) query = query.eq('assigned_officer_id', user?.userId || '');
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: 'Unable to load CRM prospects.' });
    return res.json(data || []);
  });

  app.post('/api/crm/prospects/check-duplicate', async (req, res) => {
    try {
      const duplicate = await findDuplicate(supabase, req.body || {}, req.body?.excludeId);
      return res.json({ duplicate: Boolean(duplicate), match: duplicate });
    } catch (error: any) {
      console.error('[PHASE 3] Duplicate check failed:', error?.message || error);
      return res.status(500).json({ error: 'Unable to complete duplicate validation.' });
    }
  });

  app.post('/api/crm/prospects', async (req, res) => {
    const user = requestUser(req);
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Prospect/company name is required.' });

    try {
      const duplicate = await findDuplicate(supabase, req.body || {});
      if (duplicate) {
        return res.status(409).json({
          error: `${duplicate.name} already exists in SPIP.`,
          duplicate,
          action: user?.isAdmin ? 'VIEW_OR_REASSIGN' : 'REQUEST_COLLABORATION',
        });
      }

      const website = String(req.body?.website || '').trim() || null;
      const now = new Date().toISOString();
      const payload = {
        id: String(req.body?.id || `prospect-${crypto.randomUUID()}`),
        name,
        industry: String(req.body?.industry || 'Other').trim(),
        org_type: String(req.body?.orgType || req.body?.org_type || 'Corporate').trim(),
        location: String(req.body?.location || 'Nigeria').trim(),
        website,
        website_domain: normalizeDomain(website) || null,
        phone: String(req.body?.phone || '').trim() || null,
        email: String(req.body?.email || '').trim().toLowerCase() || null,
        source: String(req.body?.source || 'Manual').trim(),
        apollo_organization_id: String(req.body?.apolloOrganizationId || '').trim() || null,
        assigned_officer_id: user?.userId,
        assigned_officer_name: user?.fullName || user?.email?.split('@')[0] || 'SCM Officer',
        status: String(req.body?.status || 'Lead'),
        priority: String(req.body?.priority || 'Medium'),
        notes: String(req.body?.notes || '').trim() || null,
        conversion_probability: Number(req.body?.conversionProbability ?? 20),
        opportunity_value: Number(req.body?.opportunityValue ?? 0),
        opportunity_score: Number(req.body?.opportunityScore ?? 50),
        product_interests: Array.isArray(req.body?.productInterests) ? req.body.productInterests : [],
        campaign_id: String(req.body?.campaignId || '').trim() || null,
        relationship_health: 'New',
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase.from('prospects').insert(payload).select('*').single();
      if (error) throw error;
      return res.status(201).json(data);
    } catch (error: any) {
      console.error('[PHASE 3] Prospect creation failed:', error?.message || error);
      return res.status(500).json({ error: 'Unable to create the prospect.' });
    }
  });

  app.get('/api/crm/prospects/:id/360', async (req, res) => {
    const user = requestUser(req);
    const prospectId = String(req.params.id || '').trim();
    const { data: prospect, error: prospectError } = await supabase.from('prospects').select('*').eq('id', prospectId).single();
    if (prospectError || !prospect) return res.status(404).json({ error: 'Prospect not found.' });
    if (!canManageProspect(user, prospect)) return res.status(403).json({ error: 'You do not have access to this relationship.' });

    const safeRows = async (table: string, column = 'prospect_id') => {
      const { data, error } = await supabase.from(table).select('*').eq(column, prospectId);
      if (error) return [];
      return data || [];
    };

    const [contacts, activities, meetings, tasks, conversions, collaborators] = await Promise.all([
      safeRows('contacts'),
      safeRows('activities'),
      safeRows('meetings'),
      safeRows('tasks'),
      safeRows('client_conversions'),
      safeRows('prospect_collaborators'),
    ]);

    let campaign: any = null;
    if (prospect.campaign_id) {
      const { data } = await supabase.from('campaigns').select('*').eq('id', prospect.campaign_id).maybeSingle();
      campaign = data || null;
    }

    const timeline = [
      ...activities.map((row: any) => ({ type: 'activity', timestamp: row.created_at || `${row.date || ''}T${row.time || '00:00'}`, data: row })),
      ...meetings.map((row: any) => ({ type: 'meeting', timestamp: row.created_at || row.date, data: row })),
      ...tasks.map((row: any) => ({ type: 'task', timestamp: row.due_date || row.created_at || '', data: row })),
      ...conversions.map((row: any) => ({ type: 'conversion', timestamp: row.created_at || row.conversion_date, data: row })),
    ].sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));

    return res.json({ prospect, contacts, activities, meetings, tasks, conversions, collaborators, campaign, timeline });
  });

  app.patch('/api/crm/prospects/:id', async (req, res) => {
    const user = requestUser(req);
    const prospectId = String(req.params.id || '').trim();
    const { data: prospect } = await supabase.from('prospects').select('*').eq('id', prospectId).maybeSingle();
    if (!prospect) return res.status(404).json({ error: 'Prospect not found.' });
    if (!canManageProspect(user, prospect)) return res.status(403).json({ error: 'You do not have permission to update this prospect.' });

    const allowed: Record<string, string> = {
      status: 'status', priority: 'priority', notes: 'notes', nextAction: 'next_action',
      opportunityValue: 'opportunity_value', conversionProbability: 'conversion_probability',
      opportunityScore: 'opportunity_score', productInterests: 'product_interests', campaignId: 'campaign_id',
      relationshipHealth: 'relationship_health', currentAum: 'current_aum',
    };
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    Object.entries(allowed).forEach(([inputKey, dbKey]) => {
      if (req.body?.[inputKey] !== undefined) patch[dbKey] = req.body[inputKey];
    });

    const { data, error } = await supabase.from('prospects').update(patch).eq('id', prospectId).select('*').single();
    if (error) return res.status(500).json({ error: 'Unable to update the prospect.' });
    return res.json(data);
  });

  app.post('/api/crm/prospects/:id/convert', async (req, res) => {
    const user = requestUser(req);
    const prospectId = String(req.params.id || '').trim();
    const product = String(req.body?.product || '').trim();
    const amount = Number(req.body?.initialInvestment || 0);
    const currentAum = Number(req.body?.currentAum ?? amount);
    if (!product || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Product and a positive initial investment are required.' });
    }

    const { data: prospect } = await supabase.from('prospects').select('*').eq('id', prospectId).maybeSingle();
    if (!prospect) return res.status(404).json({ error: 'Prospect not found.' });
    if (!canManageProspect(user, prospect)) return res.status(403).json({ error: 'You do not have permission to convert this prospect.' });

    const conversionDate = String(req.body?.conversionDate || new Date().toISOString().slice(0, 10));
    const conversion = {
      id: `conversion-${crypto.randomUUID()}`,
      prospect_id: prospectId,
      officer_id: prospect.assigned_officer_id || user.userId,
      product,
      initial_investment: amount,
      current_aum: currentAum,
      conversion_date: conversionDate,
      notes: String(req.body?.notes || '').trim() || null,
    };

    const { error: conversionError } = await supabase.from('client_conversions').insert(conversion);
    if (conversionError) return res.status(500).json({ error: 'Unable to record the client conversion.' });

    const { data, error } = await supabase.from('prospects').update({
      status: 'Converted',
      actual_revenue: amount,
      converted_at: new Date(`${conversionDate}T00:00:00Z`).toISOString(),
      converted_product: product,
      initial_investment: amount,
      current_aum: currentAum,
      conversion_probability: 100,
      relationship_health: 'Client',
      updated_at: new Date().toISOString(),
    }).eq('id', prospectId).select('*').single();

    if (error) return res.status(500).json({ error: 'Conversion was recorded but the prospect status could not be updated.' });
    return res.status(201).json({ prospect: data, conversion });
  });

  app.get('/api/crm/campaigns', async (_req, res) => {
    const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'Unable to load campaigns.' });
    return res.json(data || []);
  });

  app.post('/api/crm/campaigns', async (req, res) => {
    const user = requestUser(req);
    if (!user?.isAdmin) return res.status(403).json({ error: 'Administrator privileges required to create campaigns.' });
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Campaign name is required.' });
    const payload = {
      id: `campaign-${crypto.randomUUID()}`,
      name,
      description: String(req.body?.description || '').trim() || null,
      source_type: String(req.body?.sourceType || '').trim() || null,
      status: String(req.body?.status || 'Active'),
      start_date: req.body?.startDate || null,
      end_date: req.body?.endDate || null,
      owner_user_id: req.body?.ownerUserId || user.userId,
      created_by: user.userId,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('campaigns').insert(payload).select('*').single();
    if (error) return res.status(500).json({ error: 'Unable to create campaign.' });
    return res.status(201).json(data);
  });
}
