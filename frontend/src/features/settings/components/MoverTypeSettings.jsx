import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../../shared/ui/Card';
import { 
  Truck, Plus, Edit2, Trash2, Search, GripVertical,
  XCircle, Save, Loader2, CheckCircle2, 
  AlertCircle, Layout, MoreHorizontal, Calendar, Hash, Clock, Building2, Fingerprint, ShieldCheck, Tag
} from 'lucide-react';
import { 
  getMoverTypes, createMoverType, updateMoverType, deleteMoverType 
} from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';

const MoverTypeSettings = ({ branchId }) => {
  const { user } = useAuth();
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

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await getMoverTypes({ branch_id: branchId });
      const data = Array.isArray(response) ? response : (response?.results || []);
      setMoverTypes(data);
    } catch (err) {
      console.error('Save failed:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to save mover type.';
      setMessage({ type: 'error', text: detail });
    } finally {
      setIsLoading(false);
    }
  };

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
      await Promise.all(changes.map((item, index) => updateMoverType(item.id, { sort_order: nextTypes.findIndex((row) => String(row.id) === String(item.id)) })));
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
      const payload = { 
        ...type, 
        is_active: !type.is_active
      };
      const updated = await updateMoverType(type.id, payload);
      setMoverTypes(moverTypes.map(t => t.id === type.id ? updated : t));
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
        ...formData,
        branch: branchId
      };
      if (editingType) {
        const updated = await updateMoverType(editingType.id, payload);
        setMoverTypes(moverTypes.map(t => t.id === editingType.id ? updated : t));
        setMessage({ type: 'success', text: 'Mover type updated successfully!' });
      } else {
        const created = await createMoverType(payload);
        setMoverTypes([...moverTypes, created]);
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
      setMoverTypes(moverTypes.filter(t => t.id !== deleteTarget.id));
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-heading tracking-tight">Mover Types</h3>
          <p className="text-sm text-muted">Manage mover type configurations for quotes.</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 min-w-0 sm:w-64 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search types..."
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10 sm:w-64"
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:bg-[#003d2f] transition-all active:scale-95 whitespace-nowrap shrink-0"
          >
            <Plus size={18} /> Add Type
          </button>
        </div>
      </div>
      {!canReorder && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Clear search to drag and reorder mover types.
        </div>
      )}

      {message.text && (
        <div className={`mb-3 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm animate-in slide-in-from-top-2 ${
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-rose-200 bg-rose-50 text-rose-900'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <Card className="overflow-hidden border-none shadow-xl shadow-border/50 bg-card rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-subtle/50 border-b border-border">
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Name</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Description</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Status</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-[0.625rem] font-bold uppercase tracking-widest text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {filteredTypes.length > 0 ? (
                filteredTypes.map((type) => (
                  <tr
                    key={type.id}
                    className={`transition-colors group ${dragOverTypeId === type.id ? 'bg-primary/5' : 'hover:bg-subtle/50'}`}
                    onDragOver={(e) => handleDragOver(e, type)}
                    onDrop={(e) => handleDrop(e, type)}
                  >
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          type="button"
                          draggable={canReorder}
                          onDragStart={(e) => handleDragStart(e, type)}
                          onDragEnd={() => { setDraggedTypeId(null); setDragOverTypeId(null); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted transition-all ${canReorder ? 'cursor-grab active:cursor-grabbing hover:text-body hover:border-primary/40' : 'cursor-not-allowed opacity-40'}`}
                          aria-label={`Drag ${type.name} to reorder`}
                          title={canReorder ? 'Drag to reorder' : 'Clear search to reorder'}
                        >
                          <GripVertical size={16} />
                        </button>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-body truncate">{type.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <p className="text-sm text-muted max-w-[140px] sm:max-w-xs truncate">{type.description || '-'}</p>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(type)}
                        disabled={isSaving}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${type.is_active ? 'bg-primary' : 'bg-disabled'} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-card transition-transform ${type.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right relative whitespace-nowrap">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === type.id ? null : type.id)}
                        className="p-1.5 sm:p-2 text-muted hover:text-body hover:bg-border rounded-lg transition-all"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {openMenuId === type.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-2 sm:right-6 mt-2 w-32 bg-card rounded-xl shadow-xl border border-border z-20 py-1 overflow-hidden animate-in fade-in zoom-in duration-100">
                            <button 
                              onClick={() => handleOpenModal(type)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-body hover:bg-subtle transition-colors"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button 
                              onClick={() => confirmDelete(type)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-status-lost-text hover:bg-status-lost-bg transition-colors"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-muted">
                    <Layout size={40} className="mx-auto mb-2 opacity-20" />
                    <p>No mover types found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* EDIT/CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4 backdrop-blur-sm">
          <Card className="max-w-xl w-full p-6 space-y-6 rounded-3xl shadow-2xl animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold text-heading">{editingType ? 'Edit Mover Type' : 'New Mover Type'}</h3>
              <button onClick={() => setShowModal(false)}><XCircle className="text-disabled hover:text-muted" /></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted ml-1">Type Name*</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-subtle border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10" 
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted ml-1">Description</label>
                  <textarea 
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
