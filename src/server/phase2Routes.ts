import type { Express, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

const ADMIN_LEVELS = new Set(['SUPER_ADMIN', 'HOD_ADMIN']);
const ACCOUNT_STATUS_MAP: Record<string, string> = {
  Approved: 'ACTIVE',
  Active: 'ACTIVE',
  ACTIVE: 'ACTIVE',
  Pending: 'PENDING',
  PENDING: 'PENDING',
  Suspended: 'SUSPENDED',
  SUSPENDED: 'SUSPENDED',
  Rejected: 'REJECTED',
  REJECTED: 'REJECTED',
};

function requestUser(req: Request): any {
  return (req as any).user || null;
}

function requireAdmin(req: Request, res: Response): any | null {
  const user = requestUser(req);
  if (!user?.userId || !ADMIN_LEVELS.has(user.permissionLevel)) {
    res.status(403).json({ error: 'Administrator privileges required.' });
    return null;
  }
  return user;
}

function requireSuperAdmin(req: Request, res: Response): any | null {
  const user = requestUser(req);
  if (!user?.userId || user.permissionLevel !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Super Admin privileges required.' });
    return null;
  }
  return user;
}

function legacyRole(permissionLevel: string): string {
  if (permissionLevel === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (permissionLevel === 'HOD_ADMIN') return 'Admin';
  return 'Business Development Officer';
}

function legacyStatus(status: string): string {
  if (status === 'ACTIVE') return 'Approved';
  if (status === 'PENDING') return 'Pending';
  if (status === 'SUSPENDED') return 'Suspended';
  if (status === 'REJECTED') return 'Rejected';
  return status;
}

function mapProfile(profile: any) {
  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: legacyRole(profile.permission_level),
    permissionLevel: profile.permission_level,
    department: profile.department || 'Asset Management',
    jobTitle: profile.job_title || '',
    avatarUrl: profile.avatar_url || '',
    status: legacyStatus(profile.status),
    accountStatus: profile.status,
    approvedAt: profile.approved_at,
    approvedBy: profile.approved_by,
    lastLoginAt: profile.last_login_at,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

async function writeAudit(supabase: SupabaseClient, req: Request, action: string, target: string | null, status: string, metadata: any = {}) {
  const user = requestUser(req);
  try {
    await supabase.from('system_audit_logs').insert({
      id: `phase2-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      timestamp: new Date().toISOString(),
      user_id: user?.userId || null,
      user_email: user?.email || null,
      user_name: user?.fullName || user?.email?.split('@')[0] || 'System',
      action,
      target,
      status,
      metadata,
    });
  } catch (error) {
    console.warn('[PHASE 2 AUDIT] Unable to persist audit entry:', (error as any)?.message || error);
  }
}

function monthBounds(monthInput?: string) {
  const fallback = new Date();
  const match = monthInput?.match(/^(\d{4})-(\d{2})$/);
  const year = match ? Number(match[1]) : fallback.getUTCFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : fallback.getUTCMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return {
    key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function inDateRange(value: any, startDate: string, endDate: string): boolean {
  if (!value) return false;
  const date = String(value).slice(0, 10);
  return date >= startDate && date <= endDate;
}

async function safeSelect(supabase: SupabaseClient, table: string, columns = '*') {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw error;
  return data || [];
}

export function registerPhase2Routes(app: Express, supabase: SupabaseClient) {
  // Phase 1/2 stabilization: the executive dashboard must not depend on the separate
  // direct PostgreSQL connection. Supabase is the canonical identity/data plane for
  // administration and management reporting, so this route is intentionally registered
  // before the legacy CRM database health gate in server.ts.
  app.get('/api/admin/executive-dashboard-summary', async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const safeRows = async (table: string, columns = '*'): Promise<any[]> => {
      try {
        const { data, error } = await supabase.from(table).select(columns);
        if (error) {
          console.warn(`[PHASE 2 EXECUTIVE] ${table} unavailable: ${error.message}`);
          return [];
        }
        return (data as any[]) || [];
      } catch (error: any) {
        console.warn(`[PHASE 2 EXECUTIVE] ${table} unavailable: ${error?.message || error}`);
        return [];
      }
    };

    try {
      const [profiles, prospects, meetings, reports, workspaces, searchHistory, proposals, presentations] = await Promise.all([
        safeRows('profiles', 'id, full_name, email, permission_level, department, status, approved_at, created_at'),
        safeRows('prospects', 'id, name, assigned_officer_id, assigned_officer_name, status, actual_revenue, opportunity_value, created_at, updated_at'),
        safeRows('meetings', 'id, officer_id, prospect_name, date, status, created_at'),
        safeRows('weekly_reports', 'id, user_id, user_name, user_email, week_start_date, week_end_date, status, submitted_at, funds_secured, prospects_added, meetings_held, products_sold'),
        safeRows('workspaces', 'id, owner_user_id, status, created_at, updated_at'),
        safeRows('workspace_search_history', 'id, workspace_id, user_id, created_at'),
        safeRows('workspace_proposals', 'id, workspace_id, created_at'),
        safeRows('workspace_presentations', 'id, workspace_id, created_at'),
      ]);

      const activeProfiles = profiles.filter((p: any) => p.status === 'ACTIVE');
      const activeProspects = prospects.filter((p: any) => !['Lost', 'Archived', 'Seed Data'].includes(String(p.status)));
      const closedProspects = prospects.filter((p: any) => ['Won', 'Converted'].includes(String(p.status)));
      const totalFundsSecured = closedProspects.reduce((sum: number, p: any) => sum + Number(p.actual_revenue || 0), 0);
      const submittedReports = reports.filter((r: any) => ['Submitted', 'Reviewed'].includes(String(r.status)));

      const officers = activeProfiles
        .filter((p: any) => p.permission_level === 'STAFF')
        .map((profile: any) => {
          const officerProspects = prospects.filter((p: any) => p.assigned_officer_id === profile.id);
          const officerMeetings = meetings.filter((m: any) => m.officer_id === profile.id);
          const officerClosed = officerProspects.filter((p: any) => ['Won', 'Converted'].includes(String(p.status)));
          const officerReports = reports
            .filter((r: any) => r.user_id === profile.id)
            .sort((a: any, b: any) => String(b.submitted_at || b.week_end_date || '').localeCompare(String(a.submitted_at || a.week_end_date || '')));
          const products = new Set<string>();
          officerReports.forEach((r: any) => String(r.products_sold || '').split(/[,;\n]/).map((v: string) => v.trim()).filter(Boolean).forEach((v: string) => products.add(v)));
          return {
            id: profile.id,
            fullName: profile.full_name,
            role: profile.permission_level === 'STAFF' ? 'Business Development Officer' : profile.permission_level,
            prospects: officerProspects.length,
            meetings: officerMeetings.length,
            investmentsClosed: officerClosed.length,
            amountSecured: officerClosed.reduce((sum: number, p: any) => sum + Number(p.actual_revenue || 0), 0),
            productsSold: Array.from(products),
            lastReportSubmitted: officerReports[0]?.submitted_at || officerReports[0]?.week_end_date || '',
            status: profile.status,
          };
        });

      const leaderboard = officers
        .map((o: any) => ({
          id: o.id,
          fullName: o.fullName,
          amountSecured: o.amountSecured,
          dealsClosed: o.investmentsClosed,
          conversionRate: o.prospects > 0 ? Math.round((o.investmentsClosed / o.prospects) * 100) : 0,
        }))
        .sort((a: any, b: any) => b.amountSecured - a.amountSecured || b.dealsClosed - a.dealsClosed)
        .slice(0, 10);

      const productMap = new Map<string, { productName: string; investmentsCount: number; totalAmount: number }>();
      reports.forEach((r: any) => {
        const names = String(r.products_sold || '').split(/[,;\n]/).map((v: string) => v.trim()).filter(Boolean);
        names.forEach((name: string) => {
          const key = name.toLowerCase();
          const current = productMap.get(key) || { productName: name, investmentsCount: 0, totalAmount: 0 };
          current.investmentsCount += 1;
          current.totalAmount += Number(r.funds_secured || 0);
          productMap.set(key, current);
        });
      });

      const recentReports = [...submittedReports]
        .sort((a: any, b: any) => String(b.submitted_at || b.week_end_date || '').localeCompare(String(a.submitted_at || a.week_end_date || '')))
        .slice(0, 20)
        .map((r: any) => ({
          id: r.id,
          officerName: r.user_name,
          officerEmail: r.user_email,
          weekStartDate: r.week_start_date,
          weekEndDate: r.week_end_date,
          submissionDate: r.submitted_at || r.week_end_date,
          status: r.status,
          fundsSecured: Number(r.funds_secured || 0),
          prospectsAdded: Number(r.prospects_added || 0),
          meetingsHeld: Number(r.meetings_held || 0),
        }));

      const activityRows: any[] = [];
      prospects.slice(-15).forEach((p: any) => activityRows.push({
        type: 'prospect', id: p.id, title: `Prospect: ${p.name}`, detail: `Status: ${p.status}`, timestamp: p.updated_at || p.created_at || '',
      }));
      meetings.slice(-15).forEach((m: any) => activityRows.push({
        type: 'meeting', id: m.id, title: `Meeting: ${m.prospect_name || 'Client meeting'}`, detail: `Status: ${m.status || 'Scheduled'}`, timestamp: m.date || m.created_at || '',
      }));
      recentReports.slice(0, 10).forEach((r: any) => activityRows.push({
        type: 'report', id: r.id, title: `Weekly report: ${r.officerName}`, detail: `${r.status} • ₦${Number(r.fundsSecured || 0).toLocaleString()} secured`, timestamp: r.submissionDate || '',
      }));
      activeProfiles.filter((p: any) => p.approved_at).slice(-10).forEach((p: any) => activityRows.push({
        type: 'user_approved', id: p.id, title: `User approved: ${p.full_name}`, detail: p.email, timestamp: p.approved_at,
      }));
      activityRows.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));

      const insights: string[] = [];
      const conversionRate = prospects.length > 0 ? Math.round((closedProspects.length / prospects.length) * 100) : 0;
      insights.push(`Current platform conversion rate is ${conversionRate}% across ${prospects.length} recorded prospects.`);
      insights.push(`${submittedReports.length} weekly reports have been submitted or reviewed across the current reporting history.`);
      if (leaderboard[0]) insights.push(`Top recorded performer is ${leaderboard[0].fullName} with ₦${Number(leaderboard[0].amountSecured || 0).toLocaleString()} secured.`);
      insights.push(`There are ${workspaces.filter((w: any) => String(w.status).toLowerCase() === 'active').length} active research workspaces supporting prospect development.`);

      return res.json({
        overview: {
          totalOfficers: officers.length,
          totalActiveProspects: activeProspects.length,
          totalMeetingsHeld: meetings.filter((m: any) => ['Held', 'Completed', 'Done'].includes(String(m.status))).length || meetings.length,
          totalInvestmentsClosed: closedProspects.length,
          totalFundsSecured,
          totalReportsSubmitted: submittedReports.length,
        },
        workspaces: {
          totalWorkspaces: workspaces.length,
          activeWorkspaces: workspaces.filter((w: any) => String(w.status).toLowerCase() === 'active').length,
          archivedWorkspaces: workspaces.filter((w: any) => String(w.status).toLowerCase() === 'archived').length,
          researchSessionsCount: searchHistory.length,
          proposalsCount: proposals.length,
          presentationsCount: presentations.length,
        },
        officers,
        leaderboard,
        products: Array.from(productMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
        reports: recentReports,
        insights,
        activities: activityRows.slice(0, 30),
      });
    } catch (error: any) {
      console.error('[PHASE 2 EXECUTIVE] Failed to build executive dashboard:', error?.message || error);
      return res.status(500).json({ error: 'Unable to build the executive summary right now.' });
    }
  });

  // Canonical user directory. `profiles` is the source of truth for identity and permissions.
  app.get('/api/admin/users', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, permission_level, job_title, department, status, avatar_url, approved_at, approved_by, last_login_at, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Unable to load the SCM user directory.' });
    return res.json((data || []).map(mapProfile));
  });

  app.put('/api/admin/users/:id', async (req, res) => {
    const actor = requireAdmin(req, res);
    if (!actor) return;

    const targetId = String(req.params.id || '').trim();
    const { data: existing, error: lookupError } = await supabase
      .from('profiles')
      .select('id, full_name, email, permission_level, department, status')
      .eq('id', targetId)
      .single();

    if (lookupError || !existing) return res.status(404).json({ error: 'User profile not found.' });

    if (existing.permission_level === 'SUPER_ADMIN' && actor.permissionLevel !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'HOD Admins cannot modify the Super Admin account.' });
    }

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof req.body?.fullName === 'string' && req.body.fullName.trim()) patch.full_name = req.body.fullName.trim();
    if (typeof req.body?.department === 'string' && req.body.department.trim()) patch.department = req.body.department.trim();
    if (typeof req.body?.jobTitle === 'string') patch.job_title = req.body.jobTitle.trim() || null;

    if (req.body?.status) {
      const nextStatus = ACCOUNT_STATUS_MAP[String(req.body.status)] || null;
      if (!nextStatus) return res.status(400).json({ error: 'Invalid account status.' });
      patch.status = nextStatus;
      if (nextStatus === 'ACTIVE') {
        patch.approved_at = new Date().toISOString();
        patch.approved_by = actor.userId;
      }
    }

    if (req.body?.permissionLevel || req.body?.role) {
      if (actor.permissionLevel !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only the Super Admin can change permission levels.' });
      }

      let nextPermission = req.body.permissionLevel;
      if (!nextPermission) {
        const requestedRole = String(req.body.role);
        nextPermission = requestedRole === 'SUPER_ADMIN'
          ? 'SUPER_ADMIN'
          : ['Admin', 'Administrator'].includes(requestedRole)
            ? 'HOD_ADMIN'
            : 'STAFF';
      }

      if (!['SUPER_ADMIN', 'HOD_ADMIN', 'STAFF'].includes(nextPermission)) {
        return res.status(400).json({ error: 'Invalid permission level.' });
      }

      if (targetId === actor.userId && existing.permission_level === 'SUPER_ADMIN' && nextPermission !== 'SUPER_ADMIN') {
        return res.status(400).json({ error: 'The active Super Admin cannot demote their own account.' });
      }
      patch.permission_level = nextPermission;
    }

    if (req.body?.password) {
      if (!requireSuperAdmin(req, res)) return;
      const password = String(req.body.password);
      if (password.length < 12) return res.status(400).json({ error: 'Temporary passwords must contain at least 12 characters.' });
      const { error: passwordError } = await supabase.auth.admin.updateUserById(targetId, { password });
      if (passwordError) return res.status(500).json({ error: 'Unable to reset this user password.' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', targetId)
      .select('id, full_name, email, permission_level, job_title, department, status, avatar_url, approved_at, approved_by, last_login_at, created_at, updated_at')
      .single();

    if (updateError || !updated) return res.status(500).json({ error: 'Unable to update this user profile.' });
    await writeAudit(supabase, req, 'ADMIN_USER_UPDATED', existing.email, 'SUCCESS', {
      changedFields: Object.keys(patch).filter((key) => key !== 'updated_at'),
    });
    return res.json({ success: true, user: mapProfile(updated) });
  });

  // Deliberately soft-delete by suspending the identity. This protects CRM ownership history.
  app.delete('/api/admin/users/:id', async (req, res) => {
    const actor = requireSuperAdmin(req, res);
    if (!actor) return;
    const targetId = String(req.params.id || '').trim();
    if (targetId === actor.userId) return res.status(400).json({ error: 'You cannot remove your own Super Admin account.' });

    const { data: existing, error: lookupError } = await supabase
      .from('profiles')
      .select('id, email, permission_level')
      .eq('id', targetId)
      .single();
    if (lookupError || !existing) return res.status(404).json({ error: 'User profile not found.' });
    if (existing.permission_level === 'SUPER_ADMIN') return res.status(400).json({ error: 'Another Super Admin cannot be deleted through this screen.' });

    const { error } = await supabase
      .from('profiles')
      .update({ status: 'SUSPENDED', updated_at: new Date().toISOString() })
      .eq('id', targetId);
    if (error) return res.status(500).json({ error: 'Unable to suspend this account.' });

    await writeAudit(supabase, req, 'ADMIN_USER_SUSPENDED', existing.email, 'SUCCESS');
    return res.json({ success: true, suspended: true });
  });

  app.get('/api/admin/audit-logs', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { data, error } = await supabase
      .from('system_audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);
    if (error) return res.status(500).json({ error: 'Unable to load audit logs.' });
    return res.json((data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name,
      action: row.action,
      target: row.target,
      status: row.status,
      metadata: row.metadata,
    })));
  });

  app.get('/api/admin/system-summary', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { data: profiles, error: profileError } = await supabase.from('profiles').select('status');
      if (profileError) throw profileError;

      const countTable = async (table: string) => {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) return 0;
        return count || 0;
      };

      const [prospectsCount, meetingsCount, tasksCount, notificationsCount, workspacesCount, searchesCount, serenaCount] = await Promise.all([
        countTable('prospects'),
        countTable('meetings'),
        countTable('tasks'),
        countTable('notifications'),
        countTable('workspaces'),
        countTable('ai_search_history'),
        countTable('serena_audit_logs'),
      ]);

      const statuses = (profiles || []).map((p: any) => p.status);
      return res.json({
        users: {
          total: statuses.length,
          pending: statuses.filter((s: string) => s === 'PENDING').length,
          approved: statuses.filter((s: string) => s === 'ACTIVE').length,
          rejected: statuses.filter((s: string) => s === 'REJECTED').length,
          suspended: statuses.filter((s: string) => s === 'SUSPENDED').length,
        },
        prospects: prospectsCount,
        meetings: meetingsCount,
        tasks: tasksCount,
        notifications: notificationsCount,
        workspaces: workspacesCount,
        searches: searchesCount,
        serena: serenaCount,
        systemHealth: {
          databaseConnected: true,
          redisCacheStatus: 'Not configured',
          apiStatus: 'Operational',
          environment: process.env.NODE_ENV || 'development',
        },
      });
    } catch (error) {
      console.error('[PHASE 2] Failed to build system summary:', (error as any)?.message || error);
      return res.status(500).json({ error: 'Unable to build the administration summary.' });
    }
  });

  app.get('/api/admin/staff/performance', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { startDate, endDate } = monthBounds(typeof req.query.month === 'string' ? req.query.month : undefined);

    try {
      const [{ data: profiles, error: profileError }, prospects, meetings, tasks, activities, reports] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, permission_level, department, status').eq('status', 'ACTIVE'),
        safeSelect(supabase, 'prospects', 'id, assigned_officer_id, assigned_officer_name, status, opportunity_value, actual_revenue, created_at, updated_at'),
        safeSelect(supabase, 'meetings', 'id, officer_id, date'),
        safeSelect(supabase, 'tasks', 'id, officer_id, due_date, is_completed'),
        safeSelect(supabase, 'activities', 'id, officer_id, date, status, activity_type'),
        safeSelect(supabase, 'weekly_reports', 'id, user_id, week_start_date, week_end_date, status, prospects_added, meetings_held, follow_ups_completed, funds_secured'),
      ]);
      if (profileError) throw profileError;

      const result = (profiles || []).map((profile: any) => {
        const ownedProspects = prospects.filter((p: any) => p.assigned_officer_id === profile.id);
        const periodProspects = ownedProspects.filter((p: any) => inDateRange(p.created_at, startDate, endDate));
        const periodMeetings = meetings.filter((m: any) => m.officer_id === profile.id && inDateRange(m.date, startDate, endDate));
        const periodTasks = tasks.filter((t: any) => t.officer_id === profile.id && inDateRange(t.due_date, startDate, endDate));
        const periodActivities = activities.filter((a: any) => a.officer_id === profile.id && inDateRange(a.date, startDate, endDate));
        const periodReports = reports.filter((r: any) => r.user_id === profile.id && inDateRange(r.week_start_date, startDate, endDate));
        const completedTasks = periodTasks.filter((t: any) => Boolean(t.is_completed));
        const won = ownedProspects.filter((p: any) => ['Won', 'Converted'].includes(String(p.status)));
        const pipelineValue = ownedProspects.reduce((sum: number, p: any) => sum + Number(p.opportunity_value || 0), 0);
        const realizedRevenue = ownedProspects.reduce((sum: number, p: any) => sum + Number(p.actual_revenue || 0), 0);
        const reviewedReports = periodReports.filter((r: any) => r.status === 'Reviewed').length;
        const submittedReports = periodReports.filter((r: any) => ['Submitted', 'Reviewed'].includes(r.status)).length;
        const reportCompliance = periodReports.length > 0 ? Math.round((submittedReports / periodReports.length) * 100) : 0;
        const taskCompletion = periodTasks.length > 0 ? Math.round((completedTasks.length / periodTasks.length) * 100) : 0;

        return {
          userId: profile.id,
          fullName: profile.full_name,
          email: profile.email,
          department: profile.department,
          permissionLevel: profile.permission_level,
          prospectsAdded: periodProspects.length,
          meetingsHeld: periodMeetings.length,
          activitiesLogged: periodActivities.length,
          tasksCompleted: completedTasks.length,
          tasksDue: periodTasks.length,
          taskCompletionRate: taskCompletion,
          wonProspects: won.length,
          pipelineValue,
          realizedRevenue,
          weeklyReportsSubmitted: submittedReports,
          weeklyReportsReviewed: reviewedReports,
          reportCompliance,
        };
      });

      return res.json({ period: { startDate, endDate }, staff: result });
    } catch (error) {
      console.error('[PHASE 2] Staff performance query failed:', (error as any)?.message || error);
      return res.status(500).json({ error: 'Unable to calculate staff performance.' });
    }
  });

  app.get('/api/admin/reports/monthly', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const bounds = monthBounds(typeof req.query.month === 'string' ? req.query.month : undefined);

    try {
      const [prospects, meetings, tasks, activities, reports] = await Promise.all([
        safeSelect(supabase, 'prospects', 'id, status, opportunity_value, actual_revenue, created_at, updated_at'),
        safeSelect(supabase, 'meetings', 'id, date'),
        safeSelect(supabase, 'tasks', 'id, due_date, is_completed'),
        safeSelect(supabase, 'activities', 'id, date, status, activity_type'),
        safeSelect(supabase, 'weekly_reports', 'id, week_start_date, status, funds_secured'),
      ]);

      const periodProspects = prospects.filter((p: any) => inDateRange(p.created_at, bounds.startDate, bounds.endDate));
      const periodMeetings = meetings.filter((m: any) => inDateRange(m.date, bounds.startDate, bounds.endDate));
      const periodTasks = tasks.filter((t: any) => inDateRange(t.due_date, bounds.startDate, bounds.endDate));
      const periodActivities = activities.filter((a: any) => inDateRange(a.date, bounds.startDate, bounds.endDate));
      const periodReports = reports.filter((r: any) => inDateRange(r.week_start_date, bounds.startDate, bounds.endDate));

      const converted = prospects.filter((p: any) => ['Won', 'Converted'].includes(String(p.status)) && inDateRange(p.updated_at || p.created_at, bounds.startDate, bounds.endDate));
      const submitted = periodReports.filter((r: any) => ['Submitted', 'Reviewed'].includes(r.status));
      const reviewed = periodReports.filter((r: any) => r.status === 'Reviewed');

      return res.json({
        month: bounds.key,
        period: { startDate: bounds.startDate, endDate: bounds.endDate },
        summary: {
          prospectsAdded: periodProspects.length,
          meetingsHeld: periodMeetings.length,
          activitiesLogged: periodActivities.length,
          followUpsCompleted: periodTasks.filter((t: any) => Boolean(t.is_completed)).length,
          conversions: converted.length,
          pipelineValueAdded: periodProspects.reduce((sum: number, p: any) => sum + Number(p.opportunity_value || 0), 0),
          realizedRevenue: converted.reduce((sum: number, p: any) => sum + Number(p.actual_revenue || 0), 0),
          fundsSecuredReported: submitted.reduce((sum: number, r: any) => sum + Number(r.funds_secured || 0), 0),
          weeklyReportsSubmitted: submitted.length,
          weeklyReportsReviewed: reviewed.length,
        },
      });
    } catch (error) {
      console.error('[PHASE 2] Monthly report failed:', (error as any)?.message || error);
      return res.status(500).json({ error: 'Unable to build the monthly management report.' });
    }
  });

  app.get('/api/admin/reports/overview', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const bounds = monthBounds(typeof req.query.month === 'string' ? req.query.month : undefined);
    const { data, error } = await supabase
      .from('weekly_reports')
      .select('id, user_id, user_name, user_email, week_start_date, week_end_date, status, prospects_added, meetings_held, follow_ups_completed, funds_secured')
      .gte('week_start_date', bounds.startDate)
      .lte('week_start_date', bounds.endDate)
      .order('week_start_date', { ascending: false });
    if (error) return res.status(500).json({ error: 'Unable to load report overview.' });
    return res.json({ month: bounds.key, reports: data || [] });
  });
}
