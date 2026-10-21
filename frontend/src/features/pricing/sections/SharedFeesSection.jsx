import React, { useState } from 'react';
import { DollarSign, Percent, Plus, Route, Trash2 } from 'lucide-react';

const FEE_METHODS = [
  { value: 'flat_fee', label: 'Flat Fee' },
  { value: 'drive_time', label: 'Drive Time' },
  { value: 'flat_fee_two_factor', label: 'Flat Fee Two Factor' },
  { value: 'mileage_table', label: 'Mileage Table' },
  { value: 'per_item_flat', label: 'Per Item (Flat)' },
  { value: 'per_item_cwt', label: 'Per Item (CWT)' },
  { value: 'per_mile', label: 'Per Mile' },
  { value: 'percentage', label: 'Percentage' },
];

const PERCENTAGE_BASES = [
  { value: 'hourly_labor', label: 'Hourly Labor' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'packing', label: 'Packing' },
  { value: 'job_subtotal', label: 'Job Subtotal (excl. tax & tips)' },
  { value: 'sit', label: 'Storage In Transit' },
];

export default function SharedFeesSection({
  categoryTitle,
  categoryDescription,
  configKey, // e.g. "trip_and_travel", "fuel_surcharges", "shuttle_fees", "additional_services", "storage_in_transit"
  config,
  onChange,
  isReadOnly,
  allowCrewSalesPay = false,
  allowPerTruck = false,
}) {
  const feeList = config[configKey] || [];
  const [editingId, setEditingId] = useState(null);

  const setFees = (updated) => {
    onChange({
      ...config,
      [configKey]: updated,
    });
  };

  const handleAddFee = () => {
    const newId = `fee_${Date.now()}`;
    const newFee = {
      id: newId,
      name: `New ${categoryTitle.replace(/Fees|Rates/gi, '').trim()}`,
      calculation_method: configKey === 'fuel_surcharges' ? 'percentage' : 'flat_fee',
      amount: '50.00',
      percentage: '5.0',
      percentage_base: 'job_subtotal',
      route_basis: 'radius',
      mileage_unit: 'minutes',
      included_miles: '10',
      minimum_cost: '40.00',
      rate_per_mile: '2.00',
      actual_vs_overage: 'overage',
      first_item_amount: '50.00',
      additional_item_amount: '25.00',
      rate_multiplier: '1.0',
      bill_per_truck: false,
      pay_to_crew: false,
      pay_to_salespeople: false,
      editable_on_job: true,
      billing_cycle: 'monthly',
    };
    setFees([...feeList, newFee]);
    setEditingId(newId);
  };

  const handleUpdate = (id, patch) => {
    setFees(feeList.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const handleDelete = (id) => {
    if (isReadOnly) return;
    setFees(feeList.filter((f) => f.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{categoryTitle}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{categoryDescription}</p>
        </div>
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleAddFee}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition dark:bg-blue-600"
          >
            <Plus size={14} /> Add {categoryTitle.replace(/Fees|Rates|Services/gi, '').trim() || 'Item'}
          </button>
        )}
      </div>

      {/* Fees List */}
      <div className="space-y-3">
        {feeList.map((fee, idx) => {
          const isEditing = editingId === fee.id;
          const method = fee.calculation_method || 'flat_fee';

          return (
            <div
              key={fee.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center text-xs font-bold text-slate-400">{idx + 1}</span>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{fee.name}</div>
                    <div className="text-[11px] text-slate-500">
                      Method: <strong className="text-slate-700 dark:text-slate-300">{FEE_METHODS.find((m) => m.value === method)?.label}</strong>
                      {method === 'flat_fee' && ` · $${Number(fee.amount || 0).toFixed(2)}`}
                      {method === 'percentage' && ` · ${fee.percentage || 0}% of ${PERCENTAGE_BASES.find((b) => b.value === fee.percentage_base)?.label || 'Subtotal'}`}
                      {method === 'per_mile' && ` · $${fee.rate_per_mile || 0}/mi (${fee.actual_vs_overage || 'actual'})`}
                      {method === 'drive_time' && ` · ${fee.route_basis || 'radius'} (${fee.mileage_unit || 'minutes'})`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(isEditing ? null : fee.id)}
                    className="rounded px-2.5 py-1 text-xs font-semibold text-brand-blue hover:underline"
                  >
                    {isEditing ? 'Done' : 'Configure'}
                  </button>
                  {!isReadOnly && (
                    <button
                      type="button"
                      aria-label={`Delete ${fee.name}`}
                      onClick={() => handleDelete(fee.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Editing Panel */}
              {isEditing && (
                <div className="border-t border-slate-100 bg-slate-50/70 p-4 space-y-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Fee / Service Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={fee.name}
                        onChange={(e) => handleUpdate(fee.id, { name: e.target.value })}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Calculation Method
                      </label>
                      <select
                        disabled={isReadOnly}
                        value={fee.calculation_method}
                        onChange={(e) => handleUpdate(fee.id, { calculation_method: e.target.value })}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        {FEE_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Method-Specific Inputs */}
                    {method === 'flat_fee' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Amount ($)
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isReadOnly}
                            value={fee.amount || ''}
                            onChange={(e) => handleUpdate(fee.id, { amount: e.target.value })}
                            className="w-full rounded-md border border-slate-300 bg-white pl-6 pr-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    {method === 'percentage' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Percentage Rate (%)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              disabled={isReadOnly}
                              value={fee.percentage || ''}
                              onChange={(e) => handleUpdate(fee.id, { percentage: e.target.value })}
                              className="w-full rounded-md border border-slate-300 bg-white pl-2.5 pr-7 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Applied To Base
                          </label>
                          <select
                            disabled={isReadOnly}
                            value={fee.percentage_base || 'job_subtotal'}
                            onChange={(e) => handleUpdate(fee.id, { percentage_base: e.target.value })}
                            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          >
                            {PERCENTAGE_BASES.map((b) => (
                              <option key={b.value} value={b.value}>{b.label}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {method === 'drive_time' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Route Mileage Basis
                          </label>
                          <select
                            disabled={isReadOnly}
                            value={fee.route_basis || 'radius'}
                            onChange={(e) => handleUpdate(fee.id, { route_basis: e.target.value })}
                            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          >
                            <option value="radius">Radius (Furthest point from dispatch)</option>
                            <option value="portion">Portion (Office → Origin → Dest → Office)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Billed Units
                          </label>
                          <select
                            disabled={isReadOnly}
                            value={fee.mileage_unit || 'minutes'}
                            onChange={(e) => handleUpdate(fee.id, { mileage_unit: e.target.value })}
                            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          >
                            <option value="minutes">Billable Minutes (billed at crew hourly rate)</option>
                            <option value="currency">Direct Dollar Amount</option>
                          </select>
                        </div>
                      </>
                    )}

                    {method === 'per_mile' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Rate Per Mile ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isReadOnly}
                            value={fee.rate_per_mile || ''}
                            onChange={(e) => handleUpdate(fee.id, { rate_per_mile: e.target.value })}
                            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Included Miles
                          </label>
                          <input
                            type="number"
                            disabled={isReadOnly}
                            value={fee.included_miles || ''}
                            onChange={(e) => handleUpdate(fee.id, { included_miles: e.target.value })}
                            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Actual vs Overage
                          </label>
                          <select
                            disabled={isReadOnly}
                            value={fee.actual_vs_overage || 'actual'}
                            onChange={(e) => handleUpdate(fee.id, { actual_vs_overage: e.target.value })}
                            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          >
                            <option value="actual">Actual Miles (all miles billed if threshold exceeded)</option>
                            <option value="overage">Overage Miles Only (miles beyond included count)</option>
                          </select>
                        </div>
                      </>
                    )}

                    {method === 'per_item_flat' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            First Item Amount ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isReadOnly}
                            value={fee.first_item_amount || fee.amount || ''}
                            onChange={(e) => handleUpdate(fee.id, { first_item_amount: e.target.value })}
                            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Additional Item Amount ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isReadOnly}
                            value={fee.additional_item_amount || ''}
                            onChange={(e) => handleUpdate(fee.id, { additional_item_amount: e.target.value })}
                            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Operational and Payroll flags */}
                  <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    {allowPerTruck && (
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          disabled={isReadOnly}
                          checked={fee.bill_per_truck}
                          onChange={(e) => handleUpdate(fee.id, { bill_per_truck: e.target.checked })}
                          className="rounded text-brand-blue focus:ring-brand-blue"
                        />
                        Bill Fee Per Truck
                      </label>
                    )}

                    {allowCrewSalesPay && (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            disabled={isReadOnly}
                            checked={fee.pay_to_crew}
                            onChange={(e) => handleUpdate(fee.id, { pay_to_crew: e.target.checked })}
                            className="rounded text-brand-blue focus:ring-brand-blue"
                          />
                          Pay to Crew
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            disabled={isReadOnly}
                            checked={fee.pay_to_salespeople}
                            onChange={(e) => handleUpdate(fee.id, { pay_to_salespeople: e.target.checked })}
                            className="rounded text-brand-blue focus:ring-brand-blue"
                          />
                          Pay to Salespeople
                        </label>
                      </>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={fee.editable_on_job !== false}
                        onChange={(e) => handleUpdate(fee.id, { editable_on_job: e.target.checked })}
                        className="rounded text-brand-blue focus:ring-brand-blue"
                      />
                      Name &amp; Description Editable on Job
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {feeList.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            No items configured. Click &quot;Add {categoryTitle.replace(/Fees|Rates|Services/gi, '').trim() || 'Item'}&quot; to create one.
          </div>
        )}
      </div>
    </div>
  );
}
