import React, { useEffect, useState } from 'react';
import { Edit2, Loader2, Percent, Plus, Search, Tag, Trash2 } from 'lucide-react';

import Card from '../../../shared/ui/Card';
import useCan from '../../../shared/auth/useCan';
import { useToast } from '../../../shared/context/ToastContext';
import {
  createEstimateDiscountPreset,
  deleteEstimateDiscountPreset,
  getEstimateDiscountPresets,
  seedEstimateDiscountPresets,
  updateEstimateDiscountPreset,
} from '../../../services/api';
import { PERMISSIONS } from '../../../shared/permissions/registry';

const INITIAL_FORM = {
  label: '',
  discount_type: 'percent',
  value: '5',
  sort_order: 0,
  is_active: true,
};

const fmtValue = (row) => {
  const value = Number(row?.value || 0);
  if (String(row?.discount_type || '') === 'fixed') {
    return `$${value.toFixed(2)}`;
  }
  return `${value.toFixed(2).replace(/\.00$/, '')}%`;
};

const EstimateDiscountPresetSettings = () => {
  const { canAll } = useCan();
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const loadRows = async () => {
    setLoading(true);
    try {
      const response = await getEstimateDiscountPresets({ is_active: 'true' });
      const nextRows = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : [];
      setRows(nextRows);
    } catch (err) {
      console.error('Failed to load estimate discount presets:', err);
      showToast('Failed to load estimate discount presets.', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const resetForm = () => {
    setEditingRow(null);
    setFormData(INITIAL_FORM);
  };

  const openModal = (row = null) => {
    if (row) {
      setEditingRow(row);
      setFormData({
        label: row.label || '',
        discount_type: row.discount_type || 'percent',
        value: String(row.value ?? '0'),
        sort_order: Number(row.sort_order || 0),
        is_active: row.is_active !== false,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!canAll([PERMISSIONS.DISCOUNTS_MANAGE])) {
      showToast('You do not have permission to manage estimate discounts.', 'warning');
      return;
    }

    const label = String(formData.label || '').trim();
    const value = Number(formData.value || 0);
    if (!label) {
      showToast('Preset label is required.', 'warning');
      return;
    }
    if (!Number.isFinite(value) || value < 0) {
      showToast('Preset value must be 0 or more.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        label,
        discount_type: String(formData.discount_type || 'percent'),
        value,
        sort_order: Number(formData.sort_order || 0),
        is_active: formData.is_active !== false,
      };
      if (editingRow?.id && !String(editingRow.id).startsWith('default-')) {
        await updateEstimateDiscountPreset(editingRow.id, payload);
      } else {
        await createEstimateDiscountPreset(payload);
      }
      await loadRows();
      closeModal();
      showToast('Estimate discount preset saved.', 'success');
    } catch (err) {
      console.error('Failed to save estimate discount preset:', err);
      const detail = err?.response?.data?.detail || err?.response?.data?.label?.[0] || 'Failed to save estimate discount preset.';
      showToast(detail, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!canAll([PERMISSIONS.DISCOUNTS_MANAGE])) {
      showToast('You do not have permission to delete estimate discount presets.', 'warning');
      return;
    }
    if (!row?.id || String(row.id).startsWith('default-')) {
      showToast('Seed or save defaults before deleting them.', 'warning');
      return;
    }
    if (!window.confirm(`Delete "${row.label}"?`)) return;
    try {
      await deleteEstimateDiscountPreset(row.id);
      await loadRows();
      showToast('Estimate discount preset deleted.', 'success');
    } catch (err) {
      console.error('Failed to delete estimate discount preset:', err);
      const detail = err?.response?.data?.detail || 'Failed to delete estimate discount preset.';
      showToast(detail, 'error');
    }
  };

  const handleSeed = async () => {
    if (!canAll([PERMISSIONS.DISCOUNTS_MANAGE])) {
      showToast('You do not have permission to seed default estimate discounts.', 'warning');
      return;
    }
    setSeeding(true);
    try {
      await seedEstimateDiscountPresets();
      await loadRows();
      showToast('Default estimate discount presets seeded.', 'success');
    } catch (err) {
      console.error('Failed to seed estimate discount presets:', err);
      showToast('Failed to seed default estimate discount presets.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const filteredRows = rows.filter((row) =>
    `${row?.label || ''} ${row?.discount_type || ''}`.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-card p-6 rounded-2xl border border-subtle shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h3 className="text-2xl font-black bg-gradient-to-br from-heading to-body bg-clip-text text-transparent font-heading tracking-tight">Estimate Discount Presets</h3>
          <p className="text-sm text-body mt-1 max-w-lg">Manage preset fixed or percentage discounts that estimators can apply from the estimate totals card.</p>
        </div>
        <div className="flex flex-wrap gap-3 relative z-10">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 rounded-xl border border-subtle bg-card px-4 py-2 text-sm font-bold text-heading transition-all hover:border-brand/30 hover:bg-brand/5 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            {seeding ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} className="text-brand" />}
            Seed Defaults
          </button>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-disabled group-focus-within:text-brand transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search discounts..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-9 pr-4 py-2.5 bg-page border border-subtle rounded-xl text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all w-full sm:w-64 font-medium"
            />
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-brand to-brand-dark text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-pop hover:-translate-y-0.5 transition-all"
          >
            <Plus size={18} /> Add Preset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-brand/20 bg-brand/5">
          <h4 className="text-xl font-bold text-heading">{searchTerm ? 'No matches found' : 'No discount presets configured'}</h4>
          <p className="text-sm text-body mt-2 max-w-sm mx-auto">
            {searchTerm ? 'Try a different search term.' : 'Seed defaults or add your first estimate discount preset.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRows.map((row) => (
            <Card key={row.id} className="p-5 flex flex-col gap-4 border border-subtle">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-heading">{row.label}</div>
                  <div className="text-xs text-body mt-1 inline-flex items-center gap-1.5">
                    <Percent size={12} />
                    {fmtValue(row)} · {row.discount_type === 'fixed' ? 'Fixed' : 'Percent'}
                  </div>
                </div>
                <div className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${row.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {row.is_active !== false ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="text-xs text-slate-400">Sort order: {Number(row.sort_order || 0)}</div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => openModal(row)}
                  className="rounded-xl border border-subtle px-3 py-2 text-sm font-bold text-heading hover:border-brand/30 hover:text-brand transition-all"
                >
                  <span className="inline-flex items-center gap-2"><Edit2 size={14} /> Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(row)}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-all"
                >
                  <span className="inline-flex items-center gap-2"><Trash2 size={14} /> Delete</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
            <div className="bg-brand text-white px-6 py-4">
              <h3 className="font-black uppercase tracking-tight">{editingRow ? 'Edit Discount Preset' : 'Add Discount Preset'}</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Preset Label</span>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(event) => setFormData((prev) => ({ ...prev, label: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                  placeholder="Enter preset label"
                />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Type</span>
                  <select
                    value={formData.discount_type}
                    onChange={(event) => setFormData((prev) => ({ ...prev, discount_type: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                  >
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Value</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.value}
                    onChange={(event) => setFormData((prev) => ({ ...prev, value: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sort Order</span>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(event) => setFormData((prev) => ({ ...prev, sort_order: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-heading">
                <input
                  type="checkbox"
                  checked={formData.is_active !== false}
                  onChange={(event) => setFormData((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                Active
              </label>
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-subtle px-4 py-2 text-sm font-bold text-heading"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EstimateDiscountPresetSettings;
