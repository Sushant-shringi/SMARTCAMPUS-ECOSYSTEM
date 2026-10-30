import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  admin: 'Admin Console',
  teacher: 'Faculty Portal',
  student: 'Student Portal',
  dashboard: 'Overview Dashboard',
  classes: 'Today’s Classes',
  'mark-attendance': 'Mark Attendance',
  history: 'Attendance History',
  'career-hub': 'AI Career Studio',
  notifications: 'Announcements & Alerts',
  profile: 'Student Profile',
  timetable: 'Campus Timetable',
  subjects: 'Course Subjects',
  classrooms: 'Classrooms & Venues',
  reports: 'Academic Analytics',
  'audit-logs': 'Security Audit Logs',
  'start-attendance': 'Start Attendance Session',
  'live-attendance': 'Live Attendance Monitor',
  schedule: 'Teaching Schedule',
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <Link
        to={`/${pathnames[0]}/dashboard`}
        className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Portal</span>
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = ROUTE_LABELS[value] || value.replace(/-/g, ' ');

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />
            {isLast ? (
              <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">
                {label}
              </span>
            ) : (
              <Link
                to={to}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors capitalize font-medium"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
