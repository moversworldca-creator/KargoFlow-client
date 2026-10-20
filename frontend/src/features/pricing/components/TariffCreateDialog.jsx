// Create a Tariff: Simple (guided numbers) or Advanced (an empty draft revision
// to configure with the full editors). Both end in an ordinary draft revision
// that is validated, approved and published like any other.
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBranches } from '../../../services/api';
import { pricingApi } from '../api';
import { PRICING_METHODS } from '../constants';
import { pricingKeys, useInvalidatePricing } from '../queries';
import SimpleTariffForm, { EMPTY_SIMPLE, toSimpleConfig } from './SimpleTariffForm';
import { Button, Callout, Dialog, ErrorBanner, SelectField, TextField, useAction } from './ui';

const keyFrom = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
const branchList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export default function TariffCreateDialog({ onClose, onCreated }) {
  const invalidate = useInvalidatePricing();
  const [mode, setMode] = useState('simple');
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [method, setMethod] = useState('hourly');
  const [priority, setPriority] = useState('100');
  const [branchId, setBranchId] = useState('');
  const [simple, setSimple] = useState(EMPTY_SIMPLE);
  const [errors, setErrors] = useState({});
  const branches = useQuery({ queryKey: ['pricing', 'branch-options'], queryFn: getBranches, staleTime: 60_000, retry: false });

  const catalogKey = keyTouched ? key : keyFrom(name);
  const action = useAction((body) => pricingApi.createTariff(body), {
    success: 'Tariff created with a draft revision.',
    invalidate: () => invalidate(pricingKeys.all),
    onSuccess: (created) => onCreated?.(created),
    silent: true,
  });

  const branchOptions = useMemo(() => [['', 'All branches (company-wide)'],
    ...branchList(branches.data).map((b) => [String(b.id), b.name])], [branches.data]);

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!name.trim()) found.name = 'Name the Tariff.';
    if (!/^[a-z0-9][a-z0-9_]*$/.test(catalogKey)) found.key = 'Use lowercase letters, numbers and _.';
    if (!/^\d+$/.test(priority)) found.priority = 'Priority is a whole number (lower wins).';
    let simpleConfig;
    if (mode === 'simple') {
      const compiled = toSimpleConfig(simple);
      Object.assign(found, compiled.errors);
      simpleConfig = compiled.config;
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    action.run({
      catalog_key: catalogKey, name: name.trim(),
      primary_pricing_method: mode === 'simple' ? (simple.mode === 'flat' ? 'flat' : 'hourly') : method,
      resolver_priority: Number(priority), branch_id: branchId ? Number(branchId) : null,
      ...(mode === 'simple' ? { simple: simpleConfig } : { create_draft: true }),
    });
  };

  return (
    <Dialog title="New Tariff" description="A Tariff starts as a draft revision. Nothing is used for pricing until it is validated, approved and published." onClose={onClose} size="lg" busy={action.busy}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <fieldset className="flex flex-wrap gap-4 text-xs">
          <legend className="sr-only">Setup mode</legend>
          {[['simple', 'Simple setup', 'A few numbers: crew rates, travel, materials.'], ['advanced', 'Advanced', 'Rules, rate matrices, formulas and conditions.']].map(([value, label, hint]) => (
            <label key={value} className={`flex flex-1 cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${mode === value ? 'border-primary bg-primary/5' : 'border-slate-200'}`}>
              <input type="radio" name="tariff-mode" checked={mode === value} onChange={() => setMode(value)} className="mt-0.5" />
              <span><span className="block font-semibold">{label}</span><span className="text-slate-500">{hint}</span></span>
            </label>
          ))}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Name" value={name} onChange={setName} error={errors.name} required />
          <TextField label="Key" value={catalogKey} onChange={(v) => { setKeyTouched(true); setKey(v); }} error={errors.key} hint="Stable identifier used in reports and imports." required />
          {mode === 'advanced' && <SelectField label="Primary pricing method" value={method} onChange={setMethod} options={PRICING_METHODS} />}
          <TextField label="Resolver priority" value={priority} onChange={(v) => setPriority(v.replace(/\D/g, ''))} inputMode="numeric" error={errors.priority} hint="When several Tariffs apply at the same level, the lowest number wins." />
          <SelectField label="Applies to" value={branchId} onChange={setBranchId} options={branchOptions} />
        </div>
        {mode === 'simple'
          ? <SimpleTariffForm value={simple} onChange={setSimple} errors={errors} />
          : <Callout>An empty draft revision is created. Add rules, rate tables, applicability and tests in the revision editor.</Callout>}
        <ErrorBanner message={action.error?.message && `${action.error.message}${action.error.detail ? ` (${action.error.detail})` : ''}`} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={action.busy}>Cancel</Button>
          <Button type="submit" busy={action.busy}>Create draft</Button>
        </div>
      </form>
    </Dialog>
  );
}
