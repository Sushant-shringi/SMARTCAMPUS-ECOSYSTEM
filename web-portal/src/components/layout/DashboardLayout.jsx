import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../common/Sidebar';
import { Navbar } from '../common/Navbar';
import { BleSimulatorDrawer } from '../common/BleSimulatorDrawer';
import { SettingsModal } from '../common/SettingsModal';
import { useConnectivity } from '../../context/ConnectivityContext';
import { WifiOff } from 'lucide-react';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isOnline, pendingCount } = useConnectivity();

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200">
      {/* Persistent Offline Notification Banner */}
      {!isOnline && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 text-xs font-bold py-2 px-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>
              OFFLINE ATTENDANCE MODE: Local Bluetooth check-ins are secured in browser storage and will auto-sync when network returns.
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex-shrink-0 ml-2">
              {pendingCount} record{pendingCount > 1 ? 's' : ''} queued
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          <Navbar
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            onToggleSimulator={() => setSimulatorOpen(prev => !prev)}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Floating BLE Simulator Control Drawer */}
      <BleSimulatorDrawer isOpen={simulatorOpen} onClose={() => setSimulatorOpen(false)} />

      {/* Global Settings & Theme Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
