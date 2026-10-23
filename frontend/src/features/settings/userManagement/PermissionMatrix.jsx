// Permission matrix: one row per page, one column per common action, special
// actions as chips. Used to edit a role's grants and to show what a person can
// do (role grants + personal exceptions).
//
// Only actions the backend catalog defines for a page are shown; a missing
// action is "—", never a checkbox. Scopes offered are the permission's own
// allowed scopes from the catalog.
import React, { useMemo, useState } from 'react';
import { Ban, Check, ChevronDown, Plus } from 'lucide-react';
import { SCOPE_HELP } from './permissionLabels';
import { SCOPE_LABELS, sortScopes } from './permissions';
import { STANDARD_ACTIONS, buildMatrix, defaultScope } from './matrixModel';

const SHORT_SCOPE = { own: 'Own', assigned: 'Assigned', branch: 'Branch', company: 'Company' };

function ScopePicker({ item, value, disabled, onChange }) {
  if (item.scopes.length === 1) {
    return <span title={SCOPE_HELP[item.scopes[0]]} className="text-[10px] text-slate-500">{SHORT_SCOPE[item.scopes[0]]}</span>;
  }
  return (
    <select aria-label={`Scope for ${item.meta.label}`} title={SCOPE_HELP[value]} value={value} disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-[6.5rem] rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      {item.scopes.map((s) => <option key={s} value={s}>{SHORT_SCOPE[s]}</option>)}
    </select>
  );
}

/** Role mode cell: checkbox + scope. */
function RoleCell({ item, grants, editable, onToggle, onScope }) {
  const granted = grants.has(item.permission_key);
  const scope = grants.get(item.permission_key) || defaultScope(item.scopes);
  return (
    <div className="flex flex-col items-center gap-1">
      <input type="checkbox" aria-label={item.meta.label} checked={granted} disabled={!editable}
        onChange={() => onToggle(item, granted)}
        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed" />
      {granted && <ScopePicker item={item} value={scope} disabled={!editable} onChange={(s) => onScope(item.permission_key, s)} />}
    </div>
  );
}

/** User mode cell: where access comes from, clickable to add an exception. */
function UserCell({ item, cells, onCellAction }) {
  const cell = cells.get(item.permission_key) || {};
  const { override, roles = [] } = cell;
  let content;
  let label;
  if (override?.effect === 'deny') {
    content = <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800"><Ban size={10} aria-hidden="true" />Blocked</span>;
    label = `${item.meta.label}: blocked by a personal exception`;
  } else if (override?.effect === 'allow') {
    content = <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800"><Plus size={10} aria-hidden="true" />{SHORT_SCOPE[override.scope]}</span>;
    label = `${item.meta.label}: extra access (${SCOPE_LABELS[override.scope]}) from a personal exception`;
  } else if (roles.length) {
    // Roles held in branches name the branches; company-wide system roles their scope.
    const places = [...new Set(roles.map((r) => r.branchName).filter(Boolean))];
    const wide = roles.filter((r) => !r.branchName);
    const text = wide.length ? SHORT_SCOPE[sortScopes(wide.map((r) => r.scope)).pop()]
      : places.length === 1 ? places[0] : `${places.length} branches`;
    content = <span className="inline-flex max-w-[6.5rem] items-center gap-0.5 truncate rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800"><Check size={10} aria-hidden="true" />{text}</span>;
    label = `${item.meta.label}: via ${roles.map((r) => (r.branchName
      ? `${r.role} in ${r.branchName}${r.scope === 'branch' ? '' : ` (${SCOPE_LABELS[r.scope]})`}`
      : `${r.role} (${SCOPE_LABELS[r.scope]})`)).join(', ')}`;
  } else {
    content = <span className="text-[11px] text-slate-300" aria-hidden="true">·</span>;
    label = `${item.meta.label}: no access`;
  }
  if (!onCellAction) return <span title={label} aria-label={label} role="img">{content}</span>;
  return (
    <button type="button" title={label} aria-label={label} onClick={() => onCellAction(item, cell)}
      className="rounded px-1 py-0.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary dark:hover:bg-slate-800">
      {content}
    </button>
  );
}

export default function PermissionMatrix({
  catalog, mode = 'role', grants = new Map(), editable = false, onToggle, onScope, onSetPage,
  cells = new Map(), onCellAction, toolbarExtra,
}) {
  const [query, setQuery] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const isActive = (item) => (mode === 'role'
    ? grants.has(item.permission_key)
    : Boolean(cells.get(item.permission_key)?.override || cells.get(item.permission_key)?.roles?.length));
  const areas = useMemo(() => buildMatrix(catalog, query)
    .map((a) => ({ ...a, pages: onlyActive ? a.pages.filter((p) => p.all.some(isActive)) : a.pages }))
    .filter((a) => a.pages.length),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [catalog, query, onlyActive, grants, cells, mode]);

  const renderCell = (item) => (mode === 'role'
    ? <RoleCell item={item} grants={grants} editable={editable} onToggle={onToggle} onScope={onScope} />
    : <UserCell item={item} cells={cells} onCellAction={onCellAction} />);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Search permissions" placeholder="Search pages or actions, e.g. “book” or “customers”…" value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[14rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900" />
        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
          {mode === 'role' ? 'Only granted' : 'Only pages with access'}
        </label>
        {toolbarExtra}
      </div>

      {mode === 'user' && (
        <p className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1"><span className="rounded bg-sky-100 px-1 text-sky-800"><Check size={10} className="inline" aria-hidden="true" /></span>From a role</span>
          <span className="inline-flex items-center gap-1"><span className="rounded bg-emerald-100 px-1 text-emerald-800"><Plus size={10} className="inline" aria-hidden="true" /></span>Extra (personal)</span>
          <span className="inline-flex items-center gap-1"><span className="rounded bg-rose-100 px-1 text-rose-800"><Ban size={10} className="inline" aria-hidden="true" /></span>Blocked (personal)</span>
          {onCellAction && <span>Click a cell to block or grant it for this person.</span>}
        </p>
      )}

      {areas.length === 0 && <p className="py-6 text-center text-xs text-slate-500">Nothing matches.</p>}

      {areas.map(({ area, pages }) => {
        const items = pages.flatMap((p) => p.all);
        const active = items.filter(isActive).length;
        return (
          <details key={area} open className="group overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <summary className="flex cursor-pointer list-none items-center justify-between bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:bg-slate-900 dark:text-slate-100">
              <span className="flex items-center gap-2">
                <ChevronDown size={14} className="transition group-open:rotate-0 -rotate-90" aria-hidden="true" />
                {area}
              </span>
              <span className="font-semibold text-slate-500">{active} of {items.length} {mode === 'role' ? 'granted' : 'with access'}</span>
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th scope="col" className="px-3 py-1.5 text-left">Page</th>
                    {STANDARD_ACTIONS.map(([, label]) => <th key={label} scope="col" className="w-20 px-1 py-1.5 text-center">{label}</th>)}
                    <th scope="col" className="px-2 py-1.5 text-left">Special actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pages.map((p) => (
                    <tr key={p.page} className="align-top hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <th scope="row" className="px-3 py-2 text-left font-semibold text-slate-800 dark:text-slate-100">
                        {p.page}
                        {mode === 'role' && editable && onSetPage && (
                          <span className="mt-1 flex gap-1 font-normal">
                            {[['none', 'None'], ['view', 'View only'], ['all', 'Everything']].map(([level, text]) => (
                              (level !== 'view' || p.byAction.has('view')) && (
                                <button key={level} type="button" onClick={() => onSetPage(p.all, level)}
                                  aria-label={`${p.page}: ${text}`}
                                  className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300">
                                  {text}
                                </button>
                              )
                            ))}
                          </span>
                        )}
                      </th>
                      {STANDARD_ACTIONS.map(([action]) => (
                        <td key={action} className="px-1 py-2 text-center">
                          {p.byAction.has(action) ? renderCell(p.byAction.get(action)) : <span className="text-slate-300" aria-label="Not applicable">—</span>}
                        </td>
                      ))}
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {p.other.map((item) => (
                            <span key={item.permission_key} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-1.5 py-1 dark:border-slate-700">
                              <span className="text-[11px] text-slate-700 dark:text-slate-200">{item.meta.action}</span>
                              {renderCell(item)}
                            </span>
                          ))}
                          {!p.other.length && <span className="text-slate-300" aria-hidden="true">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </div>
  );
}
