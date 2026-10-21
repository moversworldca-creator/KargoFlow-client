// What-if pricing with the real engine. Hypothetical jobs (branch + service
// date + inputs) are priced and not saved; with a draft revision selected the
// draft is priced as if it were published, so a change can be checked before
// it goes live. Nothing commercial changes.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBranches, getServiceTypes } from '../../../services/api';
import { pricingApi } from '../api';
import { useSkills } from '../queries';
import JobInputsForm, { EMPTY_JOB_INPUTS, cleanJobInputs } from './JobInputsForm';
import RunViewer from './RunViewer';
import { Button, Callout, ErrorBanner, Section, SelectField, TextField, useAction } from './ui';

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);
const today = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export default function SimulationPanel({ revision, tariff }) {
  const branches = useQuery({ queryKey: ['pricing', 'branch-options'], queryFn: getBranches, staleTime: 60_000, retry: false });
  const services = useQuery({ queryKey: ['pricing', 'service-type-options'], queryFn: () => getServiceTypes({ limit: 200 }), staleTime: 60_000, retry: false });
  const skills = useSkills();
  const [branchId, setBranchId] = useState(tariff?.branch_id ? String(tariff.branch_id) : '');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [serviceDate, setServiceDate] = useState(revision?.effective_start_date && revision.effective_start_date > today() ? revision.effective_start_date : today());
  const [inputs, setInputs] = useState(EMPTY_JOB_INPUTS);
  const [result, setResult] = useState(null);
  const branchOptions = asList(branches.data);
  const effectiveBranch = branchId || String(branchOptions[0]?.id || '');

  const simulate = useAction(() => pricingApi.simulate({
    branch_id: Number(effectiveBranch),
    revision_id: revision && revision.state !== 'published' ? revision.id : undefined,
    jobs: [{ service_date: serviceDate, service_type_id: serviceTypeId ? Number(serviceTypeId) : null, inputs: cleanJobInputs(inputs) }],
  }), { onSuccess: setResult, silent: true });

  return (
    <Section title={revision ? `Simulate revision ${revision.revision_number}` : 'Price simulator'}
      description={revision && revision.state !== 'published'
        ? 'This draft is priced as if it were published. Nothing is saved and live pricing is unchanged.'
        : 'Prices a hypothetical job with the published Tariffs. Nothing is saved.'}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField label="Branch" value={effectiveBranch} onChange={setBranchId} options={branchOptions.map((b) => [String(b.id), b.name])} />
          <SelectField label="Service type" value={serviceTypeId} onChange={setServiceTypeId} options={[['', 'Not specified'], ...asList(services.data).map((s) => [String(s.id), s.name])]} />
          <TextField label="Service date" type="date" value={serviceDate} onChange={setServiceDate} hint="Business date in the branch's timezone." />
        </div>
        <JobInputsForm value={inputs} onChange={setInputs} skills={skills.data || []} />
        <div className="flex justify-end"><Button onClick={() => simulate.run()} busy={simulate.busy} disabled={!effectiveBranch}>Calculate</Button></div>
        <ErrorBanner message={simulate.error && `${simulate.error.message}${simulate.error.detail ? ` (${simulate.error.detail})` : ''}`} />
        {result && (
          <div className="rounded-xl border border-slate-200 p-3">
            {result.decision?.persisted === false && <Callout>Simulation only. This price was not saved and is not on any Estimate.</Callout>}
            <RunViewer run={result.run} explanation={result.explanation} />
          </div>
        )}
      </div>
    </Section>
  );
}
