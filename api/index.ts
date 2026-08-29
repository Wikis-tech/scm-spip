import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const serverModule = require('../dist/server.cjs');
const app = serverModule.default || serverModule;

const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const supabaseServerKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim() || '';
const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabaseServerKey || 'missing-server-key',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function ensureLegacyUserDirectoryEntry(req: any) {
  const authorization = String(req.headers?.authorization || '');
  if (!authorization.startsWith('Bearer ')) return;
  if (!supabaseUrl || !supabaseServerKey) return;

  try {
    const token = authorization.slice(7).trim();
    if (!token) return;

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const authUser = authData?.user;
    if (authError || !authUser?.id || !authUser.email) return;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, permission_level, department, status, avatar_url')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError || !profile || profile.status !== 'ACTIVE') return;

    const legacyRole = profile.permission_level === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : profile.permission_level === 'HOD_ADMIN'
        ? 'Admin'
        : 'Business Development Officer';

    const { error: syncError } = await supabase.from('users').upsert({
      id: profile.id,
      full_name: profile.full_name || authUser.email.split('@')[0],
      email: String(profile.email || authUser.email).toLowerCase(),
      role: legacyRole,
      department: profile.department || 'Asset Management',
      avatar_url: profile.avatar_url || null,
      status: 'Active',
    }, { onConflict: 'id' });

    if (syncError) {
      console.error('[SPIP USER SYNC] Unable to synchronize authenticated profile into legacy user directory:', syncError.message || syncError);
    }
  } catch (error: any) {
    // Fail open for the compatibility sync only. The application still performs its own
    // Supabase JWT/profile authentication before serving protected API data.
    console.error('[SPIP USER SYNC] Compatibility synchronization failed:', error?.message || error);
  }
}

export default async function handler(req: any, res: any) {
  const rawPath = req.query?.path;
  const path = Array.isArray(rawPath) ? rawPath.join('/') : String(rawPath || '').replace(/^\/+/, '');

  // Phase 1 uses Supabase profiles as the authentication authority, while several
  // established CRM tables still reference public.users through foreign keys.
  // Keep the authenticated profile mirrored into that legacy directory before CRM,
  // calendar, task or notification requests reach the Express application.
  await ensureLegacyUserDirectoryEntry(req);

  if (req.query && Object.prototype.hasOwnProperty.call(req.query, 'path')) {
    delete req.query.path;
  }

  const query = new URLSearchParams();
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) {
        for (const item of value) query.append(key, String(item));
      } else if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }
  }

  req.url = `/api${path ? `/${path}` : ''}${query.toString() ? `?${query.toString()}` : ''}`;
  return app(req, res);
}
