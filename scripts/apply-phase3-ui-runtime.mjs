import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value); }
function mustReplace(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(search, replacement);
}

// server.ts
{
  const path = 'server.ts';
  let s = read(path);
  s = mustReplace(s,
    `import { registerPhase2WeeklyRoutes } from "./src/server/phase2WeeklyRoutes.ts";`,
    `import { registerPhase2WeeklyRoutes } from "./src/server/phase2WeeklyRoutes.ts";\nimport { registerPublicAuthRoutes } from "./src/server/publicAuthRoutes.ts";\nimport { registerPhase3Routes } from "./src/server/phase3Routes.ts";\nimport { registerPhase3CrudRoutes } from "./src/server/phase3CrudRoutes.ts";`,
    'server imports');

  s = mustReplace(s,
    `const PUBLIC_API_PATHS = new Set([\n  '/api/auth/config',`,
    `// Registration is registered before the authentication middleware because it creates\n// a PENDING account and never returns a signed-in session.\nregisterPublicAuthRoutes(app, supabaseServer);\n\nconst PUBLIC_API_PATHS = new Set([\n  '/api/auth/config',`,
    'public auth registration');

  s = mustReplace(s,
    `registerPhase2Routes(app, supabaseServer);\nregisterPhase2WeeklyRoutes(app, supabaseServer);`,
    `registerPhase2Routes(app, supabaseServer);\nregisterPhase2WeeklyRoutes(app, supabaseServer);\n// Phase 3 core CRM routes also run on the canonical Supabase data plane, before\n// the legacy direct-PostgreSQL health gate.\nregisterPhase3Routes(app, supabaseServer);\nregisterPhase3CrudRoutes(app, supabaseServer);`,
    'phase3 route registration');
  write(path, s);
}

// AuthScreen.tsx - replace registration with server-mediated pending account flow.
{
  const path = 'src/components/AuthScreen.tsx';
  let s = read(path);
  const start = s.indexOf('  const handleRegister = async (event: React.FormEvent) => {');
  const end = s.indexOf('  const handleForgotPassword = async (event: React.FormEvent) => {');
  if (start < 0 || end < 0) throw new Error('AuthScreen register function boundaries not found');
  const fn = `  const handleRegister = async (event: React.FormEvent) => {\n    event.preventDefault();\n    const normalizedEmail = email.trim().toLowerCase();\n    if (!fullName.trim() || !normalizedEmail || !password || !confirmPassword) {\n      setErrorMsg('Full name, corporate email and password are required.');\n      return;\n    }\n    if (!isScmCorporateEmail(normalizedEmail)) {\n      setErrorMsg('Registration is restricted to @scmcapitalng.com email addresses.');\n      return;\n    }\n    if (password.length < 12) {\n      setErrorMsg('Use a password with at least 12 characters.');\n      return;\n    }\n    if (password !== confirmPassword) {\n      setErrorMsg('Passwords do not match.');\n      return;\n    }\n\n    setIsLoading(true);\n    setErrorMsg('');\n    try {\n      const response = await fetch('/api/auth/register-v2', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({\n          fullName: fullName.trim(),\n          email: normalizedEmail,\n          password,\n          department: department.trim() || 'Asset Management',\n          jobTitle: jobTitle.trim() || '',\n        }),\n      });\n      const payload = await response.json().catch(() => ({}));\n      if (!response.ok) {\n        const message = payload?.error || payload?.message || 'Unable to submit your access request. Please try again.';\n        throw new Error(friendlyAuthError(String(message)));\n      }\n      setPassword('');\n      setConfirmPassword('');\n      setFullName('');\n      setJobTitle('');\n      setMode('login');\n      setInfoMsg(payload?.message || 'Access request submitted. Wait for SPIP administrator approval before signing in.');\n    } catch (error: any) {\n      const message = error?.message || 'Unable to submit your access request. Please try again.';\n      setErrorMsg(friendlyAuthError(String(message)));\n    } finally {\n      setIsLoading(false);\n    }\n  };\n\n`;
  s = s.slice(0, start) + fn + s.slice(end);
  s = s.replaceAll('Use a password with at least 8 characters.', 'Use a password with at least 12 characters.');
  s = s.replace('placeholder="Minimum 8 characters"', 'placeholder="Minimum 12 characters"');
  write(path, s);
}

// App.tsx - operational CRM now uses Phase 3 Supabase routes and exposes Client 360 to all active users.
{
  const path = 'src/App.tsx';
  let s = read(path);
  s = mustReplace(s, `import { CRM } from './pages/CRM';`, `import { CRM } from './pages/CRM';\nimport { Client360 } from './pages/Client360';`, 'Client360 import');

  const redirectStart = s.indexOf("  // Redirect Admin from 'dashboard' to 'executive-summary'");
  const redirectEndMarker = '  // Auto-register background service worker';
  const redirectEnd = s.indexOf(redirectEndMarker);
  if (redirectStart >= 0 && redirectEnd > redirectStart) s = s.slice(0, redirectStart) + s.slice(redirectEnd);

  const replacements = [
    ["scmFetch('/api/prospects')", "scmFetch('/api/crm/prospects')"],
    ["scmFetch('/api/contacts')", "scmFetch('/api/crm/contacts')"],
    ["scmFetch('/api/activities')", "scmFetch('/api/crm/activities')"],
    ["scmFetch('/api/meetings')", "scmFetch('/api/crm/meetings')"],
    ["scmFetch('/api/tasks')", "scmFetch('/api/crm/tasks')"],
    ["scmFetch('/api/prospects',", "scmFetch('/api/crm/prospects',"],
    ["scmFetch(`/api/prospects/${id}`", "scmFetch(`/api/crm/prospects/${id}`"],
    ["scmFetch('/api/contacts',", "scmFetch('/api/crm/contacts',"],
    ["scmFetch(`/api/contacts/${id}`", "scmFetch(`/api/crm/contacts/${id}`"],
    ["scmFetch('/api/activities',", "scmFetch('/api/crm/activities',"],
    ["scmFetch(`/api/activities/${id}`", "scmFetch(`/api/crm/activities/${id}`"],
    ["scmFetch('/api/meetings',", "scmFetch('/api/crm/meetings',"],
    ["scmFetch(`/api/meetings/${id}`", "scmFetch(`/api/crm/meetings/${id}`"],
    ["scmFetch('/api/tasks',", "scmFetch('/api/crm/tasks',"],
    ["scmFetch(`/api/tasks/${id}`", "scmFetch(`/api/crm/tasks/${id}`"],
  ];
  for (const [a,b] of replacements) s = s.replaceAll(a,b);

  s = mustReplace(s,
    `      case 'pipeline':`,
    `      case 'client-360':\n        return <Client360 currentUser={currentUser} />;\n      case 'pipeline':`,
    'Client360 tab');

  s = s.replace('ACCESS DENIED • SECURE GATEWAY', 'ACCESS RESTRICTED');
  s = s.replace('Unauthorized Administration Request', 'You do not have access to this page');
  s = s.replace('This module is reserved strictly for SCM Capital Enterprise Administrators. Your profile does not hold the required security clearance keys.', 'This section is available only to authorized SPIP administrators.');
  s = s.replace('Loading CRM Database...', 'Loading secure CRM data...');
  write(path, s);
}

// Sidebar.tsx - admins retain full operating capability; simplify AI/cyber labels.
{
  const path = 'src/components/Sidebar.tsx';
  let s = read(path);
  const start = s.indexOf('  if (isAdminUser) {');
  const end = s.indexOf('  const rolesList:', start);
  if (start < 0 || end < 0) throw new Error('Sidebar nav block not found');
  const block = `  if (isAdminUser) {\n    navItems = [\n      { id: 'executive-summary', label: 'Executive Summary', icon: Award },\n      { id: 'dashboard', label: 'My Dashboard', icon: BarChart3 },\n      { id: 'prospects', label: 'Prospects', icon: Building2 },\n      { id: 'client-360', label: 'Client 360', icon: Users2 },\n      { id: 'workspaces', label: 'Research Workspaces', icon: Briefcase },\n      { id: 'crm', label: 'CRM', icon: Users2 },\n      { id: 'pipeline', label: 'Pipeline', icon: CheckSquare },\n      { id: 'intelligence', label: 'Company Research', icon: SearchCode },\n      { id: 'calendar', label: 'Calendar', icon: Calendar },\n      { id: 'reports', label: 'Reports', icon: TrendingUp },\n      { id: 'admin-reports', label: 'Management Reports', icon: FileSpreadsheet },\n      { id: 'admin-users', label: 'Administration', icon: ShieldCheck },\n      { id: 'settings', label: 'Settings', icon: Settings2 },\n    ];\n  } else {\n    navItems = [\n      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },\n      { id: 'prospects', label: 'Prospects', icon: Building2 },\n      { id: 'client-360', label: 'Client 360', icon: Users2 },\n      { id: 'workspaces', label: 'Research Workspaces', icon: Briefcase },\n      { id: 'crm', label: 'CRM', icon: Users2 },\n      { id: 'pipeline', label: 'Pipeline', icon: CheckSquare },\n      { id: 'intelligence', label: 'Company Research', icon: SearchCode },\n      { id: 'calendar', label: 'Calendar', icon: Calendar },\n      { id: 'reports', label: 'Reports', icon: TrendingUp },\n    ];\n    if (isRelationshipOfficer) navItems.push({ id: 'weekly-report', label: 'Weekly Report', icon: FileText });\n    navItems.push({ id: 'settings', label: 'Settings', icon: Settings2 });\n  }\n\n`;
  s = s.slice(0, start) + block + s.slice(end);
  write(path, s);
}

// Dashboard charts.
{
  const path = 'src/pages/Dashboard.tsx';
  let s = read(path);
  s = mustReplace(s, `import { Prospect, Contact, Activity, Meeting, DashboardMetrics, Task } from '../types';`, `import { Prospect, Contact, Activity, Meeting, DashboardMetrics, Task } from '../types';\nimport { OfficerDashboardCharts } from '../components/analytics/BusinessCharts';`, 'dashboard chart import');
  s = mustReplace(s, `      {/* 3. Core Bento Grid Area */}`, `      <OfficerDashboardCharts prospects={prospects} activities={activities} meetings={meetings} tasks={tasks} />\n\n      {/* 3. Core Bento Grid Area */}`, 'dashboard chart placement');
  s = s.replace('Sector Lead Advisory Workspace', 'Asset Management Workspace');
  s = s.replace('AI Target Finder', 'Find Prospects');
  write(path, s);
}

// Executive charts and cleaner language.
{
  const path = 'src/pages/ExecutiveSummary.tsx';
  let s = read(path);
  s = mustReplace(s, `import { UserProfile } from '../types';`, `import { UserProfile } from '../types';\nimport { ExecutiveRecharts } from '../components/analytics/BusinessCharts';`, 'executive chart import');
  s = s.replace(/const res = await fetch\('\/api\/admin\/executive-dashboard-summary', \{[\s\S]*?\n      \}\);/, `const res = await fetch('/api/admin/executive-dashboard-summary');`);
  s = mustReplace(s, `      {/* Section 6: Management Insights Banner (Placed prominently at top as requested) */}`, `      <ExecutiveRecharts data={data} />\n\n      {/* Management insights */}`, 'executive chart placement');
  s = s.replace('Executive Ledger', 'Management Overview');
  s = s.replace('Autonomous Business Intelligence Insights', 'Management Insights');
  s = s.replace('Synthesizing Executive Ledger...', 'Loading management overview...');
  write(path, s);
}

// Management reports charts.
{
  const path = 'src/pages/ManagementReports.tsx';
  let s = read(path);
  s = mustReplace(s, `import { AdminReports } from './AdminReports';`, `import { AdminReports } from './AdminReports';\nimport { ManagementRecharts } from '../components/analytics/BusinessCharts';`, 'management chart import');
  s = mustReplace(s, `          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}`, `          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}\n\n          {(monthly || staff) && <ManagementRecharts monthly={monthly} staff={staff} />}`, 'management chart placement');
  s = s.replace('SCM CAPITAL • PHASE 2', 'SCM CAPITAL • MANAGEMENT');
  write(path, s);
}

// Header: business language, local browser time, no hard-coded provider advertising.
{
  const path = 'src/components/Header.tsx';
  let s = read(path);
  s = s.replace("setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC');", "setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));");
  s = s.replace('SERVER LIVE', 'CONNECTED');
  s = s.replace('Gemini 3.5 AI Enabled', 'Research Tools');
  s = s.replace('SCM Communication Center', 'Notifications & Reminders');
  write(path, s);
}

// Admin surface language clean-up.
{
  const path = 'src/pages/AdminDashboard.tsx';
  let s = read(path);
  const pairs = [
    ['ENTERPRISE CONTROL DECK', 'ADMINISTRATION'],
    ['SCM Platform Governance Center', 'User & Access Management'],
    ['Permission-controlled administration for Super Admin and HOD Admin roles.', 'Manage users, approvals, permissions, audit activity and platform access.'],
    ['Sync Registry', 'Refresh Directory'],
    ['CORPORATE LOGINS', 'USERS'],
    ['SCM LEADS PURGED', 'DATA STATUS'],
    ['SECURITY EVENT LOG', 'AUDIT EVENTS'],
    ['SUPABASE DB HOST', 'DATA CONNECTION'],
    ['Enterprise Administration', 'Administration'],
    ['Corporate Roster', 'User Directory'],
    ['Purge', 'Suspend'],
  ];
  for (const [a,b] of pairs) s = s.replaceAll(a,b);
  write(path, s);
}

console.log('Phase 3 CRM, signup, UI and analytics integration patch applied.');
