// Periods (PER-01..06): Default covers every date; custom periods are checked
// top to bottom and the first enabled match wins. Unlimited periods.
import React, { useState } from 'react';
import { CalendarRange, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Dialog, TextField } from '../components/ui';
import { formatDateOnly } from '../format';
import { move, newId } from '../tariffConfig';
import { IconButton, ReorderableList, SectionHeader, SectionProblems, Toggle } from './fields';

export default function PeriodsSection({ config, onChange, isReadOnly, problems }) {
  const periods = config.periods || [];
  const [editing, setEditing] = useState(null);
  const set = (next) => onChange({ ...config, periods: next });
  const save = (period) => {
    const index = periods.findIndex((p) => p.id === period.id);
    set(index >= 0 ? periods.map((p, i) => (i === index ? period : p)) : [...periods, period]);
    setEditing(null);
  };
  return (
    <div className="space-y-4">
      <SectionHeader title="Periods" description="Pricing periods change rates by job date (for example peak and off-peak). They are checked from the top; the first enabled period that includes the job date is used, otherwise Default.">
        {!isReadOnly && <Button onClick={() => setEditing({ id: '', name: '', is_enabled: true, date_ranges: [{ start: '', end: '' }] })}><Plus size={14} aria-hidden="true" /> Add Period</Button>}
      </SectionHeader>
      <SectionProblems problems={problems} section="periods" />
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900">
        <CalendarRange size={14} className="text-brand-blue" aria-hidden="true" />
        <span className="font-semibold">Default</span><Badge tone="green">Always on</Badge>
        <span className="text-slate-500">Covers every date no custom period matches.</span>
      </div>
      <ReorderableList
        items={periods} disabled={isReadOnly} emptyText="No custom periods. Every job uses the Default period."
        labelOf={(p) => p.name || p.id}
        onReorder={(from, to) => set(move(periods, from, to))}
        onEdit={(p) => setEditing(p)}
        onRemove={(p) => set(periods.filter((x) => x.id !== p.id))}
        render={(p, index) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400">#{index + 1}</span>
            <span className="font-semibold">{p.name}</span>
            {p.is_enabled ? <Badge tone="green">Enabled</Badge> : <Badge>Disabled</Badge>}
            <span className="text-slate-500">{(p.date_ranges || []).map((r) => (r.start === r.end ? formatDateOnly(r.start) : `${formatDateOnly(r.start)} – ${formatDateOnly(r.end)}`)).join(', ')}</span>
          </div>
        )}
      />
      {editing && <PeriodDialog period={editing} periods={periods} readOnly={isReadOnly} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function PeriodDialog({ period, periods, readOnly, onClose, onSave }) {
  const [form, setForm] = useState(period);
  const ranges = form.date_ranges?.length ? form.date_ranges : [{ start: '', end: '' }];
  const setRange = (index, patch) => setForm({ ...form, date_ranges: ranges.map((r, i) => (i === index ? { ...r, ...patch } : r)) });
  const valid = form.name.trim() && ranges.every((r) => r.start && (!r.end || r.end >= r.start));
  const submit = () => onSave({
    ...form, name: form.name.trim(),
    id: form.id || newId(form.name, ['default', ...periods.map((p) => p.id)]),
    date_ranges: ranges.map((r) => ({ start: r.start, end: r.end || r.start })),
  });
  return (
    <Dialog title={period.id ? 'Edit period' : 'Add period'} onClose={onClose} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button>{!readOnly && <Button onClick={submit} disabled={!valid}>Apply</Button>}</>
    )}>
      <fieldset disabled={readOnly} className="space-y-3">
        <TextField label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
        <Toggle label="Enabled" checked={form.is_enabled} onChange={(is_enabled) => setForm({ ...form, is_enabled })} />
        <div className="space-y-2">
          <p className="text-xs font-semibold">Dates <span className="font-normal text-slate-500">— a range, or a single date (leave the end empty)</span></p>
          {ranges.map((range, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <TextField label="From" type="date" value={range.start} onChange={(start) => setRange(index, { start })} required />
              <TextField label="Until" type="date" value={range.end === range.start ? '' : range.end} onChange={(end) => setRange(index, { end })} />
              <IconButton label={`Remove dates ${index + 1}`} disabled={ranges.length === 1} onClick={() => setForm({ ...form, date_ranges: ranges.filter((_, i) => i !== index) })}><Trash2 size={13} /></IconButton>
            </div>
          ))}
          <Button variant="ghost" onClick={() => setForm({ ...form, date_ranges: [...ranges, { start: '', end: '' }] })}><Plus size={12} aria-hidden="true" /> Add dates</Button>
        </div>
      </fieldset>
    </Dialog>
  );
}
