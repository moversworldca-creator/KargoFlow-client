import React, { useState } from 'react';
import {
  AlertCircle,
  Calculator,
  Check,
  DollarSign,
  Info,
  Loader2,
  Percent,
  Plus,
  RotateCcw,
  Tag,
  Wrench,
  X,
} from 'lucide-react';
import { CATEGORY_PRESENTATION_MAP } from './RedesignEstimateComponents';

const MANUAL_CATEGORIES = [
  { value: 'services', label: 'Additional Services' },
  { value: 'labor', label: 'Labor' },
  { value: 'materials', label: 'Materials' },
  { value: 'storage', label: 'Storage' },
  { value: 'bulky_items', label: 'Bulky Items' },
  { value: 'shuttle', label: 'Shuttle' },
  { value: 'travel', label: 'Trip & Travel' },
  { value: 'other', label: 'Other' },
];

/**
 * Modern Add Charge Modal supporting:
 * 1. Manual line item
 * 2. Discount (Preset or Custom)
 * 3. Quick link to Tariff Inputs
 */
export function AddChargeModal({
  isOpen,
  onClose,
  onAddManual,
  onAddDiscount,
  onFocusTariffInputs,
  discountPresets = [],
  plannedSubJobId,
  isSaving = false,
}) {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'discount' | 'tariff'

  // Manual charge form
  const [manualForm, setManualForm] = useState({
    name: '',
    category: 'services',
    unit_price: '',
    quantity: '1',
    unit: 'each',
    taxable: true,
    description: '',
  });

  // Discount form
  const [discountMode, setDiscountMode] = useState('preset'); // 'preset' | 'custom'
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [customDiscount, setCustomDiscount] = useState({
    name: 'Custom Discount',
    discount_type: 'percentage', // 'percentage' | 'amount'
    value: '10',
  });

  if (!isOpen) return null;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualForm.name.trim()) return;
    if (!manualForm.unit_price || isNaN(Number(manualForm.unit_price))) return;
    onAddManual?.({
      source: 'manual',
      name: manualForm.name.trim(),
      category: manualForm.category,
      unit_price: String(manualForm.unit_price),
      quantity: String(manualForm.quantity || '1'),
      unit: manualForm.unit.trim() || 'each',
      taxable: Boolean(manualForm.taxable),
      description: manualForm.description.trim(),
      planned_sub_job_id: plannedSubJobId ? Number(plannedSubJobId) : undefined,
    });
  };

  const handleDiscountSubmit = (e) => {
    e.preventDefault();
    if (discountMode === 'preset') {
      if (!selectedPresetId) return;
      onAddDiscount?.({
        source: 'discount',
        preset_id: Number(selectedPresetId),
        planned_sub_job_id: plannedSubJobId ? Number(plannedSubJobId) : undefined,
      });
    } else {
      if (!customDiscount.value || isNaN(Number(customDiscount.value))) return;
      onAddDiscount?.({
        source: 'discount',
        name: customDiscount.name.trim() || 'Discount',
        discount_type: customDiscount.discount_type,
        value: String(customDiscount.value),
        planned_sub_job_id: plannedSubJobId ? Number(plannedSubJobId) : undefined,
      });
    }
  };

  return (
    <div
      data-testid="estimate-add-charge-modal"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add to Estimate</h3>
              <p className="text-xs text-slate-500">Add a one-off charge, discount, or review tariff inputs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-100 bg-white px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'manual'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" /> Manual Charge
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discount')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'discount'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Discount
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tariff')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'tariff'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" /> Tariff-Rated Services
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Charge Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hoisting Service, Piano Move, Extra Packing"
                  value={manualForm.name}
                  onChange={(e) => setManualForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Category
                  </label>
                  <select
                    value={manualForm.category}
                    onChange={(e) => setManualForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                  >
                    {MANUAL_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="each, hr, lb, box"
                    value={manualForm.unit}
                    onChange={(e) => setManualForm((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={manualForm.quantity}
                    onChange={(e) => setManualForm((p) => ({ ...p, quantity: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Unit Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={manualForm.unit_price}
                    onChange={(e) => setManualForm((p) => ({ ...p, unit_price: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="manualTaxable"
                  checked={manualForm.taxable}
                  onChange={(e) => setManualForm((p) => ({ ...p, taxable: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                <label htmlFor="manualTaxable" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Taxable line item
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={manualForm.description}
                  onChange={(e) => setManualForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Additional details for this charge..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-800 outline-none focus:border-brand"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !manualForm.name || !manualForm.unit_price}
                  className="px-5 py-2.5 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-dark transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Manual Charge
                </button>
              </div>
            </form>
          )}

          {activeTab === 'discount' && (
            <form onSubmit={handleDiscountSubmit} className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-3">
                <button
                  type="button"
                  onClick={() => setDiscountMode('preset')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    discountMode === 'preset' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Discount Preset
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountMode('custom')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    discountMode === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Custom Discount
                </button>
              </div>

              {discountMode === 'preset' ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Select Preset Discount
                  </label>
                  <select
                    value={selectedPresetId}
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand"
                  >
                    <option value="">-- Choose active preset --</option>
                    {(discountPresets || [])
                      .filter((p) => p.is_active !== false)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} (
                          {p.discount_type === 'amount' || p.discount_type === 'fixed'
                            ? `$${Number(p.value).toFixed(2)}`
                            : `${Number(p.value).toFixed(2).replace(/\.00$/, '')}%`}
                          )
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Discount Name
                    </label>
                    <input
                      type="text"
                      value={customDiscount.name}
                      onChange={(e) => setCustomDiscount((p) => ({ ...p, name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Type
                      </label>
                      <select
                        value={customDiscount.discount_type}
                        onChange={(e) => setCustomDiscount((p) => ({ ...p, discount_type: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="amount">Fixed Amount ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Value
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={customDiscount.discount_type === 'percentage' ? '100' : undefined}
                        value={customDiscount.value}
                        onChange={(e) => setCustomDiscount((p) => ({ ...p, value: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || (discountMode === 'preset' ? !selectedPresetId : !customDiscount.value)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                  Apply Discount
                </button>
              </div>
            </form>
          )}

          {activeTab === 'tariff' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <Info className="w-4 h-4 text-blue-600" />
                  Tariff-Rated Services
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Moving labor, packing, travel, fuel surcharge, valuation, and configured materials are automatically rated
                  by the backend from the assigned tariff.
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  To adjust those charges, modify the rating inputs for the selected job (hours, crew, distance, materials, etc.)
                  and save to reprice.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onFocusTariffInputs?.();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-dark transition flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Open Tariff Inputs
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Edit Charge Modal supporting:
 * - Tariff Line Overrides (allows editing rate/qty with persistent override; restore option)
 * - Manual Line Item edits
 * - Discount Line Item edits
 */
export function EditChargeModal({
  isOpen,
  onClose,
  charge,
  onSave,
  onClearOverride,
  isSaving = false,
}) {
  if (!isOpen || !charge) return null;

  const isTariff = charge.source_type === 'tariff';
  const isDiscount = charge.source_type === 'discount' || charge.category === 'discount';
  const isOverride = Boolean(charge.is_manual_override);

  const [form, setForm] = useState({
    name: charge.name || '',
    description: charge.description || '',
    quantity: String(charge.quantity ?? '1'),
    unit_price: String(charge.unit_price ?? '0'),
    taxable: Boolean(charge.taxable),
    category: charge.category || 'services',
    value: String(charge.metadata?.value ?? charge.total_price ?? ''),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isDiscount) {
      onSave?.({
        name: form.name.trim(),
        value: String(form.value),
      });
    } else {
      onSave?.({
        name: form.name.trim(),
        description: form.description.trim(),
        quantity: String(form.quantity),
        unit_price: String(form.unit_price),
        taxable: Boolean(form.taxable),
        category: form.category,
      });
    }
  };

  return (
    <div
      data-testid="estimate-add-charge-modal"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isTariff ? 'Edit Tariff Line Override' : isDiscount ? 'Edit Discount' : 'Edit Manual Charge'}
              </h3>
              <p className="text-xs text-slate-500">
                {isTariff
                  ? 'Editing rate or quantity creates a manual override'
                  : 'Update line item details'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isTariff && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                Tariff-Generated Line
              </div>
              <p className="text-amber-800 leading-relaxed">
                Calculated tariff amount:{' '}
                <strong className="font-mono">
                  ${charge.metadata?.calculated_amount || charge.total_price}
                </strong>
                . Manual overrides persist across recalculations until restored.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand"
            />
          </div>

          {!isDiscount && !isTariff && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand"
              >
                {MANUAL_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isDiscount ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Discount Value ({charge.metadata?.discount_type === 'percentage' ? '%' : '$'})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={charge.metadata?.discount_type === 'percentage' ? '100' : undefined}
                required
                value={form.value}
                onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Rate / Unit Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.unit_price}
                  onChange={(e) => setForm((p) => ({ ...p, unit_price: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand"
                />
              </div>
            </div>
          )}

          {!isDiscount && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editTaxable"
                checked={form.taxable}
                onChange={(e) => setForm((p) => ({ ...p, taxable: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
              <label htmlFor="editTaxable" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Taxable line item
              </label>
            </div>
          )}

          {!isDiscount && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-800 outline-none focus:border-brand"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {isTariff && isOverride ? (
              <button
                type="button"
                onClick={() => onClearOverride?.(charge)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Tariff Price
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-brand text-xs font-bold text-white hover:bg-brand-dark transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isTariff ? 'Save Override' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
