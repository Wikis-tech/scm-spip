import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Users2, 
  Building2, 
  CheckSquare, 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  History, 
  FileSpreadsheet, 
  ShieldAlert, 
  ArrowUpRight, 
  TrendingDown, 
  Percent, 
  CheckCircle2, 
  X, 
  Info,
  ExternalLink,
  ChevronRight,
  PieChart,
  UserCheck,
  Activity,
  UserX,
  FileText,
  UserMinus,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { ExecutiveRecharts } from '../components/analytics/BusinessCharts';

interface ExecutiveSummaryProps {
  currentUser: UserProfile;
}

interface ExecutiveData {
  overview: {
    totalOfficers: number;
    totalActiveProspects: number;
    totalMeetingsHeld: number;
    totalInvestmentsClosed: number;
    totalFundsSecured: number;
    totalReportsSubmitted: number;
  };
  workspaces?: {
    totalWorkspaces: number;
    activeWorkspaces: number;
    archivedWorkspaces: number;
    researchSessionsCount: number;
    proposalsCount: number;
    presentationsCount: number;
  };
  officers: Array<{
    id: string;
    fullName: string;
    role: string;
    prospects: number;
    meetings: number;
    investmentsClosed: number;
    amountSecured: number;
    productsSold: string[];
    lastReportSubmitted: string;
    status: string;
  }>;
  leaderboard: Array<{
    id: string;
    fullName: string;
    amountSecured: number;
    dealsClosed: number;
    conversionRate: number;
  }>;
  products: Array<{
    productName: string;
    investmentsCount: number;
    totalAmount: number;
  }>;
  reports: Array<{
    id: string;
    officerName: string;
    officerEmail: string;
    weekStartDate: string;
    weekEndDate: string;
    submissionDate: string;
    status: string;
    fundsSecured: number;
    prospectsAdded: number;
    meetingsHeld: number;
  }>;
  insights: string[];
  activities: Array<{
    type: 'prospect' | 'meeting' | 'investment' | 'report' | 'user_approved';
    title: string;
    timestamp: string;
    id: string;
    detail: string;
  }>;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ currentUser }) => {
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

  const fetchExecutiveData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/executive-dashboard-summary');

      if (!res.ok) {
        let detail = '';
        try {
          const body = await res.json();
          detail = body?.error ? String(body.error) : '';
        } catch {}
        if (res.status === 401) {
          throw new Error('Your secure session could not be verified. Please sign in again.');
        }
        if (res.status === 403) {
          throw new Error(detail || 'Access denied: administrator privileges are required.');
        }
        if (res.status === 503) {
          throw new Error(detail || 'The executive data service is temporarily unavailable. Your login is still active.');
        }
        throw new Error(detail || 'Failed to load executive summary data from the server.');
      }

      const payload = await res.json();
      setData(payload);
    } catch (err: any) {
      console.error("[EXEC EXECUTIVE FRONTEND] fetch failure:", err);
      setError(err.message || "An unexpected error occurred while fetching reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutiveData();
  }, [currentUser]);

  if (loading) {
    return (
      <div id="exec-summary-loading" className="flex flex-col items-center justify-center p-20 space-y-4 min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-primary-brand rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-500 animate-pulse uppercase tracking-widest font-mono">Synthesizing Management Overview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div id="exec-summary-error" className="max-w-4xl mx-auto my-12 p-8 bg-white border border-red-100 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive Summary Unavailable</h2>
        <p className="text-slate-500 max-w-md text-sm">{error}</p>
        <button 
          onClick={fetchExecutiveData}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-all uppercase"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div id="exec-summary-empty" className="p-12 text-center text-slate-500">
        Awaiting business activity or insufficient data available.
      </div>
    );
  }

  return (
    <div id="exec-summary-panel" className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans text-slate-850">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border border-red-100 flex items-center gap-1">
              <Award className="w-3 h-3" /> Executive Ledger
            </span>
            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border border-emerald-100">
              Live Connection
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SCM Capital Management Oversight</h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">Aggregated real-time metrics of fund adoption, client conversions, and advisor productivity.</p>
        </div>
        <button 
          onClick={fetchExecutiveData}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-850 shadow-sm hover:shadow transition-all tracking-wider uppercase font-mono"
        >
          Refresh Data
        </button>
      </div>

      <ExecutiveRecharts data={data} />

      {/* Management insights */}
      <div id="exec-section-insights" className="bg-gradient-to-r from-slate-900 via-slate-850 to-brand-neutral text-white p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 translate-y-6 translate-x-6 opacity-5 pointer-events-none">
          <Sparkles className="w-72 h-72 text-white" />
        </div>
        <div className="flex items-center gap-2 mb-3.5">
          <div className="p-1.5 bg-red-600/30 text-red-400 rounded-lg border border-red-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Management Insights</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.insights.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-2.5 bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10 text-slate-200 text-xs font-medium leading-relaxed">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0 animate-pulse"></span>
              <span>{insight}</span>
            </div>
          ))}
          {data.insights.length === 0 && (
            <span className="text-slate-400 text-xs italic">Insufficient historical data available.</span>
          )}
        </div>
      </div>

      {/* Section 1: Executive Overview Cards */}
      <div id="exec-section-overview" className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Card 1 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Officers</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Users2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-900 font-mono block">{data.overview.totalOfficers}</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Approved BDO / RM profiles</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Prospects</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-900 font-mono block">{data.overview.totalActiveProspects}</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Commercial pipelines</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meetings Held</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-900 font-mono block">{data.overview.totalMeetingsHeld}</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Corporate interactions</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Investments Closed</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-900 font-mono block">{data.overview.totalInvestmentsClosed}</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Successful conversions</span>
          </div>
        </div>

        {/* Card 5 (Total Funds Secured) */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between hover:shadow transition-shadow lg:col-span-2 bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Funds Secured</span>
            <div className="p-1.5 bg-emerald-500 text-white rounded-lg">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-emerald-600 font-mono block">₦{data.overview.totalFundsSecured.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Aggregate values across won pipelines</span>
          </div>
        </div>

      </div>

      {/* Phase 4: CRM Consolidation & Enterprise Research Workspaces Oversight Panel */}
      {data.workspaces && (
        <div id="exec-section-workspaces" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">Enterprise Research Workspaces & CRM Consolidation</h2>
            </div>
            <span className="text-[10px] bg-red-100 text-red-800 font-black uppercase px-2 py-0.5 rounded tracking-wide">Phase 4 Active</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Workspaces</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">{data.workspaces.totalWorkspaces}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Corporate profiles established</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Workspaces</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">{data.workspaces.activeWorkspaces}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Undergoing active engagements</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Archived Workspaces</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">{data.workspaces.archivedWorkspaces}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Archived portfolio histories</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Research Sessions</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">{data.workspaces.researchSessionsCount}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Scraped data intelligence logs</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Proposals Generated</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">{data.workspaces.proposalsCount}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Drafted SKIP & Fund term-sheets</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Presentations Uploaded</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">{data.workspaces.presentationsCount}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Decks & pitch brochure uploads</span>
            </div>
          </div>
        </div>
      )}

      {/* Middle Layout Grid: Section 3 & Section 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Section 3: Team Leaderboard */}
        <div id="exec-section-leaderboard" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">Advisor Leaderboard Ranking</h2>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">By Funds Secured</span>
          </div>

          <div className="space-y-3">
            {data.leaderboard.map((item, idx) => {
              const rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅';
              return (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{rankIcon}</span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{item.fullName}</span>
                      <span className="text-[10px] text-slate-400 block font-medium">Conversion Index: {item.conversionRate}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-600 font-mono block">₦{item.amountSecured.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">{item.dealsClosed} deals closed</span>
                  </div>
                </div>
              );
            })}
            {data.leaderboard.length === 0 && (
              <div className="text-center p-8 text-slate-400 text-xs">No active leaderboard ranking recorded yet.</div>
            )}
          </div>
        </div>

        {/* Section 4: Product Performance */}
        <div id="exec-section-products" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">Product Adoption Performance</h2>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">Portfolio Volume</span>
          </div>

          <div className="space-y-4">
            {data.products.map((item) => (
              <div key={item.productName} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    {item.productName}
                  </span>
                  <div className="font-mono text-slate-500">
                    <span className="text-[10px] mr-2">({item.investmentsCount} deals)</span>
                    <span className="text-slate-900 font-black text-emerald-600">₦{item.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
                {/* Custom simulated progress bar with simple percentages of total secured */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-900 transition-all duration-500" 
                    style={{ 
                      width: `${data.overview.totalFundsSecured > 0 
                        ? Math.min(100, Math.max(5, (item.totalAmount / data.overview.totalFundsSecured) * 100)) 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Section 2: Officer Performance Cards */}
      <div id="exec-section-officers" className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h2 className="text-base font-black text-slate-900 tracking-tight">Officer Performance Oversight Cards</h2>
          <p className="text-slate-400 text-xs">Direct oversight of each Business Development Officer and Relationship Manager.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.officers.map((officer) => (
            <div key={officer.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow transition-shadow relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{officer.fullName}</h3>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{officer.role}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                  officer.status === 'Approved' || officer.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {officer.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl text-center font-mono text-[10px]">
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[8px] tracking-wider">Prospects</span>
                  <span className="text-xs font-black text-slate-900">{officer.prospects}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[8px] tracking-wider">Meetings</span>
                  <span className="text-xs font-black text-slate-900">{officer.meetings}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[8px] tracking-wider">Conversions</span>
                  <span className="text-xs font-black text-emerald-600">{officer.investmentsClosed}</span>
                </div>
              </div>

              <div className="space-y-1 bg-emerald-50/20 border border-emerald-100/50 p-3 rounded-xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Secured Capital Value</span>
                <span className="text-sm font-black text-emerald-600 font-mono">₦{officer.amountSecured.toLocaleString()}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Products Recommended/Sold</span>
                <div className="flex flex-wrap gap-1">
                  {officer.productsSold.map((prod) => (
                    <span key={prod} className="bg-slate-100 text-slate-600 border border-slate-200 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {prod}
                    </span>
                  ))}
                  {officer.productsSold.length === 0 && (
                    <span className="text-slate-400 text-[9px] italic">Awaiting product logs</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] border-t border-slate-100 pt-3 text-slate-400">
                <span>Last Report Submitted</span>
                <span className="font-mono text-slate-700 font-bold">{officer.lastReportSubmitted}</span>
              </div>
            </div>
          ))}
          {data.officers.length === 0 && (
            <div className="text-center p-8 text-slate-400 text-xs md:col-span-3">No officer accounts recorded under management.</div>
          )}
        </div>
      </div>

      {/* Section 5: Weekly Report Monitor (Bottom Grid Layout Left) & Section 7: Activity Monitor (Bottom Grid Layout Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Section 5: Weekly Report Monitor */}
        <div id="exec-section-reports" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">Weekly Submission Monitor</h2>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">Friday Pipeline Workflow</span>
          </div>

          <div className="overflow-x-auto max-h-[360px] scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[9px] font-black">
                  <th className="py-2.5 px-2">Relationship Officer</th>
                  <th className="py-2.5 px-2">Week Period</th>
                  <th className="py-2.5 px-2">Submitted</th>
                  <th className="py-2.5 px-2 text-right">Secured (₦)</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-2">
                      <span className="font-bold text-slate-900 block">{rep.officerName}</span>
                      <span className="text-[9px] text-slate-400 block">{rep.officerEmail}</span>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[10px] text-slate-500">
                      {rep.weekEndDate}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[10px] text-slate-500">
                      {rep.submissionDate}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-600">
                      {rep.fundsSecured.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                        rep.status === 'Reviewed'
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : rep.status === 'Submitted'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {rep.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-slate-400 text-xs">No reports submitted under active parameters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 7: Live Activity Monitor */}
        <div id="exec-section-activity" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-500 animate-pulse" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">Oversight Activity Feed</h2>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">Live Logs</span>
          </div>

          <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
            {data.activities.map((act, index) => {
              const typeIcons = {
                prospect: '🏢',
                meeting: '🤝',
                investment: '💰',
                report: '📝',
                user_approved: '👤'
              };
              return (
                <div 
                  key={index} 
                  onClick={() => setSelectedActivity(act)}
                  className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all text-left"
                >
                  <span className="text-sm mt-0.5 shrink-0">{typeIcons[act.type] || '⚡'}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-900 block leading-tight hover:text-primary-brand truncate">{act.title}</span>
                    <span className="text-[9px] text-slate-400 block font-mono mt-0.5">{act.timestamp.replace('T', ' ').substring(0, 16)}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 mt-1 shrink-0" />
                </div>
              );
            })}
            {data.activities.length === 0 && (
              <div className="text-center p-8 text-slate-400 text-xs">No system activities registered on live node.</div>
            )}
          </div>
        </div>

      </div>

      {/* Activity Drill Down Inspection Modal */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative text-left"
            >
              <button 
                onClick={() => setSelectedActivity(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
                <span className="text-xl">
                  {selectedActivity.type === 'prospect' ? '🏢' :
                   selectedActivity.type === 'meeting' ? '🤝' :
                   selectedActivity.type === 'investment' ? '💰' :
                   selectedActivity.type === 'report' ? '📝' : '👤'}
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">Inspection Drill-down</span>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">Oversight Registry Node</h4>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <p className="text-xs font-bold text-slate-900 leading-relaxed">{selectedActivity.title}</p>
                </div>

                <div className="space-y-3 font-sans text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Log Category</span>
                    <span className="bg-slate-900 text-white font-black uppercase text-[8px] px-2 py-0.5 rounded tracking-widest font-mono">{selectedActivity.type}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Log Timestamp</span>
                    <span className="font-mono font-bold text-slate-700">{selectedActivity.timestamp.replace('T', ' ').substring(0, 19)}</span>
                  </div>

                  <div className="space-y-1 py-1.5">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Substantive Metrics Context</span>
                    <p className="bg-slate-100/50 p-3 rounded-lg border border-slate-150 text-slate-600 leading-relaxed font-mono text-[10px] whitespace-pre-wrap">{selectedActivity.detail}</p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedActivity(null)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold tracking-wider rounded-xl transition-all uppercase"
                >
                  Dismiss Oversighted Audit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
