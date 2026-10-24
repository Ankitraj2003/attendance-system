import React, { useState } from 'react';
import { Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { api } from '../api';

interface LoginModalProps {
  onSuccess: (userData: any) => void;
  onOpenPortal?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await api.login(username, password);
      const user = await api.getMe();
      onSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative overflow-y-auto">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-200/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="glass-panel w-full max-w-xl rounded-[30px] p-6 sm:p-10 border border-white/90 shadow-2xl relative z-10 my-auto">
        {/* Branding Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Expandit Logo"
            className="h-20 sm:h-20 max-w-[230px] w-auto object-contain mx-auto mb-5 drop-shadow-xs"
          />
          <h2 className="text-xl sm:text-2xl font-black text-[#16194F] tracking-tight">Expandit Attendance System</h2>
          <p className="text-sm sm:text-base text-slate-500 mt-2">Administrator Portal &amp; Management Control</p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">Administrator Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                className="glass-input !bg-[#e8f0ff] w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Administrator Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                className="glass-input !bg-[#e8f0ff] w-full pl-10 pr-10 py-3.5 rounded-2xl text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer w-full py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#16194F] to-[#1E2568] hover:from-[#1E2568] hover:to-[#2A348A] text-white shadow-md shadow-indigo-950/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>{submitting ? 'Authenticating...' : 'Sign In as Administrator'}</span>
            <ArrowRight className="w-4 h-4 text-[#F5BE2C]" />
          </button>
        </form>
      </div>
    </div>
  );
};
