import React, { useState } from 'react';
import { 
  HelpCircle, 
  BookOpen, 
  CheckCircle2, 
  HelpCircle as FaqIcon, 
  PlayCircle, 
  Sparkles, 
  X, 
  ShieldCheck, 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  Compass, 
  Cpu, 
  Database,
  Lock,
  Workflow
} from 'lucide-react';

interface TrustHelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const TrustHelpCenter: React.FC<TrustHelpCenterProps> = ({
  isOpen,
  onClose,
  onStartTour,
  activeTab,
  setActiveTab
}) => {
  const [activeSegment, setActiveSegment] = useState<'faqs' | 'videos' | 'quickstart'>('quickstart');
  const [searchFilter, setSearchFilter] = useState('');
  const [ticketStatus, setTicketStatus] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'Technical Assit',
    body: ''
  });

  const faqs = [
    {
      q: "How does SCM SPIP prevent AI hallucinations of financial figures?",
      a: "The SCM platform integrates a strict double-layered Trust-First Verification Engine. Before displaying any compiled data, the system performs WHOIS domain resolution checks, validates company registration indexes with regional securities registries (CAC, SEC Nigeria), and verifies executive records. Fictional search inputs are blocked, returning 'Information not found from trusted public sources.'"
    },
    {
      q: "What does the SCM matching and opportunity score represent?",
      a: "The match score evaluates an organization suitable alignment for SCM commercial products. High-headcount corporations rank fast for Financial Literacy training programs. Cash-heavy conglomerates are flagged for premium overnight Money Market Mutual Funds, while C-Suite stakes qualify for Discretionary Private Wealth trusts."
    },
    {
      q: "Where do we find source attributions for phone numbers or emails?",
      a: "Every single record displayed on the Intelligence page contains a Source Attribution Tag and a Confidence Score of High, Medium, or Low. These tags link back to actual NSE filings, NCC telco indexes, annual reports, or official corporate websites."
    },
    {
      q: "Can standard Relationship Managers override unverified data?",
      a: "No. Standard officers cannot fabricate or manually insert unverified organization records. Only Directors and Admins can audit records, check validation failures, and override unverified states."
    }
  ];

  const filteredFaqs = faqs.filter(f => 
    f.q.toLowerCase().includes(searchFilter.toLowerCase()) || 
    f.a.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const videoTutorials = [
    {
      title: "Compiling a CAC-Verified Client Dossier",
      duration: "3 mins 12 secs",
      topic: "Intelligence Module",
      thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      desc: "Learn how to use our double-check framework to query corporate treasuries with zero hallucination risk."
    },
    {
      title: "Configuring Money Market & Treasury Placements",
      duration: "4 mins 45 secs",
      topic: "Client Customization",
      thumbnail: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      desc: "Setting priority thresholds, analyzing interest rate buffers, and forwarding standard PDFs."
    },
    {
      title: "Managing the Corporate Pension & Literacy Cascade",
      duration: "2 mins 55 secs",
      topic: "Human Capital Outreach",
      thumbnail: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      desc: "A full guide to logging savings group seminars and tracking conversion pipeline ratios."
    }
  ];

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.body.trim()) return;
    setTicketStatus('submitting');
    setTimeout(() => {
      setTicketStatus('success');
      setTicketForm({ subject: '', category: 'Technical Assist', body: '' });
      setTimeout(() => setTicketStatus(null), 4000);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-250 font-sans">
      
      {/* Header Panel */}
      <div className="p-5 bg-brand-neutral text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-brand flex items-center justify-center text-white">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm tracking-tight">SCM Capital Help & Trust Center</h3>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">System Version 3.5 LTS</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors outline-none cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="border-b border-slate-100 flex text-xs font-semibold bg-slate-50">
        <button
          onClick={() => setActiveSegment('quickstart')}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            activeSegment === 'quickstart' ? 'border-[#b1191f] text-[#b1191f] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Quick Start Guide
        </button>
        <button
          onClick={() => setActiveSegment('faqs')}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            activeSegment === 'faqs' ? 'border-[#b1191f] text-[#b1191f] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          F.A.Q. Support
        </button>
        <button
          onClick={() => setActiveSegment('videos')}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            activeSegment === 'videos' ? 'border-[#b1191f] text-[#b1191f] bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Video Courses
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* 1. QUICK START TAB */}
        {activeSegment === 'quickstart' && (
          <div className="space-y-5">
            
            {/* Guide Tour Launcher Banner */}
            <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#b1191f]" />
                <h4 className="font-extrabold text-xs text-[#b1191f] uppercase tracking-wide">First Time Onboarding?</h4>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
                Take our fully guided step-by-step interactive onboarding program. Learn key pipelines, discover verified prospects, and review audit parameters.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onStartTour();
                }}
                className="w-full bg-[#b1191f] hover:bg-[#8e1217] text-white font-bold text-xs py-2 rounded-lg transition-colors shadow-xs"
              >
                Launch Fully Guided System Tour
              </button>
            </div>

            {/* General System Workflow Steps */}
            <div className="space-y-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SCM Operational Blueprint</span>
              
              <div className="space-y-4">
                
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                    1
                  </div>
                  <div className="space-y-0.5 text-xs text-slate-600">
                    <h5 className="font-bold text-slate-900 block">Perform Verified Search</h5>
                    <p className="leading-relaxed">Use the <strong>SCM Prospect Intelligence Radar</strong> to search prospects. DNS checks and CAC registries auto-trigger to validate details instantly.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                    2
                  </div>
                  <div className="space-y-0.5 text-xs text-slate-600">
                    <h5 className="font-bold text-slate-900 block">Link to CRM Core</h5>
                    <p className="leading-relaxed">Click 'Push Prospect to Database' to sync CAC profile info, executive boards and recommended strategies with the main SCM database.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                    3
                  </div>
                  <div className="space-y-0.5 text-xs text-slate-600">
                    <h5 className="font-bold text-slate-900 block">Cascade Operations</h5>
                    <p className="leading-relaxed">Log meetings, schedule financial literacy briefs with HR units, pitch money market placements, and track performance scores securely.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Support Ticket Section */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Self-Service Helpdesk</span>
              
              <form onSubmit={handleSubmitTicket} className="space-y-2.5 bg-slate-55 p-3 border border-slate-200/80 rounded-xl">
                <div>
                  <label className="text-[9px] text-slate-500 font-bold block uppercase mb-1">Subject / Issue Overview</label>
                  <input 
                    type="text" 
                    value={ticketForm.subject}
                    onChange={e => setTicketForm({...ticketForm, subject: e.target.value})}
                    placeholder="e.g. CAC API lookup timeout"
                    className="w-full bg-white border border-slate-200 focus:border-[#b1191f] focus:outline-none rounded-lg p-2 text-xs text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 font-bold block uppercase mb-1">Incident Classification</label>
                  <select 
                    value={ticketForm.category}
                    onChange={e => setTicketForm({...ticketForm, category: e.target.value})}
                    className="w-full bg-white border border-slate-200 focus:border-[#b1191f] focus:outline-none rounded-lg p-2 text-xs text-slate-800"
                  >
                    <option>Technical Assist</option>
                    <option>Data Verification Required</option>
                    <option>Simulation Role override</option>
                    <option>Other Feedback</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 font-bold block uppercase mb-1">Incident Report Details</label>
                  <textarea 
                    value={ticketForm.body}
                    onChange={e => setTicketForm({...ticketForm, body: e.target.value})}
                    rows={2}
                    placeholder="Explain what failed validation or is returning inaccurate results..."
                    className="w-full bg-white border border-slate-200 focus:border-[#b1191f] focus:outline-none rounded-lg p-2 text-xs text-slate-800"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                  disabled={ticketStatus === 'submitting'}
                >
                  {ticketStatus === 'submitting' ? 'Filing Ticket...' : 'File Support Incident'}
                </button>

                {ticketStatus === 'success' && (
                  <div className="p-2 border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold text-center rounded-lg animate-pulse">
                    Incident successfully filed. SCM System operator notified.
                  </div>
                )}
              </form>
            </div>

          </div>
        )}

        {/* 2. FAQS SUPPORT TAB */}
        {activeSegment === 'faqs' && (
          <div className="space-y-4">
            
            {/* Search filter input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search our standard knowledge base..."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] focus:outline-none pl-8 pr-3 py-1.5 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-3.5">
              {filteredFaqs.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">No matching FAQs discovered.</p>
              ) : (
                filteredFaqs.map((f, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <h5 className="font-extrabold text-slate-900 text-xs flex gap-1.5">
                      <span className="text-[#b1191f]">Q:</span>
                      <span>{f.q}</span>
                    </h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed text-justify pl-3 pt-0.5 border-l border-slate-300">
                      {f.a}
                    </p>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* 3. VIDEOS SUPPORT TAB */}
        {activeSegment === 'videos' && (
          <div className="space-y-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Interactive Learning Classrooms</span>
            
            <div className="space-y-4">
              {videoTutorials.map((v, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors group">
                  <div className="h-28 relative bg-slate-900 flex items-center justify-center overflow-hidden">
                    <img 
                      src={v.thumbnail} 
                      alt={v.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                    />
                    <PlayCircle className="w-10 h-10 text-white cursor-pointer hover:scale-110 hover:text-[#b1191f] transition-all z-10 filter drop-shadow-md" />
                    <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      {v.duration}
                    </span>
                    <span className="absolute top-2 left-2 bg-[#b1191f] text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
                      {v.topic}
                    </span>
                  </div>
                  <div className="p-3 bg-white space-y-1">
                    <h6 className="font-bold text-xs text-slate-900 group-hover:text-[#b1191f] transition-colors">{v.title}</h6>
                    <p className="text-[10px] text-slate-500 leading-normal">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* Footer Branding panel */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400">
        <p className="font-semibold text-slate-500">SCM Capital Investment & Wealth Advisory</p>
        <p className="mt-0.5">Strict Trust, Absolute Verification, Capital Growth</p>
      </div>

    </div>
  );
};


// ==========================================
// GUIDED ONBOARDING SYSTEM TOUR DIALOG
// ==========================================
interface OnboardingWizardProps {
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  currentStep,
  onNext,
  onPrev,
  onClose,
  activeTab,
  setActiveTab
}) => {
  
  const steps = [
    {
      title: "Welcome to SCM Capital SPIP",
      desc: "Welcome to SCM Capital's Prospect Intelligence Platform. This workspace actively helps our Advisory Officers discover high-yield opportunities, establish staff mutual savings projects, and schedule presentations.",
      actions: "Let's review the main dashboard widgets first.",
      icon: Compass,
      tab: "dashboard"
    },
    {
      title: "Our Trust-First Architecture & Verification Layer",
      desc: "SCM Capital maintains zero tolerance for fictional information (hallucinations). Every profile or switchboard search is automatically checked against physical registries and DNS servers. Unverified searches are instantly blocked.",
      actions: "Verify email, website, and phone indicators confidently using this rule.",
      icon: ShieldCheck,
      tab: "dashboard"
    },
    {
      title: "Prospect Intelligence Dossier Engine",
      desc: "Query active Nigerian corporations (e.g. MTN, Dangote, Zenith Bank) in this dedicated research hub. SCM Capital automatically crawls public indices and yields matching strategies.",
      actions: "To test this, let's navigate to the 'Intelligence' module.",
      icon: Cpu,
      tab: "intelligence"
    },
    {
      title: "Source Attributions & Confidence Marks",
      desc: "Beside every phone line, email inbox, or CAC registry detail, you will see explicit Source Citations (e.g., NCC active operators, SEC filings) and a Confidence Rating (High, Medium, Low). We do not guess.",
      actions: "Look for lock indicators beside each record to inspect source integrity.",
      icon: Database,
      tab: "intelligence"
    },
    {
      title: "Prospect Administration Pipeline",
      desc: "Track client negotiations, prospective mutual fund placement values, and follow-up activities securely. Complete logs easily via our role-based authorization rules.",
      actions: "Let's explore active client targets in 'Prospects'.",
      icon: Workflow,
      tab: "prospects"
    },
    {
      title: "Meetings & Pension Literacy Campaigns Logs",
      desc: "Outreach strategy is central. Use the Meetings and Activities logs to log institutional pitches, staff interest cooperative schemes, and follow-up schedules.",
      actions: "Let's view calendar events and activities blocks.",
      icon: CheckCircle2,
      tab: "activities"
    },
    {
      title: "Admin Audits & Integrity Performance",
      desc: "Administrators and Directors can track all lookup operations, verification failures, and CAC lookups via our in-memory live security logs.",
      actions: "You are fully trained! Use SCM SPIP responsibly to build robust corporate trusts.",
      icon: Lock,
      tab: "settings"
    }
  ];

  const cStep = steps[currentStep] || steps[0];

  React.useEffect(() => {
    // Automatically switch tabs for SCM staff based on active tour step!
    if (activeTab !== cStep.tab) {
      setActiveTab(cStep.tab);
    }
  }, [currentStep]);

  return (
    <div className="fixed inset-0 bg-slate-950/60 z-60 flex items-center justify-center p-4 min-h-screen">
      <div className="bg-white border border-slate-300 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-90 duration-200">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-[10px] bg-red-100 text-[#b1191f] font-extrabold uppercase px-2 py-0.5 rounded">
            Interactive Tour: Step {currentStep + 1} of {steps.length}
          </span>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-all outline-none cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content Layout */}
        <div className="flex gap-4 items-start py-2">
          <div className="p-3 bg-[#fce4ec] rounded-2xl text-[#b1191f] shrink-0">
            {React.createElement(cStep.icon, { className: "w-8 h-8" })}
          </div>
          <div className="space-y-1.5 flex-1 text-justify">
            <h4 className="font-display font-extrabold text-sm text-slate-900 text-left">
              {cStep.title}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              {cStep.desc}
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mt-2">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase block mb-1">Interactive Prompt Action:</span>
              <p className="text-xs text-[#b1191f] font-bold">{cStep.actions}</p>
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            onClick={onPrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-1 font-bold text-xs px-3 py-1.5 rounded-lg border ${
              currentStep === 0 ? 'text-slate-300 border-slate-100 cursor-not-allowed' : 'text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <span 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full ${i === currentStep ? 'bg-[#b1191f]' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={onNext}
              className="bg-[#b1191f] hover:bg-[#8e1217] text-white font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                localStorage.setItem('scm_onboarded', 'true');
                onClose();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition-colors"
            >
              Finish Tour
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
