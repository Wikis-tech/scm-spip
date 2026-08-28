import type { Express } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const requestAttempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const AUTH_SMOKE_PATH = '/api/qa/auth-smoke-9f4c2b7d6a';

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

function makePublicSignupClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();

  if (!url || !key) {
    throw new Error('Supabase signup configuration is incomplete.');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
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

async function submitAccessRequest(
  adminClient: SupabaseClient,
  values: { email: string; password: string; fullName: string; department: string; jobTitle: string | null },
) {
  const recoveredBeforeCreate = await recoverExistingRequest(adminClient, values);
  if (recoveredBeforeCreate) return recoveredBeforeCreate;

  const signupClient = makePublicSignupClient();
  const { data: created, error: createError } = await signupClient.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: {
        full_name: values.fullName,
        department: values.department,
        job_title: values.jobTitle,
      },
    },
  });

  if (createError || !created.user?.id) {
    const message = String(createError?.message || createError || '').trim();
    const lower = message.toLowerCase();
    if (lower.includes('already') || lower.includes('registered') || lower.includes('exists')) {
      const recovered = await recoverExistingRequest(adminClient, values);
      if (recovered) return recovered;
      return { code: 409, body: { error: 'An SPIP account already exists for this corporate email.' } };
    }
    console.error('[SPIP SIGNUP] Supabase signUp failed:', {
      message: message || 'empty error',
      code: (createError as any)?.code || null,
      status: (createError as any)?.status || null,
    });
    return {
      code: 500,
      body: {
        error: 'Unable to create the access request.',
        detail: message || 'Supabase returned an empty signup error.',
      },
    };
  }

  const userId = created.user.id;
  const { data: profile, error: profileLookupError } = await adminClient
    .from('profiles')
    .select('id, status, permission_level')
    .eq('id', userId)
    .maybeSingle();

  if (profileLookupError) {
    console.error('[SPIP SIGNUP] Profile lookup after signup failed:', profileLookupError.message);
  }

  if (!profile?.id) {
    const { error: profileError } = await createPendingProfile(adminClient, {
      userId,
      email: values.email,
      fullName: values.fullName,
      department: values.department,
      jobTitle: values.jobTitle,
    });
    if (profileError) {
      console.error('[SPIP SIGNUP] Profile creation failed:', profileError.message);
      await adminClient.auth.admin.deleteUser(userId).catch(() => undefined);
      return { code: 500, body: { error: 'Unable to create the staff profile. The request was rolled back.' } };
    }
  }

  return {
    code: 201,
    body: {
      ok: true,
      status: 'PENDING',
      message: 'Access request submitted. An administrator must approve the account before it can be used.',
    },
  };
}

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
      const result = await submitAccessRequest(supabase, { email, password, fullName, department, jobTitle });
      return res.status(result.code).json(result.body);
    } catch (error: any) {
      console.error('[SPIP SIGNUP] Unexpected registration failure:', error?.message || error);
      return res.status(500).json({
        error: 'Unable to complete this request.',
        detail: error?.message || 'Unexpected signup failure.',
      });
    }
  });

  // Temporary production smoke test. It creates a unique QA user, verifies the trigger-created
  // STAFF/PENDING profile, then deletes the QA identity again. This route is removed after validation.
  app.get(AUTH_SMOKE_PATH, async (_req, res) => {
    const stamp = Date.now();
    const email = `spip.qa.${stamp}@scmcapitalng.com`;
    const password = `SPIP-QA-${stamp}-Aa1!`;
    let userId = '';
    try {
      const result = await submitAccessRequest(supabase, {
        email,
        password,
        fullName: 'SPIP QA Smoke Test',
        department: 'Asset Management',
        jobTitle: 'QA',
      });

      const { data: listed } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId = listed?.users?.find((user: any) => normalizeEmail(user.email) === email)?.id || '';
      const { data: profile } = userId
        ? await supabase.from('profiles').select('id, email, status, permission_level').eq('id', userId).maybeSingle()
        : { data: null as any };

      const pass = result.code === 201 && Boolean(userId) && profile?.status === 'PENDING' && profile?.permission_level === 'STAFF';
      return res.status(pass ? 200 : 500).json({
        pass,
        signupStatus: result.code,
        authUserCreated: Boolean(userId),
        profileCreated: Boolean(profile?.id),
        profileStatus: profile?.status || null,
        permissionLevel: profile?.permission_level || null,
        detail: (result.body as any)?.detail || (result.body as any)?.error || null,
      });
    } catch (error: any) {
      return res.status(500).json({ pass: false, detail: error?.message || String(error) });
    } finally {
      if (userId) await supabase.auth.admin.deleteUser(userId).catch(() => undefined);
    }
  });
}
