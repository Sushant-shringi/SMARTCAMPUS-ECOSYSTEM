import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Building,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Calendar,
  ExternalLink
} from 'lucide-react';
import {
  fetchPlacementStats,
  fetchCampusDrives,
  fetchAllApplications
} from '../../career-modules/api/client';

export const PlacementOverview = () => {
  const [stats, setStats] = useState(null);
  const [drives, setDrives] = useState([]);
  const [applications, setApplications] = useState([]);
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
      setApplications(appsData || []);
    } catch (err) {
      console.error('Failed to load admin placement overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalDrives = stats?.total_drives ?? drives.length;
  const activeDrives = stats?.active_drives ?? drives.filter(d => d.status === 'OPEN').length;
  const totalApps = stats?.total_applications ?? applications.length;
  const shortlisted = stats?.shortlisted_candidates ?? 0;
  const selected = stats?.selected_candidates ?? 0;
  const placementRate = stats?.placement_rate ?? 0.0;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="theme-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider">
              Institutional Governance
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Campus Placement & Career Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Executive overview of institutional placement drives, attendance compliance gating, and corporate recruitment outcomes.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Analytics
        </button>
      </div>

      {/* 2. KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="theme-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Drives</span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{totalDrives}</p>
          <span className="text-[10px] text-slate-500 block mt-1">Registered employers</span>
        </div>

        <div className="theme-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Active Drives</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{activeDrives}</p>
          <span className="text-[10px] text-slate-500 block mt-1">Currently accepting apps</span>
        </div>

        <div className="theme-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Applications</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-600 mt-2">{totalApps}</p>
          <span className="text-[10px] text-slate-500 block mt-1">All verified submissions</span>
        </div>

        <div className="theme-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Shortlisted</span>
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{shortlisted}</p>
          <span className="text-[10px] text-slate-500 block mt-1">Screening passed</span>
        </div>

        <div className="theme-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Final Offers</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{selected}</p>
          <span className="text-[10px] text-slate-500 block mt-1">Offers accepted</span>
        </div>

        <div className="theme-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Placement %</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">{placementRate}%</p>
          <span className="text-[10px] text-slate-500 block mt-1">Conversion rate</span>
        </div>
      </div>

      {/* 3. Institutional Policy & Drives Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="theme-card p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Corporate Recruitment Partnerships
            </h2>
            <span className="text-xs text-slate-400">{drives.length} drives registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Company</th>
                  <th className="p-3">Package (CTC)</th>
                  <th className="p-3">Min Attendance</th>
                  <th className="p-3">Deadline</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {drives.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{d.company_name}</div>
                      <div className="text-[11px] text-slate-400">{d.job_title}</div>
                    </td>
                    <td className="p-3 font-black text-emerald-600">₹{d.salary_lpa} LPA</td>
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      {d.min_attendance_percentage}%
                    </td>
                    <td className="p-3 text-slate-500">{d.deadline}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        d.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance Compliance & TPO Status */}
        <div className="theme-card p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Compliance Architecture
          </h2>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              Automated Attendance Verification
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Every placement application automatically queries the authoritative attendance database. Students below 75% attendance are strictly gated.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300">
              <Briefcase className="w-4 h-4" />
              TPO Role Active
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Dr. Vikram Malhotra (TPO) manages drive postings, applicant shortlisting, and candidate evaluation. All actions log an immutable audit trail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
