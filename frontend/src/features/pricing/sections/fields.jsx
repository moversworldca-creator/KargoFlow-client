// Small accessible building blocks shared by the tariff screens.
import React, { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { WEEKDAYS, WEEKDAY_LABELS } from '../constants';
import { periodOptions } from '../tariffConfig';
import { inputClass } from '../components/ui';

const DECIMAL = /^\d{0,9}(\.\d{0,4})?$/;

/** A decimal typed as text: only digits and one point are accepted, as typed. */
export function DecimalInput({ value, onChange, label, disabled, className = '', placeholder, places = 4 }) {
  const pattern = places === 2 ? /^\d{0,9}(\.\d{0,2})?$/ : DECIMAL;
  return (
    <input
      type="text" inputMode="decimal" aria-label={label} placeholder={placeholder} disabled={disabled}
      value={value ?? ''}
      onChange={(event) => { const next = event.target.value.trim(); if (next === '' || pattern.test(next)) onChange(next === '' ? null : next); }}
      className={`${inputClass} tabular-nums ${className}`}
    />
  );
}

/** A labelled decimal field. */
export function DecimalField({ label, value, onChange, disabled, hint, places }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <DecimalInput label={label} value={value} onChange={onChange} disabled={disabled} places={places} />
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export function SelectInput({ label, value, onChange, options, disabled, hideLabel = false }) {
  return (
    <label className="block text-xs">
      <span className={hideLabel ? 'sr-only' : 'mb-1 block font-semibold text-slate-700 dark:text-slate-200'}>{label}</span>
      <select className={inputClass} value={value ?? ''} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </label>
  );
}

export function Toggle({ label, checked, onChange, disabled, hint }) {
  return (
    <label className="flex items-start gap-2 text-xs">
      <input type="checkbox" className="mt-0.5" checked={Boolean(checked)} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="font-semibold text-slate-800 dark:text-slate-100">{label}</span>
        {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

export function SectionHeader({ title, description, children }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** The pricing period whose values a rate editor shows (PER-06). */
export function PeriodPicker({ config, value, onChange }) {
  const options = periodOptions(config);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <SelectInput label="Pricing period" value={options.some((o) => o.id === value) ? value : 'default'}
        onChange={onChange} options={options.map((o) => [o.id, o.name])} />
      <p className="text-[11px] text-slate-500">
        {value && value !== 'default'
          ? 'Blank values in this period use the Default period’s.'
          : 'Default applies on every date no custom period covers.'}
      </p>
    </div>
  );
}

/** Monday–Sunday inputs for one row (rates or minimum hours). */
export function WeekdayInputs({ values, onChange, disabled, label, places = 2 }) {
  return WEEKDAYS.map((day) => (
    <td key={day} className="px-1 py-1">
      <DecimalInput label={`${label} ${WEEKDAY_LABELS[day]}`} value={values?.[day]} disabled={disabled} places={places}
        onChange={(v) => onChange({ ...(values || {}), [day]: v })} className="min-w-[4.5rem] text-right" />
    </td>
  ));
}

export function WeekdayHead({ first = '' }) {
  return (
    <thead>
      <tr className="text-[11px] uppercase tracking-wide text-slate-500">
        <th scope="col" className="px-1 py-1 text-left">{first}</th>
        {WEEKDAYS.map((day) => <th key={day} scope="col" className="px-1 py-1 text-right">{WEEKDAY_LABELS[day]}</th>)}
      </tr>
    </thead>
  );
}

/**
 * An ordered list with drag-to-reorder and keyboard-accessible move buttons.
 * ``render(item)`` draws the row's content.
 */
export function ReorderableList({ items, onReorder, onEdit, onRemove, render, labelOf, disabled, emptyText }) {
  const [dragging, setDragging] = useState(null);
  if (!items.length) return <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700">{emptyText}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={item.id}
          draggable={!disabled}
          onDragStart={() => setDragging(index)}
          onDragOver={(event) => { if (dragging !== null) event.preventDefault(); }}
          onDrop={() => { if (dragging !== null) onReorder(dragging, index); setDragging(null); }}
          onDragEnd={() => setDragging(null)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${dragging === index ? 'border-brand-blue bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-800'}`}>
          {!disabled && <GripVertical size={14} className="shrink-0 cursor-grab text-slate-400" aria-hidden="true" />}
          <div className="min-w-0 flex-1">{render(item, index)}</div>
          {!disabled && (
            <span className="inline-flex shrink-0 items-center gap-0.5">
              <IconButton label={`Move ${labelOf(item)} up`} onClick={() => onReorder(index, index - 1)} disabled={index === 0}><ArrowUp size={13} /></IconButton>
              <IconButton label={`Move ${labelOf(item)} down`} onClick={() => onReorder(index, index + 1)} disabled={index === items.length - 1}><ArrowDown size={13} /></IconButton>
              {onEdit && <IconButton label={`Edit ${labelOf(item)}`} onClick={() => onEdit(item, index)}><Pencil size={13} /></IconButton>}
              {onRemove && <IconButton label={`Remove ${labelOf(item)}`} onClick={() => onRemove(item, index)}><Trash2 size={13} /></IconButton>}
            </span>
          )}
          {disabled && onEdit && <IconButton label={`View ${labelOf(item)}`} onClick={() => onEdit(item, index)}><Pencil size={13} /></IconButton>}
        </li>
      ))}
    </ul>
  );
}

export function IconButton({ label, onClick, disabled, children }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-white">
      {children}
    </button>
  );
}

/** Field problems for this section from the last failed save. */
export function SectionProblems({ problems, section }) {
  const mine = (problems || []).filter((p) => p.path === section || p.path.startsWith(`${section}.`));
  if (!mine.length) return null;
  return (
    <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
      <p className="mb-1 font-semibold">Fix these before saving:</p>
      <ul className="list-inside list-disc space-y-0.5">
        {mine.map((p, i) => <li key={`${p.path}-${i}`}><code className="text-[11px]">{p.path.slice(section.length + 1) || section}</code> — {p.message}</li>)}
      </ul>
    </div>
  );
}
