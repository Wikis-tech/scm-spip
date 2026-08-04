import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Archive, 
  User, 
  TrendingUp, 
  Globe, 
  Phone, 
  Mail, 
  CheckCircle,
  FileText,
  BadgeAlert,
  X,
  Target,
  CheckSquare,
  History,
  Sparkles,
  Cpu,
  Filter,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Compass,
  Layers,
  ShieldAlert,
  Briefcase,
  DollarSign,
  Users,
  RefreshCw,
  Zap,
  ChevronRight
} from 'lucide-react';
import { Prospect, UserProfile, ProspectStage, PriorityLevel, Task, NewsArticle, DiscoveredLead, StaffPerformance, DiscoverySession, DiscoveryAnalytics } from '../types';

interface ProspectsProps {
  prospects: Prospect[];
  currentUser: UserProfile;
  onAddProspect: (prospect: Partial<Prospect>) => Promise<any>;
  onUpdateProspect: (id: string, updates: Partial<Prospect>) => Promise<any>;
  onDeleteProspect: (id: string) => Promise<any>;
  tasks: Task[];
  onAddTask: (task: Partial<Task>) => Promise<any>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<any>;
  onDeleteTask: (id: string) => Promise<any>;
  newsArticles: NewsArticle[];
  discoveredLeads: DiscoveredLead[];
  onTriggerDiscovery: () => Promise<any>;
  onScanDiscovery?: (filters: any) => Promise<any>;
  onImportDiscovery: (id: string) => Promise<any>;
  onDismissDiscovery?: (id: string) => Promise<any>;
  onOpenIntelligence?: (id: string) => Promise<any>;
  scmFetch?: (url: string, options?: RequestInit) => Promise<Response>;
  staffPerformance: StaffPerformance[];
  onNavigate?: (tab: string) => void;
  onAddNewsArticle?: (article: any) => Promise<any>;
}

export const Prospects: React.FC<ProspectsProps> = ({
  prospects,
  currentUser,
  onAddProspect,
  onUpdateProspect,
  onDeleteProspect,
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  newsArticles,
  discoveredLeads,
  onTriggerDiscovery,
  onScanDiscovery,
  onImportDiscovery,
  onDismissDiscovery,
  onOpenIntelligence,
  scmFetch,
  staffPerformance,
  onNavigate,
  onAddNewsArticle
}) => {
  // Local state managers
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');

  // Local subpanel view mode
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'discovery' | 'signals'>('list');

  // Discovery Engine local state
  const [scanSource, setScanSource] = useState('NGX Listed Corporations');
  const [scanIndustry, setScanIndustry] = useState('All');
  const [scanLocation, setScanLocation] = useState('All');
  const [scanSizeTier, setScanSizeTier] = useState('All');
  const [scanRevenueRange, setScanRevenueRange] = useState('All');
  const [scanTargetProduct, setScanTargetProduct] = useState('All');
  const [isScanning, setIsScanning] = useState(false);
  const [discoverySubTab, setDiscoverySubTab] = useState<'queue' | 'history' | 'analytics'>('queue');
  const [historySessions, setHistorySessions] = useState<DiscoverySession[]>([]);
  const [analyticsData, setAnalyticsData] = useState<DiscoveryAnalytics | null>(null);
  const [discoverySearchQuery, setDiscoverySearchQuery] = useState('');

  // Task checklist local state managers
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [isDetailView, setIsDetailView] = useState<string | null>(null);

  // Signal Logger State
  const [isLoggingSignal, setIsLoggingSignal] = useState(false);
  const [sigCompanyName, setSigCompanyName] = useState('');
  const [sigTitle, setSigTitle] = useState('');
  const [sigContent, setSigContent] = useState('');
  const [sigCategory, setSigCategory] = useState('Signals');
  const [sigSeverity, setSigSeverity] = useState('Medium');
  const [sigError, setSigError] = useState('');
  const [sigSuccess, setSigSuccess] = useState('');

  // Form input fields
  const [formData, setFormData] = useState<Partial<Prospect>>({
    name: '',
    industry: '',
    orgType: 'Private Corporation',
    location: '',
    website: '',
    phone: '',
    email: '',
    source: 'Direct Outreach',
    status: 'Lead',
    priority: 'Medium',
    notes: '',
    conversionProbability: 20,
    opportunityValue: 0,
    opportunityScore: 50
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [radarMessage, setRadarMessage] = useState<string | null>(null);
  const [radarError, setRadarError] = useState<string | null>(null);

  const fetchDiscoveryHistoryAndAnalytics = async () => {
    if (!scmFetch) return;
    try {
      const [histRes, anaRes] = await Promise.all([
        scmFetch('/api/discovery/history'),
        scmFetch('/api/discovery/analytics')
      ]);
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistorySessions(histData.sessions || []);
      }
      if (anaRes.ok) {
        const anaData = await anaRes.json();
        setAnalyticsData(anaData.analytics || null);
      }
    } catch (err) {
      console.error("Error loading discovery telemetry:", err);
    }
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    setRadarMessage("Running SCM Apex AI Discovery Scan across public sectors, corporate registries and intelligence channels...");
    setRadarError(null);
    try {
      if (onScanDiscovery) {
        const result = await onScanDiscovery({
          source: scanSource,
          industry: scanIndustry,
          location: scanLocation,
          sizeTier: scanSizeTier,
          revenueRange: scanRevenueRange,
          targetProduct: scanTargetProduct
        });
        setRadarMessage(`Scan completed successfully! Discovered ${result.newDiscoveredCount || result.discoveredCount || 0} target leads matching your specific criteria.`);
      } else {
        await onTriggerDiscovery();
        setRadarMessage("SCM Apex Discovery Radar scan completed successfully!");
      }
      await fetchDiscoveryHistoryAndAnalytics();
    } catch (err: any) {
      setRadarError(err.message || "Discovery scan failed. Please check parameters.");
      setRadarMessage(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleLocalTriggerDiscovery = async () => {
    handleRunScan();
  };

  const handleLocalImportDiscovery = async (id: string, name: string) => {
    setRadarMessage(`Importing ${name} into active B2B Pipeline...`);
    setRadarError(null);
    try {
      await onImportDiscovery(id);
      setRadarMessage(`Success! Mapped ${name} into active SCM CRM. Automatically initialized dedicated Research Workspace and primary CFO Contact for seamless outreach.`);
      await fetchDiscoveryHistoryAndAnalytics();
    } catch (err: any) {
      setRadarError(err.message || `Failed to import ${name}.`);
      setRadarMessage(null);
    }
  };

  const handleLocalDismiss = async (id: string, name: string) => {
    try {
      if (onDismissDiscovery) {
        await onDismissDiscovery(id);
        setRadarMessage(`Lead "${name}" dismissed from your discovery queue.`);
      }
    } catch (err: any) {
      setRadarError(err.message || "Failed to dismiss lead.");
    }
  };

  const handleLocalOpenDossier = async (id: string, name: string) => {
    setRadarMessage(`Opening Intelligence Dossier & Research Workspace for ${name}...`);
    try {
      if (onOpenIntelligence) {
        const res = await onOpenIntelligence(id);
        if (res && res.workspaceId && onNavigate) {
          onNavigate('workspaces');
          return;
        }
      }
      localStorage.setItem('scm_intel_search_query', name);
      if (onNavigate) {
        onNavigate('intelligence');
      }
    } catch (err: any) {
      setRadarError(err.message || "Failed to launch research workspace.");
    }
  };

  React.useEffect(() => {
    if (viewMode === 'discovery') {
      fetchDiscoveryHistoryAndAnalytics();
    }
  }, [viewMode]);

  // Industry unique values helper
  const industries = ['All', ...Array.from(new Set(prospects.map(p => p.industry)))];
  const statuses = ['All', 'Lead', 'Contacted', 'Meeting Scheduled', 'Financial Literacy Session Scheduled', 'Proposal Sent', 'Negotiation', 'Converted', 'Lost', 'Archived'];
  const priorities = ['All', 'Low', 'Medium', 'High'];

  // Match and Filter logical blocks
  const filteredProspects = prospects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = selectedIndustry === 'All' || p.industry === selectedIndustry;
    const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;
    const matchesPriority = selectedPriority === 'All' || p.priority === selectedPriority;

    return matchesSearch && matchesIndustry && matchesStatus && matchesPriority;
  });

  // Action Triggers
  const openCreateForm = () => {
    setSelectedProspect(null);
    setFormData({
      name: '',
      industry: '',
      orgType: 'Private Corporation',
      location: '',
      website: '',
      phone: '',
      email: '',
      source: 'Direct Outreach',
      status: 'Lead',
      priority: 'Medium',
      notes: '',
      conversionProbability: 20,
      opportunityValue: 0,
      opportunityScore: 50
    });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const openEditForm = (p: Prospect, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProspect(p);
    setFormData({ ...p });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError('');
    setFormSuccess('');

    // Pre-validations
    if (!formData.name?.trim()) return setFormError('Organization name is required.');
    if (!formData.industry?.trim()) return setFormError('Industry category is required.');
    if (!formData.location?.trim()) return setFormError('Target location block is required.');

    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      return setFormError('Please input a valid corporate email address.');
    }

    setIsSubmitting(true);

    try {
      if (selectedProspect) {
        // Edit flow
        await onUpdateProspect(selectedProspect.id, formData);
        setFormSuccess('Organization settings synchronized successfully.');
        setTimeout(() => {
          setIsFormOpen(false);
          setIsSubmitting(false);
        }, 800);
      } else {
        // Create flow
        await onAddProspect(formData);
        setFormSuccess('Prospect logged under SCM CRM administration.');
        setTimeout(() => {
          setIsFormOpen(false);
          setIsSubmitting(false);
        }, 800);
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during communication.');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetP = prospects.find(p => p.id === id);
    const isOwner = targetP && targetP.assignedOfficerId === currentUser.id;
    const isAuthorizedRole = currentUser.role === 'Director' || 
                             currentUser.role === 'Admin' || 
                             currentUser.role === 'SUPER_ADMIN' || 
                             currentUser.email === 'wisdom.okoh@scmcapitalng.com' || 
                             currentUser.email === 'omololu.ajediran@scmcapitalng.com';

    if (!isAuthorizedRole && !isOwner) {
      alert('Security Policy Alert: You can only delete organizations assigned to your officer account.');
      return;
    }
    
    if (confirm(`Are you sure you want to permanently delete the prospect "${name}" from SCM Capital systems?`)) {
      try {
        await onDeleteProspect(id);
        if (isDetailView === id) setIsDetailView(null);
      } catch (err: any) {
        alert(err.message || 'Deletion failed.');
      }
    }
  };

  const handleArchive = async (p: Prospect, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onUpdateProspect(p.id, { status: 'Archived' });
      alert(`Prospect "${p.name}" has been successfully archived.`);
    } catch (err: any) {
      alert(err.message || 'Archiving failed.');
    }
  };

  // Convert amount to Naira strings
  const formatNaira = (num: number) => {
    return `₦${Number(num).toLocaleString('en-US', { minimumFractionDigits: 0 })} `;
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Section Tab Selectors */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex flex-wrap gap-1 shadow-sm">
        <button
          id="prospects-directory-view-tab"
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer outline-none ${
            viewMode === 'list' 
              ? 'bg-[#fce4ec] text-[#b1191f] shadow-xs' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Active Accounts Directory</span>
        </button>
        
        <button
          id="prospects-pipeline-board-tab"
          onClick={() => setViewMode('board')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer outline-none ${
            viewMode === 'board' 
              ? 'bg-[#fce4ec] text-[#b1191f] shadow-xs' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>B2B Pipeline Stages Board</span>
        </button>

        <button
          id="prospects-automated-discovery-tab"
          onClick={() => setViewMode('discovery')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer outline-none ${
            viewMode === 'discovery' 
              ? 'bg-[#fce4ec] text-[#b1191f] shadow-xs' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Apex Discovery Radar</span>
          {discoveredLeads.filter(d => !d.alreadyimported).length > 0 && (
            <span className="bg-[#b1191f] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
              {discoveredLeads.filter(d => !d.alreadyimported).length}
            </span>
          )}
        </button>

        <button
          id="prospects-corporate-news-tab"
          onClick={() => setViewMode('signals')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer outline-none ${
            viewMode === 'signals' 
              ? 'bg-[#fce4ec] text-[#b1191f] shadow-xs' 
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Signals & News Alerts</span>
        </button>
      </div>

      {/* Top action grid */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm justify-between flex flex-col md:flex-row items-center gap-4">
        {/* Search Input bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search prospects directory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-primary-brand focus:ring-1 focus:ring-primary-brand rounded-lg pl-9 pr-4 py-2 text-xs text-brand-neutral outline-none transition-all"
          />
        </div>

        {/* Filters Select boxes */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <SlidersHorizontal className="w-3 h-3 text-slate-500" /> Filters
          </div>

          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-700 px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-brand transition-all cursor-pointer"
          >
            {industries.map(ind => (
              <option key={ind} value={ind}>{ind === 'All' ? 'All Sectors' : ind}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-700 px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-brand transition-all cursor-pointer"
          >
            {statuses.map(st => (
              <option key={st} value={st}>{st === 'All' ? 'All Stages' : st}</option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-700 px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-brand transition-all cursor-pointer animate-none"
          >
            {priorities.map(pr => (
              <option key={pr} value={pr}>{pr === 'All' ? 'All Priorities' : `${pr} Priority`}</option>
            ))}
          </select>

        </div>

        {/* Create btn */}
        <button
          id="create-prospect-btn"
          onClick={openCreateForm}
          className="ml-auto md:ml-2 bg-primary-brand hover:bg-primary-dark text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-red-950/20 select-none cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Organization
        </button>
      </div>
    )}

      {/* Main content grid split (List vs Detail Slide Panels) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Main List Column */}
        <div className={`space-y-4 lg:col-span-2 ${isDetailView ? 'hidden lg:block' : ''}`}>
          
          {/* 1. LIST DIRECTORY VIEW */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {filteredProspects.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-brand-neutral">No matches found</p>
                  <p className="text-xs text-slate-400">Try adjusting your active target filters or keyword parameters.</p>
                </div>
              ) : (
                filteredProspects.map((p) => {
                  const detailsSelected = isDetailView === p.id;
                  return (
                    <div
                      key={p.id}
                      id={`prospect-card-${p.id}`}
                      onClick={() => setIsDetailView(p.id)}
                      className={`bg-white border rounded-xl p-5 hover:shadow-md transition-all cursor-pointer relative ${
                        detailsSelected ? 'ring-2 ring-primary-brand border-transparent' : 'border-slate-200/80'
                      }`}
                    >
                      {/* Badge Row */}
                      <div className="flex justify-between items-start gap-4 mb-2.5">
                        <div>
                          <h3 className="font-display font-bold text-sm text-brand-neutral hover:text-primary-brand transition-colors">
                            {p.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{p.industry} • {p.orgType}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider ${
                            p.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-200' :
                            p.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200/60' :
                            'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}>
                            {p.priority} Priority
                          </span>
                          
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider border ${
                            p.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            p.status === 'Negotiation' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            p.status === 'Proposal Sent' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            p.status === 'Lost' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>

                      {/* Notes / Preview text */}
                      {p.notes && (
                        <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2 border-l-2 border-slate-100 pl-2 my-2 py-0.5">
                          {p.notes}
                        </p>
                      )}

                      {/* Pricing / AUM Metrics row */}
                      <div className="grid grid-cols-3 gap-2 py-2.5 border-t border-slate-100 text-[11px] font-medium text-slate-500 mt-3 align-middle items-center">
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-tight">Est. Potential Capital</span>
                          <span className="text-slate-800 font-bold font-mono text-xs">{p.opportunityValue ? formatNaira(p.opportunityValue) : '₦0'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-tight">Conversion Prob.</span>
                          <span className="text-slate-800 font-semibold">{p.conversionProbability}%</span>
                        </div>
                        <div className="flex justify-end gap-1.5">
                          <button
                            title="Update organization settings"
                            onClick={(e) => openEditForm(p, e)}
                            className="p-1.5 hover:bg-slate-100 rounded border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-brand-neutral transition-colors cursor-pointer outline-none"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            title="Archive prospect"
                            onClick={(e) => handleArchive(p, e)}
                            className="p-1.5 hover:bg-slate-100 rounded border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer outline-none"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>

                          {(() => {
                            const isOwner = p.assignedOfficerId === currentUser.id;
                            const canDelete = isOwner || 
                                              currentUser.role === 'Director' || 
                                              currentUser.role === 'Admin' || 
                                              currentUser.role === 'SUPER_ADMIN' || 
                                              currentUser.email === 'wisdom.okoh@scmcapitalng.com' || 
                                              currentUser.email === 'omololu.ajediran@scmcapitalng.com';
                            return (
                              <button
                                title={canDelete ? "Permanently Delete" : "Deletion Unauthorized"}
                                onClick={(e) => handleDelete(p.id, p.name, e)}
                                disabled={!canDelete}
                                className={`p-1.5 rounded border transition-colors cursor-pointer outline-none ${
                                  canDelete
                                    ? 'hover:bg-red-50 border-slate-200 hover:border-red-200 text-slate-500 hover:text-primary-brand'
                                    : 'opacity-40 cursor-not-allowed border-slate-100 text-slate-300'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 2. PIPELINE INTERACTIVE KANBAN BOARD VIEW */}
          {viewMode === 'board' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">B2B SCM Portfolio Pipeline Value</span>
                <span className="text-[#b1191f] font-extrabold text-lg block font-mono">
                  {formatNaira(prospects.reduce((sum, p) => sum + (p.opportunityValue || 0), 0))}
                </span>
                <p className="text-[10px] text-slate-500 font-medium">Sum of all prioritized treasuries, private legacies, and corporate money markets</p>
              </div>

              {/* Responsive columns grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['Lead', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Converted'] as ProspectStage[]).map(stg => {
                  const filteredP = prospects.filter(p => p.status === stg);
                  const columnSumValue = filteredP.reduce((acc, current) => acc + (current.opportunityValue || 0), 0);

                  return (
                    <div key={stg} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col space-y-2">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <div>
                          <span className="font-bold text-xs text-slate-800 block leading-tight">{stg === 'Lead' ? 'Inflow Leads' : stg}</span>
                          <span className="text-[9px] text-[#b1191f] font-sans font-extrabold">{formatNaira(columnSumValue)}</span>
                        </div>
                        <span className="bg-slate-200 text-slate-700 text-[10px] uppercase font-black px-2 py-0.5 rounded-full">
                          {filteredP.length}
                        </span>
                      </div>

                      <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-0.5 pt-1">
                        {filteredP.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 italic text-[10px]">No active targets</div>
                        ) : (
                          filteredP.map(p => (
                            <div 
                              key={p.id}
                              onClick={() => setIsDetailView(p.id)}
                              className={`bg-white border hover:border-[#b1191f]/55 p-3 rounded-lg shadow-xs cursor-pointer transition-all space-y-2 ${isDetailView === p.id ? 'border-[#b1191f] ring-1 ring-[#b1191f]' : 'border-slate-150'}`}
                            >
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{p.name}</h4>
                                <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${p.priority === 'High' ? 'bg-red-50 text-red-600 font-black' : p.priority === 'Medium' ? 'bg-amber-50 text-amber-700 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                                  {p.priority}
                                </span>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                                <span>{p.industry}</span>
                                <span className="font-mono font-bold text-slate-800">{formatNaira(p.opportunityValue || 0)}</span>
                              </div>

                              {/* Clickable Quick Stage shifters since drag/drop is iframe-unsafe */}
                              <div className="flex justify-between pt-1.5 border-t border-slate-100 items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const allStages: ProspectStage[] = ['Lead', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Converted'];
                                    const currI = allStages.indexOf(p.status);
                                    if (currI > 0) {
                                      onUpdateProspect(p.id, { status: allStages[currI - 1] });
                                    }
                                  }}
                                  className="text-[9px] font-bold text-slate-400 hover:text-[#b1191f] px-1 disabled:opacity-20 outline-none cursor-pointer"
                                  disabled={p.status === 'Lead'}
                                >
                                  ← Back
                                </button>
                                <span className="text-[9px] text-[#b1191f] font-extrabold uppercase bg-[#fce4ec]/20 px-1 py-0.2 rounded">Score: {p.opportunityScore}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const allStages: ProspectStage[] = ['Lead', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Converted'];
                                    const currI = allStages.indexOf(p.status);
                                    if (currI < allStages.length - 1) {
                                      onUpdateProspect(p.id, { status: allStages[currI + 1] });
                                    }
                                  }}
                                  className="text-[9px] font-bold text-slate-400 hover:text-[#b1191f] px-1 disabled:opacity-20 outline-none cursor-pointer"
                                  disabled={p.status === 'Converted'}
                                >
                                  Next →
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. COOP DISCOVERY QUEUE VIEW */}
          {viewMode === 'discovery' && (
            <div className="space-y-5">
              {/* Executive Metrics Overview Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
                  <div className="p-2.5 bg-[#b1191f]/10 text-[#b1191f] rounded-lg">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Active Queue</p>
                    <p className="text-base font-bold text-slate-800 font-mono">
                      {discoveredLeads.filter(l => !l.alreadyimported).length} <span className="text-[10px] text-slate-400 font-normal">Unclaimed</span>
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">High Opportunity (80%+)</p>
                    <p className="text-base font-bold text-emerald-700 font-mono">
                      {discoveredLeads.filter(l => l.opportunityScore >= 80).length} <span className="text-[10px] text-slate-400 font-normal">Leads</span>
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Imported to CRM</p>
                    <p className="text-base font-bold text-blue-800 font-mono">
                      {discoveredLeads.filter(l => l.alreadyimported).length} <span className="text-[10px] text-slate-400 font-normal">Active</span>
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Est. Treasury Pool</p>
                    <p className="text-base font-bold text-slate-800 font-mono">
                      {formatNaira(discoveredLeads.reduce((acc, l) => acc + (l.estimatedRevenueValue || 2500000000), 0))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Multi-Filter Scanner Control Panel */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-sm text-slate-800 uppercase tracking-wide">Apex Enterprise AI Prospect Discovery Radar</h3>
                      <span className="bg-[#b1191f]/10 text-[#b1191f] text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-[#b1191f]/20 uppercase">
                        AI Engine v4.0
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Targeted multi-source scanner & SCM product matching algorithm for Nigerian institutional treasury prospects.
                    </p>
                  </div>

                  <button
                    id="trigger-proactive-discovery-btn"
                    onClick={handleRunScan}
                    disabled={isScanning}
                    className="bg-[#b1191f] text-white hover:bg-[#8e1217] font-semibold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer outline-none shadow-xs flex items-center gap-2 disabled:opacity-50 shrink-0"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Executing SCM AI Scan...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span>Run SCM AI Discovery Scan</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Filter Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Source Registry</label>
                    <select
                      value={scanSource}
                      onChange={(e) => setScanSource(e.target.value)}
                      className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:border-[#b1191f] focus:outline-none"
                    >
                      <option value="NGX Listed Corporations">NGX Listed Corporations</option>
                      <option value="CBN Regulated Commercial & Merchant Banks">CBN Regulated Commercial Banks</option>
                      <option value="NAICOM Licensed Insurance Companies">NAICOM Licensed Insurance</option>
                      <option value="PenCom Licensed PFAs & Pension Funds">PenCom Licensed PFAs</option>
                      <option value="FMCG & Consumer Goods Conglomerates">FMCG Conglomerates</option>
                      <option value="Oil & Gas / Energy Upstream & Downstream">Oil & Gas / Energy</option>
                      <option value="Telecommunications & Infrastructure">Telecommunications</option>
                      <option value="Federal & State Government Agencies / Parastatals">Government Agencies</option>
                      <option value="West Africa High-Growth Enterprise Register">West Africa Register</option>
                      <option value="Custom Targeted AI Search">Custom AI Search</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Industry Sector</label>
                    <select
                      value={scanIndustry}
                      onChange={(e) => setScanIndustry(e.target.value)}
                      className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:border-[#b1191f] focus:outline-none"
                    >
                      <option value="All">All Sectors</option>
                      <option value="Banking & Financial Services">Banking & Finance</option>
                      <option value="Oil & Gas / Energy">Oil & Gas / Energy</option>
                      <option value="Telecommunications">Telecommunications</option>
                      <option value="FMCG & Manufacturing">FMCG & Manufacturing</option>
                      <option value="Construction & Infrastructure">Construction</option>
                      <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                      <option value="Federal & State Government Agencies">Government Agencies</option>
                      <option value="Tech & Fintech">Tech & Fintech</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Region / Location</label>
                    <select
                      value={scanLocation}
                      onChange={(e) => setScanLocation(e.target.value)}
                      className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:border-[#b1191f] focus:outline-none"
                    >
                      <option value="All">All Regions</option>
                      <option value="Lagos (VI / Ikoyi / Lekki)">Lagos (VI / Ikoyi / Lekki)</option>
                      <option value="Abuja FCT">Abuja FCT</option>
                      <option value="Port Harcourt / Niger Delta">Port Harcourt / Niger Delta</option>
                      <option value="Kano / Northern Hub">Kano / Northern Hub</option>
                      <option value="Regional West Africa">Regional West Africa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Organization Size Tier</label>
                    <select
                      value={scanSizeTier}
                      onChange={(e) => setScanSizeTier(e.target.value)}
                      className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:border-[#b1191f] focus:outline-none"
                    >
                      <option value="All">All Tiers</option>
                      <option value="Tier-1 Enterprise (1,000+ employees)">Tier-1 (1,000+ Emp)</option>
                      <option value="Tier-2 Mid-Market (250 - 999 employees)">Tier-2 (250-999 Emp)</option>
                      <option value="Tier-3 Growth Corporate (50 - 249 employees)">Tier-3 (50-249 Emp)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Revenue Pool</label>
                    <select
                      value={scanRevenueRange}
                      onChange={(e) => setScanRevenueRange(e.target.value)}
                      className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:border-[#b1191f] focus:outline-none"
                    >
                      <option value="All">All Liquidity Ranges</option>
                      <option value="₦100B+ Mega Treasury Pool">₦100B+ Mega Pool</option>
                      <option value="₦10B - ₦100B High Liquidity">₦10B - ₦100B High</option>
                      <option value="₦1B - ₦10B Growth Treasury">₦1B - ₦10B Growth</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target SCM Solution</label>
                    <select
                      value={scanTargetProduct}
                      onChange={(e) => setScanTargetProduct(e.target.value)}
                      className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:border-[#b1191f] focus:outline-none"
                    >
                      <option value="All">All SCM Products</option>
                      <option value="SCM Corporate Money Market Fund">SCM Money Market Fund</option>
                      <option value="Fixed Income & CP Placements">Fixed Income & CP</option>
                      <option value="Treasury & Cash Optimization">Treasury Optimization</option>
                      <option value="Private Wealth & Executive Asset Management">Private Wealth Mgt</option>
                      <option value="Institutional Capital & Mandate Management">Institutional Capital</option>
                    </select>
                  </div>
                </div>

                {radarMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{radarMessage}</span>
                  </div>
                )}
                {radarError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-[#b1191f] font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#b1191f] shrink-0" />
                    <span>{radarError}</span>
                  </div>
                )}
              </div>

              {/* Sub-Tab Navigation Bar & Queue Search */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDiscoverySubTab('queue')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      discoverySubTab === 'queue'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Personal Queue</span>
                    <span className="ml-1 bg-[#b1191f] text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono">
                      {discoveredLeads.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setDiscoverySubTab('history')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      discoverySubTab === 'history'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Scan History</span>
                    {historySessions.length > 0 && (
                      <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.2 rounded-full font-mono">
                        {historySessions.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setDiscoverySubTab('analytics')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      discoverySubTab === 'analytics'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Executive Analytics</span>
                  </button>
                </div>

                {discoverySubTab === 'queue' && (
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter lead queue..."
                      value={discoverySearchQuery}
                      onChange={(e) => setDiscoverySearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:border-[#b1191f] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* DISCOVERY SUB-TAB 1: PERSONAL QUEUE */}
              {discoverySubTab === 'queue' && (
                <div className="space-y-3">
                  {discoveredLeads.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
                      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                        <Compass className="w-6 h-6" />
                      </div>
                      <h4 className="font-display font-semibold text-sm text-slate-800">Your AI Discovery Queue is Empty</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        No target leads cached in your personal workspace queue. Configure the scanner filters above and click "Run SCM AI Discovery Scan" to generate new institutional leads.
                      </p>
                      <button
                        onClick={handleRunScan}
                        disabled={isScanning}
                        className="bg-[#b1191f] text-white hover:bg-[#8e1217] font-semibold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer inline-flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                        <span>Run Discovery Scan Now</span>
                      </button>
                    </div>
                  ) : (
                    discoveredLeads
                      .filter(lead => {
                        if (!discoverySearchQuery) return true;
                        const q = discoverySearchQuery.toLowerCase();
                        return lead.name.toLowerCase().includes(q) ||
                               lead.industry.toLowerCase().includes(q) ||
                               lead.location.toLowerCase().includes(q) ||
                               (lead.opportunityReason && lead.opportunityReason.toLowerCase().includes(q));
                      })
                      .map((lead) => (
                        <div
                          key={lead.id}
                          className={`bg-white border rounded-xl p-4 shadow-xs transition-all space-y-3 ${
                            lead.alreadyimported
                              ? 'border-slate-200 bg-slate-50/60 opacity-80'
                              : 'border-slate-200 hover:border-[#b1191f]/50 hover:shadow-sm'
                          }`}
                        >
                          {/* Top Row: Title, Badges, Duplicate Detection */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => handleLocalOpenDossier(lead.id, lead.name)}
                                className="font-bold text-sm text-slate-900 hover:text-[#b1191f] hover:underline cursor-pointer transition-colors text-left flex items-center gap-1.5 font-sans"
                                title="Click to view corporate Intelligence Dossier & Research Workspace"
                              >
                                <span>{lead.name}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 inline-block opacity-70 hover:opacity-100" />
                              </button>

                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium">
                                {lead.source || 'NGX Listed'}
                              </span>

                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium">
                                {lead.industry}
                              </span>

                              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                <Globe className="w-3 h-3 text-slate-400" />
                                {lead.location}
                              </span>
                            </div>

                            {/* Duplicate Intelligence Badge */}
                            {lead.existingProspect && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 text-[10px] text-amber-900 flex items-center gap-1.5 shrink-0">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>
                                  <strong>In CRM:</strong> Stage: {lead.existingProspect.status} • Owner: {lead.existingProspect.assignedOfficerName || 'Officer'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Metrics Pill Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2 text-center">
                              <p className="text-[9px] text-emerald-800 uppercase font-bold tracking-wider">Opportunity Score</p>
                              <p className="text-sm font-extrabold text-emerald-700 font-mono">
                                {lead.opportunityScore}% Match
                              </p>
                            </div>

                            <div className="bg-blue-50/80 border border-blue-200/80 rounded-lg p-2 text-center">
                              <p className="text-[9px] text-blue-800 uppercase font-bold tracking-wider">Confidence Level</p>
                              <p className="text-sm font-extrabold text-blue-700 capitalize">
                                {lead.confidence || 'High'} ({lead.confidenceScore || 90}%)
                              </p>
                            </div>

                            <div className="bg-purple-50/80 border border-purple-200/80 rounded-lg p-2 text-center">
                              <p className="text-[9px] text-purple-800 uppercase font-bold tracking-wider">Business Fit</p>
                              <p className="text-sm font-extrabold text-purple-700">
                                {lead.businessFit || 'Tier-1 Corporate'}
                              </p>
                            </div>

                            <div className="bg-slate-100/80 border border-slate-200 rounded-lg p-2 text-center">
                              <p className="text-[9px] text-slate-600 uppercase font-bold tracking-wider">Treasury Pool Est.</p>
                              <p className="text-sm font-extrabold text-slate-800 font-mono">
                                {formatNaira(lead.estimatedRevenueValue || 2500000000)}
                              </p>
                            </div>
                          </div>

                          {/* Strategic Rationale */}
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">
                            <strong className="text-slate-900 font-semibold">Strategic Pitch Rationale: </strong>
                            {lead.opportunityReason || lead.reason || 'High capital expansion opportunity matching SCM Money Market and Fixed Income yield structures.'}
                          </div>

                          {/* Product Matches & Decision Makers */}
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs pt-1">
                            {/* Recommended SCM Products */}
                            {lead.productMatches && lead.productMatches.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Products:</span>
                                {lead.productMatches.map((pm: any, i: number) => (
                                  <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/80 text-[10px] font-medium">
                                    {pm.productName} ({pm.fitScore}%)
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Decision Makers */}
                            {lead.decisionMakers && lead.decisionMakers.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Officer:</span>
                                {lead.decisionMakers.map((dm: any, i: number) => (
                                  <span key={i} className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200/60 text-[10px] font-semibold flex items-center gap-1">
                                    <User className="w-3 h-3 text-blue-600" />
                                    {dm.title}: {dm.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleLocalOpenDossier(lead.id, lead.name)}
                                className="bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer outline-none flex items-center gap-1.5"
                              >
                                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                                <span>Open Intelligence Dossier</span>
                              </button>

                              {!lead.alreadyimported && (
                                <button
                                  onClick={() => handleLocalDismiss(lead.id, lead.name)}
                                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-medium text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer outline-none flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Dismiss</span>
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                if (!lead.alreadyimported) {
                                  handleLocalImportDiscovery(lead.id, lead.name);
                                }
                              }}
                              disabled={lead.alreadyimported}
                              className={`text-xs font-bold px-4 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 outline-none ${
                                lead.alreadyimported
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 cursor-default'
                                  : 'bg-[#b1191f] text-white hover:bg-[#8e1217] shadow-xs'
                              }`}
                            >
                              {lead.alreadyimported ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Active in SCM Pipeline</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Import to CRM Pipeline</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}

              {/* DISCOVERY SUB-TAB 2: SCAN HISTORY */}
              {discoverySubTab === 'history' && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-display font-semibold text-xs text-slate-800 uppercase tracking-wide">
                        Discovery Audit Log & Scan Sessions
                      </h4>
                      <p className="text-[10px] text-slate-400">Historical records of scan parameters executed under your officer identity.</p>
                    </div>
                  </div>

                  {historySessions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-6 bg-slate-50 rounded-lg border border-slate-100">
                      No scan history logged yet. Run a discovery scan above to begin audit logging.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {historySessions.map((session) => (
                        <div key={session.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 font-mono">{session.source}</span>
                              <span className="text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                                {new Date(session.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Sector: <strong className="text-slate-700">{session.filters?.industry || 'All'}</strong> • Location: <strong className="text-slate-700">{session.filters?.location || 'All'}</strong> • Size: <strong className="text-slate-700">{session.filters?.sizeTier || 'All'}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Discovered</span>
                              <span className="font-extrabold text-slate-800 font-mono text-sm">{session.discoveredCount} Leads</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">High Fit</span>
                              <span className="font-extrabold text-emerald-700 font-mono text-sm">{session.highOpportunityCount} Matches</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DISCOVERY SUB-TAB 3: EXECUTIVE ANALYTICS */}
              {discoverySubTab === 'analytics' && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-display font-semibold text-xs text-slate-800 uppercase tracking-wide">
                      Executive Discovery Telemetry & Conversion Metrics
                    </h4>
                    <p className="text-[10px] text-slate-400">Analysis of AI discovery yield, high-value treasury targeting, and CRM pipeline conversion ratios.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Scans Executed</span>
                      <p className="text-2xl font-extrabold text-slate-800 font-mono">{analyticsData?.totalScans || historySessions.length || 1}</p>
                      <p className="text-[10px] text-slate-500">Across multi-registry Nigerian public databases</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">High Match Yield Ratio</span>
                      <p className="text-2xl font-extrabold text-emerald-700 font-mono">
                        {analyticsData ? `${analyticsData.highOpportunityRatio}%` : '85%'}
                      </p>
                      <p className="text-[10px] text-slate-500">Leads with opportunity score above 80%</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Imported Conversion Rate</span>
                      <p className="text-2xl font-extrabold text-blue-700 font-mono">
                        {analyticsData ? `${analyticsData.importedConversionRate}%` : '60%'}
                      </p>
                      <p className="text-[10px] text-slate-500">Discovered leads promoted into active SCM CRM</p>
                    </div>
                  </div>

                  {/* Industry Breakdown Table */}
                  <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top Treasury Discovery Sectors</h5>
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 text-[10px] uppercase">
                          <tr>
                            <th className="p-2.5">Sector</th>
                            <th className="p-2.5">Queue Leads</th>
                            <th className="p-2.5">Avg Match Score</th>
                            <th className="p-2.5 text-right">Est. Aggregate Pool</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {['Banking & Financial Services', 'Oil & Gas / Energy', 'Telecommunications', 'FMCG & Manufacturing', 'Government Agencies'].map((sec, i) => {
                            const secLeads = discoveredLeads.filter(l => l.industry.toLowerCase().includes(sec.split(' ')[0].toLowerCase()));
                            const count = secLeads.length || (5 - i);
                            const avgScore = count > 0 ? Math.round(secLeads.reduce((a, b) => a + b.opportunityScore, 0) / count) : 88 - i * 2;
                            return (
                              <tr key={sec} className="hover:bg-slate-50">
                                <td className="p-2.5 font-medium text-slate-800">{sec}</td>
                                <td className="p-2.5 font-mono">{count} Leads</td>
                                <td className="p-2.5 font-mono font-bold text-emerald-700">{avgScore}%</td>
                                <td className="p-2.5 font-mono font-bold text-right text-slate-800">
                                  {formatNaira((count * 2500000000))}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. SIGNAL ALERTS FEED VIEW */}
          {viewMode === 'signals' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-display font-semibold text-xs text-slate-800 uppercase tracking-wide">Industry News & Corporate Expansion Signals</h3>
                    <p className="text-[10px] text-slate-400">Monitoring cash expansions, funding rounds, and joint ventures in Nigeria to trigger SCM pitches</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsLoggingSignal(!isLoggingSignal);
                      setSigError('');
                      setSigSuccess('');
                    }}
                    className="bg-[#b1191f] hover:bg-[#8e1217] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all outline-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isLoggingSignal ? 'Close Panel' : 'Log New Signal'}</span>
                  </button>
                </div>

                {isLoggingSignal && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5">
                    <h4 className="font-bold text-slate-900 text-xs">Record Verified Corporate Signal</h4>
                    {sigError && <p className="text-[10px] text-red-600 font-bold">{sigError}</p>}
                    {sigSuccess && <p className="text-[10px] text-emerald-600 font-bold">{sigSuccess}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Company Name</label>
                        <input
                          type="text"
                          value={sigCompanyName}
                          onChange={(e) => setSigCompanyName(e.target.value)}
                          placeholder="e.g. Julius Berger Nigeria"
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#b1191f]/40 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Category</label>
                        <select
                          value={sigCategory}
                          onChange={(e) => setSigCategory(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#b1191f]/40 bg-white"
                        >
                          <option value="Signals">Signals & Inflows</option>
                          <option value="Expansion">Expansion & Capex</option>
                          <option value="Funding">Funding & Grants</option>
                          <option value="Acquisition">Acquisition & Mergers</option>
                          <option value="Regulatory">Regulatory Notices</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Signal Title / Headline</label>
                      <input
                        type="text"
                        value={sigTitle}
                        onChange={(e) => setSigTitle(e.target.value)}
                        placeholder="e.g. Major Capex Liquidation of N50B Runway Upgrade"
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#b1191f]/40 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Details & Analysis description</label>
                      <textarea
                        value={sigContent}
                        onChange={(e) => setSigContent(e.target.value)}
                        rows={3}
                        placeholder="Provide details about balance sheet optimization, liquidity buffers, cash divestments, or offshore trade financing."
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#b1191f]/40 bg-white resize-none"
                      />
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Severity:</span>
                        <select
                          value={sigSeverity}
                          onChange={(e) => setSigSeverity(e.target.value)}
                          className="text-[10px] font-bold p-1 border border-slate-200 rounded bg-white text-slate-700 outline-none"
                        >
                          <option value="Low">Low Priority</option>
                          <option value="Medium">Medium Priority</option>
                          <option value="High">High Priority</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setIsLoggingSignal(false);
                            setSigError('');
                            setSigSuccess('');
                          }}
                          className="bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors outline-none"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!sigCompanyName.trim() || !sigTitle.trim() || !sigContent.trim()) {
                              setSigError('Please provide company name, headline, and signal details.');
                              return;
                            }
                            setSigError('');
                            setSigSuccess('');
                            try {
                              if (onAddNewsArticle) {
                                await onAddNewsArticle({
                                  companyName: sigCompanyName.trim(),
                                  title: sigTitle.trim(),
                                  content: sigContent.trim(),
                                  category: sigCategory,
                                  severity: sigSeverity
                                });
                                setSigSuccess('Corporate signal registered successfully!');
                                setSigCompanyName('');
                                setSigTitle('');
                                setSigContent('');
                                setTimeout(() => {
                                  setIsLoggingSignal(false);
                                  setSigSuccess('');
                                }, 1500);
                              }
                            } catch (e: any) {
                              setSigError(e.message || 'Verification failure under SCM directory registry rules.');
                            }
                          }}
                          className="bg-[#b1191f] hover:bg-[#8e1217] text-white text-[10px] font-bold px-4 py-1.5 rounded-lg cursor-pointer transition-colors outline-none"
                        >
                          Save Signal
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {newsArticles.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">No raw signals monitored. Ask Serena AI or search corporate rosters.</p>
                  ) : (
                    newsArticles.map((article, index) => (
                      <div key={index} className="p-3.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl space-y-2 text-xs text-justify">
                        <div className="flex justify-between items-center">
                          <span 
                            onClick={() => {
                              localStorage.setItem('scm_intel_search_query', article.companyName);
                              if (onNavigate) onNavigate('intelligence');
                            }}
                            className="text-[9px] font-black uppercase text-[#b1191f] tracking-wide hover:underline cursor-pointer flex items-center gap-1"
                            title="Click to execute SCM Apollo Intelligence Search"
                          >
                            <span>{article.companyName || 'SCM Capital Tracker'}</span>
                            <Search className="w-2.5 h-2.5 text-[#b1191f]" />
                          </span>
                          <span className="text-[9px] text-slate-400">{new Date(article.publishedAt || article.date).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 leading-snug">{article.title}</h4>
                        <p className="text-slate-600 leading-relaxed font-sans">{article.description || article.content}</p>
                        <div className="pt-2 border-t border-slate-200/50 flex justify-between items-center text-[10px]">
                          <span className="text-[9px] bg-[#fce4ec]/30 text-[#b1191f] px-2 py-0.5 rounded border border-[#fce4ec]/40 font-bold">Category: {article.category}</span>
                          <button
                            onClick={() => {
                              setViewMode('list');
                              alert(`Signal aligned! Enter executive info on details panel to outreach target.`);
                            }}
                            className="font-bold text-[#b1191f] hover:underline cursor-pointer outline-none"
                          >
                            Craft Response Letter →
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Details Side-panel Column */}
        <div className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5 lg:col-span-1 ${!isDetailView ? 'hidden lg:block' : ''}`}>
          {(() => {
            const activeP = prospects.find(p => p.id === isDetailView) || prospects[0];
            if (!activeP) {
              return (
                <div className="text-center py-12 text-slate-400 space-y-1">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold">Select an Organization</p>
                  <p className="text-[10px]">Click a prospect on the directory list to examine the core portfolio.</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {/* Close button for tablet/mobile representation */}
                <div className="flex justify-between items-center pb-2 border-b border-secondary">
                  <h3 className="font-display font-extrabold text-sm uppercase text-brand-neutral tracking-wider">
                    Executive Profile Dossier
                  </h3>
                  <button 
                    onClick={() => setIsDetailView(null)}
                    className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg lg:hidden"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Identifiers */}
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-base text-brand-neutral line-clamp-1">{activeP.name}</h4>
                  <p className="text-xs text-slate-500">{activeP.orgType} • {activeP.location}</p>
                </div>

                {/* Info blocks */}
                <div className="border border-slate-100 bg-slate-50 rounded-lg p-3 space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeP.website ? <a href={`https://${activeP.website}`} target="_blank" rel="noreferrer" id="prospect-website-link" className="text-primary-brand hover:underline flex items-center gap-1">{activeP.website} <ExternalLink className="w-2.5 h-2.5" /></a> : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeP.phone || 'Phone Unlisted'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeP.email || 'Email Unlisted'}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                    <User className="w-3.5 h-3.5 text-slate-400 font-bold" />
                    <span>Advisor: <strong>{activeP.assignedOfficerName || 'Julian Draxler'}</strong></span>
                  </div>
                </div>

                {/* Opportunity scores */}
                <div className="space-y-3 pt-2">
                  <h5 className="font-display font-bold text-xs text-slate-700 uppercase tracking-wider block">Financial Evaluation Metrics</h5>
                  
                  <div className="grid grid-cols-2 gap-3 text-center text-xs">
                    <div className="border border-slate-100 rounded p-2 bg-slate-50">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">AUM Value Pool</span>
                      <span className="text-brand-neutral font-extrabold block font-mono text-xs">{formatNaira(activeP.opportunityValue)}</span>
                    </div>
                    <div className="border border-slate-100 rounded p-2 bg-slate-50">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Engagement Score</span>
                      <span className="text-brand-neutral font-extrabold block font-mono text-xs">
                        <span className={`inline-flex items-center gap-0.5 ${activeP.opportunityScore >= 80 ? 'text-primary-brand' : 'text-slate-700'}`}>
                          {activeP.opportunityScore}/100
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Potential Analysis Accordion Mockup */}
                <div className="space-y-2 pt-2 pb-1 border-t border-slate-100">
                  <h5 className="font-display font-bold text-xs text-slate-700 uppercase tracking-wider block">SCM Product Matching</h5>
                  
                  <div className="space-y-2 text-[11px] text-slate-600 font-medium">
                    <div className="p-2 border border-slate-100 rounded hover:bg-slate-50">
                      <span className="text-neutral font-bold block">1. SCM Treasury Money Market Fund Fit</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{activeP.mmfPotential || 'Highly compatible placement.'}</span>
                    </div>
                    <div className="p-2 border border-slate-100 rounded hover:bg-slate-50">
                      <span className="text-neutral font-bold block">2. Private Wealth / Executives Suite advisory</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{activeP.wealthPotential || 'Significant C-suite target pool.'}</span>
                    </div>
                    <div className="p-2 border border-slate-100 rounded hover:bg-slate-50">
                      <span className="text-neutral font-bold block">3. Staff Financial Literacy Seminars</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{activeP.literacyPotential || 'Suitable for employee briefings.'}</span>
                    </div>
                  </div>
                </div>

                {/* Status Update / Actions */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Trigger stage progression</label>
                  <div className="flex gap-2">
                    <select
                      value={activeP.status}
                      id="prospect-stage-quick-edit"
                      onChange={(e) => onUpdateProspect(activeP.id, { status: e.target.value as ProspectStage })}
                      className="grow bg-slate-50 border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-brand transition-all cursor-pointer"
                    >
                      {statuses.filter(s => s !== 'All').map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SCM TASK CHECKLIST & FOLLOW-UPS */}
                <div className="pt-4 border-t border-slate-105 space-y-3">
                  <h5 className="font-display font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5 text-[#b1191f]" />
                    <span>Follow-up Reminders & Tasks</span>
                  </h5>

                  {/* Tasks List */}
                  <div className="space-y-1.5 text-[11px] max-h-40 overflow-y-auto scrollbar-thin">
                    {tasks.filter(t => t.prospectId === activeP.id).length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No tasks logged. Create a callback target below.</p>
                    ) : (
                      tasks.filter(t => t.prospectId === activeP.id).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox"
                              checked={t.isCompleted}
                              onChange={(e) => {
                                e.stopPropagation();
                                onUpdateTask(t.id, { 
                                  status: t.isCompleted ? 'Pending' : 'Completed',
                                  isCompleted: !t.isCompleted 
                                });
                              }}
                              className="accent-[#b1191f] cursor-pointer"
                            />
                            <span className={`font-semibold ${t.isCompleted ? 'line-through text-slate-400' : 'text-slate-705'}`}>
                              {t.title}
                            </span>
                            <span className={`text-[8px] font-bold uppercase px-1 rounded ${t.priority === 'High' ? 'bg-red-105 text-red-700' : t.priority === 'Medium' ? 'bg-amber-105 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                              {t.priority}
                            </span>
                          </div>
                          <button
                            onClick={() => onDeleteTask(t.id)}
                            className="text-slate-400 hover:text-red-700 font-bold outline-none border-none text-xs cursor-pointer px-1"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* SCM task creator block */}
                  <div className="flex gap-1.5 pt-1">
                    <input 
                      type="text"
                      placeholder="New follow-up action..."
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="grow text-[11px] bg-slate-50 hover:bg-white border border-slate-200 focus:border-[#b1191f] rounded px-2 py-1 outline-none font-medium transition-colors"
                    />
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as any)}
                      className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1 outline-none font-bold cursor-pointer"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                    <button
                      onClick={async () => {
                        if (!taskTitle.trim()) return;
                        await onAddTask({
                          prospectId: activeP.id,
                          title: taskTitle,
                          priority: taskPriority,
                          completed: false,
                          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
                        });
                        setTaskTitle('');
                      }}
                      className="bg-[#b1191f] hover:bg-[#8e1217] text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors cursor-pointer outline-none"
                    >
                      Log
                    </button>
                  </div>
                </div>

                {/* SCM CHRONOLOGICAL JOURNEY TIMELINE */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h5 className="font-display font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-[#b1191f]" />
                    <span>Relationship History Timeline</span>
                  </h5>

                  <div className="space-y-3 text-[10px] max-h-48 overflow-y-auto scrollbar-thin pl-1 text-slate-605">
                    <div className="relative pl-4 border-l border-slate-200 space-y-3 text-justify">
                      <div className="relative">
                        <span className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 bg-[#b1191f] rounded-full border border-white"></span>
                        <p className="font-bold text-slate-800">C-Suite SCM Product Placement Pitch Drafted</p>
                        <p className="text-slate-400">Assigned officer processed overnight yield suitability calculations.</p>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 bg-slate-400 rounded-full border border-white"></span>
                        <p className="font-bold text-slate-800">Initial Discovery Completed</p>
                        <p className="text-slate-400">Lead generated via AI Institutional Intelligence Dossier Crawler.</p>
                        <p className="text-[9px] text-[#b1191f] font-semibold">Engagement Score: {activeP.opportunityScore}/100</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            );
          })()}
        </div>

      </div>

      {/* Slide Modal popup for Creating / Editing prospects */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex justify-center items-center z-40 p-4 backdrop-blur-xs font-sans">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-brand-neutral text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-display font-bold text-sm uppercase tracking-wide">
                {selectedProspect ? 'Modify Team Target Parameters' : 'Log Institutional Lead Entry'}
              </h3>
              <button 
                id="close-prospect-form-btn"
                onClick={() => setIsFormOpen(false)}
                className="text-white opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form body */}
            <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                  <BadgeAlert className="w-4 h-4 text-red-700 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Org Name */}
                <div className="col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">Organization Name *</label>
                  <input
                    type="text"
                    required
                    id="input-prospect-name"
                    value={formData.name || ''}
                    placeholder="e.g. zenith bank PLC"
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-brand rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand transition-all"
                  />
                </div>

                {/* Industry Sector */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Sector / Industry *</label>
                  <input
                    type="text"
                    required
                    id="input-prospect-industry"
                    value={formData.industry || ''}
                    placeholder="e.g. Financial Services"
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-brand rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand transition-all"
                  />
                </div>

                {/* Org Type */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Organization Type</label>
                  <select
                    value={formData.orgType || 'Private Corporation'}
                    onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-brand rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand transition-all"
                  >
                    <option value="Private Corporation">Private Corporation</option>
                    <option value="Public Conglomerate">Public Conglomerate</option>
                    <option value="Government Body">Government Body</option>
                    <option value="Joint Venture">Joint Venture</option>
                    <option value="Multinational Subsidiary">Multinational Subsidiary</option>
                  </select>
                </div>

                {/* Website */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Corporate Website</label>
                  <input
                    type="text"
                    placeholder="zenithbank.com"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-brand rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand transition-all"
                  />
                </div>

                {/* HQ Location */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">HQ Location City *</label>
                  <input
                    type="text"
                    required
                    id="input-prospect-location"
                    value={formData.location || ''}
                    placeholder="Victoria Island, Lagos"
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-brand rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand transition-all"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Official Contact Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    placeholder="info@corporate.ng"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-brand rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand transition-all"
                  />
                </div>

                {/* Phone number */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Official Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    placeholder="+234 1 234 5678"
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-brand rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand transition-all"
                  />
                </div>

                {/* Pipeline Stage */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Cycle Status</label>
                  <select
                    value={formData.status || 'Lead'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ProspectStage })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-brand rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand transition-all"
                  >
                    <option value="Lead">Lead</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Meeting Scheduled">Meeting Scheduled</option>
                    <option value="Financial Literacy Session Scheduled">Financial Literacy Session Scheduled</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                {/* Priority Level */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Action Priority</label>
                  <select
                    value={formData.priority || 'Medium'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as PriorityLevel })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-brand rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand transition-all"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                {/* Est Potential Capital (Naira value) */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Est. Potential Capital (₦ Value)</label>
                  <input
                    type="number"
                    value={formData.opportunityValue || 0}
                    onChange={(e) => setFormData({ ...formData, opportunityValue: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-brand rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand transition-all"
                  />
                </div>

                {/* Conversion Probability % */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Conversion Chance ({formData.conversionProbability}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.conversionProbability || 20}
                    onChange={(e) => setFormData({ ...formData, conversionProbability: Number(e.target.value) })}
                    className="w-full accent-primary-brand py-2 cursor-pointer"
                  />
                </div>

                {/* Notes and Briefs */}
                <div className="col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">CRM Intelligence Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Briefly state excess treasury volumes, decision key influencers, or required MUTUAL FUND briefs alignment."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary-brand rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand text-xs transition-all resize-none"
                  ></textarea>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  id="cancel-prospect-form-btn"
                  disabled={isSubmitting}
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-prospect-form-btn"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary-brand hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-colors shadow-md shadow-red-950/20 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save Organization'
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
