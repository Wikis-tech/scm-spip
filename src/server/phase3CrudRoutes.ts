import type { Express, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const userOf = (req: Request): any => (req as any).user || null;

async function ownedProspectIds(supabase: SupabaseClient, user: any): Promise<string[]> {
  if (!user?.userId) return [];
  const query = supabase.from('prospects').select('id');
  const { data, error } = user.isAdmin ? await query : await query.eq('assigned_officer_id', user.userId);
  if (error) throw error;
  return (data || []).map((row: any) => String(row.id));
}

async function canUseProspect(supabase: SupabaseClient, user: any, prospectId: string): Promise<boolean> {
  if (user?.isAdmin) return true;
  const { data } = await supabase.from('prospects').select('id, assigned_officer_id').eq('id', prospectId).maybeSingle();
  return Boolean(data && String(data.assigned_officer_id || '') === String(user?.userId || ''));
}

function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function now() { return new Date().toISOString(); }

export function normaliseMeetingTime(value: unknown): string | null {
  const input = String(value || '').trim().toUpperCase();
  const twelveHour = input.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/);
  if (twelveHour) return `${Number(twelveHour[1])}:${twelveHour[2]} ${twelveHour[3]}`;
  const twentyFourHour = input.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!twentyFourHour) return null;
  const hour24 = Number(twentyFourHour[1]);
  return `${hour24 % 12 || 12}:${twentyFourHour[2]} ${hour24 >= 12 ? 'PM' : 'AM'}`;
}

export function meetingStartIso(dateValue: unknown, timeValue: unknown): string | null {
  const date = String(dateValue || '').trim();
  const time = normaliseMeetingTime(timeValue);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) return null;
  const match = time.match(/^(\d{1,2}):([0-5]\d) (AM|PM)$/);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3] === 'PM') hour += 12;
  const instant = new Date(`${date}T${String(hour).padStart(2, '0')}:${match[2]}:00+01:00`);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

async function syncMeetingReminders(supabase: SupabaseClient, meeting: any, userId: string) {
  const startsAtIso = meetingStartIso(meeting.date, meeting.time);
  if (!startsAtIso) throw new Error('INVALID_MEETING_TIME');

  const { error: clearError } = await supabase.from('spip_reminders')
    .delete()
    .eq('user_id', userId)
    .eq('source_type', 'meeting')
    .eq('source_id', meeting.id)
    .eq('status', 'PENDING');
  if (clearError) throw clearError;
  if (String(meeting.outcome || '').trim()) return;

  const { data: preference, error: preferenceError } = await supabase.from('spip_notification_preferences')
    .select('meeting_24h,meeting_1h,meeting_10m,meeting_start')
    .eq('user_id', userId)
    .maybeSingle();
  if (preferenceError) throw preferenceError;

  const startsAt = new Date(startsAtIso);
  const currentTime = Date.now();
  const company = String(meeting.prospect_name || 'SCM client').trim();
  const purpose = String(meeting.purpose || 'Client meeting').trim();
  const expiry = new Date(startsAt.getTime() + 12 * 60 * 60 * 1000).toISOString();
  const candidates = [
    { enabled: preference?.meeting_24h !== false, kind: 'meeting_24h', offset: 24 * 60, title: `Meeting tomorrow: ${company}`, message: `${purpose} • ${meeting.time}`, priority: 'normal' },
    { enabled: preference?.meeting_1h !== false, kind: 'meeting_1h', offset: 60, title: `Meeting in 1 hour: ${company}`, message: `${purpose} • ${meeting.time}`, priority: 'high' },
    { enabled: preference?.meeting_10m !== false, kind: 'meeting_10m', offset: 10, title: `Meeting in 10 minutes: ${company}`, message: `${purpose} • Prepare to join/start the meeting.`, priority: 'critical' },
    { enabled: preference?.meeting_start !== false, kind: 'meeting_start', offset: 0, title: `Meeting starting now: ${company}`, message: `${purpose} • ${meeting.time}`, priority: 'critical' },
  ];
  const rows = candidates.flatMap((candidate) => {
    const scheduledFor = new Date(startsAt.getTime() - candidate.offset * 60_000);
    if (!candidate.enabled || scheduledFor.getTime() <= currentTime) return [];
    return [{
      user_id: userId,
      source_type: 'meeting',
      source_id: meeting.id,
      prospect_id: meeting.prospect_id || null,
      prospect_name: company,
      title: candidate.title,
      message: candidate.message,
      reminder_kind: candidate.kind,
      scheduled_for: scheduledFor.toISOString(),
      status: 'PENDING',
      priority: candidate.priority,
      attempt_count: 0,
      next_attempt_at: null,
      last_error: null,
      sent_at: null,
      expires_at: expiry,
      metadata: { url: '/calendar', meetingStart: startsAtIso, requireInteraction: candidate.kind === 'meeting_start' },
      updated_at: now(),
    }];
  });
  if (!rows.length) return;
  const { error } = await supabase.from('spip_reminders')
    .upsert(rows, { onConflict: 'user_id,source_type,source_id,reminder_kind' });
  if (error) throw error;
}

const mapContactRow = (r:any) => ({ id:r.id, prospectId:r.prospect_id, prospectName:r.prospect_name, fullName:r.full_name, position:r.position, department:r.department, email:r.email, phone:r.phone, linkedin:r.linkedin, influenceLevel:r.influence_level, isDecisionMaker:Boolean(r.is_decision_maker), notes:r.notes, validationLevel:r.validation_level, createdAt:r.created_at });
const mapActivityRow = (r:any) => ({ id:r.id, prospectId:r.prospect_id, prospectName:r.prospect_name, date:r.date, time:r.time, officerId:r.officer_id, officerName:r.officer_name, activityType:r.activity_type, outcome:r.outcome, notes:r.notes, status:r.status, createdAt:r.created_at });
const mapMeetingRow = (r:any) => ({ id:r.id, prospectId:r.prospect_id, prospectName:r.prospect_name, officerId:r.officer_id, officerName:r.officer_name, date:r.date, time:r.time, durationMinutes:Number(r.duration_minutes||45), purpose:r.purpose, outcome:r.outcome, nextAction:r.next_action, createdAt:r.created_at });
const mapTaskRow = (r:any) => ({ id:r.id, prospectId:r.prospect_id, prospectName:r.prospect_name, title:r.title, dueDate:r.due_date, assignedStaff:r.assigned_staff, officerId:r.officer_id, priority:r.priority, isCompleted:Boolean(r.is_completed), notes:r.notes, status:r.is_completed ? 'Completed' : 'Pending' });

export function registerPhase3CrudRoutes(app: Express, supabase: SupabaseClient) {
  app.get('/api/crm/contacts', async (req, res) => {
    try {
      const user = userOf(req); const ids = await ownedProspectIds(supabase, user);
      if (!user?.isAdmin && ids.length === 0) return res.json([]);
      let q = supabase.from('contacts').select('*').order('created_at', { ascending: false });
      if (!user?.isAdmin) q = q.in('prospect_id', ids);
      const { data, error } = await q; if (error) throw error; return res.json((data || []).map(mapContactRow));
    } catch (e:any) { return res.status(500).json({ error: 'Unable to load contacts.' }); }
  });

  app.post('/api/crm/contacts', async (req, res) => {
    const user = userOf(req); const prospectId = String(req.body?.prospectId || req.body?.prospect_id || '');
    if (!prospectId || !(await canUseProspect(supabase, user, prospectId))) return res.status(403).json({ error: 'You do not have access to this prospect.' });
    const payload = {
      id: String(req.body?.id || id('contact')), prospect_id: prospectId,
      prospect_name: req.body?.prospectName || req.body?.prospect_name || null,
      full_name: String(req.body?.fullName || req.body?.full_name || '').trim(),
      position: String(req.body?.position || '').trim() || 'Contact', department: req.body?.department || null,
      email: req.body?.email || null, phone: req.body?.phone || null, linkedin: req.body?.linkedin || null,
      influence_level: req.body?.influenceLevel || req.body?.influence_level || 'Medium',
      is_decision_maker: Boolean(req.body?.isDecisionMaker ?? req.body?.is_decision_maker ?? false),
      notes: req.body?.notes || null, validation_level: req.body?.validationLevel || req.body?.validation_level || 'Unverified', created_at: now(),
    };
    if (!payload.full_name) return res.status(400).json({ error: 'Contact name is required.' });
    const { data, error } = await supabase.from('contacts').insert(payload).select('*').single();
    if (error) return res.status(500).json({ error: 'Unable to add contact.' }); return res.status(201).json(mapContactRow(data));
  });

  app.patch('/api/crm/contacts/:id', async (req, res) => {
    const user = userOf(req); const { data: row } = await supabase.from('contacts').select('*').eq('id', req.params.id).maybeSingle();
    if (!row) return res.status(404).json({ error: 'Contact not found.' });
    if (!(await canUseProspect(supabase, user, row.prospect_id))) return res.status(403).json({ error: 'Access denied.' });
    const map: any = { fullName:'full_name', position:'position', department:'department', email:'email', phone:'phone', linkedin:'linkedin', influenceLevel:'influence_level', isDecisionMaker:'is_decision_maker', notes:'notes', validationLevel:'validation_level' };
    const patch:any = {}; Object.entries(map).forEach(([k,v]) => { if (req.body?.[k] !== undefined) patch[v as string] = req.body[k]; });
    const { data, error } = await supabase.from('contacts').update(patch).eq('id', req.params.id).select('*').single();
    if (error) return res.status(500).json({ error: 'Unable to update contact.' }); return res.json(mapContactRow(data));
  });

  app.delete('/api/crm/contacts/:id', async (req, res) => {
    const user = userOf(req); const { data: row } = await supabase.from('contacts').select('id, prospect_id').eq('id', req.params.id).maybeSingle();
    if (!row) return res.status(404).json({ error: 'Contact not found.' });
    if (!(await canUseProspect(supabase, user, row.prospect_id))) return res.status(403).json({ error: 'Access denied.' });
    const { error } = await supabase.from('contacts').delete().eq('id', req.params.id); if (error) return res.status(500).json({ error: 'Unable to delete contact.' }); return res.json({ ok:true });
  });

  app.get('/api/crm/activities', async (req, res) => {
    const user = userOf(req); let q = supabase.from('activities').select('*').order('date', { ascending:false }); if (!user?.isAdmin) q = q.eq('officer_id', user?.userId || '');
    const { data, error } = await q; if (error) return res.status(500).json({ error:'Unable to load activities.' }); return res.json((data || []).map(mapActivityRow));
  });
  app.post('/api/crm/activities', async (req, res) => {
    const user = userOf(req); const prospectId = String(req.body?.prospectId || req.body?.prospect_id || ''); if (!prospectId || !(await canUseProspect(supabase,user,prospectId))) return res.status(403).json({error:'Access denied.'});
    const d = new Date(); const payload:any = { id:String(req.body?.id || id('activity')), prospect_id:prospectId, prospect_name:req.body?.prospectName || null, date:req.body?.date || d.toISOString().slice(0,10), time:req.body?.time || d.toTimeString().slice(0,5), officer_id:user.userId, officer_name:user.fullName || user.email?.split('@')[0], activity_type:req.body?.activityType || req.body?.activity_type || 'Note', outcome:req.body?.outcome || null, notes:req.body?.notes || null, status:req.body?.status || 'Completed', created_at:now() };
    const {data,error}=await supabase.from('activities').insert(payload).select('*').single(); if(error)return res.status(500).json({error:'Unable to log activity.'}); return res.status(201).json(mapActivityRow(data));
  });
  app.patch('/api/crm/activities/:id', async (req,res)=>{ const user=userOf(req); const {data:row}=await supabase.from('activities').select('*').eq('id',req.params.id).maybeSingle(); if(!row)return res.status(404).json({error:'Activity not found.'}); if(!user?.isAdmin && row.officer_id!==user?.userId)return res.status(403).json({error:'Access denied.'}); const patch:any={}; const map:any={activityType:'activity_type',outcome:'outcome',notes:'notes',status:'status',date:'date',time:'time'}; Object.entries(map).forEach(([k,v])=>{if(req.body?.[k]!==undefined)patch[v as string]=req.body[k]}); const {data,error}=await supabase.from('activities').update(patch).eq('id',req.params.id).select('*').single(); if(error)return res.status(500).json({error:'Unable to update activity.'}); return res.json(mapActivityRow(data)); });
  app.delete('/api/crm/activities/:id', async (req,res)=>{ const user=userOf(req); const {data:row}=await supabase.from('activities').select('id,officer_id').eq('id',req.params.id).maybeSingle(); if(!row)return res.status(404).json({error:'Activity not found.'}); if(!user?.isAdmin&&row.officer_id!==user?.userId)return res.status(403).json({error:'Access denied.'}); const {error}=await supabase.from('activities').delete().eq('id',req.params.id); if(error)return res.status(500).json({error:'Unable to delete activity.'}); return res.json({ok:true}); });

  app.get('/api/crm/meetings', async (req,res)=>{ const user=userOf(req); let q=supabase.from('meetings').select('*').order('date',{ascending:true}); if(!user?.isAdmin)q=q.eq('officer_id',user?.userId||''); const {data,error}=await q; if(error)return res.status(500).json({error:'Unable to load meetings.'}); return res.json((data||[]).map(mapMeetingRow)); });
  app.post('/api/crm/meetings', async (req,res)=>{
    const user=userOf(req);
    const prospectId=String(req.body?.prospectId||req.body?.prospect_id||'');
    if(!prospectId||!(await canUseProspect(supabase,user,prospectId)))return res.status(403).json({error:'Access denied.'});
    const normalisedTime=normaliseMeetingTime(req.body?.time);
    if(!req.body?.date||!normalisedTime||!meetingStartIso(req.body.date,normalisedTime))return res.status(400).json({error:'Choose a valid meeting date, hour, minute and AM/PM.'});
    const payload:any={id:String(req.body?.id||id('meeting')),prospect_id:prospectId,prospect_name:req.body?.prospectName||null,officer_id:user.userId,officer_name:user.fullName||user.email?.split('@')[0],date:req.body.date,time:normalisedTime,duration_minutes:Number(req.body?.durationMinutes||45),purpose:req.body?.purpose||'Client meeting',outcome:req.body?.outcome||null,next_action:req.body?.nextAction||null,created_at:now()};
    const {data,error}=await supabase.from('meetings').insert(payload).select('*').single();
    if(error)return res.status(500).json({error:'Unable to schedule meeting.'});
    try { await syncMeetingReminders(supabase,data,user.userId); }
    catch(error:any){
      console.error('[MEETING REMINDER SYNC ERROR]',{meetingId:data.id,userId:user.userId,error:String(error?.message||error)});
      await supabase.from('meetings').delete().eq('id',data.id).eq('officer_id',user.userId);
      return res.status(500).json({error:'The meeting could not be scheduled with its notifications. Nothing was saved; please try again.'});
    }
    return res.status(201).json(mapMeetingRow(data));
  });
  app.patch('/api/crm/meetings/:id', async (req,res)=>{
    const user=userOf(req);
    const {data:row}=await supabase.from('meetings').select('*').eq('id',req.params.id).maybeSingle();
    if(!row)return res.status(404).json({error:'Meeting not found.'});
    if(!user?.isAdmin&&row.officer_id!==user?.userId)return res.status(403).json({error:'Access denied.'});
    const map:any={date:'date',time:'time',durationMinutes:'duration_minutes',purpose:'purpose',outcome:'outcome',nextAction:'next_action'};
    const patch:any={}; Object.entries(map).forEach(([k,v])=>{if(req.body?.[k]!==undefined)patch[v as string]=req.body[k]});
    if(patch.time!==undefined){ const value=normaliseMeetingTime(patch.time); if(!value)return res.status(400).json({error:'Choose a valid meeting hour, minute and AM/PM.'}); patch.time=value; }
    const effective={...row,...patch};
    if(!meetingStartIso(effective.date,effective.time))return res.status(400).json({error:'Choose a valid meeting date and time.'});
    const {data,error}=await supabase.from('meetings').update(patch).eq('id',req.params.id).select('*').single();
    if(error)return res.status(500).json({error:'Unable to update meeting.'});
    try { await syncMeetingReminders(supabase,data,String(row.officer_id)); }
    catch(error:any){
      console.error('[MEETING REMINDER SYNC ERROR]',{meetingId:data.id,userId:row.officer_id,error:String(error?.message||error)});
      const rollback={date:row.date,time:row.time,duration_minutes:row.duration_minutes,purpose:row.purpose,outcome:row.outcome,next_action:row.next_action};
      await supabase.from('meetings').update(rollback).eq('id',data.id).eq('officer_id',row.officer_id);
      return res.status(500).json({error:'The meeting and its notifications could not be rescheduled. Your previous schedule was kept; please try again.'});
    }
    return res.json(mapMeetingRow(data));
  });
  app.delete('/api/crm/meetings/:id', async (req,res)=>{ const user=userOf(req); const {data:row}=await supabase.from('meetings').select('id,officer_id').eq('id',req.params.id).maybeSingle(); if(!row)return res.status(404).json({error:'Meeting not found.'}); if(!user?.isAdmin&&row.officer_id!==user?.userId)return res.status(403).json({error:'Access denied.'}); const {error}=await supabase.from('meetings').delete().eq('id',req.params.id); if(error)return res.status(500).json({error:'Unable to delete meeting.'}); return res.json({ok:true}); });

  app.get('/api/crm/tasks', async (req,res)=>{ const user=userOf(req); let q=supabase.from('tasks').select('*').order('due_date',{ascending:true}); if(!user?.isAdmin)q=q.eq('officer_id',user?.userId||''); const {data,error}=await q; if(error)return res.status(500).json({error:'Unable to load tasks.'}); return res.json((data||[]).map(mapTaskRow)); });
  app.post('/api/crm/tasks', async (req,res)=>{ const user=userOf(req); const prospectId=String(req.body?.prospectId||req.body?.prospect_id||''); if(prospectId&&!(await canUseProspect(supabase,user,prospectId)))return res.status(403).json({error:'Access denied.'}); const payload:any={id:String(req.body?.id||id('task')),prospect_id:prospectId||null,prospect_name:req.body?.prospectName||null,title:String(req.body?.title||'').trim(),due_date:req.body?.dueDate||req.body?.due_date,assigned_staff:req.body?.assignedStaff||user.fullName||user.email?.split('@')[0],officer_id:user.userId,priority:req.body?.priority||'Medium',is_completed:Boolean(req.body?.isCompleted??false),notes:req.body?.notes||null}; if(!payload.title||!payload.due_date)return res.status(400).json({error:'Task title and due date are required.'}); const {data,error}=await supabase.from('tasks').insert(payload).select('*').single(); if(error)return res.status(500).json({error:'Unable to create task.'}); return res.status(201).json(mapTaskRow(data)); });
  app.patch('/api/crm/tasks/:id', async (req,res)=>{ const user=userOf(req); const {data:row}=await supabase.from('tasks').select('*').eq('id',req.params.id).maybeSingle(); if(!row)return res.status(404).json({error:'Task not found.'}); if(!user?.isAdmin&&row.officer_id!==user?.userId)return res.status(403).json({error:'Access denied.'}); const map:any={title:'title',dueDate:'due_date',assignedStaff:'assigned_staff',priority:'priority',isCompleted:'is_completed',notes:'notes'}; const patch:any={}; Object.entries(map).forEach(([k,v])=>{if(req.body?.[k]!==undefined)patch[v as string]=req.body[k]}); const {data,error}=await supabase.from('tasks').update(patch).eq('id',req.params.id).select('*').single(); if(error)return res.status(500).json({error:'Unable to update task.'}); return res.json(mapTaskRow(data)); });
  app.delete('/api/crm/tasks/:id', async (req,res)=>{ const user=userOf(req); const {data:row}=await supabase.from('tasks').select('id,officer_id').eq('id',req.params.id).maybeSingle(); if(!row)return res.status(404).json({error:'Task not found.'}); if(!user?.isAdmin&&row.officer_id!==user?.userId)return res.status(403).json({error:'Access denied.'}); const {error}=await supabase.from('tasks').delete().eq('id',req.params.id); if(error)return res.status(500).json({error:'Unable to delete task.'}); return res.json({ok:true}); });
}
