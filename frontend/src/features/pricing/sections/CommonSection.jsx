// Common (CM-01..06): the tariff's name and the defaults it hands to new
// opportunities. Saved on the tariff record itself.
import React from 'react';
import { TextField } from '../components/ui';
import { BINDING_TYPES } from '../constants';
import { useBranchOptions, useOpportunityTypes } from '../queries';
import { DecimalField, SectionHeader, SectionProblems, SelectInput, Toggle } from './fields';

function Eligibility({ title, all, onAll, ids, onIds, options, readOnly, noun }) {
  return (
    <fieldset disabled={readOnly} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <legend className="px-1 text-xs font-bold">{title}</legend>
      <Toggle label={`All ${noun}`} checked={all} onChange={onAll} />
      {!all && (
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {options.length === 0 && <p className="text-xs text-slate-500">Loading…</p>}
          {options.map((o) => (
            <Toggle key={o.id} label={o.name} checked={ids.includes(o.id)}
              onChange={(on) => onIds(on ? [...ids, o.id] : ids.filter((id) => id !== o.id))} />
          ))}
        </div>
      )}
    </fieldset>
  );
}

export default function CommonSection({ common, onCommonChange, isReadOnly, isManaged, problems }) {
  const branches = useBranchOptions();
  const types = useOpportunityTypes();
  const set = (patch) => onCommonChange({ ...common, ...patch });
  const locked = isReadOnly || isManaged;
  return (
    <div className="space-y-4">
      <SectionHeader title="Common" description="The basic pricing context of this tariff and the defaults it gives new opportunities." />
      <SectionProblems problems={problems} section="common" />
      <fieldset disabled={locked} className="grid gap-3 sm:grid-cols-2">
        <TextField label="Tariff Name" value={common.name} onChange={(name) => set({ name })} required />
        <DecimalField label="Volume to Weight Ratio (lbs per cu ft)" places={2} value={common.volume_to_weight_ratio}
          onChange={(volume_to_weight_ratio) => set({ volume_to_weight_ratio })}
          hint="Estimated weight = shipment cubic feet × this ratio. The suggested density factor is 7." />
      </fieldset>
      <div className="grid gap-3 lg:grid-cols-2">
        <Eligibility title="Applies to Branches" noun="branches" readOnly={isReadOnly} all={common.applies_to_all_branches}
          onAll={(v) => set({ applies_to_all_branches: v })} ids={common.branch_ids || []} onIds={(branch_ids) => set({ branch_ids })}
          options={(branches.data || []).map((b) => ({ id: b.id, name: b.name }))} />
        <Eligibility title="Applies to Opportunity Types" noun="opportunity types" readOnly={isReadOnly} all={common.applies_to_all_opportunity_types}
          onAll={(v) => set({ applies_to_all_opportunity_types: v })} ids={common.opportunity_type_ids || []}
          onIds={(opportunity_type_ids) => set({ opportunity_type_ids })}
          options={(types.data || []).map((t) => ({ id: t.id, name: t.name }))} />
      </div>
      <fieldset disabled={isReadOnly} className="grid gap-3 sm:grid-cols-2">
        <DecimalField label="Minimum Booking Amount" places={2} value={common.minimum_booking_amount}
          onChange={(minimum_booking_amount) => set({ minimum_booking_amount })}
          hint="A Sales Manager may override it on the opportunity where applicable." />
        {isManaged && (
          <DecimalField label="Minimum Weight (lbs)" places={2} value={common.minimum_weight_lbs}
            onChange={(minimum_weight_lbs) => set({ minimum_weight_lbs })} />
        )}
      </fieldset>
      <fieldset disabled={locked} className="max-w-md">
        <SelectInput label="Default Binding Type" value={common.default_binding_type} options={BINDING_TYPES}
          onChange={(default_binding_type) => set({ default_binding_type })} />
        <p className="mt-1 text-[11px] text-slate-500">Applies when an opportunity is created. Changing it later never resets existing opportunities.</p>
      </fieldset>
    </div>
  );
}
