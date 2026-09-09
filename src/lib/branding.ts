export type SpipBranding = {
  logoUrl: string;
  faviconUrl: string;
  appIconUrl: string;
  organisationName: string;
  divisionName: string;
};

const FALLBACK: SpipBranding = {
  logoUrl: '',
  faviconUrl: '',
  appIconUrl: '',
  organisationName: 'SCM CAPITAL',
  divisionName: 'ASSET MANAGEMENT',
};

let cachedBranding: SpipBranding | null = null;
let pendingBranding: Promise<SpipBranding> | null = null;

function applyBrowserBranding(branding: SpipBranding) {
  if (branding.faviconUrl) {
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.type = 'image/png';
    favicon.href = branding.faviconUrl;
  }

  const installIcon = branding.appIconUrl || branding.faviconUrl;
  if (installIcon) {
    let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = installIcon;
  }
}

export async function getSpipBranding(force = false): Promise<SpipBranding> {
  if (!force && cachedBranding) return cachedBranding;
  if (!force && pendingBranding) return pendingBranding;

  pendingBranding = fetch('/api/branding')
    .then(async (response) => response.ok ? response.json() : FALLBACK)
    .then((value) => ({ ...FALLBACK, ...value }))
    .catch(() => FALLBACK)
    .then((value) => {
      cachedBranding = value;
      applyBrowserBranding(value);
      pendingBranding = null;
      return value;
    });

  return pendingBranding;
}

export function refreshSpipBranding() {
  cachedBranding = null;
  window.dispatchEvent(new CustomEvent('spip-branding-updated'));
}
