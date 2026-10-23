// Pricing policy (revision workflow, effective date basis, discount approval
// threshold, margin policy, external-input failure handling) and pricing tax
// components / customer exemptions.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { getBranchTaxProfiles } from '../../../services/api';
import AsyncSelect from '../../../shared/ui/AsyncSelect';
import { pricingApi } from '../api';
import { EFFECTIVE_DATE_BASES, EXTERNAL_FAILURE_POLICIES, MARGIN_ACTIONS, REVISION_WORKFLOWS } from '../constants';
import { formatDateOnly, humanize } from '../format';
import { PRICING } from '../permissions';
import { pricingKeys, useExemptions, useInvalidatePricing, usePolicy, useTaxComponents } from '../queries';
import { searchCustomers } from './ApplicabilityEditor';
import {
  Badge, Button, Callout, CheckboxField, DecimalField, ErrorBanner, Field, QueryState, Section, SelectField,
  TextField, useAction,
} from './ui';

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);
const POLICY_FIELDS = ['revision_workflow', 'require_independent_approval', 'effective_date_basis',
  'discount_approval_threshold_pct', 'margin_target_pct', 'margin_minimum_pct', 'margin_hard_floor_pct',
  'margin_minimum_action', 'margin_hard_floor_action', 'allow_hard_floor_exception', 'external_failure_policy'];

export function PolicySettings() {
  const { can } = useCan();
  const policy = usePolicy();
  const invalidate = useInvalidatePricing();
  const [edits, setEdits] = useState({});
  const form = policy.data
    ? { ...Object.fromEntries(POLICY_FIELDS.map((k) => [k, policy.data[k] ?? ''])), ...edits }
    : null;
  const save = useAction(() => pricingApi.savePolicy(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]))), {
    success: 'Pricing policy saved.', invalidate: () => invalidate(pricingKeys.policy()),
  });
  const editable = can(PRICING.PUBLISH);
  const set = (patch) => setEdits({ ...edits, ...patch });
  return (
    <Section title="Pricing policy" description="Company-wide rules for how Tariffs are released and how prices are checked."
      actions={editable && form && <Button onClick={() => save.run()} busy={save.busy}>Save policy</Button>}>
      <QueryState query={policy}>
        {form && (
          <fieldset disabled={!editable} className="space-y-4">
            {policy.data?.default && <Callout>Using the default policy. Saving creates your company&apos;s policy.</Callout>}
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField label="Revision workflow" value={form.revision_workflow} onChange={(v) => set({ revision_workflow: v })}
                options={REVISION_WORKFLOWS.map((w) => [w, w === 'full' ? 'Full (validate, submit, approve, publish)' : 'Simplified (publish after validation)'])} />
              <SelectField label="Effective date basis" value={form.effective_date_basis} onChange={(v) => set({ effective_date_basis: v })} options={EFFECTIVE_DATE_BASES} hint="Which date picks the Tariff revision for a job." />
              <SelectField label="External input failure" value={form.external_failure_policy} onChange={(v) => set({ external_failure_policy: v })} options={EXTERNAL_FAILURE_POLICIES} />
              <DecimalField label="Discount needs approval above (%)" value={form.discount_approval_threshold_pct ?? ''} onChange={(v) => set({ discount_approval_threshold_pct: v })} />
              <CheckboxField label="Independent approval" hint="The submitter cannot approve their own revision." checked={form.require_independent_approval} onChange={(v) => set({ require_independent_approval: v })} />
            </div>
            {can(PRICING.VIEW_COST) && (
              <div className="grid gap-3 sm:grid-cols-3">
                <DecimalField label="Target margin (%)" value={form.margin_target_pct ?? ''} onChange={(v) => set({ margin_target_pct: v })} />
                <DecimalField label="Minimum margin (%)" value={form.margin_minimum_pct ?? ''} onChange={(v) => set({ margin_minimum_pct: v })} />
                <DecimalField label="Hard floor (%)" value={form.margin_hard_floor_pct ?? ''} onChange={(v) => set({ margin_hard_floor_pct: v })} />
                <SelectField label="Below minimum" value={form.margin_minimum_action} onChange={(v) => set({ margin_minimum_action: v })} options={MARGIN_ACTIONS} />
                <SelectField label="Below hard floor" value={form.margin_hard_floor_action} onChange={(v) => set({ margin_hard_floor_action: v })} options={MARGIN_ACTIONS} />
                <CheckboxField label="Allow hard-floor exceptions" checked={form.allow_hard_floor_exception} onChange={(v) => set({ allow_hard_floor_exception: v })} />
              </div>
            )}
            <ErrorBanner message={save.error?.message} />
          </fieldset>
        )}
      </QueryState>
    </Section>
  );
}

export function TaxSettings({ branchId }) {
  const { can } = useCan();
  const profiles = useQuery({ queryKey: ['pricing', 'tax-profiles', branchId], queryFn: () => getBranchTaxProfiles({ branch_id: branchId }), enabled: Boolean(branchId), retry: false });
  const list = asList(profiles.data);
  const [profileId, setProfileId] = useState('');
  const effective = profileId || String(list[0]?.id || '');
  const components = useTaxComponents(Number(effective) || null);
  const invalidate = useInvalidatePricing();
  const [draft, setDraft] = useState({ component_key: '', name: '', rate: '', jurisdiction_code: '', jurisdiction_level: 'state' });
  const add = useAction(() => pricingApi.createTaxComponent(effective, { ...draft, is_active: true }), {
    success: 'Tax component added.', invalidate: () => invalidate(pricingKeys.taxComponents(Number(effective))),
    onSuccess: () => setDraft({ component_key: '', name: '', rate: '', jurisdiction_code: '', jurisdiction_level: 'state' }),
  });
  const toggle = useAction((c) => pricingApi.updateTaxComponent(effective, c.id, { is_active: !c.is_active }), {
    success: 'Tax component updated.', invalidate: () => invalidate(pricingKeys.taxComponents(Number(effective))),
  });
  const rows = asList(components.data?.components ?? components.data);
  return (
    <div className="space-y-3">
      <Section title="Tax components" description="Taxes the engine applies, per branch tax profile (e.g. federal + provincial). Uses the branch selected in the header.">
        {!list.length && !profiles.isLoading ? <Callout>This branch has no tax profile. Set one up under Branch Settings › Taxes.</Callout> : (
          <div className="space-y-3">
            <div className="max-w-xs">
              <SelectField label="Tax profile" value={effective} onChange={setProfileId} options={list.map((p) => [String(p.id), `${p.tax_rate ?? ''}% from ${formatDateOnly(p.effective_from)}`])} />
            </div>
            <QueryState query={components} empty={!rows.length} emptyText="No components: the profile's single rate is used.">
              <ul className="space-y-1">
                {rows.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs">
                    <span className="font-semibold">{c.name}</span><span>{c.rate}%</span>
                    <span className="text-slate-500">{c.jurisdiction_code} ({humanize(c.jurisdiction_level)})</span>
                    {c.is_active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}
                    {can(PRICING.UPDATE_DRAFT) && <Button variant="ghost" className="ml-auto" onClick={() => toggle.run(c)}>{c.is_active ? 'Deactivate' : 'Activate'}</Button>}
                  </li>
                ))}
              </ul>
            </QueryState>
            {can(PRICING.UPDATE_DRAFT) && effective && (
              <div className="grid items-end gap-2 sm:grid-cols-5">
                <TextField label="Key" value={draft.component_key} onChange={(v) => setDraft({ ...draft, component_key: v.toLowerCase() })} />
                <TextField label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
                <DecimalField label="Rate (%)" value={draft.rate} onChange={(v) => setDraft({ ...draft, rate: v })} />
                <TextField label="Jurisdiction" value={draft.jurisdiction_code} onChange={(v) => setDraft({ ...draft, jurisdiction_code: v.toUpperCase() })} placeholder="ON" />
                <Button onClick={() => add.run()} busy={add.busy} disabled={!draft.component_key || !draft.rate}><Plus size={13} aria-hidden="true" /> Add</Button>
              </div>
            )}
          </div>
        )}
      </Section>
      <ExemptionsPanel />
    </div>
  );
}

function ExemptionsPanel() {
  const { can } = useCan();
  const exemptions = useExemptions({});
  const invalidate = useInvalidatePricing();
  const [form, setForm] = useState({ customer_id: null, jurisdiction_code: '', exemption_type: 'full', certificate_reference: '', effective_from: '', effective_until: '', reason: '' });
  const create = useAction(() => pricingApi.createExemption({ ...form, effective_from: form.effective_from || null, effective_until: form.effective_until || null }), {
    success: 'Exemption recorded. It applies once approved.', invalidate: () => invalidate(['pricing', 'exemptions']),
  });
  const decide = useAction(({ id, decision }) => pricingApi.decideExemption(id, decision), {
    success: (_, { decision }) => `Exemption ${decision}.`, invalidate: () => invalidate(['pricing', 'exemptions']),
  });
  const rows = exemptions.data || [];
  return (
    <Section title="Customer tax exemptions" description="Recorded with a certificate reference and approved by someone other than the person who recorded it.">
      <QueryState query={exemptions} empty={!rows.length} emptyText="No exemptions.">
        <ul className="space-y-1">
          {rows.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs">
              <span className="font-semibold">Customer #{e.customer_id}</span><span>{e.jurisdiction_code || 'All jurisdictions'}</span>
              <span className="text-slate-500">{e.certificate_reference}</span><Badge tone={e.state === 'approved' ? 'green' : e.state === 'pending' ? 'amber' : 'slate'}>{humanize(e.state)}</Badge>
              {can(PRICING.APPROVE_ADJUSTMENT) && e.state === 'pending' && (
                <span className="ml-auto inline-flex gap-1">
                  <Button variant="ghost" onClick={() => decide.run({ id: e.id, decision: 'approved' })}>Approve</Button>
                  <Button variant="danger" onClick={() => decide.run({ id: e.id, decision: 'rejected' })}>Reject</Button>
                </span>
              )}
              {can(PRICING.APPROVE_ADJUSTMENT) && e.state === 'approved' && <Button variant="ghost" className="ml-auto" onClick={() => decide.run({ id: e.id, decision: 'revoked' })}>Revoke</Button>}
            </li>
          ))}
        </ul>
      </QueryState>
      {can(PRICING.UPDATE_DRAFT) && (
        <div className="mt-3 grid items-end gap-2 sm:grid-cols-4">
          <Field label="Customer"><AsyncSelect aria-label="Exempt customer" value={form.customer_id} onChange={(v) => setForm({ ...form, customer_id: v || null })} fetchOptions={searchCustomers} placeholder="Choose a customer" /></Field>
          <TextField label="Jurisdiction (empty = all)" value={form.jurisdiction_code} onChange={(v) => setForm({ ...form, jurisdiction_code: v.toUpperCase() })} />
          <TextField label="Certificate reference" value={form.certificate_reference} onChange={(v) => setForm({ ...form, certificate_reference: v })} />
          <TextField label="Reason" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} />
          <TextField label="Valid from" type="date" value={form.effective_from} onChange={(v) => setForm({ ...form, effective_from: v })} />
          <TextField label="Valid until" type="date" value={form.effective_until} onChange={(v) => setForm({ ...form, effective_until: v })} />
          <Button onClick={() => create.run()} busy={create.busy} disabled={!form.customer_id || !form.certificate_reference}>Record exemption</Button>
        </div>
      )}
    </Section>
  );
}
