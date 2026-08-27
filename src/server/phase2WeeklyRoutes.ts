import type { Express, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

const ADMIN_LEVELS = new Set(['SUPER_ADMIN', 'HOD_ADMIN']);

function userOf(req: Request): any {
  return (req as any).user || null;
}

function requireUser(req: Request, res: Response): any | null {
  const user = userOf(req);
  if (!user?.userId) {
    res.status(401).json({ error: 'Access denied. Sign-in required.' });
    return null;
  }
  return user;
}

function requireAdmin(req: Request, res: Response): any | null {
  const user = requireUser(req, res);
  if (!user) return null;
  if (!ADMIN_LEVELS.has(user.permissionLevel)) {
    res.status(403).json({ error: 'Administrator privileges required.' });
    return null;
  }
  return user;
}

function mapReport(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    weekStartDate: row.week_start_date,
    weekEndDate: row.week_end_date,
    summary: row.summary,
    prospectsAdded: Number(row.prospects_added || 0),
    meetingsHeld: Number(row.meetings_held || 0),
    followUpsCompleted: Number(row.follow_ups_completed || 0),
    fundsSecured: Number(row.funds_secured || 0),
    productsSold: row.products_sold || '',
    challenges: row.challenges || '',
    nextWeekPlan: row.next_week_plan || '',
    status: row.status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

async function audit(supabase: SupabaseClient, req: Request, action: string, target: string | null, metadata: any = {}) {
  const user = userOf(req);
  try {
    await supabase.from('system_audit_logs').insert({
      id: `report-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      timestamp: new Date().toISOString(),
      user_id: user?.userId || null,
      user_email: user?.email || null,
      user_name: user?.fullName || user?.email?.split('@')[0] || 'System',
      action,
      target,
      status: 'SUCCESS',
      metadata,
    });
  } catch (error) {
    console.warn('[PHASE 2 REPORT AUDIT] Unable to write audit entry:', (error as any)?.message || error);
  }
}

function isValidReportPayload(body: any) {
  if (!body?.weekStartDate || !body?.weekEndDate) return 'Reporting week is required.';
  if (!String(body.summary || '').trim()) return 'Summary section is required.';
  if (!String(body.productsSold || '').trim()) return 'Products sold/recommended section is required.';
  if (!String(body.challenges || '').trim()) return 'Challenges section is required.';
  if (!String(body.nextWeekPlan || '').trim()) return 'Next Week Plan is required.';
  for (const key of ['prospectsAdded', 'meetingsHeld', 'followUpsCompleted', 'fundsSecured']) {
    if (Number(body[key] || 0) < 0) return `${key} cannot be negative.`;
  }
  return null;
}

export function registerPhase2WeeklyRoutes(app: Express, supabase: SupabaseClient) {
  app.get('/api/weekly-reports', async (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const { data, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('user_id', user.userId)
      .order('week_start_date', { ascending: false });
    if (error) return res.status(500).json({ error: 'Unable to load your weekly reports.' });
    return res.json((data || []).map(mapReport));
  });

  app.get('/api/weekly-reports/auto-generate', async (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const weekStartDate = String(req.query.weekStartDate || '');
    const weekEndDate = String(req.query.weekEndDate || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartDate) || !/^\d{4}-\d{2}-\d{2}$/.test(weekEndDate)) {
      return res.status(400).json({ error: 'A valid weekStartDate and weekEndDate are required.' });
    }

    try {
      const [prospectResult, meetingResult, taskResult, activityResult] = await Promise.all([
        supabase.from('prospects').select('id, assigned_officer_id, created_at').eq('assigned_officer_id', user.userId),
        supabase.from('meetings').select('id, officer_id, date').eq('officer_id', user.userId),
        supabase.from('tasks').select('id, officer_id, due_date, is_completed').eq('officer_id', user.userId),
        supabase.from('activities').select('id, officer_id, date, activity_type, status').eq('officer_id', user.userId),
      ]);
      for (const result of [prospectResult, meetingResult, taskResult, activityResult]) {
        if (result.error) throw result.error;
      }
      const within = (value: any) => {
        const date = String(value || '').slice(0, 10);
        return date >= weekStartDate && date <= weekEndDate;
      };
      const prospectsAdded = (prospectResult.data || []).filter((row: any) => within(row.created_at)).length;
      const meetingsHeld = (meetingResult.data || []).filter((row: any) => within(row.date)).length;
      const followUpsCompleted = (taskResult.data || []).filter((row: any) => row.is_completed && within(row.due_date)).length;
      const activitiesLogged = (activityResult.data || []).filter((row: any) => within(row.date)).length;

      return res.json({
        weekStartDate,
        weekEndDate,
        prospectsAdded,
        meetingsHeld,
        followUpsCompleted,
        fundsSecured: 0,
        productsSold: 'None',
        summary: `CRM auto-summary: ${prospectsAdded} prospect(s) added, ${meetingsHeld} meeting(s) held, ${followUpsCompleted} follow-up(s) completed and ${activitiesLogged} activity record(s) logged during the reporting week.`,
        challenges: '',
        nextWeekPlan: '',
      });
    } catch (error) {
      console.error('[PHASE 2] Weekly auto-generation failed:', (error as any)?.message || error);
      return res.status(500).json({ error: 'Unable to auto-generate weekly report metrics.' });
    }
  });

  app.post('/api/weekly-reports', async (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const validationError = isValidReportPayload(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const requestedStatus = String(req.body.status || 'Draft');
    if (!['Draft', 'Submitted'].includes(requestedStatus)) {
      return res.status(400).json({ error: 'Invalid report status.' });
    }

    let existing: any = null;
    if (req.body.id) {
      const result = await supabase.from('weekly_reports').select('*').eq('id', String(req.body.id)).eq('user_id', user.userId).single();
      if (!result.error) existing = result.data;
    } else {
      const result = await supabase.from('weekly_reports').select('*').eq('user_id', user.userId).eq('week_start_date', req.body.weekStartDate).maybeSingle();
      if (!result.error) existing = result.data;
    }

    if (existing && existing.status !== 'Draft') {
      return res.status(409).json({ error: 'Submitted or reviewed reports are locked. Ask an administrator to unlock the report.' });
    }

    const now = new Date().toISOString();
    const id = existing?.id || `weekly-${user.userId}-${req.body.weekStartDate}`;
    const payload = {
      id,
      user_id: user.userId,
      user_name: user.fullName || user.email.split('@')[0],
      user_email: user.email,
      week_start_date: String(req.body.weekStartDate),
      week_end_date: String(req.body.weekEndDate),
      summary: String(req.body.summary).trim(),
      prospects_added: Number(req.body.prospectsAdded || 0),
      meetings_held: Number(req.body.meetingsHeld || 0),
      follow_ups_completed: Number(req.body.followUpsCompleted || 0),
      funds_secured: Number(req.body.fundsSecured || 0),
      products_sold: String(req.body.productsSold).trim(),
      challenges: String(req.body.challenges).trim(),
      next_week_plan: String(req.body.nextWeekPlan).trim(),
      status: requestedStatus,
      submitted_at: requestedStatus === 'Submitted' ? now : null,
      updated_at: now,
    };

    const result = existing
      ? await supabase.from('weekly_reports').update(payload).eq('id', id).eq('user_id', user.userId).select('*').single()
      : await supabase.from('weekly_reports').insert(payload).select('*').single();

    if (result.error || !result.data) {
      console.error('[PHASE 2] Weekly report save failed:', result.error?.message || result.error);
      return res.status(500).json({ error: 'Unable to save this weekly report.' });
    }

    await audit(supabase, req, requestedStatus === 'Submitted' ? 'WEEKLY_REPORT_SUBMITTED' : 'WEEKLY_REPORT_SAVED', id, { weekStartDate: req.body.weekStartDate });
    return res.json({ success: true, report: mapReport(result.data) });
  });

  app.post('/api/weekly-reports/submit/:id', async (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('weekly_reports')
      .update({ status: 'Submitted', submitted_at: now, updated_at: now })
      .eq('id', req.params.id)
      .eq('user_id', user.userId)
      .eq('status', 'Draft')
      .select('*')
      .single();
    if (error || !data) return res.status(409).json({ error: 'Only your own draft report can be submitted.' });
    await audit(supabase, req, 'WEEKLY_REPORT_SUBMITTED', req.params.id);
    return res.json({ success: true, report: mapReport(data) });
  });

  app.get('/api/admin/weekly-reports', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { data, error } = await supabase.from('weekly_reports').select('*').order('week_start_date', { ascending: false });
    if (error) return res.status(500).json({ error: 'Unable to load weekly reports.' });
    return res.json((data || []).map(mapReport));
  });

  app.post('/api/admin/weekly-reports/review/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('weekly_reports').update({ status: 'Reviewed', updated_at: now }).eq('id', req.params.id).select('*').single();
    if (error || !data) return res.status(404).json({ error: 'Report not found or could not be reviewed.' });
    await audit(supabase, req, 'WEEKLY_REPORT_REVIEWED', req.params.id);
    return res.json({ success: true, report: mapReport(data) });
  });

  app.post('/api/admin/weekly-reports/unlock/:id', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('weekly_reports').update({ status: 'Draft', submitted_at: null, updated_at: now }).eq('id', req.params.id).select('*').single();
    if (error || !data) return res.status(404).json({ error: 'Report not found or could not be unlocked.' });
    await audit(supabase, req, 'WEEKLY_REPORT_UNLOCKED', req.params.id);
    return res.json({ success: true, report: mapReport(data) });
  });

  app.post('/api/admin/weekly-reports/log-export/:id', async (req, res) => {
    const user = requireUser(req, res);
    if (!user) return;
    if (!ADMIN_LEVELS.has(user.permissionLevel)) {
      const { data } = await supabase.from('weekly_reports').select('user_id').eq('id', req.params.id).single();
      if (!data || data.user_id !== user.userId) return res.status(403).json({ error: 'You can export only your own reports.' });
    }
    await audit(supabase, req, 'WEEKLY_REPORT_EXPORTED', req.params.id, { format: req.body?.format || 'Unknown' });
    return res.json({ success: true });
  });

  app.post('/api/admin/weekly-reports/trigger-reminders', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    await audit(supabase, req, 'WEEKLY_REPORT_REMINDER_TRIGGERED', null);
    return res.json({ success: true, message: 'Reminder trigger accepted and recorded.' });
  });
}
