import React from 'react';
import { BarChart3, Bot, Building2, LayoutDashboard, Menu } from 'lucide-react';

const items = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'prospects', label: 'Prospects', icon: Building2 },
  { id: 'copilot', label: 'Copilot', icon: Bot },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export const MobileNavigation: React.FC<{ activeTab: string; onNavigate: (tab: string) => void; onMore: () => void }> = ({ activeTab, onNavigate, onMore }) => (
  <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(7,25,43,.1)] backdrop-blur-xl md:hidden">
    <div className="mx-auto grid max-w-lg grid-cols-5">
      {items.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return <button key={id} onClick={() => onNavigate(id)} aria-current={active ? 'page' : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold ${active ? 'text-[#b1191f]' : 'text-slate-500'}`}><Icon className="h-5 w-5" />{label}</button>;
      })}
      <button onClick={onMore} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-slate-500"><Menu className="h-5 w-5" />More</button>
    </div>
  </nav>
);
