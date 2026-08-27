import type { Express } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Legacy Phase 3 registration endpoint.
 * Registration now uses Supabase's public signup flow with mailbox confirmation.
 * Never expose service-role account creation from an unauthenticated endpoint.
 */
export function registerPublicAuthRoutes(app: Express, _supabase: SupabaseClient) {
  app.post('/api/auth/register-v2', (_req, res) => {
    return res.status(410).json({
      error: 'This registration route has been retired. Use the secure SPIP access request screen.'
    });
  });
}
