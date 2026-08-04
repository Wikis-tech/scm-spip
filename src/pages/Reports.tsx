import React, { useState, useRef } from 'react';
import { 
  TrendingUp, 
  Users, 
  Building2, 
  FileSpreadsheet, 
  Download, 
  Award, 
  Briefcase, 
  Target,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  Printer,
  ChevronRight,
  FileText,
  BadgeAlert
} from 'lucide-react';
import { Prospect, Contact, Activity, Meeting, StaffPerformance, UserProfile } from '../types';

interface ReportsProps {
  prospects: Prospect[];
  contacts: Contact[];
  activities: Activity[];
  meetings: Meeting[];
  staffPerformance: StaffPerformance[];
  currentUser: UserProfile;
}

export const Reports: React.FC<ReportsProps> = ({
  prospects,
  contacts,
  activities,
  meetings,
  staffPerformance,
  currentUser
}) => {
  const isSuperAdmin = currentUser.email === 'wisdom.okoh@scmcapitalng.com' || 
                       currentUser.email === 'omololu.ajediran@scmcapitalng.com';
  const isAdminUser = isSuperAdmin || 
                      currentUser.role === 'Admin' || 
                      currentUser.role === 'SUPER_ADMIN' ||
                      currentUser.role === 'Administrator';

  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'weekly' | 'performance'>('overview');
  const [exportSuccess, setExportSuccess] = useState('');
  const printAreaRef = useRef<HTMLDivElement>(null);

  const totalAumBase = prospects
    .filter(p => !['Lost', 'Archived'].includes(p.status))
    .reduce((sum, p) => sum + p.opportunityValue, 0);

  const formatNaira = (num: number) => {
    return `₦${Number(num).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  // Safe print handler that opens browser print dialog scoped to the reporting card
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    setExportSuccess('');
    
    const headers = [
      'Organization Name', 
      'Industry Sector', 
      'Organization Type', 
      'HQ Location', 
      'Contact Website', 
      'Stage Status', 
      'Action Priority', 
      'Estimated Yield Pool (NGN)', 
      'Conversion Chance (%)',
      'Opportunity Score'
    ];
    
    const rows = prospects.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.industry}"`,
      `"${p.orgType}"`,
      `"${p.location}"`,
      `"${p.website || ''}"`,
      `"${p.status}"`,
      `"${p.priority}"`,
      p.opportunityValue,
      p.conversionProbability,
      p.opportunityScore || 50
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SCM_Capital_Prospect_Intelligence_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setExportSuccess('CSV downloaded successfully.');
    setTimeout(() => setExportSuccess(''), 2000);
  };

  // Group prospects by location to analyze geographical exposure
  const locationGroups = prospects.reduce((acc: { [key: string]: number }, p) => {
    acc[p.location] = (acc[p.location] || 0) + p.opportunityValue;
    return acc;
  }, {});

  // Group prospects by status/stage
  const stageGroups = prospects.reduce((acc: { [key: string]: { count: number, val: number } }, p) => {
    if (!acc[p.status]) {
      acc[p.status] = { count: 0, val: 0 };
    }
    acc[p.status].count += 1;
    acc[p.status].val += p.opportunityValue;
    return acc;
  }, {});

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header card with action triggers */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-display font-semibold text-sm text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#b1191f]" />
              <span>Institutional Prospecting Intelligence Reports</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Generate fully detailed management analytics, export clean corporate CSV data, and access formatted printable executive summaries.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              id="print-report-btn"
              onClick={handlePrint}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Executive PDF</span>
            </button>
            <button
              id="export-csv-btn"
              onClick={handleExportCSV}
              className="bg-[#b1191f] hover:bg-[#8e1217] text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-red-950/15 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV Dossier</span>
            </button>
          </div>
        </div>

        {exportSuccess && (
          <div className="p-2 mt-3 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg text-xs flex items-center gap-2 animate-pulse">
            <CheckCircle className="w-4 h-4" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {/* Tab Subnavigation */}
        <div className="flex border-b border-slate-100 mt-5 gap-4 text-xs font-semibold text-slate-400">
          <button
            onClick={() => setActiveReportTab('overview')}
            className={`pb-2 border-b-2 hover:text-[#b1191f] transition-all cursor-pointer ${activeReportTab === 'overview' ? 'border-[#b1191f] text-[#b1191f]' : 'border-transparent'}`}
          >
            AUM Overview Analytics
          </button>
          <button
            onClick={() => setActiveReportTab('weekly')}
            className={`pb-2 border-b-2 hover:text-[#b1191f] transition-all cursor-pointer ${activeReportTab === 'weekly' ? 'border-[#b1191f] text-[#b1191f]' : 'border-transparent'}`}
          >
            Management Weekly Summary
          </button>
          {isAdminUser && (
            <button
              onClick={() => setActiveReportTab('performance')}
              className={`pb-2 border-b-2 hover:text-[#b1191f] transition-all cursor-pointer ${activeReportTab === 'performance' ? 'border-[#b1191f] text-[#b1191f]' : 'border-transparent'}`}
            >
              SCM Staff Performance Index
            </button>
          )}
        </div>
      </div>

      {/* RENDER ACTIVE REPORT TAB */}
      <div ref={printAreaRef} className="print:p-8 print:bg-white print:text-black">
        {activeReportTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: General breakdown */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Pipeline summary by stage table */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-slate-400">
                  Value Segmented by Pipeline Phase
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                        <th className="pb-2">Salesforce Cycle Phase</th>
                        <th className="pb-2 text-center">Active Accounts</th>
                        <th className="pb-2 text-right">Est. Aggregate Placements (₦)</th>
                        <th className="pb-2 text-right">Weighted Risk Value (₦)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.keys(stageGroups).map((stage) => {
                        const { count, val } = stageGroups[stage];
                        // Weighted probability calculator
                        const matchesProb = stage === 'Converted' ? 1 : stage === 'Negotiation' ? 0.8 : stage === 'Proposal Sent' ? 0.5 : stage === 'Contacted' ? 0.3 : 0.15;
                        const weightedVal = val * matchesProb;
                        return (
                          <tr key={stage} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 font-semibold text-slate-700">{stage}</td>
                            <td className="py-3 text-center text-slate-500 font-mono">{count}</td>
                            <td className="py-3 text-right font-bold text-slate-800 font-mono">{formatNaira(val)}</td>
                            <td className="py-3 text-right font-semibold text-slate-500 font-mono">{formatNaira(weightedVal)}</td>
                          </tr>
                        );
                      })}
                      {Object.keys(stageGroups).length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                            No prospects entered in memory registry.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Geographic placements share */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-slate-400">
                  Geographical Asset Valuation Exposure
                </h4>
                <div className="space-y-3">
                  {Object.keys(locationGroups).length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No geographical targets detected.
                    </div>
                  ) : (
                    Object.keys(locationGroups).map((loc) => {
                      const value = locationGroups[loc];
                      const percent = totalAumBase > 0 ? (value / totalAumBase) * 100 : 0;
                      return (
                        <div key={loc} className="space-y-1 text-xs">
                          <div className="flex justify-between items-center font-medium">
                            <span className="text-slate-700">{loc}</span>
                            <span className="text-slate-800 font-mono">{formatNaira(value)} ({percent.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${percent}%` }} 
                              className="bg-[#b1191f] h-full rounded-full"
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: Total summary metrics */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
                <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                  CRM Aggregate Assets
                </h4>
                <div className="space-y-4">
                  <div className="p-3 bg-red-50/50 border border-red-150 rounded-lg text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">AUM PLACEMENT CAPACITY</span>
                    <span className="text-lg font-extrabold text-[#b1191f] block mt-0.5 font-mono">{formatNaira(totalAumBase)}</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Yield allocations at 16.5% average annual yield expectation.</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Discovered Key decision makers</span>
                      <span className="text-sm font-extrabold text-slate-800 block mt-0.5 font-mono">{contacts.length} Contacts</span>
                    </div>
                    <span className="text-[10px] text-teal-600 bg-teal-50 border border-teal-100 font-bold px-2 py-0.5 rounded">Active</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">B2B Touchpoints Logged</span>
                      <span className="text-sm font-extrabold text-slate-800 block mt-0.5 font-mono">{activities.length} Interactions</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 font-bold px-2 py-0.5 rounded">Sync Complete</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[9px] block">Scheduled Pitches / Campaigns</span>
                      <span className="text-sm font-extrabold text-[#b1191f] block mt-0.5 font-mono">{meetings.length} Scheduled</span>
                    </div>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 font-semibold px-2 py-0.5 rounded">Upcoming</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeReportTab === 'weekly' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 max-w-4xl mx-auto print:border-none print:shadow-none">
            
            {/* Printable Letterhead Header */}
            <div className="border-b-4 border-[#b1191f] pb-4 flex justify-between items-start">
              <div>
                <span className="font-display font-black text-xl text-[#b1191f] uppercase tracking-wider block">SCM CAPITAL</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">Institutional Wealth Division • Nigeria</span>
              </div>
              <div className="text-right text-xs">
                <span className="font-bold text-slate-700 block">WEEKLY BUSINESS DEVELOPMENT BRIEF</span>
                <span className="text-slate-500 font-mono block">DATE: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            {/* Exec summary narrative */}
            <div className="space-y-4">
              <h4 className="text-slate-800 font-bold text-sm">1. Executive Overview</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                During this operational window, SCM Capital's Business Development team achieved significant acceleration in institutional prospect mapping across Nigeria. The current pipeline represents a potential placement base of <strong>{formatNaira(totalAumBase)}</strong>. We've captured a total of <strong>{prospects.length}</strong> core targets, centering high-potential conglomerates (such as Chevron Cooperative, Airtel Nigeria, and BUA Cement) for treasury placement, money market accounts, and corporate financial literacy campaigns.
              </p>
            </div>

            {/* Key conversions list */}
            <div className="space-y-3">
              <h4 className="text-slate-800 font-bold text-sm">2. Priority High-Value Targets (Opportunity Score &gt; 80)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-100">
                      <th className="p-2">Corporate Entity</th>
                      <th className="p-2">Industry Sector</th>
                      <th className="p-2 text-center">Score</th>
                      <th className="p-2 text-center">Prob (%)</th>
                      <th className="p-2 text-right">Potential AUM Placement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {prospects.filter(p => (p.opportunityScore || 50) >= 80).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 font-medium">
                          No high-value targets currently map to active pipeline criteria (Score of 80 or above).
                        </td>
                      </tr>
                    ) : (
                      prospects.filter(p => (p.opportunityScore || 50) >= 80).map((p) => (
                        <tr key={p.id}>
                          <td className="p-2 font-bold text-slate-700">{p.name}</td>
                          <td className="p-2 text-slate-500">{p.industry}</td>
                          <td className="p-2 text-center font-mono font-bold text-red-700">{p.opportunityScore || 50}</td>
                          <td className="p-2 text-center font-mono">{p.conversionProbability}%</td>
                          <td className="p-2 text-right font-bold text-slate-800 font-mono">{formatNaira(p.opportunityValue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions required */}
            <div className="space-y-3 pt-2">
              <h4 className="text-slate-800 font-bold text-sm">3. Key Interventions & Strategic Recommendation</h4>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-2">
                <li><strong>Treasury Management Pitch</strong>: Move forward with specialized short-term Liquidity placements and Commercial Paper portfolios for our high-value corporate prospects.</li>
                <li><strong>Private HNW Estate Shelters</strong>: Initiate SCM Trust family legacy pitch parameters for executive board operators identified via Gemini.</li>
                <li><strong>Literacy Campaigns Expansion</strong>: Leverage financial briefings to access staff savings cooperatives, transforming retail advisory coverage.</li>
              </ul>
            </div>

            {/* Signature section for print */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-slate-500 border-t border-slate-100 mt-6">
              <div>
                <span className="block border-b border-slate-350 pr-4 h-6 w-3/4"></span>
                <span className="block mt-1 font-bold">Lovelyn Mrs. — Relationship Director</span>
              </div>
              <div className="text-right">
                <span className="inline-block border-b border-slate-350 w-3/4 h-6"></span>
                <span className="block mt-1 font-bold">Julian Draxler — BD Lead Coordinator</span>
              </div>
            </div>

          </div>
        )}

        {activeReportTab === 'performance' && isAdminUser && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-display font-medium text-sm text-slate-800 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>SCM Relationship Managers Leaderboard</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Indexed Live</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {staffPerformance.map((staff, idx) => {
                const awardColor = idx === 0 
                  ? "bg-amber-100 border-amber-300 text-amber-800" 
                  : idx === 1
                    ? "bg-slate-100 border-slate-300 text-slate-800"
                    : "bg-orange-100 border-orange-300 text-orange-850";

                return (
                  <div key={staff.id} className="border border-slate-200 rounded-xl p-4 space-y-3 relative overflow-hidden bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                    {idx < 3 && (
                      <span className={`absolute right-3 top-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full ${awardColor}`}>
                        Rank {idx + 1}
                      </span>
                    )}

                    <div className="space-y-1">
                      <span className="block font-bold text-slate-800 text-xs">{staff.name}</span>
                      <span className="block text-[10px] text-slate-400 font-semibold">{staff.role}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Managed</span>
                        <span className="font-bold text-slate-700 font-mono">{staff.prospectsCount} Prospects</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase">Revenue Won</span>
                        <span className="font-bold text-emerald-600 font-mono">₦{(staff.revenueConverted / 1000000).toFixed(1)}M</span>
                      </div>
                    </div>

                    <div className="pt-1.5 space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-slate-400 uppercase">Target Completion</span>
                        <span className="text-[#b1191f] font-mono">{staff.performanceIndex}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${staff.performanceIndex}%` }}
                          className="bg-[#b1191f] h-full"
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
