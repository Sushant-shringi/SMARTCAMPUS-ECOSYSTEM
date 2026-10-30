import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Building2,
  Layers,
  FileCheck,
  BarChart3,
  ShieldAlert,
  Clock,
  Radio,
  History,
  Bell,
  UserCircle,
  LogOut,
  UserCheck,
  Sparkles,
  School,
  Briefcase,
  FileText,
  Target,
  Bot,
  HelpCircle,
  Sliders,
  CheckCircle2,
  X
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose, onOpenSettings }) => {
  const { user, logout } = useAuth();
  const { currentThemeConfig } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNavSections = () => {
    if (user?.role === 'STUDENT') {
      return [
        {
          title: 'OVERVIEW',
          items: [
            { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
          ],
        },
        {
          title: 'ACADEMICS',
          items: [
            { label: 'Mark Attendance', path: '/student/mark-attendance', icon: Radio },
            { label: 'Attendance History', path: '/student/history', icon: History },
            { label: 'Classes / Timetable', path: '/student/classes', icon: Calendar },
            { label: 'Announcements', path: '/student/notifications', icon: Bell },
          ],
        },
        {
          title: 'AI CAREER STUDIO',
          items: [
            { label: 'Resume Assistant', path: '/student/career-hub?tab=upload', icon: FileText, tab: 'upload' },
            { label: 'Job Description Matcher', path: '/student/career-hub?tab=jobs', icon: Target, tab: 'jobs' },
            { label: 'Resume Chat (RAG)', path: '/student/career-hub?tab=rag', icon: Bot, tab: 'rag' },
            { label: 'Resume Improvement', path: '/student/career-hub?tab=polish', icon: Sparkles, tab: 'polish' },
            { label: 'Interview Preparation', path: '/student/career-hub?tab=interview', icon: HelpCircle, tab: 'interview' },
          ],
        },
        {
          title: 'PLACEMENTS',
          items: [
            { label: 'Placement Eligibility', path: '/student/career-hub?tab=eligibility', icon: CheckCircle2, tab: 'eligibility' },
            { label: 'Placement Drives', path: '/student/career-hub?tab=drives', icon: Briefcase, tab: 'drives' },
            { label: 'My Applications', path: '/student/career-hub?tab=applications', icon: FileCheck, tab: 'applications' },
          ],
        },
        {
          title: 'ACCOUNT',
          items: [
            { label: 'Profile', path: '/student/profile', icon: UserCircle },
          ],
        },
      ];
    } else if (user?.role === 'TEACHER') {
      return [
        {
          title: 'OVERVIEW',
          items: [
            { label: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
          ],
        },
        {
          title: 'TEACHING & CLASSES',
          items: [
            { label: 'My Classes', path: '/teacher/classes', icon: BookOpen },
            { label: "Today's Schedule", path: '/teacher/schedule', icon: Calendar },
            { label: 'Start Attendance', path: '/teacher/start-attendance', icon: Radio },
            { label: 'Live Attendance', path: '/teacher/live-attendance', icon: Clock },
          ],
        },
        {
          title: 'ANALYTICS & LOGS',
          items: [
            { label: 'Attendance History', path: '/teacher/history', icon: History },
            { label: 'Reports', path: '/teacher/reports', icon: BarChart3 },
          ],
        },
      ];
    } else if (user?.role === 'ADMIN') {
      return [
        {
          title: 'OVERVIEW',
          items: [
            { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
          ],
        },
        {
          title: 'USERS & REQUESTS',
          items: [
            { label: 'Teacher Requests', path: '/admin/teacher-requests', icon: UserCheck },
            { label: 'Student Requests', path: '/admin/student-requests', icon: Users },
            { label: 'Teachers Directory', path: '/admin/teachers', icon: GraduationCap },
            { label: 'Students Directory', path: '/admin/students', icon: School },
          ],
        },
        {
          title: 'ACADEMIC STRUCTURE',
          items: [
            { label: 'Departments', path: '/admin/departments', icon: Building2 },
            { label: 'Semesters', path: '/admin/semesters', icon: Layers },
            { label: 'Subjects', path: '/admin/subjects', icon: BookOpen },
            { label: 'Classrooms', path: '/admin/classrooms', icon: Building2 },
            { label: 'Timetable', path: '/admin/timetable', icon: Calendar },
          ],
        },
        {
          title: 'AUDIT & COMPLIANCE',
          items: [
            { label: 'Attendance Logs', path: '/admin/attendance', icon: FileCheck },
            { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
            { label: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldAlert },
          ],
        },
        {
          title: 'CAREER & PLACEMENTS',
          items: [
            { label: 'Campus Placements', path: '/admin/placement', icon: Briefcase },
          ],
        },
      ];
    } else if (user?.role === 'TPO') {
      return [
        {
          title: 'OVERVIEW',
          items: [
            { label: 'TPO Dashboard', path: '/tpo/dashboard', icon: LayoutDashboard },
          ],
        },
        {
          title: 'PLACEMENT DRIVES',
          items: [
            { label: 'Manage Drives', path: '/tpo/drives', icon: Building2 },
          ],
        },
        {
          title: 'RECRUITMENT & CANDIDATES',
          items: [
            { label: 'Applicant Review', path: '/tpo/applicants', icon: Users },
          ],
        },
      ];
    }
    return [];
  };

  const navSections = getNavSections();

  // Helper to determine if career studio tab is active
  const isCareerTabActive = (item) => {
    if (!item.tab) return false;
    const currentTab = new URLSearchParams(location.search).get('tab') || 'upload';
    return location.pathname === '/student/career-hub' && currentTab === item.tab;
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden animate-in fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 theme-sidebar flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                SmartCampus
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                  OS
                </span>
              </h1>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block -mt-0.5">
                Academic & AI Career Hub
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card Pill */}
        <div className="p-3 mx-3 mt-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {user?.full_name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <h2 className="px-3 text-[10px] font-extrabold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                {section.title}
              </h2>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isCareerItem = Boolean(item.tab);
                  const active = isCareerItem
                    ? isCareerTabActive(item)
                    : location.pathname === item.path;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Settings Item inside Navigation */}
          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => {
                if (onOpenSettings) onOpenSettings();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
            >
              <Sliders className="w-4 h-4 text-slate-400" />
              <span>Settings & Themes</span>
            </button>
          </div>
        </nav>

        {/* Footer: Theme Info & Sign Out */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
          <div className="flex items-center justify-between px-2 text-[10px] text-slate-400">
            <span>Active Atmosphere:</span>
            <span className="font-bold text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
              {currentThemeConfig.name}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
