import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Paperclip, 
  Calendar, 
  Lock, 
  Sparkles, 
  Award, 
  BookOpen, 
  Clock, 
  CheckSquare, 
  FileText, 
  Briefcase, 
  ChevronRight, 
  Check, 
  X, 
  ArrowLeft, 
  Send, 
  History, 
  Pin, 
  Archive, 
  FileSpreadsheet, 
  Activity,
  Globe,
  UploadCloud,
  FileUp,
  AlertCircle,
  Users2
} from 'lucide-react';
import { UserProfile, Prospect, Contact, Meeting, Task } from '../types';

interface WorkspacesProps {
  currentUser: UserProfile;
  prospects: Prospect[];
  scmFetch: (url: string, options?: RequestInit) => Promise<Response>;
  refreshDatabase: () => Promise<void>;
  onAddContact: (contact: Partial<Contact>) => Promise<any>;
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<any>;
  onDeleteContact: (id: string) => Promise<any>;
  onAddMeeting: (meeting: Partial<Meeting>) => Promise<any>;
  onUpdateMeeting: (id: string, updates: Partial<Meeting>) => Promise<any>;
  onDeleteMeeting: (id: string) => Promise<any>;
  onAddTask: (task: Partial<Task>) => Promise<any>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<any>;
  onDeleteTask: (id: string) => Promise<any>;
}

export const Workspaces: React.FC<WorkspacesProps> = ({
  currentUser,
  prospects,
  scmFetch,
  refreshDatabase,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}) => {
  // Navigation & UI States
  const [workspacesList, setWorkspacesList] = useState<any[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Active Workspace Detail Cache
  const [activeWorkspaceDetail, setActiveWorkspaceDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('research');

  // Edit / Input States for active workspace fields
  const [isEditingResearch, setIsEditingResearch] = useState(false);
  const [researchFields, setResearchFields] = useState({
    apolloFindings: '',
    companyProfile: '',
    industryAnalysis: '',
    executiveInsights: '',
    investmentOpportunities: '',
    researchSummaries: ''
  });

  // Note Creator/Editor States
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('private');

  // Proposal Draft States
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalContent, setProposalContent] = useState('');
  const [proposalVersion, setProposalVersion] = useState('1.0');

  // Presentation States
  const [presentationModalOpen, setPresentationModalOpen] = useState(false);
  const [presentationTitle, setPresentationTitle] = useState('');
  const [presentationType, setPresentationType] = useState('Client Pitch Deck');
  const [presentationContent, setPresentationContent] = useState('');

  // Serena AI Chat States
  const [serenaPrompt, setSerenaPrompt] = useState('');
  const [serenaChatHistory, setSerenaChatHistory] = useState<any[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [activeSerenaModule, setActiveSerenaModule] = useState<'research' | 'proposal' | 'email' | 'meeting' | 'followup' | 'default'>('research');

  // Load Workspaces List
  const fetchWorkspaces = async () => {
    try {
      const res = await scmFetch('/api/workspaces');
      if (res.ok) {
        const list = await res.json();
        setWorkspacesList(list);
      }
    } catch (err) {
      console.error('Failed to query SCM workspaces list:', err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [prospects]);

  // Load Single Workspace Details
  const fetchWorkspaceDetail = async (id: string) => {
    setDetailLoading(true);
    setErrorMsg('');
    try {
      const res = await scmFetch(`/api/workspaces/${id}`);
      if (res.ok) {
        const detail = await res.json();
        setActiveWorkspaceDetail(detail);
        setResearchFields({
          apolloFindings: detail.workspace.apolloFindings || '',
          companyProfile: detail.workspace.companyProfile || '',
          industryAnalysis: detail.workspace.industryAnalysis || '',
          executiveInsights: detail.workspace.executiveInsights || '',
          investmentOpportunities: detail.workspace.investmentOpportunities || '',
          researchSummaries: detail.workspace.researchSummaries || ''
        });
      } else {
        const errObj = await res.json();
        setErrorMsg(errObj.error || 'Strict Security Rule: Workspace access denied.');
      }
    } catch (err) {
      console.error('Failed to load workspace detail:', err);
      setErrorMsg('Unauthorized access to corporate research workspace.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchWorkspaceDetail(selectedWorkspaceId);
    } else {
      setActiveWorkspaceDetail(null);
    }
  }, [selectedWorkspaceId]);

  // Handle Workspace Creation
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedProspectId) return;

    const selectedProspect = prospects.find(p => p.id === selectedProspectId);
    if (!selectedProspect) return;

    try {
      const res = await scmFetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: selectedProspect.id,
          companyName: selectedProspect.companyName || selectedProspect.name
        })
      });

      if (res.ok) {
        const newWs = await res.json();
        setCreateModalOpen(false);
        setSelectedProspectId('');
        await fetchWorkspaces();
        setSelectedWorkspaceId(newWs.id);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to establish workspace.');
      }
    } catch (err) {
      console.error('Workspace creation error:', err);
      setErrorMsg('Workspace already exists for this prospect.');
    }
  };

  // Handle Update Status
  const handleUpdateStatus = async (status: 'Active' | 'Archived' | 'Closed') => {
    if (!selectedWorkspaceId || !activeWorkspaceDetail) return;
    try {
      const res = await scmFetch(`/api/workspaces/${selectedWorkspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        await fetchWorkspaceDetail(selectedWorkspaceId);
        await fetchWorkspaces();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Save Core Research Data
  const handleSaveResearch = async () => {
    if (!selectedWorkspaceId) return;
    try {
      const res = await scmFetch(`/api/workspaces/${selectedWorkspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(researchFields)
      });
      if (res.ok) {
        setIsEditingResearch(false);
        await fetchWorkspaceDetail(selectedWorkspaceId);
      }
    } catch (err) {
      console.error('Failed to update research profiles:', err);
    }
  };

  // Delete Workspace
  const handleDeleteWorkspace = async () => {
    if (!selectedWorkspaceId) return;
    if (window.confirm('CRITICAL WARN: Deleting this workspace is irreversible and will delete persistent analytical profiles. Proceed?')) {
      try {
        const res = await scmFetch(`/api/workspaces/${selectedWorkspaceId}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setSelectedWorkspaceId(null);
          await fetchWorkspaces();
        }
      } catch (err) {
        console.error('Failed to delete workspace:', err);
      }
    }
  };

  // NOTES OPERATIONS (Integrated with Workspace)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim() || !selectedWorkspaceId) return;

    try {
      if (editingNoteId) {
        const res = await scmFetch(`/api/notes/${editingNoteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: noteTitle,
            content: noteContent,
            visibility: noteVisibility
          })
        });
        if (res.ok) {
          setNoteFormOpen(false);
          setEditingNoteId(null);
          await fetchWorkspaceDetail(selectedWorkspaceId);
        }
      } else {
        const res = await scmFetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: selectedWorkspaceId,
            prospectId: activeWorkspaceDetail?.workspace?.prospectId,
            title: noteTitle,
            content: noteContent,
            visibility: noteVisibility
          })
        });
        if (res.ok) {
          setNoteFormOpen(false);
          setNoteTitle('');
          setNoteContent('');
          setNoteVisibility('private');
          await fetchWorkspaceDetail(selectedWorkspaceId);
        }
      }
    } catch (err) {
      console.error('Failed to save strategic note:', err);
    }
  };

  const handleTogglePinNote = async (noteId: string) => {
    try {
      const res = await scmFetch(`/api/notes/${noteId}/pin`, { method: 'POST' });
      if (res.ok) {
        await fetchWorkspaceDetail(selectedWorkspaceId!);
      }
    } catch (err) {
      console.error('Failed to pin note:', err);
    }
  };

  const handleToggleArchiveNote = async (noteId: string) => {
    try {
      const res = await scmFetch(`/api/notes/${noteId}/archive`, { method: 'POST' });
      if (res.ok) {
        await fetchWorkspaceDetail(selectedWorkspaceId!);
      }
    } catch (err) {
      console.error('Failed to archive note:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this corporate intelligence note?')) {
      try {
        const res = await scmFetch(`/api/notes/${noteId}`, { method: 'DELETE' });
        if (res.ok) {
          await fetchWorkspaceDetail(selectedWorkspaceId!);
        }
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    }
  };

  // PROPOSAL OPERATION
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalTitle.trim() || !proposalContent.trim() || !selectedWorkspaceId) return;

    try {
      const res = await scmFetch(`/api/workspaces/${selectedWorkspaceId}/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: proposalTitle,
          content: proposalContent,
          version: proposalVersion
        })
      });
      if (res.ok) {
        setProposalModalOpen(false);
        setProposalTitle('');
        setProposalContent('');
        setProposalVersion('1.0');
        await fetchWorkspaceDetail(selectedWorkspaceId);
      }
    } catch (err) {
      console.error('Proposal generation failure:', err);
    }
  };

  // PRESENTATION OPERATION
  const handleUploadPresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presentationTitle.trim() || !selectedWorkspaceId) return;

    try {
      const res = await scmFetch(`/api/workspaces/${selectedWorkspaceId}/presentations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: presentationTitle,
          type: presentationType,
          content: presentationContent
        })
      });
      if (res.ok) {
        setPresentationModalOpen(false);
        setPresentationTitle('');
        setPresentationContent('');
        await fetchWorkspaceDetail(selectedWorkspaceId);
      }
    } catch (err) {
      console.error('Failed to log corporate presentation:', err);
    }
  };

  // SERENA CONSULTATION
  const handleConsultSerena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serenaPrompt.trim() || !selectedWorkspaceId || aiGenerating) return;

    const userPromptText = serenaPrompt;
    setSerenaPrompt('');
    setAiGenerating(true);

    // Add prompt immediately to visual chat history
    const newUserMsg = { sender: 'user', text: userPromptText, timestamp: new Date().toISOString() };
    setSerenaChatHistory(prev => [...prev, newUserMsg]);

    try {
      // 1. Post to search-history log (simulating deep enterprise scans first)
      await scmFetch(`/api/workspaces/${selectedWorkspaceId}/search-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerm: userPromptText,
          source: 'Apollo Intelligence Engine'
        })
      });

      // 2. Call the REAL Serena V2 backend route!
      const res = await scmFetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userPromptText,
          workspaceId: selectedWorkspaceId,
          serenaModule: activeSerenaModule === 'default' ? null : activeSerenaModule
        })
      });

      if (res.ok) {
        const data = await res.json();
        const serenaResponseText = data.reply || "No response received.";
        
        const newAiMsg = { sender: 'serena', text: serenaResponseText, timestamp: new Date().toISOString() };
        setSerenaChatHistory(prev => [...prev, newAiMsg]);

        // 3. Persist this session in DB
        await scmFetch(`/api/workspaces/${selectedWorkspaceId}/ai-conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userPrompt: userPromptText,
            responseText: serenaResponseText,
            modelUsed: 'gemini-3.5-flash',
            tokens: 1500
          })
        });
      } else {
        const errorData = await res.json().catch(() => ({ error: "Server response error." }));
        const errorText = `Error calling Serena backend: ${errorData.error || "Please try again."}`;
        const newAiMsg = { sender: 'serena', text: errorText, timestamp: new Date().toISOString() };
        setSerenaChatHistory(prev => [...prev, newAiMsg]);
      }

      setAiGenerating(false);
      // Refresh details so timeline updates
      await fetchWorkspaceDetail(selectedWorkspaceId);

    } catch (err: any) {
      console.error('Serena inquiry failed:', err);
      const newAiMsg = { sender: 'serena', text: `System communication error: ${err.message || String(err)}`, timestamp: new Date().toISOString() };
      setSerenaChatHistory(prev => [...prev, newAiMsg]);
      setAiGenerating(false);
    }
  };

  // Filter workspaces based on search query
  const filteredWorkspaces = workspacesList.filter(w => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    // Check basic details
    const matchBasic = (w.companyName || '').toLowerCase().includes(query) || 
                       (w.status || '').toLowerCase().includes(query);

    return matchBasic;
  });

  // Check if prospect is already assigned a workspace
  const getEligibleProspects = () => {
    return prospects.filter(p => !workspacesList.some(w => w.prospectId === p.id));
  };

  const eligibleProspects = getEligibleProspects();

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-brand-neutral text-white p-6 rounded-xl border border-slate-800 shadow-lg gap-4">
        <div>
          <span className="text-[10px] text-red-400 font-black uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-red-400" />
            Enterprise Phase 4 Workspace
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">Research & Intelligence Consoles</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            SCM consolidated corporate environments storing deep intelligence profiles, financial proposals, custom timeline feeds, and active CRM integrations.
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-[#b1191f] hover:bg-[#8e1217] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md transition-all self-stretch md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Launch Research Workspace</span>
        </button>
      </div>

      {/* ERROR MSG BANNER */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <span className="font-extrabold block">Security and Directory Warning</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* NOT IN WORKSPACE LIST VIEW */}
      {!selectedWorkspaceId ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* SEARCH & WORKSPACES INDEX LIST */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50/50">
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Workspace Directory</span>
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search workspaces index..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs text-slate-700 bg-transparent placeholder-slate-400 focus:outline-none w-full"
                />
              </div>
            </div>

            {filteredWorkspaces.length === 0 ? (
              <div className="p-16 text-center">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-extrabold text-slate-700">No Corporate Workspaces established</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Corporate workspaces preserve strategic research on institutional prospects. Click "Launch Research Workspace" above to initialize your first environment.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredWorkspaces.map((w) => {
                  const hasDrafts = w.status === 'Active';
                  return (
                    <div 
                      key={w.id} 
                      className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50/70 transition-all gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          <Building2 className="w-5 h-5 text-slate-700" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 tracking-tight">{w.companyName}</h4>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 items-center text-[11px] text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Established: {new Date(w.createdAt).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span className="bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded text-[10px]">
                              ID: {w.id.substring(0, 14)}...
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          w.status === 'Active' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                          w.status === 'Archived' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                          'bg-slate-100 border-slate-300 text-slate-600'
                        }`}>
                          {w.status}
                        </span>

                        <button
                          onClick={() => setSelectedWorkspaceId(w.id)}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-3.5 py-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>Open Console</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SINGLE DETAILED WORKSPACE VIEW */
        <div className="space-y-6">
          {/* TOP CONSOLE HEADER NAVIGATION BAR */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedWorkspaceId(null)}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800 cursor-pointer"
                title="Back to Directory"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                    Workspace Active Console
                  </span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${
                    activeWorkspaceDetail?.workspace?.status === 'Active' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}>
                    {activeWorkspaceDetail?.workspace?.status || 'Active'}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mt-1">
                  {activeWorkspaceDetail?.workspace?.companyName || 'Loading Research Environment...'}
                </h2>
              </div>
            </div>

            {/* Admin Controls / Actions */}
            <div className="flex flex-wrap gap-2 self-stretch md:self-auto justify-end">
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  onClick={() => handleUpdateStatus('Active')}
                  className={`text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeWorkspaceDetail?.workspace?.status === 'Active' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => handleUpdateStatus('Archived')}
                  className={`text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeWorkspaceDetail?.workspace?.status === 'Archived' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Archive
                </button>
                <button
                  onClick={() => handleUpdateStatus('Closed')}
                  className={`text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                    activeWorkspaceDetail?.workspace?.status === 'Closed' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Close
                </button>
              </div>

              {(currentUser.role === 'Admin' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'Director') && (
                <button
                  onClick={handleDeleteWorkspace}
                  className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                  title="Purge Research Environment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* DETAILED VIEWER BODY COMPONENT */}
          {detailLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-24 text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-primary-brand rounded-full animate-spin mx-auto mb-3"></div>
              <span className="text-xs font-bold text-slate-500 tracking-widest uppercase font-mono animate-pulse">Syncing Intel Files...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* TABS SIDEBAR / NAVIGATION RAIL */}
              <div className="lg:col-span-3 space-y-2">
                {[
                  { id: 'research', label: 'Research Hub', icon: Globe },
                  { id: 'contacts', label: 'Contacts Registry', icon: Users2, count: activeWorkspaceDetail?.contacts?.length },
                  { id: 'meetings', label: 'Executive Meetings', icon: Calendar, count: activeWorkspaceDetail?.meetings?.length },
                  { id: 'notes', label: 'Strategic Notes', icon: FileText, count: activeWorkspaceDetail?.notes?.length },
                  { id: 'tasks', label: 'CRM Action Items', icon: CheckSquare, count: activeWorkspaceDetail?.tasks?.filter((t: any) => !t.isCompleted).length },
                  { id: 'proposals', label: 'Investment Proposals', icon: FileSpreadsheet, count: activeWorkspaceDetail?.proposals?.length },
                  { id: 'presentations', label: 'Presentations Pitch', icon: Paperclip, count: activeWorkspaceDetail?.presentations?.length },
                  { id: 'serena', label: 'Consult Serena AI', icon: Sparkles, highlight: true },
                  { id: 'search-history', label: 'Search Inquiry Logs', icon: History, count: activeWorkspaceDetail?.searchHistory?.length },
                  { id: 'timeline', label: 'Audited Timeline Feed', icon: Clock }
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border text-left cursor-pointer ${
                        isActive
                          ? 'bg-[#b1191f] text-white border-red-700 shadow-md font-black'
                          : t.highlight
                          ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{t.label}</span>
                      </div>
                      {t.count !== undefined && t.count > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${isActive ? 'bg-red-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ACTIVE TAB FRAME VIEWPORT */}
              <div className="lg:col-span-9 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                {/* RESEARCH HUB */}
                {activeTab === 'research' && (
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Enterprise Intelligence Hub</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Deep profile information synchronized with external search aggregations.</p>
                      </div>
                      {!isEditingResearch ? (
                        <button
                          onClick={() => setIsEditingResearch(true)}
                          className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Sections</span>
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsEditingResearch(false)}
                            className="border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveResearch}
                            className="bg-[#b1191f] hover:bg-[#8e1217] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Profiles</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { key: 'companyProfile', label: 'Company Profile Overview', placeholder: 'Enter institutional background, target size, and strategic operations.' },
                        { key: 'industryAnalysis', label: 'Market & Industry Dynamics', placeholder: 'Competitor indexing, sector tailwinds, and macro indicators.' },
                        { key: 'apolloFindings', label: 'Apollo Search Data Scraping', placeholder: 'Verified corporate registries, headcount stats, or verified contacts.' },
                        { key: 'executiveInsights', label: 'Executive Stakeholder Insights', placeholder: 'Decision-maker biases, wealth thresholds, and prior holdings.' },
                        { key: 'investmentOpportunities', label: 'Target Asset Suitability', placeholder: 'SCM funds alignment: Money Market Fund vs SKIP Structures.' },
                        { key: 'researchSummaries', label: 'Executive Executive Summary', placeholder: 'Brief high-level summary suitable for director reviews.' }
                      ].map((item) => (
                        <div key={item.key} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80 space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{item.label}</span>
                          {isEditingResearch ? (
                            <textarea
                              value={researchFields[item.key as keyof typeof researchFields]}
                              onChange={(e) => setResearchFields(prev => ({ ...prev, [item.key]: e.target.value }))}
                              placeholder={item.placeholder}
                              className="w-full h-32 p-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          ) : (
                            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed min-h-16">
                              {activeWorkspaceDetail?.workspace?.[item.key] || <span className="text-slate-400 italic">No entry completed. Click edit above to add details.</span>}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CONTACTS REGISTRY */}
                {activeTab === 'contacts' && (
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Stakeholder Directory</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Verified contacts and key executive decision makers.</p>
                      </div>
                    </div>

                    {activeWorkspaceDetail?.contacts?.length === 0 ? (
                      <div className="text-center py-12">
                        <Users2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <span className="text-xs font-bold text-slate-500">No executives added to this portfolio</span>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">Add key stakeholder details in the core CRM contacts tab.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeWorkspaceDetail.contacts.map((c: any) => (
                          <div key={c.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2 flex flex-col justify-between">
                            <div>
                              <span className="text-xs font-extrabold text-slate-800 block">{c.fullName}</span>
                              <span className="text-[10px] text-slate-500 block font-medium mt-0.5">{c.position}</span>
                              <div className="text-[11px] text-slate-500 mt-2 space-y-1 font-mono">
                                <span className="block">📧 {c.email || 'N/A'}</span>
                                <span className="block">📞 {c.phone || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* EXECUTIVE MEETINGS */}
                {activeTab === 'meetings' && (
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Executive Meetings</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Historical interactions and scheduled advisory sessions.</p>
                      </div>
                    </div>

                    {activeWorkspaceDetail?.meetings?.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <span className="text-xs font-bold text-slate-500">No meetings logged</span>
                        <p className="text-[11px] text-slate-400 mt-1">Schedule key engagements inside the Calendar or CRM module.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeWorkspaceDetail.meetings.map((m: any) => (
                          <div key={m.id} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                              <span className="text-xs font-extrabold text-slate-800 block">{m.purpose || 'Institutional Introduction'}</span>
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                                <span className="font-bold">📅 {m.date} | ⏰ {m.time}</span>
                                <span>•</span>
                                <span>Officer: {m.officerName || 'Advisory Team'}</span>
                              </div>
                            </div>
                            <span className="bg-slate-100 text-slate-700 font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded">
                              Outcome: {m.outcome || 'Awaiting update'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* STRATEGIC NOTES SUB-MODULE */}
                {activeTab === 'notes' && (
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Strategic Notes Folder</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Persistent notes linked to this workspace. Private vs Admin-visible.</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingNoteId(null);
                          setNoteTitle('');
                          setNoteContent('');
                          setNoteVisibility('private');
                          setNoteFormOpen(true);
                        }}
                        className="bg-[#b1191f] hover:bg-[#8e1217] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Note</span>
                      </button>
                    </div>

                    {/* NOTE WRITING BOX OVERLAY */}
                    {noteFormOpen && (
                      <form onSubmit={handleSaveNote} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                            {editingNoteId ? 'Edit Strategic Note' : 'Draft New Strategic Note'}
                          </span>
                          <button type="button" onClick={() => setNoteFormOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <input
                            type="text"
                            placeholder="Note Title..."
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                            className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                            required
                          />
                          <textarea
                            placeholder="Type note intelligence contents here..."
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            className="w-full h-28 p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                            required
                          />
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Visibility:</span>
                            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="noteVisibility"
                                value="private"
                                checked={noteVisibility === 'private'}
                                onChange={() => setNoteVisibility('private')}
                                className="text-[#b1191f] focus:ring-0"
                              />
                              <span>Private (Owner & Admin only)</span>
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="noteVisibility"
                                value="public"
                                checked={noteVisibility === 'public'}
                                onChange={() => setNoteVisibility('public')}
                                className="text-[#b1191f] focus:ring-0"
                              />
                              <span>Public (All Platform Users)</span>
                            </label>
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="bg-[#b1191f] text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
                        >
                          Save Strategic Note
                        </button>
                      </form>
                    )}

                    {activeWorkspaceDetail?.notes?.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <span className="text-xs font-bold text-slate-500">No notes established for this workspace</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeWorkspaceDetail.notes.map((n: any) => (
                          <div key={n.id} className={`p-4 rounded-xl border bg-white space-y-3 shadow-sm ${n.isPinned ? 'border-amber-300' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  {n.isPinned && <span className="bg-amber-150 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-amber-300 flex items-center gap-0.5">⭐ Pinned</span>}
                                  <span className="text-xs font-extrabold text-slate-800">{n.title}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                                  📅 {new Date(n.createdAt).toLocaleString()} | Visibility: <span className="font-bold uppercase text-slate-500">{n.visibility}</span>
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button onClick={() => handleTogglePinNote(n.id)} className="p-1 rounded hover:bg-slate-50 border border-slate-100 text-slate-500 cursor-pointer" title="Pin Note">
                                  <Pin className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleToggleArchiveNote(n.id)} className="p-1 rounded hover:bg-slate-50 border border-slate-100 text-slate-500 cursor-pointer" title="Archive Note">
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingNoteId(n.id);
                                    setNoteTitle(n.title);
                                    setNoteContent(n.content);
                                    setNoteVisibility(n.visibility || 'private');
                                    setNoteFormOpen(true);
                                  }}
                                  className="p-1 rounded hover:bg-slate-50 border border-slate-100 text-slate-500 cursor-pointer"
                                  title="Edit Note"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteNote(n.id)} className="p-1 rounded hover:bg-red-50 border border-slate-100 text-red-600 cursor-pointer" title="Delete Note">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TASKS SUB-MODULE */}
                {activeTab === 'tasks' && (
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">CRM Actions Checklist</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Tasks and follow-ups assigned for this prospect portfolio.</p>
                      </div>
                    </div>

                    {activeWorkspaceDetail?.tasks?.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <span className="text-xs font-bold text-slate-500">No pipeline tasks registered</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeWorkspaceDetail.tasks.map((t: any) => (
                          <div key={t.id} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex justify-between items-center gap-3">
                            <div className="flex items-center gap-3">
                              <span className={`p-1.5 rounded-full ${t.isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                <Check className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <span className={`text-xs font-bold block ${t.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.title}</span>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Staff: {t.assignedStaff}</span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded ${t.isCompleted ? 'bg-slate-150 text-slate-600' : 'bg-red-50 text-[#b1191f]'}`}>
                              {t.isCompleted ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* PROPOSALS BUILDER */}
                {activeTab === 'proposals' && (
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">SCM Capital Investment Proposals</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Institutional proposal templates and drafts generated.</p>
                      </div>
                      <button
                        onClick={() => {
                          setProposalTitle('');
                          setProposalContent('');
                          setProposalVersion('1.0');
                          setProposalModalOpen(true);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Draft Investment Proposal</span>
                      </button>
                    </div>

                    {/* PROPOSAL FORM BANNER */}
                    {proposalModalOpen && (
                      <form onSubmit={handleCreateProposal} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">New Portfolio Proposal</span>
                          <button type="button" onClick={() => setProposalModalOpen(false)} className="text-slate-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="Proposal Title (e.g. SCM Cash Reserve Optimization)..."
                              value={proposalTitle}
                              onChange={(e) => setProposalTitle(e.target.value)}
                              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Version (e.g. 1.0)..."
                              value={proposalVersion}
                              onChange={(e) => setProposalVersion(e.target.value)}
                              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                              required
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <textarea
                              placeholder="Explain core terms, asset allocation percentages, and targeted annual percentage yield (APY) returns..."
                              value={proposalContent}
                              onChange={(e) => setProposalContent(e.target.value)}
                              className="w-full h-36 p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                              required
                            />
                          </div>
                        </div>
                        <button type="submit" className="bg-[#b1191f] text-white text-xs font-bold px-4 py-2 rounded-lg">
                          Publish Proposal Draft
                        </button>
                      </form>
                    )}

                    {activeWorkspaceDetail?.proposals?.length === 0 ? (
                      <div className="text-center py-12">
                        <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <span className="text-xs font-bold text-slate-500">No corporate proposals established</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeWorkspaceDetail.proposals.map((p: any) => (
                          <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-xs font-black text-slate-800">{p.title}</span>
                                <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Version: {p.version} | Published: {new Date(p.createdAt).toLocaleDateString()}</span>
                              </div>
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                                {p.approvalStatus}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono leading-relaxed text-[11px]">{p.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* PRESENTATIONS COLLATERAL */}
                {activeTab === 'presentations' && (
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Corporate Presentations</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Collateral and verified pitch decks linked to this research account.</p>
                      </div>
                      <button
                        onClick={() => {
                          setPresentationTitle('');
                          setPresentationType('Client Pitch Deck');
                          setPresentationContent('');
                          setPresentationModalOpen(true);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Log Corporate Collateral</span>
                      </button>
                    </div>

                    {/* PRESENTATION MODAL FORM */}
                    {presentationModalOpen && (
                      <form onSubmit={handleUploadPresentation} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Log Collateral Materials</span>
                          <button type="button" onClick={() => setPresentationModalOpen(false)} className="text-slate-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="Material Title (e.g. SCM Wealth Advisory Brochure)..."
                              value={presentationTitle}
                              onChange={(e) => setPresentationTitle(e.target.value)}
                              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                              required
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <select
                              value={presentationType}
                              onChange={(e) => setPresentationType(e.target.value)}
                              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                            >
                              <option value="Client Pitch Deck">Client Pitch Deck</option>
                              <option value="Product Factsheet">Product Factsheet</option>
                              <option value="Wealth Management Guide">Wealth Management Guide</option>
                              <option value="Corporate Profile PDF">Corporate Profile PDF</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="External reference link or summary details..."
                              value={presentationContent}
                              onChange={(e) => setPresentationContent(e.target.value)}
                              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                            />
                          </div>
                        </div>
                        <button type="submit" className="bg-[#b1191f] text-white text-xs font-bold px-4 py-2 rounded-lg">
                          Log Pitch Material
                        </button>
                      </form>
                    )}

                    {activeWorkspaceDetail?.presentations?.length === 0 ? (
                      <div className="text-center py-12">
                        <Paperclip className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <span className="text-xs font-bold text-slate-500">No presentation collateral logged</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeWorkspaceDetail.presentations.map((pr: any) => (
                          <div key={pr.id} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className="p-2 rounded-lg bg-slate-200 text-slate-700">
                                <FileUp className="w-4 h-4" />
                              </span>
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">{pr.title}</span>
                                <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Format: {pr.type}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">📅 {new Date(pr.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SERENA AI ASSISTANT INQUIRY BOX */}
                {activeTab === 'serena' && (
                  <div className="flex flex-col h-[580px]">
                    <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#b1191f] animate-pulse" />
                        <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Serena Advisory Intelligence V2</span>
                      </div>
                      <span className="text-[9px] bg-red-100 text-[#b1191f] font-extrabold px-2 py-0.5 rounded">ONLINE</span>
                    </div>

                    {/* V2 Agent Role Selector */}
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1.5 shrink-0">
                      {[
                        { id: 'research', label: 'Research Analyst', desc: 'Credit risk & macro' },
                        { id: 'proposal', label: 'Proposal Writer', desc: 'Draft SKIP proposals' },
                        { id: 'email', label: 'Email Writer', desc: 'Outreach emails' },
                        { id: 'meeting', label: 'Meeting Brief', desc: 'Talking points & objections' },
                        { id: 'followup', label: 'Follow-Up Advisor', desc: 'Task scheduler' },
                        { id: 'default', label: 'General Chat', desc: 'Portfolio Q&A' }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setActiveSerenaModule(m.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-tight transition-all border cursor-pointer ${
                            activeSerenaModule === m.id
                              ? 'bg-red-700 text-white border-red-800 shadow-sm'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                          title={m.desc}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Chat Messages Frame */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {serenaChatHistory.length === 0 && (
                        <div className="text-center py-12 px-4 space-y-3">
                          <Sparkles className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
                          <h4 className="text-sm font-black text-slate-800">Inquire Serena Workspace Brain</h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                            Serena is operating in <span className="font-extrabold text-[#b1191f] uppercase">{activeSerenaModule}</span> mode. She will automatically inject the full workspace context (proposals, contacts, notes, and metrics) to fulfill your query.
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center pt-2">
                            {activeSerenaModule === 'research' && [
                              'Provide a detailed sector & macro risk analysis',
                              'Analyze our competitor positioning in this space',
                              'Draft a comprehensive firm overview'
                            ].map((sample) => (
                              <button
                                key={sample}
                                onClick={() => setSerenaPrompt(sample)}
                                className="text-[10px] bg-slate-100 border border-slate-200 hover:bg-slate-200/60 font-bold text-slate-600 px-2.5 py-1.5 rounded-lg transition-all"
                              >
                                {sample}
                              </button>
                            ))}
                            {activeSerenaModule === 'proposal' && [
                              'Draft a SKIP placement proposal with customized interest rates',
                              'Draft an institutional corporate fund proposal',
                              'How do SCM yields fit their corporate buffers?'
                            ].map((sample) => (
                              <button
                                key={sample}
                                onClick={() => setSerenaPrompt(sample)}
                                className="text-[10px] bg-slate-100 border border-slate-200 hover:bg-slate-200/60 font-bold text-slate-600 px-2.5 py-1.5 rounded-lg transition-all"
                              >
                                {sample}
                              </button>
                            ))}
                            {activeSerenaModule === 'email' && [
                              'Draft a personalized outreach email for the CFO',
                              'Write a pension briefing invitation for HR',
                              'Draft a corporate wealth management placement pitch'
                            ].map((sample) => (
                              <button
                                key={sample}
                                onClick={() => setSerenaPrompt(sample)}
                                className="text-[10px] bg-slate-100 border border-slate-200 hover:bg-slate-200/60 font-bold text-slate-600 px-2.5 py-1.5 rounded-lg transition-all"
                              >
                                {sample}
                              </button>
                            ))}
                            {activeSerenaModule === 'meeting' && [
                              'Synthesize past touchpoints and construct a meeting briefing',
                              'Draft talking points for our upcoming executive briefing',
                              'Provide objection-handling guidelines for this account'
                            ].map((sample) => (
                              <button
                                key={sample}
                                onClick={() => setSerenaPrompt(sample)}
                                className="text-[10px] bg-slate-100 border border-slate-200 hover:bg-slate-200/60 font-bold text-slate-600 px-2.5 py-1.5 rounded-lg transition-all"
                              >
                                {sample}
                              </button>
                            ))}
                            {activeSerenaModule === 'followup' && [
                              'Recommend next tasks and follow-up timeline',
                              'Check meeting outcomes and suggest task assignments',
                              'Draft a follow-up action plan'
                            ].map((sample) => (
                              <button
                                key={sample}
                                onClick={() => setSerenaPrompt(sample)}
                                className="text-[10px] bg-slate-100 border border-slate-200 hover:bg-slate-200/60 font-bold text-slate-600 px-2.5 py-1.5 rounded-lg transition-all"
                              >
                                {sample}
                              </button>
                            ))}
                            {activeSerenaModule === 'default' && [
                              'Draft a pitch letter for SCM Money Market Fund',
                              'Analyze this firm\'s investment opportunities',
                              'What are recommended SKIP allocations?'
                            ].map((sample) => (
                              <button
                                key={sample}
                                onClick={() => setSerenaPrompt(sample)}
                                className="text-[10px] bg-slate-100 border border-slate-200 hover:bg-slate-200/60 font-bold text-slate-600 px-2.5 py-1.5 rounded-lg transition-all"
                              >
                                {sample}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {serenaChatHistory.map((chat, idx) => (
                        <div key={idx} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-xl p-4.5 text-xs shadow-sm ${
                            chat.sender === 'user'
                              ? 'bg-slate-900 text-white font-medium'
                              : 'bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed font-sans whitespace-pre-wrap'
                          }`}>
                            <span className="text-[9px] uppercase tracking-wider block mb-1 font-bold opacity-60">
                              {chat.sender === 'user' ? 'Relationship Officer' : 'Serena AI Assistant'}
                            </span>
                            <span>{chat.text}</span>
                          </div>
                        </div>
                      ))}

                      {aiGenerating && (
                        <div className="flex justify-start">
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase font-mono pl-1 animate-pulse">Scanning Workspace Context...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleConsultSerena} className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex gap-2">
                      <input
                        type="text"
                        placeholder={`Ask Serena ${activeSerenaModule} to compile corporate briefings, write pitches, or construct proposals...`}
                        value={serenaPrompt}
                        onChange={(e) => setSerenaPrompt(e.target.value)}
                        className="flex-1 p-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
                        disabled={aiGenerating}
                        required
                      />
                      <button
                        type="submit"
                        className="bg-[#b1191f] hover:bg-[#8e1217] text-white p-3 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
                        disabled={aiGenerating}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}

                {/* SEARCH INQUIRY LOGS */}
                {activeTab === 'search-history' && (
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Serena Search Analytics</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Audited searches performed by Relationship Officers on this workspace profile.</p>
                      </div>
                    </div>

                    {activeWorkspaceDetail?.searchHistory?.length === 0 ? (
                      <div className="text-center py-12">
                        <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <span className="text-xs font-bold text-slate-500">No searches tracked yet</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeWorkspaceDetail.searchHistory.map((s: any) => (
                          <div key={s.id} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                              <span className="text-xs font-bold text-slate-800">"{s.searchTerm}"</span>
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                                <span>Source: {s.source}</span>
                                <span>•</span>
                                <span>API: {s.tokens ? `${s.tokens} tokens` : 'Standard Query'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <span className="text-[10px] text-slate-400 font-mono">📅 {new Date(s.createdAt).toLocaleString()}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSerenaPrompt(s.searchTerm);
                                  setActiveTab('serena');
                                }}
                                className="bg-[#b1191f] hover:bg-[#8e1217] text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                              >
                                <Search className="w-3 h-3" />
                                <span>Reopen Search</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* AUDITED TIMELINE FEED */}
                {activeTab === 'timeline' && (
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Workspace Activity Timeline</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Chronological audit ledger capturing research additions and portfolio status changes.</p>
                      </div>
                    </div>

                    {activeWorkspaceDetail?.timeline?.length === 0 ? (
                      <div className="text-center py-12">
                        <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <span className="text-xs font-bold text-slate-500">Timeline is currently clean</span>
                      </div>
                    ) : (
                      <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
                        {activeWorkspaceDetail.timeline.map((item: any) => (
                          <div key={item.id} className="relative">
                            {/* Bullet Circle icon */}
                            <span className="absolute -left-[31px] top-0.5 bg-white border border-slate-300 p-1 rounded-full text-slate-600">
                              <span className="block w-1.5 h-1.5 bg-[#b1191f] rounded-full animate-pulse"></span>
                            </span>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800">{item.title}</span>
                                <span className="bg-slate-100 text-slate-600 font-extrabold text-[9px] px-1.5 py-0.2 rounded border border-slate-200">
                                  {item.type}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium">{item.description}</p>
                              <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                                <span>📅 {new Date(item.timestamp).toLocaleString()}</span>
                                <span>•</span>
                                <span>Executed by: {item.user}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE WORKSPACE MODAL OVERLAY */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-950/45 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Initialize SCM Workspace</span>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkspace} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Select CRM Prospect</label>
                {eligibleProspects.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg italic">
                    All currently registered prospects have active research workspaces. Create more prospects in the Prospects tab first.
                  </div>
                ) : (
                  <select
                    value={selectedProspectId}
                    onChange={(e) => setSelectedProspectId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Corporate Prospect --</option>
                    {eligibleProspects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.companyName || p.name} ({p.industry || 'Unknown Sector'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {eligibleProspects.length > 0 && (
                <button
                  type="submit"
                  className="w-full bg-[#b1191f] hover:bg-[#8e1217] text-white text-xs font-bold py-2.5 rounded-lg shadow transition-all cursor-pointer"
                >
                  Confirm and Establish Workspace
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
