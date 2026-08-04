import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Building2, 
  AlertCircle, 
  CheckCircle, 
  Plus, 
  CheckSquare, 
  Tag, 
  Activity, 
  TrendingUp,
  User,
  X,
  PlayCircle,
  Mail,
  Phone
} from 'lucide-react';
import { Meeting, Task, Prospect, UserProfile, Activity as SCMActivity } from '../types';

const getLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

interface CalendarPageProps {
  meetings: Meeting[];
  tasks: Task[];
  activities: SCMActivity[];
  prospects: Prospect[];
  currentUser: UserProfile;
  onAddMeeting: (meeting: Partial<Meeting>) => Promise<any>;
  onUpdateMeeting: (id: string, updates: Partial<Meeting>) => Promise<any>;
  onAddTask: (task: Partial<Task>) => Promise<any>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<any>;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  meetings,
  tasks,
  activities,
  prospects,
  currentUser,
  onAddMeeting,
  onUpdateMeeting,
  onAddTask,
  onUpdateTask
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getLocalDateString(new Date()));

  // Event Scheduler Modal states
  const [isSchedOpen, setIsSchedOpen] = useState(false);
  const [schedType, setSchedType] = useState<'meeting' | 'task'>('meeting');
  const [schedError, setSchedError] = useState('');
  const [schedSuccess, setSchedSuccess] = useState('');
  const [schedData, setSchedData] = useState<any>({
    title: '',
    purpose: '',
    prospectId: '',
    date: getLocalDateString(new Date()),
    time: '10:00 AM',
    durationMinutes: 45,
    assignedStaff: currentUser.fullName,
    priority: 'Medium',
    taskType: 'Call',
    notes: ''
  });

  // Extract all calendar events (Meetings, Tasks, Activities)
  const getAllEvents = (): any[] => {
    const list: any[] = [];
    
    // 1. Add meetings
    meetings.forEach(m => {
      list.push({
        id: m.id,
        rawId: m.id,
        sourceType: 'meeting',
        title: m.purpose || 'SCM Strategy Session',
        prospectId: m.prospectId,
        prospectName: m.prospectName || 'General SCM',
        dateStr: m.date,
        timeStr: m.time || '10:00 AM',
        officer: m.officerName || 'Julian Draxler',
        priority: 'High',
        completed: !!m.outcome,
        details: m.nextAction ? `Next Action: ${m.nextAction}` : 'Strategic client briefing.'
      });
    });

    // 2. Add tasks
    tasks.forEach(t => {
      list.push({
        id: t.id,
        rawId: t.id,
        sourceType: 'task',
        title: t.title,
        prospectId: t.prospectId,
        prospectName: t.prospectName || 'General SCM',
        dateStr: t.dueDate,
        timeStr: '09:00 AM', // Tasks usually default to morning
        officer: t.assignedStaff,
        priority: t.priority || 'Medium',
        completed: t.status === 'Completed' || t.isCompleted,
        details: t.description || 'Deliverable action.'
      });
    });

    return list;
  };

  const consolidatedEvents = getAllEvents();

  // Helper date generators
  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];
    
    // Add prefix padding days from previous month
    const startPadding = firstDay.getDay(); // Sunday is 0
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    // Add active month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add suffix padding days to complete full grid row logic
    const endPadding = 42 - days.length; // Max 6 lines standard
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const getWeekDays = (date: Date): Date[] => {
    const activeDay = date.getDay();
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - activeDay);

    const weekdays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      weekdays.push(d);
    }
    return weekdays;
  };

  // Nav actions
  const nextRange = () => {
    const d = new Date(currentDate);
    if (calendarView === 'month') {
      d.setMonth(currentDate.getMonth() + 1);
    } else if (calendarView === 'week') {
      d.setDate(currentDate.getDate() + 7);
    } else {
      d.setDate(currentDate.getDate() + 1);
    }
    setCurrentDate(d);
  };

  const prevRange = () => {
    const d = new Date(currentDate);
    if (calendarView === 'month') {
      d.setMonth(currentDate.getMonth() - 1);
    } else if (calendarView === 'week') {
      d.setDate(currentDate.getDate() - 7);
    } else {
      d.setDate(currentDate.getDate() - 1);
    }
    setCurrentDate(d);
  };

  // Select day details
  const filterEventsForDate = (date: Date): any[] => {
    const match = getLocalDateString(date);
    return consolidatedEvents.filter(ev => ev.dateStr === match);
  };

  const handleSelectDay = (date: Date) => {
    const str = getLocalDateString(date);
    setSelectedDateStr(str);
    setSelectedDayEvents(filterEventsForDate(date));
  };

  const handleToggleCompleted = async (ev: any) => {
    try {
      if (ev.sourceType === 'task') {
        const nextStatus = ev.completed ? 'Pending' : 'Completed';
        await onUpdateTask(ev.rawId, {
          status: nextStatus as any,
          isCompleted: nextStatus === 'Completed'
        });
      } else {
        // Resolve meeting
        const outcome = ev.completed ? '' : 'Briefing successfully resolved under SCM Standard.';
        await onUpdateMeeting(ev.rawId, {
          outcome
        });
      }
      // Re-trigger visual sync
      setTimeout(() => {
        const fullDate = new Date(ev.dateStr);
        setSelectedDayEvents(filterEventsForDate(fullDate));
      }, 350);
    } catch (err: any) {
      alert(err.message || 'State modification aborted.');
    }
  };

  const openQuickScheduler = (dateStr: string) => {
    setSchedData({
      title: '',
      purpose: '',
      prospectId: prospects.length > 0 ? prospects[0].id : '',
      date: dateStr,
      time: '10:00 AM',
      durationMinutes: 45,
      assignedStaff: currentUser.fullName,
      priority: 'Medium',
      taskType: 'Call',
      notes: ''
    });
    setSchedError('');
    setSchedSuccess('');
    setIsSchedOpen(true);
  };

  const submitScheduler = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchedError('');
    setSchedSuccess('');

    let relatedProspectName = "General SCM Operations";
    if (schedData.prospectId) {
      const p = prospects.find(item => item.id === schedData.prospectId);
      if (p) relatedProspectName = p.name;
    }

    try {
      if (schedType === 'meeting') {
        if (!schedData.purpose?.trim()) return setSchedError('Meeting agenda/purpose is required.');
        await onAddMeeting({
          prospectId: schedData.prospectId,
          prospectName: relatedProspectName,
          date: schedData.date,
          time: schedData.time,
          durationMinutes: Number(schedData.durationMinutes) || 45,
          purpose: schedData.purpose,
          officerId: currentUser.id,
          officerName: currentUser.fullName
        });
        setSchedSuccess('Strategic advisory meeting pushed to corporate calendars.');
      } else {
        if (!schedData.title?.trim()) return setSchedError('Task title / objective is required.');
        await onAddTask({
          prospectId: schedData.prospectId,
          prospectName: relatedProspectName,
          title: schedData.title,
          dueDate: schedData.date,
          assignedStaff: schedData.assignedStaff,
          priority: schedData.priority,
          status: 'Pending',
          taskType: schedData.taskType,
          description: schedData.notes
        });
        setSchedSuccess('Client advisory task logged on active pipelines.');
      }

      // Sync views
      setTimeout(() => {
        setIsSchedOpen(false);
        const d = new Date(schedData.date);
        setSelectedDayEvents(filterEventsForDate(d));
      }, 850);
    } catch (err: any) {
      setSchedError(err.message || 'Transportation failed.');
    }
  };

  const activeMonthDays = getDaysInMonth(currentDate);
  const activeWeekDays = getWeekDays(currentDate);

  const getEventBadgeClass = (sourceType: string) => {
    return sourceType === 'meeting' 
      ? 'bg-red-50 text-[#b1191f] border border-red-150 font-bold' 
      : 'bg-indigo-50 text-indigo-705 border border-indigo-150 font-bold';
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Calendar Controls panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
        
        {/* Date Selector */}
        <div className="flex items-center gap-3">
          <button 
            onClick={prevRange}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
          >
            <ChevronLeft className="w-4.5 h-4.5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#b1191f]" />
            <h2 className="font-display font-bold text-sm sm:text-base text-brand-neutral min-w-[150px] text-center">
              {currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              {calendarView === 'day' && ` • Day ${currentDate.getDate()}`}
            </h2>
          </div>
          <button 
            onClick={nextRange}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
          >
            <ChevronRight className="w-4.5 h-4.5 text-slate-600" />
          </button>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2">
          {/* Calendar Selector */}
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1 text-xs">
            {(['month', 'week', 'day'] as const).map(v => (
              <button
                key={v}
                onClick={() => setCalendarView(v)}
                className={`px-3 py-1.5 rounded-md font-bold uppercase text-[9.5px] tracking-wide transition-colors cursor-pointer ${
                  calendarView === v 
                    ? 'bg-white text-brand-neutral shadow-sm border border-slate-200' 
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                {v} View
              </button>
            ))}
          </div>

          <button
            onClick={() => openQuickScheduler(selectedDateStr)}
            className="bg-[#b1191f] hover:bg-[#921419] text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-md shadow-red-950/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Log Calendar Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Calendar Core Calendar Layouts */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          
          {/* Monthly View Grid */}
          {calendarView === 'month' && (
            <div className="space-y-2">
              <div className="grid grid-cols-7 text-center font-bold text-slate-400 uppercase tracking-widest text-[9.5px] pb-2 border-b border-slate-100">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <span key={d}>{d}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 bg-white">
                {activeMonthDays.map((day, idx) => {
                  const evs = filterEventsForDate(day);
                  const isCurMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = getLocalDateString(day) === selectedDateStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectDay(day)}
                      className={`min-h-[75px] sm:min-h-[90px] p-2 rounded-lg border flex flex-col justify-between transition-all cursor-pointer text-left ${
                        isSelected 
                          ? 'border-[#b1191f] bg-red-50/10 shadow-inner' 
                          : isToday 
                          ? 'border-red-200 bg-slate-50/70 font-black' 
                          : 'border-slate-100 bg-white hover:bg-slate-50/50'
                      } ${!isCurMonth ? 'opacity-30' : ''}`}
                    >
                      <span className={`text-[10px] font-bold block ${isToday ? 'text-[#b1191f] underline' : 'text-slate-400'}`}>
                        {day.getDate()}
                      </span>

                      {/* Dot or Abbreviated signals */}
                      <div className="space-y-1 overflow-hidden mt-1.5 select-none">
                        {evs.slice(0, 3).map(ev => (
                          <div 
                            key={ev.id} 
                            className={`px-1.5 py-0.5 rounded text-[8.5px] truncate max-w-full font-bold uppercase tracking-wide flex items-center gap-1 border ${getEventBadgeClass(ev.sourceType)} ${
                              ev.completed ? 'line-through opacity-50' : ''
                            }`}
                          >
                            <span className="w-1 h-1 rounded-full bg-[#b1191f] block shrink-0"></span>
                            {ev.title}
                          </div>
                        ))}
                        {evs.length > 3 && (
                          <div className="text-[8px] font-bold text-slate-400 pl-1">
                            +{evs.length - 3} more alerts
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weekly View Grid */}
          {calendarView === 'week' && (
            <div className="space-y-4 font-sans">
              <div className="grid grid-cols-7 text-center font-bold text-slate-400 uppercase tracking-widest text-[9.5px] pb-2 border-b border-slate-100">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                  <span key={d}>{d}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {activeWeekDays.map((day, idx) => {
                  const evs = filterEventsForDate(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = getLocalDateString(day) === selectedDateStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectDay(day)}
                      className={`min-h-[250px] p-3 rounded-xl border flex flex-col transition-all cursor-pointer text-left ${
                        isSelected 
                          ? 'border-[#b1191f] bg-red-50/10' 
                          : isToday 
                          ? 'border-red-200 bg-slate-50' 
                          : 'border-slate-150 bg-white hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="border-b border-slate-100 pb-1.5 mb-2 flex justify-between items-center select-none">
                        <span className="text-[10px] font-bold text-slate-400">{day.getDate()}</span>
                        {isToday && <span className="text-[7.5px] font-extrabold uppercase bg-[#b1191f] text-white px-1 py-0.5 rounded">TODAY</span>}
                      </div>

                      <div className="space-y-2 grow overflow-y-auto max-h-[210px] select-none">
                        {evs.map(ev => (
                          <div 
                            key={ev.id} 
                            className={`p-2 rounded-lg border flex flex-col text-[9px] leading-snug ${getEventBadgeClass(ev.sourceType)} ${
                              ev.completed ? 'line-through opacity-50' : ''
                            }`}
                          >
                            <span className="font-extrabold truncate uppercase tracking-wide">{ev.sourceType}</span>
                            <span className="font-bold text-slate-705 truncate mt-0.5 block">{ev.title}</span>
                            <span className="text-[8px] text-slate-405 mt-1 block font-semibold">{ev.timeStr} • {ev.prospectName}</span>
                          </div>
                        ))}
                        {evs.length === 0 && (
                          <span className="text-[9px] text-slate-350 italic block text-center mt-6">Roster Free</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Tracker Hour layout */}
          {calendarView === 'day' && (
            <div className="space-y-4 font-sans text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex items-center justify-between">
                <div className="text-left">
                  <span className="font-bold text-slate-400 uppercase tracking-widest text-[9.5px]">Selected Client Day Journal</span>
                  <h3 className="font-bold text-brand-neutral text-sm font-display mt-0.5">
                    {currentDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                </div>
                <button
                  onClick={() => openQuickScheduler(getLocalDateString(currentDate))}
                  className="bg-[#b1191f] hover:bg-[#921419] text-white font-bold text-[10.5px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Book Scheduled Event
                </button>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-150 rounded-xl overflow-hidden bg-white">
                {['08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'].map((hourSlot, idx) => {
                  const evs = consolidatedEvents.filter(ev => ev.dateStr === getLocalDateString(currentDate));
                  // Match hour bounds mapping simplistically
                  const isFirstHalf = hourSlot.startsWith('08') || hourSlot.startsWith('10');
                  const targetSlotEvs = isFirstHalf 
                    ? evs.filter(ev => ev.timeStr.toLowerCase().startsWith('08') || ev.timeStr.toLowerCase().startsWith('09') || ev.timeStr.toLowerCase().startsWith('10') || ev.timeStr.toLowerCase().startsWith('11'))
                    : evs.filter(ev => !ev.timeStr.toLowerCase().startsWith('08') && !ev.timeStr.toLowerCase().startsWith('09') && !ev.timeStr.toLowerCase().startsWith('10') && !ev.timeStr.toLowerCase().startsWith('11'));

                  return (
                    <div key={idx} className="flex p-4 hover:bg-slate-50/40 transition-colors">
                      <div className="w-24 text-slate-400 font-bold min-w-[90px] text-left select-none text-[11px] font-mono shrink-0">
                        {hourSlot}
                      </div>

                      <div className="grow space-y-2 border-l border-slate-100 pl-4 text-left">
                        {idx === 0 ? (
                          targetSlotEvs.map(ev => (
                            <div key={ev.id} className="p-3.5 rounded-xl border bg-slate-50 flex items-center justify-between text-xs">
                              <div>
                                <span className={`text-[9.5px] font-bold uppercase border px-2 py-0.5 rounded tracking-wider ${getEventBadgeClass(ev.sourceType)}`}>
                                  {ev.sourceType} • {ev.timeStr}
                                </span>
                                <h4 className="font-bold text-brand-neutral mt-2 tracking-tight">{ev.title}</h4>
                                <span className="text-[10.5px] text-slate-500 block">Organization: {ev.prospectName} • Assigned: {ev.officer}</span>
                              </div>
                              <button
                                onClick={() => handleToggleCompleted(ev)}
                                className={`px-3 py-1 rounded-lg border font-bold text-[10px] uppercase transition-all select-none cursor-pointer ${
                                  ev.completed 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                    : 'bg-[#b1191f] border-[#b1191f] text-white hover:bg-[#921419]'
                                }`}
                              >
                                {ev.completed ? 'Completed' : 'Resolve Event'}
                              </button>
                            </div>
                          ))
                        ) : idx === 1 ? (
                          targetSlotEvs.filter((_e, i) => i > 0).map(ev => (
                            <div key={ev.id} className="p-3.5 rounded-xl border bg-slate-50 flex items-center justify-between text-xs">
                              <div>
                                <span className={`text-[9.5px] font-bold uppercase border px-2 py-0.5 rounded tracking-wider ${getEventBadgeClass(ev.sourceType)}`}>
                                  {ev.sourceType} • {ev.timeStr}
                                </span>
                                <h4 className="font-bold text-brand-neutral mt-2 tracking-tight">{ev.title}</h4>
                                <span className="text-[10.5px] text-slate-500 block">Organization: {ev.prospectName} • Assigned: {ev.officer}</span>
                              </div>
                              <button
                                onClick={() => handleToggleCompleted(ev)}
                                className={`px-3 py-1 rounded-lg border font-bold text-[10px] uppercase transition-all select-none cursor-pointer ${
                                  ev.completed 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                    : 'bg-[#b1191f] border-[#b1191f] text-white hover:bg-[#921419]'
                                }`}
                              >
                                {ev.completed ? 'Completed' : 'Resolve Event'}
                              </button>
                            </div>
                          ))
                        ) : null}
                        {((idx === 0 && targetSlotEvs.length === 0) || (idx === 1 && targetSlotEvs.length <= 1) || idx >= 2) && (
                          <span className="text-slate-300 font-medium italic text-[11px] block py-1">Slot Available</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Selected Day Agenda Side-Roster */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-xs font-sans">
          <div className="border-b border-slate-100 pb-3 mb-4 text-left">
            <h3 className="font-display font-medium text-slate-400 uppercase tracking-widest text-[9.5px]">Schedule Briefings</h3>
            <span className="font-bold text-brand-neutral text-xs block mt-0.5">
              Agenda for {new Date(selectedDateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div id="scm-selected-events-stack" className="space-y-3.5 max-h-[450px] overflow-y-auto">
            {filterEventsForDate(new Date(selectedDateStr)).length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">Daily Agenda Clear</p>
                <p className="text-[10px] text-slate-400 mt-1">No tasks or strategic corporate briefings booked.</p>
              </div>
            ) : (
              filterEventsForDate(new Date(selectedDateStr)).map((ev, i) => (
                <div 
                  key={ev.id || i}
                  className={`p-3.5 border rounded-xl shadow-sm text-left flex flex-col justify-between relative bg-white ${
                    ev.completed ? 'border-slate-100 opacity-60' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[8.5px] font-bold uppercase px-2 py-0.5 rounded tracking-wider border ${getEventBadgeClass(ev.sourceType)}`}>
                        {ev.sourceType}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-slate-400 text-[9.5px]">
                        <Clock className="w-3.5 h-3.5" /> {ev.timeStr}
                      </span>
                    </div>

                    <h4 className={`font-bold text-xs text-brand-neutral leading-snug tracking-tight ${ev.completed ? 'line-through text-slate-400' : ''}`}>
                      {ev.title}
                    </h4>
                    
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 mt-2">
                      <Building2 className="w-3.5 h-3.5" /> {ev.prospectName}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-405" /> Staff: {ev.offic}
                    </span>

                    {ev.details && (
                      <p className="text-[10px] text-[#0d1527] mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-normal font-medium">
                        {ev.details}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleCompleted(ev)}
                    className={`mt-4 w-full py-1.5 rounded-lg border font-extrabold text-[9.5px] uppercase tracking-wide select-none cursor-pointer transition-all ${
                      ev.completed
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-[#b1191f] text-white hover:bg-[#921419] border-[#b1191f] shadow-sm'
                    }`}
                  >
                    {ev.completed ? 'Completed' : 'Complete Event'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SCM Scheduler Event Modal */}
      {isSchedOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-brand-neutral text-xs sm:text-sm uppercase tracking-wider">
                Log New Corporate Event
              </h3>
              <button 
                onClick={() => setIsSchedOpen(false)}
                className="text-slate-400 hover:text-slate-850 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Type selector tab */}
            <div className="flex border-b border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSchedType('meeting')}
                className={`flex-1 py-2 font-bold uppercase text-[9px] tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                  schedType === 'meeting'
                    ? 'border-[#b1191f] text-[#b1191f] bg-white font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-850'
                }`}
              >
                C-Suite Strategic Meeting
              </button>
              <button
                type="button"
                onClick={() => setSchedType('task')}
                className={`flex-1 py-2 font-bold uppercase text-[9px] tracking-wider text-center border-b-2 transition-all cursor-pointer ${
                  schedType === 'task'
                    ? 'border-[#b1191f] text-[#b1191f] bg-white font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-850'
                }`}
              >
                Relationship Follow-Up Task
              </button>
            </div>

            <form onSubmit={submitScheduler} className="p-5 space-y-4 text-xs font-sans">
              {schedError && (
                <div className="bg-red-50 text-[#b1191f] border border-red-200 rounded-lg p-3 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4" /> {schedError}
                </div>
              )}

              {schedSuccess && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 font-medium">
                  <CheckCircle className="w-4 h-4" /> {schedSuccess}
                </div>
              )}

              {/* Related Prospect */}
              <div className="flex flex-col gap-1 bg-white select-none">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Strategic Client SCM Asset</label>
                <select
                  value={schedData.prospectId}
                  onChange={(e) => setSchedData({ ...schedData, prospectId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-semibold text-brand-neutral"
                >
                  <option value="">-- General SCM Corporate Operations --</option>
                  {prospects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {schedType === 'meeting' ? (
                <>
                  <div className="flex flex-col gap-1 bg-white">
                    <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Meeting Agenda / Purpose</label>
                    <input
                      type="text"
                      value={schedData.purpose}
                      onChange={(e) => setSchedData({ ...schedData, purpose: e.target.value })}
                      placeholder="e.g. Present money market optimization structures"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-semibold text-brand-neutral"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-white">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Time Slot</label>
                      <input
                        type="text"
                        value={schedData.time}
                        onChange={(e) => setSchedData({ ...schedData, time: e.target.value })}
                        placeholder="11:00 AM"
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-semibold text-brand-neutral"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Duration (Mins)</label>
                      <input
                        type="number"
                        value={schedData.durationMinutes}
                        onChange={(e) => setSchedData({ ...schedData, durationMinutes: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-semibold text-brand-neutral"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1 bg-white">
                    <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Task Objective / Title</label>
                    <input
                      type="text"
                      value={schedData.title}
                      onChange={(e) => setSchedData({ ...schedData, title: e.target.value })}
                      placeholder="e.g. Dispatch SEC yield performance tables"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-semibold text-brand-neutral"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-white">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Follow-Up Channel</label>
                      <select
                        value={schedData.taskType}
                        onChange={(e) => setSchedData({ ...schedData, taskType: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-semibold text-brand-neutral"
                      >
                        {['Call', 'Email', 'Meeting', 'Visit', 'Presentation', 'Financial Literacy Session'].map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Client Priority</label>
                      <select
                        value={schedData.priority}
                        onChange={(e) => setSchedData({ ...schedData, priority: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-semibold text-brand-neutral"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Date */}
              <div className="flex flex-col gap-1 bg-white">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Event Booking Date</label>
                <input
                  type="date"
                  value={schedData.date}
                  onChange={(e) => setSchedData({ ...schedData, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2 text-brand-neutral font-semibold outline-none"
                />
              </div>

              {/* Notes / Description */}
              <div className="flex flex-col gap-1 bg-white">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Event Overview Description</label>
                <textarea
                  value={schedData.notes}
                  onChange={(e) => setSchedData({ ...schedData, notes: e.target.value })}
                  placeholder="Additional briefing instructions..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-medium text-brand-neutral resize-none"
                />
              </div>

              {/* SCM Advisor */}
              <div className="flex flex-col gap-1 bg-white">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Assigned Relationship Advisor</label>
                <input
                  type="text"
                  value={schedData.assignedStaff}
                  onChange={(e) => setSchedData({ ...schedData, assignedStaff: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-semibold text-brand-neutral"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-slate-100 flex gap-3.5 bg-white select-none">
                <button
                  type="button"
                  onClick={() => setIsSchedOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#b1191f] hover:bg-[#921419] text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer shadow-md shadow-red-950/20"
                >
                  Confirm Event Placement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
