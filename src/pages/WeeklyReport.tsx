import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Plus, 
  Save, 
  Send, 
  History, 
  CheckCircle, 
  AlertCircle, 
  Lock, 
  Download, 
  TrendingUp, 
  Sparkles,
  ChevronRight,
  Printer,
  FileCheck
} from 'lucide-react';
import { UserProfile } from '../types';

interface WeeklyReportProps {
  currentUser: UserProfile;
}

export interface ReportData {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  weekStartDate: string;
  weekEndDate: string;
  summary: string;
  prospectsAdded: number;
  meetingsHeld: number;
  followUpsCompleted: number;
  fundsSecured: number;
  productsSold: string;
  challenges: string;
  nextWeekPlan: string;
  status: 'Draft' | 'Submitted' | 'Reviewed';
  submittedAt?: string | null;
  updatedAt: string;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ currentUser }) => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [weekStartDate, setWeekStartDate] = useState('');
  const [weekEndDate, setWeekEndDate] = useState('');
  const [summary, setSummary] = useState('');
  const [prospectsAdded, setProspectsAdded] = useState(0);
  const [meetingsHeld, setMeetingsHeld] = useState(0);
  const [followUpsCompleted, setFollowUpsCompleted] = useState(0);
  const [fundsSecured, setFundsSecured] = useState(0);
  const [productsSold, setProductsSold] = useState('');
  const [challenges, setChallenges] = useState('');
  const [nextWeekPlan, setNextWeekPlan] = useState('');

  const getWeekRange = (date = new Date()) => {
    const currentDay = date.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(date);
    monday.setDate(date.getDate() + distanceToMonday);
    
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    return {
      monday: formatDate(monday),
      friday: formatDate(friday)
    };
  };

  const isWithinEditPeriod = () => {
    if (currentUser.permissionLevel === 'SUPER_ADMIN' || currentUser.permissionLevel === 'HOD_ADMIN') {
      return true;
    }
    const now = new Date();
    const day = now.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
    const hour = now.getHours();
    const minute = now.getMinutes();

    if (day < 3 || day > 5) return false;
    if (day === 3) return hour > 9 || (hour === 9 && minute >= 0);
    if (day === 4) return true;
    if (day === 5) return hour < 16 || (hour === 16 && minute <= 20);
    return false;
  };

  const canEdit = isEditing && isWithinEditPeriod();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/weekly-reports', {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
          'x-user-email': currentUser.email
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        if (data.length > 0) {
          // Select the latest report by default
          const sorted = [...data].sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime());
          setSelectedReport(sorted[0]);
          loadReportIntoForm(sorted[0]);
        } else {
          // Default to creating a draft for the current week
          handleNewReport();
        }
      } else {
        setError('Failed to fetch reports.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadReportIntoForm = (report: ReportData) => {
    setWeekStartDate(report.weekStartDate);
    setWeekEndDate(report.weekEndDate);
    setSummary(report.summary);
    setProspectsAdded(report.prospectsAdded);
    setMeetingsHeld(report.meetingsHeld);
    setFollowUpsCompleted(report.followUpsCompleted);
    setFundsSecured(report.fundsSecured);
    setProductsSold(report.productsSold);
    setChallenges(report.challenges);
    setNextWeekPlan(report.nextWeekPlan);
    setIsEditing(report.status === 'Draft');
  };

  const handleSelectReport = (report: ReportData) => {
    setSelectedReport(report);
    loadReportIntoForm(report);
    setError(null);
    setSuccessMessage(null);
  };

  const handleNewReport = async () => {
    const currentWeek = getWeekRange();
    
    // Check if report for current week already exists
    const exists = reports.find(r => r.weekStartDate === currentWeek.monday);
    if (exists) {
      handleSelectReport(exists);
      setSuccessMessage('An active report draft already exists for this week.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/weekly-reports/auto-generate?weekStartDate=${currentWeek.monday}&weekEndDate=${currentWeek.friday}`, {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
          'x-user-email': currentUser.email
        }
      });
      if (res.ok) {
        const generated = await res.json();
        setWeekStartDate(currentWeek.monday);
        setWeekEndDate(currentWeek.friday);
        setSummary(generated.summary || '');
        setProspectsAdded(generated.prospectsAdded || 0);
        setMeetingsHeld(generated.meetingsHeld || 0);
        setFollowUpsCompleted(generated.followUpsCompleted || 0);
        setFundsSecured(generated.fundsSecured || 0);
        setProductsSold(generated.productsSold || 'None');
        setChallenges(generated.challenges || '');
        setNextWeekPlan(generated.nextWeekPlan || '');
        setSelectedReport(null);
        setIsEditing(true);
        setSuccessMessage('Productivity engine automatically compiled your weekly activities!');
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to auto-generate weekly performance report.');
        setWeekStartDate(currentWeek.monday);
        setWeekEndDate(currentWeek.friday);
        setSummary('');
        setProspectsAdded(0);
        setMeetingsHeld(0);
        setFollowUpsCompleted(0);
        setFundsSecured(0);
        setProductsSold('');
        setChallenges('');
        setNextWeekPlan('');
        setSelectedReport(null);
        setIsEditing(true);
      }
    } catch (err) {
      console.warn('Auto-generation failed, falling back to empty fields:', err);
      setWeekStartDate(currentWeek.monday);
      setWeekEndDate(currentWeek.friday);
      setSummary('');
      setProspectsAdded(0);
      setMeetingsHeld(0);
      setFollowUpsCompleted(0);
      setFundsSecured(0);
      setProductsSold('');
      setChallenges('');
      setNextWeekPlan('');
      setSelectedReport(null);
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!summary.trim()) return 'Summary section is required.';
    if (prospectsAdded < 0) return 'Prospects added cannot be negative.';
    if (meetingsHeld < 0) return 'Meetings held cannot be negative.';
    if (followUpsCompleted < 0) return 'Follow ups completed cannot be negative.';
    if (fundsSecured < 0) return 'Funds secured cannot be negative.';
    if (!productsSold.trim()) return 'Products sold/recommended section is required.';
    if (!challenges.trim()) return 'Challenges section is required.';
    if (!nextWeekPlan.trim()) return 'Next Week Plan is required.';
    return null;
  };

  const handleSaveDraft = async () => {
    setError(null);
    setSuccessMessage(null);

    const reportPayload = {
      id: selectedReport?.id,
      weekStartDate,
      weekEndDate,
      summary,
      prospectsAdded,
      meetingsHeld,
      followUpsCompleted,
      fundsSecured,
      productsSold,
      challenges,
      nextWeekPlan,
      status: 'Draft' as const
    };

    try {
      const res = await fetch('/api/weekly-reports', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
          'x-user-email': currentUser.email
        },
        body: JSON.stringify(reportPayload)
      });

      if (res.ok) {
        const result = await res.json();
        setSuccessMessage('Draft saved successfully!');
        
        // Refresh report list
        const updatedRes = await fetch('/api/weekly-reports', {
          headers: {
            'x-user-id': currentUser.id,
            'x-user-role': currentUser.role,
            'x-user-email': currentUser.email
          }
        });
        if (updatedRes.ok) {
          const freshData = await updatedRes.json();
          setReports(freshData);
          const savedReport = freshData.find((r: ReportData) => r.id === result.report.id);
          if (savedReport) {
            setSelectedReport(savedReport);
            loadReportIntoForm(savedReport);
          }
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save draft.');
      }
    } catch (err) {
      setError('Network failure. Could not connect to SCM server.');
    }
  };

  const handleSubmitReport = async () => {
    setError(null);
    setSuccessMessage(null);

    const validationErr = validateForm();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    if (!window.confirm('Are you sure you want to submit this report? Submitting will lock this report and notify management. This action cannot be undone.')) {
      return;
    }

    const reportPayload = {
      id: selectedReport?.id,
      weekStartDate,
      weekEndDate,
      summary,
      prospectsAdded,
      meetingsHeld,
      followUpsCompleted,
      fundsSecured,
      productsSold,
      challenges,
      nextWeekPlan,
      status: 'Submitted' as const
    };

    try {
      const res = await fetch('/api/weekly-reports', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
          'x-user-email': currentUser.email
        },
        body: JSON.stringify(reportPayload)
      });

      if (res.ok) {
        setSuccessMessage('Weekly Performance Report successfully submitted to SCM Management!');
        
        // Refresh report list
        const updatedRes = await fetch('/api/weekly-reports', {
          headers: {
            'x-user-id': currentUser.id,
            'x-user-role': currentUser.role,
            'x-user-email': currentUser.email
          }
        });
        if (updatedRes.ok) {
          const freshData = await updatedRes.json();
          setReports(freshData);
          const submitted = freshData.find((r: ReportData) => r.weekStartDate === weekStartDate);
          if (submitted) {
            setSelectedReport(submitted);
            loadReportIntoForm(submitted);
          }
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to submit report.');
      }
    } catch (err) {
      setError('Network failure. Could not connect to SCM server.');
    }
  };

  const triggerExport = async (format: 'PDF' | 'Word' | 'Excel') => {
    if (!selectedReport) return;
    
    try {
      await fetch(`/api/admin/weekly-reports/log-export/${selectedReport.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({ format })
      });
    } catch (e) {
      console.warn('Logging export failed:', e);
    }

    if (format === 'PDF') {
      window.print();
    } else if (format === 'Excel') {
      const csvContent = "data:text/csv;charset=utf-8," 
        + [
            ["SCM Capital - Weekly Performance Report"],
            [`Officer: ${selectedReport.userName} (${selectedReport.userEmail})`],
            [`Period: ${selectedReport.weekStartDate} to ${selectedReport.weekEndDate}`],
            [`Status: ${selectedReport.status}`],
            ["Metric", "Value"],
            ["Prospects Added", selectedReport.prospectsAdded],
            ["Meetings Held", selectedReport.meetingsHeld],
            ["Follow Ups Completed", selectedReport.followUpsCompleted],
            ["Funds Secured (NGN)", selectedReport.fundsSecured],
            [],
            ["Section", "Contents"],
            ["Summary", selectedReport.summary],
            ["Products Sold", selectedReport.productsSold],
            ["Challenges", selectedReport.challenges],
            ["Next Week Plan", selectedReport.nextWeekPlan],
          ].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SCM_Weekly_Report_${selectedReport.weekStartDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'Word') {
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>SCM Capital Weekly Performance Report</title></head>
        <body style="font-family: Arial, sans-serif;">
          <h2>SCM CAPITAL - WEEKLY PERFORMANCE REPORT</h2>
          <p><b>Officer Name:</b> ${selectedReport.userName}</p>
          <p><b>Officer Email:</b> ${selectedReport.userEmail}</p>
          <p><b>Reporting Week:</b> ${selectedReport.weekStartDate} to ${selectedReport.weekEndDate}</p>
          <p><b>Status:</b> ${selectedReport.status}</p>
          <hr />
          <h3>METRICS ACCOMPLISHED</h3>
          <ul>
            <li><b>Prospects Added:</b> ${selectedReport.prospectsAdded}</li>
            <li><b>Meetings Held:</b> ${selectedReport.meetingsHeld}</li>
            <li><b>Follow-ups Completed:</b> ${selectedReport.followUpsCompleted}</li>
            <li><b>Funds Secured:</b> ₦${selectedReport.fundsSecured.toLocaleString()}</li>
          </ul>
          <hr />
          <h3>REPORT CONTENT</h3>
          <p><b>Accomplishments Summary:</b><br />${selectedReport.summary.replace(/\n/g, '<br />')}</p>
          <p><b>Products Recommended/Sold:</b><br />${selectedReport.productsSold.replace(/\n/g, '<br />')}</p>
          <p><b>Challenges Encountered:</b><br />${selectedReport.challenges.replace(/\n/g, '<br />')}</p>
          <p><b>Objectives for Next Week:</b><br />${selectedReport.nextWeekPlan.replace(/\n/g, '<br />')}</p>
        </body>
        </html>
      `;
      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SCM_Weekly_Report_${selectedReport.weekStartDate}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6" id="scm-weekly-reporting-dashboard">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-primary" />
            <span>Weekly Performance Report</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            SCM corporate accountability governance reporting system. Submit report every Friday.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleNewReport}
            className="px-4 py-2 text-xs font-bold bg-brand-primary text-white rounded-lg hover:bg-brand-primary/95 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New This Week</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List/History */}
        <div className="lg:col-span-4 bg-white border border-slate-200/85 rounded-xl p-4 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-slate-400" />
            <span>My Submission History</span>
          </h2>
          
          {loading && reports.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading SCM databases...</div>
          ) : reports.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic">No reports filed yet. Click "New This Week" to start.</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {[...reports].sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()).map(r => (
                <button
                  key={r.id}
                  onClick={() => handleSelectReport(r)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center ${
                    selectedReport?.id === r.id
                      ? 'border-brand-primary bg-slate-50'
                      : 'border-slate-150 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-700 block">
                      Week of {new Date(r.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {r.weekStartDate} to {r.weekEndDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      r.status === 'Reviewed'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : r.status === 'Submitted'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}>
                      {r.status}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Editor or Viewer */}
        <div className="lg:col-span-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="bg-white border border-slate-200/85 rounded-xl shadow-sm overflow-hidden">
            {/* Header / Meta */}
            <div className="bg-slate-50 border-b border-slate-200/85 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider block">
                  SCM CAPITAL NG • PERFORMANCE AUDIT
                </span>
                <h2 className="text-sm font-bold text-slate-800">
                  Performance Week: {weekStartDate} to {weekEndDate}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full ${
                  (selectedReport?.status || 'Draft') === 'Reviewed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : (selectedReport?.status || 'Draft') === 'Submitted'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {selectedReport?.status || 'Draft'}
                </span>

                {selectedReport && (
                  <div className="flex gap-1 border-l pl-2 border-slate-200 ml-1">
                    <button
                      onClick={() => triggerExport('PDF')}
                      title="Export PDF / Print"
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => triggerExport('Word')}
                      title="Export Word"
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-all"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => triggerExport('Excel')}
                      title="Export CSV Excel"
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Form Editor / Read-only View */}
            <div className="p-6 space-y-6">
              {/* Show Warning Banner if Reporting Window is Closed but report is draft */}
              {isEditing && !isWithinEditPeriod() && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-850">
                  <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-bold text-amber-900 block">Weekly Report Form Locked (Reporting Window Closed)</span>
                    <span className="text-[10px] text-amber-700 block">
                      Relationship Officers may only edit and submit performance reports between Wednesday 09:00 AM and Friday 04:20 PM. Currently, this draft is read-only. Please contact a Super Admin if you require late modification.
                    </span>
                  </div>
                </div>
              )}

              {canEdit ? (
                <div className="space-y-5">
                  {/* Grid of numeric metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-150 space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                        Prospects Added
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={prospectsAdded}
                        onChange={e => setProspectsAdded(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-primary"
                      />
                      <span className="text-[10px] text-slate-400 block">Organizations added.</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-150 space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                        Meetings Held
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={meetingsHeld}
                        onChange={e => setMeetingsHeld(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-primary"
                      />
                      <span className="text-[10px] text-slate-400 block">Meetings completed.</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-150 space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                        Follow Ups
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={followUpsCompleted}
                        onChange={e => setFollowUpsCompleted(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-primary"
                      />
                      <span className="text-[10px] text-slate-400 block">Activities executed.</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-150 space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                        Funds Secured (₦)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₦</span>
                        <input
                          type="number"
                          min="0"
                          value={fundsSecured}
                          onChange={e => setFundsSecured(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2.5 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block">Total secured value.</span>
                    </div>
                  </div>

                  {/* Text sections */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                        Summary • Accomplishments *
                      </label>
                      <textarea
                        rows={3}
                        value={summary}
                        onChange={e => setSummary(e.target.value)}
                        placeholder="What was accomplished this week? Please write a detailed enterprise summary..."
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                        Products Sold / Recommended *
                      </label>
                      <textarea
                        rows={2}
                        value={productsSold}
                        onChange={e => setProductsSold(e.target.value)}
                        placeholder="Specify wealth, treasury, mmf products recommended or transactions sold..."
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                        Challenges & Roadblocks *
                      </label>
                      <textarea
                        rows={2}
                        value={challenges}
                        onChange={e => setChallenges(e.target.value)}
                        placeholder="Explain any major roadblocks or policy constraints encountered..."
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                        Objectives for Next Week *
                      </label>
                      <textarea
                        rows={2}
                        value={nextWeekPlan}
                        onChange={e => setNextWeekPlan(e.target.value)}
                        placeholder="Clearly list primary strategic goals and target accounts for next week..."
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4 text-slate-500" />
                      <span>Save Draft</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitReport}
                      className="px-4 py-2 text-xs font-bold bg-brand-primary hover:bg-brand-primary/95 text-white rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Performance Report</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Read-Only Viewer */
                <div className="space-y-6" id="scm-weekly-report-view-only">
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-5 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">REPORT SUBMITTED BY:</span>
                      <span className="text-sm font-extrabold text-slate-705 block">{selectedReport?.userName}</span>
                      <span className="text-xs text-slate-400 block">{selectedReport?.userEmail}</span>
                    </div>
                    {selectedReport?.submittedAt && (
                      <div className="space-y-1 md:text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">SUBMISSION DATE:</span>
                        <span className="text-xs font-mono font-bold text-slate-600 block">
                          {new Date(selectedReport.submittedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Numeric KPI metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Prospects Added</span>
                      <span className="text-lg font-black text-slate-800">{selectedReport?.prospectsAdded}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Meetings Held</span>
                      <span className="text-lg font-black text-slate-800">{selectedReport?.meetingsHeld}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Follow Ups</span>
                      <span className="text-lg font-black text-slate-800">{selectedReport?.followUpsCompleted}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Funds Secured</span>
                      <span className="text-lg font-black text-emerald-600">₦{selectedReport?.fundsSecured.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Core report texts */}
                  <div className="space-y-5 pt-2">
                    <div className="space-y-1.5 border-b pb-3 border-slate-100">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-brand-primary" />
                        <span>Accomplishments Summary</span>
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap pl-5 pt-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                        {selectedReport?.summary}
                      </p>
                    </div>

                    <div className="space-y-1.5 border-b pb-3 border-slate-100">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-brand-primary" />
                        <span>Products Recommended / Sold</span>
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap pl-5 pt-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                        {selectedReport?.productsSold}
                      </p>
                    </div>

                    <div className="space-y-1.5 border-b pb-3 border-slate-100">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-brand-primary" />
                        <span>Challenges & Policy Constraints</span>
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap pl-5 pt-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                        {selectedReport?.challenges}
                      </p>
                    </div>

                    <div className="space-y-1.5 pb-3">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-brand-primary" />
                        <span>Objectives for Next Week</span>
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap pl-5 pt-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                        {selectedReport?.nextWeekPlan}
                      </p>
                    </div>
                  </div>

                  {/* Locked status banner */}
                  <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3">
                    <Lock className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-700 block">Report Submission Sealed</span>
                      <span className="text-[10px] text-slate-500 block">
                        This report was submitted and is now locked for editing. If you need to make corrections, please contact a Super Admin to unlock it.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
