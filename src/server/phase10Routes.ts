import type { Express, Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

function actor(req: Request): any { return (req as any).user || null; }
function clean(value: unknown, max: number): string { return String(value || '').trim().slice(0, max); }

async function ticketVisible(supabase: SupabaseClient, id: string, user: any) {
  let query = supabase.from('support_tickets').select('*').eq('id', id);
  if (!user.isAdmin) query = query.eq('created_by', user.userId);
  return query.maybeSingle();
}

export function registerPhase10Routes(app: Express, supabase: SupabaseClient) {
  app.get('/api/health', (_req, res) => res.setHeader('Cache-Control', 'no-store').status(200).json({ status: 'ok', service: 'spip', time: new Date().toISOString() }));

  app.get('/api/support/tickets', async (req, res) => {
    const user = actor(req);
    let query = supabase.from('support_tickets').select('*, support_ticket_messages(*)').order('updated_at', { ascending: false }).limit(100);
    if (!user.isAdmin) query = query.eq('created_by', user.userId);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: 'Support tickets could not be loaded.' });
    return res.json(data || []);
  });

  app.post('/api/support/tickets', async (req, res) => {
    const user = actor(req);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('created_by', user.userId).gte('created_at', oneHourAgo);
    if (countError) return res.status(503).json({ error: 'Support request limits could not be verified. Please retry.' });
    if ((count || 0) >= 5) return res.status(429).json({ error: 'You can submit up to five support requests per hour.' });
    const subject = clean(req.body?.subject, 140);
    const description = clean(req.body?.description, 4000);
    const allowed = new Set(['TECHNICAL', 'ACCESS', 'DATA', 'COPILOT', 'EXPORT', 'OTHER']);
    const category = allowed.has(req.body?.category) ? req.body.category : 'OTHER';
    if (subject.length < 4 || description.length < 10) return res.status(400).json({ error: 'Enter a clear subject and at least 10 characters of detail.' });
    const { data, error } = await supabase.from('support_tickets').insert({
      created_by: user.userId,
      requester_name: clean(user.fullName, 160),
      requester_email: clean(user.email, 320).toLowerCase(),
      subject,
      description,
      category
    }).select().single();
    if (error) return res.status(500).json({ error: 'The support request could not be submitted.' });
    console.log(JSON.stringify({ level: 'info', event: 'support_ticket_created', ticketId: data.id, userId: user.userId }));
    return res.status(201).json(data);
  });

  app.post('/api/support/tickets/:id/replies', async (req, res) => {
    const user = actor(req);
    const { data: ticket } = await ticketVisible(supabase, req.params.id, user);
    if (!ticket) return res.status(404).json({ error: 'Support ticket not found.' });
    const body = clean(req.body?.body, 4000);
    if (!body) return res.status(400).json({ error: 'Enter a reply.' });
    if (ticket.status === 'CLOSED' && !user.isAdmin) return res.status(409).json({ error: 'This ticket is closed. Create a new request if you still need help.' });
    const { data, error } = await supabase.from('support_ticket_messages').insert({ ticket_id: ticket.id, author_id: user.userId, body, is_admin_reply: Boolean(user.isAdmin) }).select().single();
    if (error) return res.status(500).json({ error: 'The reply could not be sent.' });
    await supabase.from('support_tickets').update({ status: user.isAdmin && ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status, assigned_to: user.isAdmin ? user.userId : ticket.assigned_to, updated_at: new Date().toISOString() }).eq('id', ticket.id);
    return res.status(201).json(data);
  });

  app.patch('/api/support/tickets/:id', async (req, res) => {
    const user = actor(req);
    if (!user.isAdmin) return res.status(403).json({ error: 'Administrator access is required.' });
    const allowed = new Set(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
    const status = clean(req.body?.status, 20);
    if (!allowed.has(status)) return res.status(400).json({ error: 'Invalid ticket status.' });
    const { data, error } = await supabase.from('support_tickets').update({ status, assigned_to: user.userId, updated_at: new Date().toISOString(), resolved_at: status === 'RESOLVED' || status === 'CLOSED' ? new Date().toISOString() : null }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: 'The ticket status could not be updated.' });
    return res.json(data);
  });
}
