import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, ShieldCheck, UserCheck, Key, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { UserRole } from '../types/index.ts';

export const LoginPage: React.FC = () => {
  const { login, quickLogin, isLoading } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      success('Welcome back! Signed in successfully.');
      navigate('/');
    } catch (err: any) {
      error(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setIsSubmitting(true);
    try {
      await quickLogin(role);
      success(`Signed in as ${role.toUpperCase()} successfully.`);
      navigate('/');
    } catch (err: any) {
      error(err.message || 'Quick login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-200 mb-4">
            <Boxes className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">StockMaster Pro</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise Stock Maintenance &amp; Inventory Management
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@stockmaster.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-slate-400">Default: Admin@123</span>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 1-Click Fast Demo Roles */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Instant 1-Click Role Login
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Click any profile below to authenticate immediately with seeded credentials:
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={isSubmitting}
                className="flex flex-col items-center justify-center p-2.5 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl text-center transition-all cursor-pointer group"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform mb-1" />
                <span className="text-xs font-bold text-indigo-950">Admin</span>
                <span className="text-[10px] text-indigo-600">Full Control</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('manager')}
                disabled={isSubmitting}
                className="flex flex-col items-center justify-center p-2.5 bg-sky-50/70 hover:bg-sky-100/80 border border-sky-200 rounded-xl text-center transition-all cursor-pointer group"
              >
                <UserCheck className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform mb-1" />
                <span className="text-xs font-bold text-sky-950">Manager</span>
                <span className="text-[10px] text-sky-600">Stock &amp; POs</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('staff')}
                disabled={isSubmitting}
                className="flex flex-col items-center justify-center p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center transition-all cursor-pointer group"
              >
                <Lock className="w-4 h-4 text-slate-600 group-hover:scale-110 transition-transform mb-1" />
                <span className="text-xs font-bold text-slate-900">Staff</span>
                <span className="text-[10px] text-slate-500">Stock In/Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Encrypted with bcrypt &amp; signed JWT tokens</span>
        </p>
      </div>
    </div>
  );
};
