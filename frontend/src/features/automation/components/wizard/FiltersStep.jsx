import React, { useEffect, useMemo, useState } from 'react';
import { getAutomationFields } from '../../../../services/api';

export default function FiltersStep({ draft, dispatch }) {
  const [fieldsMeta, setFieldsMeta] = useState({ fields: [], operators: [], choices: { branches: [], users: [] } });
  const rules = draft.filters?.rules || [];

  useEffect(() => {
    const load = async () => {
      try {
        const params = {};
        if (draft.meta?.branch) params.branch = draft.meta.branch;
        const res = await getAutomationFields(draft.meta?.target_type || 'lead', params);
        setFieldsMeta(res || { fields: [], operators: [], choices: { branches: [], users: [] } });
      } catch {
        setFieldsMeta({ fields: [], operators: [], choices: { branches: [], users: [] } });
      }
    };
    load();
  }, [draft.meta?.target_type, draft.meta?.branch]);

  const operators = useMemo(() => fieldsMeta.operators || [], [fieldsMeta]);

  const setFilters = (nextRules) => {
    dispatch({ type: 'filters', value: { ...(draft.filters || { match: 'all', rules: [] }), rules: nextRules } });
  };

  const addRule = () => {
    const firstField = fieldsMeta.fields?.[0]?.field || `${draft.meta?.target_type || 'lead'}.status`;
    setFilters([...rules, { field: firstField, op: 'equals', value: '' }]);
  };

  const updateRule = (idx, patch) => {
    const next = [...rules];
    next[idx] = { ...(next[idx] || {}), ...patch };
    setFilters(next);
  };

  const removeRule = (idx) => setFilters(rules.filter((_, i) => i !== idx));

  const renderValue = (rule, idx) => {
    const fieldInfo = (fieldsMeta.fields || []).find((f) => f.field === rule.field);
    const type = fieldInfo?.type || 'string';
    if (type === 'bool') {
      return (
        <select
          value={String(rule.value ?? '')}
          onChange={(e) => updateRule(idx, { value: e.target.value === '' ? '' : e.target.value === 'true' })}
          className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
        >
          <option value="">Select</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }
    if (type === 'branch') {
      return (
        <select
          value={String(rule.value ?? '')}
          onChange={(e) => updateRule(idx, { value: e.target.value === '' ? '' : Number(e.target.value) })}
          className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
        >
          <option value="">Select branch</option>
          {(fieldsMeta.choices?.branches || []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      );
    }
    if (type === 'user') {
      return (
        <select
          value={String(rule.value ?? '')}
          onChange={(e) => updateRule(idx, { value: e.target.value === '' ? '' : Number(e.target.value) })}
          className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
        >
          <option value="">Select user</option>
          {(fieldsMeta.choices?.users || []).map((u) => (
            <option key={u.id} value={u.id}>
              {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}
            </option>
          ))}
        </select>
      );
    }
    if (type === 'choice') {
      return (
        <select
          value={String(rule.value ?? '')}
          onChange={(e) => updateRule(idx, { value: e.target.value })}
          className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
        >
          <option value="">Select</option>
          {(fieldInfo?.choices || []).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      );
    }
    if (type === 'date') {
      const isWindow = ['date_within_next_days', 'date_within_past_days'].includes(rule.op);
      return (
        <input
          type={isWindow ? 'number' : 'date'}
          value={String(rule.value ?? '')}
          onChange={(e) => updateRule(idx, { value: e.target.value })}
          className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
          placeholder={isWindow ? 'Days' : ''}
        />
      );
    }
    return (
      <input
        value={String(rule.value ?? '')}
        onChange={(e) => updateRule(idx, { value: e.target.value })}
        className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
        placeholder="Value"
      />
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-heading">Add filters (optional)</h2>
        <p className="text-sm text-muted">Optionally add conditions to limit when this automation runs</p>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-heading">Filters</div>
          <button type="button" onClick={addRule} className="px-3 py-2 bg-border rounded-xl text-sm font-bold">
            + Add Filter
          </button>
        </div>

        <div className="space-y-2">
          {rules.map((rule, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <button
                type="button"
                onClick={() => removeRule(idx)}
                className="md:col-span-1 rounded-xl border border-border px-3 py-2 text-sm"
              >
                ×
              </button>
              <select
                className="md:col-span-5 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={rule.field || ''}
                onChange={(e) => updateRule(idx, { field: e.target.value, value: '' })}
              >
                {(fieldsMeta.fields || []).map((f) => (
                  <option key={f.field} value={f.field}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                className="md:col-span-3 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={rule.op || 'equals'}
                onChange={(e) => updateRule(idx, { op: e.target.value, value: '' })}
              >
                {operators.map((o) => (
                  <option key={o.op} value={o.op}>
                    {o.label}
                  </option>
                ))}
              </select>
              <div className="md:col-span-3">{renderValue(rule, idx)}</div>
            </div>
          ))}
          {!rules.length && <div className="text-sm text-muted">No filters.</div>}
        </div>
      </div>
    </div>
  );
}
