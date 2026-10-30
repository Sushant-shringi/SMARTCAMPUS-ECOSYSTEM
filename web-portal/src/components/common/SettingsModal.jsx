import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConnectivity } from '../../context/ConnectivityContext';
import { ThemeSelector } from './ThemeSelector';
import {
  X,
  Palette,
  Sliders,
  Wifi,
  WifiOff,
  User,
  ShieldCheck,
  Bluetooth,
  RefreshCw
} from 'lucide-react';

export const SettingsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { isOnline, pendingCount, isSyncing, triggerSync, isBleDemoMode, simulatedRssi } = useConnectivity();
  const [activeTab, setActiveTab] = useState('appearance');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 id="settings-dialog-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                System & Appearance Settings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize your interface atmosphere and offline sync preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Settings"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 border-b border-slate-100 dark:border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'appearance'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Palette className="w-4 h-4" />
            Theme & Visuals
          </button>
          <button
            onClick={() => setActiveTab('connectivity')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'connectivity'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Wifi className="w-4 h-4" />
            Connectivity & Sync
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'account'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            Account Overview
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Select Ecosystem Theme
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose from 5 professionally calibrated color palettes. Your choice is saved locally and remains active across all academic and career studio pages.
                </p>
              </div>

              {/* Grid of 5 working themes */}
              <ThemeSelector variant="grid" />
            </div>
          )}

          {activeTab === 'connectivity' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isOnline ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <Wifi className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                      <WifiOff className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {isOnline ? 'Network Connected (Online)' : 'Offline Proximity Mode'}
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isOnline
                        ? 'Connected to campus backend services. Real-time sync enabled.'
                        : 'Attendance records are securely queued locally in IndexedDB.'}
                    </p>
                  </div>
                </div>
                {pendingCount > 0 && (
                  <button
                    onClick={triggerSync}
                    disabled={isSyncing || !isOnline}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sync {pendingCount}
                  </button>
                )}
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                    <Bluetooth className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      BLE Proximity Radar
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Hardware Mode: {isBleDemoMode ? 'Simulated Web BLE' : 'Native Web Bluetooth'} • Signal Strength: {simulatedRssi} dBm
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{user?.full_name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">@{user?.username} • ID: {user?.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Role</span>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {user?.role}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Session</span>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Authenticated (JWT Active)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
