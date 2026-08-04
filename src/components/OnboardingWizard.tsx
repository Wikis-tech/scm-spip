import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  FileText, 
  Users, 
  Activity, 
  Calendar, 
  ShieldCheck, 
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScmLogo } from './ScmLogo';

interface OnboardingWizardProps {
  onClose: () => void;
  setActiveTab: (tab: string) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ 
  onClose,
  setActiveTab
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "SCM Asset Management Intelligence",
      description: "Welcome to SCM Capital's Elite Sales Intelligence Platform. Tailored for our advisory & business development team to securely handle B2B mandate agreements and prospect management.",
      illustration: (
        <div className="flex flex-col items-center justify-center py-6">
          <ScmLogo variant="color" size="xl" />
          <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-4">
            Securing Sovereign Portfolios
          </p>
        </div>
      ),
      actionLabel: "Begin Intelligence Briefing",
      targetTab: "dashboard"
    },
    {
      title: "1. Search for a Company",
      description: "Trigger real-time web crawlers on major target clients. Enter MTN, Oando, Dangote, Guinness, or Nigerian Breweries in the search box inside the SCM Prospect Intelligence screen.",
      illustration: (
        <div id="tour-ill-1" className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-slate-700 animate-pulse">Search: "Dangote Group"</span>
          </div>
          <div className="h-10 bg-slate-100 rounded-md flex items-center px-3 border border-slate-200/50">
            <span className="text-[10px] text-slate-400 font-mono">Fetching public & certified registries...</span>
          </div>
        </div>
      ),
      actionLabel: "Explore Dossier View",
      targetTab: "intelligence"
    },
    {
      title: "2. Review Trust Sourced Intelligence",
      description: "Review zero-hallucination institutional information. Filter contact data across direct sources. Unverified drafts are completely hidden to guard SCM's boardroom pitch credibility.",
      illustration: (
        <div id="tour-ill-2" className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700">Audit Trust Index</span>
            <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-150 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Sourced
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px] bg-white p-2 rounded border border-slate-150">
            <span className="font-semibold text-slate-800">Primary Switchboard</span>
            <span className="font-mono text-red-700">+234 1 271 2345</span>
          </div>
          <div className="text-[9px] text-slate-400 font-mono">
            Sourced: Official Company Contact page / Annual Reports
          </div>
        </div>
      ),
      actionLabel: "Verify Leadership Contacts",
      targetTab: "intelligence"
    },
    {
      title: "3. Direct Decision Maker Outreach",
      description: "Avoid generic gatekeepers. Go straight to executive leadership: CEO, Treasurer, CFO, Head of Treasury. Cross-check SCM pitch recommendations, tailored dynamically for maximum sales alignment.",
      illustration: (
        <div id="tour-ill-3" className="grid grid-cols-2 gap-2">
          <div className="bg-white border border-slate-250/65 rounded-lg p-2.5">
            <h5 className="text-[10px] font-bold text-brand-neutral">Dr. Priya Bansal</h5>
            <p className="text-[8px] text-slate-400 leading-tight">Head of Treasury</p>
            <div className="mt-2 bg-amber-50 text-[7.5px] font-extrabold text-amber-700 px-1 rounded inline-block">
              CFO/DM
            </div>
          </div>
          <div className="bg-white border border-slate-250/65 rounded-lg p-2.5">
            <h5 className="text-[10px] font-bold text-brand-neutral">Aliko Dangote</h5>
            <p className="text-[8px] text-slate-400 leading-tight">Chairman/CEO</p>
            <div className="mt-2 bg-red-50 text-[7.5px] font-extrabold text-red-700 px-1 rounded inline-block">
              High Match
            </div>
          </div>
        </div>
      ),
      actionLabel: "See Activities Page",
      targetTab: "activities"
    },
    {
      title: "4. Logging Client Activities",
      description: "Log each business encounter securely. Keep a digital log of briefings, material shares, email outreach, and investor pitches. Build comprehensive touchpoint logs.",
      illustration: (
        <div id="tour-ill-4" className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="bg-white border border-slate-150 p-2 rounded flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-red-600" />
              <div>
                <h5 className="text-[9px] font-bold text-slate-800">Presentation Scheduled</h5>
                <p className="text-[8px] text-slate-400">Fixed Income Opportunity</p>
              </div>
            </div>
            <span className="text-[8px] text-emerald-600 bg-emerald-50 px-1 font-semibold">Done</span>
          </div>
        </div>
      ),
      actionLabel: "Check SCM Calendaring",
      targetTab: "meetings"
    },
    {
      title: "5. Scheduled Corporate Calendars",
      description: "Secure structured touchpoints. Configure upcoming stakeholder reviews and meetings to keep SCM investment management proposals moving towards execution.",
      illustration: (
        <div id="tour-ill-5" className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-primary-brand shrink-0" />
          <div>
            <h5 className="text-[10.5px] font-bold text-slate-800">Post-Meeting Review</h5>
            <p className="text-[9px] text-slate-400 leading-tight">Discussing commercial paper placement rates on SCM Money Market Fund.</p>
          </div>
        </div>
      ),
      actionLabel: "Examine Performance Index",
      targetTab: "reports"
    },
    {
      title: "6. Generate Boardroom Reports",
      description: "Package researched insights into executive briefings. Generate and export fully sourced dossiers & performance indexes to present immediately to the SCM Investment Committee.",
      illustration: (
        <div id="tour-ill-6" className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
          <FileText className="w-8 h-8 text-red-600" />
          <span className="text-[10.5px] font-black text-slate-800">SCM_Asset_Briefing_Oando.pdf</span>
          <button type="button" className="bg-[#b1191f] text-white font-semibold text-[9px] px-3 py-1 rounded">
            Export Dossier
          </button>
        </div>
      ),
      actionLabel: "Finish & Deploy Briefing",
      targetTab: "dashboard"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setActiveTab(steps[nextStep].targetTab);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      setActiveTab(steps[prevStep].targetTab);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans select-none">
        <motion.div
          id="onboarding-modal"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative flex flex-col justify-between text-slate-800"
        >
          {/* Header */}
          <div className="border-b border-slate-100 p-4 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-brand animate-pulse"></span>
              <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase font-mono">
                SCM Workspace Briefing • Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <h3 className="font-display font-black text-slate-900 text-lg sm:text-xl tracking-tight leading-snug">
              {steps[currentStep].title}
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              {steps[currentStep].description}
            </p>

            {/* Interactive Visual/Illustration */}
            <div className="bg-slate-100/50 border border-slate-150/80 rounded-xl p-3">
              {steps[currentStep].illustration}
            </div>
          </div>

          {/* Progress and controls */}
          <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between">
            {/* Dots indicator */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep ? 'w-5 bg-primary-brand' : 'w-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Back / Next actions */}
            <div className="flex gap-2 text-slate-800">
              {currentStep > 0 && (
                <button
                  id="tour-prev-btn"
                  onClick={handlePrev}
                  className="border border-slate-250 bg-white hover:bg-slate-100 text-slate-700 py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-500" /> Back
                </button>
              )}
              <button
                id="tour-next-btn"
                onClick={handleNext}
                className="bg-primary-brand hover:bg-primary-dark text-white py-1.5 px-4 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-md shadow-red-900/10 cursor-pointer"
              >
                {currentStep === steps.length - 1 ? "Finish Briefing" : steps[currentStep].actionLabel}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
