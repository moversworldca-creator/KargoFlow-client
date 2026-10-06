import React from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Toast = () => {
  const { toast, hideToast } = useToast();

  if (!toast) return null;

  const typeStyles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-100',
      text: 'text-green-800',
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-100',
      text: 'text-red-800',
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      text: 'text-amber-800',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      text: 'text-blue-800',
      icon: <Info className="w-5 h-5 text-blue-500" />,
    },
  };

  const style = typeStyles[toast.type] || typeStyles.info;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={`${style.bg} ${style.border} border rounded-2xl shadow-xl p-4 flex items-start gap-3`}>
        <div className="flex-shrink-0 mt-0.5">
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${style.text} leading-tight`}>
            {toast.message}
          </p>
        </div>
        <button
          onClick={hideToast}
          className="flex-shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
