import React, { useEffect, useState } from 'react';
import { Bell, CalendarDays, Menu, Search, Settings2, X } from 'lucide-react';
import { UserProfile } from '../types';
import { ScmLogo } from './ScmLogo';

interface HeaderProps {
  currentUser: UserProfile;
  activeTab: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  setActiveTab?: (tab: string) => void;
}

const titles: Record<string, string> = {
  dashboard: 'My Dashboard',
  prospects: 'Prospects',
  pipeline: 'Relationship Pipeline',
  'client-360': 'Client 360',
  crm: 'Client 360',
  intelligence: 'Research',
  workspaces: 'Research',
  copilot: 'Intelligence Copilot',
  calendar: 'Calendar',
  reports: 'Reports',
  'weekly-report': 'Weekly Report',
  'executive-summary': 'Executive Overview',
  'admin-users': 'Users & Access',
  'admin-approvals': 'Users & Access',
  'admin-audit': 'Users & Access',
  'admin-reports': 'Management Reports',
  settings: 'Settings',
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  searchTerm,
  setSearchTerm,
  sidebarCollapsed,
  onToggleSidebar,
  setActiveTab,
}) => {
  const [time, setTime] = useState('');
  const [showQuickPanel, setShowQuickPanel] = useState(false);

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const accessLabel = currentUser.permissionLevel === 'SUPER_ADMIN'
    ? 'Super Admin'
    : currentUser.permissionLevel === 'HOD_ADMIN'
      ? 'HOD Admin'
      : 'Staff';

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 shadow-[0_1px_12px_rgba(7,25,43,0.04)] backdrop-blur-xl sm:px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button onClick={onToggleSidebar} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Toggle navigation">
          <Menu className="h-5 w-5" />
        </button>
        {sidebarCollapsed && <ScmLogo variant="color" size="sm" showText={false} className="hidden sm:flex" />}
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight text-slate-950 sm:text-lg">{titles[activeTab] || 'SCM Prospect Intelligence Platform'}</h1>
          <p className="hidden truncate text-[10px] text-slate-400 sm:block">{currentUser.fullName} · {accessLabel}</p>
        </div>

        <label className="relative ml-3 hidden max-w-md flex-1 lg:block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search current workspace"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-red-300 focus:bg-white focus:ring-4 focus:ring-red-50"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 sm:block">{time}</div>
        <div className="relative">
          <button onClick={() => setShowQuickPanel((value) => !value)} className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50" aria-label="Notifications and reminders">
            <Bell className="h-4 w-4" />
          </button>
          {showQuickPanel && (
            <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Notifications & reminders</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">Device reminders are managed from your workspace.</div>
                </div>
                <button onClick={() => setShowQuickPanel(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-2 p-3">
                <button onClick={() => { setActiveTab?.('calendar'); setShowQuickPanel(false); }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50">
                  <span className="rounded-lg bg-red-50 p-2 text-[#b1191f]"><CalendarDays className="h-4 w-4" /></span>
                  <span><span className="block text-sm font-semibold text-slate-800">Calendar & meetings</span><span className="mt-0.5 block text-[11px] text-slate-400">Review upcoming meetings and tasks</span></span>
                </button>
                <button onClick={() => { setActiveTab?.('settings'); setShowQuickPanel(false); }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50">
                  <span className="rounded-lg bg-slate-100 p-2 text-slate-600"><Settings2 className="h-4 w-4" /></span>
                  <span><span className="block text-sm font-semibold text-slate-800">Notification settings</span><span className="mt-0.5 block text-[11px] text-slate-400">Enable browser and push permissions</span></span>
                </button>
              </div>
            </div>
          )}
        </div>
        <span className="hidden rounded-xl bg-slate-950 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white md:inline-flex">{accessLabel}</span>
      </div>
    </header>
  );
};
