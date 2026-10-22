import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Card from '../../../shared/ui/Card';
import {
  Plus, Edit2, Trash2, Search, GripVertical,
  XCircle, Loader2, CheckCircle2,
  AlertCircle, Layout, MoreHorizontal
} from 'lucide-react';
import {
  getMoverSizes, createMoverSize, updateMoverSize, deleteMoverSize
} from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';

const MoverSizeSettings = ({ branchId }) => {
  const { user } = useAuth();
  const loadRequestRef = useRef(0);
  const [moverSizes, setMoverSizes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const [showModal, setShowModal] = useState(false);
  const [editingSize, setEditingSize] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [draggedSizeId, setDraggedSizeId] = useState(null);
  const [dragOverSizeId, setDragOverSizeId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_volume_cuft: '',
    default_weight_lbs: '',
    is_active: true
  });

  const fetchData = useCallback(async (requestId) => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const params = branchId ? { branch_id: Number(branchId) } : undefined;
      const response = await getMoverSizes(params);
      const data = Array.isArray(response) ? response : (response?.results || []);
      if (requestId !== loadRequestRef.current) return;
      setMoverSizes(data);
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      console.error('Failed to load mover sizes:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to load mover sizes.';
      setMessage({ type: 'error', text: detail });
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    const requestId = ++loadRequestRef.current;
    fetchData(requestId);
    return () => {
      if (loadRequestRef.current === requestId) loadRequestRef.current += 1;
    };
  }, [fetchData]);

  const orderedSizes = useMemo(
    () => [...moverSizes].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)),
    [moverSizes]
  );

  const filteredSizes = orderedSizes.filter(t =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const canReorder = !searchTerm.trim();

  const persistSortOrder = async (nextSizes) => {
    const previousById = new Map(orderedSizes.map((item) => [String(item.id), Number(item.sort_order ?? 0)]));
    const changes = nextSizes.filter((item, index) => previousById.get(String(item.id)) !== index);
    if (!changes.length) return;
    const previousSizes = moverSizes;
    setMoverSizes(nextSizes);
    try {
      await Promise.all(changes.map((item) => updateMoverSize(item.id, { sort_order: nextSizes.findIndex((row) => String(row.id) === String(item.id)) })));
      setMessage({ type: 'success', text: 'Move size order updated.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('[MoverSizeSettings] reorder failed:', err);
      setMoverSizes(previousSizes);
      setMessage({ type: 'error', text: 'Failed to update move size order.' });
    } finally {
      setDraggedSizeId(null);
      setDragOverSizeId(null);
    }
  };

  const handleDragStart = (event, size) => {
    if (!canReorder) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(size.id));
    setDraggedSizeId(size.id);
  };

  const handleDragOver = (event, size) => {
    if (!canReorder || !draggedSizeId || String(draggedSizeId) === String(size.id)) return;
    event.preventDefault();
    setDragOverSizeId(size.id);
  };

  const handleDrop = async (event, targetSize) => {
    if (!canReorder) return;
    event.preventDefault();
    const sourceId = String(event.dataTransfer.getData('text/plain') || draggedSizeId || '');
    if (!sourceId || sourceId === String(targetSize.id)) {
      setDraggedSizeId(null);
      setDragOverSizeId(null);
      return;
    }
    const sourceIndex = orderedSizes.findIndex((item) => String(item.id) === sourceId);
    const targetIndex = orderedSizes.findIndex((item) => String(item.id) === String(targetSize.id));
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...orderedSizes];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    await persistSortOrder(next.map((item, index) => ({ ...item, sort_order: index })));
  };

  const handleOpenModal = (size = null) => {
    if (size) {
      setEditingSize(size);
      setFormData({
        name: size.name || '',
        description: size.description || '',
        default_volume_cuft: size.default_volume_cuft != null ? String(size.default_volume_cuft) : '',
        default_weight_lbs: size.default_weight_lbs != null ? String(size.default_weight_lbs) : '',
        is_active: size.is_active !== false
      });
    } else {
      setEditingSize(null);
      setFormData({
        name: '',
        description: '',
        default_volume_cuft: '',
        default_weight_lbs: '',
        is_active: true
      });
    }
    setShowModal(true);
    setOpenMenuId(null);
  };

  const handleToggleActive = async (size) => {
    if (!size) return;
    setIsSaving(true);
    try {
      const payload = {
        ...size,
        is_active: !size.is_active
      };
      const updated = await updateMoverSize(size.id, payload);
      setMoverSizes(moverSizes.map(t => t.id === size.id ? updated : t));
      setMessage({ type: 'success', text: `Size ${updated.is_active ? 'activated' : 'deactivated'} successfully!` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Toggle failed:', err);
      setMessage({ type: 'error', text: 'Failed to update status.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        is_active: Boolean(formData.is_active),
        code: formData.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 80)
      };
      if (branchId) {
        payload.branch_id = Number(branchId);
      }
      if (formData.default_volume_cuft !== '' && formData.default_volume_cuft !== null && formData.default_volume_cuft !== undefined) {
        payload.default_volume_cuft = Number(formData.default_volume_cuft);
      }
      if (formData.default_weight_lbs !== '' && formData.default_weight_lbs !== null && formData.default_weight_lbs !== undefined) {
        payload.default_weight_lbs = Number(formData.default_weight_lbs);
      }
      if (editingSize) {
        const updated = await updateMoverSize(editingSize.id, payload);
        setMoverSizes(moverSizes.map(t => t.id === editingSize.id ? updated : t));
        setMessage({ type: 'success', text: 'Move size updated successfully!' });
      } else {
        const created = await createMoverSize(payload);
        setMoverSizes([...moverSizes, created]);
        setMessage({ type: 'success', text: 'New move size created successfully!' });
      }
      setShowModal(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      const detail = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to save move size.';
      setMessage({ type: 'error', text: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (size) => {
    setDeleteTarget(size);
    setShowDeleteConfirm(true);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deleteMoverSize(deleteTarget.id);
      setMoverSizes(moverSizes.filter(t => t.id !== deleteTarget.id));
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      setMessage({ type: 'success', text: 'Move size deleted successfully.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Delete failed:', err);
      setMessage({ type: 'error', text: 'Failed to delete move size.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-heading tracking-tight">
              Move Sizes <span className="sr-only">Mover Sizes</span>
            </h3>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {filteredSizes.length} {filteredSizes.length === 1 ? 'size' : 'sizes'}
            </span>
          </div>
          <p className="text-xs text-muted">Manage move size classifications, default volumes, and weights for quotes.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-44 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" size={14} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sizes..."
              className="w-full pl-8 pr-3 h-8 bg-card border border-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary/20 sm:w-64"
            />
          </div>
          <button
            type="button"
            aria-label="Add Size - Add Move Size"
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-1.5 h-8 px-3.5 bg-primary text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#003d2f] transition-all active:scale-95 whitespace-nowrap shrink-0"
          >
            <Plus size={14} /> Add Move Size
          </button>
        </div>
      </div>
      {!canReorder && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          Clear search to drag and reorder move sizes.
        </div>
      )}

      {message.text && (
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-xs animate-in slide-in-from-top-1 ${message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}>
          {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{message.text}</span>
        </div>
      )}

      <Card className="overflow-hidden border border-border/80 shadow-xs bg-card rounded-xl !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-subtle/60 border-b border-border">
                <th className="w-[24%] min-w-[120px] px-3 sm:px-6 py-2 sm:py-2.5 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Name</th>
                <th className="w-[32%] min-w-[140px] px-3 sm:px-6 py-2 sm:py-2.5 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Description</th>
                <th className="w-[15%] min-w-[90px] px-3 sm:px-6 py-2 sm:py-2.5 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Default Volume</th>
                <th className="w-[15%] min-w-[90px] px-3 sm:px-6 py-2 sm:py-2.5 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Default Weight</th>
                <th className="w-20 min-w-[70px] px-3 sm:px-6 py-2 sm:py-2.5 text-[0.625rem] font-bold uppercase tracking-widest text-muted text-center">Status</th>
                <th className="w-16 min-w-[60px] px-3 sm:px-6 py-2 sm:py-2.5 text-[0.625rem] font-bold uppercase tracking-widest text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/70">
              {filteredSizes.length > 0 ? (
                filteredSizes.map((size) => (
                  <tr
                    key={size.id}
                    className={`transition-colors group ${dragOverSizeId === size.id ? 'bg-primary/5' : 'hover:bg-subtle/50'}`}
                    onDragOver={(e) => handleDragOver(e, size)}
                    onDrop={(e) => handleDrop(e, size)}
                  >
                    <td className="px-3 sm:px-6 py-2 sm:py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          draggable={canReorder}
                          onDragStart={(e) => handleDragStart(e, size)}
                          onDragEnd={() => { setDraggedSizeId(null); setDragOverSizeId(null); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted transition-all ${canReorder ? 'cursor-grab active:cursor-grabbing hover:text-body hover:border-primary/40' : 'cursor-not-allowed opacity-40'}`}
                          aria-label={`Drag ${size.name} to reorder`}
                          title={canReorder ? 'Drag to reorder' : 'Clear search to reorder'}
                        >
                          <GripVertical size={13} />
                        </button>
                        <span className="text-xs font-semibold text-heading truncate">{size.name}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-2.5">
                      <p className="text-xs text-muted max-w-xs truncate">{size.description || '-'}</p>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-2.5">
                      <span className="text-xs text-body font-medium">{size.default_volume_cuft != null && size.default_volume_cuft !== '' ? `${size.default_volume_cuft} cu ft` : '-'}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-2.5">
                      <span className="text-xs text-body font-medium">{size.default_weight_lbs != null && size.default_weight_lbs !== '' ? `${size.default_weight_lbs} lbs` : '-'}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(size)}
                        disabled={isSaving}
                        className={`relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full transition-colors ${size.is_active ? 'bg-primary' : 'bg-disabled'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-xs transition-transform ${size.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-2.5 text-right relative whitespace-nowrap">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === size.id ? null : size.id)}
                        className="p-1 text-muted hover:text-body hover:bg-border/60 rounded-md transition-all"
                      >
                        <MoreHorizontal size={15} />
                      </button>

                      {openMenuId === size.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-2 sm:right-6 mt-1 w-32 bg-card rounded-lg shadow-lg border border-border z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={() => handleOpenModal(size)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-body hover:bg-subtle transition-colors"
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={() => confirmDelete(size)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-status-lost-text hover:bg-status-lost-bg transition-colors"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-muted">
                    <Layout size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium text-body">No move sizes found.</p>
                    <p className="text-[11px] text-muted mt-0.5 mb-3">Add your home size classifications to calculate quote volume and weight accurately.</p>
                    <button
                      type="button"
                      onClick={() => handleOpenModal()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#003d2f] transition-all"
                    >
                      <Plus size={13} /> Add Move Size
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredSizes.length > 0 && (
          <div className="flex items-center justify-between px-3 sm:px-6 py-2 bg-subtle/30 border-t border-border text-[11px] text-muted">
            <span>{filteredSizes.length} {filteredSizes.length === 1 ? 'size' : 'sizes'} configured</span>
            <span className="hidden sm:inline">Drag handle to reorder quotes priority</span>
          </div>
        )}
      </Card>

      {/* EDIT/CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4 backdrop-blur-sm">
          <Card className="max-w-xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold text-heading">
                {editingSize ? 'Edit Mover Size' : 'New Mover Size'}
              </h3>
              <button onClick={() => setShowModal(false)}><XCircle className="text-disabled hover:text-muted" /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted ml-1">Size Name*</label>
                  <input
                    required
                    placeholder="e.g. 1 Bedroom Apartment, Studio, 3 Bedroom House"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-subtle border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted ml-1">Default Volume (cu ft)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 450"
                    value={formData.default_volume_cuft}
                    onChange={(e) => setFormData({ ...formData, default_volume_cuft: e.target.value })}
                    className="w-full px-4 py-3 bg-subtle border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted ml-1">Default Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 3150"
                    value={formData.default_weight_lbs}
                    onChange={(e) => setFormData({ ...formData, default_weight_lbs: e.target.value })}
                    className="w-full px-4 py-3 bg-subtle border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted ml-1">Description</label>
                  <textarea
                    placeholder="Optional notes or details about this home size"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-subtle border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 min-h-[90px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-subtle rounded-xl">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-body">Active Status</p>
                  <p className="text-xs text-muted">Allow this size to be selected in new quotes and estimates.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_active ? 'bg-primary' : 'bg-disabled'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-border text-body rounded-xl font-bold hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-[#003d2f] disabled:opacity-50 transition-all"
                >
                  {isSaving ? <Loader2 className="mx-auto animate-spin" size={20} /> : (editingSize ? 'Update Changes' : 'Create Size')}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[70] p-4 backdrop-blur-sm">
          <Card className="max-w-md w-full p-8 text-center space-y-6 rounded-3xl shadow-2xl animate-in zoom-in duration-200">
            <div className="w-20 h-20 bg-status-lost-bg rounded-full flex items-center justify-center mx-auto text-status-lost-bg0">
              <Trash2 size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-heading">Delete Mover Size?</h3>
              <p className="text-muted text-sm">
                Are you sure you want to delete <span className="font-bold text-body">"{deleteTarget?.name}"</span>?
                This action cannot be undone and may affect existing records.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-border text-body rounded-xl font-bold hover:bg-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="flex-1 py-3 bg-status-lost-bg0 text-white rounded-xl font-bold shadow-md hover:bg-status-lost-text disabled:opacity-50 transition-all"
              >
                {isSaving ? <Loader2 className="mx-auto animate-spin" size={20} /> : 'Delete Size'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MoverSizeSettings;
