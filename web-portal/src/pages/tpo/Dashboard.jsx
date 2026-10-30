import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  Building,
  TrendingUp,
  Plus,
  ArrowRight,
  Filter,
  Eye,
  Award,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import {
  fetchPlacementStats,
  fetchCampusDrives,
  fetchAllApplications
} from '../../career-modules/api/client';

export const TpoDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [drives, setDrives] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, drivesData, appsData] = await Promise.all([
        fetchPlacementStats(),
        fetchCampusDrives(),
        fetchAllApplications()
      ]);
      setStats(statsData);
      setDrives(drivesData || []);
      setRecentApplications((appsData || []).slice(0, 5));
    } catch (err) {
      console.error('Failed to load TPO dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalDrives = stats?.total_drives ?? drives.length;
  const activeDrives = stats?.active_drives ?? drives.filter(d => d.status === 'OPEN').length;
  const totalApps = stats?.total_applications ?? recentApplications.length;
  const shortlisted = stats?.shortlisted_candidates ?? 0;
  const selected = stats?.selected_candidates ?? 0;
  const placementRate = stats?.placement_rate ?? 0.0;

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
              TPO Administration
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Training & Placement Office Management Suite
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Placement Management Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome, <strong>{user?.full_name || 'Placement Officer'}</strong>. Coordinate drives, review applicant attendance compliance, and track candidate recruitment stages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/tpo/drives?action=new')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Post New Drive
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="theme-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Drives</span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{totalDrives}</p>
          <span className="text-[10px] text-slate-500 block mt-1">Campus initiatives</span>
        </div>

        <div className="theme-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Active Drives</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{activeDrives}</p>
          <span className="text-[10px] text-slate-500 block mt-1">Open for applicants</span>
        </div>

        <div className="theme-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Applicants</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-600 mt-2">{totalApps}</p>
          <span className="text-[10px] text-slate-500 block mt-1">Attendance verified</span>
        </div>

        <div className="theme-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Shortlisted</span>
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{shortlisted}</p>
          <span className="text-[10px] text-slate-500 block mt-1">Passed initial review</span>
        </div>

        <div className="theme-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Selected</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{selected}</p>
          <span className="text-[10px] text-slate-500 block mt-1">Offers extended</span>
        </div>

        <div className="theme-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Placement Rate</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">{placementRate}%</p>
          <span className="text-[10px] text-slate-500 block mt-1">Candidate conversion</span>
        </div>
      </div>

      {/* 3. Main Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Campus Drives Overview */}
        <div className="theme-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Active Campus Drives
              </h2>
              <button
                onClick={() => navigate('/tpo/drives')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                Manage All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {drives.slice(0, 4).map((drive) => (
                <div
                  key={drive.id}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:border-blue-500/40 bg-slate-50/50 dark:bg-slate-900/50 transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {drive.company_name}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        drive.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {drive.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {drive.job_title} • Min {drive.min_attendance_percentage}% Attendance
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-600 text-sm">₹{drive.salary_lpa} LPA</span>
                    <span className="block text-[10px] text-slate-400">Deadline: {drive.deadline}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => navigate('/tpo/drives')}
              className="w-full py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-center block"
            >
              View All {drives.length} Placement Drives
            </button>
          </div>
        </div>

        {/* Recent Student Applications */}
        <div className="theme-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                Recent Applications
              </h2>
              <button
                onClick={() => navigate('/tpo/applicants')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                Review All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentApplications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No recent applications submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:border-purple-500/40 bg-slate-50/50 dark:bg-slate-900/50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          Student #{app.student_id}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Drive #{app.drive_id} • Verified Attendance: <strong>{app.attendance_percentage_at_application}%</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/tpo/applicants')}
                      className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      Inspect <Eye className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => navigate('/tpo/applicants')}
              className="w-full py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-center block"
            >
              Go to Candidate Evaluation Hub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
