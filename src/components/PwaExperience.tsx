import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

export const PwaExperience: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [updateReady, setUpdateReady] = useState<ServiceWorkerRegistration | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    const onInstalled = () => setInstallPrompt(null);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
      if (registration.waiting) setUpdateReady(registration);
      registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => {
        if (registration.installing?.state === 'installed' && navigator.serviceWorker.controller) setUpdateReady(registration);
      }));
    }).catch((error) => console.error('[SPIP PWA] Service worker registration failed:', error));
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall); window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    if ((await installPrompt.userChoice).outcome === 'accepted') setInstallPrompt(null);
  };
  const applyUpdate = () => {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    updateReady?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  if (!online) return <div className="fixed inset-x-3 top-[76px] z-50 mx-auto flex max-w-xl items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-semibold text-white shadow-xl" role="status"><WifiOff className="h-4 w-4 text-amber-400" />Offline — reconnect to access protected CRM records.</div>;
  if (updateReady) return <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-slate-950 p-3 text-white shadow-2xl md:bottom-5"><span className="text-xs font-semibold">A new SPIP version is ready.</span><button onClick={applyUpdate} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#b1191f] px-3 text-xs font-bold"><RefreshCw className="h-4 w-4" />Update</button></div>;
  if (installPrompt && !dismissed) return <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl md:bottom-5"><span className="flex-1 text-xs font-semibold text-slate-800">Install SPIP for faster app-like access.</span><button onClick={install} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#b1191f] px-3 text-xs font-bold text-white"><Download className="h-4 w-4" />Install</button><button onClick={() => setDismissed(true)} aria-label="Dismiss install prompt" className="min-h-11 min-w-11 rounded-xl text-slate-400"><X className="mx-auto h-4 w-4" /></button></div>;
  return null;
};
