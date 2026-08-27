import fs from 'node:fs';

const serverPath = 'server.ts';
let src = fs.readFileSync(serverPath, 'utf8');

const replaceBetween = (input, startMarker, endMarker, replacement) => {
  const start = input.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing start marker: ${startMarker}`);
  const end = input.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Missing end marker: ${endMarker}`);
  return input.slice(0, start) + replacement + input.slice(end);
};

if (!src.includes('import { createClient as createSupabaseClient } from "@supabase/supabase-js";')) {
  src = src.replace(
    'import dotenv from "dotenv";\n',
    'import dotenv from "dotenv";\nimport { createClient as createSupabaseClient } from "@supabase/supabase-js";\n'
  );
}

src = replaceBetween(
  src,
  'const initialUsers: any[] = [',
  'const initialProspects: Prospect[] = [];',
  `const initialUsers: any[] = [];\n\n`
);

src = replaceBetween(
  src,
  '// Helper to extract user identity and roles for strict user isolation and CRM security policies',
  '// Guarantees that any assigned user ID or owner ID exists in the Postgres users table to satisfy foreign key constraints',
  `// Authenticated identity is established exclusively by the Supabase JWT middleware below.\nfunction getRequestUser(req: any) {\n  if (req?.user) return req.user;\n  return {\n    userId: null,\n    role: null,\n    email: '',\n    isAdmin: false,\n    status: 'UNAUTHENTICATED',\n    isSuperAdmin: false,\n    permissionLevel: null\n  };\n}\n\n`
);

src = replaceBetween(
  src,
  '// Guarantees that any assigned user ID or owner ID exists in the Postgres users table to satisfy foreign key constraints',
  '// System logging helper for auditing and security tracking',
  `// Resolve only users that already exist in the SCM user directory. Never auto-provision accounts.\nasync function ensureValidUser(requestedUserId?: string | null, requestedEmail?: string | null, requestedName?: string | null) {\n  const targetId = requestedUserId ? String(requestedUserId).trim() : null;\n  const targetEmail = requestedEmail ? String(requestedEmail).trim().toLowerCase() : null;\n\n  if (!targetId && !targetEmail) {\n    throw new Error('A valid assigned SCM user is required.');\n  }\n\n  const found = targetId\n    ? await db.select().from(users).where(eq(users.id, targetId))\n    : await db.select().from(users).where(eq(users.email, targetEmail!));\n\n  if (found.length === 0) {\n    throw new Error('Assigned SCM user does not exist or has not been activated.');\n  }\n\n  return { id: found[0].id, fullName: found[0].fullName, email: found[0].email };\n}\n\n`
);

const middlewareStart = 'app.use(async (req, res, next) => {';
const middlewareEnd = 'const PORT = 3000;';
const secureMiddleware = `const supabaseUrl = process.env.SUPABASE_URL?.trim();\nconst supabaseServerKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();\n\nif (!supabaseUrl || !supabaseServerKey) {\n  console.warn('[SPIP SECURITY] Server-side Supabase configuration is incomplete.');\n}\n\nconst supabaseServer = createSupabaseClient(\n  supabaseUrl || 'https://invalid.supabase.co',\n  supabaseServerKey || 'missing-server-key',\n  { auth: { persistSession: false, autoRefreshToken: false } }\n);\n\nconst PUBLIC_API_PATHS = new Set([\n  '/api/auth/config',\n  '/api/auth/login',\n  '/api/auth/register',\n  '/api/auth/verify',\n  '/api/auth/forgot-password',\n  '/api/auth/reset-password'\n]);\n\napp.use(async (req, res, next) => {\n  if (!req.path.startsWith('/api')) return next();\n  if (PUBLIC_API_PATHS.has(req.path)) return next();\n\n  const authorization = req.headers.authorization || '';\n  if (!authorization.startsWith('Bearer ')) {\n    return res.status(401).json({ error: 'Authentication required.' });\n  }\n\n  const token = authorization.slice(7).trim();\n  if (!token) return res.status(401).json({ error: 'Authentication required.' });\n\n  try {\n    const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);\n    const authUser = authData?.user;\n    if (authError || !authUser?.id || !authUser.email) {\n      return res.status(401).json({ error: 'Your session is invalid or has expired.' });\n    }\n\n    const email = authUser.email.trim().toLowerCase();\n    if (!isValidScmEmail(email)) {\n      return res.status(403).json({ error: 'SPIP access requires an SCM Capital corporate email.' });\n    }\n\n    const { data: profile, error: profileError } = await supabaseServer\n      .from('profiles')\n      .select('id, full_name, email, permission_level, job_title, department, status, avatar_url')\n      .eq('id', authUser.id)\n      .single();\n\n    if (profileError || !profile) {\n      return res.status(403).json({ error: 'Your SPIP profile is unavailable. Contact an administrator.' });\n    }\n\n    if (profile.status !== 'ACTIVE') {\n      return res.status(403).json({\n        error: profile.status === 'PENDING'\n          ? 'Your SPIP access request is pending administrator approval.'\n          : \`Your SPIP account is \${String(profile.status).toLowerCase()}. Contact an administrator.\`\n      });\n    }\n\n    const permissionLevel = profile.permission_level;\n    const isSuperAdmin = permissionLevel === 'SUPER_ADMIN';\n    const isAdmin = isSuperAdmin || permissionLevel === 'HOD_ADMIN';\n    const legacyRole = isSuperAdmin ? 'SUPER_ADMIN' : permissionLevel === 'HOD_ADMIN' ? 'Admin' : 'Business Development Officer';\n\n    try {\n      await db.insert(users).values({\n        id: authUser.id,\n        fullName: profile.full_name,\n        email,\n        role: legacyRole,\n        department: profile.department || 'Asset Management',\n        avatarUrl: profile.avatar_url || '',\n        status: 'Approved'\n      }).onConflictDoUpdate({\n        target: users.id,\n        set: {\n          fullName: profile.full_name,\n          email,\n          role: legacyRole,\n          department: profile.department || 'Asset Management',\n          avatarUrl: profile.avatar_url || '',\n          status: 'Approved'\n        }\n      });\n    } catch (syncError: any) {\n      console.error('[SPIP SECURITY] Failed to synchronize authenticated profile:', syncError?.message || syncError);\n      return res.status(503).json({ error: 'SPIP database is temporarily unavailable.' });\n    }\n\n    (req as any).user = {\n      userId: authUser.id,\n      email,\n      role: legacyRole,\n      permissionLevel,\n      isAdmin,\n      isSuperAdmin,\n      status: 'ACTIVE',\n      fullName: profile.full_name,\n      department: profile.department || 'Asset Management',\n      avatarUrl: profile.avatar_url || ''\n    };\n\n    if (req.path === '/api/auth/me') {\n      await supabaseServer.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', authUser.id);\n      return res.json({\n        user: {\n          id: authUser.id,\n          fullName: profile.full_name,\n          email,\n          role: legacyRole,\n          permissionLevel,\n          department: profile.department || 'Asset Management',\n          avatarUrl: profile.avatar_url || '',\n          status: 'Active',\n          verified: true\n        }\n      });\n    }\n\n    return next();\n  } catch (error: any) {\n    console.error('[SPIP SECURITY] Authentication middleware failure:', error?.message || error);\n    return res.status(503).json({ error: 'Authentication service is temporarily unavailable.' });\n  }\n});\n\n`;

src = replaceBetween(src, middlewareStart, middlewareEnd, secureMiddleware);
src = src.replace('const PORT = 3000;', 'const PORT = Number(process.env.PORT || 3000);');

src = replaceBetween(
  src,
  'async function seedDefaultAdmins() {',
  '// In-Memory Workspace Storage Fallbacks',
  `async function seedDefaultAdmins() {\n  // Authentication identities are created only in Supabase Auth. No default users or passwords are seeded.\n  return;\n}\n\n`
);

src = replaceBetween(
  src,
  '// AUTHENTICATION',
  '// GOOGLE WORKSPACE API INTEGRATIONS',
  `// AUTHENTICATION\n\napp.get('/api/auth/config', (_req, res) => {\n  return res.json({\n    provider: 'supabase',\n    corporateDomain: 'scmcapitalng.com',\n    demoMode: false\n  });\n});\n\napp.post('/api/auth/logout', async (req, res) => {\n  const { userId } = getRequestUser(req);\n  if (userId) await logSystemEvent('User Logout', userId, 'Success', req);\n  return res.json({ success: true });\n});\n\nconst deprecatedAuthHandler = (_req: any, res: any) => res.status(410).json({\n  error: 'This legacy credential endpoint has been disabled. SPIP now uses Supabase Auth.'\n});\napp.post('/api/auth/login', deprecatedAuthHandler);\napp.post('/api/auth/register', deprecatedAuthHandler);\napp.post('/api/auth/verify', deprecatedAuthHandler);\napp.post('/api/auth/forgot-password', deprecatedAuthHandler);\napp.post('/api/auth/reset-password', deprecatedAuthHandler);\n\n`
);

const healthGuardMarker = '// API ROUTES\n\nlet isDatabaseHealthy = false;';
if (src.includes(healthGuardMarker)) {
  src = src.replace(
    healthGuardMarker,
    `// API ROUTES\n\nlet isDatabaseHealthy = false;\n\napp.use('/api', (req, res, next) => {\n  if (req.path.startsWith('/auth/')) return next();\n  if (process.env.NODE_ENV === 'production' && !isDatabaseHealthy) {\n    return res.status(503).json({ error: 'SPIP database is temporarily unavailable. No changes were saved.' });\n  }\n  return next();\n});`
  );
}

const oldFooter = `  app.listen(PORT, "0.0.0.0", () => {\n    console.log(\`SCM Prospect Intelligence Platform running at http://localhost:\${PORT}\`);\n    startAutoSubmissionScheduler();\n  });\n}\n\nstartServer();`;
const newFooter = `  app.listen(PORT, "0.0.0.0", () => {\n    console.log(\`SCM Prospect Intelligence Platform running at http://localhost:\${PORT}\`);\n    startAutoSubmissionScheduler();\n  });\n}\n\nif (!process.env.VERCEL) {\n  startServer();\n}\n\nexport default app;`;
if (!src.includes(oldFooter)) throw new Error('Could not locate server footer');
src = src.replace(oldFooter, newFooter);

fs.writeFileSync(serverPath, src);

const schemaPath = 'src/db/schema.ts';
let schema = fs.readFileSync(schemaPath, 'utf8');
schema = schema.replace("  password: text('password'),\n", '');
fs.writeFileSync(schemaPath, schema);

console.log('Phase 1 hardening transform applied successfully.');
