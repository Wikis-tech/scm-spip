import fs from 'node:fs';

function replaceOrFail(content, search, replacement, label) {
  if (!content.includes(search)) {
    throw new Error(`Phase 2 patch failed: ${label} target not found`);
  }
  return content.replace(search, replacement);
}

// ---- server.ts integration ----
let server = fs.readFileSync('server.ts', 'utf8');

if (!server.includes('registerPhase2Routes')) {
  server = replaceOrFail(
    server,
    'import { calculateProductRecommendations } from "./src/utils/recommendationEngine.ts";\n',
    'import { calculateProductRecommendations } from "./src/utils/recommendationEngine.ts";\nimport { registerPhase2Routes } from "./src/server/phase2Routes.ts";\nimport { registerPhase2WeeklyRoutes } from "./src/server/phase2WeeklyRoutes.ts";\n',
    'Phase 2 server imports'
  );
}

const blockingSync = `    } catch (syncError: any) {\n      console.error('[SPIP SECURITY] Failed to synchronize authenticated profile:', syncError?.message || syncError);\n      return res.status(503).json({ error: 'SPIP database is temporarily unavailable.' });\n    }`;
const nonBlockingSync = `    } catch (syncError: any) {\n      // The Supabase profile is authoritative for authentication. A legacy CRM directory\n      // synchronization failure must not destroy an otherwise valid authenticated session.\n      // Direct CRM routes still fail closed behind the database health gate below.\n      console.warn('[SPIP SECURITY] Legacy CRM profile synchronization deferred:', syncError?.message || syncError);\n    }`;
if (server.includes(blockingSync)) {
  server = server.replace(blockingSync, nonBlockingSync);
}

if (!server.includes('registerPhase2Routes(app, supabaseServer);')) {
  server = replaceOrFail(
    server,
    `});\n\nconst PORT = Number(process.env.PORT || 3000);`,
    `});\n\n// Phase 2 identity, administration and reporting routes use the trusted Supabase\n// server client and are registered before the legacy PostgreSQL health gate.\nregisterPhase2Routes(app, supabaseServer);\nregisterPhase2WeeklyRoutes(app, supabaseServer);\n\nconst PORT = Number(process.env.PORT || 3000);`,
    'Phase 2 route registration'
  );
}

fs.writeFileSync('server.ts', server);

// ---- App.tsx integration + resilient session validation ----
let app = fs.readFileSync('src/App.tsx', 'utf8');

if (!app.includes("import { ManagementReports } from './pages/ManagementReports';")) {
  app = replaceOrFail(
    app,
    "import { AdminReports } from './pages/AdminReports';\n",
    "import { ManagementReports } from './pages/ManagementReports';\n",
    'ManagementReports import'
  );
}

const oldSessionFailure = `          if (!res.ok) {\n            console.warn('[SCM SECURITY] Session is no longer active or approved. Logging out.');\n                        setCurrentUser(null);\n            return;\n          }`;
const newSessionFailure = `          if (!res.ok) {\n            // Only authentication/authorization failures invalidate the browser session.\n            // A temporary API/database outage must not bounce an authenticated user to login.\n            if (res.status === 401 || res.status === 403) {\n              console.warn('[SCM SECURITY] Session is no longer active or approved. Logging out.');\n              setCurrentUser(null);\n            } else {\n              console.warn('[SCM PLATFORM] Session check temporarily unavailable; retaining valid Supabase session.');\n            }\n            return;\n          }`;
if (app.includes(oldSessionFailure)) {
  app = app.replace(oldSessionFailure, newSessionFailure);
}

app = app.replace(
  `          <AdminReports\n            currentUser={currentUser}\n          />`,
  `          <ManagementReports\n            currentUser={currentUser}\n          />`
);

fs.writeFileSync('src/App.tsx', app);

// Keep client validation consistent with the server-side temporary-password rule.
let admin = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
admin = admin.replace(
  `if (!newPassword || newPassword.trim().length < 6) {\n      showToast("Password must be at least 6 characters in length.", 'error');`,
  `if (!newPassword || newPassword.trim().length < 12) {\n      showToast("Temporary passwords must be at least 12 characters in length.", 'error');`
);
fs.writeFileSync('src/pages/AdminDashboard.tsx', admin);

console.log('Phase 2 runtime integration patch applied.');
