import React, { useState, useEffect } from 'react';
import { 
  SearchCode, 
  Sparkles, 
  Building2, 
  MapPin, 
  Globe, 
  Users, 
  Briefcase, 
  Mail, 
  Linkedin, 
  Check, 
  Loader2,
  Cpu,
  BookmarkPlus,
  Copy,
  Download,
  Phone,
  Network,
  BookOpen,
  PieChart,
  HelpCircle,
  FileText,
  BadgeAlert,
  ListFilter,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Lock,
  Clock,
  Database,
  ArrowRight,
  TrendingUp,
  Award,
  ChevronRight,
  X,
  Terminal,
  Activity,
  Search
} from 'lucide-react';
import { motion } from 'motion/react';
import { IntelligenceResult, Prospect, ContactEnrichment } from '../types';
import { calculateProductRecommendations } from '../utils/recommendationEngine';

interface IntelligenceProps {
  onImportProspect: (prospect: Partial<Prospect>) => Promise<any>;
  scmFetch?: (url: string, options?: RequestInit) => Promise<Response>;
}

interface SelectedCompany {
  id: string;
  name: string;
  domain: string;
  industry: string;
  headquarters: string;
  employeeCount: string;
  revenueValue: string;
  description: string;
  linkedinUrl: string;
}

export const Intelligence: React.FC<IntelligenceProps> = ({ onImportProspect, scmFetch }) => {
  const apiFetch = scmFetch || fetch;
  const [query, setQuery] = useState('');
  
  // Search State variables
  const [searchState, setSearchState] = useState<'idle' | 'searching-companies' | 'companies-found' | 'compiling-dossier' | 'dossier-loaded' | 'error'>('idle');
  const [searchMode, setSearchMode] = useState<'Company' | 'Executive'>('Company');
  const [companies, setCompanies] = useState<SelectedCompany[]>([]);
  const [selectedCo, setSelectedCo] = useState<SelectedCompany | null>(null);
  
  // Dossier Loading variables
  const [loadingStage, setLoadingStage] = useState('Searching Apollo...');
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<IntelligenceResult | null>(null);
  const [errorWord, setErrorWord] = useState('');
  const [isImported, setIsImported] = useState(false);
  
  // Tabs & Views
  const [activeSubTab, setActiveSubTab] = useState<'contacts' | 'relationship-map' | 'meeting-prep' | 'growth' | 'switchboard' | 'apollo-dossier'>('contacts');
  const [contactClassifier, setContactClassifier] = useState<string>('All');
  const [localContactSearch, setLocalContactSearch] = useState<string>('');
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  // Drawer for Selected Executive Profile
  const [selectedExecutive, setSelectedExecutive] = useState<ContactEnrichment | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // SERENA AI & OUTREACH SYNTHESIZER STATES
  const [serenaQuery, setSerenaQuery] = useState('');
  const [serenaMessages, setSerenaMessages] = useState<{ sender: 'user' | 'serena', text: string }[]>([
    { sender: 'serena', text: 'Good day! I am Serena, SCM Capital Markets AI assistant. Ask me questions about our active registry, high-scoring targets, or ask me which corporate accounts require urgent follow-ups.' }
  ]);
  const [isSerenaLoading, setIsSerenaLoading] = useState(false);

  const [outreachType, setOutreachType] = useState<'literacy' | 'meeting' | 'trust'>('meeting');
  const [outreachExec, setOutreachExec] = useState('');
  const [outreachPos, setOutreachPos] = useState('');
  const [outreachCompany, setOutreachCompany] = useState('');
  const [outreachIndustry, setOutreachIndustry] = useState('');
  const [outreachResult, setOutreachResult] = useState('');
  const [isOutreachLoading, setIsOutreachLoading] = useState(false);
  const [outreachCopied, setOutreachCopied] = useState(false);

  // Server-side Diagnostics panel states
  const [diagData, setDiagData] = useState<any>(null);
  const [showDiag, setShowDiag] = useState(false);

  const fetchDiagnostics = async () => {
    try {
      const res = await apiFetch('/api/apollo/diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagData(data);
      }
    } catch (err) {
      console.error("DIAGNOSTICS LOOKUP ERROR:", err);
    }
  };

  // Listen for targeted searches channeled from key UI links
  useEffect(() => {
    const savedQuery = localStorage.getItem('scm_intel_search_query');
    if (savedQuery) {
      setQuery(savedQuery);
      handleInitialSearch(savedQuery);
      localStorage.removeItem('scm_intel_search_query');
    }
    fetchDiagnostics();
  }, []);

  // Presets disabled to enforce pure real-time Apollo interaction

  // Stage 1: Initial Search query to proxy Apollo Mixed Companies Search endpoint
  const handleInitialSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    if (searchMode === 'Executive') {
      setSearchState('searching-companies');
      setCompanies([]);
      setSelectedCo(null);
      setResult(null);
      setErrorWord('');
      setIsImported(false);

      try {
        const response = await apiFetch(`/api/apollo/executive-search?q=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to retrieve executives from Apollo.');
        }
        const data = await response.json();
        
        // Mock selectedCo company profile details based on matched executive's company organization details
        setSelectedCo({
          id: data.overview?.id || '',
          name: data.overview?.name || searchTerm,
          domain: data.overview?.website || 'Not Found',
          industry: data.overview?.industry || 'Information Not Found',
          headquarters: data.overview?.headquarters || 'Information Not Found',
          employeeCount: data.overview?.employeeCount || 'Information Not Found',
          revenueValue: data.overview?.revenueValue || 'Information Not Found',
          description: data.overview?.description || 'Information Not Found',
          linkedinUrl: 'Not Found',
          techStack: []
        });

        setResult(data);
        console.log(
          "[CONTACT TRACE] Contacts Received By React:",
          (data.contacts || data.contactDiscovery || []).length
        );
        console.log(
          "[CONTACT TRACE] Contacts Stored In State:",
          (data.contacts || data.contactDiscovery || []).length
        );
        setSearchState('dossier-loaded');

        // Pre-fill Outreach Engine form with discovered highest relevance contact
        if (data.contactDiscovery && data.contactDiscovery.length > 0) {
          const primary = data.contactDiscovery[0];
          setOutreachExec(primary.fullName);
          setOutreachPos(primary.position);
          setOutreachCompany(data.overview?.name || searchTerm);
          setOutreachIndustry(data.overview?.industry || '');
        }
      } catch (err: any) {
        console.error(err);
        setErrorWord(err.message || 'Error occurred querying corporate executive registries.');
        setSearchState('error');
      } finally {
        fetchDiagnostics();
      }
      return;
    }

    // Normal company search
    setSearchState('searching-companies');
    setCompanies([]);
    setSelectedCo(null);
    setResult(null);
    setErrorWord('');
    setIsImported(false);

    try {
      const response = await apiFetch(`/api/apollo/search?q=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Failed to retrieve matching firms from Apollo search endpoint.');
      }
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setCompanies(data);
        setSearchState('companies-found');
      } else {
        setSearchState('companies-found');
        setCompanies([]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorWord(err.message || 'Error occurred querying corporate target registries.');
      setSearchState('error');
    } finally {
      fetchDiagnostics();
    }
  };

  // Stage 2: Selection leading to Enrichment -> Decision Makers discovery -> SCM Analysis
  const handleCompanySelect = async (company: SelectedCompany) => {
    setSelectedCo(company);
    setSearchState('compiling-dossier');
    setLoadingStep(0);
    setLoadingStage('Searching Apollo...');
    
    // Animate stage sequence text beautifully
    const stages = [
      { text: 'Searching Apollo...', step: 0 },
      { text: 'Organizations Found', step: 1 },
      { text: 'Loading Company Profile', step: 2 },
      { text: 'Finding Decision-Makers', step: 3 },
      { text: 'Structuring SCM Investment Score', step: 4 }
    ];

    let count = 0;
    const loadingInterval = setInterval(() => {
      if (count < stages.length - 1) {
        count++;
        setLoadingStep(stages[count].step);
        setLoadingStage(stages[count].text);
      }
    }, 800);

    try {
      const response = await apiFetch('/api/gemini/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: company.name, companyId: company.id, domain: company.domain })
      });

      if (!response.ok) {
        throw new Error('Timeout or authorization error occurred compiling dossier.');
      }

      const data = await response.json();
      setResult(data);
      console.log(
        "[CONTACT TRACE] Contacts Received By React:",
        (data.contacts || data.contactDiscovery || []).length
      );
      console.log(
        "[CONTACT TRACE] Contacts Stored In State:",
        (data.contacts || data.contactDiscovery || []).length
      );
      setSearchState('dossier-loaded');
      
      // Auto-populate Outreach Form with C-suite elements to make workflow premium
      if (data.contactDiscovery && data.contactDiscovery.length > 0) {
        const primary = data.contactDiscovery[0];
        setOutreachExec(primary.fullName);
        setOutreachPos(primary.position);
        setOutreachCompany(company.name);
        setOutreachIndustry(company.industry || 'Energy / Services');
      }
    } catch (err: any) {
      console.error(err);
      setErrorWord(err.message || 'Failing to establish a connection with SCM Capital Intelligence proxy.');
      setSearchState('error');
    } finally {
      clearInterval(loadingInterval);
      fetchDiagnostics();
    }
  };

  const handleSerenaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serenaQuery.trim()) return;
    const userMsg = serenaQuery;
    setSerenaMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setSerenaQuery('');
    setIsSerenaLoading(true);

    try {
      const res = await apiFetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: userMsg,
          selectedCompany: selectedCo ? {
            id: selectedCo.id,
            name: selectedCo.name,
            industry: selectedCo.industry,
            description: selectedCo.description,
            website: selectedCo.website,
            location: selectedCo.location,
            employeeCount: selectedCo.employeeCount,
            revenueValue: selectedCo.revenueValue
          } : null
        })
      });
      const data = await res.json();
      setSerenaMessages(prev => [...prev, { sender: 'serena', text: data.reply || "I encountered a lag connecting with our asset databases. Let's analyze our high score leads directly on the Prospects dashboard." }]);
    } catch (err) {
      console.error(err);
      setSerenaMessages(prev => [...prev, { sender: 'serena', text: "Error connecting to SCM core AI models." }]);
    } finally {
      setIsSerenaLoading(false);
    }
  };

  const handleGenerateOutreach = async () => {
    if (!outreachExec.trim() || !outreachCompany.trim()) return;
    setIsOutreachLoading(true);
    setOutreachResult('');
    setOutreachCopied(false);

    try {
      const res = await apiFetch('/api/gemini/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: outreachType,
          companyName: outreachCompany,
          industry: outreachIndustry,
          executiveName: outreachExec,
          position: outreachPos
        })
      });
      const data = await res.json();
      setOutreachResult(data.email || 'Failed to trigger pitch synthesis.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsOutreachLoading(false);
    }
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [keyId]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [keyId]: false }));
    }, 1500);
  };

  const handleImport = async () => {
    if (!result) return;
    
    const partialProspect: Partial<Prospect> = {
      name: result.overview.name,
      industry: result.overview.industry,
      orgType: result.overview.employeeCount.includes('employees') ? 'Joint Stock Public' : 'Private Corporation',
      location: result.overview.headquarters,
      website: result.overview.website,
      status: 'Lead',
      priority: result.metrics.overallOpportunityScore >= 85 ? 'High' : 'Medium',
      notes: `${result.overview.description} \nAI Assessment Overall Opportunity Score: ${result.metrics.overallOpportunityScore}/100.`,
      conversionProbability: 25,
      treasuryPotential: result.metrics.treasuryPotential,
      mmfPotential: result.metrics.mmfOpportunity,
      wealthPotential: result.metrics.wealthManagementFit,
      literacyPotential: result.metrics.literacyAdoptionScore,
      opportunityScore: result.metrics.overallOpportunityScore
    };

    try {
      await onImportProspect(partialProspect);
      setIsImported(true);
    } catch (err: any) {
      console.error('[SPIP IMPORT] Prospect import failed:', err?.message || err);
      setIsImported(false);
      setErrorWord(err?.message || 'Unable to import this prospect. Please try again.');
    }
  };

  const getContactValidationLevel = (c: any): 'Verified' | 'Public' | 'Unverified' => {
    if (c.validationLevel) return c.validationLevel;
    const src = (c.source || '').toLowerCase();
    if (src.includes('website') || src.includes('returns') || src.includes('press') || src.includes('sec') || src.includes('nse') || src.includes('annual') || src.includes('official') || src.includes('page')) {
      return 'Verified';
    }
    if (src.includes('linkedin') || src.includes('directory') || src.includes('public') || src.includes('ledger') || src.includes('profile')) {
      return 'Public';
    }
    if (src.includes('unverified') || src.includes('suspect') || src.includes('ai') || src.includes('hallucin')) {
      return 'Unverified';
    }
    return 'Public';
  };

  const getContactCategory = (fullName: string, position: string, department: string): string => {
    const title = (position || "").toLowerCase();
    const dept = (department || "").toLowerCase();

    if (
      title.includes("cfo") || 
      title.includes("finance") || 
      title.includes("treasurer") || 
      title.includes("treasury") || 
      title.includes("controller") || 
      title.includes("financial") ||
      dept.includes("finance") ||
      dept.includes("treasury")
    ) {
      return "Finance";
    }
    
    if (
      title.includes("hr") || 
      title.includes("human resources") || 
      title.includes("talent") || 
      title.includes("recruitment") || 
      title.includes("people") ||
      dept.includes("hr") ||
      dept.includes("human resources") ||
      dept.includes("talent") ||
      dept.includes("people")
    ) {
      return "Human Capital";
    }

    if (
      title.includes("cto") || 
      title.includes("engineering") || 
      title.includes("technology") || 
      title.includes("software") || 
      title.includes("it") ||
      dept.includes("engineering") ||
      dept.includes("technology") ||
      dept.includes("it") ||
      dept.includes("software")
    ) {
      return "Technology";
    }

    if (
      title.includes("legal") || 
      title.includes("compliance") || 
      title.includes("general counsel") ||
      title.includes("lawyer") ||
      dept.includes("legal") ||
      dept.includes("compliance")
    ) {
      return "Legal";
    }

    if (
      title.includes("marketing") || 
      title.includes("communications") || 
      title.includes("brand") || 
      title.includes("growth") ||
      dept.includes("marketing") ||
      dept.includes("communications")
    ) {
      return "Marketing";
    }

    if (
      title.includes("operations") || 
      title.includes("strategy") ||
      title.includes("ops") ||
      dept.includes("operations") ||
      dept.includes("strategy")
    ) {
      return "Operations";
    }

    if (
      title.includes("ceo") || 
      title.includes("md") || 
      title.includes("founder") || 
      title.includes("partner") || 
      title.includes("managing director") || 
      title.includes("director") || 
      title.includes("president") || 
      title.includes("chief") ||
      title.includes("executive") ||
      title.includes("gm") ||
      title.includes("manager") ||
      dept.includes("executive") ||
      dept.includes("board") ||
      dept.includes("management")
    ) {
      return "Executive";
    }

    // Default option so all contacts remain visible under one of the 7 divisions!
    return "Executive"; 
  };

  const rawContacts = result?.contactDiscovery || [];
  const classifiedContacts = result?.contactDiscovery ? result.contactDiscovery.filter(c => {
    // Phase 7: Local Search Filtering criteria
    if (localContactSearch.trim()) {
      const q = localContactSearch.toLowerCase().trim();
      const match = 
        (c.fullName || '').toLowerCase().includes(q) || 
        (c.position || '').toLowerCase().includes(q) || 
        (c.department || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category / Division selection
    if (contactClassifier === 'All') return true;
    
    const cat = getContactCategory(c.fullName || '', c.position || '', c.department || '');
    return cat === contactClassifier;
  }) : [];

  console.log(
    `[CONTACT TRACE] Before Filter: ${rawContacts.length}, After Filter: ${classifiedContacts.length}`
  );
  if (rawContacts.length > 0 && classifiedContacts.length === 0) {
    console.warn(`[CONTACT TRACE] 100% loss! ${rawContacts.length} contacts filtered down to 0 because contactClassifier is "${contactClassifier}" and localContactSearch is "${localContactSearch}"`);
  } else if (rawContacts.length !== classifiedContacts.length) {
    console.log(`[CONTACT TRACE] Filtered out ${rawContacts.length - classifiedContacts.length} contacts. Reason: Classifier is "${contactClassifier}" and localContactSearch is "${localContactSearch}"`);
  }

  console.log(
    "[CONTACT TRACE] Contacts About To Render:",
    classifiedContacts.length
  );

  return (
    <div className="space-y-6 font-sans text-slate-800">
      
      {/* SCM Institutional Search Card */}
      <div id="scm-intelligence-search" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-display font-medium text-base text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#b1191f]" />
              <span>Apollo Intelligence Target Mapping</span>
            </h3>
            <p className="text-xs text-slate-500">
              Query millions of registered entities instantly. Retrieve clean company parameters, discover verified decision makers, and score treasury alignment in real-time.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* Developer Diagnostics Toggle Button (Phase 8) */}
            <button
              onClick={() => {
                setShowDiag(prev => !prev);
                fetchDiagnostics();
              }}
              className={`hidden text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                showDiag 
                  ? "bg-slate-900 border-slate-950 text-emerald-400 font-mono shadow-inner" 
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Dev Diagnostics Panel</span>
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${diagData?.apolloConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </button>

            {searchState === 'dossier-loaded' && (
              <button
                onClick={() => {
                  setSearchState('idle');
                  setQuery('');
                  setResult(null);
                  setSelectedCo(null);
                }}
                className="text-[#b1191f] hover:text-[#8e1217] text-xs font-semibold flex items-center gap-1 border border-slate-200 hover:border-[#b1191f]/50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                ← Search New Organization
              </button>
            )}
          </div>
        </div>

        {/* Real-time Developer Diagnostics Panel (Phase 8) */}
        {import.meta.env.DEV && showDiag && (
          <div className="bg-slate-950 text-slate-200 rounded-xl p-5 border border-slate-900 font-mono text-xs space-y-4 animate-fadeIn shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">SCM Apollo Integration Diagnostic Audit Monitor</span>
              </div>
              <button 
                onClick={fetchDiagnostics} 
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer"
              >
                Force Refresh Logs
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-900">
              <div className="space-y-0.5">
                <p className="text-slate-500 text-[10px]">Apollo Integration State</p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${diagData?.apolloConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="font-extrabold text-white text-[11px]">{diagData?.apolloConnected ? "CONNECTED" : "OFFLINE / DISCONNECTED"}</span>
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-slate-500 text-[10px]">Server API Key Status</p>
                <p className="font-extrabold text-[#e2e8f0] text-[11px]">
                  {diagData?.apolloKeyLoaded ? `LOADED (Len: ${diagData.apolloKeyLength})` : "MISSING KEY"}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-slate-500 text-[10px]">Key Detection Source</p>
                <p className="font-semibold text-slate-400 text-[10px] truncate max-w-[150px]" title={diagData?.apolloKeySource}>
                  {diagData?.apolloKeySource || "No key source detected"}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-slate-500 text-[10px]">Latest API Status Log</p>
                <div className="flex items-center gap-1">
                  <span className={`px-1.5 py-0.2 text-[10px] rounded font-bold ${
                    diagData?.apolloStatusCode && diagData.apolloStatusCode >= 200 && diagData.apolloStatusCode < 300
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                      : 'bg-red-950/80 text-red-400 border border-red-900'
                  }`}>
                    {diagData?.apolloStatusCode || "No requests fired yet"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2 border border-slate-900/80 p-3 rounded-lg bg-slate-900/30">
                <p className="text-[#a7f3d0] font-bold text-[11px] border-b border-slate-900/50 pb-1 flex items-center gap-1.5 uppercase">
                  <span>Outbound Telemetry Log</span>
                </p>
                <div className="space-y-2.5 text-[11px]">
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Query Entered:</span>
                    <span className="text-yellow-400 font-extrabold">"{diagData?.queryEntered || diagData?.lastSearch || "None"}"</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Organizations Returned:</span>
                    <span className="text-indigo-400 font-extrabold">{diagData?.organizationsReturned ?? 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Exact Match Found:</span>
                    <span className={`font-extrabold ${diagData?.exactMatchFound === 'YES' ? 'text-emerald-400' : 'text-slate-400'}`}>{diagData?.exactMatchFound || "NO"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Selected Organization:</span>
                    <span className="text-sky-300 font-bold truncate max-w-[150px]" title={diagData?.selectedOrganization || "None"}>{diagData?.selectedOrganization || "None"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Organization ID:</span>
                    <span className="text-fuchsia-400 font-mono truncate max-w-[150px]" title={diagData?.selectedOrganizationId || "None"}>{diagData?.selectedOrganizationId || "None"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Latest Action Target:</span>
                    <span className="text-slate-300 font-bold max-w-[200px] truncate text-right text-xs" title={diagData?.lastEndpointCalled}>
                      {diagData?.lastEndpointCalled || "None"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Latency Duration:</span>
                    <span className="text-[#38bdf8] font-bold">
                      {diagData?.lastResponseTimeMs ? `${diagData.lastResponseTimeMs}ms` : "0ms"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Decision Makers Returned:</span>
                    <span className="text-pink-400 font-extrabold">{diagData?.peopleReturned ?? 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Apollo Contacts Found:</span>
                    <span className="text-amber-400 font-medium">{diagData?.apolloRawCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Contacts With Email:</span>
                    <span className="text-emerald-400 font-medium">{diagData?.contactsWithEmail ?? 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Contacts With Phone:</span>
                    <span className="text-[#38bdf8] font-medium">{diagData?.contactsWithPhone ?? 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Contacts With LinkedIn:</span>
                    <span className="text-indigo-400 font-medium">{diagData?.contactsWithLinkedIn ?? 0}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-500">Contacts Missing Contact Data:</span>
                    <span className="text-rose-400 font-medium">{diagData?.contactsMissingContactData ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border border-slate-900/80 p-3 rounded-lg bg-slate-900/30">
                <p className="text-[#93c5fd] font-bold text-[11px] border-b border-slate-900/50 pb-1 flex items-center gap-1.5 uppercase">
                  <span>Matching & Identity Integrity Audit Log</span>
                </p>
                <div className="space-y-2.5 text-[11px]">
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Organization ID Matches:</span>
                    <span className="text-emerald-400 font-extrabold">{diagData?.orgIdMatchCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Organization ID Mismatches:</span>
                    <span className="text-rose-400 font-medium">{diagData?.orgIdMismatchCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Normalized Domain Matches:</span>
                    <span className="text-[#38bdf8] font-bold">{diagData?.domainMatchCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Domain Mismatches:</span>
                    <span className="text-slate-400 font-medium">{diagData?.domainMismatchCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Strong Name Matches:</span>
                    <span className="text-sky-400 font-bold">{diagData?.strongNameMatchCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Weak Name Matches:</span>
                    <span className="text-yellow-400 font-medium">{diagData?.weakNameMatchCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">Rejected Org Matches:</span>
                    <span className="text-rose-400 font-bold">{diagData?.rejectedOrgMatchCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-500">Last Acceptance Method:</span>
                    <span className="text-fuchsia-400 font-bold uppercase">{diagData?.lastAcceptanceMethodUsed || "None Used"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border border-slate-900/80 p-3 rounded-lg bg-slate-900/30">
                <p className="text-[#fecdd3] font-bold text-[11px] border-b border-slate-900/50 pb-1 flex items-center gap-1.5 uppercase">
                  <span>Server-Side Exceptions & Payload Faults</span>
                </p>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Diagnostic Status:</span>
                    <span className={diagData?.lastError ? "text-rose-400 font-extrabold" : "text-emerald-400 font-extrabold"}>
                      {diagData?.lastError ? "ALERT TRIGGERED" : "HEALTHY (0 ERRORS)"}
                    </span>
                  </div>
                  <div className="bg-[#1c0c0e] p-2 rounded border border-red-950 text-rose-400 font-medium text-[10px] break-all max-h-[70px] overflow-y-auto">
                    {diagData?.lastError || "No active failures detected. Connecting queries successfully."}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Outbound Payload Body</span>
                <pre className="p-2.5 bg-slate-900/70 border border-slate-900 rounded-lg text-[10px] text-slate-300 max-h-[140px] overflow-y-auto select-all max-w-full overflow-x-auto whitespace-pre-wrap leading-tight">
                  {diagData?.lastPayload ? diagData.lastPayload : "No payload indexed yet."}
                </pre>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Inbound response buffer preview</span>
                <pre className="p-2.5 bg-slate-900/70 border border-slate-900 rounded-lg text-[10px] text-[#34d399] max-h-[140px] overflow-y-auto select-all max-w-full overflow-x-auto whitespace-pre-wrap leading-tight">
                  {diagData?.lastResponseBodyPreview ? diagData.lastResponseBodyPreview : "No response previews captured yet."}
                </pre>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-500 text-center font-medium border-t border-slate-900/40 pt-2 flex items-center justify-center gap-1">
              <span>●</span>
              <span>SPIP Secure Sandboxed Registry proxy layer. Headers and payloads are cleared at session shutdown.</span>
            </div>
          </div>
        )}

        {searchState !== 'dossier-loaded' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 font-display">Search Mode:</span>
              <button
                onClick={() => setSearchMode('Company')}
                className={`text-xs font-bold px-3 py-1 rounded-md transition-all cursor-pointer ${
                  searchMode === 'Company'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-505 hover:text-slate-800 bg-slate-100 hover:bg-slate-150'
                }`}
              >
                Company Directory Query
              </button>
              <button
                onClick={() => setSearchMode('Executive')}
                className={`text-xs font-bold px-3 py-1 rounded-md transition-all cursor-pointer ${
                  searchMode === 'Executive'
                    ? 'bg-[#b1191f] text-white'
                    : 'text-slate-550 hover:text-slate-800 bg-slate-100 hover:bg-slate-150'
                }`}
              >
                Direct Executive Discovery
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 max-w-4xl pt-1">
              <div className="relative grow">
                {searchMode === 'Company' ? (
                  <Building2 className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                ) : (
                  <Users className="w-4 h-4 absolute left-3 top-3.5 text-[#b1191f]" />
                )}
                <input
                  type="text"
                  id="intel-search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    searchMode === 'Company'
                      ? "Search organizations or keywords (e.g. NAWIS, Oando, FCMB, FIRS, Mikano, AltSchool...)"
                      : "Search C-suite directly (e.g. CFO MTN Nigeria, Treasurer Dangote, CEO Oando, Finance Director Nestle...)"
                  }
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-850 font-medium outline-none transition-all placeholder-slate-400"
                  disabled={searchState === 'searching-companies'}
                  onKeyDown={(e) => e.key === 'Enter' && handleInitialSearch(query)}
                />
              </div>
              <button
                id="intel-search-btn"
                onClick={() => handleInitialSearch(query)}
                disabled={searchState === 'searching-companies' || !query.trim()}
                className="bg-[#b1191f] hover:bg-[#8e1217] disabled:bg-slate-200 text-white font-semibold text-xs px-5 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all outline-none shadow-sm cursor-pointer"
              >
                {searchState === 'searching-companies' ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchCode className="w-4 h-4" />}
                <span>{searchMode === 'Company' ? 'Search Firms' : 'Discover C-Suite'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Presets row removed for direct live search */}
      </div>

      {/* Error state */}
      {errorWord && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
          <BadgeAlert className="w-4 h-4 text-red-600" />
          <span>{errorWord}</span>
        </div>
      )}

      {/* Stage: Loading/Searching Companies */}
      {searchState === 'searching-companies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg"></div>
                <div className="space-y-2 grow">
                  <div className="h-3.5 bg-slate-100 rounded w-2/3"></div>
                  <div className="h-2.5 bg-slate-100 rounded w-1/3"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2.5 bg-slate-100 rounded w-full"></div>
                <div className="h-2.5 bg-slate-100 rounded w-5/6"></div>
              </div>
              <div className="h-8 bg-slate-100 rounded w-full pt-2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Stage: Companies list found */}
      {searchState === 'companies-found' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-semibold text-slate-900 text-xs tracking-wide uppercase">
              Organizations Indexed ({companies.length})
            </h4>
            <span className="text-[10px] text-slate-500">Click card to compile full intelligence dossiers</span>
          </div>

          {companies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((co) => (
                <div 
                  key={co.id} 
                  id={`company-card-${co.id}`}
                  onClick={() => handleCompanySelect(co)}
                  className="bg-white border border-slate-200 hover:border-[#b1191f] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#fce4ec] text-[#b1191f] border border-[#fce4ec] rounded-lg items-center justify-center flex font-bold text-sm shrink-0">
                        {co.name.charAt(0)}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-slate-900 text-sm hover:text-[#b1191f] transition-all">{co.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                            <Globe className="w-3 h-3" /> {co.domain}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded-sm font-semibold">
                            {co.industry || 'Business'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                      {co.description || "No corporate description was indexed on public registers."}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 border border-slate-150 p-2.5 rounded-lg font-medium text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#b1191f]" /> hq: {co.headquarters.split(',')[0]}
                      </span>
                      <span className="flex items-center gap-1 justify-end">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> Count: {co.employeeCount}
                      </span>
                    </div>

                    {co.linkedinUrl && co.linkedinUrl !== 'Not Found' && (
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 pt-1 justify-start px-1 border-t border-slate-100/50">
                        <Linkedin className="w-3 h-3 text-sky-700 shrink-0" />
                        <span className="truncate">{co.linkedinUrl}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-indigo-700 font-extrabold tracking-tight bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded uppercase">
                      Apollo Match
                    </span>
                    <button className="text-[10px] font-bold text-[#b1191f] group flex items-center gap-1">
                      <span>Analyze Profile</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-all text-[#b1191f]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">No Matching Firms Discovered</h4>
              <p className="text-[11px] text-slate-500">We could not query any companies matching "{query}". Enter a different keyword to search.</p>
            </div>
          )}
        </div>
      )}

      {/* Stage: Compiling intelligence dossier loader state */}
      {searchState === 'compiling-dossier' && (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center space-y-6 shadow-sm">
          <div className="w-14 h-14 bg-[#fce4ec] border border-[#fce4ec] text-[#b1191f] rounded-full items-center justify-center flex mx-auto">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <div className="max-w-md mx-auto space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#b1191f] tracking-widest uppercase">Assembling Corporate Intelligence Dossier</p>
              <h4 className="font-display font-black text-slate-900 text-base">{selectedCo?.name}</h4>
            </div>

            {/* Simulated Progressive Stepper */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2 text-left max-w-xs mx-auto">
              {[
                'Searching Apollo...',
                'Organizations Found',
                'Loading Company Profile',
                'Finding Decision-Makers',
                'Structuring SCM Investment Score'
              ].map((stepText, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[11px]">
                  {loadingStep > idx ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3px]" />
                  ) : loadingStep === idx ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#b1191f]" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-200 shrink-0"></div>
                  )}
                  <span className={`font-semibold ${loadingStep === idx ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                    {stepText}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-500">
              Querying Apollo database nodes, mapping organizational structures, and running intelligence models to output fiduciary options.
            </p>
          </div>
        </div>
      )}

      {/* Target Unverified Result View (Phase 7) */}
      {searchState === 'dossier-loaded' && result && result.unverified && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-[#b1191f] border border-red-100 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest text-[#b1191f] uppercase bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
              VERIFICATION FAILURE
            </span>
            <h3 className="font-display font-black text-slate-900 text-lg md:text-xl">
              No Verified Public Information Available
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              The SCM Trust Guardrail has blocked dossier synthesis for <strong className="text-slate-800">"{result.companyName || query}"</strong>. No verified corporate profiles, active web domains, or legal representatives could be retrieved via Apollo.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-left space-y-2 max-w-md mx-auto">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-[#b1191f]" />
              <span>Strict Underwriting & Anti-Hallucination Guardrails:</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              SCM Capital Zero-Hallucination Directives strictly forbid generating fake data, synthetic email templates, or fabricated executive directories for unconfirmed targets.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setSearchState('idle');
                setQuery('');
                setResult(null);
                setSelectedCo(null);
              }}
              className="bg-[#b1191f] hover:bg-[#8e1217] text-white font-semibold text-xs px-6 py-2.5 rounded-lg transition-all shadow-sm inline-flex items-center gap-1 cursor-pointer"
            >
              <span>← Run Different Corporate Search</span>
            </button>
          </div>
        </div>
      )}

      {/* Stage: Compiled Dossier loaded */}
      {searchState === 'dossier-loaded' && result && !result.unverified && (
        <div className="space-y-6">
          
          {/* Company Brief Premium Profile Banner */}
          <div className="bg-slate-900 text-white border border-slate-955 rounded-2xl p-6 relative overflow-hidden shadow-md">
            {/* Ambient Red Glow backdrop to make it premium */}
            <div className="absolute right-0 top-0 w-80 h-80 bg-[#b1191f] opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>

            <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-white text-slate-900 border-2 border-[#b1191f] rounded-xl items-center justify-center flex font-black text-xl shrink-0">
                  {result.overview.name.charAt(0)}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display font-bold text-lg md:text-xl text-white tracking-tight">{result.overview.name}</h2>
                    {result.validationDetails && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 shrink-0 ${
                        result.validationDetails.status === 'Verified'
                          ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500/50'
                          : result.validationDetails.status === 'Partially Verified'
                            ? 'bg-amber-900/40 text-amber-300 border-amber-500/50'
                            : 'bg-slate-800 text-slate-300 border-slate-600'
                      }`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{result.validationDetails.status} Index</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-[#b11216]" /> 
                      <a href={`https://${result.overview.website}`} target="_blank" rel="noreferrer" className="hover:underline text-slate-300">
                        {result.overview.website}
                      </a>
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>{result.overview.industry}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{result.overview.headquarters.split(',').slice(0, 2).join(',')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* CRM Insertion Command button */}
              <div className="self-end md:self-auto shrink-0">
                <button
                  id="import-crm-pip-btn"
                  onClick={handleImport}
                  disabled={isImported}
                  className={`font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer outline-none ${
                    isImported 
                      ? 'bg-emerald-600 border border-emerald-600 text-white' 
                      : 'bg-[#b1191f] hover:bg-[#8e1217] text-white border border-[#b1191f]'
                  }`}
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>{isImported ? 'Imported to CRM' : 'Import Target into CRM'}</span>
                </button>
              </div>
            </div>

            <p className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-300 leading-relaxed text-justify max-w-4xl">
              {result.overview.description}
            </p>
          </div>

          {/* SCM Intelligence Section Divider & Label (SCM Intelligence. Generated using Apollo data.) */}
          <div className="pt-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
              <div className="space-y-1">
                <div className="text-[10px] text-rose-400 font-extrabold uppercase tracking-widest">
                  SCM Intelligence. Generated using Apollo data.
                </div>
                <h3 className="font-display font-bold text-base text-white tracking-tight">SCM Proprietary Business Development Insights</h3>
              </div>
              <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/25 rounded-lg text-xs font-semibold text-rose-400">
                SCM Proprietary Analysis Layer
              </div>
            </div>
          </div>

          {/* SCM Intelligence Core Metrics Dashboard (STEP 8) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Primary SCM Fiduciary Score Indicator Ring */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between items-center text-center">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block">Opportunity Score</span>
                <p className="text-[9px] text-slate-500 font-medium">SCM Fiduciary Match Suitability</p>
              </div>

              <div className="relative my-3 flex items-center justify-center">
                {/* Visual Progress ring circle */}
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="40" className="stroke-slate-100" strokeWidth="6" fill="transparent" />
                  <circle cx="48" cy="48" r="40" className="stroke-[#b1191f]" strokeWidth="7" fill="transparent"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - result.metrics.overallOpportunityScore / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-black text-slate-900">{result.metrics.overallOpportunityScore}</span>
                  <span className="text-[10px] text-slate-400 font-extrabold block">/ 100</span>
                </div>
              </div>

              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                result.metrics.overallOpportunityScore >= 85 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : 'bg-amber-50 text-amber-700 border-amber-100'
              }`}>
                {result.metrics.overallOpportunityScore >= 85 ? 'Highly Recommended' : 'Actionable Alignment'}
              </span>
            </div>

            {/* Sub-Indicators widgets */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl h-full flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide block">Placement Potential</span>
                  <p className="text-[10px] text-slate-800 font-bold mt-1 line-clamp-3">
                    {result.metrics.treasuryPotential.replace(/Calculated as /i, '')}
                  </p>
                </div>
                <div className="pt-2 text-[9px] text-slate-500 font-bold border-t border-slate-200/60 mt-1 uppercase flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-[#b1191f]" /> Treasury Products
                </div>
              </div>

              <div className="p-3.5 bg-[#fce4ec]/30 border border-[#fce4ec]/70 rounded-xl h-full flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-[#b1191f] font-extrabold uppercase tracking-wide block">MMF Suitability</span>
                  <p className="text-[10px] text-slate-800 font-bold mt-1 line-clamp-3">
                    {result.metrics.mmfOpportunity.replace(/Excellent suitability for /i, '')}
                  </p>
                </div>
                <div className="pt-2 text-[9px] text-[#b1191f] font-bold border-t border-[#fce4ec] mt-1 uppercase flex items-center gap-1">
                  <Award className="w-3 h-3 text-[#b1191f]" /> Money Market Mutual
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl h-full flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide block">Private Client Trust</span>
                  <p className="text-[10px] text-slate-800 font-bold mt-1 line-clamp-3">
                    {result.metrics.wealthManagementFit.replace(/Discretionary Private Trust /i, '')}
                  </p>
                </div>
                <div className="pt-2 text-[9px] text-slate-500 font-bold border-t border-slate-200/60 mt-1 uppercase flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> Private Trust
                </div>
              </div>
            </div>
          </div>

          {/* SCM Product Recommendation Matrix V1 Container */}
          {(() => {
            const recEngineData = selectedCo ? calculateProductRecommendations(
              {
                name: selectedCo.name,
                industry: selectedCo.industry,
                description: selectedCo.description,
                employeeCount: selectedCo.employeeCount,
                revenueValue: selectedCo.revenueValue
              },
              result.contactDiscovery || [],
              result.metrics.overallOpportunityScore || 80
            ) : null;

            const finalMatrix = result.recommendationMatrix && result.recommendationMatrix.length > 0 
              ? result.recommendationMatrix 
              : (recEngineData ? recEngineData.matrix : []);

            if (finalMatrix.length === 0) return null;

            return (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs animate-fade-in" id="scm-product-recommendation-matrix-v1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div className="space-y-0.5">
                    <h3 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#b1191f]" />
                      <span>Product Recommendation Matrix V1</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">Industry-aware rules-based scoring & Serena's fiduciary justifications</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                      Ruleset: V1.0.4 Active
                    </span>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                      Sector: {recEngineData?.industryMatched || "General Core"}
                    </span>
                  </div>
                </div>

                {/* List Top 3 Recommendations and display matrix of all 8 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  
                  {/* Left Column: Top 3 recommendation detailed cards */}
                  <div className="lg:col-span-2 space-y-3">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Top 3 Recommended SCM Products (Ranked)</span>
                    <div className="space-y-3">
                      {finalMatrix.slice(0, 3).map((rec, idx) => (
                        <div key={rec.product} className={`p-4 rounded-xl border transition-all hover:shadow-xs ${
                          idx === 0 
                            ? 'bg-[#b1191f]/5 border-[#b1191f]/20' 
                            : 'bg-slate-50/50 border-slate-200'
                        }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">{idx + 1}. {rec.product}</span>
                                {idx === 0 ? (
                                  <span className="text-[8px] bg-[#b1191f] text-white font-black px-1.5 py-0.2 rounded uppercase tracking-wide">
                                    Prime SCM Selection
                                  </span>
                                ) : (
                                  <span className="text-[8px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded uppercase tracking-wide">
                                    Strategic Asset
                                  </span>
                                )}
                              </div>
                              <p className="text-[11.5px] leading-relaxed text-slate-700 font-medium mt-1">
                                {rec.reason}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-base font-black font-mono tracking-tight ${idx === 0 ? 'text-[#b1191f]' : 'text-slate-800'}`}>
                                {rec.score}
                              </span>
                              <span className="text-[9px] text-slate-400 uppercase font-black block leading-none">Match Score</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Full SCM Product Matrix Scores List (All 8 Products) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-4">
                    <div className="space-y-3 w-full">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Full Matrix SCM Alignment Rank</span>
                      <div className="space-y-2">
                        {finalMatrix.map((rec, idx) => (
                          <div key={rec.product} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200/50 last:border-0 font-medium pb-1.5">
                            <span className={`truncate mr-2 ${idx < 3 ? 'text-slate-800 font-bold' : 'text-slate-500'}`}>
                              {rec.product}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                <div 
                                  className={`h-full rounded-full ${idx === 0 ? 'bg-[#b1191f]' : (idx < 3 ? 'bg-slate-700' : 'bg-slate-400')}`} 
                                  style={{ width: `${rec.score}%` }}
                                />
                              </div>
                              <span className={`font-mono font-bold text-[11px] min-w-[20px] text-right ${idx < 3 ? 'text-slate-900 font-black' : 'text-slate-600'}`}>
                                {rec.score}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200 mt-2 text-[9px] text-slate-400 font-extrabold uppercase flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> SCM Rules Engine matching verified
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

          {/* SCM Redesigned Workspace Section with Tab Subnavigation */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
              <button
                onClick={() => setActiveSubTab('contacts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSubTab === 'contacts' 
                    ? 'bg-[#b1191f] text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Executive Discovery Board</span>
              </button>
              <button
                onClick={() => setActiveSubTab('growth')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSubTab === 'growth' 
                    ? 'bg-[#b1191f] text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Corporate Metrics & Tech Stack</span>
              </button>
              <button
                onClick={() => setActiveSubTab('meeting-prep')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSubTab === 'meeting-prep' 
                    ? 'bg-[#b1191f] text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Strategic Meeting Agenda</span>
              </button>
              <button
                onClick={() => setActiveSubTab('switchboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSubTab === 'switchboard' 
                    ? 'bg-[#b1191f] text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>switchboard directory</span>
              </button>
              <button
                onClick={() => setActiveSubTab('apollo-dossier')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSubTab === 'apollo-dossier' 
                    ? 'bg-[#b1191f] text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Verified Apollo Dossier</span>
              </button>
            </div>

            {/* TAB CONTENT: CONTACTS DIRECTORY */}
            {activeSubTab === 'contacts' && (
              <div className="space-y-4">
                
                {/* Category Classifier Pills */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs">
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold flex items-center gap-1">
                      <ListFilter className="w-3.5 h-3.5 text-slate-400" /> Filter Division:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {['All', 'Executive', 'Finance', 'Human Capital', 'Technology', 'Legal', 'Marketing', 'Operations'].map(pill => (
                        <button
                          key={pill}
                          onClick={() => setContactClassifier(pill)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            contactClassifier === pill 
                              ? 'bg-slate-800 text-white' 
                              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {pill}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-full sm:w-64 space-y-1 shrink-0">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold flex items-center gap-1">
                      <Search className="w-3.5 h-3.5 text-slate-400" /> Search Contacts:
                    </span>
                    <input
                      type="text"
                      value={localContactSearch}
                      onChange={(e) => setLocalContactSearch(e.target.value)}
                      placeholder="Search name, title, department..."
                      className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#b1191f] transition-all font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* SCM Count Reconciliation Panel (Phase 5) */}
                {selectedCo && (
                  <div className="bg-[#b1191f]/5 border border-[#b1191f]/20 rounded-xl p-4 space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#b1191f]/10 pb-2 gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#b1191f] uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-[#b1191f]" /> Apollo Contact Ownership Integrity Certificate
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 italic bg-white px-2 py-0.5 rounded border border-slate-200">
                        Status: 0% Silent Loss Certified
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white border border-slate-200 rounded-lg p-3 text-center space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Apollo Raw Count</span>
                        <div className="text-xl font-extrabold text-slate-800 tracking-tight font-mono">
                          {result?.apolloRawCount !== undefined ? result.apolloRawCount : (classifiedContacts.length + (result?.rejectedCount || 0))}
                        </div>
                        <span className="text-[9px] text-slate-400 block font-medium">Unfiltered Mixed Directory</span>
                      </div>

                      <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3 text-center space-y-1">
                        <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Verified {selectedCo.name} Employees</span>
                        <div className="text-xl font-extrabold text-emerald-700 tracking-tight font-mono">
                          {result?.verifiedCompanyCount !== undefined ? result.verifiedCompanyCount : classifiedContacts.length}
                        </div>
                        <span className="text-[9px] text-emerald-600 block font-medium">Ownership Integrity Confirmed</span>
                      </div>

                      <div className="bg-red-50/50 border border-red-200 rounded-lg p-3 text-center space-y-1">
                        <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider block">Rejected Foreign Records</span>
                        <div className="text-xl font-extrabold text-rose-700 tracking-tight font-mono">
                          {result?.rejectedCount !== undefined ? result.rejectedCount : 0}
                        </div>
                        <span className="text-[9px] text-rose-600 block font-medium">Non-Company Records Purged</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Discovered Cards List */}
                {classifiedContacts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classifiedContacts.map((c, index) => {
                      const displayKey = `c-${index}`;
                      return (
                        <div 
                          key={index} 
                          id={`contact-card-${displayKey}`}
                          onClick={() => {
                            setSelectedExecutive(c);
                            setIsDrawerOpen(true);
                          }}
                          className="bg-white border border-slate-200 hover:border-[#b1191f] rounded-xl p-4 shadow-xs relative flex flex-col justify-between transition-all hover:shadow-md cursor-pointer group animate-fade-in"
                        >
                          <div className="space-y-3">
                            {/* Phase 6 Badge: APOLLO PERSON MATCH */}
                            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg px-2.5 py-1 text-[9px] font-extrabold uppercase w-fit">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                              VERIFIED APOLLO CONTACT
                            </div>

                            <div className="flex items-start justify-between">
                              <div className="space-y-0.5">
                                <h4 className="font-bold text-slate-900 text-sm group-hover:text-[#b1191f] transition-all flex items-center gap-1">
                                  {c.fullName}
                                </h4>
                                <p className="text-[10px] text-[#b1191f] font-extrabold uppercase tracking-tight flex items-center gap-1">
                                  <Briefcase className="w-3 h-3 text-slate-400 shrink-0" /> {c.position}
                                </p>
                              </div>
                              <span 
                                onClick={(e) => e.stopPropagation()}
                                className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                                  c.priorityRank === 'Priority 1' 
                                    ? 'bg-red-50 text-[#b1191f] border-red-100' 
                                    : c.priorityRank === 'Priority 2'
                                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                }`}
                              >
                                {c.priorityRank || "Priority 1"}
                              </span>
                            </div>

                            {/* Phase 6 Required Fields Render Block */}
                            <div className="space-y-2 text-[10px] text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-400 uppercase text-[8px] w-20">Company:</span>
                                <span className="font-bold text-slate-900 truncate">
                                  {selectedCo?.name || c.organizationName || c.companyName || "Information Not Found"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-400 uppercase text-[8px] w-20">Department:</span>
                                <span className="font-medium text-slate-705 truncate">
                                  {c.department || "Information Not Found"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-400 uppercase text-[8px] w-20">Location:</span>
                                <span className="font-medium text-slate-705 truncate flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {(c as any).location || "Information Not Found"}
                                </span>
                              </div>
                              
                              <div className="border-t border-slate-200/60 my-1 pt-1.5 space-y-1.5 font-mono">
                                <div className="flex items-center justify-between text-[9px]">
                                  <span className="text-slate-400 text-[8px]">EMAIL:</span>
                                  {c.email && c.email !== "No Data Available" ? (
                                    <span 
                                      onClick={(e) => e.stopPropagation()}
                                      className={`px-1 py-0.5 rounded border max-w-[190px] truncate ${
                                        c.email.includes("Credit Required")
                                          ? "text-amber-700 font-bold bg-amber-50 border-amber-100"
                                          : "text-emerald-700 font-bold bg-emerald-50 border-emerald-100"
                                      }`} title={c.email}>
                                      {c.email}
                                    </span>
                                  ) : (
                                    <span 
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-red-700 font-semibold bg-red-50/50 px-1 py-0.5 rounded border border-red-100 uppercase">
                                      No Data Available
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between text-[9px]">
                                  <span className="text-slate-400 text-[8px]">PHONE:</span>
                                  {c.phone && c.phone !== "No Data Available" ? (
                                    <span 
                                      onClick={(e) => e.stopPropagation()}
                                      className={`px-1 py-0.5 rounded border max-w-[190px] truncate ${
                                        c.phone.includes("Credit Required")
                                          ? "text-amber-700 font-bold bg-amber-50 border-amber-100"
                                          : "text-emerald-700 font-bold bg-emerald-50 border-emerald-100"
                                      }`} title={c.phone}>
                                      {c.phone}
                                    </span>
                                  ) : (
                                    <span 
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-slate-500 font-semibold bg-slate-50 px-1 py-0.5 rounded border border-slate-150 uppercase">
                                      No Data Available
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between text-[9px]">
                                  <span className="text-slate-400 text-[8px]">LINKEDIN:</span>
                                  {c.linkedin && c.linkedin !== "Not Found" && c.linkedin !== "No Data Available" ? (
                                    <span 
                                      onClick={(e) => e.stopPropagation()}
                                      className={`px-1 py-0.5 rounded border max-w-[190px] truncate flex items-center gap-0.5 ${
                                        c.linkedin.includes("Credit Required")
                                          ? "text-amber-700 font-bold bg-amber-50 border-amber-100"
                                          : "text-indigo-700 font-bold bg-indigo-50 border-indigo-100"
                                      }`} title={c.linkedin}>
                                      <Linkedin className="w-2.5 h-2.5 shrink-0 text-indigo-500" /> {c.linkedin}
                                    </span>
                                  ) : (
                                    <span 
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-slate-400 font-medium uppercase">
                                      No Data Available
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-500 leading-normal line-clamp-2 italic text-justify">
                              "{c.bio}"
                            </p>
                          </div>

                          {/* Targeted SCM pitch hint */}
                          <div className="mt-3.5 p-2 bg-[#fce4ec]/40 border border-[#fce4ec]/80 rounded-lg text-[9px] space-y-0.5">
                            <span className="font-extrabold text-[#b1191f] uppercase block">Recommended SCM Pitch:</span>
                            <p className="text-slate-700 font-medium leading-normal">{c.recommendedPitch}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-slate-500">
                      Apollo returned no people or saved contacts for this organization.
                    </p>
                    <p className="text-[10px] text-slate-400">
                      SPIP checks Apollo People Search and your team's saved Apollo Contacts. Try another organization match if this company has no indexed people.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: METRICS & TECH STACK */}
            {activeSubTab === 'growth' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Tech specifications bento */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Database className="w-4 h-4 text-[#b1191f]" /> Technology Stack Specifications
                  </h4>
                  {selectedCo?.techStack && selectedCo.techStack.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCo.techStack.map((tech) => (
                        <span key={tech} className="text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-0.8 rounded-md font-mono text-slate-600 transition-all font-bold">
                          {tech}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">No technology stacks listed in Apollo registers for this commercial target.</p>
                  )}
                </div>

                {/* Company Growth Factors */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <TrendingUp className="w-4 h-4 text-[#b1191f]" /> Registered Growth Indicators
                  </h4>
                  <div className="space-y-2.5 text-[11px]">
                    <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg flex justify-between items-center">
                      <span className="font-bold text-slate-500">Corporate Sector Growth</span>
                      <span className="font-semibold text-slate-900 text-right">{result.growthIndicators.companyGrowth}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg flex justify-between items-center">
                      <span className="font-bold text-slate-500">Treasury / Cash Liquidity Rate</span>
                      <span className="font-semibold text-slate-900 text-right">{result.growthIndicators.treasuryOpportunity}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg flex justify-between items-center">
                      <span className="font-bold text-slate-500">Employee Scale Rate</span>
                      <span className="font-semibold text-slate-900 text-right">{result.growthIndicators.employeeInvestment}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: STRATEGIC MEETING BRIEF */}
            {activeSubTab === 'meeting-prep' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Meeting Talking points & before facts */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2 uppercase tracking-wide">
                    <FileText className="w-4 h-4 text-[#b1191f]" /> Talking Points agenda
                  </h4>
                  <ul className="space-y-2">
                    {result.meetingPrep.talkingPoints.map((point, i) => (
                      <li key={i} className="text-[11px] leading-relaxed text-slate-600 pl-3 border-l-2 border-[#b1191f]">
                        {point}
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <h5 className="text-[10px] text-slate-400 font-extrabold uppercase">Verified Registry Facts</h5>
                    <ul className="space-y-1.5">
                      {result.meetingPrep.beforeMeetingFacts.map((fact, i) => (
                        <li key={i} className="text-[10px] leading-relaxed text-slate-500 font-medium flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Tactical handling for objections */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2 uppercase tracking-wide">
                    <BadgeAlert className="w-4 h-4 text-[#b1191f]" /> Fiduciary Objections & Responding Playbook
                  </h4>
                  <div className="space-y-3.5">
                    {result.meetingPrep.objections.map((obj, i) => (
                      <div key={i} className="p-3 bg-red-50/50 border border-red-100 rounded-lg space-y-1.5">
                        <div className="flex gap-1.5 items-start">
                          <span className="text-[9px] bg-red-100 text-[#b1191f] px-1.5 py-0.2 rounded font-extrabold uppercase">Objection</span>
                          <p className="text-[11px] font-bold text-slate-800 leading-tight">{obj.objection}</p>
                        </div>
                        <div className="flex gap-1.5 items-start pl-2 border-l border-slate-300">
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-extrabold uppercase">SCM Response</span>
                          <p className="text-[11px] text-slate-600 leading-normal text-justify font-medium">{obj.scmResponse}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-3.5 space-y-1.5 text-[10px] text-slate-500 font-medium">
                    <span className="font-extrabold uppercase block text-slate-400">strategic actions post-meeting</span>
                    {result.meetingPrep.followUpActions.map((act, i) => (
                      <p key={i} className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-[#b1191f]" /> {act}
                      </p>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: SWITCHBOARD OFFICIAL DIRECTORY */}
            {activeSubTab === 'switchboard' && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-[#b1191f]" /> Switchboard & Corporate Domain Registries
                  </h4>
                  <p className="text-[10px] text-slate-500">Factual telephone and electronic directories scraped from official investor channels.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg space-y-1 relative">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Switchboard Telephone</span>
                    <span className="font-bold text-slate-900 block text-xs">{result.publicDirectory.switchboard}</span>
                    <span className="text-[8px] text-slate-500 block truncate leading-tight">Source: {result.publicDirectory.switchboardSource}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg space-y-1">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Investor Relations IR</span>
                    <span className="font-bold text-[#b1191f] block text-xs truncate select-all">{result.publicDirectory.investorRelations}</span>
                    <span className="text-[8px] text-slate-500 block truncate leading-tight">Source: {result.publicDirectory.investorRelationsSource}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg space-y-1">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Human Capital Division</span>
                    <span className="font-bold text-slate-800 block text-xs truncate select-all">{result.publicDirectory.hrContact}</span>
                    <span className="text-[8px] text-slate-500 block truncate leading-tight">Source: {result.publicDirectory.hrContactSource}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg space-y-1">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Corporate Communications</span>
                    <span className="font-bold text-slate-800 block text-xs truncate select-all">{result.publicDirectory.corporateAffairs}</span>
                    <span className="text-[8px] text-slate-500 block truncate leading-tight">Source: {result.publicDirectory.corporateAffairsSource}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg space-y-1">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">General Administration</span>
                    <span className="font-bold text-slate-800 block text-xs truncate select-all">{result.publicDirectory.generalInquiryEmail}</span>
                    <span className="text-[8px] text-slate-500 block truncate leading-tight">Source: {result.publicDirectory.generalInquiryEmailSource}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: VERIFIED APOLLO DOSSIER */}
            {activeSubTab === 'apollo-dossier' && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2 uppercase tracking-wide">
                    <Database className="w-4 h-4 text-[#b1191f]" /> Verified Apollo Source of Truth
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">This dossier represents the original, unaltered dataset compiled from official Apollo registers. No estimates, calculations, or local currency conversions have been applied.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* General Profile Metadata */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Institutional Registry Profile</span>
                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Legal Corporate Name</span>
                        <span className="font-bold text-slate-800">{result.overview.name || "Not Available"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Primary Domain</span>
                        <span className="font-bold text-slate-800">{result.overview.website || "Not Available"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Industry Classification</span>
                        <span className="font-bold text-slate-800">{result.overview.industry || "Not Available"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Corporate Scale Category</span>
                        <span className="font-bold text-slate-800">{result.overview.companyType || "Not Available"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Year Founded</span>
                        <span className="font-bold text-slate-800">{result.overview.yearFounded || "Not Available"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Headquarters Address</span>
                        <span className="font-bold text-slate-800 text-right">{result.overview.headquarters || "Not Available"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Official LinkedIn</span>
                        <span className="font-bold text-[#b1191f] truncate max-w-[180px]">{result.overview.linkedinUrl || "Not Available"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Unaltered Employee Count</span>
                        <span className="font-bold text-slate-800">{result.overview.employeeCount || "Not Available"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Annual Revenue (USD)</span>
                        <span className="font-bold text-emerald-600">{result.overview.revenueValue || "Not Available"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Funding & Finance Specifications */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Capital & Funding Matrix</span>
                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Total Capital Raised</span>
                        <span className="font-bold text-slate-800">
                          {result.overview.total_funding ? `$${result.overview.total_funding.toLocaleString()}` : "Not Available"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Hiring Job Openings</span>
                        <span className="font-bold text-slate-800">
                          {result.overview.hiring_trends !== undefined ? `${result.overview.hiring_trends} active listings` : "Not Available"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Funding Rounds Registered</span>
                        <span className="font-bold text-slate-800">
                          {result.overview.funding_rounds && result.overview.funding_rounds.length > 0 
                            ? `${result.overview.funding_rounds.length} rounds` 
                            : "Not Available"}
                        </span>
                      </div>
                      {result.overview.funding_rounds && result.overview.funding_rounds.length > 0 && (
                        <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-300">
                          {result.overview.funding_rounds.slice(0, 3).map((round: any, i: number) => (
                            <div key={i} className="text-[9px] text-slate-500 flex justify-between">
                              <span>Round {round.round || i+1} ({round.date || "Date Unspecified"})</span>
                              <span className="font-semibold text-slate-700">${round.amount?.toLocaleString() || "Unspecified"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Keywords & Technologies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Target Keywords / Market Segments</span>
                    {result.overview.keywords && result.overview.keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {result.overview.keywords.map((kw: string) => (
                          <span key={kw} className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-600 font-semibold">
                            {kw}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Not Available</span>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Technology Stack Stackspec</span>
                    {result.overview.techStack && result.overview.techStack.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {result.overview.techStack.map((tech: string) => (
                          <span key={tech} className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-600 font-semibold">
                            {tech}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Not Available</span>
                    )}
                  </div>
                </div>

                {/* Additional Apollo Insights: Similar Companies, Signals & Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Similar Companies */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Apollo Similar Organizations</span>
                    {result.overview.similar_companies && result.overview.similar_companies.length > 0 ? (
                      <div className="space-y-1.5">
                        {result.overview.similar_companies.slice(0, 5).map((co: any, i: number) => (
                          <div key={i} className="text-[11px] flex justify-between items-center bg-white p-1.5 rounded border border-slate-100">
                            <span className="font-bold text-slate-700">{co.name || co.organization_name}</span>
                            <span className="text-[9px] font-mono text-slate-400">{co.domain}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 block">Not Available</span>
                    )}
                  </div>

                  {/* Signals */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Apollo Real-time Signals</span>
                    {result.overview.signals && result.overview.signals.length > 0 ? (
                      <div className="space-y-1.5">
                        {result.overview.signals.map((sig: any, i: number) => (
                          <div key={i} className="text-[10px] bg-white p-1.5 rounded border border-slate-100 space-y-0.5">
                            <span className="font-bold text-slate-800 uppercase text-[8px] tracking-wider block text-[#b1191f]">{sig.type}</span>
                            <p className="text-slate-600 leading-tight">{sig.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 block">Not Available</span>
                    )}
                  </div>

                  {/* Organization Metadata */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Apollo Core Metadata</span>
                    {result.overview.metadata ? (
                      <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-500">Subindustry</span>
                          <span className="font-bold text-slate-700">{result.overview.metadata.subindustry || "Not Available"}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-500">Market Capitalization</span>
                          <span className="font-bold text-slate-700">
                            {result.overview.metadata.market_cap ? `$${result.overview.metadata.market_cap.toLocaleString()}` : "Not Available"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-500">Retail Locations</span>
                          <span className="font-bold text-slate-700">{result.overview.metadata.retail_locations || "Not Available"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Last Funding Date</span>
                          <span className="font-bold text-slate-700">{result.overview.metadata.last_funding_round_date || "Not Available"}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 block">Not Available</span>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* SCM CRM PROACTIVE BD COCKPIT: SERENA AI & PERSONALIZED EMAIL SYNTHESIZER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Serena AI dialogue wing */}
        <div id="serena-ai-chamber" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between h-[450px]">
          <div className="space-y-1.5 border-b border-slate-100 pb-3">
            <h3 className="font-display font-semibold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-[#b1191f] animate-pulse" />
              <span>Serena: SCM Institutional AI assistant</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Ask Serena tactical recommendations about SCM money markets, private trusts, or follow-up timelines</p>
          </div>

          {/* Chat log wrapper */}
          <div className="grow overflow-y-auto space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs scrollbar-thin">
            {serenaMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-2.5 rounded-lg max-w-[85%] leading-relaxed ${msg.sender === 'user' ? 'bg-[#b1191f] text-white' : 'bg-white text-slate-705 border border-slate-200/80 shadow-xs'}`}>
                  <span className="font-bold block text-[9px] uppercase tracking-wider mb-0.5">{msg.sender === 'user' ? 'Relationship Manager' : 'Serena AI'}</span>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {isSerenaLoading && (
              <div className="flex justify-start">
                <div className="p-2.5 bg-white text-slate-600 border border-slate-200/80 rounded-lg shadow-xs flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-slate-200 border-t-[#b1191f] rounded-full animate-spin"></div>
                  <span className="text-[10px] font-medium animate-pulse">Serena modeling portfolio outcomes...</span>
                </div>
              </div>
            )}
          </div>

          {/* Form input */}
          <form onSubmit={handleSerenaSubmit} className="flex gap-2 pt-1">
            <input 
              type="text"
              id="serena-dialog-input"
              value={serenaQuery}
              onChange={(e) => setSerenaQuery(e.target.value)}
              placeholder="e.g. recommend products... OR high score list... OR Guinness follow-up"
              className="grow bg-slate-50 focus:bg-white text-xs border border-slate-200 focus:border-[#b1191f] rounded-lg px-3 py-2 outline-none font-medium text-slate-800 focus:ring-1 focus:ring-[#b1191f] transition-all"
              disabled={isSerenaLoading}
            />
            <button
              type="submit"
              id="serena-submit-btn"
              disabled={isSerenaLoading || !serenaQuery.trim()}
              className="bg-[#b1191f] text-white hover:bg-[#8e1217] text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer outline-none"
            >
              Ask
            </button>
          </form>
        </div>

        {/* Personalized email generator wing */}
        <div id="email-synthesizer-chamber" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between h-[450px]">
          <div className="space-y-1.5 border-b border-slate-100 pb-3">
            <h3 className="font-display font-semibold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Mail className="w-4 h-4 text-[#b1191f]" />
              <span>Smart Outreach Email Synthesizer (Gemini V2)</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Generate high-yield cold briefs, literacy session invites, or short term placement proposals</p>
          </div>

          <div className="grow overflow-y-auto space-y-3 pr-1 text-xs scrollbar-thin">
            {outreachResult ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3 font-sans">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-[9px] font-black uppercase text-slate-400">Customized SCM Corporate Briefing Letter</span>
                  <button
                    id="copy-generated-outreach-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(outreachResult);
                      setOutreachCopied(true);
                      setTimeout(() => setOutreachCopied(false), 2000);
                    }}
                    className="text-[10px] font-bold text-[#b1191f] hover:underline flex items-center gap-1 cursor-pointer outline-none"
                  >
                    {outreachCopied ? 'Copied' : 'Copy Email'}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed text-[11px] h-48 overflow-y-auto scrollbar-thin">{outreachResult}</pre>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Executive Name</label>
                  <input 
                    type="text" 
                    id="outreach-exec-input"
                    value={outreachExec} 
                    onChange={(e) => setOutreachExec(e.target.value)}
                    placeholder="e.g. Modupe Kadri"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-350 focus:border-[#b1191f] text-xs rounded-lg p-2 outline-none font-medium transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Executive Rank / Persona</label>
                  <input 
                    type="text" 
                    id="outreach-pos-input"
                    value={outreachPos} 
                    onChange={(e) => setOutreachPos(e.target.value)}
                    placeholder="e.g. CFO"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-350 focus:border-[#b1191f] text-xs rounded-lg p-2 outline-none font-medium transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Company Division</label>
                  <input 
                    type="text" 
                    id="outreach-company-input"
                    value={outreachCompany} 
                    onChange={(e) => setOutreachCompany(e.target.value)}
                    placeholder="e.g. MTN Nigeria"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-310 focus:border-[#b1191f] text-xs rounded-lg p-2 outline-none font-medium transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Industry Sector</label>
                  <input 
                    type="text" 
                    id="outreach-industry-input"
                    value={outreachIndustry} 
                    onChange={(e) => setOutreachIndustry(e.target.value)}
                    placeholder="e.g. Telecommunications"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-310 focus:border-[#b1191f] text-xs rounded-lg p-2 outline-none font-medium transition-all"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Strategic Advisory Pitch Type</label>
                  <select 
                    id="outreach-pitch-type-select"
                    value={outreachType} 
                    onChange={(e) => setOutreachType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs rounded-lg p-2 outline-none font-semibold transition-all"
                  >
                    <option value="meeting">SCM overnight custom placements (CFO/Treasuries)</option>
                    <option value="literacy">Staff Financial Empowerment Corporate Seminar (HR Teams)</option>
                    <option value="trust">Private Family/Corporate Legacy Trust Foundations (HNW/MDs)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 border-t border-slate-100 pt-3">
            {outreachResult && (
              <button
                id="reset-outreach-form-btn"
                onClick={() => setOutreachResult('')}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg border border-slate-200 transition-colors cursor-pointer outline-none"
              >
                Assemble New Pitch
              </button>
            )}
            <button
              id="generate-outreach-trigger-btn"
              onClick={handleGenerateOutreach}
              disabled={isOutreachLoading || !outreachExec?.trim() || !outreachCompany?.trim()}
              className="bg-[#b1191f] text-white hover:bg-[#8e1217] disabled:bg-slate-100 disabled:text-slate-400 font-bold text-xs px-4 py-2 rounded-lg grow justify-center flex items-center gap-1.5 transition-all shadow-sm cursor-pointer outline-none"
            >
              {isOutreachLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isOutreachLoading ? 'Synthesizing Strategic Copy...' : outreachResult ? 'Regenerate Email Copy' : 'Generate Highly Persuasive Pitch'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* STEP 6: EXECUTIVE DETAIL SLIDING DRAWER CONTROL */}
      {isDrawerOpen && selectedExecutive && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Overlay backdrop */}
            <div 
              className="absolute inset-0 bg-slate-900 bg-opacity-70 transition-opacity" 
              onClick={() => setIsDrawerOpen(false)}
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 md:pl-16">
              <div className="pointer-events-auto w-screen max-w-md">
                <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl border-l border-slate-250">
                  <div className="bg-slate-900 px-6 py-6 text-white relative">
                    <div className="absolute right-4 top-4">
                      <button 
                        onClick={() => setIsDrawerOpen(false)}
                        className="text-slate-405 hover:text-white rounded-md outline-none focus:ring-1 focus:ring-white p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] bg-[#b1191f] text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        Apollo verified decision maker
                      </span>
                      <h3 className="text-base font-black tracking-tight" id="slide-over-title">{selectedExecutive.fullName}</h3>
                      <p className="text-xs text-slate-400 font-semibold">{selectedExecutive.position} — {selectedCo?.name}</p>
                    </div>
                  </div>

                  <div className="relative flex-1 px-6 py-6 space-y-6">
                    
                    {/* Professional Summary */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <FileText className="w-4 h-4 text-[#b1191f]" /> Executive Summary Profile
                      </h4>
                      <p className="text-xs leading-relaxed text-slate-650 bg-slate-50 border border-slate-100 p-3 rounded-lg italic text-justify">
                        "{selectedExecutive.bio}"
                      </p>
                    </div>

                    {/* Verified Contact Details card segment */}
                    <div className="space-y-2.5">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Lock className="w-4 h-4 text-emerald-600" /> Verified Contact details
                      </h4>
                      <div className="border border-slate-150 rounded-xl p-3.5 bg-slate-50 space-y-2 text-xs">
                        <div className="flex flex-col gap-1 pb-2 border-b border-slate-200/60">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500 flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-slate-400" /> Corporate Email
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-800 select-all">{selectedExecutive.email}</span>
                              <button 
                                onClick={() => copyToClipboard(selectedExecutive.email, 'drawer-email')}
                                className="text-[#b1191f] hover:underline"
                              >
                                {copiedStates['drawer-email'] ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          {selectedExecutive.emailValidationType && (
                            <div className="text-right">
                              <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border inline-block ${
                                selectedExecutive.emailValidationType === 'VERIFIED APOLLO CONTACT'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-250/60'
                                  : 'bg-amber-50 text-amber-700 border-amber-250/60'
                              }`}>
                                {selectedExecutive.emailValidationType}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-1 pb-2 border-b border-slate-200/60">
                          <span className="font-bold text-slate-500 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Phone
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-800 select-all">{selectedExecutive.phone}</span>
                            <button 
                              onClick={() => copyToClipboard(selectedExecutive.phone, 'drawer-phone')}
                              className="text-[#b1191f] hover:underline"
                            >
                              {copiedStates['drawer-phone'] ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-slate-500 flex items-center gap-1 border-none pb-0">
                            <Linkedin className="w-3.5 h-3.5 text-sky-600 animate-pulse" /> LinkedIn Profile
                          </span>
                          <a 
                            href={`https://${selectedExecutive.linkedin}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-sky-600 font-semibold hover:underline flex items-center gap-0.5"
                          >
                            Open Profile <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* SCM targeted pitch and pitch reasoning */}
                    <div className="space-y-2.5">
                      <h4 className="text-[10px] font-extrabold text-[#b1191f] uppercase tracking-widest flex items-center gap-1">
                        <Award className="w-4 h-4 text-[#b1191f]" /> SCM Capital Marketing Position
                      </h4>
                      <div className="border border-[#fce4ec] bg-[#fce4ec]/20 p-4 rounded-xl space-y-2.5 text-xs">
                        <div>
                          <span className="text-[10px] text-[#b1191f] font-extrabold uppercase block">Assigned Proposal Strategy</span>
                          <span className="font-bold text-slate-900 block mt-0.5">{selectedExecutive.recommendedPitch}</span>
                        </div>
                        <div className="border-t border-[#fce4ec]/80 pt-2 bg-transparent text-[11px] text-slate-650 leading-relaxed text-justify">
                          <strong className="text-slate-800 font-semibold">Pitch Logic:</strong> {selectedExecutive.pitchReason}
                        </div>
                      </div>
                    </div>

                    {/* Verification score indices */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                      <span>Source: {selectedExecutive.source}</span>
                      <span className="text-emerald-700 font-extrabold">Accuracy Score: {selectedExecutive.confidenceScore}%</span>
                    </div>

                  </div>

                  <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 text-right">
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer outline-none transition-colors"
                    >
                      Close Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
