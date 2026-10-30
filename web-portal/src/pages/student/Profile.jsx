import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ThemeSelector } from '../../components/common/ThemeSelector';
import { Building2, Layers, Mail, Phone, Palette, ShieldCheck } from 'lucide-react';

export const StudentProfile = () => {
  const { user } = useAuth();
  const profile = user?.student_profile;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
          Student Profile & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          University enrollment details, academic standing, and theme personalization
        </p>
      </div>

      {/* Profile Details Card */}
      <div className="theme-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-slate-100 dark:border-slate-800 text-center sm:text-left">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-3xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{user?.full_name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ACTIVE STUDENT
              </span>
            </div>
            <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold mt-0.5">
              Roll No: {profile?.student_id || user?.id || 'N/A'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Username: @{user?.username}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Mail className="w-4 h-4" />
              <span>Email Address</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.email || 'student@smartcampus.edu'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Phone className="w-4 h-4" />
              <span>Phone Number</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.phone || '+91-9876543210'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Building2 className="w-4 h-4" />
              <span>Department</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {profile?.department?.name || 'Computer Science & Engineering'} ({profile?.department?.code || 'CSE'})
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Layers className="w-4 h-4" />
              <span>Semester & Section</span>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Semester {profile?.semester?.number || 2} • Section {profile?.section?.name || 'A'}
            </p>
          </div>
        </div>
      </div>

      {/* Theme Atmosphere Selector Card */}
      <div className="theme-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Ecosystem Theme & Color Atmosphere
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select one of the 5 working themes. The selection persists across your device and updates all views immediately.
            </p>
          </div>
        </div>

        <ThemeSelector variant="grid" className="pt-2" />
      </div>
    </div>
  );
};
