import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { registerMicrosoft365PublicRoutes, registerMicrosoft365Routes } from '../../src/server/phase5MicrosoftRoutes.ts';

const app = express();
app.use(express.json({ limit: '256kb' }));

const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
const serverKey = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  serverKey || 'missing-server-key',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// OAuth callback is intentionally public, but protected by a short-lived, one-use PKCE state
// that is created only for an authenticated ACTIVE SPIP user.
registerMicrosoft365PublicRoutes(app, supabase);

app.use(async (req: any, res, next) => {
  const authorization = String(req.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required.' });
  const token = authorization.slice(7).trim();
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const authUser = authData?.user;
    if (authError || !authUser?.id || !authUser.email) return res.status(401).json({ error: 'Your session is invalid or has expired.' });
    const email = authUser.email.trim().toLowerCase();
    if (!email.endsWith('@scmcapitalng.com')) return res.status(403).json({ error: 'SCM Capital corporate access is required.' });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,full_name,email,permission_level,department,status')
      .eq('id', authUser.id)
      .maybeSingle();
    if (profileError || !profile || profile.status !== 'ACTIVE') return res.status(403).json({ error: 'Your SPIP account is not active.' });

    req.user = {
      userId: authUser.id,
      email,
      fullName: profile.full_name,
      department: profile.department || 'Asset Management',
      permissionLevel: profile.permission_level,
      isSuperAdmin: profile.permission_level === 'SUPER_ADMIN',
      isAdmin: profile.permission_level === 'SUPER_ADMIN' || profile.permission_level === 'HOD_ADMIN',
    };
    return next();
  } catch {
    return res.status(503).json({ error: 'Authentication service is temporarily unavailable.' });
  }
});

registerMicrosoft365Routes(app, supabase);

export default app;