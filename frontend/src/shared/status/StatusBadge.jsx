import React from 'react';
import { statusLabel, statusTone } from './statusCatalog';

const TONES = {
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900',
  red: 'bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
};

/** A status shown by its name (``field`` is a key of STATUS_FIELDS, e.g. "job.dispatch"). */
export default function StatusBadge({ field, state, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONES[statusTone(state)]} ${className}`}>
      {statusLabel(field, state)}
    </span>
  );
}
