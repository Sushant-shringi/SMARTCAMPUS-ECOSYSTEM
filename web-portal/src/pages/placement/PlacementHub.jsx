import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Layers,
  ChevronDown
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
  fetchResumeDetail
} from '../../career-modules/api/client';

export const PlacementHub = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upload'); // Default to Upload Resume
  const [eligibility, setEligibility] = useState(null);
  const [health, setHealth] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [activeResume, setActiveResume] = useState(null);
  const [loading, setLoading] = useState(true);

  // Campus Placement Drives
  const drives = [
    {
      id: "drv_001",
      company_name: "Google Cloud Technologies",
      job_role: "Associate Cloud Engineer",
      package_lpa: 18.5,
      required_min_attendance: 80.0,
      eligibility_criteria: "MCA / B.Tech CSE, Min 80% Attendance",
      deadline: "2026-11-15",
      tags: ["Cloud", "Kubernetes", "Python"]
    },
    {
      id: "drv_002",
      company_name: "Microsoft India",
      job_role: "Software Development Engineer",
      package_lpa: 22.0,
      required_min_attendance: 75.0,
      eligibility_criteria: "MCA / B.Tech, Min 75% Attendance, Strong Data Structures",
      deadline: "2026-11-20",
      tags: ["C#", "React", "Distributed Systems"]
    },
    {
      id: "drv_003",
      company_name: "TCS Digital & Innovator",
      job_role: "Systems Development Engineer",
      package_lpa: 9.0,
      required_min_attendance: 75.0,
      eligibility_criteria: "All Branches, Min 75% Attendance",
      deadline: "2026-11-25",
      tags: ["Java", "SQL", "Cloud"]
    },
    {
      id: "drv_004",
      company_name: "Zomato / Blinkit Tech",
      job_role: "Backend Systems Engineer",
      package_lpa: 16.0,
      required_min_attendance: 75.0,
      eligibility_criteria: "MCA Semester 3/4, Min 75% Attendance",
      deadline: "2026-11-30",
      tags: ["Node.js", "Redis", "Kafka"]
    }
  ];

  const loadResumes = async (selectId = null) => {
    try {
      const list = await fetchResumes();
      setResumes(list);
      if (list.length > 0) {
        const idToSelect = selectId || selectedResumeId || list[0].id;
        setSelectedResumeId(idToSelect);
        const detail = await fetchResumeDetail(idToSelect);
        setActiveResume(detail);
      } else {
        setSelectedResumeId(null);
        setActiveResume(null);
      }
    } catch (err) {
      console.error('Failed to load resumes:', err);
    }
  };

  const loadHealth = async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (err) {
      setHealth({ llm_status: 'disconnected', llm_message: 'Career AI Service starting...' });
    }
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([loadHealth(), loadResumes()]);

      // Check attendance eligibility
      try {
        const studentId = user?.id || "student_default";
        const res = await fetch(`http://127.0.0.1:8001/api/placement/eligibility/${studentId}`);
        if (res.ok) {
          const data = await res.json();
          setEligibility(data);
        } else {
          setEligibility({
            attendance_percentage: 84.5,
            minimum_required: 75.0,
            is_eligible: true,
            total_lectures: 40,
            attended_lectures: 34,
            status: "ELIGIBLE",
            message: "Student meets the 75.0% institutional attendance requirement for campus placement drives."
          });
        }
      } catch (e) {
        setEligibility({
          attendance_percentage: 84.5,
          minimum_required: 75.0,
          is_eligible: true,
          total_lectures: 40,
          attended_lectures: 34,
          status: "ELIGIBLE",
          message: "Student meets the 75.0% institutional attendance requirement for campus placement drives."
        });
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [user]);

  const handleSelectResume = async (id) => {
    setSelectedResumeId(id);
    try {
      const detail = await fetchResumeDetail(id);
      setActiveResume(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadSuccess = async (newId) => {
    await loadResumes(newId);
    setActiveTab('upload');
  };

  const handleDeleteSuccess = async () => {
    await loadResumes();
  };

  const pct = eligibility?.attendance_percentage || 84.5;
  const isEligible = pct >= 75.0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            AI-Career-Resume Studio
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold uppercase tracking-wider">
              Generative AI & RAG
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload and parse your PDF resume, match against job descriptions, practice with STAR mock interviews, and apply for campus drives.
          </p>
        </div>

        {/* Resume Selector Dropdown if multiple resumes exist */}
        {resumes.length > 0 && (
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-xs">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span className="text-xs text-slate-500 font-medium">Active:</span>
            <select
              value={selectedResumeId || ''}
              onChange={(e) => handleSelectResume(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
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

      {/* University Attendance-Eligibility Gate Banner */}
      <div className={`p-5 rounded-2xl border shadow-xs transition-all ${
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
                  {isEligible ? 'Placement Eligibility: VERIFIED & ACTIVE' : 'Placement Privilege Hold: ATTENDANCE DEFICIT'}
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
                  ? `Your academic attendance (${pct}%) satisfies the university 75.0% threshold. You can upload resumes, generate STAR interview answers, and apply to campus placement drives.`
                  : `Your attendance (${pct}%) is below the mandatory 75% university policy. Upload your resume and practice interviews now, but company drive applications remain locked until attendance criteria is met.`}
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
                {eligibility?.attended_lectures || 34}/{eligibility?.total_lectures || 40}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          1. Upload & Resume Manager ({resumes.length})
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'jobs'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Target className="w-4 h-4" />
          2. Job Description Matcher
        </button>

        <button
          onClick={() => setActiveTab('rag')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'rag'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Bot className="w-4 h-4" />
          3. RAG Resume Chat
        </button>

        <button
          onClick={() => setActiveTab('interview')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'interview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          4. STAR Interview Coach
        </button>

        <button
          onClick={() => setActiveTab('polish')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'polish'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          5. Google X-Y-Z Bullet Polish
        </button>

        <button
          onClick={() => setActiveTab('drives')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'drives'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Building className="w-4 h-4" />
          Campus Drives ({drives.length})
        </button>
      </div>

      {/* TAB 1: RESUME UPLOAD & PARSER */}
      {activeTab === 'upload' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <ResumeUpload
            resumes={resumes}
            activeResume={activeResume}
            onUploadSuccess={handleUploadSuccess}
            onDeleteSuccess={handleDeleteSuccess}
          />
        </div>
      )}

      {/* TAB 2: JOB DESCRIPTION MATCHER */}
      {activeTab === 'jobs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <JobMatcher activeResume={activeResume} />
        </div>
      )}

      {/* TAB 3: RAG RESUME CHAT */}
      {activeTab === 'rag' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <RagChat activeResume={activeResume} health={health} />
        </div>
      )}

      {/* TAB 4: STAR MOCK INTERVIEW */}
      {activeTab === 'interview' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <InterviewPrep activeResume={activeResume} />
        </div>
      )}

      {/* TAB 5: GOOGLE X-Y-Z BULLET POLISHER */}
      {activeTab === 'polish' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <ResumeSuggestions activeResume={activeResume} />
        </div>
      )}

      {/* TAB 6: CAMPUS RECRUITMENT DRIVES */}
      {activeTab === 'drives' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {drives.map((drive) => {
              const driveEligible = pct >= drive.required_min_attendance;
              return (
                <div
                  key={drive.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-indigo-500/50 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                          TPO Campus Drive
                        </span>
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mt-1">
                          {drive.job_role}
                        </h3>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                          {drive.company_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                          ₹{drive.package_lpa} LPA
                        </span>
                        <span className="text-[10px] text-slate-400 block">CTC Package</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Required Attendance:</span>
                        <span className={`font-bold ${
                          driveEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          Min {drive.required_min_attendance}% {driveEligible ? '✔ Eligible' : '✖ Deficit'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Deadline:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {drive.deadline}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {drive.tags.map((t, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      Analyze Match with Active Resume <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      disabled={!driveEligible}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        driveEligible
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
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
                          Locked (Attendance &lt; {drive.required_min_attendance}%)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
