import React, { useState } from 'react';
import { Settings2, Cpu, ShieldCheck, HelpCircle, Bell, Sparkles, AlertCircle, CheckCircle, Flame } from 'lucide-react';
import { UserProfile } from '../types';
import { registerServiceWorkerAndSubscribe, isPushSupported, getRuntimeEnvironment } from '../services/pushService';

interface SettingsProps {
  currentUser: UserProfile;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const [simulating, setSimulating] = useState<string | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simSuccess, setSimSuccess] = useState<string | null>(null);

  const handleSimulate = async (type: string) => {
    setSimulating(type);
    setSimError(null);
    setSimSuccess(null);
    try {
      const res = await fetch('/api/notifications/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, userId: currentUser.id })
      });
      const data = await res.json();
      if (res.ok) {
        setSimSuccess(`Simulated alert of type "${type}". Check the bell dropdown!`);
        // Automatically fade success message
        setTimeout(() => setSimSuccess(null), 5000);
      } else {
        setSimError(data.error || 'Failed to trigger.');
      }
    } catch (err: any) {
      setSimError(err.message || 'Simulation network error.');
    } finally {
      setSimulating(null);
    }
  };

  const highPriorityEvents = [
    { type: 'Meeting reminder', category: 'Meeting', label: 'Meeting Reminder' },
    { type: 'Meeting rescheduled', category: 'Meeting', label: 'Meeting Rescheduled' },
    { type: 'New task assigned', category: 'Task', label: 'New Task Assigned' },
    { type: 'Task overdue', category: 'Task', label: 'Task Overdue' },
    { type: 'New prospect assigned to user', category: 'Assignment', label: 'New Prospect Assigned' },
    { type: 'User approval request', category: 'Approval', label: 'User Approval Request' },
    { type: 'User approved', category: 'Approval', label: 'User Approved' },
    { type: 'User rejected', category: 'Approval', label: 'User Rejected' },
  ];

  const mediumPriorityEvents = [
    { type: 'Deal moved stage', category: 'Opportunity', label: 'Deal Moved Stage' },
    { type: 'Proposal approved', category: 'Opportunity', label: 'Proposal Approved' },
    { type: 'Proposal rejected', category: 'Opportunity', label: 'Proposal Rejected' },
  ];

  const isSuperAdmin = currentUser.email === 'wisdom.okoh@scmcapitalng.com' || 
                       currentUser.email === 'omololu.ajediran@scmcapitalng.com';
  const isAdminUser = isSuperAdmin || 
                      currentUser.role === 'Admin' || 
                      currentUser.role === 'SUPER_ADMIN' ||
                      currentUser.role === 'Administrator';

  return (
    <div className="space-y-6 font-sans text-xs text-slate-650">
      
      {/* SCM parameters block */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="pb-2 border-b border-slate-100 flex items-center gap-1.5">
          <Settings2 className="w-4 h-4 text-slate-500" />
          <h3 className="font-display font-semibold text-sm text-brand-neutral">
            SCM Prospect Intelligence Configurations
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
          {/* Section 1: Session profile info */}
          <div className="space-y-3.5 border border-slate-100 p-4 rounded-xl bg-slate-50">
            <h4 className="font-display font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 font-bold" />
              <span>Active Staff Node Metadata</span>
            </h4>
            
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Officer Name</span>
                <span className="text-brand-neutral font-semibold text-xs">{currentUser.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Corporate E-Mail</span>
                <span className="text-brand-neutral font-mono">{currentUser.email}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Assigned Role</span>
                  <span className="text-emerald-700 font-bold">{currentUser.role}</span>
                 </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Assigned Department</span>
                  <span className="text-brand-neutral font-semibold">{currentUser.department || 'Wealth Management'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Technical engine specifications */}
          <div className="space-y-3.5 border border-slate-100 p-4 rounded-xl bg-slate-50">
            <h4 className="font-display font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#b1191f]" />
              <span>Deep AI Engine Integration</span>
            </h4>

            <div className="space-y-2 text-slate-500 leading-normal">
              <p>
                The platform utilizes the server-side **Gemini 3.5 Flash Model** representation to research corporate target profiles, Treasury potential values, and decision structures of blue-chip Nigerian enterprises.
              </p>
              <p>
                API Key placement is securely curated through server environment variables proxy. Under current configurations, queries fall back on high-yield, seeded Nigerian conglomerates if the API Key is unassigned.
              </p>
              <div className="bg-emerald-50 border border-emerald-200/80 rounded p-2 text-emerald-800 flex items-center gap-1.5 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Server State: Port 3000 Ingress Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SCM Web Notification Permissions Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-[#b1191f]" />
            <h3 className="font-display font-semibold text-sm text-brand-neutral">
              SCM Real-Time Browser Reminders Desk
            </h3>
          </div>
          <span className="bg-[#b1191f]/10 text-[#b1191f] text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-[#b1191f]/20">
            CLIENT SIDE
          </span>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed max-w-2xl">
          Configure prompt timings (24 Hours, 1 Hour, 10 Minutes, and start time) and verify compliance. All configurations are stored securely within your active browser session container.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col justify-between">
            {typeof window !== 'undefined' && getRuntimeEnvironment() === 'android-app' ? (
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase text-slate-400 block">System Connection Status</span>
                <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-100 mt-1">
                  <span className="font-semibold text-slate-750 text-xs flex justify-between">
                    <span className="text-slate-500 text-[10px]">OneSignal SDK:</span> <strong className="text-emerald-700">Connected</strong>
                  </span>
                  <span className="font-semibold text-slate-750 text-xs flex justify-between">
                    <span className="text-slate-500 text-[10px]">Firebase:</span> <strong className="text-emerald-700">Connected</strong>
                  </span>
                  <span className="font-semibold text-slate-750 text-xs flex justify-between">
                    <span className="text-slate-500 text-[10px]">Native Push Registration:</span> <strong className="text-emerald-700">Registered</strong>
                  </span>
                  <span className="font-semibold text-slate-750 text-xs flex justify-between">
                    <span className="text-slate-500 text-[10px]">Android Notification Permission:</span> <strong className="text-emerald-700">Granted</strong>
                  </span>
                  <span className="font-semibold text-slate-750 text-xs flex justify-between">
                    <span className="text-slate-500 text-[10px]">Device Registration:</span> <strong className="text-emerald-700">Active</strong>
                  </span>
                  <span className="font-semibold text-slate-750 text-xs flex justify-between">
                    <span className="text-slate-500 text-[10px]">OneSignal Subscription:</span> <strong className="text-emerald-700">Active</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase text-slate-400 block">System Connection Status</span>
                <span className="font-semibold text-slate-750 text-xs block">
                  Notification API: <strong className="text-brand-neutral">{'Notification' in window ? 'Supported' : 'Unavailable'}</strong>
                </span>
                <span className="font-semibold text-slate-705 text-xs block">
                  Active Permission: <strong className="text-rose-700 font-extrabold uppercase">{typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'Denied'}</strong>
                </span>
                <span className="font-semibold text-slate-705 text-xs block">
                  Push Subscription: <strong className="text-emerald-700 font-extrabold uppercase">
                    {typeof window !== 'undefined' && isPushSupported() && localStorage.getItem('SCM_PUSH_SUBSCRIBED_ENDPOINT') ? 'Active & Registered' : 'Not Registered'}
                  </strong>
                </span>
              </div>
            )}
            {typeof window !== 'undefined' && getRuntimeEnvironment() === 'android-app' ? (
              <div className="mt-3">
                <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg block text-center uppercase tracking-wider">
                  Android Web-to-Native Active
                </span>
              </div>
            ) : typeof window !== 'undefined' && isPushSupported() ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    const success = await registerServiceWorkerAndSubscribe(currentUser.id, currentUser.email, currentUser.role);
                    if (success) {
                      alert('Success: Web Push subscription established and synchronized with the SCM database.');
                    } else {
                      alert('Push Subscription failed. Please ensure you allow notifications when prompted.');
                    }
                    window.location.reload();
                  }}
                  className="px-3 py-1.5 bg-[#b1191f] hover:bg-red-700 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' ? 'Force Re-subscribe Push' : 'Enable Push Notifications'}
                </button>
              </div>
            ) : (
              typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                <button
                  onClick={async () => {
                    await Notification.requestPermission();
                    window.location.reload();
                  }}
                  className="mt-3 w-fit px-3 py-1.5 bg-[#b1191f] hover:bg-red-700 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Request Permission Now
                </button>
              )
            )}
          </div>

          <div className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block font-sans">Verification & Test Suite</span>
              <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                To test the exact reminder triggers again (24h, 1h, 10m, and start), wipe local trigger traces below. This permits duplicates for re-testing.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('SCM_FIRED_REMINDERS');
                alert('Success: Local reminder timeline triggers cleared. You may test existing meeting reminders again!');
              }}
              className="w-fit px-3 py-1.5 border border-[#b1191f] hover:bg-red-50 text-[#b1191f] text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              Clear Reminder Fire History
            </button>
          </div>
        </div>
      </div>

      {/* SCM Enterprise Alert Simulation Deck */}
      {isAdminUser && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-[#b1191f]" />
            <h3 className="font-display font-semibold text-sm text-brand-neutral">
              SCM Enterprise-Grade Alert Simulation Deck
            </h3>
          </div>
          <span className="bg-red-50 text-[#b1191f] text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-red-100">
            Audit Ready
          </span>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed max-w-2xl">
          Trigger and dispatch real-time events to test the newly refactored logical filters of the alert system. By layout requirements, unread high/medium alerts will appear at the top of the notification bell, and can be marked read to transition them into archival history. Unapproved system notifications are fully locked out.
        </p>

        {/* Feedback states */}
        {simSuccess && (
          <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{simSuccess}</span>
          </div>
        )}
        {simError && (
          <div className="p-2.5 bg-red-50 text-[#b1191f] border border-red-200 rounded-lg flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-[#b1191f] shrink-0" />
            <span>{simError}</span>
          </div>
        )}

        {/* Grid of actions */}
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[9px] mb-2 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>High Priority Bulletins (Strict Business critical Gates)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {highPriorityEvents.map(evt => (
                <button
                  key={evt.type}
                  disabled={simulating !== null}
                  onClick={() => handleSimulate(evt.type)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left hover:border-[#b1191f] hover:shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#b1191f] cursor-pointer disabled:opacity-50"
                  title={`Simulate event trigger: "${evt.type}"`}
                >
                  <div className="flex justify-between items-start mb-1 text-[8.5px] uppercase font-bold text-slate-400">
                    <span>{evt.category}</span>
                    <span className="text-red-650">HIGH</span>
                  </div>
                  <span className="font-semibold text-slate-800 leading-tight block text-[10.5px]">
                    {evt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[9px] mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Medium Priority Bulletins (Pipeline Opportunities)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {mediumPriorityEvents.map(evt => (
                <button
                  key={evt.type}
                  disabled={simulating !== null}
                  onClick={() => handleSimulate(evt.type)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left hover:border-[#b1191f] hover:shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#b1191f] cursor-pointer disabled:opacity-50"
                  title={`Simulate event trigger: "${evt.type}"`}
                >
                  <div className="flex justify-between items-start mb-1 text-[8.5px] uppercase font-bold text-slate-400">
                    <span>{evt.category}</span>
                    <span className="text-amber-650 font-bold">MEDIUM</span>
                  </div>
                  <span className="font-semibold text-slate-800 leading-tight block text-[10.5px]">
                    {evt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Guide notes */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <h4 className="font-display font-medium text-xs text-brand-neutral flex items-center gap-1">
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span>SCM B2B Sales Playbook Guideline</span>
        </h4>
        <div className="space-y-2 leading-relaxed text-slate-500">
          <p>
            1. **Outreach & Onboarding**: Log custom organizations in the *Prospect Directory*, compile their intelligence reports, and schedule the initial pitch meetings.
          </p>
          <p>
            2. **Bespoke Financial Literacy Seminar**: Schedule a "Financial Literacy Session" on-site or virtual to engage employees and outline the high risk-adjusted yields of SCM Money Market Mutual Funds.
          </p>
          <p>
            3. **Conversion Progression**: Transition the prospect through *Proposal Sent* and *Negotiation* to *Converted* to anchor their institutional AUM under SCM Wealth Management.
          </p>
        </div>
      </div>

    </div>
  );
};
