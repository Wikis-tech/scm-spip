import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { TrustHelpCenter } from './components/TrustHelpCenter';
import { OnboardingWizard } from './components/OnboardingWizard';
import { MeetingReminderManager } from './components/MeetingReminderManager';
import { MobileNavigation } from './components/MobileNavigation';
import { PwaExperience } from './components/PwaExperience';
import { Dashboard } from './pages/Dashboard';
import { Prospects } from './pages/Prospects';
import { Contacts } from './pages/Contacts';
import { Activities } from './pages/Activities';
import { Meetings } from './pages/Meetings';
import { Tasks } from './pages/Tasks';
import { CRM } from './pages/CRM';
import { Client360 } from './pages/Client360';
import { Pipeline } from './pages/Pipeline';
import { CalendarPage } from './pages/CalendarPage';
import { AlertTriangle, HelpCircle, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { UserProfile, UserRole, Prospect, Contact, Activity, Meeting, DashboardMetrics, Task, NewsArticle, DiscoveredLead, StaffPerformance } from './types';
import { supabase } from './lib/supabase';

const Intelligence = React.lazy(() => import('./pages/Intelligence').then(module => ({ default: module.Intelligence })));
const Reports = React.lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const Settings = React.lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const WeeklyReport = React.lazy(() => import('./pages/WeeklyReport').then(module => ({ default: module.WeeklyReport })));
const ManagementReports = React.lazy(() => import('./pages/ManagementReports').then(module => ({ default: module.ManagementReports })));
const Analytics = React.lazy(() => import('./pages/Analytics').then(module => ({ default: module.Analytics })));
const ExecutiveSummary = React.lazy(() => import('./pages/ExecutiveSummary').then(module => ({ default: module.ExecutiveSummary })));
const Workspaces = React.lazy(() => import('./pages/Workspaces').then(module => ({ default: module.Workspaces })));
const IntelligenceCopilot = React.lazy(() => import('./pages/IntelligenceCopilot').then(module => ({ default: module.IntelligenceCopilot })));

export default function App() {
  // Navigation states
  const [activeTab, setActiveTab] = useState<string>(() => {
    const requested = new URLSearchParams(window.location.search).get('view');
    return ['dashboard', 'prospects', 'copilot', 'analytics'].includes(requested || '') ? requested! : 'dashboard';
  });
  const [crmSubTab, setCrmSubTab] = useState<string>('contacts');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Automatic Intercept/Redirect for legacy CRM sub-tabs to the unified parent CRM view
  useEffect(() => {
    if (['contacts', 'activities', 'meetings', 'tasks'].includes(activeTab)) {
      setCrmSubTab(activeTab);
      setActiveTab('crm');
    }
  }, [activeTab]);

  const [onboardingActive, setOnboardingActive] = useState<boolean>(false);
  const [helpCenterActive, setHelpCenterActive] = useState<boolean>(false);
  
  // Navigation sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('scm_sidebar_collapsed') === 'true' || window.innerWidth < 1280;
  });

  // Auto-collapse sidebar on smaller screens and window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setSidebarCollapsed(true);
      } else {
        const saved = localStorage.getItem('scm_sidebar_collapsed');
        setSidebarCollapsed(saved === 'true');
      }
    };
    
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Authenticated identity comes from the persisted Supabase session, never from localStorage profile data.
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const mapProfileToUser = (profile: any): UserProfile => ({
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.permission_level === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : profile.permission_level === 'HOD_ADMIN'
        ? 'Admin'
        : 'Business Development Officer',
    permissionLevel: profile.permission_level,
    department: profile.department || 'Asset Management',
    avatarUrl: profile.avatar_url || '',
    status: profile.status === 'ACTIVE' ? 'Active' : profile.status,
  });

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session?.user?.id) {
          if (mounted) setCurrentUser(null);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, permission_level, department, status, avatar_url')
          .eq('id', session.user.id)
          .single();

        if (error || !profile || profile.status !== 'ACTIVE') {
          await supabase.auth.signOut();
          if (mounted) setCurrentUser(null);
          return;
        }

        if (mounted) setCurrentUser(mapProfileToUser(profile));
      } finally {
        if (mounted) setAuthReady(true);
      }
    };

    restoreSession();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setCurrentUser(null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // SCM CRM Database states
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProspects: 0,
    activeOpportunities: 0,
    followUpsDue: 0,
    meetingsScheduled: 0,
    financialLiteracySessions: 0,
    totalEstimatedValue: 0
  });

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [discoveredLeads, setDiscoveredLeads] = useState<DiscoveredLead[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataLoadError, setDataLoadError] = useState<string>('');

  const scmFetch = async (url: string, options: RequestInit = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  };

  // Load all SCM records from full-stack API
  const refreshDatabase = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setDataLoadError('');

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);

    const isAdminUser = currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN';

    try {
      let failedRequests = 0;
      const loadJson = async <T,>(url: string, fallback: T): Promise<T> => {
        try {
          const response = await scmFetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          return await response.json();
        } catch (error) {
          failedRequests += 1;
          console.error(`[SCM DATA] Unable to load ${url}:`, error);
          return fallback;
        }
      };

      const [resMetrics, resProspects, resContacts, resActivities, resMeetings, resTasks, resNews, resLeads, resStaff] = await Promise.all([
        loadJson('/api/dashboard/metrics', {}),
        loadJson('/api/crm/prospects', []),
        loadJson('/api/crm/contacts', []),
        loadJson('/api/crm/activities', []),
        loadJson('/api/crm/meetings', []),
        loadJson('/api/crm/tasks', []),
        loadJson('/api/news', []),
        loadJson('/api/discovery/leads', []),
        isAdminUser 
          ? loadJson('/api/team/performance', [])
          : Promise.resolve([])
      ]);

      const requestCount = isAdminUser ? 9 : 8;
      if (failedRequests === requestCount) {
        setDataLoadError('SPIP could not reach the secure CRM service. Your session is still active; please retry.');
      } else if (failedRequests > 0) {
        setDataLoadError('Some workspace information could not be refreshed. Available records are shown below.');
      }

      const safeProspects = Array.isArray(resProspects) ? resProspects : [];
      const safeContacts = Array.isArray(resContacts) ? resContacts : [];
      const safeActivities = Array.isArray(resActivities) ? resActivities : [];
      const safeMeetings = Array.isArray(resMeetings) ? resMeetings : [];
      const safeTasks = Array.isArray(resTasks) ? resTasks : [];
      const safeNews = Array.isArray(resNews) ? resNews : [];
      const safeLeads = Array.isArray(resLeads) ? resLeads : [];
      const safeStaff = Array.isArray(resStaff) ? resStaff : [];

      setMetrics({
        totalProspects: safeProspects.length,
        activeOpportunities: safeProspects.filter((p: Prospect) => !['Converted', 'Lost', 'Archived'].includes(p.status)).length,
        meetingsScheduled: safeMeetings.length,
        followUpsDue: safeTasks.filter((t: Task) => !t.isCompleted).length,
        financialLiteracySessions: safeActivities.filter((a: Activity) => a.activityType === 'Financial Literacy Session' && a.status === 'Completed').length,
        totalEstimatedValue: safeProspects.reduce((sum: number, p: Prospect) => sum + (p.opportunityValue || 0), 0)
      });
      setProspects(safeProspects);
      setContacts(safeContacts);
      setActivities(safeActivities);
      setMeetings(safeMeetings);
      setTasks(safeTasks);
      setNewsArticles(safeNews);
      setDiscoveredLeads(safeLeads);
      setStaffPerformance(safeStaff);
    } catch (err) {
      console.error('Core synchronizer engine encountering lags accessing Node server:', err);
      setDataLoadError('SPIP could not refresh the secure CRM data. Please check your connection and try again.');
    } finally {
      window.clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      if (currentUser) {
        try {
          const res = await scmFetch('/api/auth/me');
          if (!res.ok) {
            // Only authentication/authorization failures invalidate the browser session.
            // A temporary API/database outage must not bounce an authenticated user to login.
            if (res.status === 401 || res.status === 403) {
              console.warn('[SCM SECURITY] Session is no longer active or approved. Logging out.');
              setCurrentUser(null);
            } else {
              console.warn('[SCM PLATFORM] Session check temporarily unavailable; retaining valid Supabase session.');
            }
            return;
          }
          const data = await res.json();
          if (data.user) {
            // Synchronize with latest profile/status changes
            setCurrentUser(data.user);
                      }
          await refreshDatabase();
        } catch (err) {
          console.error('[SCM AUTH ENGINE] Network lags verifying user identity. Loading from cache:', err);
          await refreshDatabase();
        }
      } else {
        setIsLoading(true);
      }
    };
    checkSession();
  }, [currentUser?.id]);

  // Launch welcome onboarding wizard for first-time session logins
  useEffect(() => {
    if (currentUser) {
      const hasOnboarded = localStorage.getItem(`spip_onboarding_${currentUser.id}_v10`);
      if (hasOnboarded !== 'true') {
        setOnboardingActive(true);
      }
    }
  }, [currentUser]);

  // Prospect Action Methods
  const handleAddProspect = async (prospect: Partial<Prospect>) => {
    if (!currentUser) throw new Error('User authentication required to register organizations.');
    try {
      const body = { 
        ...prospect, 
        assignedOfficerId: currentUser.id, 
        assignedOfficerName: currentUser.fullName,
        assignedOfficerEmail: currentUser.email 
      };
      const res = await scmFetch('/api/crm/prospects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Submission rejected by SCM directory rules.');
      }
      await refreshDatabase();
      return data;
    } catch (err) {
      console.error('[SCM PROSPECT ADD ERROR]:', err);
      throw err;
    }
  };

  const handleAddNewsArticle = async (article: any) => {
    try {
      const res = await scmFetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to log corporate signal.');
      }
      await refreshDatabase();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleUpdateProspect = async (id: string, updates: Partial<Prospect>) => {
    try {
      const res = await scmFetch(`/api/crm/prospects/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Updates rejected by SCM directory rules.');
      }
      await refreshDatabase();
      return data;
    } catch (err) {
      console.error('[SCM PROSPECT UPDATE ERROR]:', err);
      throw err;
    }
  };

  const handleDeleteProspect = async (id: string) => {
    try {
      const res = await scmFetch(`/api/crm/prospects/${id}`, { 
        method: 'DELETE',
        headers: {
        }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Deletion rejected by SCM security protocols.');
      }
      await refreshDatabase();
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Contacts Action Methods
  const handleAddContact = async (contact: Partial<Contact>) => {
    try {
      const res = await scmFetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Could not add contact person.');
      }
      await refreshDatabase();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleUpdateContact = async (id: string, updates: Partial<Contact>) => {
    try {
      const res = await scmFetch(`/api/crm/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Could not update contact details.');
      }
      await refreshDatabase();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const res = await scmFetch(`/api/crm/contacts/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Deletion rejected.');
      }
      await refreshDatabase();
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Activities Action Methods
  const handleAddActivity = async (activity: Partial<Activity>) => {
    if (!currentUser) return;
    try {
      const body = { ...activity, officerId: currentUser.id, officerName: currentUser.fullName };
      const res = await scmFetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to log session note.');
      const data = await res.json();
      await refreshDatabase();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleUpdateActivity = async (id: string, updates: Partial<Activity>) => {
    try {
      const res = await scmFetch(`/api/crm/activities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update status.');
      const data = await res.json();
      await refreshDatabase();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      const res = await scmFetch(`/api/crm/activities/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Action restricted.');
      await refreshDatabase();
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Meetings Action Methods
  const handleAddMeeting = async (meeting: Partial<Meeting>) => {
    if (!currentUser) return;
    try {
      const body = { ...meeting, officerId: currentUser.id, officerName: currentUser.fullName };
      const res = await scmFetch('/api/crm/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to schedule corporate pitch.');
      const data = await res.json();
      await refreshDatabase();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleUpdateMeeting = async (id: string, updates: Partial<Meeting>) => {
    try {
      const res = await scmFetch(`/api/crm/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update meeting details.');
      const data = await res.json();
      await refreshDatabase();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    try {
      const res = await scmFetch(`/api/crm/meetings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Meeting cancel rejected.');
      await refreshDatabase();
      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Task Action Triggers
  const handleAddTask = async (task: Partial<Task>) => {
    try {
      const res = await scmFetch('/api/crm/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (!res.ok) throw new Error('Task creation failed.');
      await refreshDatabase();
    } catch (err) {
      console.error('Task logging error:', err);
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const res = await scmFetch(`/api/crm/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Task update failed.');
      await refreshDatabase();
    } catch (err) {
      console.error('Task completion toggle error:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await scmFetch(`/api/crm/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Task cancel failed.');
      await refreshDatabase();
    } catch (err) {
      console.error('Task removal error:', err);
    }
  };

  // Proactive Discovery Trigger Handlers
  const handleScanDiscovery = async (filters: any) => {
    try {
      const res = await scmFetch('/api/discovery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Discovery scan failed.');
      await refreshDatabase();
      return data;
    } catch (err: any) {
      console.error('AI Discovery scan error:', err);
      throw err;
    }
  };

  const handleTriggerDiscovery = async () => {
    try {
      const res = await scmFetch('/api/discovery/trigger', { method: 'POST' });
      if (!res.ok) throw new Error('Lead discovery trigger rejected.');
      await refreshDatabase();
    } catch (err) {
      console.error('Lead scanning error:', err);
    }
  };

  const handleImportDiscovery = async (id: string) => {
    try {
      const res = await scmFetch(`/api/discovery/import/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lead CRM importation failure.');
      await refreshDatabase();
      return data;
    } catch (err) {
      console.error('Lead import error:', err);
      throw err;
    }
  };

  const handleDismissDiscovery = async (id: string) => {
    try {
      const res = await scmFetch(`/api/discovery/lead/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to dismiss discovery lead.');
      await refreshDatabase();
    } catch (err) {
      console.error('Lead dismiss error:', err);
      throw err;
    }
  };

  const handleOpenIntelligence = async (id: string) => {
    try {
      const res = await scmFetch(`/api/discovery/open-intelligence/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to open intelligence dossier.');
      await refreshDatabase();
      return data;
    } catch (err) {
      console.error('Open intelligence error:', err);
      throw err;
    }
  };

  // Render proper tab screen
  const getActiveTabScreen = () => {
    if (!currentUser) return null;
    if (isLoading) {
      return (
        <div className="flex min-h-[55vh] flex-col items-center justify-center space-y-4 p-8" role="status" aria-live="polite">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary-brand" />
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Loading secure CRM data</span>
            <p className="mt-2 text-xs text-slate-400">Synchronising your permitted workspace records.</p>
          </div>
        </div>
      );
    }

    const isAdminUser = currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN';

    // Guard against non-admin accessing admin modules
    const adminTabs = [
      'admin', 
      'admin-users', 
      'admin-approvals', 
      'admin-audit', 
      'admin-search-analytics', 
      'admin-system', 
      'admin-reports', 
      'executive-summary'
    ];
    if (adminTabs.includes(activeTab) && !isAdminUser) {
      return (
        <div className="p-12 text-center flex flex-col items-center justify-center min-h-[55vh] font-sans">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md shadow-xl">
            <span className="text-xs font-bold text-red-500 font-mono tracking-widest uppercase block mb-3">ACCESS RESTRICTED</span>
            <h3 className="text-white text-lg font-bold">You do not have access to this page</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">This section is available only to authorized SPIP administrators.</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            metrics={metrics}
            prospects={prospects}
            activities={activities}
            meetings={meetings}
            tasks={tasks}
            setActiveTab={setActiveTab}
            onStartOnboarding={() => setOnboardingActive(true)}
          />
        );
      case 'prospects':
        return (
          <Prospects
            prospects={prospects}
            currentUser={currentUser}
            onAddProspect={handleAddProspect}
            onUpdateProspect={handleUpdateProspect}
            onDeleteProspect={handleDeleteProspect}
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            newsArticles={newsArticles}
            discoveredLeads={discoveredLeads}
            onTriggerDiscovery={handleTriggerDiscovery}
            onScanDiscovery={handleScanDiscovery}
            onImportDiscovery={handleImportDiscovery}
            onDismissDiscovery={handleDismissDiscovery}
            onOpenIntelligence={handleOpenIntelligence}
            scmFetch={scmFetch}
            staffPerformance={staffPerformance}
            onNavigate={(tab) => setActiveTab(tab)}
            onAddNewsArticle={handleAddNewsArticle}
          />
        );
      case 'workspaces':
        return (
          <Workspaces
            currentUser={currentUser}
            prospects={prospects}
            scmFetch={scmFetch}
            refreshDatabase={refreshDatabase}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onDeleteContact={handleDeleteContact}
            onAddMeeting={handleAddMeeting}
            onUpdateMeeting={handleUpdateMeeting}
            onDeleteMeeting={handleDeleteMeeting}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        );
      case 'crm':
        return (
          <CRM
            initialSubTab={crmSubTab}
            currentUser={currentUser}
            prospects={prospects}
            contacts={contacts}
            activities={activities}
            meetings={meetings}
            tasks={tasks}
            scmFetch={scmFetch}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onDeleteContact={handleDeleteContact}
            onAddActivity={handleAddActivity}
            onUpdateActivity={handleUpdateActivity}
            onDeleteActivity={handleDeleteActivity}
            onAddMeeting={handleAddMeeting}
            onUpdateMeeting={handleUpdateMeeting}
            onDeleteMeeting={handleDeleteMeeting}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        );
      case 'client-360':
        return <Client360 currentUser={currentUser} />;
      case 'pipeline':
        return (
          <Pipeline
            prospects={prospects}
            currentUser={currentUser}
            onUpdateProspect={handleUpdateProspect}
          />
        );
      case 'admin':
        return (
          <AdminDashboard
            currentUser={currentUser}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'executive-summary':
        return (
          <ExecutiveSummary
            currentUser={currentUser}
          />
        );
      case 'admin-users':
        return (
          <AdminDashboard
            currentUser={currentUser}
            initialSubTab="users"
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'admin-approvals':
        return (
          <AdminDashboard
            currentUser={currentUser}
            initialSubTab="approvals"
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'admin-audit':
        return (
          <AdminDashboard
            currentUser={currentUser}
            initialSubTab="audit"
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'admin-search-analytics':
        return (
          <AdminDashboard
            currentUser={currentUser}
            initialSubTab="search-analytics"
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'admin-system':
        return (
          <AdminDashboard
            currentUser={currentUser}
            initialSubTab="system"
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'calendar':
        return (
          <CalendarPage
            meetings={meetings}
            tasks={tasks}
            activities={activities}
            prospects={prospects}
            currentUser={currentUser}
            onAddMeeting={handleAddMeeting}
            onUpdateMeeting={handleUpdateMeeting}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
          />
        );
      case 'copilot':
        return <IntelligenceCopilot currentUser={currentUser} />;
      case 'intelligence':
        return (
          <Intelligence
            onImportProspect={handleAddProspect}
            scmFetch={scmFetch}
          />
        );
      case 'reports':
        return (
          <Reports
            prospects={prospects}
            contacts={contacts}
            activities={activities}
            meetings={meetings}
            staffPerformance={staffPerformance}
            currentUser={currentUser}
          />
        );
      case 'analytics':
        return <Analytics currentUser={currentUser} scmFetch={scmFetch} />;
      case 'weekly-report':
        return (
          <WeeklyReport
            currentUser={currentUser}
          />
        );
      case 'admin-reports':
        return (
          <ManagementReports
            currentUser={currentUser}
          />
        );
      case 'settings':
        return (
          <Settings
            currentUser={currentUser}
          />
        );
      default:
        return <div className="p-6">Module under development.</div>;
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setCurrentUser(null);
    }
  };

  const handleToggleSidebar = () => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    localStorage.setItem('scm_sidebar_collapsed', String(newValue));
  };

  if (!authReady) {
    return (
      <div className="spip-auth-grid flex min-h-screen items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-[#d82d35]" />
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Loading secure SPIP session</div>
        </div>
      </div>
    );
  }

  // Render AuthScreen if there is no authenticated Supabase session.
  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          const isAdminUser = user.permissionLevel === 'SUPER_ADMIN' || user.permissionLevel === 'HOD_ADMIN';
          setActiveTab(isAdminUser ? 'executive-summary' : 'dashboard');
        }}
      />
    );
  }

  return (
    <div id="scm-app-layout" className="spip-shell flex h-screen overflow-hidden font-sans text-slate-800">
      <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-xl transition focus:translate-y-0">
        Skip to main content
      </a>
      {/* Sidebar - Handles platform navigation and active role simulations */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (window.innerWidth < 1280) {
            setSidebarCollapsed(true);
          }
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Mobile backdrop overlay - tapping outside sidebar closes it */}
      {!sidebarCollapsed && (
        <div 
          onClick={handleToggleSidebar}
          className="fixed inset-0 z-25 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-300 md:hidden"
          aria-label="Close navigation"
        />
      )}

      {/* Main Container */}
      <div className={`relative flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'pl-0 md:pl-[72px]' : 'pl-0 md:pl-[272px]'}`}>
        {/* Header - Holds clocks, status checks and query triggers */}
        <Header
          currentUser={currentUser}
          activeTab={activeTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          setActiveTab={setActiveTab}
        />

        {/* Dynamic page content rendering */}
        <main id="main-content" className="flex-1 overflow-y-auto bg-transparent p-3 focus:outline-none sm:p-5 lg:p-7">
          <div className="spip-page-content">
            {dataLoadError && (
              <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between" role="alert">
                <div className="flex min-w-0 items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-xs font-medium leading-relaxed">{dataLoadError}</p>
                </div>
                <button onClick={refreshDatabase} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100">
                  <RefreshCw className="h-3.5 w-3.5" /> Retry sync
                </button>
              </div>
            )}
            <React.Suspense fallback={<div className="grid min-h-[45vh] place-items-center" role="status"><div className="text-center"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#b1191f]"/><p className="mt-3 text-xs font-semibold text-slate-500">Loading workspace…</p></div></div>}>
              {getActiveTabScreen()}
            </React.Suspense>
          </div>
        </main>
      </div>

      {/* Floating Unified Help & Onboarding Trigger (Phase 9 & 10) */}
      <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-30 flex items-center gap-2 md:bottom-5 md:right-5 md:z-40">
        <button
          id="global-onboarding-restart-btn"
          onClick={() => setOnboardingActive(true)}
          className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-[10px] font-bold text-white shadow-lg transition-all hover:bg-slate-800"
          title="Restart Guided Interactive Welcome Tour"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Tour Guide</span>
        </button>
        <button 
          id="global-help-center-toggle-btn"
          onClick={() => setHelpCenterActive(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-xl bg-[#b1191f] px-3 text-xs font-bold text-white shadow-lg transition-all hover:bg-[#8e1217] active:translate-y-px sm:px-4"
          title="Open SCM Support & FAQ Help Center"
        >
          <HelpCircle className="w-4 h-4 text-white" />
          <span className="hidden sm:inline">Help & Support</span>
        </button>
      </div>

      {/* Onboarding Wizard Overlay (Phase 6) */}
      {onboardingActive && (
        <OnboardingWizard
          onClose={() => {
            setOnboardingActive(false);
            localStorage.setItem(`spip_onboarding_${currentUser.id}_v10`, 'true');
          }}
          setActiveTab={setActiveTab}
        />
      )}

      {/* SCM Support Center Drawer Overlay (Phase 9) */}
      {helpCenterActive && (
        <TrustHelpCenter
          onClose={() => setHelpCenterActive(false)}
          onStartTour={() => setOnboardingActive(true)}
          currentUser={currentUser}
          scmFetch={scmFetch}
        />
      )}

      {/* SCM Browser-Based Meeting Reminders Engine */}
      <MeetingReminderManager meetings={meetings} />
      <PwaExperience />
      <MobileNavigation
        activeTab={activeTab}
        onNavigate={(tab) => { setActiveTab(tab); setSidebarCollapsed(true); }}
        onMore={() => setSidebarCollapsed(false)}
      />
    </div>
  );
}
