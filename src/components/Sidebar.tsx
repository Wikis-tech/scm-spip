import React from 'react';
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  LogOut,
  SearchCode,
  Settings2,
  ShieldCheck,
  TrendingUp,
  Users2,
  Award,
  Bot,
} from 'lucide-react';
import { UserProfile } from '../types';
import { ScmLogo } from './ScmLogo';

interface SidebarProps {
  currentUser: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeFor?: string[];
};

const workspaceItems: NavItem[] = [
  { id: 'dashboard', label: 'My Dashboard', icon: BarChart3 },
  { id: 'prospects', label: 'Prospects', icon: Building2, activeFor: ['prospects', 'pipeline'] },
  { id: 'client-360', label: 'Clients', icon: Users2, activeFor: ['client-360', 'crm'] },
  { id: 'intelligence', label: 'Research', icon: SearchCode, activeFor: ['intelligence', 'workspaces'] },
  { id: 'copilot', label: 'Intelligence Copilot', icon: Bot },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'reports', label: 'Reports', icon: TrendingUp, activeFor: ['reports', 'weekly-report'] },
];

const adminItems: NavItem[] = [
  { id: 'executive-summary', label: 'Executive Overview', icon: Award },
  { id: 'admin-users', label: 'Users & Access', icon: ShieldCheck, activeFor: ['admin-users', 'admin-approvals', 'admin-audit', 'admin-search-analytics', 'admin-system', 'admin'] },
  { id: 'admin-reports', label: 'Management Reports', icon: FileSpreadsheet },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

const staffSettingsItem: NavItem = { id: 'settings', label: 'Settings', icon: Settings2 };

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  isCollapsed,
  onToggleCollapse,
}) => {
  const isAdminUser = currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN';

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = item.id === activeTab || item.activeFor?.includes(activeTab);

    return (
      <button
        key={item.id}
        id={`sidebar-link-${item.id}`}
        onClick={() => setActiveTab(item.id)}
        title={isCollapsed ? item.label : undefined}
        className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
          active
            ? 'bg-[#b1191f] text-white shadow-sm'
            : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="truncate font-medium">{item.label}</span>}
        </span>
        {active && !isCollapsed && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" />}
      </button>
    );
  };

  const initials = currentUser.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join('')
    .toUpperCase();

  return (
    <aside
      id="scm-sidebar"
      className={`fixed inset-y-0 left-0 z-30 flex ${isCollapsed ? 'w-16 -translate-x-full md:translate-x-0' : 'w-64 translate-x-0'} flex-col border-r border-slate-800 bg-[#091b2d] text-white shadow-xl transition-all duration-300`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-16 items-center justify-between border-b border-white/8 px-3.5">
          <ScmLogo variant="light" size="sm" showText={!isCollapsed} className="overflow-hidden" />
          <button
            onClick={onToggleCollapse}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-4">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Workspace
            </div>
          )}
          <div className="space-y-1">{workspaceItems.map(renderItem)}</div>

          {isAdminUser && (
            <>
              <div className="my-4 border-t border-white/8" />
              {!isCollapsed && (
                <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Administration
                </div>
              )}
              <div className="space-y-1">{adminItems.map(renderItem)}</div>
            </>
          )}

          {!isAdminUser && (
            <>
              <div className="my-4 border-t border-white/8" />
              <div className="space-y-1">{renderItem(staffSettingsItem)}</div>
            </>
          )}
        </nav>
      </div>

      <div className="border-t border-white/8 bg-slate-950/35 p-3">
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3' : 'justify-between gap-2'}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-bold text-white">
              {initials || 'SC'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-white">{currentUser.fullName}</div>
                <div className="truncate text-[10px] text-slate-500">
                  {currentUser.permissionLevel === 'SUPER_ADMIN'
                    ? 'Super Admin'
                    : currentUser.permissionLevel === 'HOD_ADMIN'
                      ? 'HOD Admin'
                      : 'Staff'}
                </div>
              </div>
            )}
          </div>
          <button
            id="logout-btn"
            onClick={onLogout}
            title="Sign out"
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 transition-colors hover:border-red-900/60 hover:bg-red-950/20 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
