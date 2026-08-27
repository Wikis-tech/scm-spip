import React, { useEffect, useState, useRef } from 'react';
import { Bell, ShieldAlert, Cpu, Search, HelpCircle, Activity, Menu, X, Calendar, Sparkles, CheckCircle, Eye, ExternalLink } from 'lucide-react';
import { UserProfile, Reminder, InAppNotification } from '../types';
import { ScmLogo } from './ScmLogo';
import { getRuntimeEnvironment } from '../services/pushService';

interface HeaderProps {
  currentUser: UserProfile;
  activeTab: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  setActiveTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  searchTerm,
  setSearchTerm,
  sidebarCollapsed,
  onToggleSidebar,
  setActiveTab
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [showReminders, setShowReminders] = useState(false);
  const [activeDropdownTab, setActiveDropdownTab] = useState<'notifications' | 'reminders'>('notifications');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchReminders = async () => {
    try {
      const r = await fetch('/api/reminders');
      if (r.ok) {
        const list = await r.json();
        setReminders(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.warn("Failed to fetch reminders:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const n = await fetch(`/api/notifications?userId=${currentUser.id}&role=${currentUser.role}`);
      if (n.ok) {
        const list = await n.json();
        setNotifications(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    }
  };

  // --- ENTERPRISE DESKTOP & BROWSER NOTIFICATIONS CONTROLLER ---
  const alertedNotifIdsRef = useRef<Set<string>>(new Set());
  const [isInitialNotifsLoad, setIsInitialNotifsLoad] = useState(true);

  // Helper mapping notification categories to tab routes
  const getTabForNotification = (type: string, titleStr: string): { tab: string; subTab?: string } => {
    const t = (type || '').toLowerCase();
    const s = (titleStr || '').toLowerCase();
    if (t.includes('meeting') || s.includes('meeting')) {
      return { tab: 'crm', subTab: 'meetings' };
    }
    if (t.includes('task') || s.includes('task')) {
      return { tab: 'crm', subTab: 'tasks' };
    }
    if (t.includes('follow-up') || t.includes('activity') || s.includes('follow-up')) {
      return { tab: 'crm', subTab: 'activities' };
    }
    if (t.includes('prospect') || s.includes('prospect')) {
      return { tab: 'prospects' };
    }
    if (t.includes('opportunity') || s.includes('opportunity') || t.includes('deal') || s.includes('deal')) {
      return { tab: 'pipeline' };
    }
    if (t.includes('report') || s.includes('report') || t.includes('weekly') || s.includes('weekly')) {
      return { tab: 'weekly-report' };
    }
    return { tab: 'dashboard' };
  };

  const triggerBrowserNotification = (notif: InAppNotification) => {
    // If inside Android app WebView container, rely entirely on native push notifications, do not trigger browser notification
    if (getRuntimeEnvironment() === 'android-app') {
      return;
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const title = notif.title || 'SCM Capital Markets';
        const body = notif.message || 'New update available.';
        const n = new Notification(title, {
          body: body,
          icon: 'https://cdn-icons-png.flaticon.com/512/3119/3119338.png',
          tag: notif.id
        });
        
        n.onclick = () => {
          window.focus();
          n.close();
          const target = getTabForNotification(notif.type, notif.title);
          if (setActiveTab) {
            if (target.subTab) {
              setActiveTab(target.subTab);
            } else {
              setActiveTab(target.tab);
            }
          }
        };
      } catch (err) {
        console.warn('Native notification blocked or failed:', err);
      }
    }
  };

  // Reset initial load status when user profile changes
  useEffect(() => {
    setIsInitialNotifsLoad(true);
    alertedNotifIdsRef.current = new Set();
    try {
      const saved = localStorage.getItem(`SCM_NOTIFIED_NOTIF_IDS_${currentUser.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          alertedNotifIdsRef.current = new Set(parsed);
          setIsInitialNotifsLoad(false);
        }
      }
    } catch (e) {
      console.warn("Failed to load notified IDs from cache:", e);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (notifications.length > 0) {
      let updated = false;
      if (isInitialNotifsLoad) {
        // Prevent spamming on initial page load
        notifications.forEach(notif => {
          alertedNotifIdsRef.current.add(notif.id);
        });
        updated = true;
        setIsInitialNotifsLoad(false);
      } else {
        // Fire alerts for new, unread notifications
        notifications.forEach(notif => {
          if (!alertedNotifIdsRef.current.has(notif.id)) {
            alertedNotifIdsRef.current.add(notif.id);
            updated = true;

            if (!notif.isRead) {
              triggerBrowserNotification(notif);
            }
          }
        });
      }

      if (updated) {
        localStorage.setItem(
          `SCM_NOTIFIED_NOTIF_IDS_${currentUser.id}`, 
          JSON.stringify(Array.from(alertedNotifIdsRef.current))
        );
      }
    }
  }, [notifications, isInitialNotifsLoad, currentUser.id]);

  useEffect(() => {
    fetchReminders();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchReminders();
      fetchNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDismissReminder = async (id: string) => {
    try {
      const r = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      if (r.ok) {
        setReminders(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.warn("Failed to dismiss reminder:", err);
    }
  };

  const handleMarkNotificationRead = async (id: string, isRead: boolean) => {
    try {
      const r = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead })
      });
      if (r.ok) {
        setNotifications(prev =>
          prev.map(item => (item.id === id ? { ...item, isRead } : item))
        );
      }
    } catch (err) {
      console.warn("Failed to update notification state:", err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const r = await fetch(`/api/notifications/mark-all-read?userId=${currentUser.id}`, { method: 'POST' });
      if (r.ok) {
        setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
      }
    } catch (err) {
      console.warn("Failed to mark all read:", err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      const r = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (r.ok) {
        setNotifications(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.warn("Failed to delete notification:", err);
    }
  };

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'executive-summary': return 'Executive Summary';
      case 'admin-users': return 'Enterprise Administration';
      case 'admin-approvals': return 'Enterprise Administration - Approvals';
      case 'admin-audit': return 'Enterprise Administration - Audit';
      case 'admin-search-analytics': return 'Enterprise Administration - Search Analytics';
      case 'admin-system': return 'Enterprise Administration - Diagnostics';
      case 'admin-reports': return 'Weekly Administrative Reports';
      case 'workspaces': return 'Research Workspaces';
      case 'prospects': return 'Prospect Administration';
      case 'intelligence': return 'SCM Prospect Intelligence Engine';
      case 'contacts': return 'Key Contact Directory';
      case 'activities': return 'Activity Hub & Presentations';
      case 'meetings': return 'Scheduled Corporate Calendar';
      case 'tasks': return 'Client Task Pipeline';
      case 'calendar': return 'Interactive SCM Calendar';
      case 'reports': return 'Intelligence Performance Index';
      case 'settings': return 'App Parameters';
      default: return 'SCM Capital Prospect Intelligence';
    }
  };

  const unreadNotifsCount = notifications.filter(n => !n.isRead).length;
  const totalAlertsCount = unreadNotifsCount; // Reflect only active unread alerts count on the bell badge

  return (
    <header id="scm-header" className={`h-16 bg-white border-b border-slate-200/80 sticky top-0 px-6 flex items-center justify-between shadow-sm font-sans transition-all ${showReminders ? 'z-40' : 'z-10'}`}>
      {/* Page Title & Search */}
      <div className="flex items-center gap-4 grow max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-850 hover:bg-slate-100 transition-all shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {sidebarCollapsed && (
          <ScmLogo variant="color" size="sm" showText={false} className="hidden sm:flex transition-all shrink-0" />
        )}
        
        <div className="flex flex-col">
          <h1 className="font-display font-semibold text-base sm:text-lg text-brand-neutral tracking-tight truncate">
            {getPageTitle(activeTab)}
          </h1>
          <span className="text-[10px] text-slate-400 capitalize hidden sm:block">
            Connected as {currentUser.fullName} • {currentUser.role}
          </span>
        </div>

        {/* Global Search Interface */}
        <div className="relative grow hidden md:block">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="global-search-bar"
            type="text"
            placeholder={`Search across active filters & records...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg pl-9 pr-4 py-1.5 text-xs text-brand-neutral placeholder-slate-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-4 text-xs font-medium bg-white">
        {/* Real-time Notifications BellDropdown */}
        <div className="relative">
          <button
            onClick={() => setShowReminders(!showReminders)}
            className="w-11 h-11 sm:w-10 sm:h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg relative transition-all cursor-pointer flex items-center justify-center border border-slate-200/60"
            title="SCM Real-time Corporate Notifications"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            {totalAlertsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#b1191f] text-white font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white shrink-0 animate-bounce">
                {totalAlertsCount}
              </span>
            )}
          </button>          {showReminders && (
            <>
              {/* Desktop Dropdown Layout */}
              <div className="hidden sm:block absolute right-[-1.5rem] sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden text-[11.5px] text-[#0d1527] animate-in fade-in slide-in-from-top-1">
                <div className="p-3 bg-slate-50 text-[#0d1527] border-b border-slate-150 flex items-center justify-between">
                  <span className="font-bold tracking-wider font-display text-[10px] uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                    SCM Communication Center
                  </span>
                  <button 
                    onClick={() => setShowReminders(false)} 
                    className="w-11 h-11 -mr-2 flex items-center justify-center text-slate-500 hover:text-slate-850 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                    aria-label="Close notification center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Notification Center Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                  <button
                    onClick={() => setActiveDropdownTab('notifications')}
                    className={`flex-1 py-3 font-bold uppercase text-[9.5px] tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                      activeDropdownTab === 'notifications'
                        ? 'border-[#b1191f] text-[#b1191f] bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    In-App Alerts ({unreadNotifsCount})
                  </button>
                  <button
                    onClick={() => setActiveDropdownTab('reminders')}
                    className={`flex-1 py-3 font-bold uppercase text-[9.5px] tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                      activeDropdownTab === 'reminders'
                        ? 'border-[#b1191f] text-[#b1191f] bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Action Reminders ({reminders.length})
                  </button>
                </div>

                <div id="scm-communication-timeline" className="max-h-[350px] overflow-y-auto divide-y divide-slate-100 bg-white">
                  {activeDropdownTab === 'notifications' ? (
                    notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 bg-slate-50/50" id="no-active-notifications-container">
                        <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <p className="font-semibold text-slate-705">No active notifications</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Automated business development signals are clear.</p>
                      </div>
                    ) : (
                      <>
                        {unreadNotifsCount > 0 && (
                          <div className="p-2 bg-slate-50/80 flex justify-between items-center border-b border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Active Alerts ({unreadNotifsCount})</span>
                            <button
                              onClick={handleMarkAllNotificationsRead}
                              className="text-[9.5px] text-[#b1191f] hover:underline font-bold px-2 py-1 cursor-pointer"
                            >
                              Mark All as Read
                            </button>
                          </div>
                        )}
                        
                        {/* 1. Active Unread Notifications */}
                        {notifications.filter(n => !n.isRead).map(notif => {
                          const cat = notif.category || 'Opportunity';
                          const pri = notif.priority || 'High';
                          const isMeeting = cat === 'Meeting';
                          const isTask = cat === 'Task';
                          const isAssign = cat === 'Assignment';
                          const isApprove = cat === 'Approval';
                          
                          return (
                            <div 
                              key={notif.id} 
                              className="p-3 relative flex gap-2.5 items-start text-left hover:bg-slate-50 transition-colors bg-red-50/30 font-medium border-b border-slate-100"
                            >
                              <div className={`p-1.5 rounded mt-0.5 border ${
                                isMeeting ? 'bg-emerald-50 text-emerald-650 border-emerald-150' :
                                isTask ? 'bg-blue-50 text-blue-650 border-blue-150' :
                                isAssign ? 'bg-purple-50 text-purple-650 border-purple-150' :
                                isApprove ? 'bg-amber-50 text-amber-650 border-amber-150' :
                                'bg-rose-50 text-rose-650 border-rose-150'
                              }`}>
                                <Activity className="w-3.5 h-3.5" />
                              </div>
                              <div className="grow min-w-0 pr-22">
                                <div className="flex flex-wrap gap-1 items-center mb-1">
                                  <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                                    isMeeting ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                                    isTask ? 'bg-blue-50 text-blue-700 border-blue-150' :
                                    isAssign ? 'bg-purple-50 text-purple-700 border-purple-150' :
                                    isApprove ? 'bg-amber-50 text-amber-700 border-amber-150' :
                                    'bg-red-50 text-[#b1191f] border-red-150'
                                  }`}>
                                    {cat}
                                  </span>
                                  <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                                    pri === 'High' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    {pri}
                                  </span>
                                </div>
                                <span className="font-bold text-[11px] text-slate-900 leading-tight block">
                                  {notif.title}
                                </span>
                                <span className="text-[10px] text-slate-600 block mt-1 leading-normal">
                                  {notif.message}
                                </span>
                                <span className="text-[8.5px] text-slate-400 uppercase font-bold block mt-1.5">
                                  {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.timestamp).toLocaleDateString()}
                                </span>
                              </div>
   
                              <div className="absolute top-2 right-2 flex gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkNotificationRead(notif.id, true);
                                  }}
                                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                                  title="Mark resolved (move into history)"
                                  aria-label="Mark notification as read"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNotification(notif.id);
                                  }}
                                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                                  title="Delete alert"
                                  aria-label="Delete notification"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
   
                        {/* 2. Old Resolved Notifications (History) */}
                        {notifications.filter(n => n.isRead).length > 0 && (
                          <div className="p-1.5 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase border-y border-slate-200 text-left px-3">
                            Alert History & Archive ({notifications.filter(n => n.isRead).length})
                          </div>
                        )}
                        
                        {notifications.filter(n => n.isRead).map(notif => {
                          const cat = notif.category || 'Opportunity';
                          const pri = notif.priority || 'High';
                          const isMeeting = cat === 'Meeting';
                          const isTask = cat === 'Task';
                          const isAssign = cat === 'Assignment';
                          const isApprove = cat === 'Approval';
                          
                          return (
                            <div 
                              key={notif.id} 
                              className="p-3 relative flex gap-2.5 items-start text-left hover:bg-slate-50 transition-colors bg-slate-50/40 opacity-70 border-b border-slate-100"
                            >
                              <div className={`p-1.5 rounded mt-0.5 border opacity-60 ${
                                isMeeting ? 'bg-emerald-50 text-emerald-650 border-emerald-150' :
                                isTask ? 'bg-blue-50 text-blue-650 border-blue-150' :
                                isAssign ? 'bg-purple-50 text-purple-650 border-purple-150' :
                                isApprove ? 'bg-amber-50 text-amber-650 border-amber-150' :
                                'bg-rose-50 text-rose-650 border-rose-150'
                              }`}>
                                <Activity className="w-3.5 h-3.5" />
                              </div>
                              <div className="grow min-w-0 pr-22">
                                <div className="flex flex-wrap gap-1 items-center mb-1 select-none">
                                  <span className="text-[8px] font-extrabold uppercase px-1.2 py-0.1 rounded border bg-slate-100 text-slate-500 border-slate-200">
                                    {cat}
                                  </span>
                                  <span className="text-[8px] font-extrabold uppercase px-1.2 py-0.1 rounded border bg-slate-100 text-slate-500 border-slate-200">
                                    {pri}
                                  </span>
                                  <span className="text-[8px] font-bold uppercase text-emerald-600 bg-emerald-50/50 px-1 py-0.1 rounded border border-emerald-150">
                                    RESOLVED
                                  </span>
                                </div>
                                <span className="font-bold text-[11px] text-slate-700 leading-tight block line-through">
                                  {notif.title}
                                </span>
                                <span className="text-[10px] text-slate-500 block mt-1 leading-normal">
                                  {notif.message}
                                </span>
                                <span className="text-[8.5px] text-slate-400 uppercase font-bold block mt-1.5">
                                  {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.timestamp).toLocaleDateString()}
                                </span>
                              </div>
   
                              <div className="absolute top-2 right-2 flex gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkNotificationRead(notif.id, false);
                                  }}
                                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-[#b1191f] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                                  title="Mark active"
                                  aria-label="Mark notification as unread"
                                >
                                  <Eye className="w-4 h-4 opacity-50" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNotification(notif.id);
                                  }}
                                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                                  title="Delete alert"
                                  aria-label="Delete notification"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )
                  ) : (
                    reminders.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 bg-slate-50/50">
                        <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">All reminders cleared</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Meetings & active follow-ups are up-to-date.</p>
                      </div>
                    ) : (
                      reminders.map(rem => (
                        <div key={rem.id} className="p-3 hover:bg-slate-50/70 transition-colors relative flex gap-2.5 items-start text-left bg-white">
                          <div className="p-1.5 bg-slate-100 rounded text-slate-500 mt-0.5">
                            {rem.type === 'meeting' ? (
                              <Calendar className="w-3.5 h-3.5 text-[#b1191f]" />
                            ) : rem.type === 'activity' ? (
                              <Activity className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            )}
                          </div>
                          <div className="grow min-w-0 pr-12">
                            <span className="font-bold block text-[11px] text-slate-800 leading-tight">{rem.title}</span>
                            <span className="text-[9px] font-semibold text-slate-400 block tracking-wide uppercase mt-0.5">{rem.prospectName}</span>
                            <div className="flex gap-1.5 items-center mt-1">
                              <span className="text-[8.5px] uppercase font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1 rounded">
                                {rem.reminderTimeText}
                              </span>
                            </div>
                            <span className="text-[9.5px] text-slate-500 block mt-1 leading-normal font-semibold text-left">{rem.reminderDateTime}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissReminder(rem.id);
                            }}
                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition-colors absolute top-1.5 right-1.5 cursor-pointer"
                            title="Dismiss Alert"
                            aria-label="Dismiss action reminder"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>

              {/* Mobile Drawer Slide-from-top Sheet Layout */}
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] sm:hidden flex flex-col justify-start">
                {/* Touch backdrop area below the sheet to easily tap and close */}
                <div className="absolute inset-0 cursor-pointer animate-fade-in" onClick={() => setShowReminders(false)} />
                
                {/* Slide from top Drawer Container */}
                <div className="relative w-full max-h-[75vh] bg-white rounded-b-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-down pointer-events-auto border-b border-slate-250">
                  {/* Drawer Header */}
                  <div className="p-4 bg-slate-50 text-[#0d1527] border-b border-slate-200 flex items-center justify-between shrink-0">
                    <span className="font-bold tracking-wider font-display text-[11px] uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                      SCM Communication Center
                    </span>
                    <button 
                      onClick={() => setShowReminders(false)} 
                      className="w-11 h-11 -mr-1.5 flex items-center justify-center text-slate-500 hover:text-slate-850 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                      aria-label="Close notification center"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-slate-200 bg-slate-50/55 shrink-0">
                    <button
                      onClick={() => setActiveDropdownTab('notifications')}
                      className={`flex-1 py-3.5 font-bold uppercase text-[10px] tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                        activeDropdownTab === 'notifications'
                          ? 'border-[#b1191f] text-[#b1191f] bg-white'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      In-App Alerts ({unreadNotifsCount})
                    </button>
                    <button
                      onClick={() => setActiveDropdownTab('reminders')}
                      className={`flex-1 py-3.5 font-bold uppercase text-[10px] tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                        activeDropdownTab === 'reminders'
                          ? 'border-[#b1191f] text-[#b1191f] bg-white'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Action Reminders ({reminders.length})
                    </button>
                  </div>

                  {/* Scrollable Body */}
                  <div className="overflow-y-auto grow bg-white" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {activeDropdownTab === 'notifications' ? (
                      notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50/50">
                          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No active notifications</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Automated business development signals are clear.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {unreadNotifsCount > 0 && (
                            <div className="p-3 bg-slate-50/80 flex justify-between items-center border-b border-slate-100 sticky top-0 z-10">
                              <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Active Alerts ({unreadNotifsCount})</span>
                              <button
                                onClick={handleMarkAllNotificationsRead}
                                className="text-[11px] text-[#b1191f] hover:underline font-bold px-3 py-1.5 cursor-pointer bg-white rounded-lg border border-slate-200/80 shadow-sm"
                              >
                                Mark All Read
                              </button>
                            </div>
                          )}
                          
                          {notifications.filter(n => !n.isRead).map(notif => {
                            const cat = notif.category || 'Opportunity';
                            const pri = notif.priority || 'High';
                            const isMeeting = cat === 'Meeting';
                            const isTask = cat === 'Task';
                            const isAssign = cat === 'Assignment';
                            const isApprove = cat === 'Approval';
                            
                            return (
                              <div 
                                key={notif.id} 
                                className="p-4 relative flex gap-3.5 items-start text-left hover:bg-slate-50/80 transition-colors bg-red-50/20 font-medium border-b border-slate-100"
                              >
                                <div className={`p-2.5 rounded-lg mt-0.5 border shrink-0 ${
                                  isMeeting ? 'bg-emerald-50 text-emerald-650 border-emerald-150' :
                                  isTask ? 'bg-blue-50 text-blue-650 border-blue-150' :
                                  isAssign ? 'bg-purple-50 text-purple-650 border-purple-150' :
                                  isApprove ? 'bg-amber-50 text-amber-650 border-amber-150' :
                                  'bg-rose-50 text-rose-650 border-rose-150'
                                }`}>
                                  <Activity className="w-4 h-4" />
                                </div>
                                <div className="grow min-w-0 pr-24">
                                  <div className="flex flex-wrap gap-1 items-center mb-1.5">
                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                                      isMeeting ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                                      isTask ? 'bg-blue-50 text-blue-700 border-blue-150' :
                                      isAssign ? 'bg-purple-50 text-purple-700 border-purple-150' :
                                      isApprove ? 'bg-amber-50 text-amber-700 border-amber-150' :
                                      'bg-red-50 text-[#b1191f] border-red-150'
                                    }`}>
                                      {cat}
                                    </span>
                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                                      pri === 'High' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                      {pri}
                                    </span>
                                  </div>
                                  <span className="font-bold text-xs text-slate-900 leading-snug block">
                                    {notif.title}
                                  </span>
                                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                    {notif.message}
                                  </p>
                                  <span className="text-[9px] text-slate-400 uppercase font-bold block mt-2">
                                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.timestamp).toLocaleDateString()}
                                  </span>
                                </div>

                                {/* Touch friendly close/resolve buttons for mobile with large targets */}
                                <div className="absolute top-3.5 right-3.5 flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkNotificationRead(notif.id, true);
                                    }}
                                    className="w-12 h-12 flex items-center justify-center text-emerald-600 bg-emerald-50 active:bg-emerald-100 rounded-full transition-colors cursor-pointer border border-emerald-200"
                                    title="Mark resolved"
                                    aria-label="Mark notification as read"
                                  >
                                    <Eye className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notif.id);
                                    }}
                                    className="w-12 h-12 flex items-center justify-center text-red-550 bg-red-50 active:bg-red-100 rounded-full transition-colors cursor-pointer border border-red-200"
                                    title="Delete alert"
                                    aria-label="Delete notification"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {notifications.filter(n => n.isRead).length > 0 && (
                            <div className="p-2 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase border-y border-slate-200 text-left px-4">
                              Archive History ({notifications.filter(n => n.isRead).length})
                            </div>
                          )}

                          {notifications.filter(n => n.isRead).map(notif => {
                            const cat = notif.category || 'Opportunity';
                            const pri = notif.priority || 'High';
                            const isMeeting = cat === 'Meeting';
                            const isTask = cat === 'Task';
                            const isAssign = cat === 'Assignment';
                            const isApprove = cat === 'Approval';

                            return (
                              <div 
                                key={notif.id} 
                                className="p-4 relative flex gap-3.5 items-start text-left hover:bg-slate-50 transition-colors bg-slate-50/40 opacity-70 border-b border-slate-100"
                              >
                                <div className={`p-2 rounded-lg mt-0.5 border shrink-0 opacity-60 ${
                                  isMeeting ? 'bg-emerald-50 text-emerald-650 border-emerald-150' :
                                  isTask ? 'bg-blue-50 text-blue-650 border-blue-150' :
                                  isAssign ? 'bg-purple-50 text-purple-650 border-purple-150' :
                                  isApprove ? 'bg-amber-50 text-amber-650 border-amber-150' :
                                  'bg-rose-50 text-rose-650 border-rose-150'
                                }`}>
                                  <Activity className="w-4 h-4" />
                                </div>
                                <div className="grow min-w-0 pr-24">
                                  <div className="flex flex-wrap gap-1 items-center mb-1.5 select-none">
                                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border bg-slate-100 text-slate-500 border-slate-200">
                                      {cat}
                                    </span>
                                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border bg-slate-100 text-slate-500 border-slate-200">
                                      {pri}
                                    </span>
                                    <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50/50 px-1.5 py-0.5 rounded border border-emerald-150">
                                      RESOLVED
                                    </span>
                                  </div>
                                  <span className="font-bold text-xs text-slate-700 leading-snug block line-through">
                                    {notif.title}
                                  </span>
                                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                    {notif.message}
                                  </p>
                                  <span className="text-[9px] text-slate-400 uppercase font-bold block mt-2">
                                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.timestamp).toLocaleDateString()}
                                  </span>
                                </div>

                                <div className="absolute top-3.5 right-3.5 flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkNotificationRead(notif.id, false);
                                    }}
                                    className="w-12 h-12 flex items-center justify-center text-slate-400 active:bg-slate-100 rounded-full transition-colors cursor-pointer border border-slate-200"
                                    title="Mark active"
                                    aria-label="Mark notification as unread"
                                  >
                                    <Eye className="w-5 h-5 opacity-50" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notif.id);
                                    }}
                                    className="w-12 h-12 flex items-center justify-center text-slate-400 active:bg-slate-100 rounded-full transition-colors cursor-pointer border border-slate-200"
                                    title="Delete alert"
                                    aria-label="Delete notification"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      reminders.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50/50">
                          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                          <p className="font-semibold text-slate-600">All reminders cleared</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Meetings & active follow-ups are up-to-date.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 bg-white">
                          {reminders.map(rem => (
                            <div key={rem.id} className="p-4 hover:bg-slate-50/70 transition-colors relative flex gap-3.5 items-start text-left bg-white">
                              <div className="p-2.5 bg-slate-100 rounded-lg text-slate-500 mt-0.5 shrink-0">
                                {rem.type === 'meeting' ? (
                                  <Calendar className="w-4 h-4 text-[#b1191f]" />
                                ) : rem.type === 'activity' ? (
                                  <Activity className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Sparkles className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                              <div className="grow min-w-0 pr-14">
                                <span className="font-bold block text-xs text-slate-800 leading-snug">{rem.title}</span>
                                <span className="text-[9px] font-semibold text-slate-400 block tracking-wide uppercase mt-1">{rem.prospectName}</span>
                                <div className="flex gap-1.5 items-center mt-1.5">
                                  <span className="text-[9px] uppercase font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded">
                                    {rem.reminderTimeText}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 block mt-1.5 leading-relaxed font-semibold text-left">{rem.reminderDateTime}</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDismissReminder(rem.id);
                                }}
                                className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-red-500 active:bg-slate-150 rounded-full transition-colors absolute top-2 right-2 cursor-pointer border border-slate-150 bg-slate-50"
                                title="Dismiss Alert"
                                aria-label="Dismiss action reminder"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Live Clock */}
        <span className="font-mono text-[11px] bg-slate-100 px-2.5 py-1 rounded text-slate-500 border border-slate-200/60 hidden sm:block">
          {timeStr}
        </span>

        {/* System Credentials Status */}
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="hidden md:inline uppercase tracking-wider font-bold text-[9px]">Server Live</span>
        </div>

        {/* Gemini Engine Connected */}
        <div className="flex items-center gap-1.5 bg-red-50 text-[#b1191f] border border-red-100 px-2.5 py-1 rounded text-[11px] font-semibold">
          <Cpu className="w-3.5 h-3.5 text-[#b1191f]" />
          <span className="hidden lg:inline uppercase tracking-wider font-bold text-[9px]">Gemini 3.5 AI Enabled</span>
        </div>

        {/* User Role Authorization Signifier */}
        <div className="flex items-center text-slate-550 border border-slate-200/80 px-2 py-1 rounded bg-slate-50 select-none">
          {currentUser.permissionLevel === 'SUPER_ADMIN' ? (
            <span className="text-red-700 font-bold text-[10px] uppercase tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Super Admin
            </span>
          ) : currentUser.permissionLevel === 'HOD_ADMIN' ? (
            <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> HOD Admin
            </span>
          ) : (
            <span className="text-amber-600 font-bold text-[10px] uppercase tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Staff Access
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
