// When a Tariff applies: branch, customer / contract, service and move types,
// dates, weekdays, seasons, distance / weight / volume ranges and geography.
// An exclusion removes matching jobs. The resolver decides; this only edits.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../../services/axios';
import { getBranches, getMoveTypeLookups, getServiceTypes } from '../../../services/api';
import AsyncSelect from '../../../shared/ui/AsyncSelect';
import { pricingApi } from '../api';
import { MONTHS, WEEKDAYS } from '../constants';
import { formatDateOnly } from '../format';
import {
  Badge, Button, CheckboxField, ConfirmDialog, DecimalField, Dialog, EmptyState, ErrorBanner, Field, SelectField,
  TextField, useAction,
} from './ui';

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);
const GEO_SCOPES = [['origin', 'Origin'], ['destination', 'Destination'], ['service', 'Service location']];
const splitList = (text) => text.split(',').map((v) => v.trim().toUpperCase()).filter(Boolean);
const joinList = (value) => [].concat(value || []).join(', ');

export const maskToList = (mask, labels) => labels.filter((_, i) => (Number(mask || 0) >> i) & 1);
export const listToMask = (selected, labels) => labels.reduce((mask, label, i) => (selected.includes(label) ? mask | (1 << i) : mask), 0);

export const searchCustomers = async (search, offset, limit) => {
  const response = await api.get('/tenant/customers/', { params: { search, offset, limit } });
  const rows = asList(response).map((c) => ({ id: c.id, label: c.profile_name || c.display_name || c.full_name || `Customer #${c.id}` }));
  return { results: rows, count: response?.count };
};

function summary(row, lookups) {
  const parts = [];
  if (row.branch_id) parts.push(`Branch: ${lookups.branches[row.branch_id] || `#${row.branch_id}`}`);
  if (row.customer_id) parts.push(`Customer #${row.customer_id}`);
  if (row.contract_key) parts.push(`Contract ${row.contract_key}`);
  if (row.service_type_id) parts.push(`Service: ${lookups.services[row.service_type_id] || `#${row.service_type_id}`}`);
  if (row.move_type_id) parts.push(`Move type: ${lookups.moveTypes?.[row.move_type_id] || `#${row.move_type_id}`}`);
  if (row.opportunity_type_id) parts.push(`Opportunity type: ${lookups.opportunityTypes?.[row.opportunity_type_id] || `#${row.opportunity_type_id}`}`);
  if (row.service_date_from || row.service_date_until) parts.push(`Dates ${formatDateOnly(row.service_date_from)} – ${formatDateOnly(row.service_date_until)}`);
  if (row.weekday_mask) parts.push(`Days ${maskToList(row.weekday_mask, WEEKDAYS).join(', ')}`);
  if (row.month_mask) parts.push(`Months ${maskToList(row.month_mask, MONTHS).join(', ')}`);
  for (const [name, unit] of [['distance', 'mi'], ['weight', 'lb'], ['volume', 'cu ft']]) {
    if (row[`${name}_min`] != null || row[`${name}_max`] != null) parts.push(`${name} ${row[`${name}_min`] ?? 0}–${row[`${name}_max`] ?? '∞'} ${unit}`);
  }
  for (const [scope, label] of GEO_SCOPES) {
    const geo = row.geography_criteria?.[scope] || {};
    if (geo.region?.length) parts.push(`${label} region ${[].concat(geo.region).join(', ')}`);
    if (geo.postal_prefix?.length) parts.push(`${label} postal ${[].concat(geo.postal_prefix).join(', ')}`);
  }
  return parts.length ? parts.join(' · ') : 'Every job';
}

export default function ApplicabilityEditor({ revision, editable, onChanged }) {
  const rows = revision.content?.applicability || [];
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const branches = useQuery({ queryKey: ['pricing', 'branch-options'], queryFn: getBranches, staleTime: 60_000, retry: false });
  const services = useQuery({ queryKey: ['pricing', 'service-type-options'], queryFn: () => getServiceTypes({ limit: 200 }), staleTime: 60_000, retry: false });
  const moveTypes = useQuery({ queryKey: ['pricing', 'move-type-options'], queryFn: () => getMoveTypeLookups({ limit: 200 }), staleTime: 60_000, retry: false });
  const opportunityTypes = useQuery({ queryKey: ['pricing', 'opportunity-type-options'], queryFn: () => api.get('/tenant/opportunity-types/', { params: { limit: 200 } }), staleTime: 60_000, retry: false });
  const lookups = {
    branches: Object.fromEntries(asList(branches.data).map((b) => [b.id, b.name])),
    services: Object.fromEntries(asList(services.data).map((s) => [s.id, s.name])),
    moveTypes: Object.fromEntries(asList(moveTypes.data).map((s) => [s.id, s.name])),
    opportunityTypes: Object.fromEntries(asList(opportunityTypes.data).map((s) => [s.id, s.name])),
  };
  const remove = useAction((row) => pricingApi.deleteItem(revision.id, 'applicability', row.id, revision.lock_version), {
    success: 'Removed.', invalidate: onChanged, onSuccess: () => setDeleting(null),
  });
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-600">With no applicability rows the Tariff applies to every job in its scope. With rows, a job must match at least one non-exclusion row and no exclusion.</p>
      {editable && <div className="flex justify-end"><Button onClick={() => setEditing({})}><Plus size={14} aria-hidden="true" /> Add condition</Button></div>}
      {!rows.length ? <EmptyState>Applies to every job.</EmptyState> : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs">
              <span className="font-semibold">{row.applicability_key}</span>
              {row.is_exclusion && <Badge tone="red">Exclusion</Badge>}
              {!row.is_active && <Badge>Inactive</Badge>}
              <span className="min-w-0 flex-1 text-slate-700">{summary(row, lookups)}</span>
              {editable && (
                <span className="inline-flex gap-1">
                  <Button variant="ghost" aria-label={`Edit ${row.applicability_key}`} onClick={() => setEditing(row)}><Pencil size={13} aria-hidden="true" /></Button>
                  <Button variant="ghost" aria-label={`Remove ${row.applicability_key}`} onClick={() => setDeleting(row)}><Trash2 size={13} aria-hidden="true" /></Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && <ApplicabilityDialog row={editing} revision={revision} lookups={{ branches: asList(branches.data), services: asList(services.data), moveTypes: asList(moveTypes.data), opportunityTypes: asList(opportunityTypes.data) }} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
      {deleting && (
        <ConfirmDialog title={`Remove ${deleting.applicability_key}?`} confirmLabel="Remove" busy={remove.busy} error={remove.error?.message}
          onCancel={() => setDeleting(null)} onConfirm={() => remove.run(deleting)}>
          <p>Removed from this draft only.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function ApplicabilityDialog({ row, revision, lookups, onClose, onSaved }) {
  const text = (v) => (v === null || v === undefined ? '' : String(v));
  const [form, setForm] = useState({
    applicability_key: row.applicability_key || '', priority: text(row.priority ?? 100), branch_id: text(row.branch_id),
    customer_id: row.customer_id || null, contract_key: row.contract_key || '', service_type_id: text(row.service_type_id),
    move_type_id: text(row.move_type_id), opportunity_type_id: text(row.opportunity_type_id),
    service_date_from: row.service_date_from || '', service_date_until: row.service_date_until || '',
    weekdays: maskToList(row.weekday_mask, WEEKDAYS), months: maskToList(row.month_mask, MONTHS),
    distance_min: text(row.distance_min), distance_max: text(row.distance_max), weight_min: text(row.weight_min),
    weight_max: text(row.weight_max), volume_min: text(row.volume_min), volume_max: text(row.volume_max),
    geo: Object.fromEntries(GEO_SCOPES.map(([scope]) => [scope, {
      region: joinList(row.geography_criteria?.[scope]?.region), postal: joinList(row.geography_criteria?.[scope]?.postal_prefix),
    }])),
    is_exclusion: Boolean(row.is_exclusion),
    is_active: row.is_active ?? true,
  });
  const set = (patch) => setForm({ ...form, ...patch });
  const nul = (v) => (v === '' ? null : v);
  const save = useAction(() => {
    const geography = {};
    for (const [scope] of GEO_SCOPES) {
      const criteria = {};
      if (splitList(form.geo[scope].region).length) criteria.region = splitList(form.geo[scope].region);
      if (splitList(form.geo[scope].postal).length) criteria.postal_prefix = splitList(form.geo[scope].postal);
      if (Object.keys(criteria).length) geography[scope] = criteria;
    }
    const body = {
      applicability_key: form.applicability_key, priority: Number(form.priority || 100),
      branch_id: form.branch_id ? Number(form.branch_id) : null, customer_id: form.customer_id || null,
      contract_key: form.contract_key, service_type_id: form.service_type_id ? Number(form.service_type_id) : null,
      move_type_id: form.move_type_id ? Number(form.move_type_id) : null,
      opportunity_type_id: form.opportunity_type_id ? Number(form.opportunity_type_id) : null,
      service_date_from: nul(form.service_date_from), service_date_until: nul(form.service_date_until),
      weekday_mask: form.weekdays.length ? listToMask(form.weekdays, WEEKDAYS) : null,
      month_mask: form.months.length ? listToMask(form.months, MONTHS) : null,
      distance_min: nul(form.distance_min), distance_max: nul(form.distance_max), weight_min: nul(form.weight_min),
      weight_max: nul(form.weight_max), volume_min: nul(form.volume_min), volume_max: nul(form.volume_max),
      geography_criteria: geography,
      is_exclusion: form.is_exclusion, is_active: form.is_active, lock_version: revision.lock_version,
    };
    return row.id ? pricingApi.updateItem(revision.id, 'applicability', row.id, body) : pricingApi.createItem(revision.id, 'applicability', body);
  }, { success: 'Applicability saved.', onSuccess: onSaved, silent: true });

  const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  return (
    <Dialog title={row.id ? 'Edit applicability' : 'Add applicability'} onClose={onClose} size="lg" busy={save.busy} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy}>Save</Button></>
    )}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Key" value={form.applicability_key} onChange={(v) => set({ applicability_key: v.toLowerCase() })} disabled={Boolean(row.id)} required />
          <TextField label="Priority" value={form.priority} inputMode="numeric" onChange={(v) => set({ priority: v.replace(/\D/g, '') })} />
          <SelectField label="Branch" value={form.branch_id} onChange={(v) => set({ branch_id: v })} options={[['', 'Any branch'], ...lookups.branches.map((b) => [String(b.id), b.name])]} />
          <SelectField label="Service type" value={form.service_type_id} onChange={(v) => set({ service_type_id: v })} options={[['', 'Any service'], ...lookups.services.map((s) => [String(s.id), s.name])]} />
          <SelectField label="Move type" value={form.move_type_id} onChange={(v) => set({ move_type_id: v })} options={[['', 'Any move type'], ...lookups.moveTypes.map((s) => [String(s.id), s.name])]} />
          <SelectField label="Opportunity type" value={form.opportunity_type_id} onChange={(v) => set({ opportunity_type_id: v })} options={[['', 'Any opportunity type'], ...lookups.opportunityTypes.map((s) => [String(s.id), s.name])]} />
          <Field label="Customer (contract pricing)">
            <AsyncSelect aria-label="Customer" value={form.customer_id} onChange={(value) => set({ customer_id: value || null })} fetchOptions={searchCustomers} placeholder="Any customer" initialLabel={form.customer_id ? `Customer #${form.customer_id}` : ''} />
          </Field>
          <TextField label="Contract key" value={form.contract_key} onChange={(v) => set({ contract_key: v })} />
          <TextField label="Service date from" type="date" value={form.service_date_from} onChange={(v) => set({ service_date_from: v })} />
          <TextField label="Service date until" type="date" value={form.service_date_until} onChange={(v) => set({ service_date_until: v })} />
        </div>
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="text-xs font-semibold text-slate-700">Geography (comma-separated; empty = anywhere)</legend>
          {GEO_SCOPES.map(([scope, label]) => (
            <div key={scope} className="space-y-2">
              <TextField label={`${label} regions`} value={form.geo[scope].region} placeholder="TX, OK"
                onChange={(v) => set({ geo: { ...form.geo, [scope]: { ...form.geo[scope], region: v } } })} />
              <TextField label={`${label} postal prefixes`} value={form.geo[scope].postal} placeholder="752, 753"
                onChange={(v) => set({ geo: { ...form.geo, [scope]: { ...form.geo[scope], postal: v } } })} />
            </div>
          ))}
        </fieldset>
        <fieldset>
          <legend className="text-xs font-semibold text-slate-700">Weekdays (none = every day)</legend>
          <div className="mt-1 flex flex-wrap gap-3">{WEEKDAYS.map((d) => <CheckboxField key={d} label={d} checked={form.weekdays.includes(d)} onChange={() => set({ weekdays: toggle(form.weekdays, d) })} />)}</div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-semibold text-slate-700">Season (none = all year)</legend>
          <div className="mt-1 flex flex-wrap gap-3">{MONTHS.map((m) => <CheckboxField key={m} label={m} checked={form.months.includes(m)} onChange={() => set({ months: toggle(form.months, m) })} />)}</div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-3">
          <DecimalField label="Distance from (mi)" value={form.distance_min} onChange={(v) => set({ distance_min: v })} />
          <DecimalField label="Weight from (lb)" value={form.weight_min} onChange={(v) => set({ weight_min: v })} />
          <DecimalField label="Volume from (cu ft)" value={form.volume_min} onChange={(v) => set({ volume_min: v })} />
          <DecimalField label="Distance up to (mi)" value={form.distance_max} onChange={(v) => set({ distance_max: v })} />
          <DecimalField label="Weight up to (lb)" value={form.weight_max} onChange={(v) => set({ weight_max: v })} />
          <DecimalField label="Volume up to (cu ft)" value={form.volume_max} onChange={(v) => set({ volume_max: v })} />
        </div>
        <div className="flex flex-wrap gap-4">
          <CheckboxField label="Exclusion" hint="Jobs matching this row are excluded from the Tariff." checked={form.is_exclusion} onChange={(v) => set({ is_exclusion: v })} />
          <CheckboxField label="Active" checked={form.is_active} onChange={(v) => set({ is_active: v })} />
        </div>
      </div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}
