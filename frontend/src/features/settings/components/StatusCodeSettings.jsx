import React, { useEffect, useRef, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Tag, Check, X } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import useCan from '../../../shared/auth/useCan';
import { useToast } from '../../../shared/context/ToastContext';
import {
  getStatusCodes,
  createStatusCode,
  updateStatusCode,
  deleteStatusCode,
  seedStatusCodes,
} from '../../../services/api';
import { PERMISSIONS } from '../../../shared/permissions/registry';

const INITIAL_FORM = {
  code: '',
  label: '',
  color_hex: '#888780',
  maps_to_workflow_stage: 'opportunity',
  is_default: false,
  sort_order: 0,
  is_active: true,
};

const normalizeHexColor = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const prefixed = raw.startsWith('#') ? raw : `#${raw}`;
  const shortHexMatch = prefixed.match(/^#([0-9a-f]{3})$/i);
  if (shortHexMatch) {
    return `#${shortHexMatch[1].split('').map((char) => char + char).join('')}`.toUpperCase();
  }
  const longHexMatch = prefixed.match(/^#([0-9a-f]{6})$/i);
  if (longHexMatch) {
    return `#${longHexMatch[1].toUpperCase()}`;
  }
  return null;
};

const StatusCodeSettings = () => {
  const { canAll } = useCan();
  const { showToast } = useToast();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSeeding, setIsSeeding] = useState(false);
  const colorPickerRef = useRef(null);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    fetchCodes(0, false);
  }, [searchTerm]);

  const fetchCodes = async (nextOffset = 0, append = false) => {
    setLoading(true);
    try {
      const response = await getStatusCodes({
        search: searchTerm || undefined,
        offset: nextOffset,
        limit: 50,
      });
      const rows = Array.isArray(response?.results)
        ? response.results
        : Array.isArray(response)
          ? response
          : [];
      setHasMore(Boolean(response?.next || response?.hasMore));
      setOffset(nextOffset);
      setCodes((prev) => {
        if (!append) return rows;
        const existingIds = new Set(prev.map((item) => item.id));
        return [...prev, ...rows.filter((item) => !existingIds.has(item.id))];
      });
    } catch (err) {
      console.error('Failed to fetch status codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingCode(null);
    setFormData(INITIAL_FORM);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canAll([editingCode ? PERMISSIONS.SALES_CHANGE_STATUS_CODE : PERMISSIONS.SALES_ADD_STATUS_CODE])) {
      showToast('You do not have permission to save custom statuses.', 'warning');
      return;
    }
    try {
      const normalizedColorHex = normalizeHexColor(formData.color_hex);
      if (!normalizedColorHex) {
        showToast('Color must be a valid hex value like #000000.', 'warning');
        return;
      }
      const payload = { ...formData, color_hex: normalizedColorHex, entity_type: 'shared' };
      if (editingCode) {
        const updated = await updateStatusCode(editingCode.id, payload);
        setCodes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        showToast('Status code updated.', 'success');
      } else {
        const created = await createStatusCode(payload);
        setCodes((prev) => [...prev, created]);
        showToast('Status code created.', 'success');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Save custom status failed:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to save custom status.';
      showToast(detail, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!canAll([PERMISSIONS.SALES_DELETE_STATUS_CODE])) {
      showToast('You do not have permission to delete status codes.', 'warning');
      return;
    }
    if (!window.confirm('Delete this status code?')) return;
    try {
      await deleteStatusCode(id);
      setCodes((prev) => prev.filter((item) => item.id !== id));
      showToast('Status code deleted.', 'success');
    } catch (err) {
      console.error('Failed to delete status code:', err);
      showToast('Failed to delete status code.', 'error');
    }
  };

  const handleSeedDefaults = async () => {
    if (!canAll([PERMISSIONS.SALES_ADD_STATUS_CODE])) {
      showToast('You do not have permission to seed status codes.', 'warning');
      return;
    }
    setIsSeeding(true);
    try {
      await seedStatusCodes({});
      await fetchCodes(0, false);
      showToast('Company default statuses seeded successfully.', 'success');
    } catch (err) {
      console.error('Failed to seed default status codes:', err);
      showToast('Failed to seed default status codes.', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDragStart = (e, index) => {
    if (searchTerm) return;
    dragItem.current = index;
  };

  const handleDragEnter = (e, index) => {
    if (searchTerm) return;
    dragOverItem.current = index;
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    setDragOverIndex(null);
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newCodes = [...filteredCodes];
      const draggedItem = newCodes[dragItem.current];
      newCodes.splice(dragItem.current, 1);
      newCodes.splice(dragOverItem.current, 0, draggedItem);

      const updatedIds = [];
      const updatedCodes = newCodes.map((item, idx) => {
        if (item.sort_order !== idx) {
          updatedIds.push({ id: item.id, sort_order: idx });
          return { ...item, sort_order: idx };
        }
        return item;
      });

      setCodes((prev) => {
        const idMap = new Map(updatedCodes.map((c) => [c.id, c]));
        return prev
          .map((c) => (idMap.has(c.id) ? idMap.get(c.id) : c))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      });

      for (const update of updatedIds) {
        try {
          await updateStatusCode(update.id, { sort_order: update.sort_order });
        } catch (err) {
          console.error('Failed to update sort order:', err);
        }
      }
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const openModal = (code = null) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        ...INITIAL_FORM,
        ...code,
        color_hex: normalizeHexColor(code.color_hex) || INITIAL_FORM.color_hex,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const filteredCodes = codes.filter((item) =>
    (item.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !codes.length) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Compact Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3 dark:border-slate-700">
            <Tag size={14} className="text-primary" />
            <span className="text-xs font-bold text-heading dark:text-white">Statuses</span>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Search status badges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1 pl-8 pr-2.5 text-xs font-medium outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canAll([PERMISSIONS.SALES_ADD_STATUS_CODE]) && (
            <button
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {isSeeding ? <Loader2 size={12} className="animate-spin" /> : <Tag size={12} />}
              Seed Defaults
            </button>
          )}
          {canAll([PERMISSIONS.SALES_ADD_STATUS_CODE]) && (
            <button
              onClick={() => openModal()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90"
            >
              <Plus size={13} /> Add Status
            </button>
          )}
        </div>
      </div>

      {/* Compact Table */}
      <Card className="!p-0 !rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-body dark:border-slate-800 dark:bg-slate-900">
                <th className="px-3.5 py-2.5">Badge & Label</th>
                <th className="px-3.5 py-2.5">Code Key</th>
                <th className="px-3.5 py-2.5">Stage Mapping</th>
                <th className="px-3.5 py-2.5 text-center">Default</th>
                <th className="px-3.5 py-2.5 text-center">Status</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCodes.map((item, index) => (
                <tr
                  key={item.id}
                  draggable={!searchTerm}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${!searchTerm ? 'cursor-grab active:cursor-grabbing' : ''} ${dragOverIndex === index ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-3.5 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
                        style={{
                          backgroundColor: `${item.color_hex}15`,
                          color: item.color_hex,
                          border: `1px solid ${item.color_hex}30`,
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color_hex }} />
                        {item.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2 font-mono text-xs text-body">{item.code || '-'}</td>
                  <td className="px-3.5 py-2 text-xs font-semibold capitalize text-heading dark:text-white">
                    {item.maps_to_workflow_stage || 'opportunity'}
                  </td>
                  <td className="px-3.5 py-2 text-center">
                    {item.is_default && (
                      <span className="rounded bg-primary-tint/40 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                        Default
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-center">
                    <button
                      type="button"
                      disabled={!canAll([PERMISSIONS.SALES_CHANGE_STATUS_CODE])}
                      onClick={async () => {
                        try {
                          const updated = await updateStatusCode(item.id, { is_active: !item.is_active });
                          setCodes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                        } catch (err) {
                          console.error('Failed to toggle status:', err);
                        }
                      }}
                      className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${item.is_active !== false ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${item.is_active !== false ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-3.5 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openModal(item)}
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCodes.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-3.5 py-6 text-center text-xs text-body">
                    No status codes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Compact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-heading dark:text-white">
                {editingCode ? 'Edit Status Badge' : 'New Status Badge'}
              </h4>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-body">Label *</span>
                  <input
                    value={formData.label}
                    onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g., Quoted"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-body">System Code</span>
                  <input
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_') }))}
                    placeholder="quoted"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium font-mono outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-body">Workflow Stage</span>
                  <select
                    value={formData.maps_to_workflow_stage}
                    onChange={(e) => setFormData((prev) => ({ ...prev, maps_to_workflow_stage: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="lead">Lead</option>
                    <option value="opportunity">Opportunity</option>
                    <option value="booked">Booked</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>

                <div className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-body">Badge Color</span>
                  <div className="flex items-center gap-2">
                    <input
                      ref={colorPickerRef}
                      type="color"
                      value={normalizeHexColor(formData.color_hex) || INITIAL_FORM.color_hex}
                      onChange={(e) => setFormData((prev) => ({ ...prev, color_hex: e.target.value.toUpperCase() }))}
                      className="sr-only"
                    />
                    <button
                      type="button"
                      onClick={() => colorPickerRef.current?.click()}
                      className="h-8 w-8 rounded-lg border border-slate-200 shadow-sm shrink-0"
                      style={{ backgroundColor: normalizeHexColor(formData.color_hex) || INITIAL_FORM.color_hex }}
                    />
                    <input
                      type="text"
                      value={formData.color_hex}
                      onChange={(e) => setFormData((prev) => ({ ...prev, color_hex: e.target.value.toUpperCase() }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono font-medium outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-heading dark:text-white select-none">
                  <input
                    type="checkbox"
                    checked={!!formData.is_default}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_default: e.target.checked }))}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span>Default Stage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-heading dark:text-white select-none">
                  <input
                    type="checkbox"
                    checked={!!formData.is_active}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-body hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusCodeSettings;
