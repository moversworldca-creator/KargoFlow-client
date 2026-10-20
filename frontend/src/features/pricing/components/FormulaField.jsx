// Formula / condition editor for the engine's safe expression language. It
// helps write the expression (variables, functions, lookups) and shows the
// backend's validation findings; it never evaluates the expression itself.
import React, { useId, useRef, useState } from 'react';
import { FORMULA_FUNCTIONS, FORMULA_VARIABLES } from '../constants';
import { Field, inputClass } from './ui';

export default function FormulaField({ label, value, onChange, error, hint, issues = [], tables = [], condition = false, readOnly = false }) {
  const id = useId();
  const area = useRef(null);
  const [showHelp, setShowHelp] = useState(false);

  const insert = (text) => {
    const node = area.current;
    const snippet = text.replace('<item>', '').replace('<key>', '').replace('<flag>', '').replace('<code>', '');
    if (!node) { onChange(`${value || ''}${snippet}`); return; }
    const start = node.selectionStart ?? (value || '').length;
    const end = node.selectionEnd ?? start;
    const next = `${(value || '').slice(0, start)}${snippet}${(value || '').slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => { node.focus(); node.setSelectionRange(start + snippet.length, start + snippet.length); });
  };

  const backendError = issues.map((i) => i.message).join(' ');
  return (
    <Field label={label} htmlFor={id} hint={hint || (condition ? undefined : 'Checked by Validate. Unknown variables and unsafe code are refused.')} error={error || backendError || undefined}>
      <textarea id={id} ref={area} rows={condition ? 2 : 3} value={value || ''} onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} font-mono`} readOnly={readOnly} spellCheck={false}
        placeholder={condition ? 'is_weekend and crew_size >= 3' : 'max(labor_hours, 3) * lookup("crew_rates", "crew_size", crew_size)'} />
      {!readOnly && (
        <div className="mt-1">
          <button type="button" className="text-[11px] font-semibold text-primary" aria-expanded={showHelp} onClick={() => setShowHelp(!showHelp)}>
            {showHelp ? 'Hide' : 'Show'} variables and functions
          </button>
          {showHelp && (
            <div className="mt-1 space-y-2 rounded-lg border border-slate-200 p-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-600">Variables</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {FORMULA_VARIABLES.map((name) => (
                    <button key={name} type="button" onClick={() => insert(name)} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] hover:bg-slate-200">{name}</button>
                  ))}
                </div>
              </div>
              {!condition && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-600">Functions</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {FORMULA_FUNCTIONS.map((fn) => (
                      <button key={fn} type="button" onClick={() => insert(fn)} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] hover:bg-slate-200">{fn}</button>
                    ))}
                  </div>
                </div>
              )}
              {!condition && tables.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-600">Rate tables in this revision</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tables.map((t) => (
                      <button key={t.id} type="button" onClick={() => insert(`lookup("${t.table_key}", "${t.dimensions?.[0]?.dimension_key || 'dimension'}", ${t.dimensions?.[0]?.dimension_key || 'value'})`)}
                        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] hover:bg-slate-200">{t.table_key}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Field>
  );
}
