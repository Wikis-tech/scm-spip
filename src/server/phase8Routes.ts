import type { Express, Request } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

const WON = new Set(['won', 'converted', 'client']);
const LOST = new Set(['lost', 'archived']);
const STAGES = ['Lead', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

const userOf = (req: Request): any => (req as any).user || null;
const n = (value: unknown) => Number(value || 0);
const day = (value: unknown) => String(value || '').slice(0, 10);
const stageOf = (value: unknown) => {
  const raw = String(value || 'Lead').trim();
  const key = raw.toLowerCase();
  if (WON.has(key)) return 'Won';
  if (LOST.has(key)) return 'Lost';
  return STAGES.find((stage) => stage.toLowerCase() === key) || raw;
};

function rangeStart(range: string): string {
  if (range === 'all') return '2000-01-01';
  const days = ['30', '90', '180', '365'].includes(range) ? Number(range) : 90;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start.toISOString().slice(0, 10);
}

function monthKeys(startDate: string, endDate: string) {
  const cursor = new Date(`${startDate.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${endDate.slice(0, 7)}-01T00:00:00Z`);
  const keys: string[] = [];
  while (cursor <= end && keys.length < 36) {
    keys.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

export function registerPhase8Routes(app: Express, supabase: SupabaseClient) {
  app.get('/api/analytics/overview', async (req, res) => {
    const user = userOf(req);
    if (!user?.userId) return res.status(401).json({ error: 'Authentication required.' });

    res.setHeader('Cache-Control', 'private, no-store');
    const requestedRange = String(req.query.range || '90');
    const range = ['30', '90', '180', '365', 'all'].includes(requestedRange) ? requestedRange : '90';
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = rangeStart(range);
    const requestedOfficer = user.isAdmin ? String(req.query.officer || '') : user.userId;
    const officerId = requestedOfficer && requestedOfficer !== 'all' ? requestedOfficer : '';

    try {
      let prospectsQuery = supabase.from('prospects').select('id,name,industry,location,status,priority,assigned_officer_id,assigned_officer_name,opportunity_value,conversion_probability,opportunity_score,product_interests,created_at,updated_at,last_activity_date,next_action,current_aum,initial_investment,converted_at');
      let activitiesQuery = supabase.from('activities').select('id,officer_id,date,status,activity_type');
      let meetingsQuery = supabase.from('meetings').select('id,officer_id,date,purpose,outcome');
      let tasksQuery = supabase.from('tasks').select('id,officer_id,prospect_id,prospect_name,title,due_date,priority,is_completed');
      let conversionsQuery = supabase.from('client_conversions').select('id,prospect_id,officer_id,product,initial_investment,current_aum,conversion_date');

      if (officerId) {
        prospectsQuery = prospectsQuery.eq('assigned_officer_id', officerId);
        activitiesQuery = activitiesQuery.eq('officer_id', officerId);
        meetingsQuery = meetingsQuery.eq('officer_id', officerId);
        tasksQuery = tasksQuery.eq('officer_id', officerId);
        conversionsQuery = conversionsQuery.eq('officer_id', officerId);
      }

      const [prospectsResult, activitiesResult, meetingsResult, tasksResult, conversionsResult, profilesResult] = await Promise.all([
        prospectsQuery,
        activitiesQuery,
        meetingsQuery,
        tasksQuery,
        conversionsQuery,
        user.isAdmin
          ? supabase.from('profiles').select('id,full_name,email').eq('status', 'ACTIVE').order('full_name')
          : Promise.resolve({ data: [], error: null }),
      ]);

      const firstError = [prospectsResult.error, activitiesResult.error, meetingsResult.error, tasksResult.error, conversionsResult.error, profilesResult.error].find(Boolean);
      if (firstError) throw firstError;

      const prospects = prospectsResult.data || [];
      const activities = activitiesResult.data || [];
      const meetings = meetingsResult.data || [];
      const tasks = tasksResult.data || [];
      const conversions = conversionsResult.data || [];
      const latestConversionByProspect = new Map<string, any>();
      conversions.forEach((row: any) => {
        const key = String(row.prospect_id || row.id);
        const previous = latestConversionByProspect.get(key);
        if (!previous || day(row.conversion_date) >= day(previous.conversion_date)) latestConversionByProspect.set(key, row);
      });
      const currentConversions = Array.from(latestConversionByProspect.values());
      const inRange = (value: unknown) => day(value) >= startDate && day(value) <= endDate;
      const periodProspects = prospects.filter((row: any) => inRange(row.created_at));
      const periodActivities = activities.filter((row: any) => inRange(row.date));
      const periodMeetings = meetings.filter((row: any) => inRange(row.date));
      const periodConversions = conversions.filter((row: any) => inRange(row.conversion_date));
      const periodTasks = tasks.filter((row: any) => inRange(row.due_date));
      const openProspects = prospects.filter((row: any) => !WON.has(String(row.status).toLowerCase()) && !LOST.has(String(row.status).toLowerCase()));
      const wonProspects = prospects.filter((row: any) => WON.has(String(row.status).toLowerCase()));
      const pipelineValue = openProspects.reduce((sum: number, row: any) => sum + n(row.opportunity_value), 0);
      const weightedPipeline = openProspects.reduce((sum: number, row: any) => sum + n(row.opportunity_value) * Math.min(100, Math.max(0, n(row.conversion_probability))) / 100, 0);
      const currentAum = currentConversions.reduce((sum: number, row: any) => sum + n(row.current_aum), 0) || wonProspects.reduce((sum: number, row: any) => sum + n(row.current_aum || row.initial_investment), 0);
      const overdueTasks = tasks.filter((row: any) => !row.is_completed && day(row.due_date) && day(row.due_date) < endDate);
      const completedPeriodTasks = periodTasks.filter((row: any) => row.is_completed);
      const staleProspects = openProspects.filter((row: any) => {
        const last = day(row.last_activity_date || row.updated_at || row.created_at);
        if (!last) return true;
        return Math.floor((Date.now() - new Date(`${last}T00:00:00Z`).getTime()) / 86_400_000) >= 14;
      });

      const stageMap = new Map<string, { stage: string; count: number; value: number; weightedValue: number }>();
      STAGES.forEach((stage) => stageMap.set(stage, { stage, count: 0, value: 0, weightedValue: 0 }));
      prospects.forEach((row: any) => {
        const stage = stageOf(row.status);
        const current = stageMap.get(stage) || { stage, count: 0, value: 0, weightedValue: 0 };
        current.count += 1;
        current.value += n(row.opportunity_value);
        current.weightedValue += n(row.opportunity_value) * Math.min(100, Math.max(0, n(row.conversion_probability))) / 100;
        stageMap.set(stage, current);
      });

      const industryMap = new Map<string, { name: string; count: number; value: number }>();
      prospects.forEach((row: any) => {
        const name = String(row.industry || 'Unspecified');
        const current = industryMap.get(name) || { name, count: 0, value: 0 };
        current.count += 1; current.value += n(row.opportunity_value); industryMap.set(name, current);
      });

      const productMap = new Map<string, { name: string; count: number; aum: number }>();
      currentConversions.forEach((row: any) => {
        const name = String(row.product || 'Unspecified');
        const current = productMap.get(name) || { name, count: 0, aum: 0 };
        current.count += 1; current.aum += n(row.current_aum); productMap.set(name, current);
      });

      const trendStartDate = range === 'all'
        ? (() => { const date = new Date(); date.setUTCMonth(date.getUTCMonth() - 35); return date.toISOString().slice(0, 10); })()
        : startDate;
      const trend = monthKeys(trendStartDate, endDate).map((key) => {
        const created = periodProspects.filter((row: any) => day(row.created_at).startsWith(key));
        const converted = periodConversions.filter((row: any) => day(row.conversion_date).startsWith(key));
        return {
          month: key,
          label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-NG', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
          newProspects: created.length,
          pipelineAdded: created.reduce((sum: number, row: any) => sum + n(row.opportunity_value), 0),
          conversions: converted.length,
          aumAdded: converted.reduce((sum: number, row: any) => sum + n(row.current_aum), 0),
          activities: periodActivities.filter((row: any) => day(row.date).startsWith(key)).length,
          meetings: periodMeetings.filter((row: any) => day(row.date).startsWith(key)).length,
        };
      });

      const officerMap = new Map<string, any>();
      if (user.isAdmin && !officerId) {
        (profilesResult.data || []).forEach((profile: any) => officerMap.set(profile.id, { userId: profile.id, name: profile.full_name, prospects: 0, pipelineValue: 0, weightedPipeline: 0, conversions: 0, currentAum: 0, activities: 0, meetings: 0, overdueTasks: 0 }));
        prospects.forEach((row: any) => {
          const id = row.assigned_officer_id; if (!id) return;
          const current = officerMap.get(id) || { userId: id, name: row.assigned_officer_name || 'Unassigned', prospects: 0, pipelineValue: 0, weightedPipeline: 0, conversions: 0, currentAum: 0, activities: 0, meetings: 0, overdueTasks: 0 };
          current.prospects += 1; current.pipelineValue += n(row.opportunity_value); current.weightedPipeline += n(row.opportunity_value) * n(row.conversion_probability) / 100; officerMap.set(id, current);
        });
        currentConversions.forEach((row: any) => { const current = officerMap.get(row.officer_id); if (current) { current.conversions += 1; current.currentAum += n(row.current_aum); } });
        periodActivities.forEach((row: any) => { const current = officerMap.get(row.officer_id); if (current) current.activities += 1; });
        periodMeetings.forEach((row: any) => { const current = officerMap.get(row.officer_id); if (current) current.meetings += 1; });
        overdueTasks.forEach((row: any) => { const current = officerMap.get(row.officer_id); if (current) current.overdueTasks += 1; });
      }

      return res.json({
        meta: { generatedAt: new Date().toISOString(), startDate, endDate, range, scope: user.isAdmin && !officerId ? 'team' : 'personal', officerId: officerId || null },
        definitions: {
          pipelineValue: 'Sum of opportunity value for open prospects.',
          weightedPipeline: 'Open opportunity value multiplied by each recorded conversion probability.',
          conversionRate: 'Converted or won prospects divided by all prospects in the selected scope.',
          currentAum: 'Latest current AUM recorded through Client 360 conversions.',
        },
        kpis: {
          totalProspects: prospects.length,
          newProspects: periodProspects.length,
          openOpportunities: openProspects.length,
          pipelineValue,
          weightedPipeline,
          wonProspects: wonProspects.length,
          periodConversions: periodConversions.length,
          conversionRate: prospects.length ? Math.round((wonProspects.length / prospects.length) * 1000) / 10 : 0,
          currentAum,
          activities: periodActivities.length,
          meetings: periodMeetings.length,
          taskCompletionRate: periodTasks.length ? Math.round((completedPeriodTasks.length / periodTasks.length) * 1000) / 10 : 0,
          overdueTasks: overdueTasks.length,
          staleProspects: staleProspects.length,
        },
        trend,
        stages: Array.from(stageMap.values()).filter((row) => row.count > 0),
        industries: Array.from(industryMap.values()).sort((a, b) => b.value - a.value).slice(0, 8),
        products: Array.from(productMap.values()).sort((a, b) => b.aum - a.aum).slice(0, 8),
        officers: Array.from(officerMap.values()).sort((a, b) => b.currentAum - a.currentAum || b.weightedPipeline - a.weightedPipeline),
        actionQueue: {
          overdueTasks: overdueTasks.slice(0, 10).map((row: any) => ({ id: row.id, type: 'Overdue task', company: row.prospect_name || 'General', detail: row.title, dueDate: row.due_date, priority: row.priority || 'Medium' })),
          staleProspects: staleProspects.slice(0, 10).map((row: any) => ({ id: row.id, type: 'Stale prospect', company: row.name, detail: row.next_action || 'Record a next action or relationship update.', dueDate: day(row.last_activity_date || row.updated_at || row.created_at), priority: row.priority || 'Medium' })),
        },
        filters: { officers: user.isAdmin ? (profilesResult.data || []).map((row: any) => ({ id: row.id, name: row.full_name })) : [] },
      });
    } catch (error: any) {
      console.error('[PHASE 8 ANALYTICS] Overview failed:', error?.message || error);
      return res.status(500).json({ error: 'Unable to calculate analytics from the current SPIP records.' });
    }
  });
}
