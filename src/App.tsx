import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { TrustHelpCenter } from './components/TrustHelpCenter';
import { OnboardingWizard } from './components/OnboardingWizard';
import { MeetingReminderManager } from './components/MeetingReminderManager';
import { Dashboard } from './pages/Dashboard';
import { Prospects } from './pages/Prospects';
import { Intelligence } from './pages/Intelligence';
import { Contacts } from './pages/Contacts';
import { Activities } from './pages/Activities';
import { Meetings } from './pages/Meetings';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Tasks } from './pages/Tasks';
import { CRM } from './pages/CRM';
import { Pipeline } from './pages/Pipeline';
import { CalendarPage } from './pages/CalendarPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { WeeklyReport } from './pages/WeeklyReport';
import { AdminReports } from './pages/AdminReports';
import { ExecutiveSummary } from './pages/ExecutiveSummary';
import { Workspaces } from './pages/Workspaces';
import { HelpCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { UserProfile, UserRole, Prospect, Contact, Activity, Meeting, DashboardMetrics, Task, NewsArticle, DiscoveredLead, StaffPerformance } from './types';
import { registerServiceWorkerAndSubscribe, isPushSupported } from './services/pushService';

// Mock users list matching our seeded profiles and SCM roles
const simulationUsers: UserProfile[] = [
  { id: 'user-1', fullName: 'Julian Draxler', email: 'julian.draxler@scmcapitalng.com', role: 'Director', department: 'Executive Management' },
  { id: 'user-2', fullName: 'John Dept', email: 'john.dept@scmcapitalng.com', role: 'Relationship Manager', department: 'Wealth Advisory Unit' },
  { id: 'user-3', fullName: 'Adewale Thompson', email: 'adewale.thompson@scmcapitalng.com', role: 'Business Development Officer', department: 'Institutional Sales Unit' }
];

export default function App() {
  // Navigation states
  const [activeTab, setActiveTab] = useState<string>(() => {
    const saved = localStorage.getItem('scm_auth_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        const isSuperAdmin = user.email === 'wisdom.okoh@scmcapitalng.com' || 
                             user.email === 'omololu.ajediran@scmcapitalng.com';
        const isAdminUser = isSuperAdmin || 
                            user.role === 'Admin' || 
                            user.role === 'SUPER_ADMIN' ||
                            user.role === 'Administrator';
        if (isAdminUser) {
          return 'executive-summary';
        }
      } catch (e) {}
    }
    return 'dashboard';
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

  // Simulated User state - load from persistent session or start as null to prompt AuthScreen
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('scm_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Redirect Admin from 'dashboard' to 'executive-summary' and remove legacy sidebar views
  useEffect(() => {
    if (currentUser) {
      const isSuperAdmin = currentUser.email === 'wisdom.okoh@scmcapitalng.com' || 
                           currentUser.email === 'omololu.ajediran@scmcapitalng.com';
      const isAdminUser = isSuperAdmin || 
                          currentUser.role === 'Admin' || 
                          currentUser.role === 'SUPER_ADMIN' ||
                          currentUser.role === 'Administrator';
      if (isAdminUser) {
        if (activeTab === 'dashboard') {
          setActiveTab('executive-summary');
        }
      }
    }
  }, [currentUser, activeTab]);

  // Auto-register background service worker and push subscription for authenticated user
  useEffect(() => {
    if (currentUser && isPushSupported()) {
      if (Notification.permission !== 'denied') {
        registerServiceWorkerAndSubscribe(currentUser.id, currentUser.email, currentUser.role)
          .then((success) => {
            if (success) {
              console.log('[PUSH SERVICE] Successfully auto-registered and synchronized web push subscription.');
            }
          })
          .catch((err) => {
            console.error('[PUSH SERVICE ERROR] Failed to register or synchronize:', err);
          });
      }
    }
  }, [currentUser]);

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

  const scmFetch = (url: string, options: RequestInit = {}) => {
    const headers = {
      ...(options.headers || {}),
      'x-user-id': currentUser?.id || '',
      'x-user-role': currentUser?.role || '',
      'x-user-email': currentUser?.email || ''
    };
    return fetch(url, { ...options, headers });
  };

  // Load all SCM records from full-stack API
  const refreshDatabase = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    const isSuperAdmin = currentUser.email === 'wisdom.okoh@scmcapitalng.com' || 
                         currentUser.email === 'omololu.ajediran@scmcapitalng.com';
    const isAdminUser = isSuperAdmin || 
                        currentUser.role === 'Admin' || 
                        currentUser.role === 'SUPER_ADMIN' ||
                        currentUser.role === 'Administrator';

    try {
      const [resMetrics, resProspects, resContacts, resActivities, resMeetings, resTasks, resNews, resLeads, resStaff] = await Promise.all([
        scmFetch('/api/dashboard/metrics').then(r => r.json()).catch(() => ({})),
        scmFetch('/api/prospects').then(r => r.json()).catch(() => []),
        scmFetch('/api/contacts').then(r => r.json()).catch(() => []),
        scmFetch('/api/activities').then(r => r.json()).catch(() => []),
        scmFetch('/api/meetings').then(r => r.json()).catch(() => []),
        scmFetch('/api/tasks').then(r => r.json()).catch(() => []),
        scmFetch('/api/news').then(r => r.json()).catch(() => []),
        scmFetch('/api/discovery/leads').then(r => r.json()).catch(() => []),
        isAdminUser 
          ? scmFetch('/api/team/performance').then(r => r.json()).catch(() => [])
          : Promise.resolve([])
      ]);

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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      if (currentUser) {
        try {
          const res = await scmFetch('/api/auth/me');
          if (!res.ok) {
            console.warn('[SCM SECURITY] Session is no longer active or approved. Logging out.');
            localStorage.removeItem('scm_auth_user');
            setCurrentUser(null);
            return;
          }
          const data = await res.json();
          if (data.user) {
            // Synchronize with latest profile/status changes
            setCurrentUser(data.user);
            localStorage.setItem('scm_auth_user', JSON.stringify(data.user));
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
      const hasOnboarded = localStorage.getItem('scm_completed_onboarding');
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
      const res = await scmFetch('/api/prospects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id || '',
          'x-user-role': currentUser.role || '',
          'x-user-email': currentUser.email || ''
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
      const res = await scmFetch(`/api/prospects/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
          'x-user-role': currentUser?.role || '',
          'x-user-email': currentUser?.email || ''
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
      const res = await scmFetch(`/api/prospects/${id}`, { 
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser?.id || '',
          'x-user-role': currentUser?.role || '',
          'x-user-email': currentUser?.email || ''
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
      const res = await scmFetch('/api/contacts', {
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
      const res = await scmFetch(`/api/contacts/${id}`, {
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
      const res = await scmFetch(`/api/contacts/${id}`, { method: 'DELETE' });
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
      const res = await scmFetch('/api/activities', {
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
      const res = await scmFetch(`/api/activities/${id}`, {
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
      const res = await scmFetch(`/api/activities/${id}`, { method: 'DELETE' });
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
      const res = await scmFetch('/api/meetings', {
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
      const res = await scmFetch(`/api/meetings/${id}`, {
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
      const res = await scmFetch(`/api/meetings/${id}`, { method: 'DELETE' });
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
      const res = await scmFetch('/api/tasks', {
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
      const res = await scmFetch(`/api/tasks/${id}`, {
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
      const res = await scmFetch(`/api/tasks/${id}`, { method: 'DELETE' });
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
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-primary-brand rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-500 animate-pulse uppercase tracking-widest font-mono">Loading CRM Database...</span>
        </div>
      );
    }

    const isSuperAdmin = currentUser.email === 'wisdom.okoh@scmcapitalng.com' || 
                         currentUser.email === 'omololu.ajediran@scmcapitalng.com';
    const isAdminUser = isSuperAdmin || 
                        currentUser.role === 'Admin' || 
                        currentUser.role === 'SUPER_ADMIN';

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
            <span className="text-xs font-bold text-red-500 font-mono tracking-widest uppercase block mb-3">ACCESS DENIED • SECURE GATEWAY</span>
            <h3 className="text-white text-lg font-bold">Unauthorized Administration Request</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">This module is reserved strictly for SCM Capital Enterprise Administrators. Your profile does not hold the required security clearance keys.</p>
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
      case 'weekly-report':
        return (
          <WeeklyReport
            currentUser={currentUser}
          />
        );
      case 'admin-reports':
        return (
          <AdminReports
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

  const handleLogout = () => {
    localStorage.removeItem('scm_auth_user');
    setCurrentUser(null);
  };

  const handleToggleSidebar = () => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    localStorage.setItem('scm_sidebar_collapsed', String(newValue));
  };

  // Render AuthScreen if no persistent B2B session exists
  if (!currentUser) {
    return (
      <AuthScreen 
        onLoginSuccess={(user) => {
          localStorage.setItem('scm_auth_user', JSON.stringify(user));
          setCurrentUser(user);
          const isSuperAdmin = user.email === 'wisdom.okoh@scmcapitalng.com' || 
                               user.email === 'omololu.ajediran@scmcapitalng.com';
          const isAdminUser = isSuperAdmin || 
                              user.role === 'Admin' || 
                              user.role === 'SUPER_ADMIN' ||
                              user.role === 'Administrator';
          if (isAdminUser) {
            setActiveTab('executive-summary');
          } else {
            setActiveTab('dashboard');
          }
        }} 
      />
    );
  }

  return (
    <div id="scm-app-layout" className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
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
          className="fixed inset-0 bg-slate-950/45 md:hidden z-25 transition-opacity duration-350"
        />
      )}

      {/* Main Container */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300 ${sidebarCollapsed ? 'pl-0 md:pl-16' : 'pl-0 md:pl-64'}`}>
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
        <main className="flex-1 overflow-y-auto p-6 focus:outline-none bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {getActiveTabScreen()}
          </div>
        </main>
      </div>

      {/* Floating Unified Help & Onboarding Trigger (Phase 9 & 10) */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        <button
          id="global-onboarding-restart-btn"
          onClick={() => setOnboardingActive(true)}
          className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold text-[10px] px-3 py-2.5 rounded-xl transition-all shadow-lg flex items-center gap-1 cursor-pointer"
          title="Restart Guided Interactive Welcome Tour"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>Tour Guide</span>
        </button>
        <button 
          id="global-help-center-toggle-btn"
          onClick={() => setHelpCenterActive(true)}
          className="bg-[#b1191f] hover:bg-[#8e1217] text-white font-bold text-xs px-4 py-3 rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer animate-pulse"
          title="Open SCM Support & FAQ Help Center"
        >
          <HelpCircle className="w-4 h-4 text-white" />
          <span>Help & Support</span>
        </button>
      </div>

      {/* Onboarding Wizard Overlay (Phase 6) */}
      {onboardingActive && (
        <OnboardingWizard
          onClose={() => {
            setOnboardingActive(false);
            localStorage.setItem('scm_completed_onboarding', 'true');
          }}
          setActiveTab={setActiveTab}
        />
      )}

      {/* SCM Support Center Drawer Overlay (Phase 9) */}
      {helpCenterActive && (
        <TrustHelpCenter
          onClose={() => setHelpCenterActive(false)}
          setActiveTab={setActiveTab}
        />
      )}

      {/* SCM Browser-Based Meeting Reminders Engine */}
      <MeetingReminderManager meetings={meetings} />
    </div>
  );
}
