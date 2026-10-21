import React, { useState, useEffect } from 'react';
import { Clock, Radio, LogOut, User as UserIcon, ExternalLink } from 'lucide-react';
import { User } from '../types';
import { removeAuthToken } from '../api';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRealtimeConnected: boolean;
  onOpenPortalModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  activeTab,
  setActiveTab,
  isRealtimeConnected,
  onOpenPortalModal
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Formatted in IST
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-white/60 px-6 py-3.5 flex items-center justify-between shadow-xs">
      {/* Brand logo & title */}
      <div className="flex items-center space-x-3.5">
        <img
          src="/logo.png"
          alt="Expandit Logo"
          className="h-10 w-auto object-contain rounded-md shadow-xs"
        />
        <div className="hidden sm:block">
          <h1 className="text-lg font-bold tracking-tight text-[#16194F] flex items-center gap-1.5">
            EXPANDIT <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-[#F5BE2C]/20 text-[#B45309] border border-[#F5BE2C]/40">Enterprise</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium -mt-0.5">
            Smart Attendance, Real-Time Analytics & Leave Suite
          </p>
        </div>
      </div>

      {/* Center: Live Time & Real-time SSE indicator */}
      <div className="hidden md:flex items-center space-x-4">
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/70 border border-slate-200/60 shadow-2xs">
          <Clock className="w-4 h-4 text-[#00A3E0]" />
          <span className="text-xs font-semibold text-slate-700 font-mono">{currentTime} IST</span>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/70 border border-slate-200/60 shadow-2xs">
          <span className="relative flex h-2.5 w-2.5">
            {isRealtimeConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isRealtimeConnected ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            ></span>
          </span>
          <span className="text-xs font-medium text-slate-600">
            {isRealtimeConnected ? 'Live Real-time SSE' : 'Connecting Sync...'}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-3">
        {/* Open Employee Attendance Portal button */}
        <button
          onClick={onOpenPortalModal}
          className="cursor-pointer flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-gradient-to-r from-[#00A3E0] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0369A1] text-white shadow-sm transition-all"
          title="Open Employee Daily Attendance Portal"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Attendance Portal</span>
        </button>

        {user && (
          <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-[#16194F] text-amber-300 font-bold flex items-center justify-center text-xs shadow-2xs">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <span className="text-xs font-bold text-slate-800 block">{user.username}</span>
                <span className="text-[10px] uppercase font-semibold text-amber-700 tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="cursor-pointer p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
