import fs from 'node:fs';

function mustReplace(input, search, replacement, label) {
  if (!input.includes(search)) throw new Error(`Missing expected block: ${label}`);
  return input.replace(search, replacement);
}

// --- App.tsx: Supabase session restoration + bearer-token API calls ---
const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');

if (!app.includes("import { supabase } from './lib/supabase';")) {
  app = app.replace(
    "import { registerServiceWorkerAndSubscribe, isPushSupported } from './services/pushService';",
    "import { registerServiceWorkerAndSubscribe, isPushSupported } from './services/pushService';\nimport { supabase } from './lib/supabase';"
  );
}

app = app.replace(/\/\/ Mock users list matching[\s\S]*?\n\];\n\nexport default function App\(\) \{/, 'export default function App() {');

app = app.replace(
  /const \[activeTab, setActiveTab\] = useState<string>\(\(\) => \{[\s\S]*?return 'dashboard';\n  \}\);/,
  "const [activeTab, setActiveTab] = useState<string>('dashboard');"
);

const currentUserStart = app.indexOf('  // Simulated User state');
const currentUserEnd = app.indexOf('  // Redirect Admin', currentUserStart);
if (currentUserStart < 0 || currentUserEnd < 0) throw new Error('Could not locate current user session block in App.tsx');

const secureSessionBlock = `  // Authenticated identity comes from the persisted Supabase session, never from localStorage profile data.\n  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);\n  const [authReady, setAuthReady] = useState(false);\n\n  const mapProfileToUser = (profile: any): UserProfile => ({\n    id: profile.id,\n    fullName: profile.full_name,\n    email: profile.email,\n    role: profile.permission_level === 'SUPER_ADMIN'\n      ? 'SUPER_ADMIN'\n      : profile.permission_level === 'HOD_ADMIN'\n        ? 'Admin'\n        : 'Business Development Officer',\n    permissionLevel: profile.permission_level,\n    department: profile.department || 'Asset Management',\n    avatarUrl: profile.avatar_url || '',\n    status: profile.status === 'ACTIVE' ? 'Active' : profile.status,\n  });\n\n  useEffect(() => {\n    let mounted = true;\n\n    const restoreSession = async () => {\n      try {\n        const { data: sessionData } = await supabase.auth.getSession();\n        const session = sessionData.session;\n        if (!session?.user?.id) {\n          if (mounted) setCurrentUser(null);\n          return;\n        }\n\n        const { data: profile, error } = await supabase\n          .from('profiles')\n          .select('id, full_name, email, permission_level, department, status, avatar_url')\n          .eq('id', session.user.id)\n          .single();\n\n        if (error || !profile || profile.status !== 'ACTIVE') {\n          await supabase.auth.signOut();\n          if (mounted) setCurrentUser(null);\n          return;\n        }\n\n        if (mounted) setCurrentUser(mapProfileToUser(profile));\n      } finally {\n        if (mounted) setAuthReady(true);\n      }\n    };\n\n    restoreSession();\n    const { data } = supabase.auth.onAuthStateChange((event) => {\n      if (event === 'SIGNED_OUT') setCurrentUser(null);\n    });\n\n    return () => {\n      mounted = false;\n      data.subscription.unsubscribe();\n    };\n  }, []);\n\n`;
app = app.slice(0, currentUserStart) + secureSessionBlock + app.slice(currentUserEnd);

app = app.replace(/const isSuperAdmin = currentUser\.email === 'wisdom\.okoh@scmcapitalng\.com' \|\|\s*currentUser\.email === 'omololu\.ajediran@scmcapitalng\.com';\s*const isAdminUser = isSuperAdmin \|\|\s*currentUser\.role === 'Admin' \|\|\s*currentUser\.role === 'SUPER_ADMIN' \|\|?\s*currentUser\.role === 'Administrator';/g,
  "const isAdminUser = currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN';"
);
app = app.replace(/const isSuperAdmin = currentUser\.email === 'wisdom\.okoh@scmcapitalng\.com' \|\|\s*currentUser\.email === 'omololu\.ajediran@scmcapitalng\.com';\s*const isAdminUser = isSuperAdmin \|\|\s*currentUser\.role === 'Admin' \|\|\s*currentUser\.role === 'SUPER_ADMIN';/g,
  "const isAdminUser = currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN';"
);

app = mustReplace(
  app,
  `  const scmFetch = (url: string, options: RequestInit = {}) => {\n    return fetch(url, options);\n  };`,
  `  const scmFetch = async (url: string, options: RequestInit = {}) => {\n    const { data } = await supabase.auth.getSession();\n    const token = data.session?.access_token;\n    const headers = new Headers(options.headers || {});\n    if (token) headers.set('Authorization', \`Bearer \${token}\`);\n    return fetch(url, { ...options, headers });\n  };`,
  'scmFetch'
);

app = app.replace(
  /  const handleLogout = async \(\) => \{[\s\S]*?\n  \};\n\n  const handleToggleSidebar/,
  `  const handleLogout = async () => {\n    try {\n      await supabase.auth.signOut();\n    } finally {\n      setCurrentUser(null);\n    }\n  };\n\n  const handleToggleSidebar`
);

app = app.replace(
  /<AuthScreen\s+onLoginSuccess=\{\(user\) => \{[\s\S]*?\}\}\s+\/>/,
  `<AuthScreen\n        onLoginSuccess={(user) => {\n          setCurrentUser(user);\n          const isAdminUser = user.permissionLevel === 'SUPER_ADMIN' || user.permissionLevel === 'HOD_ADMIN';\n          setActiveTab(isAdminUser ? 'executive-summary' : 'dashboard');\n        }}\n      />`
);

app = app.replace(
  '  // Render AuthScreen if no persistent B2B session exists\n  if (!currentUser) {',
  `  if (!authReady) {\n    return (\n      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">\n        <div className="text-sm text-slate-300">Loading secure SPIP session...</div>\n      </div>\n    );\n  }\n\n  // Render AuthScreen if there is no authenticated Supabase session.\n  if (!currentUser) {`
);

app = app.replace(/localStorage\.setItem\('scm_auth_user',[^\n]*\);?\n?/g, '');
app = app.replace(/localStorage\.removeItem\('scm_auth_user'\);?\n?/g, '');
fs.writeFileSync(appPath, app);

// --- pushService.ts: use Supabase bearer token instead of trusted identity headers ---
const pushPath = 'src/services/pushService.ts';
let push = fs.readFileSync(pushPath, 'utf8');
if (!push.startsWith("import { supabase }")) {
  push = "import { supabase } from '../lib/supabase';\n\n" + push;
}

push = push.replace(
  `    const response = await fetch('/api/push/subscribe', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        'x-user-id': userId,\n        'x-user-email': userEmail || '',\n        'x-user-role': userRole || ''\n      },`,
  `    const { data: authData } = await supabase.auth.getSession();\n    const token = authData.session?.access_token;\n    if (!token) throw new Error('Authenticated SPIP session required for push registration.');\n\n    const response = await fetch('/api/push/subscribe', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        'Authorization': \`Bearer \${token}\`\n      },`
);

push = push.replace(
  `    await fetch('/api/push/unsubscribe', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        'x-user-id': userId || '',\n        'x-user-email': userEmail || '',\n        'x-user-role': userRole || ''\n      },`,
  `    const { data: authData } = await supabase.auth.getSession();\n    const token = authData.session?.access_token;\n    if (!token) throw new Error('Authenticated SPIP session required for push unsubscribe.');\n\n    await fetch('/api/push/unsubscribe', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        'Authorization': \`Bearer \${token}\`\n      },`
);
fs.writeFileSync(pushPath, push);

// --- Database: production must fail closed, Supabase PostgreSQL only ---
const dbPath = 'src/db/index.ts';
const dbContent = `import dotenv from 'dotenv';\ndotenv.config();\n\nimport { drizzle } from 'drizzle-orm/node-postgres';\nimport pkg from 'pg';\nconst { Pool } = pkg;\nimport * as schema from './schema.ts';\n\nexport const createPool = () => {\n  const databaseUrl = process.env.DATABASE_URL?.trim();\n\n  if (!databaseUrl || (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://'))) {\n    throw new Error('[SPIP DATABASE] DATABASE_URL must be a valid PostgreSQL connection string.');\n  }\n\n  return new Pool({\n    connectionString: databaseUrl,\n    connectionTimeoutMillis: 10000,\n    statement_timeout: 30000,\n    max: 5,\n    idleTimeoutMillis: 10000,\n    allowExitOnIdle: true,\n    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')\n      ? false\n      : { rejectUnauthorized: false }\n  });\n};\n\nconst pool = createPool();\n\npool.on('error', (err) => {\n  console.error('[SPIP DATABASE] Unexpected idle client error:', err);\n});\n\nexport const db = drizzle(pool, { schema });\n`;
fs.writeFileSync(dbPath, dbContent);

// --- server.ts: eliminate silent memory fallbacks from core authenticated reads ---
const serverPath = 'server.ts';
let server = fs.readFileSync(serverPath, 'utf8');
server = server.replace(/  } catch \(err: any\) \{\n    if \(isAdmin\) return dbProspects;\n    return dbProspects\.filter\(p => p\.assignedOfficerId === userId && p\.status !== 'Archived'\);\n  }/g,
  `  } catch (err: any) {\n    console.error('[SPIP DATABASE] Prospect query failed:', err?.message || err);\n    throw err;\n  }`
);
server = server.replace(/  } catch \(err: any\) \{\n    if \(isAdmin\) return dbMeetings;\n    return dbMeetings\.filter\(m => m\.officerId === userId\);\n  }/g,
  `  } catch (err: any) {\n    console.error('[SPIP DATABASE] Meeting query failed:', err?.message || err);\n    throw err;\n  }`
);
server = server.replace(/  } catch \(err: any\) \{\n    if \(isAdmin\) return dbTasks;\n    return dbTasks\.filter\(t => t\.officerId === userId\);\n  }/g,
  `  } catch (err: any) {\n    console.error('[SPIP DATABASE] Task query failed:', err?.message || err);\n    throw err;\n  }`
);
server = server.replace(/  } catch \(err: any\) \{\n    if \(isAdmin\) return dbActivities;\n    return dbActivities\.filter\(a => a\.officerId === userId\);\n  }/g,
  `  } catch (err: any) {\n    console.error('[SPIP DATABASE] Activity query failed:', err?.message || err);\n    throw err;\n  }`
);
server = server.replace(/  } catch \(err: any\) \{\n    if \(isAdmin\) return dbContacts;\n    return dbContacts;\n  }/g,
  `  } catch (err: any) {\n    console.error('[SPIP DATABASE] Contact query failed:', err?.message || err);\n    throw err;\n  }`
);
server = server.replace(/  } catch \(err: any\) \{\n    if \(isAdmin\) return dbReminders;\n    return dbReminders\.filter\(r => r\.userId === userId\);\n  }/g,
  `  } catch (err: any) {\n    console.error('[SPIP DATABASE] Reminder query failed:', err?.message || err);\n    throw err;\n  }`
);
fs.writeFileSync(serverPath, server);

console.log('Final Phase 1 runtime security fixes applied.');
