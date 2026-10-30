import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Building,
  AlertCircle,
  X,
  FileCheck,
  Edit,
  ArrowRight
} from 'lucide-react';
import {
  fetchAllApplications,
  fetchCampusDrives,
  updateApplicationStatus,
  fetchApplicationDetail
} from '../../career-modules/api/client';

export const ApplicantManagement = () => {
  const [applications, setApplications] = useState([]);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDriveId, setSelectedDriveId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Status Update Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [targetApplication, setTargetApplication] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('Shortlisted');
  const [updateRemarks, setUpdateRemarks] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // Audit History Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditApp, setAuditApp] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [apps, drivesData] = await Promise.all([
        fetchAllApplications({
          drive_id: selectedDriveId !== 'ALL' ? selectedDriveId : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined
        }),
        fetchCampusDrives()
      ]);
      setApplications(apps || []);
      setDrives(drivesData || []);
    } catch (err) {
      console.error('Failed to load applicants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDriveId, selectedStatus]);

  const handleOpenStatusModal = (app) => {
    setTargetApplication(app);
    setUpdateStatus(app.status === 'Applied' ? 'Under Review' : app.status);
    setUpdateRemarks(app.remarks || '');
    setInterviewDate(app.interview_date ? String(app.interview_date).substring(0, 16) : '');
    setInterviewLocation(app.interview_location || '');
    setStatusError(null);
    setIsUpdateModalOpen(true);
  };

  const handleOpenAuditModal = async (app) => {
    try {
      const detailed = await fetchApplicationDetail(app.id);
      setAuditApp(detailed);
      setIsAuditModalOpen(true);
    } catch {
      setAuditApp(app);
      setIsAuditModalOpen(true);
    }
  };

  const handleSubmitStatusUpdate = async (e) => {
    e.preventDefault();
    if (!targetApplication) return;

    try {
      setSubmittingStatus(true);
      setStatusError(null);

      const payload = {
        status: updateStatus,
        remarks: updateRemarks || undefined,
        interview_date: updateStatus === 'Interview Scheduled' && interviewDate ? interviewDate : undefined,
        interview_location: updateStatus === 'Interview Scheduled' && interviewLocation ? interviewLocation : undefined
      };

      await updateApplicationStatus(targetApplication.id, payload);
      setIsUpdateModalOpen(false);
      await loadData();
    } catch (err) {
      setStatusError(err.message || 'Failed to update application status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const studentStr = String(app.student_id);
    const driveInfo = app.drive || drives.find(d => d.id === app.drive_id) || {};
    const company = (driveInfo.company_name || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    return studentStr.includes(query) || company.includes(query);
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Applied':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'Under Review':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'Shortlisted':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
      case 'Interview Scheduled':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';
      case 'Selected':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-black';
      case 'Rejected':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      case 'Withdrawn':
        return 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="theme-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider">
              TPO Candidate Evaluation
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Applicant Review & Shortlisting
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review verified candidate applications, schedule interviews, and maintain an immutable status audit trail.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Applications
        </button>
      </div>

      {/* 2. Filters Bar */}
      <div className="theme-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search student ID or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={selectedDriveId}
            onChange={(e) => setSelectedDriveId(e.target.value)}
            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Drives ({drives.length})</option>
            {drives.map((d) => (
              <option key={d.id} value={d.id}>
                {d.company_name} - {d.job_title || d.job_role}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Applied">Applied</option>
            <option value="Under Review">Under Review</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
            <option value="Selected">Selected</option>
            <option value="Rejected">Rejected</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {/* 3. Applicants Table */}
      <div className="theme-card overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm">No applications found matching the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-4">Student Candidate</th>
                  <th className="p-4">Drive & Company</th>
                  <th className="p-4">Attendance at Application</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Applied Date</th>
                  <th className="p-4 text-right">TPO Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredApplications.map((app) => {
                  const driveInfo = app.drive || drives.find(d => d.id === app.drive_id) || {};
                  const isAttCompliant = app.attendance_percentage_at_application >= 75.0;

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition">
                      <td className="p-4">
                        <div className="font-black text-slate-900 dark:text-slate-100 text-sm">
                          Student ID: #{app.student_id}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Resume ID: {app.resume_id ? `#${app.resume_id}` : 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {driveInfo.company_name || `Drive #${app.drive_id}`}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {driveInfo.job_title || driveInfo.job_role || 'Job Position'}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.5 rounded font-extrabold ${
                          isAttCompliant ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                        }`}>
                          {app.attendance_percentage_at_application}% {isAttCompliant ? '✔ Eligible' : '✖ Deficit'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenAuditModal(app)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1"
                            title="Audit Trail"
                          >
                            <Eye className="w-3.5 h-3.5" /> History
                          </button>
                          <button
                            onClick={() => handleOpenStatusModal(app)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" /> Update Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {isUpdateModalOpen && targetApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="theme-card max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                  Update Candidate Progress
                </span>
                <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 mt-1">
                  Student #{targetApplication.student_id}
                </h3>
              </div>
              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {statusError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pipeline Stage / Status *
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-blue-500"
                >
                  <option value="Under Review">Under Review</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Interview Scheduled">Interview Scheduled</option>
                  <option value="Selected">Selected (Offer Issued)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {updateStatus === 'Interview Scheduled' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Interview Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Interview Venue / Meeting Link
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Campus Placement Cell Room 302 or Google Meet URL"
                      value={interviewLocation}
                      onChange={(e) => setInterviewLocation(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Evaluation Remarks / Feedback
                </label>
                <textarea
                  rows={3}
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  placeholder="Provide context for the status update (will be visible in student timeline)..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStatus}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {submittingStatus ? 'Updating...' : 'Save & Log Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {isAuditModalOpen && auditApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="theme-card max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                  Audit History
                </span>
                <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 mt-1">
                  Application Audit Trail: Student #{auditApp.student_id}
                </h3>
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {auditApp.audits && auditApp.audits.length > 0 ? (
                auditApp.audits.map((a, idx) => (
                  <div
                    key={a.id || idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {a.old_status ? `${a.old_status} → ` : ''}{a.new_status}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(a.changed_at).toLocaleString()}
                      </span>
                    </div>
                    {a.remarks && (
                      <p className="text-slate-600 dark:text-slate-400 italic">
                        "{a.remarks}"
                      </p>
                    )}
                    <span className="block text-[10px] text-slate-400">
                      Logged by: <strong>{a.changed_by}</strong>
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-center py-4">No audit logs recorded.</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
