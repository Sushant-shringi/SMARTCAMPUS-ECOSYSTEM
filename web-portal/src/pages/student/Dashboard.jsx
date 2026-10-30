import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import { fetchPlacementEligibility, fetchResumes } from '../../career-modules/api/client';
import { StatCard } from '../../components/common/StatCard';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Radio,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BookOpen,
  Calendar,
  ArrowRight,
  TrendingUp,
  Percent,
  Sparkles,
  UploadCloud,
  Target,
  Bot,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  Bell,
  ChevronRight
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [todayClasses, setTodayClasses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [statsRes, classesRes, notifsRes] = await Promise.allSettled([
          attendanceService.getStudentDashboard(),
          attendanceService.getStudentTodayClasses(),
          attendanceService.getStudentNotifications(),
        ]);

        if (statsRes.status === 'fulfilled') setAnalytics(statsRes.value);
        if (classesRes.status === 'fulfilled') setTodayClasses(classesRes.value);
        if (notifsRes.status === 'fulfilled') setNotifications(notifsRes.value || []);

        // Fetch Career AI Service data (fails gracefully if offline or no token)
        try {
          const [eligRes, resumesRes] = await Promise.allSettled([
            fetchPlacementEligibility(),
            fetchResumes(),
          ]);
          if (eligRes.status === 'fulfilled') setEligibility(eligRes.value);
          if (resumesRes.status === 'fulfilled') setResumes(resumesRes.value || []);
        } catch (careerErr) {
          console.warn('Career service data load fallback:', careerErr);
        }
      } catch (err) {
        console.error('Student dashboard load failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  if (isLoading) return <LoadingSkeleton type="cards" count={4} />;

  const hasActiveSession = todayClasses.some(c => c.is_session_active && !c.already_marked);
  const activeClass = todayClasses.find(c => c.is_session_active && !c.already_marked);
  const overallPct = analytics?.overall_percentage ?? 0.0;
  const isAttendanceEligible = overallPct >= 75.0;

  // Real resume summary if available
  const activeResume = resumes[0] || null;

  return (
    <div className="space-y-6">
      {/* 1. Personalized University Welcome Header */}
      <div className="theme-card p-6 relative overflow-hidden bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent border-blue-500/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                Student Portal
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Semester Active • Academic Year 2026
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0] || user?.username} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Track course attendance in real-time, prepare for campus placements with GenAI resume intelligence, and practice STAR mock interviews.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/student/mark-attendance"
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 ${
                hasActiveSession
                  ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse shadow-blue-500/30'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50'
              }`}
            >
              <Radio className={`w-4 h-4 ${hasActiveSession ? 'animate-spin' : 'text-blue-500'}`} />
              {hasActiveSession ? 'Mark Live Attendance' : 'Mark Attendance'}
            </Link>

            <Link
              to="/student/career-hub"
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xs transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              AI Career Studio →
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Active Attendance Callout Banner (when classroom beacon is live) */}
      {hasActiveSession && activeClass && (
        <div className="theme-card p-5 border-2 border-blue-500/50 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/15 animate-pulse-slow">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-600 text-white uppercase tracking-wider">
                    SESSION ACTIVE NOW
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {activeClass.start_time} - {activeClass.end_time}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {activeClass.subject_name} ({activeClass.subject_code})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Venue: {activeClass.classroom_name} • Bluetooth Low Energy radar is broadcasting within range.
                </p>
              </div>
            </div>

            <Link
              to="/student/mark-attendance"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all whitespace-nowrap flex items-center gap-1.5"
            >
              <span>Check-in Presence Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 3. Low Attendance Warning Alert (if applicable) */}
      {analytics?.low_attendance_warning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-700 dark:text-amber-400 text-xs font-semibold">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
          <span>
            Notice: Overall attendance is currently {overallPct}%, below the mandatory 75% institutional threshold. Maintain attendance to remain eligible for semester exams and placement drives.
          </span>
        </div>
      )}

      {/* 4. Academic Attendance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Attendance"
          value={`${overallPct}%`}
          subtitle={isAttendanceEligible ? 'Above 75% requirement' : 'Below mandatory 75%'}
          icon={Percent}
          color={isAttendanceEligible ? 'blue' : 'amber'}
        />
        <StatCard
          title="Present (On Time)"
          value={analytics?.present_count ?? 0}
          subtitle="Classes verified on-time"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Late Check-ins"
          value={analytics?.late_count ?? 0}
          subtitle="Recorded in grace window"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Total Lectures"
          value={analytics?.total_sessions ?? 0}
          subtitle="Conducted this semester"
          icon={BookOpen}
          color="indigo"
        />
      </div>

      {/* 5. Main 2-Column Split: Today's Classes & AI Career Studio Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Today's Classes & Subject Progress */}
        <div className="lg:col-span-7 space-y-6">
          {/* Today's Schedule (Reference 1: Clean University Schedule) */}
          <div className="theme-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Today's Classes & Schedule
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daily timetable with Bluetooth attendance verification status
                </p>
              </div>

              <Link
                to="/student/classes"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Full Timetable <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {todayClasses.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No Classes Scheduled Today"
                description="Enjoy your academic study time or practice interview prep in the AI Career Studio."
              />
            ) : (
              <div className="space-y-3">
                {todayClasses.map((item) => (
                  <div
                    key={item.timetable_id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md bg-blue-500/10">
                          {item.subject_code}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.start_time} - {item.end_time}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.subject_name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Classroom: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.classroom_name}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center">
                      {item.already_marked ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          ✓ {item.marked_status || 'PRESENT'}
                        </span>
                      ) : item.is_session_active ? (
                        <Link
                          to="/student/mark-attendance"
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs"
                        >
                          Mark Now <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          Scheduled
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

            {/* Subject-Wise Attendance Breakdown */}
            <div className="theme-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Subject Attendance Standing
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Calculated against the 75% institutional threshold
                  </p>
                </div>
                <Link to="/student/history" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  View Logs →
                </Link>
              </div>

              {!analytics?.subject_stats || analytics.subject_stats.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No Course Records Yet"
                  description="Attendance percentages will appear after teachers conduct sessions."
                />
              ) : (
                <div className="space-y-3">
                  {analytics.subject_stats.map((sub) => {
                    const isLow = sub.percentage < 75 && sub.total_sessions > 0;
                    return (
                      <div
                        key={sub.subject_id}
                        className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mr-2">
                              {sub.subject_code}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {sub.subject_name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`font-mono font-black ${isLow ? 'text-amber-500' : 'text-emerald-500'}`}>
                              {sub.percentage}%
                            </span>
                            <span className="text-slate-400 text-[10px] ml-1">
                              ({sub.attended_sessions}/{sub.total_sessions})
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isLow ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, sub.percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        {/* Right Column (5 cols): AI Career Studio & Placement Hub (Reference 2) */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Career Studio Card */}
          <div className="theme-card p-5 relative overflow-hidden border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-purple-950/10 to-transparent space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    AI Career Studio
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">
                      GenAI
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    RAG-Powered Career Acceleration
                  </p>
                </div>
              </div>

              <Link
                to="/student/career-hub"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                Open Studio <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Real Resume Status */}
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Uploaded Resume:</span>
                {resumes.length > 0 ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {resumes.length} Document{resumes.length > 1 ? 's' : ''} on file
                  </span>
                ) : (
                  <span className="font-semibold text-amber-500">No Resume Uploaded</span>
                )}
              </div>

              {activeResume ? (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="truncate max-w-[180px]">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {activeResume.filename}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {activeResume.skills_count} skills extracted
                    </span>
                  </div>
                  <Link
                    to="/student/career-hub?tab=upload"
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Manage →
                  </Link>
                </div>
              ) : (
                <Link
                  to="/student/career-hub?tab=upload"
                  className="w-full mt-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload First Resume (PDF)
                </Link>
              )}
            </div>

            {/* Placement Eligibility Gate Status */}
            <div className={`p-3.5 rounded-2xl border ${
              isAttendanceEligible
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center gap-2.5">
                {isAttendanceEligible ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                )}
                <div>
                  <h4 className="text-xs font-bold">
                    {isAttendanceEligible ? 'Placement Eligibility: ACTIVE' : (eligibility?.status === 'ATTENDANCE_UNAVAILABLE' ? 'Verification In Progress / Offline' : 'Placement Privilege Hold')}
                  </h4>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {isAttendanceEligible
                      ? `Your attendance (${overallPct}%) satisfies the ${eligibility?.minimum_required || 75.0}% criteria to apply for campus recruitment drives.`
                      : `Attendance (${overallPct}%) is below the ${eligibility?.minimum_required || 75.0}% threshold. Drives unlock once criteria is met.`}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Career Quick Feature Grid (Reference 2: Colorful SaaS Cards) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                to="/student/career-hub?tab=jobs"
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-indigo-400/50 hover:shadow-xs transition-all text-left group"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">Job Matcher</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  ATS fit score & keyword gap analysis
                </p>
              </Link>

              <Link
                to="/student/career-hub?tab=rag"
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-purple-400/50 hover:shadow-xs transition-all text-left group"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">Resume Chat</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Grounded Q&A on your resume text
                </p>
              </Link>

              <Link
                to="/student/career-hub?tab=interview"
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-cyan-400/50 hover:shadow-xs transition-all text-left group"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">Interview Prep</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  STAR method behavioral mock prep
                </p>
              </Link>

              <Link
                to="/student/career-hub?tab=polish"
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-pink-400/50 hover:shadow-xs transition-all text-left group"
              >
                <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">Bullet Polish</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Google X-Y-Z action enhancement
                </p>
              </Link>
            </div>
          </div>

          {/* Campus Announcements (University Reference 1) */}
          <div className="theme-card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Institutional Announcements
              </h3>
              <Link to="/student/notifications" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                All Alerts →
              </Link>
            </div>

            {notifications.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Pending Announcements</p>
                <p className="text-[11px] text-slate-400">All semester notices are up to date.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.slice(0, 3).map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-blue-600 dark:text-blue-400">{notif.title}</span>
                      <span className="text-slate-400">{notif.created_at ? new Date(notif.created_at).toLocaleDateString() : 'Today'}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
