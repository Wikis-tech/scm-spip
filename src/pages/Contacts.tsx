import React, { useState } from 'react';
import { 
  Users2, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Linkedin, 
  SlidersHorizontal, 
  UserCheck, 
  Edit3, 
  Trash2, 
  X,
  BadgeAlert,
  CheckCircle,
  Building2,
  Info,
  ShieldCheck,
  Send,
  Loader2
} from 'lucide-react';
import { Contact, Prospect, UserProfile, PriorityLevel } from '../types';

interface ContactsProps {
  contacts: Contact[];
  prospects: Prospect[];
  currentUser: UserProfile;
  onAddContact: (contact: Partial<Contact>) => Promise<any>;
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<any>;
  onDeleteContact: (id: string) => Promise<any>;
}

export const Contacts: React.FC<ContactsProps> = ({
  contacts,
  prospects,
  currentUser,
  onAddContact,
  onUpdateContact,
  onDeleteContact
}) => {
  // Local lists states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProspectFilter, setSelectedProspectFilter] = useState('All');
  const [selectedInfluence, setSelectedInfluence] = useState('All');
  const [decisionMakerOnly, setDecisionMakerOnly] = useState(false);

  // Form toggles
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Inputs state
  const [formData, setFormData] = useState<Partial<Contact>>({
    prospectId: '',
    fullName: '',
    position: '',
    department: 'Finance & Treasury',
    email: '',
    phone: '',
    linkedin: '',
    influenceLevel: 'Medium',
    isDecisionMaker: false,
    notes: ''
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Portal invitation dispatch states (Phase 7)
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<{[key: string]: 'idle' | 'sending' | 'success' | 'error'}>({});

  const handleInviteContact = async (contact: Contact) => {
    if (!contact.email) return;
    setInvitingId(contact.id);
    setInviteStatus(prev => ({ ...prev, [contact.id]: 'sending' }));
    try {
      const res = await fetch(`/api/contacts/${contact.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviterName: currentUser.fullName,
          inviterRole: currentUser.role
        })
      });
      if (res.ok) {
        setInviteStatus(prev => ({ ...prev, [contact.id]: 'success' }));
        setTimeout(() => {
          setInviteStatus(prev => ({ ...prev, [contact.id]: 'idle' }));
        }, 5000);
      } else {
        setInviteStatus(prev => ({ ...prev, [contact.id]: 'error' }));
        setTimeout(() => {
          setInviteStatus(prev => ({ ...prev, [contact.id]: 'idle' }));
        }, 5000);
      }
    } catch (e) {
      setInviteStatus(prev => ({ ...prev, [contact.id]: 'error' }));
      setTimeout(() => {
        setInviteStatus(prev => ({ ...prev, [contact.id]: 'idle' }));
      }, 5000);
    } finally {
      setInvitingId(null);
    }
  };

  // Match / Filter logical block
  const filteredContacts = contacts.filter(c => {
    // Hide unverified contacts explicitly
    if (c.validationLevel === 'Unverified') return false;

    const matchesSearch = c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProspect = selectedProspectFilter === 'All' || c.prospectId === selectedProspectFilter;
    const matchesInfluence = selectedInfluence === 'All' || c.influenceLevel === selectedInfluence;
    const matchesDecision = !decisionMakerOnly || c.isDecisionMaker;

    return matchesSearch && matchesProspect && matchesInfluence && matchesDecision;
  });

  // Action sets
  const openCreateForm = () => {
    setSelectedContact(null);
    setFormData({
      prospectId: prospects.length > 0 ? prospects[0].id : '',
      fullName: '',
      position: '',
      department: 'Finance & Treasury',
      email: '',
      phone: '',
      linkedin: '',
      influenceLevel: 'Medium',
      isDecisionMaker: false,
      notes: '',
      validationLevel: 'Verified'
    } as any);
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const openEditForm = (c: Contact) => {
    setSelectedContact(c);
    setFormData({ ...c });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.prospectId) return setFormError('Please select an associated corporate organization.');
    if (!formData.fullName?.trim()) return setFormError('Full name is required.');
    if (!formData.position?.trim()) return setFormError('Officer / Position title is required.');

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return setFormError('Please enter a valid email address.');
    }

    try {
      if (selectedContact) {
        await onUpdateContact(selectedContact.id, formData);
        setFormSuccess('Contact details updated successfully.');
        setTimeout(() => setIsFormOpen(false), 800);
      } else {
        await onAddContact(formData);
        setFormSuccess('Contact successfully added to organizational record.');
        setTimeout(() => setIsFormOpen(false), 800);
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during transaction.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (currentUser.role !== 'Director' && currentUser.role !== 'Admin') {
      alert('Security Policy Alert: Your authenticated SCM Role lacks deletion permissions.');
      return;
    }

    if (confirm(`Are you sure you want to permanently delete the contact "${name}"?`)) {
      try {
        await onDeleteContact(id);
      } catch (err: any) {
        alert(err.message || 'Deletion failed.');
      }
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Search and filter controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-4">
        <div className="relative w-full xl:w-80">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search contact records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-primary-brand focus:ring-1 focus:ring-primary-brand rounded-lg pl-9 pr-4 py-2 text-xs text-brand-neutral outline-none transition-all"
          />
        </div>

        {/* Filters Select row */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <SlidersHorizontal className="w-3 h-3" /> Filters
          </div>

          <select
            value={selectedProspectFilter}
            onChange={(e) => setSelectedProspectFilter(e.target.value)}
            className="bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-700 px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-brand transition-all cursor-pointer"
          >
            <option value="All">All Companies</option>
            {prospects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={selectedInfluence}
            onChange={(e) => setSelectedInfluence(e.target.value)}
            className="bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-700 px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-brand transition-all cursor-pointer"
          >
            <option value="All">All Influence Levels</option>
            <option value="High">High Influence</option>
            <option value="Medium">Medium Influence</option>
            <option value="Low">Low Influence</option>
          </select>

          {/* Decision checkbox */}
          <label className="flex items-center gap-2 text-xs text-slate-600 font-medium select-none cursor-pointer border border-slate-200 hover:border-slate-300 bg-white px-2.5 py-1.5 rounded-lg">
            <input
              type="checkbox"
              checked={decisionMakerOnly}
              onChange={(e) => setDecisionMakerOnly(e.target.checked)}
              className="accent-primary-brand"
            />
            <span>Decision Makers Only</span>
          </label>

          {/* Add btn */}
          <button
            id="add-contact-btn"
            onClick={openCreateForm}
            className="ml-auto xl:ml-2 bg-primary-brand hover:bg-primary-dark text-white font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-red-950/20 select-none cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Contact Person
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredContacts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2 col-span-full">
            <Users2 className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-brand-neutral">No corporate contacts found</p>
            <p className="text-xs text-slate-400">Expand your directories or click Add Contact to seed fresh ones.</p>
          </div>
        ) : (
          filteredContacts.map((c) => {
            return (
              <div 
                key={c.id}
                id={`contact-card-${c.id}`}
                className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Header Row */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h4 className="font-display font-bold text-sm text-brand-neutral leading-tight">
                        {c.fullName}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-400 block uppercase mt-0.5 tracking-wide">
                        {c.position}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {c.isDecisionMaker && (
                          <span className="bg-amber-50 border border-amber-200 text-amber-600 text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5" title="Authorized Decision Maker">
                            <UserCheck className="w-2.5 h-2.5" /> CFO/DM
                          </span>
                        )}

                        <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider ${
                          c.influenceLevel === 'High' ? 'bg-red-50 text-red-600 border border-red-200' :
                          c.influenceLevel === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-slate-50 text-slate-500 border border-slate-250/50'
                        }`}>
                          {c.influenceLevel} Match
                        </span>
                      </div>

                      {c.validationLevel === 'Verified' || !c.validationLevel ? (
                        <span className="bg-emerald-50 border border-emerald-150 text-emerald-700 text-[8.5px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5" title="Verified official contact details (website/direct leadership page)">
                          <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 shrink-0" /> Verified
                        </span>
                      ) : (
                        <span className="bg-sky-50 border border-sky-150 text-sky-750 text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5" title="Public record or LinkedIn professional entry">
                          <Linkedin className="w-2.5 h-2.5 text-sky-600 shrink-0" /> Public
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Associated Firm */}
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-md p-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary-brand" />
                    <span>Company: <strong className="text-brand-neutral">{c.prospectName}</strong></span>
                  </div>
                </div>

                {/* Notes if provided */}
                {c.notes && (
                  <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2 bg-slate-50/50 border border-slate-100/80 rounded p-2 italic">
                    {c.notes}
                  </p>
                )}

                {/* Communicators and Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="p-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-slate-500 hover:text-brand-neutral transition-colors"
                        title="Corporate WebMail"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {c.email && (
                      <button
                        onClick={() => handleInviteContact(c)}
                        disabled={invitingId === c.id || inviteStatus[c.id] === 'success'}
                        className={`p-1.5 rounded border flex items-center justify-center transition-all cursor-pointer ${
                          inviteStatus[c.id] === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : inviteStatus[c.id] === 'error'
                            ? 'bg-red-50 border-red-200 text-red-600'
                            : 'bg-indigo-50 border-indigo-200 hover:border-indigo-300 text-indigo-600 hover:text-indigo-700'
                        }`}
                        title={
                          inviteStatus[c.id] === 'success'
                            ? 'VIP Invitation Sent'
                            : inviteStatus[c.id] === 'error'
                            ? 'Dispatch Failed - Retry'
                            : 'Send SCM VIP Portal Invitation'
                        }
                      >
                        {invitingId === c.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : inviteStatus[c.id] === 'success' ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-xs" />
                        )}
                      </button>
                    )}
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="p-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-slate-500 hover:text-brand-neutral transition-colors"
                        title="Desk Switchboard / Phone"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {c.linkedin && (
                      <a
                        href={`https://${c.linkedin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-slate-50 border border-slate-200 hover:border-sky-200 rounded text-slate-500 hover:text-sky-600 transition-colors"
                        title="LinkedIn Dossier link"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => openEditForm(c)}
                      className="p-1.5 hover:bg-slate-100 rounded border border-slate-200 text-slate-500 hover:text-brand-neutral transition-colors cursor-pointer"
                      title="Edit Contact details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.fullName)}
                      disabled={currentUser.role !== 'Director' && currentUser.role !== 'Admin'}
                      className={`p-1.5 rounded border transition-all cursor-pointer ${
                        currentUser.role === 'Director' || currentUser.role === 'Admin'
                          ? 'hover:bg-red-50 border-slate-200 hover:border-red-200 text-slate-500 hover:text-primary-brand'
                          : 'opacity-40 cursor-not-allowed border-slate-100 text-slate-300'
                      }`}
                      title={currentUser.role === 'Director' || currentUser.role === 'Admin' ? "Permanently Delete Contact" : "Deletion Restricted"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Adding / Editing Modal form context */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex justify-center items-center z-40 p-4 backdrop-blur-xs font-sans animate-in fade-in duration-100">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="bg-brand-neutral text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-display font-semibold text-xs uppercase tracking-wider">
                {selectedContact ? 'Configure Contact Person Parameters' : 'Register Corporate Liaison Person'}
              </h3>
              <button 
                id="close-contact-form-btn"
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

              {/* Select assoc organization */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Associated Client Organization *</label>
                <select
                  value={formData.prospectId || ''}
                  id="select-contact-prospect"
                  onChange={(e) => setFormData({ ...formData, prospectId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary-brand cursor-pointer"
                >
                  <option value="" disabled>Choose an enterprise...</option>
                  {prospects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Contact Person Full Name *</label>
                <input
                  type="text"
                  required
                  id="input-contact-name"
                  value={formData.fullName || ''}
                  placeholder="Mrs. Funmi Balogun"
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand"
                />
              </div>

              {/* Grid 2x2 fields */}
              <div className="grid grid-cols-2 gap-3">
                {/* Position */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Officer / Position Title *</label>
                  <input
                    type="text"
                    required
                    id="input-contact-position"
                    value={formData.position || ''}
                    placeholder="e.g. Treasurer, HR Director"
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand"
                  />
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    placeholder="People, Finance Office"
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Corporate Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    placeholder="f.balogun@company.ng"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mobile / Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    placeholder="+234 802 334 5566"
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand"
                  />
                </div>

                {/* LinkedIn */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">LinkedIn Username / ID</label>
                  <input
                    type="text"
                    placeholder="linkedin.com/in/funmiawo"
                    value={formData.linkedin || ''}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand"
                  />
                </div>

                {/* Influence level */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Influence Match Level</label>
                  <select
                    value={formData.influenceLevel || 'Medium'}
                    onChange={(e) => setFormData({ ...formData, influenceLevel: e.target.value as PriorityLevel })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand cursor-pointer"
                  >
                    <option value="Low">Low Influence</option>
                    <option value="Medium">Medium Influence</option>
                    <option value="High">High Influence</option>
                  </select>
                </div>

                {/* Validation level */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Source Trust Validation</label>
                  <select
                    value={formData.validationLevel || 'Verified'}
                    onChange={(e) => setFormData({ ...formData, validationLevel: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand cursor-pointer"
                  >
                    <option value="Verified">Verified → Official Website/Leadership</option>
                    <option value="Public">Public → LinkedIn/Business Directories</option>
                    <option value="Unverified">Unverified → AI suspected/Draft (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Decision Maker checkbox */}
              <label className="flex items-center gap-2 select-none font-bold text-slate-700 py-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  id="checkbox-contact-decision-maker"
                  checked={formData.isDecisionMaker || false}
                  onChange={(e) => setFormData({ ...formData, isDecisionMaker: e.target.checked })}
                  className="accent-primary-brand scale-110"
                />
                <div className="leading-tight">
                  <span className="block text-xs">Primary Decision Maker Status</span>
                  <span className="block text-[10px] text-slate-400 font-normal">Check if this officer holds primary corporate or treasury allocation signing authorities.</span>
                </div>
              </label>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Additional CRM Dossier Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Prioritizes inflation-hedged wealth preservation products."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary-brand text-xs resize-none"
                ></textarea>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  id="cancel-contact-form-btn"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-contact-form-btn"
                  className="px-4 py-2 bg-primary-brand hover:bg-primary-dark rounded-lg text-white font-bold cursor-pointer"
                >
                  Save Connection Details
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
