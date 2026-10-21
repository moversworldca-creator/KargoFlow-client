import React from 'react';
import { Pill, StatusDot } from '../../../../shared/ui/RedesignAtoms';

const DECISION_CONFIG = {
  pending: {
    label: 'Duplicate Warning',
    tone: 'warn',
    dot: 'warn',
  },
  confirmed_duplicate: {
    label: 'Confirmed Duplicate',
    tone: 'rose',
    dot: 'rose',
  },
  repeat_customer: {
    label: 'Repeat Customer',
    tone: 'blue',
    dot: 'blue',
  },
  not_duplicate: {
    label: 'Not Duplicate',
    tone: 'green',
    dot: 'green',
  },
  merged: {
    label: 'Merged',
    tone: 'purple',
    dot: 'purple',
  },
  ignored: {
    label: 'Dismissed',
    tone: 'slate',
    dot: 'slate',
  },
};

export default function DuplicateStatusBadge({ decision = 'pending', className = '', onClick }) {
  const cfg = DECISION_CONFIG[decision] || DECISION_CONFIG.pending;

  return (
    <Pill
      tone={cfg.tone}
      className={`cursor-pointer transition hover:opacity-80 active:scale-95 ${className}`}
      onClick={onClick}
    >
      <StatusDot tone={cfg.dot} />
      <span>{cfg.label}</span>
    </Pill>
  );
}
