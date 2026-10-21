import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Radio, LogOut, User as UserIcon, ExternalLink, KeyRound, X, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { api, removeAuthToken } from '../api';

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
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrent, setShowCurrent] = useState<boolean>(false);
  const [showNew, setShowNew] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [submittingPassword, setSubmittingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Validation flags for live feedback
  const hasMinLength = newPassword.length >= 9;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMinLength) {
      setPasswordError('Password must be at least 9 characters long');
      return;
    }
    if (!hasLetter) {
      setPasswordError('Password must include at least one letter (a-z, A-Z)');
      return;
    }
    if (!hasDigit) {
      setPasswordError('Password must include at least one number (0-9)');
      return;
    }
    if (!hasSpecial) {
      setPasswordError('Password must include at least one special character (!@#$%^&*...)');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match');
      return;
    }

    try {
      setSubmittingPassword(true);
      setPasswordError(null);
      setPasswordSuccess(null);
      const res = await api.changePassword(currentPassword, newPassword);
      setPasswordSuccess(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setSubmittingPassword(false);
    }
  };

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
              onClick={() => {
                setShowPasswordModal(true);
                setPasswordError(null);
                setPasswordSuccess(null);
              }}
              className="cursor-pointer flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300/50 transition-colors text-xs font-semibold shadow-2xs"
              title="Change Admin Password"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden md:inline">Change Password</span>
            </button>

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

      {/* Change Password Modal (Portaled to document.body to avoid parent glass-panel/sticky clipping) */}
      {showPasswordModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPasswordModal(false);
          }}
        >
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="cursor-pointer absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#16194F]">Change Admin Password</h3>
                <p className="text-[11px] text-slate-500">Update your administrator master password</p>
              </div>
            </div>

            {passwordError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="glass-input w-full px-3 pr-10 py-2 rounded-xl text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="cursor-pointer absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 9 chars (Letters, Numbers & Special)"
                    className="glass-input w-full px-3 pr-10 py-2 rounded-xl text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="cursor-pointer absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password Requirements Checklist */}
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-semibold">
                  <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    Min 9 characters
                  </span>
                  <span className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasLetter ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    At least 1 letter
                  </span>
                  <span className={`flex items-center gap-1 ${hasDigit ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasDigit ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    At least 1 number
                  </span>
                  <span className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${hasSpecial ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    Special char (!@#$...)
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="glass-input w-full px-3 pr-10 py-2 rounded-xl text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="cursor-pointer absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="cursor-pointer px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPassword}
                  className="cursor-pointer px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#16194F] to-[#1E2568] hover:from-[#1E2568] hover:to-[#2A348A] text-white shadow-sm flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F5BE2C]" />
                  <span>{submittingPassword ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
