import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  UserPlus, 
  UserX, 
  UserMinus, 
  UserCheck, 
  Trash2, 
  Key, 
  Search, 
  Filter, 
  Download, 
  Database, 
  Cpu, 
  History, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Sparkles,
  Award,
  Globe,
  Settings,
  X
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface SystemSummary {
  users: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
  };
  prospects: number;
  meetings: number;
  tasks: number;
  notifications: number;
  workspaces: number;
  searches: number;
  serena: number;
  systemHealth: {
    databaseConnected: boolean;
    redisCacheStatus: string;
    apiStatus: string;
    environment: string;
  };
}

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  target: string | null;
  status: string;
  metadata?: any;
}

interface AdminDashboardProps {
  currentUser: UserProfile;
  initialSubTab?: 'users' | 'approvals' | 'audit' | 'system' | 'search-analytics';
  onNavigate?: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, initialSubTab = 'users', onNavigate }) => {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'approvals' | 'audit' | 'system' | 'search-analytics'>(initialSubTab);

  React.useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);
  
  // Filters and Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');

  // Edit / Password modal states
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [resettingUserPassword, setResettingUserPassword] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [editRole, setEditRole] = useState<UserRole>('Business Development Officer');
  const [editDept, setEditDept] = useState<string>('');
  const [editName, setEditName] = useState<string>('');

  // Status message state
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // AI Search History Dashboard states
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [aiAnalytics, setAiAnalytics] = useState<any | null>(null);
  const [aiHistoryLoading, setAiHistoryLoading] = useState<boolean>(false);
  const [aiSearchFilter, setAiSearchFilter] = useState<string>('');
  const [aiTypeFilter, setAiTypeFilter] = useState<string>('ALL');
  const [aiStatusFilter, setAiStatusFilter] = useState<string>('ALL');

  const fetchAiSearchHistory = async () => {
    try {
      setAiHistoryLoading(true);
      
      const params = new URLSearchParams();
      if (aiSearchFilter) params.append('searchTerm', aiSearchFilter);
      if (aiTypeFilter !== 'ALL') params.append('searchType', aiTypeFilter);
      if (aiStatusFilter !== 'ALL') params.append('status', aiStatusFilter);
      
      const res = await fetch(`/api/ai-search-history?${params.toString()}`, {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-email': currentUser.email,
          'x-user-role': currentUser.role
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAiHistory(data);
      }

      const analyticsRes = await fetch('/api/ai-search-history/analytics', {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-email': currentUser.email,
          'x-user-role': currentUser.role
        }
      });
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAiAnalytics(analyticsData);
      }
    } catch (err) {
      console.error("Failed fetching AI search history payload:", err);
    } finally {
      setAiHistoryLoading(false);
    }
  };

  const handleExportAiHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (aiSearchFilter) params.append('searchTerm', aiSearchFilter);
      if (aiTypeFilter !== 'ALL') params.append('searchType', aiTypeFilter);
      if (aiStatusFilter !== 'ALL') params.append('status', aiStatusFilter);

      const res = await fetch(`/api/ai-search-history/export?${params.toString()}`, {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-email': currentUser.email,
          'x-user-role': currentUser.role
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scm_ai_search_history_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast("AI interaction logs exported safely to CSV.", "success");
      } else {
        showToast("Failed to export AI search logs.", "error");
      }
    } catch (err) {
      console.error("Export AI history failed:", err);
      showToast("Telemetry export channel error.", "error");
    }
  };

  useEffect(() => {
    if (activeSubTab === 'search-analytics') {
      fetchAiSearchHistory();
    }
  }, [activeSubTab, aiTypeFilter, aiStatusFilter]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      // Fetch users list
      const uRes = await fetch('/api/admin/users', {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-email': currentUser.email,
          'x-user-role': currentUser.role
        }
      });
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsersList(uData);
      }

      // Fetch audit logs
      const aRes = await fetch('/api/admin/audit-logs', {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-email': currentUser.email,
          'x-user-role': currentUser.role
        }
      });
      if (aRes.ok) {
        const aData = await aRes.json();
        setAuditLogs(aData);
      }

      // Fetch summary statistics
      const sRes = await fetch('/api/admin/system-summary', {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-email': currentUser.email,
          'x-user-role': currentUser.role
        }
      });
      if (sRes.ok) {
        const sData = await sRes.json();
        setSummary(sData);
      }
    } catch (err) {
      console.error("Failed fetching administration payload:", err);
      showToast("Network failure fetching corporate administrative directories.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentUser]);

  const showToast = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage(null);
    }, 4500);
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-email': currentUser.email,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        showToast(`User status successfully updated to '${newStatus}'.`, 'success');
        fetchAdminData();
      } else {
        const err = await response.json();
        showToast(err.error || "Failed modifying registration profile.", 'error');
      }
    } catch (err) {
      showToast("Access failed updating corporate state registries.", "error");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you absolutely certain you wish to delete this user from the SCM register database? This action is non-reversible.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-email': currentUser.email,
          'x-user-role': currentUser.role
        }
      });

      if (response.ok) {
        showToast("User record purged successfully from databases.", 'success');
        fetchAdminData();
      } else {
        const err = await response.json();
        showToast(err.error || "Purge execution failed.", 'error');
      }
    } catch (err) {
      showToast("Purge pipeline failure.", "error");
    }
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-email': currentUser.email,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({
          fullName: editName,
          role: editRole,
          department: editDept
        })
      });

      if (response.ok) {
        showToast("Corporate profile changes saved successfully.", 'success');
        setEditingUser(null);
        fetchAdminData();
      } else {
        const err = await response.json();
        showToast(err.error || "Update operation failed.", 'error');
      }
    } catch (err) {
      showToast("Database mapping operation failed.", "error");
    }
  };

  const handleSavePasswordReset = async () => {
    if (!resettingUserPassword) return;
    if (!newPassword || newPassword.trim().length < 12) {
      showToast("Temporary passwords must be at least 12 characters in length.", 'error');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${resettingUserPassword.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-email': currentUser.email,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ password: newPassword })
      });

      if (response.ok) {
        showToast(`Secret passkey reset completed for ${resettingUserPassword.fullName}.`, 'success');
        setResettingUserPassword(null);
        setNewPassword('');
        fetchAdminData();
      } else {
        const err = await response.json();
        showToast(err.error || "Credential update failed.", 'error');
      }
    } catch (err) {
      showToast("Credential write operation aborted.", "error");
    }
  };

  const exportUsersToCSV = () => {
    if (usersList.length === 0) return;
    
    const headers = ['User ID', 'Full Name', 'Corporate Email', 'Assigned Role', 'Department', 'Access Status', 'Creation Date'];
    const rows = usersList.map(u => [
      u.id,
      u.fullName,
      u.email,
      u.role,
      u.department || 'Client Advisory',
      u.status || 'Pending',
      'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `scm_corporate_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Directory catalog exported safely to CSV.", 'success');
  };

  const startEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.fullName);
    setEditRole(user.role);
    setEditDept(user.department || '');
  };

  // Filtered Lists
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || (u.status || 'Pending') === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const pendingApprovals = usersList.filter(u => (u.status || 'Pending') === 'Pending' && u.role !== 'Admin' && u.role !== 'SUPER_ADMIN');

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = (log.userName && log.userName.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
                          (log.userEmail && log.userEmail.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
                          (log.action && log.action.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
                          (log.target && log.target.toLowerCase().includes(auditSearchQuery.toLowerCase()));
    const matchesAction = auditActionFilter === 'ALL' || log.action === auditActionFilter;
    return matchesSearch && matchesAction;
  });

  const getStatusBadgeClass = (statusStr: string = 'Pending') => {
    switch (statusStr) {
      case 'Approved':
      case 'Active':
        return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40';
      case 'Pending':
        return 'bg-amber-950/40 text-amber-400 border border-amber-900/40 animate-pulse';
      case 'Rejected':
        return 'bg-rose-950/40 text-rose-400 border border-rose-900/40';
      case 'Suspended':
        return 'bg-purple-950/40 text-purple-400 border border-purple-900/40';
      case 'Inactive':
        return 'bg-slate-800 text-slate-400 border border-slate-700';
      default:
        return 'bg-slate-900 text-slate-400 border border-slate-800';
    }
  };

  return (
    <div className="space-y-6 select-none font-sans" id="scm-admin-panel">
      {/* Toast Notification */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-xl animate-in fade-in slide-in-from-top-3 duration-200 ${
          message.type === 'success' 
            ? 'bg-slate-900 border-emerald-800 text-emerald-400' 
            : 'bg-slate-900 border-rose-800 text-rose-400'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-xs font-semibold">{message.text}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-brand mb-1">
            <ShieldCheck className="w-5 h-5 text-red-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Enterprise Control Deck</span>
          </div>
          <h1 className="text-xl font-bold text-white font-display">SCM Platform Governance Center</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Permission-controlled administration for Super Admin and HOD Admin roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchAdminData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-750 rounded-lg transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Registry
          </button>
          <button 
            onClick={exportUsersToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-red-800 hover:bg-red-750 border border-red-900 rounded-lg shadow transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Directory
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Corporate Logins</span>
            <span className="text-2xl font-black text-white block mt-1 font-display">
              {summary ? summary.users.total : loading ? '...' : usersList.length}
            </span>
          </div>
          <div className="p-2.5 bg-slate-800 rounded-lg">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Pending Approvals</span>
            <span className={`text-2xl font-black block mt-1 font-display ${pendingApprovals.length > 0 ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
              {pendingApprovals.length}
            </span>
          </div>
          <div className={`p-2.5 rounded-lg ${pendingApprovals.length > 0 ? 'bg-amber-950/40 border border-amber-900/40' : 'bg-slate-800'}`}>
            <ShieldAlert className={`w-4 h-4 ${pendingApprovals.length > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">SCM Leads Purged</span>
            <span className="text-2xl font-black text-white block mt-1 font-display">
              {summary ? summary.prospects : 'Clean'}
            </span>
          </div>
          <div className="p-2.5 bg-slate-800 rounded-lg">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Security Event Log</span>
            <span className="text-2xl font-black text-white block mt-1 font-display">
              {auditLogs.length}
            </span>
          </div>
          <div className="p-2.5 bg-slate-800 rounded-lg">
            <History className="w-4 h-4 text-red-400" />
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Supabase DB Host</span>
            <span className="text-xs font-mono font-bold text-emerald-400 block mt-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              {summary?.systemHealth.databaseConnected ? 'ONLINE' : 'FALLBACK'}
            </span>
          </div>
          <div className="p-2.5 bg-slate-800 rounded-lg">
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Control Navigation Menu */}
      <div className="flex border-b border-slate-850">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors ${
            activeSubTab === 'users' 
              ? 'border-red-500 text-red-400 font-black' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          User Directory ({usersList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('approvals')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors relative ${
            activeSubTab === 'approvals' 
              ? 'border-red-500 text-red-400 font-black' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Pending Queue
          {pendingApprovals.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors ${
            activeSubTab === 'audit' 
              ? 'border-red-500 text-red-400 font-black' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          System Audit Log ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('search-analytics')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors ${
            activeSubTab === 'search-analytics' 
              ? 'border-red-500 text-red-400 font-black' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          AI Search Analytics
        </button>
        <button
          onClick={() => setActiveSubTab('system')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-colors ${
            activeSubTab === 'system' 
              ? 'border-red-500 text-red-400 font-black' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Security Diagnostics
        </button>
      </div>

      {/* TAB CONTENT: USER DIRECTORY */}
      {activeSubTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input 
                type="text"
                placeholder="Search SCM officers by name, corporate email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-slate-750"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 rounded-lg">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Role:</span>
                <select 
                  value={roleFilter} 
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs border-none outline-none cursor-pointer py-1 font-medium"
                >
                  <option value="ALL">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Director">Director</option>
                  <option value="Relationship Manager">Relationship Manager</option>
                  <option value="Business Development Officer">BDO</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 rounded-lg">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Status:</span>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs border-none outline-none cursor-pointer py-1 font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-950/40 text-slate-400 uppercase tracking-wider text-[9px] font-black">
                    <th className="py-3 px-4">Officer Details</th>
                    <th className="py-3 px-4">System Role</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Auth Status</th>
                    <th className="py-3 px-4 text-right">Governing Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500 italic">
                        No corporate users match the active filters or search index.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelf = user.email.toLowerCase() === currentUser.email.toLowerCase();
                      const isSuper = user.permissionLevel === 'SUPER_ADMIN';
                      return (
                        <tr key={user.id} className="hover:bg-slate-900/20 transition-all">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-slate-200 capitalize font-display">
                                {user.fullName.split(' ').map(n => n ? n[0] : '').join('')}
                              </div>
                              <div>
                                <span className="font-bold text-white block flex items-center gap-1">
                                  {user.fullName} 
                                  {isSelf && <span className="text-[9px] bg-slate-800 px-1 py-0.2 rounded border border-slate-700 text-slate-400 uppercase tracking-wide">Me</span>}
                                  {isSuper && <span className="text-[9px] bg-red-950/50 border border-red-900 text-red-400 px-1 py-0.2 rounded uppercase tracking-wide">SUPER_ADMIN</span>}
                                </span>
                                <span className="text-[10px] text-slate-500 block mt-0.5">{user.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-200">
                            {user.role}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {user.department || 'Client Advisory'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeClass(user.status)}`}>
                              {user.status || 'Pending'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit details */}
                              <button
                                onClick={() => startEditUser(user)}
                                className="p-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-all"
                                title="Edit Role and Attributes"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>

                              {/* Password resets are restricted to the canonical Super Admin. */}
                              {currentUser.permissionLevel === 'SUPER_ADMIN' && (
                                <button
                                  onClick={() => setResettingUserPassword(user)}
                                  className="p-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-emerald-400 transition-all"
                                  title="Reset Temporary Password"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Block/Suspend Toggle */}
                              {!isSuper && (user.status === 'Approved' || user.status === 'Active') && (
                                <button
                                  onClick={() => handleUpdateUserStatus(user.id, 'Suspended')}
                                  className="p-1.5 bg-slate-850 hover:bg-purple-950/30 border border-slate-800 hover:border-purple-900 rounded-lg text-slate-300 hover:text-purple-400 transition-all"
                                  title="Suspend Corporate Session Access"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Reactivate / Approve */}
                              {!isSuper && (user.status === 'Suspended' || user.status === 'Rejected' || user.status === 'Inactive') && (
                                <button
                                  onClick={() => handleUpdateUserStatus(user.id, 'Approved')}
                                  className="p-1.5 bg-slate-850 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-900 rounded-lg text-slate-300 hover:text-emerald-400 transition-all"
                                  title="Re-activate Access Privileges"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete account */}
                              {!isSuper && !isSelf && (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-1.5 bg-slate-850 hover:bg-red-950/30 border border-slate-800 hover:border-red-900 rounded-lg text-slate-400 hover:text-red-400 transition-all"
                                  title="Delete Record Completely"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PENDING QUEUE */}
      {activeSubTab === 'approvals' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-850 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 animate-bounce" />
              <div>
                <span className="text-xs font-bold text-white block">Awaiting Officer Activations</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Admins must audit, verify corporate IDs, and grant system entries for security compliance.
                </span>
              </div>
            </div>
            <span className="bg-amber-950/40 text-amber-400 text-xs font-black border border-amber-900 px-3 py-1 rounded-full">
              {pendingApprovals.length} Pending
            </span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-950/40 text-slate-400 uppercase tracking-wider text-[9px] font-black">
                    <th className="py-3 px-4">Awaiting Full Name</th>
                    <th className="py-3 px-4">Corporate SCM Email</th>
                    <th className="py-3 px-4">Requested Role</th>
                    <th className="py-3 px-4">Assigned Department</th>
                    <th className="py-3 px-4 text-right">Verification Gate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                  {pendingApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-emerald-400 italic font-mono text-[11px]">
                        ✓ All corporate accounts have been fully audited and activated. No pending queue entries.
                      </td>
                    </tr>
                  ) : (
                    pendingApprovals.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-900/20 transition-all">
                        <td className="py-3.5 px-4 font-bold text-white">
                          {user.fullName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {user.email}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-300">
                          {user.role}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {user.department || 'Client Advisory'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleUpdateUserStatus(user.id, 'Approved')}
                              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-900 hover:bg-emerald-900 hover:text-white rounded-lg transition-all"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateUserStatus(user.id, 'Rejected')}
                              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-rose-400 bg-rose-950/50 border border-rose-900 hover:bg-rose-900 hover:text-white rounded-lg transition-all"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: AUDIT LOGGING LOG CENTER */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Audit Controls */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input 
                type="text"
                placeholder="Search logs by operator, actions, target-id, metadata metrics..."
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-slate-750"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 rounded-lg shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Action:</span>
              <select 
                value={auditActionFilter} 
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="bg-transparent text-slate-200 text-xs border-none outline-none cursor-pointer py-1 font-medium"
              >
                <option value="ALL">All Operations</option>
                <option value="User Login">Successful Login</option>
                <option value="User Login Failed">Login Failed</option>
                <option value="User Logout">Logout</option>
                <option value="User Registration">Account Signup</option>
                <option value="User Approval">User Approved</option>
                <option value="User Rejection">User Rejected</option>
                <option value="User Suspension">User Suspended</option>
                <option value="Role Change">Role Modified</option>
                <option value="Reset Password">Password Reset</option>
                <option value="Administrative Action">Administrative Action</option>
              </select>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse font-mono text-[10px] text-slate-300">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[9px] font-black sticky top-0 z-10">
                    <th className="py-3 px-4">Audit Timestamp</th>
                    <th className="py-3 px-4">Operator Email</th>
                    <th className="py-3 px-4">Action Description</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Log Status</th>
                    <th className="py-3 px-4">Metadata Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 italic">
                        No auditable telemetry records found matching indices.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-400">
                          {log.userEmail || 'System Process'}
                        </td>
                        <td className="py-2.5 px-4 text-white">
                          <span className={`px-1.5 py-0.5 rounded ${
                            log.action.includes('Failed') || log.action.includes('Block')
                              ? 'bg-red-950/50 text-red-400'
                              : log.action.includes('Approval') || log.action.includes('Login')
                              ? 'bg-emerald-950/50 text-emerald-400'
                              : 'bg-slate-900 text-slate-300'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-semibold truncate max-w-[120px]">
                          {log.target || 'None'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`font-extrabold ${log.status === 'Failure' || log.status === 'Suspended' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 max-w-[200px] truncate" title={JSON.stringify(log.metadata || {})}>
                          {JSON.stringify(log.metadata || {})}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SECURITY DIAGNOSTICS */}
      {activeSubTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-150">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Infrastructure Connection Registers
            </h3>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                <span className="text-slate-400">PostgreSQL Supabase Instance:</span>
                <span className="font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {summary?.systemHealth.databaseConnected ? 'Connected & Synced' : 'Online'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                <span className="text-slate-400">Drizzle Schema Synced:</span>
                <span className="font-mono font-bold text-emerald-400">v1.2.6 (Production Release)</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                <span className="text-slate-400">Memory Cache Store:</span>
                <span className="font-mono font-bold text-emerald-400">Healthy & Synchronized</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Dev Ingress Proxy Tunnel:</span>
                <span className="font-mono font-bold text-white">Direct Port 3000 Bind (Secure TLS)</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-red-400" />
              Access Level Control Map (RBAC)
            </h3>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                <span className="text-slate-400">Super Admin Privileges:</span>
                <span className="font-semibold text-white">wisdom.okoh@scmcapitalng.com, omololu.ajediran@scmcapitalng.com</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                <span className="text-slate-400">Standard Admins:</span>
                <span className="font-semibold text-slate-300">All users with role "Admin"</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                <span className="text-slate-400">Lead Deletion Safeguards:</span>
                <span className="font-semibold text-amber-400">Admins & Directors ONLY</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Officer Data Isolation:</span>
                <span className="font-mono font-bold text-emerald-400">Enabled (Strict CRM Isolation Filter)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: AI SEARCH HISTORY & ANALYTICS */}
      {activeSubTab === 'search-analytics' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Analytics Summary Widget Rows */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Total AI Inquiries</span>
              <span className="text-xl font-extrabold text-white mt-1 block">
                {aiAnalytics?.totalInquiries ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Sum of all tracked system scans</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Total Model Tokens</span>
              <span className="text-xl font-extrabold text-red-400 mt-1 block">
                {aiAnalytics?.totalTokens?.toLocaleString() ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Estimate of consumed context window</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Success Rate</span>
              <span className="text-xl font-extrabold text-emerald-400 mt-1 block">
                {aiAnalytics ? `${(aiAnalytics.successRate * 100).toFixed(1)}%` : '100%'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Telemetry pipeline performance</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Average Response Time</span>
              <span className="text-xl font-extrabold text-cyan-400 mt-1 block">
                {aiAnalytics ? `${(aiAnalytics.avgResponseTimeMs / 1000).toFixed(2)}s` : '0.00s'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Advisory response latency</span>
            </div>
          </div>

          {/* Module usage list summary */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-white block">AI Module Usage Breakdown</span>
              <div className="flex flex-wrap gap-2.5 mt-2">
                {aiAnalytics?.searchTypeCounts && Object.entries(aiAnalytics.searchTypeCounts).length > 0 ? (
                  Object.entries(aiAnalytics.searchTypeCounts).map(([type, count]: [string, any]) => (
                    <span key={type} className="text-[10px] font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-300">
                      <strong className="text-red-400 uppercase">{type}</strong>: {count}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-500">No breakdowns available.</span>
                )}
              </div>
            </div>
            <button
              onClick={handleExportAiHistory}
              className="bg-red-850 hover:bg-red-750 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-md shrink-0 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Audit Ledger CSV</span>
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search queries by term or operator email..."
                value={aiSearchFilter}
                onChange={(e) => setAiSearchFilter(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchAiSearchHistory(); }}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-slate-700"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 rounded-lg">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Type:</span>
                <select
                  value={aiTypeFilter}
                  onChange={(e) => setAiTypeFilter(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs border-none outline-none cursor-pointer py-1 font-medium bg-slate-900"
                >
                  <option value="ALL">All Types</option>
                  <option value="Apollo Search">Apollo Search</option>
                  <option value="Company Research">Company Research</option>
                  <option value="Gemini Outreach">Gemini Outreach</option>
                  <option value="Serena Assistant">Serena Assistant</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 rounded-lg">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Status:</span>
                <select
                  value={aiStatusFilter}
                  onChange={(e) => setAiStatusFilter(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs border-none outline-none cursor-pointer py-1 font-medium bg-slate-900"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Success">Success</option>
                  <option value="Failure">Failure</option>
                </select>
              </div>
              <button
                onClick={fetchAiSearchHistory}
                className="bg-red-800 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>

          {/* AI Search History Logs List */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse font-mono text-[10px] text-slate-300">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[9px] font-black sticky top-0 z-10 font-sans">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Operator Info</th>
                    <th className="py-3 px-4">AI Search Type</th>
                    <th className="py-3 px-4">Query Phrase</th>
                    <th className="py-3 px-4">Execution Status</th>
                    <th className="py-3 px-4">Tokens / Cost</th>
                    <th className="py-3 px-4">Metadata Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {aiHistoryLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">
                        <div className="w-5 h-5 border-2 border-slate-800 border-t-red-500 rounded-full animate-spin mx-auto mb-2"></div>
                        <span>Scanning AI Telemetry Registry...</span>
                      </td>
                    </tr>
                  ) : aiHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 italic">
                        No auditable AI interactions found matching filters.
                      </td>
                    </tr>
                  ) : (
                    aiHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/30 transition-all">
                        <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-sans">
                          <span className="font-bold text-slate-300 block">{log.userName || 'Advisory Agent'}</span>
                          <span className="text-[9px] text-slate-500 block">{log.userEmail}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-1.5 py-0.5 rounded uppercase tracking-wider text-[9px] font-extrabold ${
                            log.searchType === 'Apollo Search' ? 'bg-indigo-950/40 text-indigo-400' :
                            log.searchType === 'Company Research' ? 'bg-amber-950/40 text-amber-400' :
                            log.searchType === 'Gemini Outreach' ? 'bg-rose-950/40 text-rose-400' :
                            'bg-emerald-950/40 text-emerald-400'
                          }`}>
                            {log.searchType}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-white max-w-[200px] truncate" title={log.searchTerm}>
                          "{log.searchTerm}"
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`font-black uppercase tracking-wider text-[9px] ${log.status === 'Success' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-400">
                          {log.tokens ? `${log.tokens.toLocaleString()} t` : 'N/A'} {log.cost ? `($${parseFloat(log.cost).toFixed(4)})` : ''}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 max-w-[150px] truncate" title={JSON.stringify(log.metadata || {})}>
                          {JSON.stringify(log.metadata || {})}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER PROPERTIES */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-red-500" />
                Edit SCM Profile Attributes
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1.5">Full Name</label>
                <input 
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-slate-700"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1.5">Assigned Corporate Role</label>
                <select 
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-slate-700"
                >
                  <option value="Admin">Admin (Full Control privileges)</option>
                  <option value="Director">Director (Management & Audit access)</option>
                  <option value="Relationship Manager">Relationship Manager (Standard RM)</option>
                  <option value="Business Development Officer">Business Development Officer (Standard BDO)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1.5">Assigned Department</label>
                <input 
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  placeholder="e.g. Wealth Management, Client Advisory"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-slate-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setEditingUser(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEditUser}
                className="px-3 py-1.5 text-xs font-bold text-white bg-red-800 hover:bg-red-750 rounded-lg shadow transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PASSWORD RESET GATEWAY */}
      {resettingUserPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                Reset Security Passkey
              </h3>
              <button onClick={() => setResettingUserPassword(null)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400 block leading-relaxed">
                You are performing a credential reset for <strong>{resettingUserPassword.fullName}</strong> ({resettingUserPassword.email}).
              </p>
              <div>
                <label className="text-slate-400 font-semibold block mb-1.5">New Password Key</label>
                <input 
                  type="password"
                  placeholder="Enter a secure corporate password key..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-slate-700 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setResettingUserPassword(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePasswordReset}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-750 rounded-lg shadow transition-all"
              >
                Reset Credential
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
