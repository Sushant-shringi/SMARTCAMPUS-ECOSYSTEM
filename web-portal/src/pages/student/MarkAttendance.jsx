import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceService } from '../../services/attendanceService';
import { useConnectivity } from '../../context/ConnectivityContext';
import { BleRadar } from '../../components/common/BleRadar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useToast } from '../../components/common/Toast';
import confetti from 'canvas-confetti';
import {
  Radio,
  Bluetooth,
  CheckCircle2,
  AlertTriangle,
  Building2,
  BookOpen,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Sparkles,
  History as HistoryIcon,
  ArrowRight
} from 'lucide-react';

export const MarkAttendance = () => {
  const [todayClasses, setTodayClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attendanceResult, setAttendanceResult] = useState(null);

  const {
    isOnline,
    isBleScanning,
    startBleScan,
    discoveredBeacons,
    isBleDemoMode,
    simulatedRssi,
    refreshPendingCount
  } = useConnectivity();

  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchRecentHistory = async () => {
    try {
      const records = await attendanceService.getAttendanceHistory(5);
      setRecentHistory(Array.isArray(records) ? records : (records?.data || []));
    } catch (e) {
      console.warn('Recent history load fallback:', e);
    }
  };

  const fetchActiveClasses = async () => {
    try {
      const classes = await attendanceService.getStudentTodayClasses();
      const list = Array.isArray(classes) ? classes : [];
      setTodayClasses(list);

      // Priority 1: An active session that is not yet marked
      // Priority 2: Keep previously selected class (updated)
      // Priority 3: Any active session
      // Priority 4: First available class
      setSelectedClass(prev => {
        const activeUnmarked = list.find(c => c.is_session_active && !c.already_marked);
        if (activeUnmarked) return activeUnmarked;

        if (prev) {
          const match = list.find(c =>
            (c.timetable_id && c.timetable_id === prev.timetable_id) ||
            (c.subject_id && c.subject_id === prev.subject_id)
          );
          if (match) return match;
        }

        const anyActive = list.find(c => c.is_session_active);
        if (anyActive) return anyActive;

        return list.length > 0 ? list[0] : null;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveClasses();
    fetchRecentHistory();
    startBleScan();

    // Teacher and student are separate browser sessions. Poll the API so the
    // student panel notices a newly-started attendance session automatically.
    const poll = setInterval(() => {
      fetchActiveClasses();
    }, 2000);
    return () => clearInterval(poll);
  }, []);

  // Compute matched beacon for the selected classroom
  const targetBeaconId = selectedClass?.ble_identifier || 'SMARTATTEND-RM204';
  const matchedBeacon = discoveredBeacons.find(b => b.id.includes(selectedClass?.classroom_name?.replace(' ', '') || '204'))
    || discoveredBeacons[0]
    || { id: targetBeaconId, rssi: simulatedRssi, distanceMeters: 1.5 };

  const currentRssi = matchedBeacon.rssi;
  const isSignalSufficient = currentRssi >= -85;

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleMarkAttendance = async () => {
    if (!selectedClass?.is_session_active) {
      showToast('No active attendance session for this class.', 'warning');
      return;
    }

    if (!isSignalSufficient) {
      showToast(`BLE signal too weak (${currentRssi} dBm). You are too far from the teacher.`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        session_id: selectedClass.active_session_id,
        subject_id: selectedClass.subject_id,
        classroom_id: selectedClass.active_session_classroom_id || selectedClass.classroom_id,
        subject_name: selectedClass.subject_name,
        classroom_name: selectedClass.active_session_classroom_name || selectedClass.classroom_name,
        session_token: selectedClass.active_session_token || 'valid-ble-proximity-token',
        ble_rssi: currentRssi,
        device_id: navigator.userAgent.slice(0, 50),
        verification_source: 'BLE'
      };

      const result = await attendanceService.markAttendance(payload);
      setAttendanceResult(result);
      triggerCelebration();

      if (result.mode === 'OFFLINE_SAVED') {
        showToast('✓ Attendance saved locally in Offline Mode!', 'success');
      } else {
        showToast('✓ Attendance successfully recorded and verified!', 'success');
      }

      await refreshPendingCount();
      await fetchActiveClasses();
      await fetchRecentHistory();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to record attendance';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSkeleton type="cards" count={3} />;

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-2">
          <Bluetooth className="w-3.5 h-3.5 animate-pulse" /> Proximity Smart Attendance
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
          Mark Class Presence
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Attendance works seamlessly offline and online via BLE beacon verification
        </p>
      </div>

      {/* Class Selection Pill Bar */}
      {todayClasses.length > 0 && (
        <div className="flex items-center justify-center gap-2 overflow-x-auto p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          {todayClasses.map((c) => {
            const isSelected =
              (selectedClass?.timetable_id && selectedClass?.timetable_id === c.timetable_id) ||
              (selectedClass?.subject_id && selectedClass?.subject_id === c.subject_id);
            return (
              <button
                key={c.timetable_id || c.subject_id || c.active_session_id}
                onClick={() => {
                  setSelectedClass(c);
                  setAttendanceResult(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{c.subject_code}</span>
                {c.already_marked ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                ) : c.is_session_active ? (
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Attendance Mode Presentation */}
      {attendanceResult ? (
        /* SUCCESSFUL RESULT CARD */
        <div className="theme-card p-8 text-center space-y-6 border-emerald-500/30 bg-emerald-500/5">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              Presence Recorded!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You are marked <span className="font-bold text-emerald-600 dark:text-emerald-400">{attendanceResult.record?.status || 'PRESENT'}</span> for {selectedClass?.subject_name}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 max-w-sm mx-auto space-y-2 text-xs text-left">
            <div className="flex justify-between">
              <span className="text-slate-400">Marked Time:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">BLE Proximity RSSI:</span>
              <span className="font-mono font-bold text-emerald-500">
                {currentRssi} dBm (Verified)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Sync Status:</span>
              <StatusBadge status={attendanceResult.mode === 'OFFLINE_SAVED' ? 'PENDING_SYNC' : 'SYNCED'} />
            </div>
          </div>

          {attendanceResult.mode === 'OFFLINE_SAVED' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-500 text-center font-medium">
              Saved in local IndexedDB. Will automatically sync to university servers when connection returns.
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/student/history')}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <span>View Attendance History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setAttendanceResult(null);
                fetchActiveClasses();
                fetchRecentHistory();
              }}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : selectedClass?.already_marked ? (
        /* ALREADY MARKED CARD */
        <div className="theme-card p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Attendance Already Marked
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            You have already registered your attendance for {selectedClass?.subject_name}. Duplicate markings are prevented.
          </p>
          <div className="pt-2 flex justify-center">
            <StatusBadge status={selectedClass?.marked_status || 'PRESENT'} />
          </div>
          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => navigate('/student/history')}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <span>View Complete Attendance History</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ACTIVE BLE SCANNING & MARK ATTENDANCE INTERFACE */
        <div className="space-y-6">
          {/* Class Summary Banner */}
          <div className="theme-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {selectedClass?.subject_code || 'COURSE'}
                </span>
                {selectedClass?.is_session_active ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white animate-pulse">
                    ACTIVE NOW
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400">
                    Session Not Active
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                {selectedClass?.subject_name || 'Class Session'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instructor: {selectedClass?.teacher_name || 'Instructor'} • {selectedClass?.classroom_name || 'Awaiting Broadcast'}
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between text-xs">
              <span className="text-slate-400">Schedule</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {selectedClass ? `${selectedClass.start_time} - ${selectedClass.end_time}` : 'Live Attendance'}
              </span>
            </div>
          </div>

          {/* BLE Radar Visualization Component */}
          <BleRadar
            isScanning={isBleScanning}
            rssi={currentRssi}
            beaconName={selectedClass?.classroom_name || 'Classroom Hall 204'}
            beaconId={targetBeaconId}
            rssiThreshold={-85}
            isDemoMode={isBleDemoMode}
          />

          {/* Online / Offline Sync Capability Indicator */}
          <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
            <div className="flex items-center gap-2.5">
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Internet Online (Instant Sync)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-amber-500">Offline Mode Active (Will save to IndexedDB)</span>
                </>
              )}
            </div>

            <span className="text-[11px] text-slate-400">
              Zero internet required
            </span>
          </div>

          {/* BIG MARK ATTENDANCE BUTTON */}
          <button
            onClick={handleMarkAttendance}
            disabled={isSubmitting || !selectedClass?.is_session_active || !isSignalSufficient}
            className={`w-full py-5 rounded-3xl font-extrabold text-base tracking-wide text-white shadow-2xl transition-all transform active:scale-98 flex items-center justify-center gap-3 ${
              selectedClass?.is_session_active && isSignalSufficient
                ? 'bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-500/30'
                : 'bg-slate-700 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Recording Proximity Attendance...</span>
              </div>
            ) : !selectedClass?.is_session_active ? (
              <span>Teacher Has Not Started Session</span>
            ) : !isSignalSufficient ? (
              <span>Out of Range (Move Closer to Teacher)</span>
            ) : (
              <>
                <Radio className="w-6 h-6 animate-pulse" />
                <span>MARK ATTENDANCE NOW</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Recent Attendance History Section (Always visible so student immediately sees records) */}
      <div className="theme-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Recent Attendance History
            </h2>
          </div>
          <button
            onClick={() => navigate('/student/history')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>View All Records →</span>
          </button>
        </div>

        {recentHistory.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
            No attendance marked yet. Marked lectures will appear here immediately.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Date & Time</th>
                  <th className="px-4 py-2.5">Course Subject</th>
                  <th className="px-4 py-2.5">Signal</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {recentHistory.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                      {new Date(r.marked_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                      {r.session?.subject?.name || r.subject_name || 'Course Lecture'}
                    </td>
                    <td className="px-4 py-3 font-mono text-teal-600 dark:text-teal-400 font-bold">
                      {r.ble_rssi !== null ? `${r.ble_rssi} dBm` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.sync_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
