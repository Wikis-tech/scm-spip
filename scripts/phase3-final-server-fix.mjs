import fs from 'node:fs';

const path = 'server.ts';
let source = fs.readFileSync(path, 'utf8');

const oldGate = `app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  if (process.env.NODE_ENV === 'production' && !isDatabaseHealthy) {
    return res.status(503).json({ error: 'SPIP database is temporarily unavailable. No changes were saved.' });
  }
  return next();
});`;

const newGate = `app.use('/api', (req, res, next) => {
  // Authentication, Supabase-backed CRM/admin routes and stateless research endpoints
  // do not depend on the legacy direct PostgreSQL pool. They remain protected by the
  // Supabase bearer-token middleware registered above this gate.
  const databaseIndependentPrefixes = [
    '/auth/',
    '/admin/',
    '/crm/',
    '/weekly-reports',
    '/campaigns',
    '/client-360',
    '/apollo/',
    '/gemini/',
    '/serena/',
  ];
  if (databaseIndependentPrefixes.some((prefix) => req.path.startsWith(prefix))) return next();

  if (process.env.NODE_ENV === 'production' && !isDatabaseHealthy) {
    return res.status(503).json({
      error: 'This legacy data service is temporarily unavailable. Your authenticated SPIP session remains active.',
      code: 'LEGACY_DATABASE_UNAVAILABLE',
    });
  }
  return next();
});`;

if (!source.includes(oldGate)) {
  if (!source.includes("databaseIndependentPrefixes")) {
    throw new Error('Could not locate the legacy database-health gate in server.ts');
  }
  console.log('Final server routing patch already applied.');
} else {
  source = source.replace(oldGate, newGate);
  fs.writeFileSync(path, source);
  console.log('Updated database-health gate to allow authenticated Supabase/stateless routes.');
}
