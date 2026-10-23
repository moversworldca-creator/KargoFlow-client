import React from 'react';

export default function DocumentSettings({ mode, settings, onChange }) {
  if (['email', 'sms'].includes(mode)) return null;
  return <div className="space-y-3">
    <fieldset>
      <legend className="mb-2 text-xs font-semibold text-slate-700">Page margins</legend>
      <div className="grid grid-cols-2 gap-2">
        {['top', 'right', 'bottom', 'left'].map((side) => <label key={side} className="text-xs capitalize">{side}
          <input aria-label={`${side} margin`} type="number" min="0" max="200" step="1"
            value={settings.margins?.[side] ?? 40}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              if (Number.isInteger(value) && value >= 0 && value <= 200) onChange({ margins: { ...settings.margins, [side]: value } });
            }} className="mt-1 w-full rounded border border-slate-300 p-2" />
        </label>)}
      </div>
    </fieldset>
    {['estimate', 'estimate_portal'].includes(mode) && <fieldset className="space-y-2">
      <legend className="mb-2 text-xs font-semibold text-slate-700">Estimate portal</legend>
      {Object.entries({ allow_option_selection: 'Allow option selection', require_signature: 'Require signature', collect_deposit: 'Collect deposit' })
        .map(([key, label]) => <label key={key} className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={settings.portal?.[key] ?? true}
            onChange={(event) => onChange({ portal: { ...settings.portal, [key]: event.target.checked } })} />{label}
        </label>)}
    </fieldset>}
  </div>;
}
