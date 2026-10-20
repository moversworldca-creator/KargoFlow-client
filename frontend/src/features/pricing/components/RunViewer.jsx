// A Calculation Run as the backend stored it: charges with their source
// (Tariff, revision, rule, rate cell), adjustments, the constraint effect,
// taxes, deposit and totals, plus "Why this price?" and "Why this Tariff?"
// from the stored explanation. Every number is the backend's; nothing is
// added up here. Cost and margin appear only when the backend included them
// (pricing.view_cost).
import React, { useState } from 'react';
import { useExplain } from '../queries';
import { decimalSign, formatDateOnly, formatDateTime, formatMoney, humanize } from '../format';
import { Badge, Button, Callout, LoadingState, Money, Tabs } from './ui';

export function TotalsTable({ totals = {}, currency, constraint }) {
  const rows = [
    ['Subtotal', totals.subtotal],
    decimalSign(totals.adjustment_total) !== 0 && ['Discounts & adjustments', totals.adjustment_total],
    decimalSign(totals.constraint_adjustment) !== 0 && [`${humanize(constraint?.type || 'constraint')} adjustment`, totals.constraint_adjustment],
    ['Tax', totals.tax_total],
  ].filter(Boolean);
  return (
    <dl className="ml-auto w-full max-w-xs space-y-1 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4"><dt className="text-slate-600">{label}</dt><dd><Money value={value} currency={currency} /></dd></div>
      ))}
      <div className="flex justify-between gap-4 border-t border-slate-200 pt-1 text-sm">
        <dt className="font-bold">Total</dt><dd><Money value={totals.grand_total} currency={currency} strong /></dd>
      </div>
      {decimalSign(totals.deposit_amount) !== 0 && (
        <div className="flex justify-between gap-4"><dt className="text-slate-600">Deposit</dt><dd><Money value={totals.deposit_amount} currency={currency} /></dd></div>
      )}
    </dl>
  );
}

// Customer-recognizable groups, in the order an estimate reads.
const CATEGORY_GROUP = {
  labor: 'Moving', transportation: 'Moving', storage: 'Moving', travel: 'Travel', fuel: 'Travel',
  packing: 'Packing', material: 'Materials', accessorial: 'Accessorials', valuation: 'Valuation',
  surcharge: 'Surcharges', minimum: 'Minimum charge', custom: 'Other',
};
const GROUP_ORDER = ['Moving', 'Travel', 'Packing', 'Materials', 'Accessorials', 'Valuation', 'Surcharges', 'Minimum charge', 'Other'];
const groupOf = (charge) => CATEGORY_GROUP[charge.category] || 'Other';

/** Charges -> [{key, title, rows}]: by job (plus shared Estimate charges) when there are several jobs, then by category. */
export function groupCharges(charges = [], jobsById = {}) {
  const jobIds = [...new Set(charges.filter((c) => c.scope !== 'estimate').map((c) => c.job_id))];
  const sections = jobIds.length > 1
    ? [...jobIds.map((id) => ({ key: `job-${id}`, title: jobsById[id] || `Job ${id}`, rows: charges.filter((c) => c.scope !== 'estimate' && c.job_id === id) })),
      { key: 'shared', title: 'Shared (whole Estimate)', rows: charges.filter((c) => c.scope === 'estimate') }]
    : [{ key: 'all', title: '', rows: charges }];
  return sections.filter((s) => s.rows.length).map((section) => ({
    ...section,
    groups: GROUP_ORDER.map((title) => ({ title, rows: section.rows.filter((c) => groupOf(c) === title) })).filter((g) => g.rows.length),
  }));
}

export function ChargesTable({ charges = [], currency, jobsById = {}, showCost = false, onExplainLine }) {
  if (!charges.length) return <p className="text-xs text-slate-500">No charges.</p>;
  const columns = showCost ? 7 : 6;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-xs">
        <caption className="sr-only">Charges</caption>
        <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="py-1.5 pr-2">Charge</th>
            <th scope="col" className="py-1.5 pr-2">Job</th>
            <th scope="col" className="py-1.5 pr-2 text-right">Qty</th>
            <th scope="col" className="py-1.5 pr-2 text-right">Rate</th>
            <th scope="col" className="py-1.5 pr-2 text-right">Amount</th>
            {showCost && <th scope="col" className="py-1.5 pr-2 text-right">Cost</th>}
            <th scope="col" className="py-1.5">Source</th>
          </tr>
        </thead>
        {groupCharges(charges, jobsById).map((section) => (
        <tbody key={section.key}>
          {section.title && <tr><th scope="rowgroup" colSpan={columns} className="bg-slate-100 px-2 py-1 text-left text-[11px] font-bold uppercase tracking-wide dark:bg-slate-800">{section.title}</th></tr>}
          {section.groups.map((group) => (
          <React.Fragment key={group.title}>
          <tr><th scope="rowgroup" colSpan={columns} className="pt-2 text-left text-[11px] font-semibold text-slate-500">{group.title}</th></tr>
          {group.rows.map((charge) => (
            <tr key={`${charge.charge_key}-${charge.job_id}`} className={`border-b border-slate-100 last:border-0 ${charge.excluded ? 'text-slate-400 line-through' : ''}`}>
              <td className="py-1.5 pr-2">
                <span className="font-semibold">{charge.name}</span>
                {charge.override_id && <Badge tone="amber">Override</Badge>}
                {!charge.customer_visible && <span className="ml-1 text-[11px] text-slate-500">(internal)</span>}
                {charge.description && <div className="text-[11px] text-slate-500">{charge.description}</div>}
              </td>
              <td className="py-1.5 pr-2">{charge.scope === 'estimate' ? 'Estimate' : jobsById[charge.job_id] || '—'}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{charge.quantity ?? '—'} {charge.unit || ''}</td>
              <td className="py-1.5 pr-2 text-right"><Money value={charge.unit_rate} currency={currency} /></td>
              <td className="py-1.5 pr-2 text-right"><Money value={charge.amount} currency={currency} />
                {charge.original_amount && charge.original_amount !== charge.amount && <div className="text-[11px] text-slate-500">was {formatMoney(charge.original_amount, currency)}</div>}
              </td>
              {showCost && <td className="py-1.5 pr-2 text-right"><Money value={charge.internal_cost} currency={currency} /></td>}
              <td className="py-1.5 text-[11px] text-slate-600">
                {charge.source?.catalog_key && <span>{charge.source.catalog_key} r{charge.source.revision_number}</span>}
                {charge.source?.rule_key && <span> · {charge.source.rule_key}</span>}
                {charge.source?.rate_cell_key && <span> · cell {charge.source.rate_cell_key}</span>}
                {onExplainLine && <button type="button" className="ml-1 font-semibold text-primary" onClick={() => onExplainLine(charge.charge_key)}>Why?</button>}
              </td>
            </tr>
          ))}
          </React.Fragment>
          ))}
        </tbody>
        ))}
      </table>
    </div>
  );
}

export function ExplainView({ explanation, focusKey, jobsById = {} }) {
  if (!explanation) return null;
  const lines = explanation.why_this_price || [];
  const tariffs = explanation.why_this_tariff || {};
  return (
    <div className="space-y-4 text-xs">
      <section aria-label="Why this Tariff">
        <h4 className="mb-1 font-bold text-slate-800">Why this Tariff?</h4>
        {Object.entries(tariffs).length === 0 && <p className="text-slate-500">No resolution trace was stored.</p>}
        {Object.entries(tariffs).map(([jobId, trace]) => (
          <div key={jobId} className="mb-2 rounded-lg border border-slate-200 p-2">
            <p className="font-semibold">{jobsById[jobId] || `Job ${jobId}`}: {trace.selected?.catalog_key} revision {trace.selected?.revision_number}
              {trace.path?.length > 0 && <span className="font-normal text-slate-600"> (via {trace.path.map(humanize).join(' → ')})</span>}
            </p>
            {trace.candidates?.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {trace.candidates.map((c) => (
                  <li key={`${c.catalog_key}-${c.revision_number}`} className="text-slate-600">
                    {c.catalog_key}{c.revision_number ? ` r${c.revision_number}` : ''}: {c.reason || c.rejected ? humanize(c.reason || c.rejected) : 'eligible'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
      <section aria-label="Why this price">
        <h4 className="mb-1 font-bold text-slate-800">Why this price?</h4>
        <ul className="space-y-1.5">
          {lines.map((line) => (
            <li key={line.charge_key} className={`rounded-lg border p-2 ${focusKey === line.charge_key ? 'border-primary bg-primary/5' : 'border-slate-200'}`}>
              <p className="font-semibold">{line.name}: <Money value={line.amount} currency={explanation.currency} /></p>
              <p className="text-slate-600">{line.how || `${humanize(line.calculation_type)}${line.quantity ? `: ${line.quantity} ${line.unit || ''} × ${line.rate}` : ''}`}</p>
              <p className="text-[11px] text-slate-500">
                {line.tariff && `${line.tariff} r${line.revision}`}{line.rule && ` · rule ${line.rule}`}
                {line.rate_table && ` · table ${line.rate_table}`}{line.rate_cell && ` · ${line.rate_cell}`}
                {line.formula && <> · formula <code>{line.formula}</code></>}
                {line.minimum && ' · minimum applied'}{line.breakpoint && ' · weight breakpoint applied'}
                {line.override && ` · overridden (was ${formatMoney(line.override.original_amount)})`}
              </p>
            </li>
          ))}
        </ul>
      </section>
      {explanation.constraint && (
        <section aria-label="Constraint">
          <h4 className="mb-1 font-bold text-slate-800">Constraint</h4>
          <p>{humanize(explanation.constraint.type)} {explanation.constraint.amount && formatMoney(explanation.constraint.amount)} {explanation.constraint.effect && `· ${humanize(explanation.constraint.effect)}`}</p>
        </section>
      )}
      {explanation.authority_order?.length > 0 && (
        <section aria-label="Authority order">
          <h4 className="mb-1 font-bold text-slate-800">Order of authority</h4>
          <ol className="list-inside list-decimal text-slate-600">{explanation.authority_order.map((step, i) => <li key={i}>{typeof step === 'string' ? humanize(step) : humanize(step.step || step.name || JSON.stringify(step))}</li>)}</ol>
        </section>
      )}
    </div>
  );
}

const MARGIN_LABEL = {
  ok: ['Healthy', 'green'], below_target: ['Below target', 'amber'], below_minimum: ['Approval required', 'amber'],
  below_hard_floor: ['Hard floor violation', 'red'], not_evaluated: ['Not evaluated', 'slate'],
};

export function MarginBadge({ status }) {
  const [label, tone] = MARGIN_LABEL[status] || [humanize(status), 'slate'];
  return <Badge tone={tone}>{label}</Badge>;
}

/** Run header: identity of the immutable calculation evidence. */
export function RunMeta({ run }) {
  if (!run || run.persisted === false) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600 sm:grid-cols-4">
      <div><dt className="font-semibold">Calculation run</dt><dd>#{run.id}{run.is_finalized ? ' (final)' : ''}</dd></div>
      <div><dt className="font-semibold">Calculated</dt><dd>{formatDateTime(run.calculated_at)}{run.calculated_by_id ? ` by user #${run.calculated_by_id}` : ''}</dd></div>
      <div><dt className="font-semibold">Context</dt><dd>{humanize(run.context)}</dd></div>
      <div><dt className="font-semibold">Effective date</dt><dd>{formatDateOnly(run.pricing_effective_date)} ({humanize(run.effective_date_basis)})</dd></div>
      <div className="col-span-2"><dt className="font-semibold">Input hash</dt><dd className="truncate font-mono">{run.input_hash}</dd></div>
      <div><dt className="font-semibold">Engine</dt><dd>{run.pricing_engine_version}</dd></div>
      <div><dt className="font-semibold">Formula language</dt><dd>{run.pricing_dsl_version}</dd></div>
    </dl>
  );
}

function EvidenceBlock({ title, data }) {
  const empty = data == null || (Array.isArray(data) ? !data.length : typeof data === 'object' && !Object.keys(data).length);
  return (
    <details className="rounded-lg border border-slate-200 px-3 py-2">
      <summary className="cursor-pointer text-xs font-semibold">{title}{empty && <span className="font-normal text-slate-500"> (none)</span>}</summary>
      {!empty && <pre className="mt-2 max-h-72 overflow-auto rounded bg-slate-50 p-2 text-[11px] dark:bg-slate-800">{JSON.stringify(data, null, 2)}</pre>}
    </details>
  );
}

/** Read-only evidence of an immutable run, for authorized staff. */
function RunEvidence({ run, explanation }) {
  const trace = explanation || {};
  return (
    <div className="space-y-1.5" aria-label="Calculation evidence">
      <p className="text-[11px] text-slate-500">Stored exactly as calculated. A calculation run cannot be changed.</p>
      <EvidenceBlock title="Inputs" data={run.inputs} />
      <EvidenceBlock title="Resources (crew, trucks, hours)" data={run.resources} />
      <EvidenceBlock title="Rules evaluated" data={trace.rule_evaluation} />
      <EvidenceBlock title="Rate cells used" data={(run.charges || []).filter((c) => c.source?.rate_cell_key).map((c) => ({ charge: c.name, table: c.source.rate_table_key, cell: c.source.rate_cell_key }))} />
      <EvidenceBlock title="Charges" data={run.charges} />
      <EvidenceBlock title="Adjustments" data={run.adjustments} />
      <EvidenceBlock title="Tax" data={run.taxes} />
      <EvidenceBlock title="Deposit" data={run.deposit} />
      <EvidenceBlock title="External inputs" data={run.external_inputs || trace.external_inputs} />
      <EvidenceBlock title="Tariff resolution trace" data={trace.why_this_tariff} />
      <EvidenceBlock title="Order of authority" data={run.authority_trace} />
    </div>
  );
}

export default function RunViewer({ run, explanation: inlineExplanation, jobsById = {}, compact = false }) {
  const [tab, setTab] = useState('charges');
  const [focus, setFocus] = useState(null);
  const explain = useExplain(run && run.persisted !== false ? run.id : null, tab === 'why' || tab === 'evidence');
  if (!run) return null;
  const explanation = inlineExplanation || explain.data;
  const currency = run.currency;
  const totals = run.totals || {};
  const jobs = run.jobs || [];
  const tabs = [
    { id: 'charges', label: 'Charges', count: run.charges?.length },
    { id: 'why', label: 'Why this price?' },
    ...(run.adjustments?.length ? [{ id: 'adjustments', label: 'Adjustments', count: run.adjustments.length }] : []),
    ...(run.taxes?.length ? [{ id: 'taxes', label: 'Taxes', count: run.taxes.length }] : []),
    ...(run.cost ? [{ id: 'margin', label: 'Cost & margin' }] : []),
    ...(run.inputs || run.persisted === false ? [{ id: 'evidence', label: 'Evidence' }] : []),
  ];

  return (
    <div className="space-y-3">
      {!compact && <RunMeta run={run} />}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        {jobs.map((job) => (
          <span key={job.job_id ?? 'job'} className="rounded-full bg-slate-100 px-2 py-0.5">
            {jobsById[job.job_id] || `Job ${job.job_id ?? ''}`}: {job.catalog_key} r{job.revision_number} · {humanize(job.pricing_method)} · {formatDateOnly(job.effective_date)}
            {job.overlay && <Badge tone="blue">Contract pricing: {typeof job.overlay === 'string' ? job.overlay : job.overlay.overlay_key || job.overlay.name}</Badge>}
          </span>
        ))}
        {run.id && run.persisted !== false && <span>Run #{run.id}</span>}
        {run.persisted === false && <Badge tone="blue">Not saved (simulation)</Badge>}
      </div>
      {run.errors?.length > 0 && <Callout tone="danger" title="Calculation errors">{run.errors.map((e) => e.message || e.code).join(' · ')}</Callout>}
      {run.warnings?.length > 0 && <Callout tone="warning" title="Warnings">{run.warnings.map((w) => w.message || w.code || String(w)).join(' · ')}</Callout>}
      {run.requires_approval && (
        <Callout tone="warning" title="Approval required">
          {(run.approvals_required || []).map((a) => humanize(a.approval_type || a.type || a)).join(', ') || 'This price needs an approval before it can be sent.'}
        </Callout>
      )}
      {run.constraint?.type && run.constraint.type !== 'none' && (
        <Callout tone="info" title={`${humanize(run.constraint.type)} ${run.constraint.amount ? formatMoney(run.constraint.amount, currency) : ''}`}>
          {decimalSign(totals.constraint_adjustment) !== 0
            ? `The calculated price ${formatMoney(totals.pre_constraint_total, currency)} was adjusted by ${formatMoney(totals.constraint_adjustment, currency)}.`
            : 'The calculated price is within the constraint.'}
        </Callout>
      )}
      {!compact && <Tabs tabs={tabs} active={tab} onChange={setTab} label="Calculation details" />}
      {tab === 'charges' && <ChargesTable charges={run.charges} currency={currency} jobsById={jobsById} showCost={Boolean(run.cost)} onExplainLine={(key) => { setFocus(key); setTab('why'); }} />}
      {tab === 'why' && (explanation ? <ExplainView explanation={explanation} focusKey={focus} jobsById={jobsById} /> : explain.isLoading ? <LoadingState /> : <p className="text-xs text-slate-500">No explanation available.</p>)}
      {tab === 'adjustments' && (
        <ul className="space-y-1 text-xs">
          {run.adjustments.map((a) => (
            <li key={a.key} className="flex justify-between gap-3 rounded-lg border border-slate-200 px-3 py-1.5">
              <span>{a.name} <span className="text-slate-500">({humanize(a.source_type)}{a.reason ? `: ${a.reason}` : ''})</span></span>
              <Money value={a.amount} currency={currency} />
            </li>
          ))}
        </ul>
      )}
      {tab === 'taxes' && (
        <ul className="space-y-1 text-xs">
          {run.taxes.map((t) => (
            <li key={t.component_key} className="flex justify-between gap-3 rounded-lg border border-slate-200 px-3 py-1.5">
              <span>{t.name} {t.rate}% on {formatMoney(t.taxable_base, currency)}{t.exemption_id && ' (exemption applied)'}</span>
              <Money value={t.amount} currency={currency} />
            </li>
          ))}
        </ul>
      )}
      {tab === 'evidence' && <RunEvidence run={run} explanation={explanation} />}
      {tab === 'margin' && run.cost && (
        <dl className="grid max-w-md grid-cols-2 gap-2 text-xs">
          <dt className="text-slate-600">Internal cost</dt><dd><Money value={run.cost.internal_cost_total} currency={currency} /></dd>
          <dt className="text-slate-600">Gross profit</dt><dd><Money value={run.cost.gross_profit} currency={currency} /></dd>
          <dt className="text-slate-600">Gross margin</dt><dd>{run.cost.gross_margin_pct != null ? `${run.cost.gross_margin_pct}%` : '—'}</dd>
          <dt className="text-slate-600">Margin status</dt><dd><MarginBadge status={run.cost.margin_status} /></dd>
        </dl>
      )}
      <TotalsTable totals={run.totals} currency={currency} constraint={run.constraint} />
      {compact && <Button variant="ghost" onClick={() => setTab(tab === 'why' ? 'charges' : 'why')}>{tab === 'why' ? 'Show charges' : 'Why this price?'}</Button>}
    </div>
  );
}
