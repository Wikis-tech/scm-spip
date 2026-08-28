import type { Express } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

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

function getSupabaseAdminConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!url || !key) throw new Error('Supabase admin configuration is incomplete.');
  return { url: url.replace(/\/$/, ''), key };
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

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: values.email,
    password: values.password,
    email_confirm: true,
    user_metadata: {
      full_name: values.fullName,
      department: values.department,
      job_title: values.jobTitle,
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
    console.error('[SPIP SIGNUP] Auth admin createUser failed:', {
      message: message || 'empty error',
      code: (createError as any)?.code || null,
      status: (createError as any)?.status || null,
    });
    return {
      code: 500,
      body: {
        error: 'Unable to create the access request.',
        detail: message || 'Supabase returned an empty user-creation error.',
      },
    };
  }

  const userId = created.user.id;
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

  return {
    code: 201,
    body: {
      ok: true,
      status: 'PENDING',
      message: 'Access request submitted. An administrator must approve the account before it can be used.',
    },
  };
}

async function rawAdminCreateUser(values: { email: string; password: string }) {
  const { url, key } = getSupabaseAdminConfig();
  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: values.email,
      password: values.password,
      email_confirm: true,
      user_metadata: {
        full_name: 'SPIP QA Raw Auth Test',
        department: 'Asset Management',
        job_title: 'QA',
      },
    }),
  });
  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    body: text.slice(0, 2000),
    errorCode: response.headers.get('x-sb-error-code') || response.headers.get('sb-error-code') || null,
    requestId: response.headers.get('x-request-id') || response.headers.get('sb-request-id') || null,
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

  app.get(AUTH_SMOKE_PATH, async (_req, res) => {
    const stamp = Date.now();
    const email = `spip.qa.${stamp}@scmcapitalng.com`;
    const password = `SPIP-QA-${stamp}-Aa1!`;
    let userId = '';
    try {
      const raw = await rawAdminCreateUser({ email, password });
      console.error('[SPIP QA RAW AUTH]', raw);

      const { data: listed } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId = listed?.users?.find((user: any) => normalizeEmail(user.email) === email)?.id || '';

      if (!raw.ok) {
        return res.status(raw.status || 500).json({
          pass: false,
          rawStatus: raw.status,
          rawErrorCode: raw.errorCode,
          rawRequestId: raw.requestId,
          rawBody: raw.body,
          authUserCreated: Boolean(userId),
        });
      }

      if (!userId) {
        return res.status(500).json({ pass: false, rawStatus: raw.status, rawBody: raw.body, authUserCreated: false });
      }

      const { error: profileError } = await createPendingProfile(supabase, {
        userId,
        email,
        fullName: 'SPIP QA Raw Auth Test',
        department: 'Asset Management',
        jobTitle: 'QA',
      });
      if (profileError) {
        return res.status(500).json({ pass: false, rawStatus: raw.status, authUserCreated: true, profileError: profileError.message });
      }

      const { data: profile } = await supabase.from('profiles').select('id, status, permission_level').eq('id', userId).maybeSingle();
      const pass = profile?.status === 'PENDING' && profile?.permission_level === 'STAFF';
      return res.status(pass ? 200 : 500).json({
        pass,
        rawStatus: raw.status,
        authUserCreated: true,
        profileCreated: Boolean(profile?.id),
        profileStatus: profile?.status || null,
        permissionLevel: profile?.permission_level || null,
      });
    } catch (error: any) {
      return res.status(500).json({ pass: false, detail: error?.message || String(error) });
    } finally {
      if (userId) await supabase.auth.admin.deleteUser(userId).catch(() => undefined);
    }
  });
}
