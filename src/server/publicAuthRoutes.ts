import type { Express } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

const SCM_DOMAIN = '@scmcapitalng.com';

function isScmEmail(value: unknown): boolean {
  const email = String(value || '').trim().toLowerCase();
  return /^[a-z0-9._-]+@scmcapitalng[.]com$/.test(email);
}

function normalizeError(error: any): string {
  const message = String(error?.message || error?.error_description || error?.error || '').trim();
  if (!message || message === '[object Object]' || message === '{}') {
    return 'Unable to create the account request. Please try again or contact a SPIP administrator.';
  }
  if (/already|registered|exists/i.test(message)) return 'An account already exists for this corporate email.';
  if (/rate/i.test(message)) return 'Too many access requests. Please wait a few minutes and try again.';
  return message;
}

export function registerPublicAuthRoutes(app: Express, supabase: SupabaseClient) {
  app.post('/api/auth/register-v2', async (req, res) => {
    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const department = String(req.body?.department || 'Asset Management').trim() || 'Asset Management';
    const jobTitle = String(req.body?.jobTitle || '').trim();

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, corporate email and password are required.' });
    }
    if (!isScmEmail(email)) {
      return res.status(400).json({ error: `Registration is restricted to ${SCM_DOMAIN} corporate email addresses.` });
    }
    if (password.length < 12) {
      return res.status(400).json({ error: 'Use a password with at least 12 characters.' });
    }

    let createdUserId: string | null = null;
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          department,
          job_title: jobTitle || null,
        },
      });

      if (error || !data.user?.id) {
        return res.status(400).json({ error: normalizeError(error) });
      }
      createdUserId = data.user.id;

      // The database trigger normally creates this row. Upsert defensively so a missing
      // trigger never leaves an Auth identity without a pending SPIP profile.
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        permission_level: 'STAFF',
        department,
        job_title: jobTitle || null,
        status: 'PENDING',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (profileError) {
        await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
        return res.status(500).json({
          error: 'Your authentication account could not be linked to SPIP. The request was rolled back; please try again.'
        });
      }

      return res.status(201).json({
        ok: true,
        status: 'PENDING',
        message: 'Access request submitted. A SPIP administrator must approve your account before you can sign in.',
      });
    } catch (error: any) {
      if (createdUserId) {
        await supabase.auth.admin.deleteUser(createdUserId).catch(() => undefined);
      }
      console.error('[SPIP AUTH] Registration request failed:', normalizeError(error));
      return res.status(500).json({ error: normalizeError(error) });
    }
  });
}
