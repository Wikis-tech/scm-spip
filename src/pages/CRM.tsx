import React, { useState, useEffect } from 'react';
import { 
  Users2, 
  Inbox, 
  Clock, 
  CheckSquare, 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Paperclip, 
  Calendar,
  Building2,
  Lock,
  SearchCode,
  Sparkles,
  Award,
  BookOpen
} from 'lucide-react';
import { UserProfile, Prospect, Contact, Activity, Meeting, Task } from '../types';
import { Contacts } from './Contacts';
import { Activities } from './Activities';
import { Meetings } from './Meetings';
import { Tasks } from './Tasks';

interface ScmNote {
  id: string;
  title: string;
  content: string;
  prospectId?: string;
  meetingId?: string;
  contactId?: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
}

interface CRMProps {
  initialSubTab?: string;
  currentUser: UserProfile;
  prospects: Prospect[];
  contacts: Contact[];
  activities: Activity[];
  meetings: Meeting[];
  tasks: Task[];
  scmFetch?: (url: string, options?: RequestInit) => Promise<Response>;
  
  // Contacts Handlers
  onAddContact: (contact: Partial<Contact>) => Promise<any>;
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<any>;
  onDeleteContact: (id: string) => Promise<any>;
  
  // Activities Handlers
  onAddActivity: (activity: Partial<Activity>) => Promise<any>;
  onUpdateActivity: (id: string, updates: Partial<Activity>) => Promise<any>;
  onDeleteActivity: (id: string) => Promise<any>;
  
  // Meetings Handlers
  onAddMeeting: (meeting: Partial<Meeting>) => Promise<any>;
  onUpdateMeeting: (id: string, updates: Partial<Meeting>) => Promise<any>;
  onDeleteMeeting: (id: string) => Promise<any>;
  
  // Tasks Handlers
  onAddTask: (task: Partial<Task>) => Promise<any>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<any>;
  onDeleteTask: (id: string) => Promise<any>;
}

export const CRM: React.FC<CRMProps> = ({
  initialSubTab = 'contacts',
  currentUser,
  prospects,
  contacts,
  activities,
  meetings,
  tasks,
  scmFetch,
  
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
  
  onAddTask,
  onUpdateTask,
  onDeleteTask
}) => {
  const [crmSubTab, setCrmSubTab] = useState<string>(initialSubTab);
  
  // Notes states
  const [notes, setNotes] = useState<ScmNote[]>([]);

  const refreshNotesFromDB = async () => {
    if (!scmFetch) return;
    try {
      const res = await scmFetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        const mappedNotes: ScmNote[] = data.map((n: any) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          prospectId: n.prospectId,
          meetingId: n.meetingId,
          contactId: n.contactId,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          authorId: n.createdBy,
          authorName: n.authorName || 'Relationship Officer'
        }));
        setNotes(mappedNotes);
      }
    } catch (err) {
      console.error('Failed to synchronize notes:', err);
    }
  };

  useEffect(() => {
    if (scmFetch) {
      refreshNotesFromDB();
    } else {
      const saved = localStorage.getItem('scm_crm_notes');
      if (saved) {
        try {
          setNotes(JSON.parse(saved));
        } catch (err) {
          setNotes([]);
        }
      } else {
        setNotes([
          {
            id: 'note-1',
            title: 'Dangote Treasury Rate Alignments',
            content: 'Negotiated on ₦450M treasury placements. Client requests premium structured rates. Target closing within next week.',
            prospectId: prospects[0]?.id || 'prospect-1',
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            authorId: currentUser.id,
            authorName: currentUser.fullName
          }
        ]);
      }
    }
  }, [crmSubTab, scmFetch]);

  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteProspectId, setNoteProspectId] = useState('');
  const [noteMeetingId, setNoteMeetingId] = useState('');
  const [noteContactId, setNoteContactId] = useState('');
  const [noteSearch, setNoteSearch] = useState('');

  useEffect(() => {
    if (!scmFetch) {
      localStorage.setItem('scm_crm_notes', JSON.stringify(notes));
    }
  }, [notes, scmFetch]);

  useEffect(() => {
    if (initialSubTab) {
      setCrmSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;

    if (scmFetch) {
      try {
        if (editingNoteId) {
          const res = await scmFetch(`/api/notes/${editingNoteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: noteTitle,
              content: noteContent,
              prospectId: noteProspectId || undefined,
              meetingId: noteMeetingId || undefined,
              contactId: noteContactId || undefined
            })
          });
          if (res.ok) {
            await refreshNotesFromDB();
          }
        } else {
          const res = await scmFetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: noteTitle,
              content: noteContent,
              prospectId: noteProspectId || undefined,
              meetingId: noteMeetingId || undefined,
              contactId: noteContactId || undefined,
              visibility: 'private'
            })
          });
          if (res.ok) {
            await refreshNotesFromDB();
          }
        }
      } catch (err) {
        console.error('Failed to persist note on server:', err);
      }
    } else {
      if (editingNoteId) {
        setNotes(prev => prev.map(n => n.id === editingNoteId ? {
          ...n,
          title: noteTitle,
          content: noteContent,
          prospectId: noteProspectId || undefined,
          meetingId: noteMeetingId || undefined,
          contactId: noteContactId || undefined,
          updatedAt: new Date().toISOString()
        } : n));
      } else {
        const newNote: ScmNote = {
          id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: noteTitle,
          content: noteContent,
          prospectId: noteProspectId || undefined,
          meetingId: noteMeetingId || undefined,
          contactId: noteContactId || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorId: currentUser.id,
          authorName: currentUser.fullName
        };
        setNotes(prev => [newNote, ...prev]);
      }
    }

    // Reset form
    setNoteFormOpen(false);
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteProspectId('');
    setNoteMeetingId('');
    setNoteContactId('');
  };

  const handleEditNote = (note: ScmNote) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteProspectId(note.prospectId || '');
    setNoteMeetingId(note.meetingId || '');
    setNoteContactId(note.contactId || '');
    setNoteFormOpen(true);
  };

  const handleDeleteNote = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this internal note?')) {
      if (scmFetch) {
        try {
          const res = await scmFetch(`/api/notes/${id}`, { method: 'DELETE' });
          if (res.ok) {
            await refreshNotesFromDB();
          }
        } catch (err) {
          console.error('Failed to delete note from server:', err);
        }
      } else {
        setNotes(prev => prev.filter(n => n.id !== id));
      }
    }
  };

  const tabsModel = [
    { id: 'contacts', name: 'Contacts', icon: Users2, count: contacts.length },
    { id: 'activities', name: 'Activities', icon: Inbox, count: activities.length },
    { id: 'meetings', name: 'Meetings', icon: Clock, count: meetings.length },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare, count: tasks.filter(t => !t.isCompleted).length },
    { id: 'notes', name: 'Notes', icon: FileText, count: notes.length }
  ];

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(noteSearch.toLowerCase()) || 
    n.content.toLowerCase().includes(noteSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Institutional CRM Overview Panel */}
      <div id="scm-crm-dashboard-metrics" className="bg-white rounded-xl border border-slate-200/85 p-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-center divide-y md:divide-y-0 md:divide-x divide-slate-100 gap-4">
        <div className="min-w-[170px] pb-4 md:pb-0 md:pr-6 shrink-0">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Unified SCM CRM</span>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5">Corporate Pipeline</h2>
          <span className="text-[11px] text-slate-500 mt-1 block leading-relaxed">Consolidated Relationship Registry</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 grow gap-4 pt-4 md:pt-0 md:pl-6 w-full">
          <button 
            onClick={() => setCrmSubTab('contacts')}
            className={`p-3 rounded-lg border text-left transition-all ${
              crmSubTab === 'contacts' ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/40 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Contacts</span>
            <span className="text-lg font-black text-slate-800 block mt-0.5">{contacts.length}</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">Enterprise People</span>
          </button>

          <button 
            onClick={() => setCrmSubTab('activities')}
            className={`p-3 rounded-lg border text-left transition-all ${
              crmSubTab === 'activities' ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/40 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Activities</span>
            <span className="text-lg font-black text-slate-800 block mt-0.5">{activities.length}</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">Logs & Dialogues</span>
          </button>

          <button 
            onClick={() => setCrmSubTab('meetings')}
            className={`p-3 rounded-lg border text-left transition-all ${
              crmSubTab === 'meetings' ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/40 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Meetings</span>
            <span className="text-lg font-black text-slate-800 block mt-0.5">{meetings.length}</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">Advisory Briefs</span>
          </button>

          <button 
            onClick={() => setCrmSubTab('tasks')}
            className={`p-3 rounded-lg border text-left transition-all ${
              crmSubTab === 'tasks' ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/40 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Open Tasks</span>
            <span className="text-lg font-black text-slate-800 block mt-0.5">
              {tasks.filter(t => !t.isCompleted).length}
            </span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">Pending Follow-ups</span>
          </button>

          <button 
            onClick={() => setCrmSubTab('notes')}
            className={`p-3 rounded-lg border text-left transition-all ${
              crmSubTab === 'notes' ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/40 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Shared Notes</span>
            <span className="text-lg font-black text-slate-800 block mt-0.5">{notes.length}</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">Internal Briefs</span>
          </button>
        </div>
      </div>

      {/* CRM Navigation Sub-tabs */}
      <div className="flex overflow-x-auto scrollbar-thin border-b border-slate-200/85 whitespace-nowrap min-w-0">
        {tabsModel.map(t => {
          const IconComp = t.icon;
          const isActive = crmSubTab === t.id;
          return (
            <button
              key={t.id}
              id={`crm-tab-${t.id}`}
              onClick={() => setCrmSubTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                isActive 
                  ? 'border-[#b1191f] text-[#b1191f]' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <IconComp className={`w-4 h-4 ${isActive ? 'text-[#b1191f]' : 'text-slate-400'}`} />
              <span>{t.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${isActive ? 'bg-red-100 text-[#b1191f]' : 'bg-slate-100 text-slate-500'}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Section Content Container */}
      <div id="scm-crm-section-viewport" className="p-1">
        {crmSubTab === 'contacts' && (
          <Contacts 
            contacts={contacts} 
            prospects={prospects} 
            currentUser={currentUser} 
            onAddContact={onAddContact} 
            onUpdateContact={onUpdateContact} 
            onDeleteContact={onDeleteContact} 
          />
        )}
        
        {crmSubTab === 'activities' && (
          <Activities 
            activities={activities} 
            prospects={prospects} 
            currentUser={currentUser} 
            onAddActivity={onAddActivity} 
            onUpdateActivity={onUpdateActivity} 
            onDeleteActivity={onDeleteActivity} 
          />
        )}

        {crmSubTab === 'meetings' && (
          <Meetings 
            meetings={meetings} 
            prospects={prospects} 
            currentUser={currentUser} 
            onAddMeeting={onAddMeeting} 
            onUpdateMeeting={onUpdateMeeting} 
            onDeleteMeeting={onDeleteMeeting} 
          />
        )}

        {crmSubTab === 'tasks' && (
          <Tasks 
            tasks={tasks} 
            prospects={prospects} 
            currentUser={currentUser} 
            onAddTask={onAddTask} 
            onUpdateTask={onUpdateTask} 
            onDeleteTask={onDeleteTask} 
          />
        )}

        {crmSubTab === 'notes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-3 w-1/2">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filter key executive details or notes..."
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  className="w-full text-xs text-slate-700 bg-transparent placeholder-slate-400 focus:outline-none"
                />
              </div>
              <button 
                id="crm-add-note-btn"
                onClick={() => {
                  setEditingNoteId(null);
                  setNoteTitle('');
                  setNoteContent('');
                  setNoteProspectId('');
                  setNoteMeetingId('');
                  setNoteContactId('');
                  setNoteFormOpen(true);
                }}
                className="bg-[#b1191f] hover:bg-[#8e1217] text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Private Note</span>
              </button>
            </div>

            {/* Note Editor Modal */}
            {noteFormOpen && (
              <div className="fixed inset-0 bg-slate-950/45 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      {editingNoteId ? 'Edit Internal Note' : 'Create Internal SCM Note'}
                    </h3>
                    <button 
                      onClick={() => setNoteFormOpen(false)}
                      className="text-slate-400 hover:text-slate-700 font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                  <form onSubmit={handleSaveNote} className="p-6 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-15">Title</label>
                      <input 
                        type="text" 
                        required
                        placeholder="E.g., Wealth Advisory Deal Terms"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-250 bg-slate-50/50 focus:outline-none focus:border-[#b1191f]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-15">Details & Content</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder="Write down meeting minutes, personal strategies, or client notes..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-250 bg-slate-50/50 focus:outline-none focus:border-[#b1191f] resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-15">Link Prospect</label>
                        <select 
                          value={noteProspectId}
                          onChange={(e) => setNoteProspectId(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-250 bg-slate-50/50 focus:outline-none"
                        >
                          <option value="">-- None --</option>
                          {prospects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-15">Link Contact</label>
                        <select 
                          value={noteContactId}
                          onChange={(e) => setNoteContactId(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-250 bg-slate-50/50 focus:outline-none"
                        >
                          <option value="">-- None --</option>
                          {contacts.map(c => (
                            <option key={c.id} value={c.id}>{c.fullName}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-15">Link Meeting</label>
                        <select 
                          value={noteMeetingId}
                          onChange={(e) => setNoteMeetingId(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-250 bg-slate-50/50 focus:outline-none"
                        >
                          <option value="">-- None --</option>
                          {meetings.map(m => (
                            <option key={m.id} value={m.id}>{m.purpose || m.time}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full mt-4 bg-[#b1191f] hover:bg-[#8e1217] text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <span>Save Note</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Render Notes list */}
            {filteredNotes.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-slate-700 font-bold text-xs uppercase tracking-wide">No Internal Notes Found</h4>
                <p className="text-slate-400 text-[10px] mt-1">Get started by creating a client note and linking it to prospects.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map(note => {
                  const linkedProspect = prospects.find(p => p.id === note.prospectId);
                  const linkedContact = contacts.find(c => c.id === note.contactId);
                  const linkedMeeting = meetings.find(m => m.id === note.meetingId);
                  
                  return (
                    <div 
                      key={note.id} 
                      className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-sm text-slate-750 tracking-tight leading-tight block select-all">{note.title}</h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                              onClick={() => handleEditNote(note)}
                              title="Edit Note"
                              className="p-1 text-slate-400 hover:text-slate-705 hover:bg-slate-50 rounded transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteNote(note.id)}
                              title="Delete Note"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-550 leading-relaxed font-sans whitespace-pre-line bg-slate-50/30 p-2.5 rounded-lg border border-slate-100 italic">
                          "{note.content}"
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        {/* Linked Entities */}
                        <div className="flex flex-wrap gap-1.5">
                          {linkedProspect && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded uppercase tracking-wide">
                              <Building2 className="w-2.5 h-2.5" />
                              <span>{linkedProspect.name}</span>
                            </span>
                          )}
                          {linkedContact && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded uppercase tracking-wide">
                              <Users2 className="w-2.5 h-2.5" />
                              <span>{linkedContact.fullName}</span>
                            </span>
                          )}
                          {linkedMeeting && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-150 px-2 py-0.5 rounded uppercase tracking-wide">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{linkedMeeting.purpose || 'Advisory Pitch'}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                          <span>By: {note.authorName}</span>
                          <span className="capitalize">{new Date(note.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
