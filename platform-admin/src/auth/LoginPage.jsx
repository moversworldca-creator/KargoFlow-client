import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, Loader2, Sparkles, Building2, Key } from 'lucide-react';
import { usePlatformAuth } from './PlatformAuthContext';
import kargoflowLogo from '../assets/full_logo.png';

const DEMO_ACCOUNTS = [
  {
    role: 'Super Admin',
    email: 'admin@fastmovers.com',
    name: 'System Administrator',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
    desc: 'Unrestricted global authority across all tenants and catalog.',
  },
  {
    role: 'Support Admin',
    email: 'elena.rostova@kargoflow.com',
    name: 'Elena Rostova',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    desc: 'Support lead with tenant management & session creation.',
  },
  {
    role: 'Support Admin (Scope)',
    email: 'david.ross@kargoflow.com',
    name: 'David Ross',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    desc: 'Assigned to tenants #1, #2, and #3 only.',
  },
  {
    role: 'Auditor',
    email: 'marcus.vance@kargoflow.com',
    name: 'Marcus Vance',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    desc: 'Read-only access to audit trail and compliance records.',
  },
];

export default function LoginPage() {
  const { login } = usePlatformAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@fastmovers.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both staff email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      console.error('Platform login error:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Authentication failed. Please check your staff credentials.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillCredentials = (acc) => {
    setEmail(acc.email);
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-purple-600/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="px-5 py-3 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-white/20 flex items-center justify-center transition-transform hover:scale-105">
            <img
              src={kargoflowLogo}
              alt="KargoFlow"
              className="h-9 sm:h-10 w-auto object-contain"
            />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl font-black tracking-tight text-white">
          Platform Admin
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400 font-medium">
          Internal SaaS Control Plane & Multi-Tenant Management Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-2xl rounded-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fastmovers.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Demo: admin123</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying Staff Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Platform Admin</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Quick-Fill Seed Personas */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-3 uppercase tracking-wider">
              <Sparkles size={14} className="text-purple-400" />
              <span>Quick Login Demo Personas</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillCredentials(acc)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                        {acc.name}
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${acc.badge}`}>
                        {acc.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{acc.desc}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    Fill &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Strictly isolated from CRM tenant workspace &middot; Audited Access
        </p>
      </div>
    </div>
  );
}
