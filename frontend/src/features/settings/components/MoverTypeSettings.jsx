import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Card from '../../../shared/ui/Card';
import {
  Plus, Edit2, Trash2, Search, GripVertical,
  XCircle, Loader2, CheckCircle2,
  AlertCircle, Layout, MoreHorizontal
} from 'lucide-react';
import { 
  getMoverTypes, createMoverType, updateMoverType, deleteMoverType 
} from '../../../services/api';

const MoverTypeSettings = () => {
  const loadRequestRef = useRef(0);
  const [moverTypes, setMoverTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [draggedTypeId, setDraggedTypeId] = useState(null);
  const [dragOverTypeId, setDragOverTypeId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  const fetchData = useCallback(async (requestId) => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await getMoverTypes();
      const data = Array.isArray(response) ? response : (response?.results || []);
      if (requestId !== loadRequestRef.current) return;
      setMoverTypes(data);
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      console.error('Failed to load move types:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to load move types.';
      setMessage({ type: 'error', text: detail });
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const requestId = ++loadRequestRef.current;
    fetchData(requestId);
    return () => {
      if (loadRequestRef.current === requestId) loadRequestRef.current += 1;
    };
  }, [fetchData]);

  const orderedTypes = useMemo(
    () => [...moverTypes].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)),
    [moverTypes]
  );

  const filteredTypes = orderedTypes.filter(t => 
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  const canReorder = !searchTerm.trim();

  const persistSortOrder = async (nextTypes) => {
    const previousById = new Map(orderedTypes.map((item) => [String(item.id), Number(item.sort_order ?? 0)]));
    const changes = nextTypes.filter((item, index) => previousById.get(String(item.id)) !== index);
    if (!changes.length) return;
    const previousTypes = moverTypes;
    console.debug('[MoverTypeSettings] persistSortOrder', {
      current: orderedTypes.map((item) => ({ id: item.id, name: item.name, sort_order: item.sort_order })),
      next: nextTypes.map((item) => ({ id: item.id, name: item.name, sort_order: item.sort_order })),
      changes: changes.map((item) => ({ id: item.id, name: item.name, sort_order: item.sort_order })),
    });
    setMoverTypes(nextTypes);
    try {
      await Promise.all(changes.map((item) => updateMoverType(item.id, { sort_order: nextTypes.findIndex((row) => String(row.id) === String(item.id)) })));
      console.debug('[MoverTypeSettings] persistSortOrder success');
      setMessage({ type: 'success', text: 'Mover type order updated.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('[MoverTypeSettings] reorder failed:', err);
      setMoverTypes(previousTypes);
      setMessage({ type: 'error', text: 'Failed to update mover type order.' });
    } finally {
      setDraggedTypeId(null);
      setDragOverTypeId(null);
    }
  };

  const handleDragStart = (event, type) => {
    if (!canReorder) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(type.id));
    setDraggedTypeId(type.id);
    console.debug('[MoverTypeSettings] dragStart', {
      id: type.id,
      name: type.name,
      sort_order: type.sort_order,
    });
  };

  const handleDragOver = (event, type) => {
    if (!canReorder || !draggedTypeId || String(draggedTypeId) === String(type.id)) return;
    event.preventDefault();
    setDragOverTypeId(type.id);
    console.debug('[MoverTypeSettings] dragOver', {
      draggedTypeId,
      targetId: type.id,
      targetName: type.name,
    });
  };

  const handleDrop = async (event, targetType) => {
    if (!canReorder) return;
    event.preventDefault();
    const sourceId = String(event.dataTransfer.getData('text/plain') || draggedTypeId || '');
    console.debug('[MoverTypeSettings] drop', {
      sourceId,
      targetId: targetType.id,
      draggedTypeId,
      targetName: targetType.name,
      ordered: orderedTypes.map((item) => ({ id: item.id, name: item.name, sort_order: item.sort_order })),
    });
    if (!sourceId || sourceId === String(targetType.id)) {
      setDraggedTypeId(null);
      setDragOverTypeId(null);
      return;
    }
    const sourceIndex = orderedTypes.findIndex((item) => String(item.id) === sourceId);
    const targetIndex = orderedTypes.findIndex((item) => String(item.id) === String(targetType.id));
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...orderedTypes];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    await persistSortOrder(next.map((item, index) => ({ ...item, sort_order: index })));
  };

  const handleOpenModal = (type = null) => {
    if (type) {
      setEditingType(type);
      setFormData({ 
        name: type.name || '', 
        description: type.description || '',
        is_active: type.is_active ?? true
      });
    } else {
      setEditingType(null);
      setFormData({ 
        name: '', 
        description: '',
        is_active: true
      });
    }
    setShowModal(true);
    setOpenMenuId(null);
  };

  const handleToggleActive = async (type) => {
    if (!type) return;
    setIsSaving(true);
    try {
      const updated = await updateMoverType(type.id, { is_active: !type.is_active });
      setMoverTypes((current) => current.map(t => t.id === type.id ? updated : t));
      setMessage({ type: 'success', text: `Type ${updated.is_active ? 'activated' : 'deactivated'} successfully!` });
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
        is_active: formData.is_active !== false,
        code: formData.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 50),
      };
      if (editingType) {
        const updated = await updateMoverType(editingType.id, payload);
        setMoverTypes((current) => current.map(t => t.id === editingType.id ? updated : t));
        setMessage({ type: 'success', text: 'Mover type updated successfully!' });
      } else {
        const created = await createMoverType(payload);
        setMoverTypes((current) => [...current, created]);
        setMessage({ type: 'success', text: 'New mover type created!' });
      }
      setShowModal(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      const detail = err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to save mover type.';
      setMessage({ type: 'error', text: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (type) => {
    setDeleteTarget(type);
    setShowDeleteConfirm(true);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deleteMoverType(deleteTarget.id);
      setMoverTypes((current) => current.filter(t => t.id !== deleteTarget.id));
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      setMessage({ type: 'success', text: 'Mover type deleted successfully.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Delete failed:', err);
      setMessage({ type: 'error', text: 'Failed to delete mover type.' });
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
            <h3 className="text-base sm:text-lg font-bold text-heading tracking-tight">Move Types</h3>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {filteredTypes.length} {filteredTypes.length === 1 ? 'type' : 'types'}
            </span>
          </div>
          <p className="text-xs text-muted">Manage move type configurations for quotes.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-44 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" size={14} />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search types..."
              className="w-full pl-8 pr-3 h-8 bg-card border border-border rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-1.5 h-8 px-3.5 bg-primary text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#003d2f] transition-all active:scale-95 whitespace-nowrap shrink-0"
          >
            <Plus size={14} /> Add Type
          </button>
        </div>
      </div>
      {!canReorder && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          Clear search to drag and reorder mover types.
        </div>
      )}

      {message.text && (
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-xs animate-in slide-in-from-top-1 ${
          message.type === 'success'
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
                <th className="w-[30%] min-w-[130px] px-3 sm:px-6 py-2 sm:py-2.5 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Name</th>
                <th className="w-[48%] px-3 sm:px-6 py-2 sm:py-2.5 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Description</th>
                <th className="w-24 px-3 sm:px-6 py-2 sm:py-2.5 text-[0.625rem] font-bold uppercase tracking-widest text-muted text-center">Status</th>
                <th className="w-20 px-3 sm:px-6 py-2 sm:py-2.5 text-[0.625rem] font-bold uppercase tracking-widest text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/70">
              {filteredTypes.length > 0 ? (
                filteredTypes.map((type) => (
                  <tr
                    key={type.id}
                    className={`transition-colors group ${dragOverTypeId === type.id ? 'bg-primary/5' : 'hover:bg-subtle/50'}`}
                    onDragOver={(e) => handleDragOver(e, type)}
                    onDrop={(e) => handleDrop(e, type)}
                  >
                    <td className="px-3 sm:px-6 py-2 sm:py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          draggable={canReorder}
                          onDragStart={(e) => handleDragStart(e, type)}
                          onDragEnd={() => { setDraggedTypeId(null); setDragOverTypeId(null); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted transition-all ${canReorder ? 'cursor-grab active:cursor-grabbing hover:text-body hover:border-primary/40' : 'cursor-not-allowed opacity-40'}`}
                          aria-label={`Drag ${type.name} to reorder`}
                          title={canReorder ? 'Drag to reorder' : 'Clear search to reorder'}
                        >
                          <GripVertical size={13} />
                        </button>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-heading truncate">{type.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-2.5">
                      <p className="text-xs text-muted truncate max-w-sm">{type.description || '-'}</p>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(type)}
                        disabled={isSaving}
                        aria-label={`${type.is_active ? 'Deactivate' : 'Activate'} ${type.name}`}
                        className={`relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full transition-colors ${type.is_active ? 'bg-primary' : 'bg-disabled'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow-xs transition-transform ${type.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-3 sm:px-6 py-2 sm:py-2.5 text-right relative whitespace-nowrap">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === type.id ? null : type.id)}
                        aria-label={`Actions for ${type.name}`}
                        className="p-1 text-muted hover:text-body hover:bg-border/60 rounded-md transition-all"
                      >
                        <MoreHorizontal size={15} />
                      </button>

                      {openMenuId === type.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-2 sm:right-6 mt-1 w-32 bg-card rounded-lg shadow-lg border border-border z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <button 
                              onClick={() => handleOpenModal(type)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-body hover:bg-subtle transition-colors"
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button 
                              onClick={() => confirmDelete(type)}
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
                  <td colSpan="4" className="px-6 py-8 text-center text-muted">
                    <Layout size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No mover types found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredTypes.length > 0 && (
          <div className="flex items-center justify-between px-3 sm:px-6 py-2 bg-subtle/30 border-t border-border text-[11px] text-muted">
            <span>{filteredTypes.length} {filteredTypes.length === 1 ? 'type' : 'types'} configured</span>
            <span className="hidden sm:inline">Drag handle to reorder quotes priority</span>
          </div>
        )}
      </Card>

      {/* EDIT/CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4 backdrop-blur-sm">
          <Card className="max-w-xl w-full p-6 space-y-6 rounded-3xl shadow-2xl animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold text-heading">{editingType ? 'Edit Move Type' : 'New Move Type'}</h3>
              <button type="button" aria-label="Close move type form" onClick={() => setShowModal(false)}><XCircle className="text-disabled hover:text-muted" /></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="move-type-name" className="text-[0.625rem] font-bold uppercase tracking-widest text-muted ml-1">Type Name*</label>
                  <input 
                    id="move-type-name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-subtle border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10" 
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="move-type-description" className="text-[0.625rem] font-bold uppercase tracking-widest text-muted ml-1">Description</label>
                  <textarea 
                    id="move-type-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-subtle border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 min-h-[100px]" 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-subtle rounded-xl">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-body">Active Status</p>
                  <p className="text-xs text-muted">Allow this type to be selected in new quotes.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  aria-label={`${formData.is_active ? 'Deactivate' : 'Activate'} move type`}
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
                  {isSaving ? <Loader2 className="mx-auto animate-spin" size={20} /> : (editingType ? 'Update Changes' : 'Create Type')}
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
              <h3 className="text-xl font-bold text-heading">Delete Mover Type?</h3>
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
                {isSaving ? <Loader2 className="mx-auto animate-spin" size={20} /> : 'Delete Type'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MoverTypeSettings;
