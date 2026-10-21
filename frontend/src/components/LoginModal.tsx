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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-200/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="glass-panel w-full max-w-md rounded-3xl p-8 border border-white/90 shadow-2xl relative z-10">
        {/* Branding Logo */}
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="Expandit Logo"
            className="h-16 w-auto object-contain mx-auto mb-3 drop-shadow-xs"
          />
          <h2 className="text-xl font-black text-[#16194F] tracking-tight">Expandit Enterprise Suite</h2>
          <p className="text-xs text-slate-500 mt-1">Administrator Portal &amp; Management Control</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Administrator Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium"
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
                className="glass-input w-full pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-[#16194F] to-[#1E2568] hover:from-[#1E2568] hover:to-[#2A348A] text-white shadow-md shadow-indigo-950/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>{submitting ? 'Authenticating...' : 'Sign In as Administrator'}</span>
            <ArrowRight className="w-4 h-4 text-[#F5BE2C]" />
          </button>
        </form>
      </div>
    </div>
  );
};
