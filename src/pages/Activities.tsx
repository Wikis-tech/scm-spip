import React, { useState } from 'react';
import { 
  Inbox, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Presentation, 
  ChevronRight, 
  Calendar, 
  Trash2, 
  SlidersHorizontal,
  X,
  BadgeAlert,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import { Activity, Prospect, UserProfile, ActivityType, ActivityStatus } from '../types';

interface ActivitiesProps {
  activities: Activity[];
  prospects: Prospect[];
  currentUser: UserProfile;
  onAddActivity: (activity: Partial<Activity>) => Promise<any>;
  onUpdateActivity: (id: string, updates: Partial<Activity>) => Promise<any>;
  onDeleteActivity: (id: string) => Promise<any>;
}

export const Activities: React.FC<ActivitiesProps> = ({
  activities,
  prospects,
  currentUser,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity
}) => {
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modal / Form toggle state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Form input field state
  const [formData, setFormData] = useState<Partial<Activity>>({
    prospectId: '',
    activityType: 'Call',
    date: new Date().toISOString().split('T')[0],
    time: '12:00 PM',
    outcome: '',
    notes: '',
    status: 'Completed'
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const activityTypes = ['All', 'Call', 'Email', 'Meeting', 'Visit', 'Presentation', 'Financial Literacy Session', 'Proposal', 'Follow-up'];
  const activityStatuses = ['All', 'Scheduled', 'Completed', 'Overdue', 'Draft'];

  // Filter Matching
  const filteredActivities = activities.filter(a => {
    const matchesSearch = (a.prospectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.outcome || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All' || a.activityType === selectedType;
    const matchesStatus = selectedStatus === 'All' || a.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const openCreateForm = () => {
    setSelectedActivity(null);
    setFormData({
      prospectId: prospects.length > 0 ? prospects[0].id : '',
      activityType: 'Call',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      outcome: '',
      notes: '',
      status: 'Completed'
    });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.prospectId) return setFormError('Please select associated organization.');
    if (!formData.activityType) return setFormError('Activity type is required.');
    if (!formData.date) return setFormError('Log date is required.');

    try {
      if (selectedActivity) {
        await onUpdateActivity(selectedActivity.id, formData);
        setFormSuccess('Communication synchronized on timeline.');
        setTimeout(() => setIsFormOpen(false), 800);
      } else {
        await onAddActivity(formData);
        setFormSuccess('Activity saved on SCM relationship tracker.');
        setTimeout(() => setIsFormOpen(false), 800);
      }
    } catch (err: any) {
      setFormError(err.message || 'Transmission failed.');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser.role !== 'Director' && currentUser.role !== 'Admin') {
      alert('Security Policy Alert: Your authenticated SCM Role lacks deletion permissions.');
      return;
    }

    if (confirm('Permanently delete this activity log from relational archives?')) {
      try {
        await onDeleteActivity(id);
      } catch (err: any) {
        alert(err.message || 'Deletion failed.');
      }
    }
  };

  const handleStatusChange = async (act: Activity, nextStatus: ActivityStatus) => {
    try {
      await onUpdateActivity(act.id, { status: nextStatus });
    } catch (err: any) {
      alert('Failed updating statuses: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Action filters header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm justify-between flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search activity notes / briefs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-primary-brand focus:ring-1 focus:ring-primary-brand rounded-lg pl-9 pr-4 py-2 text-xs text-brand-neutral outline-none transition-all placeholder-slate-400"
          />
        </div>

        {/* Filters Select row */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <SlidersHorizontal className="w-3 h-3" /> Categorization
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-700 px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-brand cursor-pointer"
          >
            {activityTypes.map(t => (
              <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-slate-200 text-xs text-slate-700 px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-brand cursor-pointer"
          >
            {activityStatuses.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>

          {/* Add Activity Btn */}
          <button
            id="log-activity-btn"
            onClick={openCreateForm}
            className="ml-auto md:ml-2 bg-primary-brand hover:bg-primary-dark text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-red-950/20 select-none cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Log Engagement Note
          </button>
        </div>
      </div>

      {/* Main activities timeline grid style */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
          <div className="space-y-0.5">
            <h3 className="font-display font-semibold text-sm text-brand-neutral">
              Universal Relationship Engagement Log
            </h3>
            <p className="text-[10px] text-slate-400">Chronological list of phone correspondences, visit notes, and literacy briefings.</p>
          </div>
          <span className="text-[10px] bg-slate-100 font-mono border text-slate-500 px-2 py-0.5 rounded">
            Filtered ({filteredActivities.length} entries)
          </span>
        </div>

        <div className="space-y-5">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-1">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold">No activity logs recorded</p>
              <p className="text-xs">Adjust your categorization filters or click Log Engagement to seed data.</p>
            </div>
          ) : (
            filteredActivities.map((act) => {
              return (
                <div 
                  key={act.id}
                  id={`activity-log-${act.id}`}
                  className="flex items-start gap-4 border-b border-slate-50 pb-5 hover:bg-slate-50/40 p-2.5 rounded-lg transition-colors group relative"
                >
                  {/* Indicator Box based on type */}
                  <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center border font-bold ${
                    act.activityType === 'Financial Literacy Session' || act.activityType === 'Presentation' 
                      ? 'bg-violet-50 text-violet-700 border-violet-100' :
                      act.activityType === 'Call' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                      act.activityType === 'Email' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      act.activityType === 'Meeting' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      'bg-slate-50 text-slate-600 border-slate-250/50'
                  }`}>
                    {act.activityType === 'Call' ? <Phone className="w-4 h-4" /> :
                     act.activityType === 'Email' ? <Mail className="w-4 h-4" /> :
                     act.activityType === 'Financial Literacy Session' ? <Presentation className="w-4 h-4" /> :
                     <Inbox className="w-4 h-4" />}
                  </div>

                  {/* Left core info block */}
                  <div className="grow space-y-1.5 text-xs text-slate-650">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div>
                        {/* Company associations */}
                        <span className="font-bold text-brand-neutral hover:text-primary-brand transition-colors block text-sm">
                          {act.prospectName || 'Corporate Client'}
                        </span>
                        
                        <div className="flex items-center gap-2 mt-0.5 text-[10.5px]">
                          <span className="font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                            {act.activityType}
                          </span>
                          <span className="text-slate-400 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" /> {act.date} at {act.time}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status controllers */}
                        <select
                          value={act.status}
                          onChange={(e) => handleStatusChange(act, e.target.value as ActivityStatus)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border cursor-pointer focus:outline-none ${
                            act.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            act.status === 'Scheduled' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="Completed">Completed</option>
                          <option value="Overdue">Overdue</option>
                          <option value="Draft">Draft</option>
                        </select>

                        {/* Delete permissions guard */}
                        {(currentUser.role === 'Director' || currentUser.role === 'Admin') && (
                          <button
                            onClick={(e) => handleDelete(act.id, e)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-primary-brand rounded border border-transparent hover:border-red-100 transition-colors cursor-pointer"
                            title="Delete log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 bg-slate-50 border border-slate-100/80 rounded p-2.5 leading-relaxed text-[11.5px]">
                      {act.outcome && (
                        <p className="text-slate-700 font-medium">
                          <strong>Outcome:</strong> {act.outcome}
                        </p>
                      )}
                      {act.notes && (
                        <p className="text-slate-500 text-xs italic">
                          <strong>Core Briefs:</strong> {act.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Slide form Modal context */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex justify-center items-center z-40 p-4 backdrop-blur-xs font-sans">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="bg-brand-neutral text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-display font-semibold text-xs uppercase tracking-wider">
                Log New Communication Note
              </h3>
              <button 
                id="close-activity-form-btn"
                onClick={() => setIsFormOpen(false)}
                className="text-white opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-2 border border-red-200 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <BadgeAlert className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-2 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Assoc client */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 font-sans">Target Corporate Prospect *</label>
                <select
                  value={formData.prospectId || ''}
                  id="select-activity-prospect"
                  onChange={(e) => setFormData({ ...formData, prospectId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary-brand cursor-pointer"
                >
                  <option value="" disabled>Choose an organization...</option>
                  {prospects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Type Category */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Engagement Form/Type *</label>
                <select
                  value={formData.activityType || 'Call'}
                  id="select-activity-type"
                  onChange={(e) => setFormData({ ...formData, activityType: e.target.value as ActivityType })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary-brand cursor-pointer"
                >
                  {activityTypes.filter(t => t !== 'All').map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Grid Date Time */}
              <div className="grid grid-cols-2 gap-3">
                {/* Date */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Log Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:bg-white outline-none focus:ring-1 focus:ring-primary-brand"
                  />
                </div>

                {/* Time */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Log Time</label>
                  <input
                    type="text"
                    value={formData.time || ''}
                    placeholder="e.g. 11:30 AM"
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:bg-white outline-none focus:ring-1 focus:ring-primary-brand"
                  />
                </div>
              </div>

              {/* Status selection */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Activity Status</label>
                <select
                  value={formData.status || 'Completed'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ActivityStatus })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:bg-white outline-none focus:ring-1 focus:ring-primary-brand cursor-pointer"
                >
                  <option value="Completed">Completed (Historic log)</option>
                  <option value="Scheduled">Scheduled (Reminder alert)</option>
                  <option value="Draft">Draft (Internal note)</option>
                </select>
              </div>

              {/* Outcome */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Session Outcome / Communication Summary *</label>
                <textarea
                  rows={2}
                  required
                  id="input-activity-outcome"
                  placeholder="e.g. Discussed short term corporate deposits. Scheduled next pricing briefing."
                  value={formData.outcome || ''}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand resize-none"
                ></textarea>
              </div>

              {/* Additional notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Additional Private Staff Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. CFO Kadri is highly receptive; has ₦1B to place."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand resize-none"
                ></textarea>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  id="cancel-activity-form-btn"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-activity-form-btn"
                  className="px-4 py-2 bg-primary-brand hover:bg-primary-dark rounded-lg text-white font-bold cursor-pointer"
                >
                  Log Engagement
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
