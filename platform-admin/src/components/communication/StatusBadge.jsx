import React from 'react';
import { dotClass, toneClass } from './format';

export default function StatusBadge({ label, tone = 'idle', dot = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${toneClass(tone)} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotClass(tone)}`} />}
      {label}
    </span>
  );
}
