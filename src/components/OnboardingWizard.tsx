import React, { useEffect, useState } from 'react';
import { Activity, BarChart3, Bot, Building2, ChevronLeft, ChevronRight, LayoutDashboard, ShieldCheck, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ScmLogo } from './ScmLogo';

interface Props { onClose: () => void; setActiveTab: (tab: string) => void }

const STEPS = [
  { title: 'Welcome to SPIP', text: 'SPIP brings prospect discovery, relationship management, research and reporting into one secure SCM workspace.', tab: 'dashboard', icon: Sparkles, points: ['Your first-login guide', 'Restart anytime from Tour Guide'] },
  { title: 'Start with your dashboard', text: 'Review current priorities, upcoming meetings, open follow-ups and pipeline value. Figures follow your authorised record access.', tab: 'dashboard', icon: LayoutDashboard, points: ['Today’s priorities', 'Fast links to prospects and pipeline'] },
  { title: 'Find and qualify prospects', text: 'Add a known company or use Apex Discovery for one unique lead at a time. Verify information before outreach and never treat an unverified contact as confirmed.', tab: 'prospects', icon: Building2, points: ['Private employee queue', 'Import or dismiss each discovery'] },
  { title: 'Manage every relationship', text: 'Move opportunities through Relationship Pipeline and use Client 360 to record contacts, meetings, tasks, interests, conversion and AUM history.', tab: 'pipeline', icon: Activity, points: ['One complete relationship record', 'Accurate next actions and ownership'] },
  { title: 'Research and create with Copilot', text: 'Copilot checks permitted SPIP records first, then public sources when appropriate. Create research, human-written emails, proposals, meeting briefs and document exports.', tab: 'copilot', icon: Bot, points: ['Check citations and assumptions', 'Only upload material you are authorised to share'] },
  { title: 'Measure performance', text: 'Analytics provides period-based KPIs, trends and exports. Staff see their assigned work; authorised administrators can review team performance.', tab: 'analytics', icon: BarChart3, points: ['Change reporting periods', 'Export data for controlled analysis'] },
  { title: 'Work securely', text: 'Keep your account private, verify sensitive information and report problems through Help & Support. CRM records are not stored for offline use.', tab: 'dashboard', icon: ShieldCheck, points: ['Use an approved SCM account', 'Create a support ticket when FAQs do not solve the issue'] },
] as const;

export const OnboardingWizard: React.FC<Props> = ({ onClose, setActiveTab }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  const move = (next: number) => { setStep(next); setActiveTab(STEPS[next].tab); };

  return <AnimatePresence>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-3"><ScmLogo variant="color" size="sm"/><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#b1191f]">Guided tour</p><p className="text-xs text-slate-500">Step {step + 1} of {STEPS.length}</p></div></div>
          <button onClick={onClose} aria-label="Skip and close tour" className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-200"><X className="h-5 w-5"/></button>
        </header>
        <div className="overflow-y-auto p-5 sm:p-7">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-[#b1191f]"><Icon className="h-8 w-8"/></div>
          <h2 id="tour-title" className="text-2xl font-black tracking-tight text-slate-950">{current.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{current.text}</p>
          <div className="mt-5 space-y-2">{current.points.map(point => <div key={point} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700"><span className="h-2 w-2 shrink-0 rounded-full bg-[#b1191f]"/>{point}</div>)}</div>
        </div>
        <footer className="border-t bg-slate-50 p-4">
          <div className="mb-4 flex gap-1" aria-label={`Tour progress: ${step + 1} of ${STEPS.length}`}>{STEPS.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#b1191f]' : 'bg-slate-200'}`}/>)}</div>
          <div className="flex items-center justify-between gap-3">
            <button onClick={onClose} className="min-h-11 px-2 text-xs font-semibold text-slate-500 hover:text-slate-900">Skip tour</button>
            <div className="flex gap-2">
              {step > 0 && <button onClick={() => move(step - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold"><ChevronLeft className="h-4 w-4"/>Back</button>}
              <button onClick={() => step === STEPS.length - 1 ? onClose() : move(step + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[#b1191f] px-4 text-sm font-bold text-white hover:bg-[#8e1217]">{step === STEPS.length - 1 ? 'Finish' : 'Next'}<ChevronRight className="h-4 w-4"/></button>
            </div>
          </div>
        </footer>
      </motion.section>
    </div>
  </AnimatePresence>;
};
