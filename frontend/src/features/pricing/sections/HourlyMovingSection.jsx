// Hourly Moving Rates (MOV-01..07).
import React from 'react';
import LaborRates from './LaborRates';
import { PeriodPicker, SectionHeader, SectionProblems, Toggle } from './fields';

export default function HourlyMovingSection({ config, onChange, isReadOnly, selectedPeriodId, onSelectPeriod, problems }) {
  const hourly = config.hourly_moving || { periods: {} };
  const set = (next) => onChange({ ...config, hourly_moving: next });
  return (
    <div className="space-y-4">
      <SectionHeader title="Hourly Moving Rates" description="Hourly crew rates and minimum hours for each day of the week, per pricing period.">
        <Toggle label="Hourly moving rates enabled" checked={hourly.is_enabled !== false} disabled={isReadOnly}
          onChange={(is_enabled) => set({ ...hourly, is_enabled })} />
      </SectionHeader>
      <SectionProblems problems={problems} section="hourly_moving" />
      <Toggle label="Rates vary by number of trucks" disabled={isReadOnly} checked={hourly.vary_by_trucks}
        hint="Rows become crew + truck count (labor only, 1 truck, 2 trucks …). Switching clears the rate rows."
        onChange={(vary) => {
          const hasRows = Object.values(hourly.periods || {}).some((p) => Object.keys(p?.hourly || {}).length || Object.keys(p?.flat_plus_hourly || {}).length);
          if (hasRows && !window.confirm('Changing this clears the moving rate rows of every period. Continue?')) return;
          set({ ...hourly, vary_by_trucks: vary, periods: {} });
        }} />
      <PeriodPicker config={config} value={selectedPeriodId} onChange={onSelectPeriod} />
      <LaborRates label="Moving" section={hourly} onSectionChange={set} periodId={selectedPeriodId || 'default'}
        readOnly={isReadOnly} varyByTrucks={hourly.vary_by_trucks} withTrucks />
    </div>
  );
}
