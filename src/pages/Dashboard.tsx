import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Inbox, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight, 
  Clock, 
  Sparkles,
  ArrowUpRight,
  Target,
  Search,
  PlusCircle,
  FileText,
  ShieldCheck,
  Zap,
  HelpCircle,
  Plus,
  PlayCircle,
  Phone,
  Mail,
  Users2,
  CheckSquare
} from 'lucide-react';
import { Prospect, Contact, Activity, Meeting, DashboardMetrics, Task } from '../types';

interface DashboardProps {
  metrics: DashboardMetrics;
  prospects: Prospect[];
  activities: Activity[];
  meetings: Meeting[];
  tasks: Task[];
  setActiveTab: (tab: string) => void;
  onStartOnboarding: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  metrics,
  prospects,
  activities,
  meetings,
  tasks,
  setActiveTab,
  onStartOnboarding
}) => {
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');

  // Format Currency to Naira
  const formatNaira = (num: number) => {
    if (num >= 1000000000) {
      return `₦${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `₦${(num / 1000000).toFixed(1)}M`;
    }
    return `₦${num.toLocaleString()}`;
  };

  // 1. Calculate Bento Card statistics
  const totalProspectsCount = prospects.length;
  const activeOppsCount = prospects.filter(p => !['Converted', 'Lost', 'Archived'].includes(p.status)).length;
  const meetingsCount = meetings.length;
  const completedTasksCount = tasks.filter(t => t.status === 'Completed' || t.isCompleted).length;
  const pendingTasksCount = tasks.length - completedTasksCount;

  // 2. Identify Meetings Scheduled for Today (or fallback to nearest upcoming)
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMeetings = meetings.filter(m => m.date === todayStr);
  const displayMeetings = todayMeetings.length > 0 
    ? todayMeetings 
    : [...meetings].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

  // 3. Follow-Ups Due (Call/Email channel tasks that are pending or overdue)
  const displayFollowups = tasks
    .filter(t => (t.taskType === 'Call' || t.taskType === 'Email' || t.taskType === 'Visit') && t.status !== 'Completed')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);

  // 4. Pending Advisor Tasks (not completed)
  const activePendingTasks = tasks
    .filter(t => t.status !== 'Completed' && !t.isCompleted)
    .sort((a,b) => b.priority.localeCompare(a.priority))
    .slice(0, 3);

  // 5. Recently Added SCM Prospects
  const recentlyAddedProspects = [...prospects]
    .slice(-4)
    .reverse();

  // Phase 7: Dynamic AI Business Development Recommendations
  const getDynamicRecommendations = () => {
    const activeProspects = prospects.filter(p => p.status !== 'Converted' && p.status !== 'Lost');
    if (activeProspects.length === 0) {
      return [
        {
          id: "rec-empty-1",
          targetName: "Enterprise Research Needed",
          title: "Build SCM Pipeline Portfolio",
          rationale: "There are currently no active corporate prospects registered in the SCM CRM database. Head to the Research Desk to search and verify candidate organizations.",
          recommendedAction: "Search Corporate Targets",
          potentialAum: 0,
          priority: "CRITICAL"
        }
      ];
    }

    return activeProspects.map((p, index) => {
      let actionTitle = "SCM Corporate Money Market Fund";
      let actionName = "Pitch Money Market Fund";
      let description = `Our pipeline assessment ranks ${p.name} as highly suited for SCM Treasury placements with an opportunity score of ${p.opportunityScore || 80}%.`;
      
      const lowerInd = p.industry.toLowerCase();
      if (lowerInd.includes('telecom') || lowerInd.includes('finance') || p.opportunityValue > 500000000) {
        actionTitle = "SCM Commercial Paper Yield Placement";
        actionName = "Present Treasury Solutions";
        description = `As a high-scale operator in ${p.industry}, ${p.name}'s finance division holds significant daily settlement floats. Establishing a high-yield SCM treasury match secures optimal capital preservation.`;
      } else if (lowerInd.includes('manufacturing') || lowerInd.includes('energy') || lowerInd.includes('oil')) {
        actionTitle = "SCM Discretionary Private Trust Suite";
        actionName = "Pitch Private Trust";
        description = `${p.name} holds high-value executive assets. Engaging senior board directors with discrete estate trusts and corporate portfolio options guarantees elite retention.`;
      } else {
        actionTitle = "Staff Wealth Literacy Campaigns";
        actionName = "Propose Staff briefings";
        description = `${p.name} operates in the ${p.industry} sector. Offering customized SCM staff financial literacy seminars creates corporate affinity and streams recurring retail assets.`;
      }

      return {
        id: `rec-dynamic-${p.id || index}`,
        targetName: p.name,
        title: actionTitle,
        rationale: description,
        recommendedAction: actionName,
        potentialAum: p.opportunityValue,
        priority: p.opportunityScore > 90 ? "CRITICAL" : p.opportunityScore > 75 ? "HIGH" : "MEDIUM"
      };
    }).slice(0, 2);
  };

  const aiRecommendations = getDynamicRecommendations();

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between border border-red-900/40">
        <div className="relative z-10 max-w-xl text-left">
          <div className="flex items-center gap-2 text-red-400 font-bold tracking-widest text-[9px] uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Sector Lead Advisory Workspace
          </div>
          <h2 className="font-display font-bold text-lg sm:text-2xl mt-1 leading-tight tracking-tight">
            Asset Management Division
          </h2>
          <p className="text-xs text-slate-350 mt-1.5 leading-relaxed font-medium">
            Strategic prospecting pipeline, institutional money market matching, treasury solutions, and executive corporate relationships.
          </p>
        </div>
        <div className="relative z-10 flex gap-2.5 mt-4 md:mt-0 select-none shrink-0">
          <button
            onClick={onStartOnboarding}
            className="bg-transparent hover:bg-white/10 text-white border border-white/20 font-bold text-[11px] px-3.5 py-2 rounded-lg transition-all"
          >
            Guided Onboarding
          </button>
          <button
            onClick={() => setActiveTab('intelligence')}
            className="bg-[#b1191f] hover:bg-[#921419] text-white font-black text-[11px] px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-black/30"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse fill-amber-300" /> AI Target Finder
          </button>
        </div>
        {/* Subtle decorative background blur */}
        <div className="absolute top-1/2 right-10 -translate-y-1/2 w-48 h-48 bg-red-650 opacity-10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* 2. SCM Metric Stats Bento Header row */}
      <div id="scm-dashboard-stats-strip" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Active Roster Targets", val: totalProspectsCount, desc: "Seeded SCM prospects", icon: Building2, col: "text-red-600 bg-red-50" },
          { title: "Institutional Pipelines", val: activeOppsCount, desc: "Under negotiations", icon: Target, col: "text-blue-500 bg-blue-50" },
          { title: "Scheduled Corporate Briefings", val: meetingsCount, desc: "On active calendar", icon: Calendar, col: "text-[#b1191f] bg-red-50" },
          { title: "Client Advisor Tasks", val: `${completedTasksCount}/${tasks.length}`, desc: `${pendingTasksCount} pending action tasks`, icon: CheckSquare, col: "text-emerald-600 bg-emerald-50" }
        ].map((c, i) => (
          <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex items-start gap-4 text-left">
            <div className={`p-3 rounded-xl shrink-0 ${c.col}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{c.title}</span>
              <span className="font-display font-extrabold text-lg sm:text-2xl text-brand-neutral/90 block mt-1">{c.val}</span>
              <span className="text-[10.5px] text-slate-500 font-semibold block mt-0.5">{c.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Core Bento Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bento Column 1: Meetings & Quick Actions */}
        <div className="space-y-6 lg:col-span-2">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Widget 1: Meetings Today / Incoming */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-display font-bold text-brand-neutral text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#b1191f]" /> Corporate Briefings Today
                  </h3>
                  {todayMeetings.length > 0 && <span className="bg-[#b1191f] text-white font-extrabold text-[8.5px] px-1.5 py-0.5 rounded uppercase animate-pulse">TODAY</span>}
                </div>

                <div className="space-y-3.5">
                  {displayMeetings.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                      <p className="font-semibold text-xs text-slate-650">No scheduled briefings</p>
                      <p className="text-[10px] text-slate-400">All calendar operations cleared.</p>
                    </div>
                  ) : (
                    displayMeetings.map((m, idx) => {
                      const now = new Date();
                      const meetingTime = new Date(`${m.date}T${m.time}`);
                      const diffMs = meetingTime.getTime() - now.getTime();
                      const diffMins = Math.round(diffMs / 60000);
                      const duration = m.durationMinutes || 60;

                      let statusLabel = 'Scheduled';
                      let statusBg = 'bg-blue-50 text-blue-700 border-blue-200';
                      let timeRemaining = '';

                      if (diffMins > 0) {
                        statusLabel = 'Scheduled';
                        statusBg = 'bg-blue-50 text-blue-700 border-blue-200';
                        if (diffMins >= 1440) {
                          const days = Math.floor(diffMins / 1440);
                          timeRemaining = `${days}d remaining`;
                        } else if (diffMins >= 60) {
                          const hours = Math.floor(diffMins / 60);
                          const remainingMins = diffMins % 60;
                          timeRemaining = `${hours}h ${remainingMins}m until start`;
                        } else {
                          timeRemaining = `${diffMins} mins until start`;
                        }
                      } else if (Math.abs(diffMins) <= duration) {
                        statusLabel = 'In Progress';
                        statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-250 animate-pulse font-bold';
                        timeRemaining = 'Starting now / In progress';
                      } else {
                        statusLabel = 'Ended';
                        statusBg = 'bg-slate-150 text-slate-500 border-slate-200';
                        const elapsedMins = Math.abs(diffMins);
                        if (elapsedMins >= 1440) {
                          timeRemaining = `${Math.floor(elapsedMins / 1440)}d ago`;
                        } else if (elapsedMins >= 60) {
                          timeRemaining = `${Math.floor(elapsedMins / 60)}h ago`;
                        } else {
                          timeRemaining = `${elapsedMins} mins ago`;
                        }
                      }

                      return (
                        <div key={m.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-150 relative">
                          <div className="flex justify-between items-center gap-1 mb-2">
                            <span className={`text-[8.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${statusBg}`}>
                              {statusLabel}
                            </span>
                            <span className="text-[8.5px] font-bold uppercase tracking-wide bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                              {m.date === todayStr ? 'Today' : m.date}
                            </span>
                          </div>
                          <h4 className="font-bold text-brand-neutral text-xs leading-tight tracking-tight">{m.purpose}</h4>
                          <span className="text-[10.5px] font-bold text-slate-500 block mt-1">{m.prospectName}</span>
                          <div className="flex flex-wrap justify-between items-center mt-2.5 pt-2 border-t border-slate-200/50 text-[9.5px] font-semibold text-slate-405 uppercase tracking-wider select-none gap-2">
                            <div className="flex gap-2 items-center text-slate-400">
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#b1191f]" /> {m.time || '10:00 AM'}</span>
                              <span>•</span>
                              <span className="truncate">Advisor: {m.officerName}</span>
                            </div>
                            <span className="text-[#b1191f] font-extrabold text-[9px] lowercase bg-red-50/70 px-1.5 py-0.5 rounded border border-red-100">
                              {timeRemaining}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <button 
                onClick={() => setActiveTab('calendar')}
                className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wide mt-5"
              >
                Go to Corporate Calendar
              </button>
            </div>

            {/* Widget 2: Follow-ups Due */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-display font-bold text-brand-neutral text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                    <Inbox className="w-4 h-4 text-amber-500" /> Relationship Follow-ups Due
                  </h3>
                  <span className="bg-amber-100/80 text-amber-800 font-extrabold text-[9px] px-2 py-0.5 rounded-full">{displayFollowups.length} DUE</span>
                </div>

                <div className="space-y-3.5">
                  {displayFollowups.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                      <p className="font-semibold text-xs text-slate-650">Follow-up timeline clear</p>
                      <p className="text-[10px] text-slate-400">All advisor pipelines synchronized.</p>
                    </div>
                  ) : (
                    displayFollowups.map((f, idx) => (
                      <div key={f.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                        <div className="flex items-center justify-between mb-1 select-none">
                          <span className="text-[8px] bg-indigo-50 text-indigo-700 font-extrabold uppercase px-1.5 rounded border border-indigo-200">{f.taskType}</span>
                          <span className="text-[9px] font-bold text-slate-400">{f.dueDate}</span>
                        </div>
                        <h4 className="font-bold text-brand-neutral text-xs leading-snug tracking-tight">{f.title}</h4>
                        <span className="text-[10px] text-slate-500 block mt-1.5 font-semibold">Corporate Asset: {f.prospectName}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button 
                onClick={() => setActiveTab('tasks')}
                className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wide mt-5"
              >
                Manage Action Tasks
              </button>
            </div>

          </div>

          {/* Widget 3: Pending Advisor Tasks Pipeline (Full width inside mid grid) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-display font-bold text-brand-neutral text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" /> Active Advisors Deliverables
              </h3>
              <span className="bg-emerald-100 font-bold text-[9px] text-emerald-800 px-2 py-0.5 rounded-full">{pendingTasksCount} Pending</span>
            </div>

            <div className="space-y-3.5">
              {activePendingTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">Deliverable ledger resolved</p>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">All advisor compliance mandates are satisfied.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activePendingTasks.map(t => (
                    <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1 select-none">
                          <span className={`text-[8.5px] font-extrabold px-1.5 rounded uppercase ${
                            t.priority === 'High' ? 'bg-red-50 text-red-650' : 'bg-slate-100 text-slate-650'
                          }`}>{t.priority}</span>
                          <span className="text-[9px] font-bold text-slate-400">{t.dueDate}</span>
                        </div>
                        <h4 className="font-bold text-brand-neutral text-xs leading-tight tracking-tight mt-1 lines-clamp-2">{t.title}</h4>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-500 font-semibold text-left select-none">
                        Advisor: <span className="font-bold text-brand-neutral">{t.assignedStaff}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Quick Actions Panel Panel (Phase 5) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-left">
            <h3 className="font-display font-bold text-brand-neutral text-xs sm:text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-3">
              SCM Instant Work Desk
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 select-none">
              {[
                { label: "New Corporate Target", icon: PlusCircle, tab: "prospects", col: "bg-red-50 hover:bg-red-100 text-[#b1191f] border border-red-200/60" },
                { label: "Book Corporate Briefing", icon: Calendar, tab: "meetings", col: "bg-amber-50 hover:bg-amber-100 text-amber-750 border border-amber-200/60" },
                { label: "Register Core Contact", icon: Users2, tab: "contacts", col: "bg-indigo-50 hover:bg-indigo-100 text-indigo-705 border border-indigo-200/60" },
                { label: "Schedule Advisor Task", icon: CheckSquare, tab: "tasks", col: "bg-emerald-50 hover:bg-emerald-100 text-emerald-755 border border-emerald-200/60" },
                { label: "Log Advisory Activity", icon: FileText, tab: "activities", col: "bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/60" }
              ].map((act, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTab(act.tab)}
                  className={`p-3.5 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer font-bold duration-150 transform hover:-translate-y-0.5 active:translate-y-0 ${act.col}`}
                >
                  <act.icon className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] uppercase font-bold tracking-wide leading-tight">{act.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Bento Column 2: Recently Added Prospects & AI Recommendations */}
        <div className="space-y-6">
          
          {/* Widget 4: Recently Added Prospects */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm text-left flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-display font-bold text-brand-neutral text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-500" /> New Corporate Placements
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold select-none">Real-time</span>
              </div>

              <div className="divide-y divide-slate-100">
                {recentlyAddedProspects.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <CheckCircle className="w-6 h-6 text-emerald-505 mx-auto mb-2" />
                    <p className="font-semibold text-xs text-slate-650">No targets found</p>
                  </div>
                ) : (
                  recentlyAddedProspects.map((p, idx) => (
                    <div key={p.id || idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs font-sans">
                      <div className="min-w-0">
                        <h4 className="font-bold text-brand-neutral text-xs tracking-tight truncate hover:underline cursor-pointer" onClick={() => setActiveTab('prospects')}>
                          {p.name}
                        </h4>
                        <span className="text-[10.5px] text-slate-405 block mt-0.5 font-semibold">Tiers: {p.tier || 'Tier 2'} • Industry: {p.industry}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-800 text-[11px] block">{formatNaira(p.opportunityValue || 0)}</span>
                        <span className="text-[9px] bg-red-50 text-[#b1191f] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5 select-none">{p.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button 
              onClick={() => setActiveTab('prospects')}
              className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wide mt-5"
            >
              Enterprise Targets Directory
            </button>
          </div>

          {/* Widget 5: AI Target Intelligence Recommendations */}
          <div className="bg-gradient-to-br from-slate-900 to-red-955 text-white border border-red-950/40 rounded-2xl p-5 shadow-xl text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-600 opacity-10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 relative z-10">
              <h3 className="font-display font-bold text-xs uppercase tracking-widest flex items-center gap-2 text-red-400">
                <Sparkles className="w-4 h-4 text-red-400 fill-red-400 animate-pulse" /> SCM Sector Targets Briefing
              </h3>
              <span className="text-[8px] bg-red-850 text-white font-extrabold px-1.5 py-0.5 rounded leading-none select-none">ENGINES ONLINE</span>
            </div>

            <div className="space-y-4 relative z-10">
              {aiRecommendations.map((rec) => (
                <div key={rec.id} className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-1 select-none">
                    <span className="text-[9.5px] font-bold text-slate-350 tracking-wide truncate">{rec.targetName}</span>
                    <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded leading-none ${
                      rec.priority === 'CRITICAL' ? 'bg-red-700 text-white' : 'bg-amber-600/50 text-white'
                    }`}>{rec.priority}</span>
                  </div>
                  <h4 className="font-bold text-white text-xs leading-snug tracking-tight">{rec.title}</h4>
                  <p className="text-[10px] text-slate-300 leading-normal font-medium">{rec.rationale}</p>
                  
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-red-400 font-mono font-semibold">{formatNaira(rec.potentialAum)} AUM</span>
                    <button 
                      onClick={() => setActiveTab('intelligence')}
                      className="text-white hover:underline uppercase text-[9px] tracking-wider"
                    >
                      Verify Target
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
