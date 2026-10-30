import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConnectivity } from '../../context/ConnectivityContext';
import { ThemeSelector } from './ThemeSelector';
import { Breadcrumbs } from './Breadcrumbs';
import {
  Menu,
  Bluetooth,
  Sliders,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  Search,
  User,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({ onToggleSidebar, onToggleSimulator, onOpenSettings }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    isOnline,
    isSyncing,
    pendingCount,
    triggerSync,
    isBleDemoMode,
    simulatedRssi
  } = useConnectivity();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [userDropdownOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-16 theme-nav px-4 lg:px-8 flex items-center justify-between transition-colors">
      {/* Left section: Mobile Menu Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation drawer"
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Current page breadcrumb navigation */}
        <div className="hidden sm:block truncate">
          <Breadcrumbs />
        </div>
      </div>

      {/* Center Search Pill (Visual / Quick Filter) */}
      <div className="hidden xl:flex items-center gap-2 max-w-xs w-full mx-4">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Quick search courses, resumes, drives..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </div>

      {/* Right Section: System Controls, Theme Picker & Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* BLE Radar / Simulator Control */}
        <button
          onClick={onToggleSimulator}
          title="Toggle BLE Proximity Simulator"
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isBleDemoMode
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
          }`}
        >
          <Bluetooth className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{isBleDemoMode ? 'BLE Sim' : 'Web BLE'}</span>
          <span className="font-mono text-[11px] opacity-80">{simulatedRssi}dBm</span>
          <Sliders className="w-3 h-3 opacity-70" />
        </button>

        {/* Pending Offline Sync Badge */}
        {pendingCount > 0 && (
          <button
            onClick={triggerSync}
            disabled={isSyncing || !isOnline}
            title={isOnline ? 'Click to sync offline records now' : 'Queued offline. Will sync when online'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : `${pendingCount} Offline`}</span>
          </button>
        )}

        {/* Online / Offline Connectivity Pill */}
        <div
          title={isOnline ? 'Campus network connected' : 'Offline mode - records saved to IndexedDB'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden md:inline font-medium">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="font-medium">Offline</span>
            </>
          )}
        </div>

        {/* Notification Bell Shortcut */}
        <button
          onClick={() => {
            if (user?.role === 'STUDENT') navigate('/student/notifications');
          }}
          aria-label="View announcements and notifications"
          title="Announcements & Alerts"
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-1.5 right-1.5 ring-2 ring-white dark:ring-slate-900" />
        </button>

        {/* Theme Selector Dropdown Component */}
        <ThemeSelector variant="dropdown" />

        {/* User Profile Avatar & Dropdown */}
        <div className="relative pl-1" ref={userMenuRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            aria-expanded={userDropdownOpen}
            aria-haspopup="true"
            aria-label="User Account Menu"
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden lg:block text-left pr-1">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[110px] leading-tight">
                {user?.full_name}
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold tracking-wider uppercase">
                {user?.role}
              </p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden lg:block" />
          </button>

          {/* User Dropdown Menu */}
          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user?.full_name}
                </p>
                <p className="text-[11px] text-slate-400 font-mono truncate">
                  @{user?.username}
                </p>
              </div>

              {user?.role === 'STUDENT' && (
                <button
                  onClick={() => {
                    navigate('/student/profile');
                    setUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>My Profile</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (onOpenSettings) onOpenSettings();
                  setUserDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Preferences & Theme</span>
              </button>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
