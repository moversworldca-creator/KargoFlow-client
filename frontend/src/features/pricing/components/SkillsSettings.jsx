// Pricing skills (mover, driver, packer, piano specialist ...) and which
// employees hold them. A pricing skill is a commercial capability that a rate
// can depend on; it is NOT a role and grants no permission (RBAC is separate).
import React, { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { getEmployees } from '../../../services/api';
import AsyncSelect from '../../../shared/ui/AsyncSelect';
import { pricingApi } from '../api';
import { PRICING } from '../permissions';
import { pricingKeys, useEmployeeSkills, useInvalidatePricing, useSkills } from '../queries';
import {
  Badge, Button, Callout, CheckboxField, DecimalField, Dialog, ErrorBanner, Field, Money, QueryState, Section,
  SelectField, TextField, useAction,
} from './ui';

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export default function SkillsSettings() {
  const { can } = useCan();
  const skills = useSkills();
  const [editing, setEditing] = useState(null);
  const invalidate = useInvalidatePricing();
  const rows = skills.data || [];
  return (
    <div className="space-y-3">
      <Section
        title="Pricing skills"
        description="Commercial capabilities a rate can depend on (for example a piano specialist). Separate from roles and permissions."
        actions={can(PRICING.UPDATE_DRAFT) && <Button onClick={() => setEditing({})}><Plus size={14} aria-hidden="true" /> Add skill</Button>}
      >
        <Callout>A pricing skill never grants access to anything. What an employee may do in Kargo is set in Roles &amp; Permissions.</Callout>
        <div className="mt-3">
          <QueryState query={skills} empty={!rows.length} emptyText="No pricing skills yet.">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Pricing skills</caption>
              <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                <tr><th scope="col" className="py-2 pr-3">Skill</th><th scope="col" className="py-2 pr-3">Default selling rate</th>
                  {can(PRICING.VIEW_COST) && <th scope="col" className="py-2 pr-3">Default cost rate</th>}
                  <th scope="col" className="py-2 pr-3">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {rows.map((skill) => (
                  <tr key={skill.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3"><span className="font-semibold">{skill.name}</span> <span className="text-slate-500">({skill.code})</span></td>
                    <td className="py-2 pr-3"><Money value={skill.default_selling_rate} /></td>
                    {can(PRICING.VIEW_COST) && <td className="py-2 pr-3"><Money value={skill.default_cost_rate} /></td>}
                    <td className="py-2 pr-3">{skill.is_active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</td>
                    <td className="py-2 text-right">{can(PRICING.UPDATE_DRAFT) && <Button variant="ghost" aria-label={`Edit ${skill.name}`} onClick={() => setEditing(skill)}><Pencil size={13} aria-hidden="true" /></Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </QueryState>
        </div>
      </Section>
      <EmployeeSkills skills={rows} />
      {editing && <SkillDialog skill={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); invalidate(pricingKeys.skills()); }} />}
    </div>
  );
}

function SkillDialog({ skill, onClose, onSaved }) {
  const { can } = useCan();
  const [form, setForm] = useState({
    code: skill.code || '', name: skill.name || '', description: skill.description || '',
    default_selling_rate: skill.default_selling_rate ?? '', default_cost_rate: skill.default_cost_rate ?? '', is_active: skill.is_active ?? true,
  });
  const save = useAction(() => {
    const body = { ...form, default_selling_rate: form.default_selling_rate || null, default_cost_rate: form.default_cost_rate || null };
    if (!can(PRICING.VIEW_COST)) delete body.default_cost_rate;
    return skill.id ? pricingApi.updateSkill(skill.id, body) : pricingApi.createSkill(body);
  }, { success: 'Pricing skill saved.', onSuccess: onSaved, silent: true });
  return (
    <Dialog title={skill.id ? 'Edit pricing skill' : 'Add pricing skill'} onClose={onClose} busy={save.busy} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy}>Save</Button></>
    )}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Code" value={form.code} onChange={(v) => setForm({ ...form, code: v.toLowerCase() })} disabled={Boolean(skill.id)} required />
        <TextField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <DecimalField label="Default selling rate (per hour)" value={form.default_selling_rate} onChange={(v) => setForm({ ...form, default_selling_rate: v })} />
        {can(PRICING.VIEW_COST) && <DecimalField label="Default cost rate (per hour)" value={form.default_cost_rate} onChange={(v) => setForm({ ...form, default_cost_rate: v })} hint="Internal. Never shown to customers." />}
        <TextField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <CheckboxField label="Active" checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
      </div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}

const searchEmployees = async (search, offset, limit) => {
  const response = await getEmployees({ search, offset, limit });
  return { results: asList(response).map((e) => ({ id: e.id, label: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.email || `Employee #${e.id}` })), count: response?.count };
};

function EmployeeSkills({ skills }) {
  const { can } = useCan();
  const [employeeId, setEmployeeId] = useState(null);
  const assigned = useEmployeeSkills(employeeId);
  const invalidate = useInvalidatePricing();
  const [form, setForm] = useState({ skill_id: '', selling_rate_override: '', cost_rate_override: '' });
  const assign = useAction(() => pricingApi.assignEmployeeSkills(employeeId, {
    skill_id: Number(form.skill_id), selling_rate_override: form.selling_rate_override || null,
    ...(can(PRICING.VIEW_COST) ? { cost_rate_override: form.cost_rate_override || null } : {}), is_active: true,
  }), { success: 'Skill assigned.', invalidate: () => invalidate(pricingKeys.employeeSkills(employeeId)), onSuccess: () => setForm({ skill_id: '', selling_rate_override: '', cost_rate_override: '' }) });
  const unassign = useAction((skillId) => pricingApi.assignEmployeeSkills(employeeId, { skill_id: skillId, is_active: false }), {
    success: 'Skill removed from employee.', invalidate: () => invalidate(pricingKeys.employeeSkills(employeeId)),
  });
  return (
    <Section title="Employee skills" description="Which pricing skills each employee holds, with optional personal rates.">
      <div className="max-w-sm">
        <Field label="Employee">
          <AsyncSelect aria-label="Employee" value={employeeId} onChange={(v) => setEmployeeId(v || null)} fetchOptions={searchEmployees} placeholder="Choose an employee" />
        </Field>
      </div>
      {employeeId && (
        <div className="mt-3 space-y-3">
          <QueryState query={assigned} empty={!(assigned.data || []).length} emptyText="No pricing skills assigned.">
            <ul className="flex flex-wrap gap-2">
              {(assigned.data || []).filter((s) => s.is_active !== false).map((s) => (
                <li key={s.skill_id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs">
                  {s.skill_name || s.name || s.code}{s.selling_rate_override && <span className="text-slate-500">· {s.selling_rate_override}/h</span>}
                  {can(PRICING.UPDATE_DRAFT) && <button type="button" className="font-semibold text-rose-700" aria-label={`Remove ${s.skill_name || s.code}`} onClick={() => unassign.run(s.skill_id)}>×</button>}
                </li>
              ))}
            </ul>
          </QueryState>
          {can(PRICING.UPDATE_DRAFT) && (
            <div className="grid items-end gap-2 sm:grid-cols-4">
              <SelectField label="Skill" value={form.skill_id} onChange={(v) => setForm({ ...form, skill_id: v })} options={[['', 'Choose…'], ...skills.filter((s) => s.is_active).map((s) => [String(s.id), s.name])]} />
              <DecimalField label="Personal selling rate" value={form.selling_rate_override} onChange={(v) => setForm({ ...form, selling_rate_override: v })} />
              {can(PRICING.VIEW_COST) && <DecimalField label="Personal cost rate" value={form.cost_rate_override} onChange={(v) => setForm({ ...form, cost_rate_override: v })} />}
              <Button onClick={() => assign.run()} busy={assign.busy} disabled={!form.skill_id}>Assign</Button>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

