export type SpipBranding = {
  logoUrl: string;
  organisationName: string;
  divisionName: string;
};

const FALLBACK: SpipBranding = {
  logoUrl: '',
  organisationName: 'SCM CAPITAL',
  divisionName: 'ASSET MANAGEMENT',
};

let cachedBranding: SpipBranding | null = null;
let pendingBranding: Promise<SpipBranding> | null = null;

export async function getSpipBranding(force = false): Promise<SpipBranding> {
  if (!force && cachedBranding) return cachedBranding;
  if (!force && pendingBranding) return pendingBranding;

  pendingBranding = fetch('/api/branding')
    .then(async (response) => response.ok ? response.json() : FALLBACK)
    .then((value) => ({ ...FALLBACK, ...value }))
    .catch(() => FALLBACK)
    .then((value) => {
      cachedBranding = value;
      pendingBranding = null;
      return value;
    });

  return pendingBranding;
}

export function refreshSpipBranding() {
  cachedBranding = null;
  window.dispatchEvent(new CustomEvent('spip-branding-updated'));
}
