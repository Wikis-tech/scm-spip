import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Search, 
  Filter, 
  CheckCircle, 
  Lock, 
  Unlock, 
  Download, 
  Printer, 
  AlertCircle,
  FileSpreadsheet,
  Building,
  User,
  Calendar,
  Layers,
  Check,
  RefreshCw
} from 'lucide-react';
import { UserProfile } from '../types';
import { ReportData } from './WeeklyReport';

interface AdminReportsProps {
  currentUser: UserProfile;
}

export const AdminReports: React.FC<AdminReportsProps> = ({ currentUser }) => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('All');
  const [selectedUser, setSelectedUser] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');

  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);

  useEffect(() => {
    fetchAdminReports();
  }, []);

  const fetchAdminReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/weekly-reports', {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
          'x-user-email': currentUser.email
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        if (data.length > 0 && !selectedReport) {
          setSelectedReport(data[0]);
        } else if (selectedReport) {
          // Re-select fresh data for current selected
          const updated = data.find((r: ReportData) => r.id === selectedReport.id);
          if (updated) setSelectedReport(updated);
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to fetch weekly performance reports.');
      }
    } catch (err) {
      setError('Connection failure to SCM performance audit database.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewReport = async (reportId: string) => {
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/admin/weekly-reports/review/${reportId}`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
          'x-user-email': currentUser.email
        }
      });
      if (res.ok) {
        setSuccessMessage('Report successfully marked as Reviewed and logged to audit trail!');
        await fetchAdminReports();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to review report.');
      }
    } catch (err) {
      setError('Connection failure.');
    }
  };

  const handleUnlockReport = async (reportId: string) => {
    setError(null);
    setSuccessMessage(null);
    if (!window.confirm('Are you sure you want to unlock this report? This will allow the officer to edit and resubmit their draft.')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/weekly-reports/unlock/${reportId}`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
          'x-user-email': currentUser.email
        }
      });
      if (res.ok) {
        setSuccessMessage('Report successfully unlocked and returned to Draft status!');
        await fetchAdminReports();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to unlock report.');
      }
    } catch (err) {
      setError('Connection failure.');
    }
  };

  const triggerExport = async (report: ReportData, format: 'PDF' | 'Word' | 'Excel') => {
    try {
      await fetch(`/api/admin/weekly-reports/log-export/${report.id}`, {
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
            [`Officer: ${report.userName} (${report.userEmail})`],
            [`Period: ${report.weekStartDate} to ${report.weekEndDate}`],
            [`Status: ${report.status}`],
            ["Metric", "Value"],
            ["Prospects Added", report.prospectsAdded],
            ["Meetings Held", report.meetingsHeld],
            ["Follow Ups Completed", report.followUpsCompleted],
            ["Funds Secured (NGN)", report.fundsSecured],
            [],
            ["Section", "Contents"],
            ["Summary", report.summary],
            ["Products Sold", report.productsSold],
            ["Challenges", report.challenges],
            ["Next Week Plan", report.nextWeekPlan],
          ].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `SCM_Weekly_Report_${report.userName}_${report.weekStartDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'Word') {
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>SCM Capital Weekly Performance Report</title></head>
        <body style="font-family: Arial, sans-serif;">
          <h2>SCM CAPITAL - WEEKLY PERFORMANCE REPORT</h2>
          <p><b>Officer Name:</b> ${report.userName}</p>
          <p><b>Officer Email:</b> ${report.userEmail}</p>
          <p><b>Reporting Week:</b> ${report.weekStartDate} to ${report.weekEndDate}</p>
          <p><b>Status:</b> ${report.status}</p>
          <hr />
          <h3>METRICS ACCOMPLISHED</h3>
          <ul>
            <li><b>Prospects Added:</b> ${report.prospectsAdded}</li>
            <li><b>Meetings Held:</b> ${report.meetingsHeld}</li>
            <li><b>Follow-ups Completed:</b> ${report.followUpsCompleted}</li>
            <li><b>Funds Secured:</b> ₦${report.fundsSecured.toLocaleString()}</li>
          </ul>
          <hr />
          <h3>REPORT CONTENT</h3>
          <p><b>Accomplishments Summary:</b><br />${report.summary.replace(/\n/g, '<br />')}</p>
          <p><b>Products Recommended/Sold:</b><br />${report.productsSold.replace(/\n/g, '<br />')}</p>
          <p><b>Challenges Encountered:</b><br />${report.challenges.replace(/\n/g, '<br />')}</p>
          <p><b>Objectives for Next Week:</b><br />${report.nextWeekPlan.replace(/\n/g, '<br />')}</p>
        </body>
        </html>
      `;
      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SCM_Weekly_Report_${report.userName}_${report.weekStartDate}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Get unique values for filters
  const weeks = ['All', ...new Set(reports.map(r => r.weekStartDate))];
  const users = ['All', ...new Set(reports.map(r => r.userName))];
  const statuses = ['All', 'Draft', 'Submitted', 'Reviewed'];
  const depts = ['All', 'Wealth Management', 'Investment Banking', 'Treasury', 'Brokerage', 'Business Development'];

  // Filter logic
  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      r.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.productsSold.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesWeek = selectedWeek === 'All' || r.weekStartDate === selectedWeek;
    const matchesUser = selectedUser === 'All' || r.userName === selectedUser;
    const matchesStatus = selectedStatus === 'All' || r.status === selectedStatus;
    
    // Departments: simulated or actual
    const matchesDept = selectedDept === 'All'; // default matches if all

    return matchesSearch && matchesWeek && matchesUser && matchesStatus && matchesDept;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" id="scm-admin-reports-dashboard">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-brand-primary" />
            <span>Weekly Reports Governance Center</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Supervisory module for reviewing, unlocking, and exporting Relationship Officer Friday submissions.
          </p>
        </div>
        <div>
          <button
            onClick={fetchAdminReports}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all flex items-center gap-1 text-xs font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Data</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="relative">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Search Text
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search summary, user..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Filter by Week
          </label>
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-primary"
          >
            {weeks.map(w => (
              <option key={w} value={w}>{w === 'All' ? 'All Weeks' : `Week starting ${w}`}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Filter by Officer
          </label>
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-primary"
          >
            {users.map(u => (
              <option key={u} value={u}>{u === 'All' ? 'All Officers' : u}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Filter by Status
          </label>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-primary"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Filter by Department
          </label>
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-primary"
          >
            {depts.map(d => (
              <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
            ))}
          </select>
        </div>
      </div>

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

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filtered List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
            <span>Submissions ({filteredReports.length})</span>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              SYSTEM ISOLATION APPROVED
            </span>
          </h2>

          {loading && reports.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading SCM databases...</div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">No submissions matching active criteria.</div>
          ) : (
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredReports.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                    selectedReport?.id === r.id
                      ? 'border-brand-primary bg-slate-50'
                      : 'border-slate-150 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-black text-slate-800 block">
                        {r.userName}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {r.userEmail}
                      </span>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      r.status === 'Reviewed'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : r.status === 'Submitted'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-2 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{r.weekStartDate} to {r.weekEndDate}</span>
                    </span>
                    <span className="font-bold text-emerald-600">
                      ₦{r.fundsSecured.toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Governance controls & Viewer */}
        <div className="lg:col-span-7">
          {selectedReport ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-6">
              {/* Header/Actions */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-brand-primary uppercase tracking-wider block">
                    SCM SUPERVISOR PANEL
                  </span>
                  <h3 className="text-sm font-bold text-slate-800">
                    Report from {selectedReport.userName}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => triggerExport(selectedReport, 'PDF')}
                    title="Export PDF / Print"
                    className="p-1.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-all shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => triggerExport(selectedReport, 'Word')}
                    title="Export Word"
                    className="p-1.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-all shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => triggerExport(selectedReport, 'Excel')}
                    title="Export CSV Excel"
                    className="p-1.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action governance banner */}
              <div className="px-6 py-1">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-705 block">Report Control Actions</span>
                    <span className="text-[10px] text-slate-400 block">
                      Status is currently <strong className="text-slate-600 font-extrabold">{selectedReport.status}</strong>.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {selectedReport.status === 'Submitted' && (
                      <button
                        onClick={() => handleReviewReport(selectedReport.id)}
                        className="px-3.5 py-1.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark as Reviewed</span>
                      </button>
                    )}
                    {selectedReport.status !== 'Draft' && (
                      <button
                        onClick={() => handleUnlockReport(selectedReport.id)}
                        className="px-3.5 py-1.5 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all flex items-center gap-1 shadow-sm"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlock to Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Report content */}
              <div className="p-6 pt-0 space-y-6">
                <div className="border border-slate-150 rounded-xl p-4.5 bg-slate-50/40 space-y-2">
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block text-[10px] uppercase">Officer:</span>
                      <strong className="text-slate-700">{selectedReport.userName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block text-[10px] uppercase">Email:</span>
                      <strong className="text-slate-700 font-mono">{selectedReport.userEmail}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block text-[10px] uppercase">Week Period:</span>
                      <strong className="text-slate-700">{selectedReport.weekStartDate} to {selectedReport.weekEndDate}</strong>
                    </div>
                    {selectedReport.submittedAt && (
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">Submitted:</span>
                        <strong className="text-slate-700 font-mono">{new Date(selectedReport.submittedAt).toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* KPI metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-center shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prospects Added</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{selectedReport.prospectsAdded}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-center shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meetings Held</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{selectedReport.meetingsHeld}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-center shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Follow Ups</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{selectedReport.followUpsCompleted}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-center shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Funds Secured</span>
                    <span className="text-lg font-black text-emerald-600 block mt-1">₦{selectedReport.fundsSecured.toLocaleString()}</span>
                  </div>
                </div>

                {/* Detailed narratives */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accomplishments Summary</span>
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                      {selectedReport.summary}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Products Recommended / Sold</span>
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                      {selectedReport.productsSold}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Challenges Encountered</span>
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                      {selectedReport.challenges}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Objectives for Next Week</span>
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                      {selectedReport.nextWeekPlan}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center text-slate-400 italic">
              Please select a report submission on the left to review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
