import fs from 'node:fs';

const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');

const oldFetch = `  const scmFetch = (url: string, options: RequestInit = {}) => {\n    const headers = {\n      ...(options.headers || {}),\n      'x-user-id': currentUser?.id || '',\n      'x-user-role': currentUser?.role || '',\n      'x-user-email': currentUser?.email || ''\n    };\n    return fetch(url, { ...options, headers });\n  };`;
const newFetch = `  const scmFetch = (url: string, options: RequestInit = {}) => {\n    return fetch(url, options);\n  };`;
if (!app.includes(oldFetch)) throw new Error('Could not locate legacy scmFetch identity headers');
app = app.replace(oldFetch, newFetch);

// Remove any remaining explicit spoofable identity headers from component requests.
app = app
  .replace(/\n\s*'x-user-id': currentUser\?\.id \|\| '',?/g, '')
  .replace(/\n\s*'x-user-role': currentUser\?\.role \|\| '',?/g, '')
  .replace(/\n\s*'x-user-email': currentUser\?\.email \|\| ''/g, '');

const oldLogout = `  const handleLogout = () => {\n    localStorage.removeItem('scm_auth_user');\n    setCurrentUser(null);\n  };`;
const newLogout = `  const handleLogout = async () => {\n    try {\n      await fetch('/api/auth/logout', { method: 'POST' });\n    } catch (error) {\n      console.warn('[SPIP AUTH] Server logout request failed; clearing the local session.', error);\n    } finally {\n      localStorage.removeItem('scm_auth_user');\n      setCurrentUser(null);\n    }\n  };`;
if (!app.includes(oldLogout)) throw new Error('Could not locate legacy logout handler');
app = app.replace(oldLogout, newLogout);

fs.writeFileSync(appPath, app);
console.log('Phase 1 session finalization applied successfully.');
