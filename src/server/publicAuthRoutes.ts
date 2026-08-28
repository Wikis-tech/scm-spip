import type { Express } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

const requestAttempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function isCorporateEmail(email: string) {
  return /^[a-z0-9._-]+@scmcapitalng[.]com$/.test(email);
}

function cleanText(value: unknown, max: number) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function rateLimited(key: string) {
  const now = Date.now();
  const current = requestAttempts.get(key);
  if (!current || current.resetAt <= now) {
    requestAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  requestAttempts.set(key, current);
  return current.count > MAX_ATTEMPTS;
}

async function createPendingProfile(
  supabase: SupabaseClient,
  values: { userId: string; email: string; fullName: string; department: string; jobTitle: string | null },
) {
  return supabase.from('profiles').upsert({
    id: values.userId,
    full_name: values.fullName,
    email: values.email,
    permission_level: 'STAFF',
    department: values.department,
    job_title: values.jobTitle,
    status: 'PENDING',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

async function recoverExistingRequest(
  supabase: SupabaseClient,
  values: { email: string; fullName: string; department: string; jobTitle: string | null },
) {
  const { data: profile, error: profileLookupError } = await supabase
    .from('profiles')
    .select('id, status, permission_level')
    .eq('email', values.email)
    .maybeSingle();

  if (profileLookupError) throw profileLookupError;
  if (profile?.id) {
    const status = String(profile.status || '').toUpperCase();
    if (status === 'PENDING') {
      return { code: 200, body: { ok: true, status: 'PENDING', message: 'Your access request is already pending administrator approval.' } };
    }
    if (status === 'ACTIVE') {
      return { code: 409, body: { error: 'An active SPIP account already exists for this corporate email. Use Sign in or Forgot password.' } };
    }
    return { code: 403, body: { error: `This SPIP account is ${status.toLowerCase() || 'not active'}. Contact an administrator.` } };
  }

  // Previous versions could create the Supabase Auth identity before profile creation failed.
  // Recover that orphan without changing its password or granting access. The account remains
  // STAFF/PENDING and therefore cannot enter SPIP until an administrator approves it.
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const existingAuthUser = listed?.users?.find((user: any) => normalizeEmail(user.email) === values.email);
  if (!existingAuthUser?.id) return null;

  const { error: repairError } = await createPendingProfile(supabase, {
    userId: existingAuthUser.id,
    email: values.email,
    fullName: values.fullName,
    department: values.department,
    jobTitle: values.jobTitle,
  });
  if (repairError) throw repairError;

  return {
    code: 200,
    body: {
      ok: true,
      status: 'PENDING',
      message: 'Your previous access request has been repaired and is now pending administrator approval.',
    },
  };
}

/**
 * Public corporate access-request endpoint.
 *
 * It uses the server-side Supabase administrator client so profile creation is not
 * dependent on an Auth database trigger. It never returns a session: every new or
 * recovered employee identity is STAFF/PENDING until explicitly approved.
 */
export function registerPublicAuthRoutes(app: Express, supabase: SupabaseClient) {
  app.post('/api/auth/register-v2', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const fullName = cleanText(req.body?.fullName, 150);
    const department = cleanText(req.body?.department, 120) || 'Asset Management';
    const jobTitle = cleanText(req.body?.jobTitle, 120) || null;
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();

    if (rateLimited(`${ip}:${email}`)) {
      return res.status(429).json({ error: 'Too many access requests. Please wait 15 minutes and try again.' });
    }
    if (fullName.length < 2) return res.status(400).json({ error: 'Enter your full name.' });
    if (!isCorporateEmail(email)) {
      return res.status(400).json({ error: 'Registration is restricted to @scmcapitalng.com corporate email addresses.' });
    }
    if (password.length < 12) return res.status(400).json({ error: 'Use a password with at least 12 characters.' });

    try {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          department,
          job_title: jobTitle,
        },
      });

      if (createError || !created.user?.id) {
        const message = String(createError?.message || '').toLowerCase();
        if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
          const recovered = await recoverExistingRequest(supabase, { email, fullName, department, jobTitle });
          if (recovered) return res.status(recovered.code).json(recovered.body);
          return res.status(409).json({ error: 'An SPIP account already exists for this corporate email.' });
        }
        console.error('[SPIP SIGNUP] Auth identity creation failed:', createError?.message || createError);
        return res.status(500).json({ error: 'Unable to create the access request. Please try again.' });
      }

      const userId = created.user.id;
      const { error: profileError } = await createPendingProfile(supabase, {
        userId,
        email,
        fullName,
        department,
        jobTitle,
      });

      if (profileError) {
        console.error('[SPIP SIGNUP] Profile creation failed:', profileError.message);
        await supabase.auth.admin.deleteUser(userId).catch(() => undefined);
        return res.status(500).json({ error: 'Unable to create the staff profile. The request was rolled back.' });
      }

      return res.status(201).json({
        ok: true,
        status: 'PENDING',
        message: 'Access request submitted. An administrator must approve the account before it can be used.',
      });
    } catch (error: any) {
      console.error('[SPIP SIGNUP] Unexpected registration failure:', error?.message || error);
      return res.status(500).json({ error: 'Unable to complete this request. Please try again.' });
    }
  });
}
