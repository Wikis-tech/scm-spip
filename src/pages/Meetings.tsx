import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Clock, 
  Building2, 
  ChevronRight, 
  CheckCircle, 
  X,
  User,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Meeting, Prospect, UserProfile } from '../types';

interface MeetingsProps {
  meetings: Meeting[];
  prospects: Prospect[];
  currentUser: UserProfile;
  onAddMeeting: (meeting: Partial<Meeting>) => Promise<any>;
  onUpdateMeeting: (id: string, updates: Partial<Meeting>) => Promise<any>;
  onDeleteMeeting: (id: string) => Promise<any>;
}

export const Meetings: React.FC<MeetingsProps> = ({
  meetings,
  prospects,
  currentUser,
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Form input field values
  const [formData, setFormData] = useState<Partial<Meeting>>({
    prospectId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    durationMinutes: 45,
    purpose: '',
    outcome: '',
    nextAction: ''
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Filter list
  const filteredMeetings = meetings.filter(m => {
    return (m.prospectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (m.purpose || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (m.outcome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (m.nextAction || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const openCreateForm = () => {
    setSelectedMeeting(null);
    setFormData({
      prospectId: prospects.length > 0 ? prospects[0].id : '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      durationMinutes: 45,
      purpose: '',
      outcome: '',
      nextAction: ''
    });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const openEditForm = (m: Meeting) => {
    setSelectedMeeting(m);
    setFormData({ ...m });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.prospectId) return setFormError('For which corporation is this meeting? Choice required.');
    if (!formData.purpose?.trim()) return setFormError('Primary agenda / meeting purpose is required.');
    if (!formData.date) return setFormError('Scheduled meeting date is required.');

    try {
      if (selectedMeeting) {
        await onUpdateMeeting(selectedMeeting.id, formData);
        setFormSuccess('Corporate calendar schedule updated.');
        setTimeout(() => setIsFormOpen(false), 800);
      } else {
        await onAddMeeting(formData);
        setFormSuccess('Strategic meeting logged under client timelines.');
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

    if (confirm('Permanently delete this meeting from corporate calendars?')) {
      try {
        await onDeleteMeeting(id);
      } catch (err: any) {
        alert(err.message || 'Deletion failed.');
      }
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Search Header and actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm justify-between flex flex-col sm:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search scheduled agenda / outcomes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-primary-brand focus:ring-1 focus:ring-primary-brand rounded-lg pl-9 pr-4 py-2 text-xs text-brand-neutral outline-none transition-all placeholder-slate-400"
          />
        </div>

        {/* Add btns */}
        <button
          id="schedule-meeting-btn"
          onClick={openCreateForm}
          className="bg-primary-brand hover:bg-primary-dark text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-red-950/20 select-none cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Schedule New Meeting
        </button>
      </div>

      {/* Grid displaying cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredMeetings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2 col-span-full">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto animate-none" />
            <p className="text-sm font-semibold text-brand-neutral">No scheduled meetings</p>
            <p className="text-xs text-slate-400">Click Schedule New Meeting to seed fresh calendars.</p>
          </div>
        ) : (
          filteredMeetings.map((m) => {
            return (
              <div 
                key={m.id}
                id={`meeting-card-${m.id}`}
                className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      {/* Associated Organization */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Building2 className="w-4 h-4 text-primary-brand" />
                        <span>Corporate: <strong className="text-brand-neutral">{m.prospectName}</strong></span>
                      </div>
                      
                      {/* Agenda */}
                      <h4 className="font-display font-medium text-sm text-brand-neutral line-clamp-1">
                        {m.purpose}
                      </h4>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEditForm(m)}
                        className="p-1 border border-slate-150 hover:bg-slate-100 rounded text-slate-500 hover:text-brand-neutral transition-colors cursor-pointer"
                        title="Edit log details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {!(currentUser.role !== 'Director' && currentUser.role !== 'Admin') && (
                        <button
                          onClick={(e) => handleDelete(m.id, e)}
                          className="p-1 border border-slate-150 hover:bg-red-50 hover:border-red-250 rounded text-slate-400 hover:text-primary-brand transition-colors cursor-pointer"
                          title="Cancel meeting"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Date Time info bar */}
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] text-slate-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> {m.date}
                    </span>
                    <span className="flex items-center gap-1 border-l-2 border-slate-200 pl-3">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {m.time} ({m.durationMinutes} mins)
                    </span>
                  </div>

                  {/* Outcome and next action blocks */}
                  <div className="space-y-1 bg-slate-50 border border-slate-100 rounded p-3 text-[11.5px] leading-relaxed text-slate-650">
                    <p>
                      <strong>Strategic Agenda:</strong> {m.purpose}
                    </p>
                    {m.outcome && (
                      <p className="text-slate-800">
                        <strong>Meeting Outcome:</strong> {m.outcome}
                      </p>
                    )}
                    {m.nextAction && (
                      <p className="text-indigo-700 font-medium">
                        <strong>Next Follow-up Task:</strong> {m.nextAction}
                      </p>
                    )}
                  </div>
                </div>

                {/* Feet Advisor */}
                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 justify-end">
                  <User className="w-3 h-3 text-slate-400" /> Lead Advisor: {m.officerName || 'Julian Draxler'}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex justify-center items-center z-40 p-4 backdrop-blur-xs font-sans">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="bg-brand-neutral text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-display font-semibold text-xs uppercase tracking-wider">
                {selectedMeeting ? 'Update Scheduled Meeting Record' : 'Schedule Pitch/Presentation Meeting'}
              </h3>
              <button 
                id="close-meeting-form-btn"
                onClick={() => setIsFormOpen(false)}
                className="text-white opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-2 border border-red-200 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-2 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Target prospect selection */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Target Corporate Client *</label>
                <select
                  value={formData.prospectId || ''}
                  id="select-meeting-prospect"
                  onChange={(e) => setFormData({ ...formData, prospectId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary-brand cursor-pointer"
                >
                  <option value="" disabled>Choose an enterprise...</option>
                  {prospects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Date, Time, Duration Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Time</label>
                  <input
                    type="text"
                    value={formData.time || ''}
                    placeholder="10:00 AM"
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Duration (Min)</label>
                  <input
                    type="number"
                    value={formData.durationMinutes || 45}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand"
                  />
                </div>
              </div>

              {/* Agenda / Purpose */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Objective / Meeting Purpose *</label>
                <textarea
                  rows={2}
                  required
                  id="input-meeting-purpose"
                  placeholder="e.g. SCM Corporate Treasury Presentation for exec CFO board."
                  value={formData.purpose || ''}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand resize-none"
                ></textarea>
              </div>

              {/* Outcome if previously finished */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Meeting Outcome (If completed)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Agreement signed in principle. High interest in SCM MMF yield placement."
                  value={formData.outcome || ''}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand resize-none"
                ></textarea>
              </div>

              {/* Next Action plan */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Action Plan / Follow-up Task</label>
                <input
                  type="text"
                  placeholder="Send Mutual Fund draft agreement parameters."
                  value={formData.nextAction || ''}
                  onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  id="cancel-meeting-form-btn"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-meeting-form-btn"
                  className="px-4 py-2 bg-primary-brand hover:bg-primary-dark rounded-lg text-white font-bold cursor-pointer"
                >
                  Save Calendar Schedule
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
