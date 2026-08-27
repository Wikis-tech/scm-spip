import fs from 'node:fs';

const replaceBetween = (input, startMarker, endMarker, replacement) => {
  const start = input.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing start marker: ${startMarker}`);
  const end = input.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Missing end marker: ${endMarker}`);
  return input.slice(0, start) + replacement + input.slice(end);
};

// ----- server.ts -----
const serverPath = 'server.ts';
let server = fs.readFileSync(serverPath, 'utf8');

server = replaceBetween(
  server,
  'app.put("/api/admin/users/:id", async (req, res) => {',
  'app.delete("/api/admin/users/:id", async (req, res) => {',
  `app.put("/api/admin/users/:id", async (req, res) => {\n  res.setHeader("Content-Type", "application/json");\n  const { userId, isAdmin, isSuperAdmin } = getRequestUser(req);\n  if (!userId || !isAdmin) {\n    return res.status(403).json({ error: "Access denied. Administrator privileges required." });\n  }\n\n  const { id } = req.params;\n  const { fullName, role, department, status, password } = req.body || {};\n\n  if (password !== undefined) {\n    return res.status(400).json({\n      error: "Administrators cannot set user passwords. Use the secure Supabase password recovery flow."\n    });\n  }\n\n  try {\n    const { data: targetProfile, error: profileError } = await supabaseServer\n      .from('profiles')\n      .select('id, full_name, email, permission_level, department, status')\n      .eq('id', id)\n      .single();\n\n    if (profileError || !targetProfile) {\n      return res.status(404).json({ error: "User profile not found." });\n    }\n\n    const profileUpdates: any = { updated_at: new Date().toISOString() };\n    if (fullName !== undefined) profileUpdates.full_name = String(fullName).trim();\n    if (department !== undefined) profileUpdates.department = String(department).trim() || 'Asset Management';\n\n    if (status !== undefined) {\n      const statusMap: Record<string, string> = {\n        Approved: 'ACTIVE',\n        Active: 'ACTIVE',\n        ACTIVE: 'ACTIVE',\n        Pending: 'PENDING',\n        PENDING: 'PENDING',\n        Suspended: 'SUSPENDED',\n        SUSPENDED: 'SUSPENDED',\n        Rejected: 'REJECTED',\n        REJECTED: 'REJECTED'\n      };\n      const mappedStatus = statusMap[String(status)];\n      if (!mappedStatus) return res.status(400).json({ error: 'Invalid account status.' });\n      profileUpdates.status = mappedStatus;\n      if (mappedStatus === 'ACTIVE') {\n        profileUpdates.approved_at = new Date().toISOString();\n        profileUpdates.approved_by = userId;\n      }\n    }\n\n    if (role !== undefined) {\n      if (!isSuperAdmin) {\n        return res.status(403).json({ error: 'Only the Super Admin can change permission levels.' });\n      }\n      const roleMap: Record<string, string> = {\n        SUPER_ADMIN: 'SUPER_ADMIN',\n        HOD_ADMIN: 'HOD_ADMIN',\n        Admin: 'HOD_ADMIN',\n        STAFF: 'STAFF',\n        'Business Development Officer': 'STAFF',\n        'Relationship Manager': 'STAFF',\n        'Asset Management Officer': 'STAFF',\n        'Team Lead': 'STAFF',\n        Director: 'STAFF'\n      };\n      const mappedPermission = roleMap[String(role)];\n      if (!mappedPermission) return res.status(400).json({ error: 'Invalid permission level.' });\n      profileUpdates.permission_level = mappedPermission;\n    }\n\n    const { data: updatedProfile, error: updateError } = await supabaseServer\n      .from('profiles')\n      .update(profileUpdates)\n      .eq('id', id)\n      .select('id, full_name, email, permission_level, department, status, avatar_url')\n      .single();\n\n    if (updateError || !updatedProfile) {\n      throw updateError || new Error('Profile update failed');\n    }\n\n    await logSystemEvent('Administrative Action', id, 'Success', req, {\n      targetEmail: targetProfile.email,\n      status: profileUpdates.status || targetProfile.status,\n      permissionLevel: profileUpdates.permission_level || targetProfile.permission_level\n    });\n\n    const legacyRole = updatedProfile.permission_level === 'SUPER_ADMIN'\n      ? 'SUPER_ADMIN'\n      : updatedProfile.permission_level === 'HOD_ADMIN'\n        ? 'Admin'\n        : 'Business Development Officer';\n\n    return res.json({\n      id: updatedProfile.id,\n      fullName: updatedProfile.full_name,\n      email: updatedProfile.email,\n      role: legacyRole,\n      permissionLevel: updatedProfile.permission_level,\n      department: updatedProfile.department,\n      avatarUrl: updatedProfile.avatar_url || '',\n      status: updatedProfile.status === 'ACTIVE' ? 'Active' : updatedProfile.status\n    });\n  } catch (err: any) {\n    console.error('[SPIP ADMIN] Failed to update user profile:', err?.message || err);\n    return res.status(500).json({ error: 'Unable to update this user profile.' });\n  }\n});\n\n`
);

server = replaceBetween(
  server,
  'app.delete("/api/admin/users/:id", async (req, res) => {',
  '// Admin system statistics/overview endpoint',
  `app.delete("/api/admin/users/:id", async (req, res) => {\n  const { userId, isSuperAdmin } = getRequestUser(req);\n  if (!userId || !isSuperAdmin) {\n    return res.status(403).json({ error: 'Only the Super Admin can remove an account.' });\n  }\n  return res.status(405).json({\n    error: 'Permanent account deletion is disabled in Phase 1. Suspend the account instead to preserve the audit trail.'\n  });\n});\n\n`
);

// Remove an exposed Apollo fallback key from the raw proxy and require the server-only secret.
server = server.replace(
  /const apolloApiKey = process\.env\.APOLLO_API_KEY \|\| process\.env\.VITE_APOLLO_API_KEY \|\| "[^"]+";/g,
  `const apolloApiKey = process.env.APOLLO_API_KEY;\n    if (!apolloApiKey) {\n      return res.status(503).json({ error: 'Apollo integration is not configured.' });\n    }`
);

fs.writeFileSync(serverPath, server);

// ----- Apollo integration -----
const apolloServicePath = 'src/services/apolloService.ts';
let apolloService = fs.readFileSync(apolloServicePath, 'utf8');
apolloService = replaceBetween(
  apolloService,
  'function getApolloApiKey(): string {',
  'async function apolloFetch(',
  `function getApolloApiKey(): string {\n  const key = (process.env.APOLLO_API_KEY || '').trim();\n  apolloDiagnostics.apolloKeyLoaded = Boolean(key);\n  apolloDiagnostics.apolloKeyLength = key.length;\n  apolloDiagnostics.apolloKeySource = key ? 'process.env.APOLLO_API_KEY' : 'None';\n  apolloDiagnostics.apolloConnected = Boolean(key);\n  return key;\n}\n\nasync function apolloFetch(`
);
fs.writeFileSync(apolloServicePath, apolloService);

// Remove local forensic utilities that can print or expose secrets if accidentally executed.
for (const unsafeFile of ['forensic_env_print.ts', 'print_raw_db_url.ts']) {
  if (fs.existsSync(unsafeFile)) fs.unlinkSync(unsafeFile);
}

console.log('Phase 1 post-transform security cleanup applied successfully.');
