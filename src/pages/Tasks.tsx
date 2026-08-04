import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  CheckSquare, 
  Square, 
  Clock, 
  User, 
  Building2, 
  AlertCircle, 
  Filter, 
  Calendar,
  X,
  CheckCircle,
  TrendingUp,
  Mail,
  Phone,
  PlayCircle
} from 'lucide-react';
import { Task, Prospect, UserProfile } from '../types';

interface TasksProps {
  tasks: Task[];
  prospects: Prospect[];
  currentUser: UserProfile;
  onAddTask: (task: Partial<Task>) => Promise<any>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<any>;
  onDeleteTask: (id: string) => Promise<any>;
}

export const Tasks: React.FC<TasksProps> = ({
  tasks,
  prospects,
  currentUser,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    assignedStaff: currentUser.fullName,
    priority: 'Medium',
    status: 'Pending',
    taskType: 'Call',
    prospectId: ''
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // SCM Roster options
  const taskTypesList = ['Call', 'Meeting', 'Email', 'Visit', 'Presentation', 'Financial Literacy Session'];
  const priorityLevels = ['Low', 'Medium', 'High'];
  const statusesList = ['Pending', 'In Progress', 'Completed', 'Overdue'];

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.prospectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.assignedStaff.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'All' || t.status === selectedStatus;
    const matchesPriority = selectedPriority === 'All' || t.priority === selectedPriority;
    const matchesType = selectedType === 'All' || t.taskType === selectedType;

    return matchesSearch && matchesStatus && matchesPriority && matchesType;
  });

  const openCreateForm = () => {
    setSelectedTask(null);
    setFormData({
      title: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      assignedStaff: currentUser.fullName,
      priority: 'Medium',
      status: 'Pending',
      taskType: 'Call',
      prospectId: prospects.length > 0 ? prospects[0].id : ''
    });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const openEditForm = (t: Task) => {
    setSelectedTask(t);
    setFormData({
      ...t,
      description: t.description || t.notes || ''
    });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.title?.trim()) return setFormError('Task title / core objective is required.');
    if (!formData.assignedStaff?.trim()) return setFormError('Please input assigned wealth advisor staff.');
    if (!formData.dueDate) return setFormError('Please select task timeline target date.');

    // Look up prospect details if prospectId selected
    let relatedProspectName = "General SCM Operations";
    if (formData.prospectId) {
      const p = prospects.find(item => item.id === formData.prospectId);
      if (p) relatedProspectName = p.name;
    }

    const payload = {
      ...formData,
      prospectName: relatedProspectName,
      isCompleted: formData.status === 'Completed'
    };

    try {
      if (selectedTask) {
        await onUpdateTask(selectedTask.id, payload);
        setFormSuccess('Action task record modified successfully.');
        setTimeout(() => setIsFormOpen(false), 850);
      } else {
        await onAddTask(payload);
        setFormSuccess('New business development task logged under active corporate registers.');
        setTimeout(() => setIsFormOpen(false), 850);
      }
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    }
  };

  const toggleTaskCompletion = async (t: Task) => {
    const nextStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await onUpdateTask(t.id, {
        status: nextStatus as any,
        isCompleted: nextStatus === 'Completed'
      });
    } catch (err: any) {
      alert(err.message || 'Error occurred while updating task state.');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser.role !== 'Director' && currentUser.role !== 'Admin') {
      alert('Security Policy: Only SCM Directors or system Administrators hold task deletion permissions.');
      return;
    }

    if (confirm('Permanently wipe this task from SCM Client Timeline registers?')) {
      try {
        await onDeleteTask(id);
      } catch (err: any) {
        alert(err.message || 'Failed deleting task.');
      }
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'High': return 'bg-red-50 text-red-650 border border-red-200';
      case 'Medium': return 'bg-amber-50 text-amber-650 border border-amber-200';
      case 'Low': return 'bg-slate-50 text-slate-650 border border-slate-200';
      default: return 'bg-slate-100 text-slate-650';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'In Progress': return 'bg-blue-50 text-blue-705 border border-blue-200';
      case 'Overdue': return 'bg-red-100 text-[#b1191f] border border-red-200 animate-pulse';
      case 'Pending': 
      default:
        return 'bg-amber-50 text-amber-708 border border-amber-200';
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'Call': return <Phone className="w-3.5 h-3.5 text-blue-500" />;
      case 'Email': return <Mail className="w-3.5 h-3.5 text-orange-500" />;
      case 'Meeting': return <Calendar className="w-3.5 h-3.5 text-[#b1191f]" />;
      case 'Visit': return <Building2 className="w-3.5 h-3.5 text-[#b1191f]" />;
      case 'Presentation': return <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Financial Literacy Session': return <TrendingUp className="w-3.5 h-3.5 text-indigo-600 animate-bounce" />;
      default: return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Search Header and actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tasks, descriptions, staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg pl-9 pr-4 py-2 text-xs text-brand-neutral outline-none transition-all placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto select-none">
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 min-w-max text-xs bg-slate-100 p-1 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status
              </span>
              {['All', 'Pending', 'In Progress', 'Completed', 'Overdue'].map(st => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    selectedStatus === st 
                      ? 'bg-white text-brand-neutral shadow-sm font-bold border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Type selector */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-[11px] font-semibold py-1.5 px-3 outline-none transition-all"
            >
              <option value="All">All Types</option>
              {taskTypesList.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <button
              onClick={openCreateForm}
              className="bg-[#b1191f] hover:bg-[#921419] text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-red-950/20 select-none cursor-pointer text-center ml-auto"
            >
              <Plus className="w-4 h-4" /> Create SCM Task
            </button>
          </div>
        </div>
      </div>

      {/* Task List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-display font-bold text-slate-800 text-sm">Corporate Pipelines are Empty</h3>
            <p className="text-slate-400 text-xs mt-1">No action tasks found with the applied filters.</p>
          </div>
        ) : (
          filteredTasks.map(t => {
            const isOverdue = new Date(t.dueDate) < new Date() && t.status !== 'Completed';
            const statusStyle = isOverdue ? 'Overdue' : t.status;

            return (
              <div 
                key={t.id} 
                className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between group ${
                  t.status === 'Completed' ? 'border-slate-150 bg-slate-50/20' : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 font-bold text-[9.5px] uppercase text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {getTaskTypeIcon(t.taskType)}
                      <span className="tracking-wide">{t.taskType}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getPriorityBadge(t.priority)}`}>
                        {t.priority}
                      </span>
                      <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getStatusBadge(statusStyle)}`}>
                        {statusStyle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 mt-3">
                    <button
                      onClick={() => toggleTaskCompletion(t)}
                      className="text-slate-400 hover:text-emerald-600 transition-colors mt-0.5 cursor-pointer shrink-0"
                      title={t.status === 'Completed' ? "Mark Active" : "Mark Complete"}
                    >
                      {t.status === 'Completed' ? (
                        <CheckSquare className="w-4.5 h-4.5 text-emerald-600" />
                      ) : (
                        <Square className="w-4.5 h-4.5" />
                      )}
                    </button>
                    <div className="min-w-0 font-sans">
                      <h4 className={`font-bold text-xs text-brand-neutral tracking-tight leading-snug cursor-pointer hover:underline ${t.status === 'Completed' ? 'line-through text-slate-400' : ''}`} onClick={() => openEditForm(t)}>
                        {t.title}
                      </h4>
                      {t.description && (
                        <p className={`text-[11px] text-slate-500 mt-1 lines-clamp-2 ${t.status === 'Completed' ? 'text-slate-400/80' : ''}`}>
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold select-none">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="flex items-center gap-1 font-semibold text-slate-400 text-[10px]">
                      <Building2 className="w-3.5 h-3.5" /> {t.prospectName || 'Corporate Ledger'}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Staff: {t.assignedStaff}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-bold text-[10px] text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> {t.dueDate}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                      <button 
                        onClick={() => openEditForm(t)}
                        className="p-1 text-slate-400 hover:text-[#b1191f] transition-colors rounded hover:bg-slate-50 cursor-pointer"
                        title="Edit Task"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(t.id, e)}
                        className="p-1 text-slate-400 hover:text-[#b1191f] transition-colors rounded hover:bg-slate-50 cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Corporate Scheduler Modal */}
      {isFormOpen && (
        <div id="scm-task-modal-backdrop" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-brand-neutral text-xs sm:text-sm uppercase tracking-wider">
                {selectedTask ? 'Modify Client Task Record' : 'Schedule New Client Task'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-800 transition-colors cursor-pointer p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="bg-red-50 text-[#b1191f] border border-red-200 rounded-lg p-3 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4" /> {formError}
                </div>
              )}

              {formSuccess && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 font-medium">
                  <CheckCircle className="w-4 h-4" /> {formSuccess}
                </div>
              )}

              {/* Related Prospect */}
              <div className="flex flex-col gap-1 bg-white">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Client / Organization / Prospect</label>
                <select
                  value={formData.prospectId}
                  onChange={(e) => setFormData({ ...formData, prospectId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-medium text-brand-neutral"
                >
                  <option value="">-- General SCM Operations (No Prospect Linked) --</option>
                  {prospects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.industry})</option>
                  ))}
                </select>
              </div>

              {/* Task Type and Status */}
              <div className="grid grid-cols-2 gap-3.5 bg-white">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Task Channel Type</label>
                  <select
                    value={formData.taskType}
                    onChange={(e) => setFormData({ ...formData, taskType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-semibold text-brand-neutral"
                  >
                    {taskTypesList.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Active Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-semibold text-brand-neutral"
                  >
                    {statusesList.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1 bg-white">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Action Standard / Goal Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Schedule corporate portfolio briefing session"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-semibold text-brand-neutral"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1 bg-white">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Brief Action Instructions</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Specific briefings agenda, target conversion probability milestones..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-medium text-brand-neutral resize-none"
                />
              </div>

              {/* Staff and Due Date */}
              <div className="grid grid-cols-2 gap-3.5 bg-white">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Assigned SCM Advisor</label>
                  <input
                    type="text"
                    value={formData.assignedStaff}
                    onChange={(e) => setFormData({ ...formData, assignedStaff: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2.5 outline-none font-semibold text-brand-neutral"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Target Deadline</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-[#b1191f] focus:ring-1 focus:ring-[#b1191f] rounded-lg p-2 text-brand-neutral font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-1 bg-white">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Client Sizing Priority Level</label>
                <div className="flex gap-2 select-none">
                  {priorityLevels.map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: lvl as any })}
                      className={`flex-1 py-1.5 rounded-lg border font-bold text-[10px] uppercase transition-colors tracking-wide cursor-pointer text-center ${
                        formData.priority === lvl 
                          ? 'bg-amber-955 text-[#b1191f] border-[#b1191f] bg-red-50 font-black' 
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save & Cancel */}
              <div className="pt-2 border-t border-slate-100 flex gap-3.5 bg-white">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-center select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#b1191f] hover:bg-[#921419] text-white font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-center select-none shadow-md shadow-red-950/20"
                >
                  {selectedTask ? 'Submit Changes' : 'Confirm & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
