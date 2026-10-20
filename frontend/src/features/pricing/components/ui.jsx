// Building blocks shared by the Pricing and Estimates screens. The accessible
// dialog, field and state primitives are the User Management ones, reused.
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useToast } from '../../../shared/context/ToastContext';
import {
  Badge, Button, ConfirmDialog, DeniedState, Dialog, EmptyState, ErrorBanner, Field, LoadingState, inputClass,
} from '../../settings/userManagement/ui';
import { pricingError, pricingErrorText } from '../errors';
import { formatMoney, humanize } from '../format';

export { Badge, Button, ConfirmDialog, DeniedState, Dialog, EmptyState, ErrorBanner, Field, LoadingState, inputClass };

const TONE_TO_BADGE = {
  slate: 'slate', blue: 'blue', indigo: 'blue', violet: 'blue', green: 'green', amber: 'amber', rose: 'red', dark: 'slate',
};

/** A backend state shown with its own name (text, never colour alone). */
export function StateBadge({ state, tones }) {
  return <Badge tone={TONE_TO_BADGE[tones?.[state]] || 'slate'}>{humanize(state)}</Badge>;
}

/** A money value as the backend computed it. */
export function Money({ value, currency, className = '', strong = false }) {
  return (
    <span className={`tabular-nums ${strong ? 'font-bold' : ''} ${className}`}>{formatMoney(value, currency)}</span>
  );
}

export function Section({ title, description, actions, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Accessible tabs (roving focus with arrow keys). */
export function Tabs({ tabs, active, onChange, label }) {
  const refs = useRef({});
  const onKeyDown = (event, index) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(node) => { refs.current[tab.id] = node; }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`-mb-px border-b-2 px-3 py-2 text-xs font-semibold transition ${selected
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            {tab.label}{tab.count != null && <span className="ml-1 text-slate-400">({tab.count})</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Callout({ tone = 'info', title, children, actions }) {
  const styles = {
    info: ['border-sky-200 bg-sky-50 text-sky-900', Info],
    warning: ['border-amber-200 bg-amber-50 text-amber-900', AlertTriangle],
    danger: ['border-rose-200 bg-rose-50 text-rose-900', AlertTriangle],
    success: ['border-emerald-200 bg-emerald-50 text-emerald-900', CheckCircle2],
  };
  const [cls, IconCmp] = styles[tone] || styles.info;
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${cls}`}>
      <IconCmp size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

export function KeyValue({ items }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.filter(Boolean).map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="truncate text-sm text-slate-900 dark:text-slate-100">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A labelled input bound to a value. */
export function TextField({ label, value, onChange, type = 'text', hint, error, required, disabled, placeholder, inputMode, step, min, ...rest }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <input
        id={id} type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)}
        className={inputClass} disabled={disabled} placeholder={placeholder} inputMode={inputMode} step={step} min={min}
        required={required} aria-invalid={error ? true : undefined} {...rest}
      />
    </Field>
  );
}

export function SelectField({ label, value, onChange, options, hint, error, required, disabled }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <select id={id} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={inputClass} disabled={disabled}>
        {options.map((option) => {
          const [val, text] = Array.isArray(option) ? option : [option, humanize(option)];
          return <option key={String(val)} value={val}>{text}</option>;
        })}
      </select>
    </Field>
  );
}

export function TextAreaField({ label, value, onChange, hint, error, rows = 3, disabled, placeholder, required }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <textarea id={id} rows={rows} value={value ?? ''} onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} font-mono`} disabled={disabled} placeholder={placeholder} required={required} />
    </Field>
  );
}

export function CheckboxField({ label, checked, onChange, disabled, hint }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2">
      <input id={id} type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)}
        disabled={disabled} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
      <label htmlFor={id} className="text-xs text-slate-700 dark:text-slate-200">
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
      </label>
    </div>
  );
}

/** Decimal-as-string input: keeps exactly what the user typed (no float conversion). */
export function DecimalField({ label, value, onChange, hint, error, required, disabled, allowNegative = false }) {
  const pattern = allowNegative ? /^-?\d*(\.\d*)?$/ : /^\d*(\.\d*)?$/;
  return (
    <TextField
      label={label} value={value} inputMode="decimal" hint={hint} error={error} required={required} disabled={disabled}
      onChange={(next) => { if (next === '' || pattern.test(next)) onChange(next); }}
    />
  );
}

/**
 * A mutation that reports its outcome: success toast, the backend's own
 * refusal (stable code -> message) as an error toast, and query invalidation.
 */
export function useAction(fn, { success, onSuccess, invalidate, silent = false } = {}) {
  const { showToast } = useToast();
  const [lastError, setLastError] = useState(null);
  const mutation = useMutation({
    mutationFn: fn,
    onSuccess: async (data, variables) => {
      setLastError(null);
      if (invalidate) await invalidate(data, variables);
      if (success) showToast(typeof success === 'function' ? success(data, variables) : success, 'success');
      onSuccess?.(data, variables);
    },
    onError: (error) => {
      const info = pricingError(error);
      setLastError(info);
      if (!silent) showToast(pricingErrorText(error), info.kind === 'conflict' ? 'warning' : 'error', 6000);
    },
  });
  const run = useCallback((variables) => mutation.mutateAsync(variables).catch(() => undefined), [mutation]);
  return { run, busy: mutation.isPending, error: lastError, reset: () => setLastError(null), data: mutation.data };
}

/** Loading / denied / error / empty in one place for a query. */
export function QueryState({ query, empty, emptyText = 'Nothing here yet.', deniedText, children }) {
  if (query.isLoading) return <LoadingState />;
  if (query.isError) {
    const info = pricingError(query.error);
    if (info.kind === 'denied') return <DeniedState>{deniedText || info.message}</DeniedState>;
    return <ErrorBanner message={info.message} onRetry={() => query.refetch()} />;
  }
  if (empty) return <EmptyState>{emptyText}</EmptyState>;
  return children;
}

/** Issues from validation (severity, code, message, object). */
export function IssueList({ issues, onOpen }) {
  if (!issues?.length) return <Callout tone="success">No validation issues.</Callout>;
  const count = (severity) => issues.filter((i) => i.severity === severity).length;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  return (
    <>
    <p className="mb-2 text-xs font-semibold text-slate-700" role="status">
      {plural(count('error'), 'error')} · {plural(count('warning'), 'warning')} · {plural(count('info'), 'note')}
    </p>
    <ul className="space-y-1.5" aria-label="Validation issues">
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${issue.object_key}-${index}`} className="flex flex-wrap items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
          <Badge tone={{ error: 'red', warning: 'amber', info: 'blue' }[issue.severity] || 'slate'}>{humanize(issue.severity)}</Badge>
          <code className="text-[11px] text-slate-500">{issue.code}</code>
          <span className="min-w-0 flex-1 text-slate-800 dark:text-slate-100">{issue.message}</span>
          {issue.object_key && <span className="text-[11px] text-slate-500">{humanize(issue.object_type)}: {issue.object_key}</span>}
          {onOpen && issue.object_type && <button type="button" className="text-[11px] font-semibold text-primary" onClick={() => onOpen(issue)}>Go to {humanize(issue.object_type)}</button>}
        </li>
      ))}
    </ul>
    </>
  );
}

/**
 * Plan gate for Estimates / Pricing. Shows why the area is unavailable or
 * read-only when the plan can be read; renders the children otherwise.
 */
export function PlanGate({ feature, children }) {
  if (feature && !['write', 'read'].includes(feature.mode)) {
    return <DeniedState title="Not included in your plan">Estimates and pricing are not part of your company&apos;s current subscription.</DeniedState>;
  }
  return (
    <>
      {feature?.readOnly && <Callout tone="warning" title="Read-only">Your subscription allows viewing only. Changes are disabled.</Callout>}
      {children}
    </>
  );
}


/** Warn before the browser tab closes or reloads while material edits are unsaved. */
export function useUnsavedChanges(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}
