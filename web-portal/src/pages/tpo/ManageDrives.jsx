import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building,
  Plus,
  Edit,
  Trash2,
  Lock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Layers
} from 'lucide-react';
import {
  fetchCampusDrives,
  createPlacementDrive,
  updatePlacementDrive,
  closePlacementDrive,
  deletePlacementDrive
} from '../../career-modules/api/client';

export const ManageDrives = () => {
  const [searchParams] = useSearchParams();
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingDriveId, setEditingDriveId] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    job_title: '',
    job_description: '',
    salary_lpa: '',
    min_attendance_percentage: '75.0',
    eligible_departments: 'CSE, IT, ECE, MCA',
    deadline: '',
    drive_type: 'Full Time',
    tags: 'Python, Cloud, React'
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadDrives = async () => {
    try {
      setLoading(true);
      const data = await fetchCampusDrives();
      setDrives(data || []);
    } catch (err) {
      console.error('Failed to load drives:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrives();
    if (searchParams.get('action') === 'new') {
      handleOpenCreate();
    }
  }, [searchParams]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingDriveId(null);
    // Set default deadline to 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const deadlineStr = d.toISOString().split('T')[0];

    setFormData({
      company_name: '',
      job_title: '',
      job_description: '',
      salary_lpa: '',
      min_attendance_percentage: '75.0',
      eligible_departments: 'CSE, IT, ECE, MCA',
      deadline: deadlineStr,
      drive_type: 'Full Time',
      tags: 'Full Stack, Cloud'
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (drive) => {
    setModalMode('edit');
    setEditingDriveId(drive.id);
    setFormData({
      company_name: drive.company_name || '',
      job_title: drive.job_title || drive.job_role || '',
      job_description: drive.job_description || '',
      salary_lpa: String(drive.salary_lpa || drive.package_lpa || ''),
      min_attendance_percentage: String(drive.min_attendance_percentage ?? 75.0),
      eligible_departments: Array.isArray(drive.eligible_departments) ? drive.eligible_departments.join(', ') : (drive.eligible_departments || ''),
      deadline: drive.deadline || '',
      drive_type: drive.drive_type || 'Full Time',
      tags: Array.isArray(drive.tags) ? drive.tags.join(', ') : (drive.tags || '')
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Form validation
    const salary = parseFloat(formData.salary_lpa);
    if (isNaN(salary) || salary <= 0) {
      setFormError('Salary package must be a valid positive number in LPA.');
      return;
    }

    const minAtt = parseFloat(formData.min_attendance_percentage);
    if (isNaN(minAtt) || minAtt < 0 || minAtt > 100) {
      setFormError('Minimum attendance must be between 0.0 and 100.0%.');
      return;
    }

    const deadlineDate = new Date(formData.deadline);
    if (isNaN(deadlineDate.getTime())) {
      setFormError('Please enter a valid application deadline date.');
      return;
    }

    const payload = {
      company_name: formData.company_name.trim(),
      job_title: formData.job_title.trim(),
      job_description: formData.job_description.trim(),
      location: "Bangalore / Hybrid",
      employment_type: formData.drive_type || "Full-time",
      package_min: salary,
      package_max: salary,
      salary_lpa: salary,
      minimum_cgpa: 0.0,
      minimum_attendance: minAtt,
      min_attendance_percentage: minAtt,
      eligible_departments: formData.eligible_departments.split(',').map(s => s.trim()).filter(Boolean),
      eligible_batches: ["2026", "2027"],
      application_deadline: `${formData.deadline}T23:59:59Z`,
      deadline: formData.deadline,
      drive_type: formData.drive_type,
      tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
      status: "OPEN"
    };

    try {
      setSubmitting(true);
      if (modalMode === 'create') {
        await createPlacementDrive(payload);
      } else {
        await updatePlacementDrive(editingDriveId, payload);
      }
      setIsModalOpen(false);
      await loadDrives();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDrive = async (driveId) => {
    if (!window.confirm('Close this placement drive? Students will no longer be able to submit applications.')) {
      return;
    }
    try {
      await closePlacementDrive(driveId);
      await loadDrives();
    } catch (err) {
      alert(`Failed to close drive: ${err.message}`);
    }
  };

  const handleDeleteDrive = async (driveId) => {
    if (!window.confirm('Are you sure you want to permanently delete this placement drive? Applications will also be removed.')) {
      return;
    }
    try {
      await deletePlacementDrive(driveId);
      await loadDrives();
    } catch (err) {
      alert(`Failed to delete drive: ${err.message}`);
    }
  };

  const filteredDrives = drives.filter(d => {
    const matchesSearch = (d.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (d.job_title || d.job_role || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="theme-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider">
              TPO Drive Operations
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Manage Placement Drives
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Publish recruitment drives with institutional attendance thresholds, manage application deadlines, and monitor candidate pools.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Placement Drive
        </button>
      </div>

      {/* 2. Filter Bar */}
      <div className="theme-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search company or job title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5" /> Status:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses ({drives.length})</option>
            <option value="OPEN">Open Only</option>
            <option value="CLOSED">Closed Only</option>
          </select>

          <button
            onClick={loadDrives}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Drives Table */}
      <div className="theme-card overflow-hidden">
        {filteredDrives.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Building className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm">No placement drives found.</p>
            <p className="text-xs mt-1">Create a new drive using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-4">Company & Job Title</th>
                  <th className="p-4">Package</th>
                  <th className="p-4">Min Attendance</th>
                  <th className="p-4">Deadline</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredDrives.map((drive) => (
                  <tr key={drive.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition">
                    <td className="p-4">
                      <div className="font-black text-slate-900 dark:text-slate-100 text-sm">
                        {drive.company_name}
                      </div>
                      <div className="text-slate-500 text-xs">
                        {drive.job_title || drive.job_role} • <span className="text-blue-600">{drive.drive_type || 'Full Time'}</span>
                      </div>
                    </td>
                    <td className="p-4 font-black text-emerald-600 text-sm">
                      ₹{drive.salary_lpa || drive.package_lpa} LPA
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {drive.min_attendance_percentage}%
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {drive.deadline}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        drive.status === 'OPEN'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                      }`}>
                        {drive.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(drive)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Drive"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {drive.status === 'OPEN' && (
                          <button
                            onClick={() => handleCloseDrive(drive.id)}
                            className="p-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            title="Close Drive"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDrive(drive.id)}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Delete Drive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="theme-card max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                  {modalMode === 'create' ? 'New Placement Drive' : 'Update Drive'}
                </span>
                <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 mt-1">
                  {modalMode === 'create' ? 'Create Campus Recruitment Drive' : `Edit: ${formData.company_name}`}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="E.g., Google Cloud"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Job Title / Role *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="E.g., Cloud Systems Engineer"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Job Description & Responsibilities *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.job_description}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  placeholder="Describe technical qualifications, day-to-day role, and requirements..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Salary (LPA) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    required
                    value={formData.salary_lpa}
                    onChange={(e) => setFormData({ ...formData, salary_lpa: e.target.value })}
                    placeholder="18.5"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Min Attendance % *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    required
                    value={formData.min_attendance_percentage}
                    onChange={(e) => setFormData({ ...formData, min_attendance_percentage: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Drive Type
                  </label>
                  <select
                    value={formData.drive_type}
                    onChange={(e) => setFormData({ ...formData, drive_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-blue-500"
                  >
                    <option value="Full Time">Full Time</option>
                    <option value="Internship">Internship</option>
                    <option value="Intern + FTE">Intern + FTE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Application Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Eligible Branches
                  </label>
                  <input
                    type="text"
                    value={formData.eligible_departments}
                    onChange={(e) => setFormData({ ...formData, eligible_departments: e.target.value })}
                    placeholder="CSE, IT, ECE, MCA"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Skill Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Python, Kubernetes, React"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Publish Drive' : 'Update Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
