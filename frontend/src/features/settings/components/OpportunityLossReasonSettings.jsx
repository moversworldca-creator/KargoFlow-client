import React, { useEffect, useState } from 'react';
import { Edit2, ListChecks, Loader2, Plus, Search, Tag, Trash2, X } from 'lucide-react';

import Card from '../../../shared/ui/Card';
import useCan from '../../../shared/auth/useCan';
import { useToast } from '../../../shared/context/ToastContext';
import {
  createOpportunityLossReason,
  deleteOpportunityLossReason,
  getOpportunityLossReasons,
  seedOpportunityLossReasons,
  updateOpportunityLossReason,
} from '../../../services/api';
import { PERMISSIONS } from '../../../shared/permissions/registry';

const INITIAL_FORM = {
  label: '',
  sort_order: 0,
  is_active: true,
};

const OpportunityLossReasonSettings = () => {
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
      const response = await getOpportunityLossReasons();
      const nextRows = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : [];
      setRows(nextRows);
    } catch (err) {
      console.error('Failed to load opportunity loss reasons:', err);
      showToast('Failed to load opportunity loss reasons.', 'error');
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
        label: row.label || row.name || '',
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
    if (!canAll([PERMISSIONS.SALES_CHANGE_STATUS_CODE])) {
      showToast('You do not have permission to manage loss reasons.', 'warning');
      return;
    }

    const label = String(formData.label || '').trim();
    if (!label) {
      showToast('Reason label is required.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: label,
        label,
        code: label.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 50),
        sort_order: Number(formData.sort_order || 0),
        is_active: formData.is_active !== false,
      };
      if (editingRow?.id && !String(editingRow.id).startsWith('default-')) {
        await updateOpportunityLossReason(editingRow.id, payload);
        showToast('Loss reason updated.', 'success');
      } else {
        await createOpportunityLossReason(payload);
        showToast('Loss reason created.', 'success');
      }
      closeModal();
      await loadRows();
    } catch (err) {
      console.error('Failed to save opportunity loss reason:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to save loss reason.';
      showToast(detail, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!canAll([PERMISSIONS.SALES_CHANGE_STATUS_CODE])) {
      showToast('You do not have permission to delete loss reasons.', 'warning');
      return;
    }
    if (!window.confirm(`Delete "${row.label}"?`)) return;
    try {
      await deleteOpportunityLossReason(row.id);
      showToast('Loss reason deleted.', 'success');
      await loadRows();
    } catch (err) {
      console.error('Failed to delete opportunity loss reason:', err);
      showToast('Failed to delete loss reason.', 'error');
    }
  };

  const handleSeed = async () => {
    if (!canAll([PERMISSIONS.SALES_CHANGE_STATUS_CODE])) {
      showToast('You do not have permission to seed loss reasons.', 'warning');
      return;
    }
    setSeeding(true);
    try {
      await seedOpportunityLossReasons();
      await loadRows();
      showToast('Default opportunity loss reasons seeded.', 'success');
    } catch (err) {
      console.error('Failed to seed opportunity loss reasons:', err);
      showToast('Failed to seed default opportunity loss reasons.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const filteredRows = rows.filter((row) =>
    String(row?.label || '').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Compact Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3 dark:border-slate-700">
            <ListChecks size={14} className="text-primary" />
            <span className="text-xs font-bold text-heading dark:text-white">Loss Reasons</span>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Search loss reasons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1 pl-8 pr-2.5 text-xs font-medium outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {seeding ? <Loader2 size={12} className="animate-spin" /> : <Tag size={12} />}
            Seed Defaults
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus size={13} /> Add Reason
          </button>
        </div>
      </div>

      {loading && !rows.length ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={20} />
        </div>
      ) : (
        <Card className="!p-0 !rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-body dark:border-slate-800 dark:bg-slate-900">
                  <th className="px-3.5 py-2.5">Reason Label</th>
                  <th className="px-3.5 py-2.5">Sort Order</th>
                  <th className="px-3.5 py-2.5 text-center">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3.5 py-2">
                      <div className="font-bold text-xs text-heading dark:text-white">{row.label}</div>
                    </td>
                    <td className="px-3.5 py-2 font-mono text-xs text-body">{Number(row.sort_order || 0)}</td>
                    <td className="px-3.5 py-2 text-center">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await updateOpportunityLossReason(row.id, { is_active: !row.is_active });
                            await loadRows();
                          } catch (err) {
                            console.error('Toggle status failed:', err);
                          }
                        }}
                        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${row.is_active !== false ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${row.is_active !== false ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openModal(row)}
                          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-3.5 py-6 text-center text-xs text-body">
                      No opportunity loss reasons found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-heading dark:text-white">
                {editingRow ? 'Edit Loss Reason' : 'New Loss Reason'}
              </h4>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 pt-3">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-body">Reason Label *</span>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(event) => setFormData((prev) => ({ ...prev, label: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="e.g., Price Too High, Chose Competitor"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-body">Sort Order</span>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(event) => setFormData((prev) => ({ ...prev, sort_order: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-heading dark:text-white select-none pt-1">
                <input
                  type="checkbox"
                  checked={formData.is_active !== false}
                  onChange={(event) => setFormData((prev) => ({ ...prev, is_active: event.target.checked }))}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0"
                />
                <span>Active Status</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-body hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityLossReasonSettings;
