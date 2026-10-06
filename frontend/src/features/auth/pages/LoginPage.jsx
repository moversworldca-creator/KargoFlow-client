import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Users, FileText, Calendar, MessageSquare, Truck, Megaphone } from 'lucide-react';
import logo from '../../../assets/full_logo.png';
import heroTruckBg from '../../../assets/hero_truck_bg.png';


export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('admin@fastmovers.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await onLogin(email, password);
    } catch (err) {
      setError(
        err?.response?.data?.detail || 
        err?.response?.data?.non_field_errors?.[0] || 
        'An error occurred during authentication. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#f8fafc] overflow-hidden font-sans">
      {/* Full screen Background Image */}
      <img
        src={heroTruckBg}
        alt="KargoFlow Fleet"
        className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none z-0"
      />



      <div className="relative z-10 w-full max-w-[1640px] mx-auto min-h-[100dvh] flex justify-center lg:justify-end items-center p-4 sm:p-8 lg:p-12">
        
        {/* Right Side - Login Card */}
        <div className="w-full max-w-[360px] bg-white/95 backdrop-blur-2xl rounded-[20px] border border-white/60 shadow-[0_20px_60px_rgba(15,23,42,0.15)] p-5 sm:p-6 flex flex-col shrink-0">
          <div className="flex flex-col items-center text-center">
            <img src={logo} alt="KargoFlow" className="mb-4 h-[32px] w-auto object-contain" />
            <h2 className="mb-1 text-[22px] font-extrabold leading-tight text-[#0F172A] tracking-tight">Welcome Back</h2>
            <p className="mb-4 text-[13px] text-[#475467] font-medium">Sign in to your architectural ledger to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="w-full space-y-3">
            {error ? (
              <div className="flex items-center gap-2 rounded-[8px] border border-[#FDE8E8] bg-[#FDE8E8]/50 px-4 py-3 text-[13px] text-[#791F1F]" role="alert">
                <AlertCircle size={18} className="shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[#1d2939] uppercase tracking-wider pl-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" size={14} strokeWidth={1.5} />
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@fastmovers.com" autoComplete="email" required className="h-[44px] w-full rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] pl-9 pr-3 text-[13px] font-medium text-[#1d2939] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#F59E0B] focus:ring-[3px] focus:ring-[#F59E0B]/20" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between w-full px-1">
                <label className="text-[10px] font-bold text-[#1d2939] uppercase tracking-wider">Password</label>
                <a href="#" className="text-[11px] font-bold text-[#2196F3] transition-colors hover:text-[#1976D2]">Forgot Password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" size={14} strokeWidth={1.5} />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••••" autoComplete="current-password" required className="h-[44px] w-full rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] pl-9 pr-9 text-[13px] font-medium text-[#1d2939] outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#F59E0B] focus:ring-[3px] focus:ring-[#F59E0B]/20" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] transition-colors hover:text-[#475467] focus:outline-none" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center w-full">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" className="h-[14px] w-[14px] cursor-pointer rounded-[3px] border-[#D0D5DD] bg-white text-[#2196F3] transition-colors focus:ring-[#2196F3]" />
                <label htmlFor="remember" className="cursor-pointer select-none text-[12px] font-semibold text-[#475467]">Remember my device for 30 days</label>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className={`mt-1 flex h-[44px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#2196F3] text-[14px] font-bold text-white transition-all hover:bg-[#1976D2] ${isLoading ? 'cursor-not-allowed opacity-70' : 'hover:shadow-[0_8px_16px_rgba(33,150,243,0.3)] hover:-translate-y-[1px]'}`}>
              {isLoading ? 'Authenticating...' : 'Access Dashboard'}
              {!isLoading && <ArrowRight size={14} strokeWidth={2.5} />}
            </button>

            <button
              type="button"
              onClick={() => onLogin('admin@fastmovers.com', 'demo')}
              className="mt-2 flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] border border-amber-300 bg-amber-50 text-[13px] font-semibold text-amber-800 transition-all hover:bg-amber-100 cursor-pointer"
            >
              Test Template Without Backend (Demo Mode)
            </button>
          </form>

          <div className="mt-6 text-center text-[11px] font-medium text-[#667085]">
            © 2026 KargoFlow • <a href="#" className="hover:text-[#2196F3] transition-colors">Privacy Policy</a> • <a href="#" className="hover:text-[#2196F3] transition-colors">Terms of Service</a>
          </div>
        </div>

      </div>
    </div>
  );
}
