import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Briefcase,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  FileText,
  Target,
  Bot,
  HelpCircle,
  TrendingUp,
  Building,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowRight,
  Upload,
  AlertTriangle
} from 'lucide-react';

// Import career module components (default exports)
import ResumeUpload from '../../career-modules/components/ResumeUpload';
import JobMatcher from '../../career-modules/components/JobMatcher';
import RagChat from '../../career-modules/components/RagChat';
import InterviewPrep from '../../career-modules/components/InterviewPrep';
import ResumeSuggestions from '../../career-modules/components/ResumeSuggestions';

export const PlacementHub = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('drives');
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fallback demo state
  const [drives, setDrives] = useState([
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
  ]);

  useEffect(() => {
    // Check eligibility
    const fetchEligibility = async () => {
      try {
        const studentId = user?.id || "student_default";
        // Connect to career eligibility bridge
        const res = await fetch(`http://127.0.0.1:8001/api/placement/eligibility/${studentId}`);
        if (res.ok) {
          const data = await res.json();
          setEligibility(data);
        } else {
          // Default mock representation
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
        // Fallback
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

    fetchEligibility();
  }, [user]);

  const pct = eligibility?.attendance_percentage || 84.5;
  const isEligible = pct >= 75.0;

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumb */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <Briefcase className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          Campus Career & Placement Studio
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold uppercase tracking-wider">
            AI Powered
          </span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          University Placement Hub uniting real-time academic attendance credentials with generative AI resume tailoring and interview prep.
        </p>
      </div>

      {/* University Attendance-Eligibility Gate Banner */}
      <div className={`p-6 rounded-2xl border shadow-sm transition-all ${
        isEligible
          ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30'
          : 'bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent border-amber-500/30'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isEligible
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
            }`}>
              {isEligible ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {isEligible ? 'Placement Drive Eligibility: APPROVED' : 'Placement Privilege Hold: DEFICIT WARNING'}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isEligible
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}>
                  {pct}% Attendance
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
                {isEligible
                  ? `Your academic attendance (${pct}%) satisfies the university TPO placement policy (minimum 75.0%). All campus drive registration tokens, direct job applications, and AI coaching modules are unlocked.`
                  : `Your current attendance (${pct}%) is below the mandatory 75.0% university placement criteria. Company drive applications are temporarily locked until makeup attendance or medical leave is approved.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-slate-500 uppercase font-mono block">Policy Threshold</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-200">Min 75.0%</span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="text-right">
              <span className="text-[11px] text-slate-500 uppercase font-mono block">Verified Lectures</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-200">
                {eligibility?.attended_lectures || 34} / {eligibility?.total_lectures || 40}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto gap-2">
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

        <button
          onClick={() => setActiveTab('resume')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'resume'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Upload className="w-4 h-4" />
          AI Resume Parser
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
          JD Matcher
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
          RAG Resume Chat
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
          STAR Mock Interview
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
          X-Y-Z Bullet Polisher
        </button>
      </div>

      {/* Tab 1: Campus Placement Drives */}
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
                          TPO Verified Drive
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
                      Match with My Resume <ArrowRight className="w-3 h-3" />
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
                          Apply with Verified Profile
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

      {/* Tab 2: Resume Upload & Parsing */}
      {activeTab === 'resume' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <ResumeUpload />
        </div>
      )}

      {/* Tab 3: Job Description Matcher */}
      {activeTab === 'jobs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <JobMatcher />
        </div>
      )}

      {/* Tab 4: RAG Resume Chat */}
      {activeTab === 'rag' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <RagChat />
        </div>
      )}

      {/* Tab 5: STAR Interview Prep */}
      {activeTab === 'interview' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <InterviewPrep />
        </div>
      )}

      {/* Tab 6: X-Y-Z Bullet Point Polisher */}
      {activeTab === 'polish' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <ResumeSuggestions />
        </div>
      )}
    </div>
  );
};
