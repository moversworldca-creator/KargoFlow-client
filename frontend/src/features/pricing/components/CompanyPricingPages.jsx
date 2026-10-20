// Company-wide views across Tariffs: the pricing calendar (date-based rules and
// blackouts of every live Tariff) and the regression tests of every Tariff.
// Both read the revisions as stored; editing happens in the Tariff itself, so
// published revisions stay read-only here too.
import React, { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { pricingApi } from '../api';
import { describeCondition, isCalendarCondition } from '../conditions';
import { formatDateOnly, formatMoney, humanize } from '../format';
import { PRICING } from '../permissions';
import { pricingKeys, useTariffs } from '../queries';
import { Badge, Button, Callout, EmptyState, ErrorBanner, LoadingState, QueryState, Section, StateBadge, useAction } from './ui';

const tariffLink = (tariffId, revisionId) => `/settings/pricing/tariffs?tariff=${tariffId}${revisionId ? `&revision=${revisionId}` : ''}`;

/** Loads one revision per Tariff; `pick` chooses which revision of a Tariff row. */
function useTariffRevisions(pick) {
  const tariffs = useTariffs({ state: 'active', limit: 100 });
  const rows = (tariffs.data ? tariffs.data.results || [] : []).filter((row) => pick(row));
  const revisions = useQueries({
    queries: rows.map((row) => ({
      queryKey: pricingKeys.revision(pick(row)), queryFn: () => pricingApi.getRevision(pick(row)), staleTime: 0, retry: false,
    })),
  });
  return { tariffs, entries: rows.map((row, index) => ({ tariff: row, query: revisions[index] })) };
}

const livePick = (row) => row.current_published_revision_id || null;
const workingPick = (row) => row.latest_revision_id || row.current_published_revision_id || null;

// ── Pricing Calendars ────────────────────────────────────────────────────────
export function PricingCalendarsPage() {
  const { tariffs, entries } = useTariffRevisions(livePick);
  return (
    <Section title="Pricing calendars" description="Date-based pricing in force across all active Tariffs: weekends, seasons, month end, holidays and blackout dates. To change one, open its Tariff and edit a draft revision.">
      <QueryState query={tariffs} empty={!entries.length} emptyText="No active Tariff has a published revision yet.">
        <div className="space-y-3">
          {entries.map(({ tariff, query }) => <CalendarCard key={tariff.id} tariff={tariff} query={query} />)}
        </div>
      </QueryState>
    </Section>
  );
}

function CalendarCard({ tariff, query }) {
  const pendingDraft = tariff.latest_revision_id && tariff.latest_revision_id !== tariff.current_published_revision_id;
  return (
    <article className="rounded-xl border border-slate-200 p-3" aria-label={`Calendar of ${tariff.name}`}>
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{tariff.name}</h3>
        <span className="text-xs text-slate-500">Rev {tariff.current_revision_number || '—'} (live)</span>
        {pendingDraft && <Badge tone="amber">Rev {tariff.latest_revision_number} {humanize(tariff.latest_revision_state)}</Badge>}
        <Link className="ml-auto text-xs font-semibold text-blue-700 hover:underline" to={tariffLink(tariff.id, tariff.latest_revision_id || tariff.current_published_revision_id)}>Open Tariff</Link>
      </header>
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorBanner message="This Tariff's calendar could not be loaded." onRetry={() => query.refetch()} />
        : <CalendarEntries revision={query.data} />}
    </article>
  );
}

function CalendarEntries({ revision }) {
  const content = revision.content || {};
  const rules = (content.rules || []).filter((r) => r.is_active !== false && isCalendarCondition(r.condition_expression))
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const dated = (content.applicability || []).filter((a) => a.service_date_from || a.service_date_until);
  if (!rules.length && !dated.length) return <EmptyState>No date-based pricing; the same rates apply every day.</EmptyState>;
  return (
    <ul className="space-y-1 text-xs">
      {rules.map((rule) => (
        <li key={`r${rule.id}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
          <Badge tone="blue">{humanize(rule.rule_type)}</Badge>
          <span className="font-semibold">{rule.customer_display_name || rule.name}</span>
          <span className="text-slate-600">{describeCondition(rule.condition_expression)}</span>
          <span className="ml-auto tabular-nums">{rule.percentage ? `${rule.percentage}%` : rule.rate_amount ? formatMoney(rule.rate_amount, revision.currency) : ''}</span>
        </li>
      ))}
      {dated.map((a) => (
        <li key={`a${a.id}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
          {a.is_exclusion ? <Badge tone="red">Blackout</Badge> : <Badge tone="green">Applies only</Badge>}
          <span>{formatDateOnly(a.service_date_from)} – {formatDateOnly(a.service_date_until)}</span>
          <span className="text-slate-500">({a.applicability_key})</span>
        </li>
      ))}
    </ul>
  );
}

// ── Pricing Tests ────────────────────────────────────────────────────────────
export function PricingTestsPage() {
  const { can } = useCan();
  const { tariffs, entries } = useTariffRevisions(workingPick);
  const [results, setResults] = useState({});
  const withTests = entries.filter(({ query }) => (query.data ? (query.data.content || {}).scenarios || [] : []).length > 0);
  // Runs revision by revision; the backend prices each test and reports pass / fail.
  const runAll = useAction(async (revisionIds) => {
    const next = {};
    for (const id of revisionIds) next[id] = await pricingApi.runScenarios(id);
    return next;
  }, {
    success: (data) => {
      const all = Object.values(data).flat();
      return `${all.filter((r) => r.passed).length} of ${all.length} tests passed.`;
    },
    onSuccess: (data) => setResults((previous) => ({ ...previous, ...data })),
  });
  const ids = withTests.map(({ query }) => query.data.id);
  return (
    <Section title="Pricing tests" description="Regression tests of every Tariff: sample jobs with the price you expect, run by the pricing engine against each Tariff's newest revision."
      actions={can(PRICING.SIMULATE) && ids.length > 0 && (
        <Button onClick={() => runAll.run(ids)} busy={runAll.busy}><Play size={14} aria-hidden="true" /> Run all tests</Button>
      )}>
      <QueryState query={tariffs} empty={!entries.length} emptyText="No active Tariffs yet.">
        <ErrorBanner message={runAll.error ? runAll.error.message : null} />
        <div className="space-y-3">
          {entries.map(({ tariff, query }) => (
            <TestsCard key={tariff.id} tariff={tariff} query={query} results={query.data ? results[query.data.id] : undefined} />
          ))}
        </div>
      </QueryState>
    </Section>
  );
}

function TestsCard({ tariff, query, results }) {
  const revision = query.data;
  return (
    <article className="rounded-xl border border-slate-200 p-3" aria-label={`Tests of ${tariff.name}`}>
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{tariff.name}</h3>
        {revision && <span className="text-xs text-slate-500">Rev {revision.revision_number}</span>}
        {revision && <StateBadge state={revision.state} />}
        {results && <TestTally results={results} />}
        <Link className="ml-auto text-xs font-semibold text-blue-700 hover:underline" to={tariffLink(tariff.id, revision ? revision.id : null)}>Open Tariff</Link>
      </header>
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorBanner message="This Tariff's tests could not be loaded." onRetry={() => query.refetch()} />
        : <TestRows revision={revision} results={results} />}
    </article>
  );
}

function TestTally({ results }) {
  const failed = results.filter((r) => !r.passed).length;
  return failed ? <Badge tone="red">{failed} failed</Badge> : <Badge tone="green">All passed</Badge>;
}

function TestRows({ revision, results }) {
  const rows = (revision.content || {}).scenarios || [];
  if (!rows.length) {
    return <Callout tone="warning">No regression tests. Add a few sample jobs in the Tariff so a change that moves prices is caught before publishing.</Callout>;
  }
  return (
    <ul className="space-y-1 text-xs">
      {rows.map((row) => {
        const result = results ? results.find((r) => r.scenario_key === row.scenario_key) : undefined;
        const expected = row.expected_snapshot || {};
        return (
          <li key={row.id} className="rounded-lg border border-slate-200 px-3 py-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{row.name || row.scenario_key}</span>
              {row.is_required_for_publish && <Badge tone="amber">Required</Badge>}
              {result && <Badge tone={result.passed ? 'green' : 'red'}>{result.passed ? 'Passed' : 'Failed'}</Badge>}
              <span className="flex-1 text-slate-600">Expected {formatMoney(expected.grand_total, revision.currency)}</span>
              {result && result.totals && result.totals.grand_total && <span>Got <span className="font-semibold tabular-nums">{formatMoney(result.totals.grand_total, revision.currency)}</span></span>}
            </div>
            {result && result.failures && result.failures.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-rose-700">{result.failures.map((f) => <li key={f}>{f}</li>)}</ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
