import React, { useState } from 'react';
import { 
  BarChart3, 
  Building2, 
  SearchCode, 
  Users2, 
  Clock, 
  Calendar,
  TrendingUp, 
  Settings2, 
  LogOut, 
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Inbox,
  Menu,
  CheckSquare,
  FileText,
  FileSpreadsheet,
  Award,
  Cpu,
  ShieldAlert,
  Briefcase
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { ScmLogo } from './ScmLogo';

interface SidebarProps {
  currentUser: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  isCollapsed,
  onToggleCollapse
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const isSuperAdmin = currentUser.permissionLevel === 'SUPER_ADMIN';
  const isAdminUser = isSuperAdmin || currentUser.permissionLevel === 'HOD_ADMIN';

  const isRelationshipOfficer = currentUser.role === 'Relationship Manager' || currentUser.role === 'Business Development Officer';

  let navItems: any[] = [];

  if (isAdminUser) {
    navItems = [
      { id: 'executive-summary', label: 'Executive Summary', icon: Award },
      { id: 'dashboard', label: 'My Dashboard', icon: BarChart3 },
      { id: 'prospects', label: 'Prospects', icon: Building2 },
      { id: 'client-360', label: 'Client 360', icon: Users2 },
      { id: 'workspaces', label: 'Research Workspaces', icon: Briefcase },
      { id: 'crm', label: 'CRM', icon: Users2 },
      { id: 'pipeline', label: 'Pipeline', icon: CheckSquare },
      { id: 'intelligence', label: 'Company Research', icon: SearchCode },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'reports', label: 'Reports', icon: TrendingUp },
      { id: 'admin-reports', label: 'Management Reports', icon: FileSpreadsheet },
      { id: 'admin-users', label: 'Administration', icon: ShieldCheck },
      { id: 'settings', label: 'Settings', icon: Settings2 },
    ];
  } else {
    navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'prospects', label: 'Prospects', icon: Building2 },
      { id: 'client-360', label: 'Client 360', icon: Users2 },
      { id: 'workspaces', label: 'Research Workspaces', icon: Briefcase },
      { id: 'crm', label: 'CRM', icon: Users2 },
      { id: 'pipeline', label: 'Pipeline', icon: CheckSquare },
      { id: 'intelligence', label: 'Company Research', icon: SearchCode },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'reports', label: 'Reports', icon: TrendingUp },
    ];
    if (isRelationshipOfficer) navItems.push({ id: 'weekly-report', label: 'Weekly Report', icon: FileText });
    navItems.push({ id: 'settings', label: 'Settings', icon: Settings2 });
  }

  const rolesList: { name: UserRole; desc: string }[] = [
    { name: 'Director', desc: 'Full pipeline CRUD + delete permissions' },
    { name: 'Relationship Manager', desc: 'Standard pipeline CRUD (no deletes)' },
    { name: 'Business Development Officer', desc: 'Lead logging & basic tracking' },
    { name: 'Admin', desc: 'System configuration & full controls' }
  ];

  return (
    <aside 
      id="scm-sidebar" 
      className={`fixed top-0 left-0 bottom-0 ${isCollapsed ? 'w-16 -translate-x-full md:translate-x-0' : 'w-64 translate-x-0'} bg-brand-neutral text-white flex flex-col justify-between z-30 shadow-xl border-r border-slate-800 transition-all duration-300`}
    >
      {/* Brand & Identity Header */}
      <div>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between select-none">
          <ScmLogo variant="light" size="sm" showText={!isCollapsed} className="overflow-hidden" />

          <button 
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all ml-1.5 shrink-0"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
 
        {/* Navigation Grid */}
        <nav className="p-2.5 space-y-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id || 
                             (item.id === 'admin-users' && ['admin-users', 'admin-approvals', 'admin-audit', 'admin-search-analytics', 'admin-system', 'admin'].includes(activeTab));
            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-primary-brand text-white shadow-lg shadow-red-900/30 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : item.highlight ? 'text-red-400' : 'text-slate-400 group-hover:text-white'
                  }`} />
                  {!isCollapsed && <span className="transition-all duration-300">{item.label}</span>}
                </div>
                {!isCollapsed && item.highlight && !isActive && (
                  <span className="bg-red-950/50 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-900/50 flex items-center gap-0.5 uppercase tracking-wide">
                    <Sparkles className="w-2.5 h-2.5" /> AI
                  </span>
                )}
                {isCollapsed && item.highlight && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2 animate-pulse"></span>
                )}
                {isActive && !isCollapsed && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Session panel */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 font-sans relative">
        {/* Base Profile Info */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3 justify-center' : 'justify-between'} gap-2`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-extrabold text-sm capitalize font-display shrink-0">
              {currentUser.fullName.split(' ').map(n => n ? n[0] : '').join('')}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden transition-all duration-300">
                <span className="text-xs font-bold text-white block truncate">{currentUser.fullName}</span>
                <span className="text-[10px] text-slate-500 block truncate leading-tight">{currentUser.email}</span>
              </div>
            )}
          </div>
          
          <button
            id="logout-btn"
            onClick={onLogout}
            title="Log out of session"
            className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/20 hover:border-red-900/50 transition-all shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
