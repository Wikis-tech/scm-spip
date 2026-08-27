import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

if (!supabaseUrl || !supabasePublishableKey) {
  console.error(
    '[SPIP AUTH] Supabase client configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the runtime environment.'
  );
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabasePublishableKey || 'missing-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'scm-spip-auth',
    },
  }
);

export const SCM_EMAIL_DOMAIN = '@scmcapitalng.com';

export function isScmCorporateEmail(value: string): boolean {
  const email = value.trim().toLowerCase();
  if (!email.endsWith(SCM_EMAIL_DOMAIN)) return false;

  const localPart = email.slice(0, -SCM_EMAIL_DOMAIN.length);
  return Boolean(localPart) && /^[a-z0-9._-]+$/.test(localPart);
}
