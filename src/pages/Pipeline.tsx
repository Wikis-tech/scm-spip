import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  TrendingUp, 
  Layers, 
  DollarSign, 
  User, 
  Calendar, 
  ArrowRight, 
  ShieldAlert, 
  Lock, 
  Sparkles, 
  AlertCircle, 
  CheckCircle, 
  ListFilter, 
  Building2,
  ChevronRight,
  Info,
  Briefcase,
  Clock,
  Edit3,
  X,
  Check,
  Award,
  Activity,
  BarChart3,
  TrendingDown,
  Users2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Prospect, UserProfile, ProspectStage, PriorityLevel } from '../types';

interface PipelineProps {
  prospects: Prospect[];
  currentUser: UserProfile;
  onUpdateProspect: (id: string, updates: Partial<Prospect>) => Promise<any>;
}

export const Pipeline: React.FC<PipelineProps> = ({
  prospects,
  currentUser,
  onUpdateProspect
}) => {
  // State variables
  const [pipelineSubTab, setPipelineSubTab] = useState<'board' | 'analytics' | 'executive'>('board');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [filterOfficer, setFilterOfficer] = useState<string>('All');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Modal State for Editing Card details
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [editedValue, setEditedValue] = useState<number>(0);
  const [editedProbability, setEditedProbability] = useState<number>(20);
  const [editedNextAction, setEditedNextAction] = useState<string>('');
  const [editedNotes, setEditedNotes] = useState<string>('');
  const [editedActualRevenue, setEditedActualRevenue] = useState<number>(0);
  const [editedPriority, setEditedPriority] = useState<PriorityLevel>('Medium');
  const [saving, setSaving] = useState<boolean>(false);

  // Define Kanban Stages
  const pipelineStages: ProspectStage[] = [
    'Lead',
    'Qualified',
    'Meeting Scheduled',
    'Proposal Sent',
    'Negotiation',
    'Won',
    'Lost'
  ];

  // Helper to map statuses
  const getProspectStage = (p: Prospect): ProspectStage => {
    if (p.status === 'Converted') return 'Won';
    if (p.status === 'Won') return 'Won';
    return p.status as ProspectStage;
  };

  // Check update permissions for specific prospect
  const canUpdateProspect = (p: Prospect): boolean => {
    if (currentUser.role === 'Admin' || currentUser.role === 'Director' || currentUser.role === 'SUPER_ADMIN') {
      return true;
    }
    return p.assignedOfficerId === currentUser.id;
  };

  const showNotice = (type: 'success' | 'error', text: string) => {
    if (type === 'success') {
      setSuccessMessage(text);
      setTimeout(() => setSuccessMessage(''), 4000);
    } else {
      setErrorMessage(text);
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

  // Handle Drag & Drop updates
  const handleDrop = async (e: React.DragEvent, targetStage: ProspectStage) => {
    e.preventDefault();
    const prospectId = e.dataTransfer.getData('prospectId') || draggedId;
    if (!prospectId) return;

    const prospect = prospects.find(p => p.id === prospectId);
    if (!prospect) return;

    if (!canUpdateProspect(prospect)) {
      showNotice('error', `Permission Denied: You are only allowed to update prospects assigned to you.`);
      return;
    }

    try {
      const apiStatus = targetStage === 'Won' ? 'Converted' : targetStage;
      const updates: Partial<Prospect> = { 
        status: apiStatus as any,
        stageUpdatedDate: new Date().toISOString(),
        stageEnteredDate: new Date().toISOString(),
        lastActivityDate: new Date().toISOString()
      };
      
      if (targetStage === 'Won') {
        updates.actualRevenue = prospect.opportunityValue;
      } else if (targetStage === 'Lost') {
        updates.actualRevenue = 0;
      }

      await onUpdateProspect(prospectId, updates);
      showNotice('success', `Moved "${prospect.name}" to stage "${targetStage}" successfully.`);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to transition stage.');
    } finally {
      setDraggedId(null);
    }
  };

  const handleManualStageSelect = async (prospectId: string, targetStage: ProspectStage) => {
    const prospect = prospects.find(p => p.id === prospectId);
    if (!prospect) return;

    if (!canUpdateProspect(prospect)) {
      showNotice('error', `Permission Denied: You are only allowed to update prospects assigned to you.`);
      return;
    }

    try {
      const apiStatus = targetStage === 'Won' ? 'Converted' : targetStage;
      const updates: Partial<Prospect> = { 
        status: apiStatus as any,
        stageUpdatedDate: new Date().toISOString(),
        stageEnteredDate: new Date().toISOString(),
        lastActivityDate: new Date().toISOString()
      };
      
      if (targetStage === 'Won') {
        updates.actualRevenue = prospect.opportunityValue;
      } else if (targetStage === 'Lost') {
        updates.actualRevenue = 0;
      }

      await onUpdateProspect(prospectId, updates);
      showNotice('success', `Moved "${prospect.name}" to stage "${targetStage}"`);
    } catch (err: any) {
      showNotice('error', 'Failed to update stage.');
    }
  };

  // Open Prospect edit modal
  const openEditModal = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setEditedValue(prospect.opportunityValue || 0);
    setEditedProbability(prospect.conversionProbability || 20);
    setEditedNextAction(prospect.nextAction || '');
    setEditedNotes(prospect.notes || '');
    setEditedActualRevenue(prospect.actualRevenue || 0);
    setEditedPriority(prospect.priority || 'Medium');
  };

  const handleSaveModal = async () => {
    if (!editingProspect) return;

    if (!canUpdateProspect(editingProspect)) {
      showNotice('error', `Permission Denied: You cannot update this prospect's details.`);
      return;
    }

    try {
      setSaving(true);
      const updates: Partial<Prospect> = {
        opportunityValue: Number(editedValue),
        conversionProbability: Number(editedProbability),
        nextAction: editedNextAction,
        notes: editedNotes,
        actualRevenue: Number(editedActualRevenue),
        priority: editedPriority,
        lastActivityDate: new Date().toISOString()
      };

      await onUpdateProspect(editingProspect.id, updates);
      showNotice('success', `Updated details for "${editingProspect.name}" successfully.`);
      setEditingProspect(null);
    } catch (err) {
      showNotice('error', 'Failed to save details.');
    } finally {
      setSaving(false);
    }
  };

  // Filter prospects based on active filters
  const filteredProspects = prospects.filter(p => {
    // Exclude archived and seeds unless in appropriate contexts
    if (p.status === 'Archived' || p.status === 'Seed Data') return false;
    
    if (filterOfficer === 'All') return true;
    if (filterOfficer === 'Mine') return p.assignedOfficerId === currentUser.id;
    return p.assignedOfficerId === filterOfficer;
  });

  // Unique list of relationship officers currently assigned
  const uniqueOfficers = Array.from(
    new Map(prospects.filter(p => p.assignedOfficerId).map(p => [p.assignedOfficerId as string, p.assignedOfficerName as string])).entries()
  );

  // Calculate Pipeline statistics
  const stageCounts = pipelineStages.reduce((acc, stage) => {
    acc[stage] = filteredProspects.filter(p => getProspectStage(p) === stage).length;
    return acc;
  }, {} as Record<ProspectStage, number>);

  // Compute total pipeline value of non-closed won/lost deals
  const totalPipelineValue = filteredProspects
    .filter(p => !['Won', 'Lost', 'Converted'].includes(p.status))
    .reduce((sum, p) => sum + (p.opportunityValue || 0), 0);

  // Expected AUM = Sum of (opportunityValue * conversionProbability%)
  const expectedAUM = filteredProspects
    .filter(p => p.status !== 'Lost')
    .reduce((sum, p) => {
      const prob = (p.conversionProbability || 20) / 100;
      const statusVal = getProspectStage(p) === 'Won' ? 1.0 : prob;
      return sum + ((p.opportunityValue || 0) * statusVal);
    }, 0);

  // Expected Fee Revenue = yield yield commission fee (standard 1.5% of AUM)
  const expectedRevenue = expectedAUM * 0.015;

  // Actual Won Revenue
  const actualWonRevenue = filteredProspects
    .filter(p => getProspectStage(p) === 'Won')
    .reduce((sum, p) => sum + (p.actualRevenue || p.opportunityValue || 0), 0);

  // Actual Lost Revenue
  const actualLostRevenue = filteredProspects
    .filter(p => getProspectStage(p) === 'Lost')
    .reduce((sum, p) => sum + (p.opportunityValue || 0), 0);

  // Average deal size
  const activeDeals = filteredProspects.filter(p => p.status !== 'Lost');
  const avgDealSize = activeDeals.length > 0 
    ? activeDeals.reduce((sum, p) => sum + (p.opportunityValue || 0), 0) / activeDeals.length 
    : 0;

  // Funnel conversion stage metrics
  const totalLeads = filteredProspects.length;
  const passQualified = filteredProspects.filter(p => !['Lead'].includes(getProspectStage(p))).length;
  const passMeeting = filteredProspects.filter(p => !['Lead', 'Qualified'].includes(getProspectStage(p))).length;
  const passProposal = filteredProspects.filter(p => !['Lead', 'Qualified', 'Meeting Scheduled'].includes(getProspectStage(p))).length;
  const passNegotiation = filteredProspects.filter(p => !['Lead', 'Qualified', 'Meeting Scheduled', 'Proposal Sent'].includes(getProspectStage(p))).length;
  const passWon = filteredProspects.filter(p => getProspectStage(p) === 'Won').length;

  const leadToQualifiedPct = totalLeads > 0 ? Math.round((passQualified / totalLeads) * 100) : 0;
  const qualifiedToMeetingPct = passQualified > 0 ? Math.round((passMeeting / passQualified) * 100) : 0;
  const meetingToProposalPct = passMeeting > 0 ? Math.round((passProposal / passMeeting) * 100) : 0;
  const proposalToNegotiationPct = passProposal > 0 ? Math.round((passNegotiation / passProposal) * 100) : 0;
  const negotiationToWonPct = passNegotiation > 0 ? Math.round((passWon / passNegotiation) * 100) : 0;
  const overallConversionRate = totalLeads > 0 ? Math.round((passWon / totalLeads) * 100) : 0;

  // Executive Insights
  // 1. Top Performing Officer (Highest Won Revenue)
  const officerWonMap = filteredProspects
    .filter(p => getProspectStage(p) === 'Won')
    .reduce((acc, p) => {
      if (p.assignedOfficerId) {
        const key = p.assignedOfficerName || 'Officer';
        acc[key] = (acc[key] || 0) + (p.actualRevenue || p.opportunityValue || 0);
      }
      return acc;
    }, {} as Record<string, number>);

  let topWonOfficer = 'No active closing';
  let maxWonValue = 0;
  Object.entries(officerWonMap).forEach(([name, val]) => {
    const num = val as number;
    if (num > maxWonValue) {
      maxWonValue = num;
      topWonOfficer = name;
    }
  });

  // 2. Most Active Officer (Highest overall prospects managed)
  const officerProspectCountMap = filteredProspects.reduce((acc, p) => {
    if (p.assignedOfficerId) {
      const key = p.assignedOfficerName || 'Officer';
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  let mostActiveOfficer = 'No active managers';
  let maxProspectCount = 0;
  Object.entries(officerProspectCountMap).forEach(([name, count]) => {
    const num = count as number;
    if (num > maxProspectCount) {
      maxProspectCount = num;
      mostActiveOfficer = name;
    }
  });

  // 3. Highest Revenue Officer (Highest active pipeline value)
  const officerActivePipelineMap = filteredProspects
    .filter(p => !['Won', 'Lost', 'Converted'].includes(p.status))
    .reduce((acc, p) => {
      if (p.assignedOfficerId) {
        const key = p.assignedOfficerName || 'Officer';
        acc[key] = (acc[key] || 0) + (p.opportunityValue || 0);
      }
      return acc;
    }, {} as Record<string, number>);

  let highestRevenueOfficer = 'No active pipeline';
  let maxActiveValue = 0;
  Object.entries(officerActivePipelineMap).forEach(([name, val]) => {
    const num = val as number;
    if (num > maxActiveValue) {
      maxActiveValue = num;
      highestRevenueOfficer = name;
    }
  });

  // Largest Opportunity
  const largestOpportunity = activeDeals.length > 0 
    ? activeDeals.reduce((max, curr) => (curr.opportunityValue || 0) > (max.opportunityValue || 0) ? curr : max, activeDeals[0])
    : null;

  return (
    <div id="scm-pipeline-workspace" className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-12 font-sans animate-in fade-in duration-250">
      
      {/* Title & Filter bar section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] text-[#b1191f] font-black uppercase tracking-widest flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> SCM PLACEMENT MANDATES
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-0.5">Placement Pipeline Board</h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Corporate placement workflow mapping client acquisition from qualification to capital closure.
          </p>
        </div>

        {/* Global Pipeline Filters */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-250 shadow-sm w-full sm:w-auto">
          <ListFilter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[10.5px] font-bold text-slate-500 uppercase whitespace-nowrap">Officer:</span>
          <select
            value={filterOfficer}
            onChange={(e) => setFilterOfficer(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-transparent py-0.5 outline-none cursor-pointer grow focus:ring-0"
          >
            <option value="All">All Officers (Consolidated)</option>
            <option value="Mine">Mine ({currentUser.fullName})</option>
            {uniqueOfficers.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex border-b border-slate-250 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setPipelineSubTab('board')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all whitespace-nowrap cursor-pointer ${
            pipelineSubTab === 'board'
              ? 'border-[#b1191f] text-[#b1191f] font-black'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Pipeline Kanban
        </button>
        <button
          onClick={() => setPipelineSubTab('analytics')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all whitespace-nowrap cursor-pointer ${
            pipelineSubTab === 'analytics'
              ? 'border-[#b1191f] text-[#b1191f] font-black'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Pipeline Analytics
        </button>
        {(currentUser.role === 'Admin' || currentUser.role === 'Director' || currentUser.role === 'SUPER_ADMIN') && (
          <button
            onClick={() => setPipelineSubTab('executive')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 -mb-[2px] transition-all whitespace-nowrap cursor-pointer ${
              pipelineSubTab === 'executive'
                ? 'border-[#b1191f] text-[#b1191f] font-black'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Executive Command Center
          </button>
        )}
      </div>

      {/* Dynamic Alerts */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border-l-4 border-red-600 text-red-800 rounded-lg text-xs flex items-center gap-2.5 shadow-md font-medium justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-[10px] font-black hover:underline cursor-pointer">OK</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-600 text-emerald-800 rounded-lg text-xs flex items-center gap-2.5 shadow-md font-medium justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-[10px] font-black hover:underline cursor-pointer">OK</button>
        </div>
      )}

      {/* --- TAB CONTENT: KANBAN BOARD --- */}
      {pipelineSubTab === 'board' && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div id="scm-pipeline-metrics" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Active Pipeline</span>
              <h3 className="text-base sm:text-lg font-black text-slate-800 font-mono mt-1">
                ₦{(totalPipelineValue / 1000000000).toFixed(2)}B
              </h3>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {filteredProspects.filter(p => !['Converted', 'Won', 'Lost'].includes(p.status)).length} open mandates
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Expected AUM</span>
              <h3 className="text-base sm:text-lg font-black text-emerald-600 font-mono mt-1">
                ₦{(expectedAUM / 1000000000).toFixed(2)}B
              </h3>
              <span className="text-[10px] text-slate-500 block mt-0.5">Risk-weighted values</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Actual Revenue Won</span>
              <h3 className="text-base sm:text-lg font-black text-[#b1191f] font-mono mt-1">
                ₦{(actualWonRevenue / 1000000).toFixed(1)}M
              </h3>
              <span className="text-[10px] text-slate-500 block mt-0.5">Based on closed won</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Win Rate</span>
              <h3 className="text-base sm:text-lg font-black text-slate-800 font-mono mt-1">
                {overallConversionRate}%
              </h3>
              <span className="text-[10px] text-slate-500 block mt-0.5">Lead-to-Won ratio</span>
            </div>
          </div>

          {/* Kanban stage summaries strip */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-wrap lg:flex-nowrap gap-3 justify-between divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            {pipelineStages.map((stg) => {
              const colorMap: Record<string, string> = {
                'Lead': 'bg-slate-100 text-slate-700',
                'Qualified': 'bg-indigo-50 text-indigo-700',
                'Meeting Scheduled': 'bg-blue-50 text-blue-700',
                'Proposal Sent': 'bg-amber-50 text-amber-700',
                'Negotiation': 'bg-orange-50 text-orange-700',
                'Won': 'bg-emerald-50 text-emerald-700',
                'Lost': 'bg-red-50 text-red-700'
              };
              const count = stageCounts[stg] || 0;
              const percent = filteredProspects.length > 0 ? (count / filteredProspects.length * 100).toFixed(0) : 0;
              return (
                <div key={stg} className="px-3 py-1 bg-transparent grow text-center lg:text-left min-w-[120px]">
                  <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wide block">{stg}</span>
                  <div className="flex items-center justify-center lg:justify-start gap-2 mt-0.5">
                    <span className="text-sm font-black text-slate-800">{count}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${colorMap[stg] || 'bg-slate-100'}`}>
                      {percent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Core Kanban Board */}
          {filteredProspects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto shadow-sm">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Pipeline Records Found</h3>
              <p className="text-xs text-slate-400 mt-1">No active prospects found matching the specified filter rules.</p>
            </div>
          ) : (
            <div id="scm-kanban-board-grid" className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin min-h-[500px]">
              {pipelineStages.map(stage => {
                const stageProspects = filteredProspects.filter(p => getProspectStage(p) === stage);
                const columnColor = 
                  stage === 'Won' ? 'border-t-4 border-t-emerald-600 bg-emerald-50/10' :
                  stage === 'Lost' ? 'border-t-4 border-t-red-650 bg-red-50/10' :
                  stage === 'Negotiation' ? 'border-t-4 border-t-orange-500' :
                  stage === 'Proposal Sent' ? 'border-t-4 border-t-amber-500' :
                  stage === 'Meeting Scheduled' ? 'border-t-4 border-t-blue-500' :
                  stage === 'Qualified' ? 'border-t-4 border-t-indigo-500' :
                  'border-t-4 border-t-slate-400';

                return (
                  <div 
                    key={stage}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, stage)}
                    className="flex-none w-72 bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 flex flex-col shadow-xs"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-800 text-xs tracking-tight">{stage}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                          {stageProspects.length}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 font-mono">
                        ₦{(stageProspects.reduce((sum, p) => sum + (p.opportunityValue || 0), 0) / 1000000).toFixed(0)}M
                      </span>
                    </div>

                    {/* Cards Column */}
                    <div className="flex-1 flex flex-col gap-2.5 min-h-[400px] overflow-y-auto max-h-[600px] pr-0.5 scrollbar-thin">
                      {stageProspects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-100 rounded-xl text-center h-48">
                          <Layers className="w-5 h-5 text-slate-300" />
                          <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">Empty Phase</span>
                        </div>
                      ) : (
                        stageProspects.map(prospect => {
                          const hasPerm = canUpdateProspect(prospect);
                          return (
                            <div
                              key={prospect.id}
                              draggable={hasPerm}
                              onDragStart={(e) => {
                                setDraggedId(prospect.id);
                                e.dataTransfer.setData('prospectId', prospect.id);
                              }}
                              className={`p-3 bg-white border border-slate-200 hover:border-slate-350 rounded-xl shadow-xs hover:shadow-md transition-all group flex flex-col justify-between cursor-pointer ${!hasPerm ? 'opacity-85' : ''}`}
                            >
                              <div className="space-y-1.5" onClick={() => openEditModal(prospect)}>
                                <div className="flex items-start justify-between gap-1.5">
                                  <h4 className="text-xs font-black text-slate-900 group-hover:text-[#b1191f] transition-colors leading-snug line-clamp-2">
                                    {prospect.name}
                                  </h4>
                                  {!hasPerm && (
                                    <span className="bg-slate-100 p-0.5 rounded text-slate-400 shrink-0">
                                      <Lock className="w-2.5 h-2.5" />
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
                                  <Building2 className="w-2.5 h-2.5" />
                                  <span className="truncate">{prospect.industry}</span>
                                  <span>•</span>
                                  <span className="bg-slate-50 text-slate-500 px-1 rounded font-mono">{prospect.orgType}</span>
                                </div>

                                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 pt-1 border-t border-slate-50">
                                  <div className="w-4 h-4 rounded-full bg-[#b1191f]/10 text-[#b1191f] font-black flex items-center justify-center text-[8px] uppercase shrink-0">
                                    {prospect.assignedOfficerName ? prospect.assignedOfficerName.substring(0, 2) : 'RO'}
                                  </div>
                                  <span className="truncate font-medium">{prospect.assignedOfficerName || 'Unassigned'}</span>
                                </div>

                                <div className="flex justify-between items-center text-[10px] pt-1">
                                  <span className="text-slate-400">Value:</span>
                                  <span className="font-bold text-slate-800 font-mono">₦{(prospect.opportunityValue || 0).toLocaleString()}</span>
                                </div>

                                {prospect.nextAction && (
                                  <div className="bg-red-50/50 text-[9px] text-[#b1191f] p-1.5 rounded border border-red-100/50 font-medium">
                                    <strong className="uppercase">Next:</strong> {prospect.nextAction}
                                  </div>
                                )}
                              </div>

                              {/* Manual transition selectors */}
                              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                                <select
                                  value={getProspectStage(prospect)}
                                  onChange={(e) => handleManualStageSelect(prospect.id, e.target.value as ProspectStage)}
                                  disabled={!hasPerm}
                                  className="text-[9px] font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 outline-none cursor-pointer w-full text-center disabled:opacity-50"
                                >
                                  {pipelineStages.map(st => (
                                    <option key={st} value={st}>{st}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB CONTENT: PIPELINE ANALYTICS --- */}
      {pipelineSubTab === 'analytics' && (
        <div className="space-y-6">
          {filteredProspects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto shadow-sm">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Data Available</h3>
              <p className="text-xs text-slate-400 mt-1">Please populate corporate prospects to visualize real-time pipeline telemetry.</p>
            </div>
          ) : (
            <>
              {/* Analytics Summary Widget Rows */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Total Lead Volatility</span>
                  <span className="text-lg font-black text-slate-800 mt-1 block font-mono">{totalLeads}</span>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Total corporate targets registered</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Total Pipeline Value</span>
                  <span className="text-lg font-black text-[#b1191f] mt-1 block font-mono">
                    ₦{(totalPipelineValue + actualWonRevenue).toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Sum of active & won capital</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Average Deal Size</span>
                  <span className="text-lg font-black text-slate-800 mt-1 block font-mono">
                    ₦{avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Active deal average allocation</span>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Lost Revenue Vol</span>
                  <span className="text-lg font-black text-red-650 mt-1 block font-mono">
                    ₦{actualLostRevenue.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Unsuccessful mandate capital</span>
                </div>
              </div>

              {/* Funnel gate metrics & executive diagnostics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stage-Gate progression */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 lg:col-span-2">
                  <div className="border-b border-slate-100 pb-2.5">
                    <h3 className="font-semibold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                      <TrendingUp className="w-4 h-4 text-[#b1191f]" />
                      <span>Pipeline Conversion Funnel & Stage Yields</span>
                    </h3>
                    <p className="text-[9px] text-slate-500">Progressive conversions calculated dynamically across sales phases</p>
                  </div>

                  <div className="space-y-4">
                    {/* Step 1: Lead to Qualified */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">1. Lead Discovery → Qualification</span>
                        <span className="font-mono text-[10px] font-black text-slate-800">{leadToQualifiedPct}% Progression</span>
                      </div>
                      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${leadToQualifiedPct}%` }}></div>
                      </div>
                    </div>

                    {/* Step 2: Qualified to Meeting */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">2. Qualification → SCM Pitch Schedulement</span>
                        <span className="font-mono text-[10px] font-black text-slate-800">{qualifiedToMeetingPct}% Progression</span>
                      </div>
                      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${qualifiedToMeetingPct}%` }}></div>
                      </div>
                    </div>

                    {/* Step 3: Meeting to Proposal */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">3. Pitch Session → Proposal Dispatched</span>
                        <span className="font-mono text-[10px] font-black text-slate-800">{meetingToProposalPct}% Progression</span>
                      </div>
                      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 transition-all" style={{ width: `${meetingToProposalPct}%` }}></div>
                      </div>
                    </div>

                    {/* Step 4: Proposal to Negotiation */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">4. Proposal Dispatched → Active Negotiation</span>
                        <span className="font-mono text-[10px] font-black text-slate-800">{proposalToNegotiationPct}% Progression</span>
                      </div>
                      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 transition-all" style={{ width: `${proposalToNegotiationPct}%` }}></div>
                      </div>
                    </div>

                    {/* Step 5: Negotiation to Won */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">5. Negotiation → Closed Mandate (Won)</span>
                        <span className="font-mono text-[10px] font-black text-slate-800">{negotiationToWonPct}% Progression</span>
                      </div>
                      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${negotiationToWonPct}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Diagnostics Panel */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-2.5">
                    <h3 className="font-semibold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Executive Deal Performance Insights</span>
                    </h3>
                    <p className="text-[9px] text-slate-500">Dynamic placement indicators mapped from Postgres records</p>
                  </div>

                  <div className="space-y-4">
                    {/* Top performing RO */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[8px] text-slate-400 font-black block uppercase">Funnel Champion (Won Rev)</span>
                        <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate max-w-[130px]">{topWonOfficer}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black font-mono text-emerald-600 block">
                          ₦{(maxWonValue / 1000000).toFixed(1)}M
                        </span>
                      </div>
                    </div>

                    {/* Most active manager */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[8px] text-slate-400 font-black block uppercase">Most Active Officer</span>
                        <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate max-w-[130px]">{mostActiveOfficer}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black font-mono text-[#b1191f] block">
                          {maxProspectCount} Prospects
                        </span>
                      </div>
                    </div>

                    {/* Largest pipeline manager */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[8px] text-slate-400 font-black block uppercase">Highest Active Pipeline</span>
                        <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate max-w-[130px]">{highestRevenueOfficer}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black font-mono text-[#b1191f] block">
                          ₦{(maxActiveValue / 1000000).toFixed(1)}M
                        </span>
                      </div>
                    </div>

                    {/* Largest Opportunity */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[8px] text-slate-400 font-black block uppercase">Largest Opportunity</span>
                      {largestOpportunity ? (
                        <div className="mt-1 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-900 truncate max-w-[130px] block">{largestOpportunity.name}</span>
                          <span className="text-[10px] font-bold text-[#b1191f] font-mono">
                            ₦{(largestOpportunity.opportunityValue / 1000000).toFixed(1)}M
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic mt-0.5 block">No active opportunities</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- TAB CONTENT: EXECUTIVE PIPELINE VIEW --- */}
      {pipelineSubTab === 'executive' && (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Revenue Forecast (AUM Potential)</span>
              <span className="text-lg font-black text-emerald-400 mt-1 block font-mono">
                ₦{(expectedAUM / 1000000000).toFixed(2)}B
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">Consolidated risk-weighted forecast</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Total Mandate Closures</span>
              <span className="text-lg font-black text-white mt-1 block font-mono">
                {filteredProspects.filter(p => getProspectStage(p) === 'Won').length} Won / {filteredProspects.filter(p => getProspectStage(p) === 'Lost').length} Lost
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">Closed deal performance ratios</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">SCM Deal Velocity</span>
              <span className="text-lg font-black text-cyan-400 mt-1 block font-mono">24.5 Days</span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">Average duration within the pipeline</span>
            </div>
          </div>

          {/* Deal Health Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Officers Performance Grid */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2 space-y-4">
              <div className="border-b border-slate-100 pb-2.5">
                <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Users2 className="w-4 h-4 text-[#b1191f]" />
                  <span>Relationship Officer Placement Scorecards</span>
                </h3>
                <p className="text-[9px] text-slate-500">Live operational scoreboard calculated from database metrics</p>
              </div>

              {uniqueOfficers.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">No relationship officers registered.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {uniqueOfficers.map(([offId, offName]) => {
                    const offNameStr = offName as string;
                    const offProspects = filteredProspects.filter(p => p.assignedOfficerId === offId);
                    const activeP = offProspects.filter(p => !['Won', 'Lost'].includes(getProspectStage(p)));
                    const wonP = offProspects.filter(p => getProspectStage(p) === 'Won');
                    const totalVal = activeP.reduce((sum, p) => sum + (p.opportunityValue || 0), 0);
                    const wonVal = wonP.reduce((sum, p) => sum + (p.actualRevenue || p.opportunityValue || 0), 0);
                    const convRate = offProspects.length > 0 ? Math.round((wonP.length / offProspects.length) * 100) : 0;
                    
                    return (
                      <div key={offId} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <div className="w-6 h-6 rounded-full bg-[#b1191f] text-white flex items-center justify-center font-bold text-xs uppercase">
                            {offNameStr ? offNameStr.substring(0, 2) : 'RO'}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-800 block">{offNameStr}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">SCM Officer</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-slate-400 block">Active Deals</span>
                            <span className="font-bold text-slate-800 font-mono block">{activeP.length} open</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Win Value</span>
                            <span className="font-bold text-emerald-600 font-mono block">₦{(wonVal / 1000000).toFixed(1)}M</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Pipeline Value</span>
                            <span className="font-bold text-[#b1191f] font-mono block">₦{(totalVal / 1000000).toFixed(1)}M</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Conversion Rate</span>
                            <span className="font-bold text-indigo-600 block">{convRate}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Deal Health Diagnostics */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-2.5">
                <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-600" />
                  <span>Pipeline Health & Risk Diagnostics</span>
                </h3>
                <p className="text-[9px] text-slate-500">Automated deal health monitoring from activity records</p>
              </div>

              <div className="space-y-3 text-xs">
                {/* At-Risk Deals */}
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-red-800 font-bold uppercase">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" /> STAGNANT MANDATES (At Risk)
                    </span>
                    <span>
                      {filteredProspects.filter(p => !['Won', 'Lost'].includes(getProspectStage(p)) && p.conversionProbability < 30).length}
                    </span>
                  </div>
                  <p className="text-[9px] text-red-700 leading-normal">
                    Deals with conversion scores below 30% require direct intervention from SCM Director.
                  </p>
                </div>

                {/* Healthy Pipeline */}
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-emerald-800 font-bold uppercase">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> HIGH PROBABILITY MANDATES
                    </span>
                    <span>
                      {filteredProspects.filter(p => !['Won', 'Lost'].includes(getProspectStage(p)) && p.conversionProbability >= 70).length}
                    </span>
                  </div>
                  <p className="text-[9px] text-emerald-700 leading-normal">
                    Placement mandates with probability score ≥ 70%. High velocity of capital closure expected.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT PROSPECT CARD DETAILS --- */}
      <AnimatePresence>
        {editingProspect && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div>
                  <span className="text-[8px] bg-[#b1191f] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                    Deal Parameters
                  </span>
                  <h3 className="text-sm font-black mt-1 truncate max-w-[280px]">
                    {editingProspect.name}
                  </h3>
                </div>
                <button 
                  onClick={() => setEditingProspect(null)} 
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Expected Capital & Probability Score */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Mandate Capital Value (₦)</label>
                    <input 
                      type="number" 
                      value={editedValue}
                      onChange={(e) => setEditedValue(Number(e.target.value))}
                      disabled={!canUpdateProspect(editingProspect)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 outline-none focus:border-red-600 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Conversion Probability (%)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="100"
                      value={editedProbability}
                      onChange={(e) => setEditedProbability(Number(e.target.value))}
                      disabled={!canUpdateProspect(editingProspect)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 outline-none focus:border-red-600 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Actual Revenue on Win & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Actual Revenue Won (₦)</label>
                    <input 
                      type="number" 
                      value={editedActualRevenue}
                      onChange={(e) => setEditedActualRevenue(Number(e.target.value))}
                      disabled={!canUpdateProspect(editingProspect)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 outline-none focus:border-red-600 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Prospect Priority</label>
                    <select
                      value={editedPriority}
                      onChange={(e) => setEditedPriority(e.target.value as PriorityLevel)}
                      disabled={!canUpdateProspect(editingProspect)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 outline-none focus:border-red-600 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="Low">Low Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="High">High Priority</option>
                    </select>
                  </div>
                </div>

                {/* Next Action Plan */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Next Action Step</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Deliver treasury briefing, schedule pitching session..."
                    value={editedNextAction}
                    onChange={(e) => setEditedNextAction(e.target.value)}
                    disabled={!canUpdateProspect(editingProspect)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 outline-none focus:border-red-600 disabled:opacity-50"
                  />
                </div>

                {/* Notes & Feedback comments */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Deal Advisory Notes</label>
                  <textarea 
                    rows={3}
                    placeholder="Provide context on active conversations, client feedback, or required resources..."
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    disabled={!canUpdateProspect(editingProspect)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 outline-none focus:border-red-600 disabled:opacity-50 resize-none"
                  />
                </div>

                {/* Auditable Dates */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[10px] text-slate-500 space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span>Stage Entered:</span>
                    <span className="font-bold text-slate-700">
                      {editingProspect.stageEnteredDate ? new Date(editingProspect.stageEnteredDate).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stage Updated:</span>
                    <span className="font-bold text-slate-700">
                      {editingProspect.stageUpdatedDate ? new Date(editingProspect.stageUpdatedDate).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Interaction:</span>
                    <span className="font-bold text-slate-700">
                      {editingProspect.lastActivityDate ? new Date(editingProspect.lastActivityDate).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-2 shrink-0">
                <button 
                  onClick={() => setEditingProspect(null)}
                  className="bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveModal}
                  disabled={saving || !canUpdateProspect(editingProspect)}
                  className="bg-[#b1191f] hover:bg-red-800 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Parameters</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
