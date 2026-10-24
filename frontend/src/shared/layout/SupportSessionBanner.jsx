import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Clock, LogOut, AlertTriangle, Key } from 'lucide-react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { toast } from 'sonner';

function formatRemaining(expiresAt, nowMs) {
  if (!expiresAt) return null;
  const target = new Date(expiresAt).getTime();
  const diff = target - nowMs;
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default function SupportSessionBanner() {
  const { user, supportConsoleContext, logout } = useAuth();
  const [nowMs, setNowMs] = useState(Date.now());

  const isPlatformSupport = user?.identity_type === 'platform_support' || Boolean(supportConsoleContext);

  const expiresAt = supportConsoleContext?.expiresAt || user?.support_session_expires_at || null;
  const tenantName = supportConsoleContext?.tenantName || user?.company?.name || `Tenant #${user?.company_id || ''}`;
  const accessMode = supportConsoleContext?.accessMode || user?.access_mode || 'read';
  const isWrite = accessMode === 'support_write' || accessMode === 'write';

  // Tick every second to update remaining time
  useEffect(() => {
    if (!isPlatformSupport || !expiresAt) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (new Date(expiresAt).getTime() <= current) {
        toast.error('Support session duration has ended. Access mode terminated.');
        logout();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlatformSupport, expiresAt, logout]);

  const remaining = useMemo(() => {
    return formatRemaining(expiresAt, nowMs);
  }, [expiresAt, nowMs]);

  if (!isPlatformSupport) {
    return null;
  }

  const handleExitSession = async () => {
    try {
      await logout();
      toast.success('Exited support session. Returned to platform portal.');
      if (typeof window !== 'undefined') {
        if (window.opener && !window.opener.closed) {
          window.close();
        } else if (window.location && typeof window.location.assign === 'function') {
          window.location.assign('http://localhost:5174/support');
        }
      }
    } catch {
      if (typeof window !== 'undefined' && window.location && typeof window.location.assign === 'function') {
        window.location.assign('/login');
      }
    }
  };

  return (
    <div 
      className="bg-slate-900 border-b border-amber-500/40 text-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md z-50 shrink-0"
      data-testid="platform-support-banner"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
        
        <div className="flex items-center gap-1.5 font-bold text-slate-100">
          <Shield size={14} className="text-amber-400" />
          <span>Controlled Support Session Active</span>
        </div>

        <span className="text-slate-500">•</span>
        <span className="font-semibold text-slate-200">
          Tenant: <strong className="text-white font-bold">{tenantName}</strong>
        </span>

        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide border uppercase ${
          isWrite
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
        }`}>
          {isWrite ? 'Support Write (Modify)' : 'Support Read-Only'}
        </span>
        {!isWrite && (
          <span className="text-[11px] text-blue-200/90 font-medium hidden sm:inline">
            (Viewing enabled, modifications disabled)
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {expiresAt && (
          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
            <Clock size={12} className="text-amber-400" />
            <span>Time Left:</span>
            <strong className={`font-bold ${remaining === 'Expired' ? 'text-rose-400' : 'text-white'}`}>
              {remaining || 'Active'}
            </strong>
          </div>
        )}

        <button
          onClick={handleExitSession}
          className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          title="Terminate access mode and exit to platform admin"
        >
          <LogOut size={13} />
          <span>Exit Session</span>
        </button>
      </div>
    </div>
  );
}
