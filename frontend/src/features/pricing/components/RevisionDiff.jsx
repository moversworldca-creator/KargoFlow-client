// Compare two revisions of a Tariff, item by item (rules, rate cells,
// applicability, constraints, tests). A structural comparison of stored
// configuration; it shows old and new values side by side and computes no price.
import React, { useMemo, useState } from 'react';
import { useRevision } from '../queries';
import { humanize } from '../format';
import { Badge, EmptyState, LoadingState, SelectField } from './ui';

const IGNORED = new Set(['id', 'catalog_revision_id', 'rate_table_id', 'created_at', 'updated_at', 'dimensions', 'cells']);

const show = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

function diffRows(oldRows, newRows, keyOf) {
  const before = new Map(oldRows.map((r) => [keyOf(r), r]));
  const after = new Map(newRows.map((r) => [keyOf(r), r]));
  const out = [];
  for (const [key, row] of after) {
    const prev = before.get(key);
    if (!prev) { out.push({ key, change: 'added', fields: [] }); continue; }
    const fields = Object.keys({ ...prev, ...row })
      .filter((f) => !IGNORED.has(f) && JSON.stringify(prev[f] ?? null) !== JSON.stringify(row[f] ?? null))
      .map((f) => ({ field: f, from: prev[f], to: row[f] }));
    if (fields.length) out.push({ key, change: 'changed', fields });
  }
  for (const key of before.keys()) if (!after.has(key)) out.push({ key, change: 'removed', fields: [] });
  return out;
}

export function revisionDiff(oldContent = {}, newContent = {}) {
  const cells = (content) => (content.rate_tables || []).flatMap((t) => (t.cells || []).map((c) => ({ ...c, _key: `${t.table_key} › ${c.cell_key}` })));
  return [
    ['Rules', diffRows(oldContent.rules || [], newContent.rules || [], (r) => r.rule_key)],
    ['Rate tables', diffRows(oldContent.rate_tables || [], newContent.rate_tables || [], (r) => r.table_key)],
    ['Rate cells', diffRows(cells(oldContent), cells(newContent), (r) => r._key)],
    ['Applicability', diffRows(oldContent.applicability || [], newContent.applicability || [], (r) => r.applicability_key)],
    ['Constraints', diffRows(oldContent.constraints || [], newContent.constraints || [], (r) => r.constraint_key)],
    ['Tests', diffRows(oldContent.scenarios || [], newContent.scenarios || [], (r) => r.scenario_key)],
  ];
}

export default function RevisionDiff({ revision, revisions }) {
  const others = revisions.filter((r) => r.id !== revision.id);
  const [otherId, setOtherId] = useState(() => String(
    others.find((r) => r.state === 'published')?.id || others[0]?.id || '',
  ));
  const other = useRevision(Number(otherId) || null);
  const sections = useMemo(() => {
    if (!other.data) return [];
    const [older, newer] = other.data.revision_number < revision.revision_number ? [other.data, revision] : [revision, other.data];
    return revisionDiff(older.content, newer.content);
  }, [other.data, revision]);

  if (!others.length) return <EmptyState>This is the only revision.</EmptyState>;
  return (
    <div className="space-y-3">
      <div className="max-w-xs">
        <SelectField label="Compare with" value={otherId} onChange={setOtherId}
          options={others.map((r) => [String(r.id), `Revision ${r.revision_number} (${humanize(r.state)})`])} />
      </div>
      {other.isLoading && <LoadingState />}
      {other.data && sections.every(([, rows]) => !rows.length) && <EmptyState>No differences.</EmptyState>}
      {sections.filter(([, rows]) => rows.length).map(([title, rows]) => (
        <div key={title}>
          <h4 className="mb-1 text-xs font-bold text-slate-700">{title}</h4>
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={`${title}-${row.key}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs">
                <Badge tone={{ added: 'green', removed: 'red', changed: 'amber' }[row.change]}>{humanize(row.change)}</Badge>
                <span className="ml-2 font-semibold">{row.key}</span>
                {row.fields.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {row.fields.map((f) => (
                      <li key={f.field} className="font-mono text-[11px]">
                        {f.field}: <span className="text-rose-700 line-through">{show(f.from)}</span> → <span className="text-emerald-700">{show(f.to)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
