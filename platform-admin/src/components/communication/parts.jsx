import React from 'react';
import { Inbox } from 'lucide-react';

export const CARD = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs';
export const TH_ROW = 'bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider';
export const TR = 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors';
export const BTN = 'px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_PRIMARY = 'px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_DANGER = 'px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40';

export function Stat({ label, value, hint, tone }) {
  const color = tone === 'good' ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'bad' ? 'text-rose-600 dark:text-rose-400'
    : tone === 'warn' ? 'text-amber-600 dark:text-amber-400'
    : 'text-slate-900 dark:text-white';
  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-black mt-1 ${color}`}>{value}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

export function Field({ label, children, mono = false }) {
  return (
    <div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xs text-slate-800 dark:text-slate-200 break-all ${mono ? 'font-mono' : 'font-medium'}`}>{children}</div>
    </div>
  );
}

export function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 px-4 text-center text-xs text-slate-400">
        <Inbox size={20} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        {children}
      </td>
    </tr>
  );
}

export function SubTabs({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
            active === tab.id
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
