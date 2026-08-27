import fs from 'node:fs';

// Sidebar: derive administration access exclusively from canonical permission level.
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  `  const isSuperAdmin = currentUser.email === 'wisdom.okoh@scmcapitalng.com' || \n                       currentUser.email === 'omololu.ajediran@scmcapitalng.com';\n\n  const isAdminUser = isSuperAdmin || \n                      currentUser.role === 'Admin' || \n                      currentUser.role === 'SUPER_ADMIN' ||\n                      currentUser.role === 'Administrator';`,
  `  const isSuperAdmin = currentUser.permissionLevel === 'SUPER_ADMIN';\n  const isAdminUser = isSuperAdmin || currentUser.permissionLevel === 'HOD_ADMIN';`
);
sidebar = sidebar.replace(
  `{ id: 'admin-reports', label: 'Weekly Reports', icon: FileSpreadsheet },`,
  `{ id: 'admin-reports', label: 'Management Reports', icon: FileSpreadsheet },`
);
fs.writeFileSync('src/components/Sidebar.tsx', sidebar);

// Admin console: stop inferring security roles from hard-coded names/emails.
let admin = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
admin = admin.replace(
  `            System administration console for <strong>Wisdom Okoh</strong> and <strong>Omololu Ajediran</strong>.`,
  `            Permission-controlled administration for Super Admin and HOD Admin roles.`
);
admin = admin.replace(
  `                      const isSuper = user.email.toLowerCase() === "wisdom.okoh@scmcapitalng.com" || \n                                      user.email.toLowerCase() === "omololu.ajediran@scmcapitalng.com";`,
  `                      const isSuper = user.permissionLevel === 'SUPER_ADMIN';`
);
admin = admin.replace(
  `                              {/* Reset secret password */}\n                              <button\n                                onClick={() => setResettingUserPassword(user)}\n                                className="p-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-emerald-400 transition-all"\n                                title="Reset Secret Password"\n                              >\n                                <Key className="w-3.5 h-3.5" />\n                              </button>`,
  `                              {/* Password resets are restricted to the canonical Super Admin. */}\n                              {currentUser.permissionLevel === 'SUPER_ADMIN' && (\n                                <button\n                                  onClick={() => setResettingUserPassword(user)}\n                                  className="p-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-emerald-400 transition-all"\n                                  title="Reset Temporary Password"\n                                >\n                                  <Key className="w-3.5 h-3.5" />\n                                </button>\n                              )}`
);
fs.writeFileSync('src/pages/AdminDashboard.tsx', admin);

// Weekly report edit-window privileges must follow permission levels, not specific people.
let weekly = fs.readFileSync('src/pages/WeeklyReport.tsx', 'utf8');
weekly = weekly.replace(
  `    if (currentUser.role === 'Admin' || currentUser.email === 'wisdom.okoh@scmcapitalng.com' || currentUser.email === 'omololu.ajediran@scmcapitalng.com') {`,
  `    if (currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN') {`
);
fs.writeFileSync('src/pages/WeeklyReport.tsx', weekly);

console.log('Phase 2 UI permission alignment applied.');
