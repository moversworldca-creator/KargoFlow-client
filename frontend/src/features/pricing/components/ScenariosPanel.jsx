// Regression tests of a revision: sample jobs with the expected outcome. The
// backend prices them with this revision as if it were published; required
// tests must pass before the revision can be validated / published.
import React, { useState } from 'react';
import { Pencil, Play, Plus, Trash2 } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { pricingApi } from '../api';
import { formatMoney } from '../format';
import { PRICING } from '../permissions';
import JobInputsForm, { EMPTY_JOB_INPUTS, cleanJobInputs, jobInputsToForm } from './JobInputsForm';
import {
  Badge, Button, CheckboxField, ConfirmDialog, DecimalField, Dialog, EmptyState, ErrorBanner, TextField, useAction,
} from './ui';

export default function ScenariosPanel({ revision, editable, onChanged }) {
  const { can } = useCan();
  const rows = revision.content?.scenarios || [];
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [results, setResults] = useState(null);
  const runAll = useAction(() => pricingApi.runScenarios(revision.id), {
    success: (data) => `${data.filter((r) => r.passed).length} of ${data.length} tests passed.`, onSuccess: setResults,
  });
  const remove = useAction((row) => pricingApi.deleteItem(revision.id, 'scenarios', row.id, revision.lock_version), {
    success: 'Test removed.', invalidate: onChanged, onSuccess: () => setDeleting(null),
  });
  const resultFor = (key) => results?.find((r) => r.scenario_key === key);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-end gap-2">
        {can(PRICING.SIMULATE) && rows.length > 0 && <Button variant="ghost" onClick={() => runAll.run()} busy={runAll.busy}><Play size={14} aria-hidden="true" /> Run tests</Button>}
        {editable && <Button onClick={() => setEditing({})}><Plus size={14} aria-hidden="true" /> Add test</Button>}
      </div>
      {!rows.length ? <EmptyState>No regression tests. Add sample jobs with the price you expect.</EmptyState> : (
        <ul className="space-y-1.5">
          {rows.map((row) => {
            const result = resultFor(row.scenario_key);
            return (
              <li key={row.id} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{row.name || row.scenario_key}</span>
                  {row.is_required_for_publish && <Badge tone="amber">Required</Badge>}
                  {result && <Badge tone={result.passed ? 'green' : 'red'}>{result.passed ? 'Passed' : 'Failed'}</Badge>}
                  <span className="flex-1 text-slate-600">Expected total {formatMoney(row.expected_snapshot?.grand_total)}</span>
                  {result?.totals?.grand_total && <span>Got <span className="tabular-nums font-semibold">{formatMoney(result.totals.grand_total)}</span></span>}
                  {editable && (
                    <span className="inline-flex gap-1">
                      <Button variant="ghost" aria-label={`Edit test ${row.scenario_key}`} onClick={() => setEditing(row)}><Pencil size={13} aria-hidden="true" /></Button>
                      <Button variant="ghost" aria-label={`Remove test ${row.scenario_key}`} onClick={() => setDeleting(row)}><Trash2 size={13} aria-hidden="true" /></Button>
                    </span>
                  )}
                </div>
                {result?.failures?.length > 0 && <ul className="mt-1 list-inside list-disc text-rose-700">{result.failures.map((f) => <li key={f}>{f}</li>)}</ul>}
              </li>
            );
          })}
        </ul>
      )}
      {editing && <ScenarioDialog row={editing} revision={revision} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
      {deleting && (
        <ConfirmDialog title={`Remove test ${deleting.scenario_key}?`} confirmLabel="Remove" busy={remove.busy} error={remove.error?.message}
          onCancel={() => setDeleting(null)} onConfirm={() => remove.run(deleting)}><p>Removed from this draft only.</p></ConfirmDialog>
      )}
    </div>
  );
}

function ScenarioDialog({ row, revision, onClose, onSaved }) {
  const snapshot = row.input_snapshot || {};
  const job = snapshot.jobs?.[0] || {};
  const expected = row.expected_snapshot || {};
  const [form, setForm] = useState({
    scenario_key: row.scenario_key || '', name: row.name || '', service_date: job.service_date || '',
    inputs: job.inputs ? jobInputsToForm(job.inputs) : EMPTY_JOB_INPUTS, grand_total: expected.grand_total || '',
    grand_total_min: expected.grand_total_min || '', grand_total_max: expected.grand_total_max || '',
    rule_keys: (expected.rule_keys || []).join(', '), required: row.is_required_for_publish ?? true,
  });
  const set = (patch) => setForm({ ...form, ...patch });
  const save = useAction(() => {
    const expectedOut = {};
    for (const key of ['grand_total', 'grand_total_min', 'grand_total_max']) if (form[key]) expectedOut[key] = form[key];
    const keys = form.rule_keys.split(',').map((k) => k.trim()).filter(Boolean);
    if (keys.length) expectedOut.rule_keys = keys;
    const body = {
      scenario_key: form.scenario_key, name: form.name, is_required_for_publish: form.required, is_active: true,
      input_snapshot: { jobs: [{ job_id: 1, service_date: form.service_date, inputs: cleanJobInputs(form.inputs) }] },
      expected_snapshot: expectedOut, lock_version: revision.lock_version,
    };
    return row.id ? pricingApi.updateItem(revision.id, 'scenarios', row.id, body) : pricingApi.createItem(revision.id, 'scenarios', body);
  }, { success: 'Test saved.', onSuccess: onSaved, silent: true });
  return (
    <Dialog title={row.id ? 'Edit test' : 'Add regression test'} onClose={onClose} size="lg" busy={save.busy} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy} disabled={!form.service_date}>Save</Button></>
    )}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Key" value={form.scenario_key} onChange={(v) => set({ scenario_key: v.toLowerCase() })} disabled={Boolean(row.id)} required />
          <TextField label="Name" value={form.name} onChange={(v) => set({ name: v })} />
          <TextField label="Service date" type="date" value={form.service_date} onChange={(v) => set({ service_date: v })} required />
        </div>
        <JobInputsForm value={form.inputs} onChange={(inputs) => set({ inputs })} />
        <div className="grid gap-3 sm:grid-cols-3">
          <DecimalField label="Expected grand total" value={form.grand_total} onChange={(v) => set({ grand_total: v })} />
          <DecimalField label="or at least" value={form.grand_total_min} onChange={(v) => set({ grand_total_min: v })} />
          <DecimalField label="and at most" value={form.grand_total_max} onChange={(v) => set({ grand_total_max: v })} />
          <TextField label="Rules that must apply" value={form.rule_keys} onChange={(v) => set({ rule_keys: v })} placeholder="labor, travel" />
        </div>
        <CheckboxField label="Required to publish" checked={form.required} onChange={(v) => set({ required: v })} />
      </div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}
