import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Target,
  Bot,
  HelpCircle,
  Sparkles,
  Building,
  ShieldCheck,
  ShieldAlert,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Lock,
  ArrowRight,
  Layers,
  Briefcase,
  Clock,
  XCircle,
  AlertCircle,
  Send,
  Eye,
  Check,
  X,
  FileCheck,
  RefreshCw
} from 'lucide-react';

// Import career module components (default exports)
import ResumeUpload from '../../career-modules/components/ResumeUpload';
import JobMatcher from '../../career-modules/components/JobMatcher';
import RagChat from '../../career-modules/components/RagChat';
import InterviewPrep from '../../career-modules/components/InterviewPrep';
import ResumeSuggestions from '../../career-modules/components/ResumeSuggestions';

// API Client for Career AI Service
import {
  fetchHealth,
  fetchResumes,
  fetchResumeDetail,
  fetchPlacementEligibility,
  fetchCampusDrives,
  fetchMyApplications,
  submitPlacementApplication,
  withdrawPlacementApplication
} from '../../career-modules/api/client';

export const PlacementHub = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  // Support direct deep linking from sidebar navigation tabs
  const initialTab = (urlTab === 'eligibility' ? 'drives' : urlTab) || 'upload';
  const [activeTab, setActiveTabState] = useState(initialTab);

  const [eligibility, setEligibility] = useState(null);
  const [health, setHealth] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [activeResume, setActiveResume] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dynamic drives and student applications state
  const [drives, setDrives] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [selectedAppDetail, setSelectedAppDetail] = useState(null);

  // Apply modal state
  const [applyModalDrive, setApplyModalDrive] = useState(null);
  const [applyResumeId, setApplyResumeId] = useState('');
  const [applyRemarks, setApplyRemarks] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [applySuccessMsg, setApplySuccessMsg] = useState(null);

  // Withdraw state
  const [withdrawingId, setWithdrawingId] = useState(null);

  // Sync tab with URL search parameter
  const setActiveTab = (tabId) => {
    setActiveTabState(tabId);
    setSearchParams({ tab: tabId });
  };

  useEffect(() => {
    if (urlTab) {
      const target = urlTab === 'eligibility' ? 'drives' : urlTab;
      if (['upload', 'jobs', 'rag', 'interview', 'polish', 'drives', 'applications'].includes(target)) {
        setActiveTabState(target);
      }
    }
  }, [urlTab]);

  // Load backend health and student's isolated resumes
  const loadResumes = async (preferredId = null) => {
    try {
      const data = await fetchResumes();
      setResumes(data || []);
      if (data && data.length > 0) {
        const targetId = preferredId || (data.some(r => r.id === selectedResumeId) ? selectedResumeId : data[0].id);
        setSelectedResumeId(targetId);
        setApplyResumeId(targetId);
        await loadResumeDetail(targetId);
      } else {
        setSelectedResumeId(null);
        setApplyResumeId('');
        setActiveResume(null);
      }
    } catch (err) {
      console.error('Failed to load resumes:', err);
    }
  };

  const loadResumeDetail = async (id) => {
    if (!id) return;
    try {
      const detail = await fetchResumeDetail(id);
      setActiveResume(detail);
    } catch (err) {
      console.error('Failed to load resume detail:', err);
    }
  };

  const loadHealth = async () => {
    try {
      const h = await fetchHealth();
      setHealth(h);
    } catch (err) {
      setHealth({ status: 'offline', error: err.message });
    }
  };

  const loadDrives = async () => {
    try {
      const list = await fetchCampusDrives();
      setDrives(list || []);
    } catch (err) {
      console.error('Failed to load drives:', err);
    }
  };

  const loadApplications = async () => {
    try {
      const apps = await fetchMyApplications();
      setMyApplications(apps || []);
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([
        loadHealth(),
        loadResumes(),
        loadDrives(),
        loadApplications()
      ]);

      // Check verified attendance eligibility via environment-driven authenticated client
      try {
        const data = await fetchPlacementEligibility();
        setEligibility(data);
      } catch {
        setEligibility({
          attendance_percentage: 0.0,
          minimum_required: 75.0,
          is_eligible: false,
          total_lectures: 0,
          attended_lectures: 0,
          status: "ATTENDANCE_UNAVAILABLE",
          message: "Institutional attendance verification failed or service is offline. Placement privileges remain locked until verified."
        });
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [user]);

  const handleSelectResume = async (id) => {
    setSelectedResumeId(id);
    setApplyResumeId(id);
    await loadResumeDetail(id);
  };

  const handleUploadSuccess = async (newId) => {
    await loadResumes(newId);
    setActiveTab('upload');
  };

  const handleDeleteSuccess = async () => {
    await loadResumes();
  };

  const handleOpenApplyModal = (drive) => {
    setApplyModalDrive(drive);
    setApplyResumeId(selectedResumeId || (resumes[0]?.id || ''));
    setApplyRemarks('');
    setApplyError(null);
    setApplySuccessMsg(null);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!applyModalDrive) return;
    if (!applyResumeId) {
      setApplyError('Please upload and select an active resume first.');
      return;
    }

    try {
      setSubmittingApply(true);
      setApplyError(null);
      await submitPlacementApplication({
        drive_id: applyModalDrive.id,
        resume_id: applyResumeId,
        remarks: applyRemarks || undefined
      });
      setApplySuccessMsg('Application submitted successfully!');
      await loadApplications();
      await loadDrives();
      setTimeout(() => {
        setApplyModalDrive(null);
        setActiveTab('applications');
      }, 1200);
    } catch (err) {
      setApplyError(err.message || 'Application failed to submit');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleWithdrawApplication = async (appId) => {
    if (!window.confirm('Are you sure you want to withdraw this application? This action will mark your application as Withdrawn.')) {
      return;
    }
    try {
      setWithdrawingId(appId);
      await withdrawPlacementApplication(appId);
      await loadApplications();
      await loadDrives();
    } catch (err) {
      alert(`Withdrawal failed: ${err.message}`);
    } finally {
      setWithdrawingId(null);
    }
  };

  const pct = eligibility?.attendance_percentage ?? 0.0;
  const isEligible = Boolean(eligibility?.is_eligible && pct >= 75.0);

  // Map of applied drive IDs to application objects for quick lookup
  const appliedDriveMap = {};
  myApplications.forEach(app => {
    appliedDriveMap[app.drive_id] = app;
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

  const pipelineSteps = ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected'];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="theme-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider">
              AI Career Studio & Placements
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Generative AI • ChromaDB • Verified Attendance Gate
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Resume Intelligence & Placement Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your resumes, check ATS job alignment, practice mock interviews, and apply for verified campus drives.
          </p>
        </div>

        {/* Active Resume Selector Dropdown */}
        {resumes.length > 0 && (
          <div className="flex items-center gap-2 p-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shadow-2xs">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-slate-500 font-medium">Active:</span>
            <select
              value={selectedResumeId || ''}
              onChange={(e) => handleSelectResume(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer max-w-[180px] truncate"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id} className="dark:bg-slate-900">
                  {r.filename} ({r.skills_count} skills)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Institutional Attendance-Eligibility Gate Banner */}
      <div className={`theme-card p-5 border ${
        isEligible
          ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30'
          : 'bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent border-amber-500/30'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isEligible
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
            }`}>
              {isEligible ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {isEligible ? 'Placement Gate: VERIFIED & ACTIVE' : 'Placement Privilege Hold: ATTENDANCE DEFICIT'}
                </h3>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
                  isEligible
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}>
                  {pct}% Attendance
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {isEligible
                  ? `Your academic attendance (${pct}%) satisfies the university 75.0% threshold. You can apply to open campus recruitment drives with your verified resume.`
                  : `Your attendance (${pct}%) is below the mandatory 75.0% university threshold. You can prepare resumes and practice interviews, but campus drive submissions are locked until your attendance improves.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase">Requirement</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">75.0% Min</span>
            </div>
            <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase">Lectures</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {eligibility?.attended_lectures || 0}/{eligibility?.total_lectures || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Studio Navigation Tabs (Pills) */}
      <div className="theme-card p-2 flex overflow-x-auto gap-1.5">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          1. Upload & Resume Manager ({resumes.length})
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'jobs'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Target className="w-4 h-4" />
          2. Job Description Matcher
        </button>

        <button
          onClick={() => setActiveTab('rag')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'rag'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bot className="w-4 h-4" />
          3. RAG Resume Chat
        </button>

        <button
          onClick={() => setActiveTab('interview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'interview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          4. STAR Interview Coach
        </button>

        <button
          onClick={() => setActiveTab('polish')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'polish'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          5. Google X-Y-Z Polish
        </button>

        <button
          onClick={() => setActiveTab('drives')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'drives'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          6. Campus Drives ({drives.length})
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'applications'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          7. My Applications ({myApplications.length})
        </button>
      </div>

      {/* 4. Tab Panels */}
      {activeTab === 'upload' && (
        <div className="theme-card p-6">
          <ResumeUpload
            resumes={resumes}
            activeResume={activeResume}
            onUploadSuccess={handleUploadSuccess}
            onDeleteSuccess={handleDeleteSuccess}
          />
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="theme-card p-6">
          <JobMatcher activeResume={activeResume} />
        </div>
      )}

      {activeTab === 'rag' && (
        <div className="theme-card p-6">
          <RagChat activeResume={activeResume} health={health} />
        </div>
      )}

      {activeTab === 'interview' && (
        <div className="theme-card p-6">
          <InterviewPrep activeResume={activeResume} />
        </div>
      )}

      {activeTab === 'polish' && (
        <div className="theme-card p-6">
          <ResumeSuggestions activeResume={activeResume} />
        </div>
      )}

      {/* 6. Campus Drives Tab */}
      {activeTab === 'drives' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Active Placement Drives
            </h2>
            <button
              onClick={() => { loadDrives(); loadApplications(); }}
              className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Drives
            </button>
          </div>

          {drives.length === 0 ? (
            <div className="theme-card p-12 text-center text-slate-500">
              <Building className="w-12 h-12 mx-auto mb-3 text-slate-400 opacity-50" />
              <p className="font-semibold text-sm">No campus drives currently open.</p>
              <p className="text-xs mt-1">Check back soon or consult the Training & Placement Office.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {drives.map((drive) => {
                const reqAtt = drive.min_attendance_percentage ?? drive.required_min_attendance ?? 75.0;
                const driveEligible = pct >= reqAtt && drive.status === 'OPEN';
                const existingApp = appliedDriveMap[drive.id];

                return (
                  <div
                    key={drive.id}
                    className="theme-card p-5 flex flex-col justify-between hover:border-blue-500/50 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                              {drive.drive_type || 'Full Time'}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              drive.status === 'OPEN'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-slate-500/10 text-slate-500'
                            }`}>
                              {drive.status}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mt-1.5">
                            {drive.job_title || drive.job_role}
                          </h3>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {drive.company_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            ₹{drive.salary_lpa || drive.package_lpa} LPA
                          </span>
                          <span className="text-[10px] text-slate-400 block">CTC Package</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">
                        {drive.job_description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Required Attendance:</span>
                          <span className={`font-bold ${
                            driveEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            Min {reqAtt}% {driveEligible ? '✔ Eligible' : '✖ Deficit'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Application Deadline:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {drive.deadline}
                          </span>
                        </div>

                        {drive.tags && drive.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {drive.tags.map((t, i) => (
                              <span
                                key={i}
                                className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setActiveTab('jobs')}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        Match ATS <ArrowRight className="w-3 h-3" />
                      </button>

                      {existingApp ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${getStatusBadge(existingApp.status)}`}>
                            <Check className="w-3 h-3" />
                            {existingApp.status}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedAppDetail(existingApp);
                              setActiveTab('applications');
                            }}
                            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:underline"
                          >
                            View
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={!driveEligible}
                          onClick={() => handleOpenApplyModal(drive)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            driveEligible
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {driveEligible ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Apply with Active Resume
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              Locked ({pct < reqAtt ? `Attendance ${pct}% < ${reqAtt}%` : 'Drive Closed'})
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. My Applications Tab */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Submitted Placement Applications
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track your active placement applications, interview invites, and TPO review statuses.
              </p>
            </div>
            <button
              onClick={loadApplications}
              className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Statuses
            </button>
          </div>

          {myApplications.length === 0 ? (
            <div className="theme-card p-12 text-center text-slate-500">
              <FileCheck className="w-12 h-12 mx-auto mb-3 text-slate-400 opacity-50" />
              <p className="font-semibold text-sm">No applications submitted yet.</p>
              <p className="text-xs mt-1">
                Explore campus drives in the <span className="text-blue-600 font-bold cursor-pointer" onClick={() => setActiveTab('drives')}>Campus Drives tab</span> and apply with your active resume.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myApplications.map((app) => {
                const driveInfo = app.drive || drives.find(d => d.id === app.drive_id) || {};
                const isSelected = selectedAppDetail?.id === app.id;
                const canWithdraw = ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled'].includes(app.status);

                return (
                  <div
                    key={app.id}
                    className={`theme-card p-5 border transition-all ${
                      isSelected ? 'border-blue-500 shadow-sm' : ''
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${getStatusBadge(app.status)}`}>
                            {app.status}
                          </span>
                          <span className="text-xs text-slate-400">
                            Applied: {new Date(app.applied_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                          {driveInfo.job_title || driveInfo.job_role || 'Job Position'}
                        </h3>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {driveInfo.company_name || 'Campus Recruiter'} • ₹{driveInfo.salary_lpa || driveInfo.package_lpa} LPA
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <span className="text-slate-400 block text-[10px]">Verified Attendance</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {app.attendance_percentage_at_application}%
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedAppDetail(isSelected ? null : app)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isSelected ? 'Hide Details' : 'Track Progress'}
                        </button>

                        {canWithdraw && (
                          <button
                            disabled={withdrawingId === app.id}
                            onClick={() => handleWithdrawApplication(app.id)}
                            className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            {withdrawingId === app.id ? 'Withdrawing...' : 'Withdraw'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Progress Timeline & Audit Details */}
                    {isSelected && (
                      <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-5">
                        {/* Status Stepper */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            Recruitment Pipeline Progress
                          </h4>
                          {app.status === 'Rejected' || app.status === 'Withdrawn' ? (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              <span>Application has been marked as <strong>{app.status}</strong>.</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {pipelineSteps.map((step, idx) => {
                                const currIdx = pipelineSteps.indexOf(app.status);
                                const isPassed = currIdx >= idx;
                                const isCurrent = app.status === step;

                                return (
                                  <div
                                    key={step}
                                    className={`p-2.5 rounded-xl border text-center transition-all ${
                                      isCurrent
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                        : isPassed
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
                                    }`}
                                  >
                                    <span className="block text-[10px] font-bold">Step {idx + 1}</span>
                                    <span className="text-xs font-extrabold truncate">{step}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Interview Details if Scheduled */}
                        {(app.interview_date || app.interview_location) && (
                          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
                            <span className="font-bold text-indigo-700 dark:text-indigo-300 block">
                              📅 Interview Information
                            </span>
                            {app.interview_date && (
                              <p className="text-slate-700 dark:text-slate-300">
                                Date & Time: <strong>{new Date(app.interview_date).toLocaleString()}</strong>
                              </p>
                            )}
                            {app.interview_location && (
                              <p className="text-slate-700 dark:text-slate-300">
                                Venue / Link: <strong>{app.interview_location}</strong>
                              </p>
                            )}
                          </div>
                        )}

                        {/* TPO Remarks */}
                        {app.remarks && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                            <span className="font-bold text-slate-500 block text-[10px] uppercase">Remarks / Instructions</span>
                            <p className="text-slate-800 dark:text-slate-200 mt-0.5">{app.remarks}</p>
                          </div>
                        )}

                        {/* Audit Trail */}
                        {app.audits && app.audits.length > 0 && (
                          <div>
                            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Audit History
                            </h5>
                            <div className="space-y-1.5 font-mono text-[11px]">
                              {app.audits.map((audit) => (
                                <div
                                  key={audit.id}
                                  className="p-2 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-slate-600 dark:text-slate-400"
                                >
                                  <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                      {audit.old_status ? `${audit.old_status} → ` : ''}{audit.new_status}
                                    </span>
                                    {audit.remarks && <span className="ml-2 italic text-slate-500">({audit.remarks})</span>}
                                  </div>
                                  <div className="text-right text-[10px] text-slate-400">
                                    <span>by {audit.changed_by} • {new Date(audit.changed_at).toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Apply Modal */}
      {applyModalDrive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="theme-card max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                  Submit Campus Application
                </span>
                <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 mt-1">
                  {applyModalDrive.job_title || applyModalDrive.job_role}
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {applyModalDrive.company_name} • CTC ₹{applyModalDrive.salary_lpa || applyModalDrive.package_lpa} LPA
                </p>
              </div>
              <button
                onClick={() => setApplyModalDrive(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applyError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            {applySuccessMsg && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{applySuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Application Resume
                </label>
                {resumes.length === 0 ? (
                  <p className="text-xs text-rose-500 font-medium">
                    No resumes found. Please upload a resume first in Tab 1.
                  </p>
                ) : (
                  <select
                    value={applyResumeId}
                    onChange={(e) => setApplyResumeId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.filename} (Uploaded: {new Date(r.created_at).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Attendance Verification Comparison */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Your Verified Attendance</span>
                  <span className="font-extrabold text-emerald-600 text-sm">{pct}%</span>
                </div>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Drive Requirement</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-300 text-sm">
                    {applyModalDrive.min_attendance_percentage ?? applyModalDrive.required_min_attendance ?? 75.0}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Candidate Note / Cover Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={applyRemarks}
                  onChange={(e) => setApplyRemarks(e.target.value)}
                  placeholder="E.g., Proficient in cloud architectures and eager to contribute to the core distributed systems team..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApplyModalDrive(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApply || resumes.length === 0}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingApply ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Confirm Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
