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

export function registerPhase3CrudRoutes(app: Express, supabase: SupabaseClient) {
  app.get('/api/crm/contacts', async (req, res) => {
    try {
      const user = userOf(req); const ids = await ownedProspectIds(supabase, user);
      if (!user?.isAdmin && ids.length === 0) return res.json([]);
      let q = supabase.from('contacts').select('*').order('created_at', { ascending: false });
      if (!user?.isAdmin) q = q.in('prospect_id', ids);
      const { data, error } = await q; if (error) throw error; return res.json(data || []);
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
    if (error) return res.status(500).json({ error: 'Unable to add contact.' }); return res.status(201).json(data);
  });

  app.patch('/api/crm/contacts/:id', async (req, res) => {
    const user = userOf(req); const { data: row } = await supabase.from('contacts').select('*').eq('id', req.params.id).maybeSingle();
    if (!row) return res.status(404).json({ error: 'Contact not found.' });
    if (!(await canUseProspect(supabase, user, row.prospect_id))) return res.status(403).json({ error: 'Access denied.' });
    const map: any = { fullName:'full_name', position:'position', department:'department', email:'email', phone:'phone', linkedin:'linkedin', influenceLevel:'influence_level', isDecisionMaker:'is_decision_maker', notes:'notes', validationLevel:'validation_level' };
    const patch:any = {}; Object.entries(map).forEach(([k,v]) => { if (req.body?.[k] !== undefined) patch[v as string] = req.body[k]; });
    const { data, error } = await supabase.from('contacts').update(patch).eq('id', req.params.id).select('*').single();
    if (error) return res.status(500).json({ error: 'Unable to update contact.' }); return res.json(data);
  });

  app.delete('/api/crm/contacts/:id', async (req, res) => {
    const user = userOf(req); const { data: row } = await supabase.from('contacts').select('id, prospect_id').eq('id', req.params.id).maybeSingle();
    if (!row) return res.status(404).json({ error: 'Contact not found.' });
    if (!(await canUseProspect(supabase, user, row.prospect_id))) return res.status(403).json({ error: 'Access denied.' });
    const { error } = await supabase.from('contacts').delete().eq('id', req.params.id); if (error) return res.status(500).json({ error: 'Unable to delete contact.' }); return res.json({ ok:true });
  });

  app.get('/api/crm/activities', async (req, res) => {
    const user = userOf(req); let q = supabase.from('activities').select('*').order('date', { ascending:false }); if (!user?.isAdmin) q = q.eq('officer_id', user?.userId || '');
    const { data, error } = await q; if (error) return res.status(500).json({ error:'Unable to load activities.' }); return res.json(data || []);
  });
  app.post('/api/crm/activities', async (req, res) => {
    const user = userOf(req); const prospectId = String(req.body?.prospectId || req.body?.prospect_id || ''); if (!prospectId || !(await canUseProspect(supabase,user,prospectId))) return res.status(403).json({error:'Access denied.'});
    const d = new Date(); const payload:any = { id:String(req.body?.id || id('activity')), prospect_id:prospectId, prospect_name:req.body?.prospectName || null, date:req.body?.date || d.toISOString().slice(0,10), time:req.body?.time || d.toTimeString().slice(0,5), officer_id:user.userId, officer_name:user.fullName || user.email?.split('@')[0], activity_type:req.body?.activityType || req.body?.activity_type || 'Note', outcome:req.body?.outcome || null, notes:req.body?.notes || null, status:req.body?.status || 'Completed', created_at:now() };
    const {data,error}=await supabase.from('activities').insert(payload).select('*').single(); if(error)return res.status(500).json({error:'Unable to log activity.'}); return res.status(201).json(data);
  });
  app.patch('/api/crm/activities/:id', async (req,res)=>{ const user=userOf(req); const {data:row}=await supabase.from('activities').select('*').eq('id',req.params.id).maybeSingle(); if(!row)return res.status(404).json({error:'Activity not found.'}); if(!user?.isAdmin && row.officer_id!==user?.userId)return res.status(403).json({error:'Access denied.'}); const patch:any={}; const map:any={activityType:'activity_type',outcome:'outcome',notes:'notes',status:'status',date:'date',time:'time'}; Object.entries(map).forEach(([k,v])=>{if(req.body?.[k]!==undefined)patch[v as string]=req.body[k]}); const {data,error}=await supabase.from('activities').update(patch).eq('id',req.params.id).select('*').single(); if(error)return res.status(500).json({error:'Unable to update activity.'}); return res.json(data); });
  app.delete('/api/crm/activities/:id', async (req,res)=>{ const user=userOf(req); const {data:row}=await supabase.from('activities').select('id,officer_id').eq('id',req.params.id).maybeSingle(); if(!row)return res.status(404).json({error:'Activity not found.'}); if(!user?.isAdmin&&row.officer_id!==user?.userId)return res.status(403).json({error:'Access denied.'}); const {error}=await supabase.from('activities').delete().eq('id',req.params.id); if(error)return res.status(500).json({error:'Unable to delete activity.'}); return res.json({ok:true}); });

  app.get('/api/crm/meetings', async (req,res)=>{ const user=userOf(req); let q=supabase.from('meetings').select('*').order('date',{ascending:true}); if(!user?.isAdmin)q=q.eq('officer_id',user?.userId||''); const {data,error}=await q; if(error)return res.status(500).json({error:'Unable to load meetings.'}); return res.json(data||[]); });
  app.post('/api/crm/meetings', async (req,res)=>{ const user=userOf(req); const prospectId=String(req.body?.prospectId||req.body?.prospect_id||''); if(!prospectId||!(await canUseProspect(supabase,user,prospectId)))return res.status(403).json({error:'Access denied.'}); const payload:any={id:String(req.body?.id||id('meeting')),prospect_id:prospectId,prospect_name:req.body?.prospectName||null,officer_id:user.userId,officer_name:user.fullName||user.email?.split('@')[0],date:req.body?.date,time:req.body?.time,duration_minutes:Number(req.body?.durationMinutes||45),purpose:req.body?.purpose||'Client meeting',outcome:req.body?.outcome||null,next_action:req.body?.nextAction||null,created_at:now()}; if(!payload.date||!payload.time)return res.status(400).json({error:'Meeting date and time are required.'}); const {data,error}=await supabase.from('meetings').insert(payload).select('*').single(); if(error)return res.status(500).json({error:'Unable to schedule meeting.'}); return res.status(201).json(data); });
  app.patch('/api/crm/meetings/:id', async (req,res)=>{ const user=userOf(req); const {data:row}=await supabase.from('meetings').select('*').eq('id',req.params.id).maybeSingle(); if(!row)return res.status(404).json({error:'Meeting not found.'}); if(!user?.isAdmin&&row.officer_id!==user?.userId)return res.status(403).json({error:'Access denied.'}); const map:any={date:'date',time:'time',durationMinutes:'duration_minutes',purpose:'purpose',outcome:'outcome',nextAction:'next_action'}; const patch:any={}; Object.entries(map).forEach(([k,v])=>{if(req.body?.[k]!==undefined)patch[v as string]=req.body[k]}); const {data,error}=await supabase.from('meetings').update(patch).eq('id',req.params.id).select('*').single(); if(error)return res.status(500).json({error:'Unable to update meeting.'}); return res.json(data); });
  app.delete('/api/crm/meetings/:id', async (req,res)=>{ const user=userOf(req); const {data:row}=await supabase.from('meetings').select('id,officer_id').eq('id',req.params.id).maybeSingle(); if(!row)return res.status(404).json({error:'Meeting not found.'}); if(!user?.isAdmin&&row.officer_id!==user?.userId)return res.status(403).json({error:'Access denied.'}); const {error}=await supabase.from('meetings').delete().eq('id',req.params.id); if(error)return res.status(500).json({error:'Unable to delete meeting.'}); return res.json({ok:true}); });

  app.get('/api/crm/tasks', async (req,res)=>{ const user=userOf(req); let q=supabase.from('tasks').select('*').order('due_date',{ascending:true}); if(!user?.isAdmin)q=q.eq('officer_id',user?.userId||''); const {data,error}=await q; if(error)return res.status(500).json({error:'Unable to load tasks.'}); return res.json(data||[]); });
  app.post('/api/crm/tasks', async (req,res)=>{ const user=userOf(req); const prospectId=String(req.body?.prospectId||req.body?.prospect_id||''); if(prospectId&&!(await canUseProspect(supabase,user,prospectId)))return res.status(403).json({error:'Access denied.'}); const payload:any={id:String(req.body?.id||id('task')),prospect_id:prospectId||null,prospect_name:req.body?.prospectName||null,title:String(req.body?.title||'').trim(),due_date:req.body?.dueDate||req.body?.due_date,assigned_staff:req.body?.assignedStaff||user.fullName||user.email?.split('@')[0],officer_id:user.userId,priority:req.body?.priority||'Medium',is_completed:Boolean(req.body?.isCompleted??false),notes:req.body?.notes||null}; if(!payload.title||!payload.due_date)return res.status(400).json({error:'Task title and due date are required.'}); const {data,error}=await supabase.from('tasks').insert(payload).select('*').single(); if(error)return res.status(500).json({error:'Unable to create task.'}); return res.status(201).json(data); });
  app.patch('/api/crm/tasks/:id', async (req,res)=>{ const user=userOf(req); const {data:row}=await supabase.from('tasks').select('*').eq('id',req.params.id).maybeSingle(); if(!row)return res.status(404).json({error:'Task not found.'}); if(!user?.isAdmin&&row.officer_id!==user?.userId)return res.status(403).json({error:'Access denied.'}); const map:any={title:'title',dueDate:'due_date',assignedStaff:'assigned_staff',priority:'priority',isCompleted:'is_completed',notes:'notes'}; const patch:any={}; Object.entries(map).forEach(([k,v])=>{if(req.body?.[k]!==undefined)patch[v as string]=req.body[k]}); const {data,error}=await supabase.from('tasks').update(patch).eq('id',req.params.id).select('*').single(); if(error)return res.status(500).json({error:'Unable to update task.'}); return res.json(data); });
  app.delete('/api/crm/tasks/:id', async (req,res)=>{ const user=userOf(req); const {data:row}=await supabase.from('tasks').select('id,officer_id').eq('id',req.params.id).maybeSingle(); if(!row)return res.status(404).json({error:'Task not found.'}); if(!user?.isAdmin&&row.officer_id!==user?.userId)return res.status(403).json({error:'Access denied.'}); const {error}=await supabase.from('tasks').delete().eq('id',req.params.id); if(error)return res.status(500).json({error:'Unable to delete task.'}); return res.json({ok:true}); });
}
