import fs from 'node:fs';

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');

// Remove any residual browser-asserted identity headers. scmFetch injects the verified Supabase bearer token.
app = app.replace(/^\s*'x-user-id':[^\n]*\n/gm, '');
app = app.replace(/^\s*'x-user-role':[^\n]*\n/gm, '');
app = app.replace(/^\s*'x-user-email':[^\n]*\n/gm, '');

// Legacy localStorage profile data must never be an authentication authority.
app = app.replace(/^\s*localStorage\.setItem\('scm_auth_user'[^\n]*\n/gm, '');
app = app.replace(/^\s*localStorage\.removeItem\('scm_auth_user'\);?\s*\n/gm, '');

fs.writeFileSync(appPath, app);
console.log('Residual client identity headers removed.');
