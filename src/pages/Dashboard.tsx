import React from 'react';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Search,
  Target,
  WalletCards,
} from 'lucide-react';
import { Activity, DashboardMetrics, Meeting, Prospect, Task } from '../types';
import { OfficerDashboardCharts } from '../components/analytics/BusinessCharts';

interface DashboardProps {
  metrics: DashboardMetrics;
  prospects: Prospect[];
  activities: Activity[];
  meetings: Meeting[];
  tasks: Task[];
  setActiveTab: (tab: string) => void;
  onStartOnboarding: () => void;
}

const formatMoney = (value: number) => {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
  return `₦${amount.toLocaleString()}`;
};

export const Dashboard: React.FC<DashboardProps> = ({
  metrics,
  prospects,
  activities,
  meetings,
  tasks,
  setActiveTab,
  onStartOnboarding,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const activeProspects = prospects.filter((prospect) => !['Converted', 'Lost', 'Archived'].includes(prospect.status));
  const upcomingMeetings = [...meetings]
    .filter((meeting) => meeting.date >= today)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 4);
  const openTasks = [...tasks]
    .filter((task) => !task.isCompleted && task.status !== 'Completed')
    .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
    .slice(0, 5);
  const converted = prospects.filter((prospect) => prospect.status === 'Converted').length;
  const pipelineValue = prospects.reduce((sum, prospect) => sum + Number(prospect.opportunityValue || 0), 0);

  const stats = [
    { label: 'Active prospects', value: activeProspects.length, helper: `${prospects.length} total`, icon: Building2 },
    { label: 'Open follow-ups', value: openTasks.length, helper: 'Needs attention', icon: Clock3 },
    { label: 'Upcoming meetings', value: upcomingMeetings.length, helper: 'Next on calendar', icon: CalendarDays },
    { label: 'Pipeline value', value: formatMoney(pipelineValue), helper: `${converted} converted`, icon: WalletCards },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b1191f]">Asset Management Workspace</div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">My Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Focus on the relationships, meetings and follow-ups that need action today.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab('intelligence')} className="inline-flex items-center gap-2 rounded-xl bg-[#b1191f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#94151a]">
              <Search className="h-4 w-4" /> Find prospects
            </button>
            <button onClick={() => setActiveTab('prospects')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              View pipeline <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{stat.label}</div>
                  <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{stat.value}</div>
                  <div className="mt-1 text-xs text-slate-500">{stat.helper}</div>
                </div>
                <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Icon className="h-5 w-5" /></div>
              </div>
            </div>
          );
        })}
      </section>

      <OfficerDashboardCharts prospects={prospects} activities={activities} meetings={meetings} tasks={tasks} />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Upcoming meetings</h2>
              <p className="mt-0.5 text-xs text-slate-400">Your next scheduled conversations</p>
            </div>
            <button onClick={() => setActiveTab('calendar')} className="text-xs font-semibold text-[#b1191f] hover:underline">Open calendar</button>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingMeetings.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming meetings" description="Schedule a meeting from Calendar or a client record." />
            ) : upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#b1191f]"><CalendarDays className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{meeting.prospectName || meeting.purpose}</div>
                  <div className="mt-1 text-xs text-slate-500">{meeting.date} · {meeting.time}</div>
                </div>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{meeting.durationMinutes || 45} min</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Follow-ups</h2>
              <p className="mt-0.5 text-xs text-slate-400">Open tasks that need a next action</p>
            </div>
            <button onClick={() => setActiveTab('prospects')} className="text-xs font-semibold text-[#b1191f] hover:underline">View prospects</button>
          </div>
          <div className="divide-y divide-slate-100">
            {openTasks.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="You're caught up" description="There are no open follow-ups right now." />
            ) : openTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Target className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{task.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{task.prospectName || 'General task'} · Due {task.dueDate || 'not set'}</div>
                </div>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{task.priority || 'Medium'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Need help getting started?</div>
            <div className="mt-1 text-xs text-slate-500">Use the guided tour to review the core SPIP workflow.</div>
          </div>
          <button onClick={onStartOnboarding} className="w-fit rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Open guided tour</button>
        </div>
      </section>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
  <div className="px-5 py-10 text-center">
    <Icon className="mx-auto h-6 w-6 text-slate-300" />
    <div className="mt-3 text-sm font-semibold text-slate-700">{title}</div>
    <div className="mt-1 text-xs text-slate-400">{description}</div>
  </div>
);
