import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AccessDenied({ 
  requiredPermission,
  title = 'Access Restricted',
  message = "You do not have the required platform permission to access this section." 
}) {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-sm">
        <ShieldAlert size={28} />
      </div>
      <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
        {title}
      </h2>
      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4">
        {message}
      </p>

      {requiredPermission && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-100/80 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-mono font-bold mb-6">
          Required: {requiredPermission}
        </div>
      )}

      <div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
}
