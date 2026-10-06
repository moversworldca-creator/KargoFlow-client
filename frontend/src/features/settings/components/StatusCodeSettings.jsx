import React, { useEffect, useRef, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Tag } from 'lucide-react';
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
        limit: 25,
      });
      const rows = Array.isArray(response?.results)
        ? response.results
        : Array.isArray(response)
          ? response
          : [];
      const scopedRows = rows;
      setHasMore(Boolean(response?.next || response?.hasMore));
      setOffset(nextOffset);
      setCodes((prev) => {
        if (!append) return scopedRows;
        const existingIds = new Set(prev.map((item) => item.id));
        return [...prev, ...scopedRows.filter((item) => !existingIds.has(item.id))];
      });
    } catch (err) {
      console.error('Failed to fetch custom status codes:', err);
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
        alert('Color must be a valid hex value like #000000.');
        return;
      }
      const payload = { ...formData, color_hex: normalizedColorHex, entity_type: 'shared' };
      if (editingCode) {
        const updated = await updateStatusCode(editingCode.id, payload);
        setCodes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createStatusCode(payload);
        setCodes((prev) => [...prev, created]);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Save custom status failed:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to save custom status.';
      alert(detail);
    }
  };

  const handleDelete = async (id) => {
    if (!canAll([PERMISSIONS.SALES_DELETE_STATUS_CODE])) {
      showToast('You do not have permission to delete custom statuses.', 'warning');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this custom status?')) return;
    try {
      await deleteStatusCode(id);
      setCodes((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Delete custom status failed:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to delete custom status.';
      alert(detail);
    }
  };

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      await seedStatusCodes();
      await fetchCodes(0, false);
      showToast('Internal statuses seeded for the company.', 'success');
    } catch (err) {
      console.error('Seed internal statuses failed:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to seed internal statuses.';
      alert(detail);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDragStart = (e, index) => {
    if (searchTerm) return; // Disable drag if searching
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', index); } catch (err) {}
  };

  const handleDragEnter = (e, index) => {
    if (searchTerm) return;
    if (dragItem.current !== index) {
      dragOverItem.current = index;
      setDragOverIndex(index);
    }
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
          console.error('Failed to update sort order for', update.id, err);
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

  const loadMore = () => {
    if (!hasMore) return;
    fetchCodes(offset + 25, true);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-card p-6 rounded-2xl border border-subtle shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h3 className="text-2xl font-black bg-gradient-to-br from-heading to-body bg-clip-text text-transparent font-heading tracking-tight">Internal Statuses</h3>
          <p className="text-sm text-body mt-1 max-w-lg">Manage and customize the communication statuses used across leads and opportunities to keep your team aligned.</p>
        </div>
        <div className="flex flex-wrap gap-3 relative z-10">
          {canAll([PERMISSIONS.SALES_ADD_STATUS_CODE]) && (
            <button
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className="flex items-center gap-2 rounded-xl border border-subtle bg-card px-4 py-2 text-sm font-bold text-heading transition-all hover:border-brand/30 hover:bg-brand/5 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSeeding ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} className="text-brand" />}
              Seed Company
            </button>
          )}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-disabled group-focus-within:text-brand transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search statuses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-page border border-subtle rounded-xl text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all w-full sm:w-64 font-medium"
            />
          </div>
          {canAll([PERMISSIONS.SALES_ADD_STATUS_CODE]) && (
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-gradient-to-r from-brand to-brand-dark text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-pop hover:-translate-y-0.5 transition-all"
            >
              <Plus size={18} /> Add Status
            </button>
          )}
        </div>
      </div>

      {filteredCodes.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-brand/20 bg-brand/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/50 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-white dark:bg-card shadow-lift flex items-center justify-center text-brand mb-6 transform transition-transform hover:scale-110">
              <Tag size={28} />
            </div>
            <h4 className="text-xl font-bold text-heading">
              {searchTerm ? 'No matches found' : 'No statuses configured'}
            </h4>
            <p className="text-sm text-body mt-2 max-w-sm text-center">
              {searchTerm ? 'Try adjusting your search criteria to find what you are looking for.' : 'Start organizing your workflow by creating custom internal communication statuses.'}
            </p>
            {!searchTerm && canAll([PERMISSIONS.SALES_ADD_STATUS_CODE]) && (
              <button
                onClick={() => openModal()}
                className="mt-6 flex items-center gap-2 bg-white dark:bg-card border border-subtle text-heading px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:border-brand/30 hover:text-brand transition-all"
              >
                <Plus size={18} /> Create First Status
              </button>
            )}
          </div>
        </div>
      ) : (
        <Card className="p-0 overflow-hidden rounded-[2rem] border border-[#dce8f1] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f0f5f9] text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((item, index) => (
                  <tr
                    key={item.id}
                    draggable={!searchTerm}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={`border-b border-[#dce8f1] last:border-0 transition-colors hover:bg-[#fbfdff] ${!searchTerm ? 'cursor-grab active:cursor-grabbing' : ''} ${dragOverIndex === index ? 'bg-[#edf8f4] shadow-inner' : ''}`}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl shadow-sm flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${item.color_hex}15`, border: `1px solid ${item.color_hex}30` }}
                        >
                          <div 
                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                            style={{ backgroundColor: item.color_hex }}
                          />
                        </div>
                        <div className="font-bold text-[#111d23]">{item.label}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-[#60727b]">-</td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={item.is_active !== false} 
                            onChange={async () => {
                              if (!canAll([PERMISSIONS.SALES_CHANGE_STATUS_CODE])) return;
                              try {
                                const updated = await updateStatusCode(item.id, { is_active: !item.is_active });
                                setCodes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                              } catch (err) {
                                console.error('Failed to toggle status:', err);
                              }
                            }} 
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#fdba74]"></div>
                        </label>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={() => openModal(item)} 
                        className="p-2 text-[#60727b] hover:text-[#111d23] hover:bg-[#f0f5f9] rounded-lg transition-colors inline-flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {hasMore && filteredCodes.length > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            className="rounded-xl border border-subtle bg-card px-4 py-2 text-sm font-bold text-heading transition-all hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
          >
            Load more
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/40 backdrop-blur-sm">
          <Card className="w-full max-w-[520px] p-0 overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="bg-gradient-to-r from-brand/10 to-transparent p-6 border-b border-subtle">
              <h3 className="text-xl font-black text-heading font-heading">
                {editingCode ? 'Edit Internal Status' : 'Create Internal Status'}
              </h3>
              <p className="text-xs text-body mt-1">
                {editingCode ? 'Update the details for this internal status code.' : 'Add a new custom status for team communication.'}
              </p>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[0.65rem] font-bold uppercase tracking-widest text-body ml-1">Display Label <span className="text-error">*</span></label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      // Auto-fill code if it's a new status and code is empty or matches previous auto-gen
                      setFormData((prev) => {
                        const updates = { label: newLabel };
                        if (!editingCode && (!prev.code || prev.code === prev.label.toLowerCase().replace(/\s+/g, '_'))) {
                          updates.code = newLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                        }
                        return { ...prev, ...updates };
                      });
                    }}
                    placeholder="e.g. Waiting On Customer"
                    className="w-full bg-page border border-subtle px-4 py-2.5 rounded-xl outline-none text-sm font-medium focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                    required
                  />
                </div>
                
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[0.65rem] font-bold uppercase tracking-widest text-body ml-1">Code (Slug) <span className="text-error">*</span></label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                    placeholder="e.g. waiting_on_customer"
                    className="w-full bg-page border border-subtle px-4 py-2.5 rounded-xl outline-none text-sm font-medium focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-mono"
                    required
                  />
                  <p className="text-[0.6875rem] text-muted ml-1">A unique, lowercase identifier used by the system.</p>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[0.65rem] font-bold uppercase tracking-widest text-body ml-1">Color Theme</label>
                  <div className="flex items-center gap-3 bg-page p-2 rounded-xl border border-subtle">
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
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-sm border border-black/10 transition-transform hover:scale-105"
                      aria-label="Open color picker"
                      title="Open color picker"
                    >
                      <span
                        className="block h-full w-full"
                        style={{ backgroundColor: normalizeHexColor(formData.color_hex) || INITIAL_FORM.color_hex }}
                      />
                    </button>
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono text-sm">#</div>
                      <input
                        type="text"
                        value={formData.color_hex.replace('#', '')}
                        onChange={(e) => setFormData((prev) => ({ ...prev, color_hex: `#${e.target.value}`.toUpperCase() }))}
                        placeholder="000000"
                        inputMode="text"
                        pattern="^[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$"
                        className="w-full bg-transparent border-none pl-7 pr-3 py-2 outline-none text-sm font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[0.65rem] font-bold uppercase tracking-widest text-body ml-1">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value || '0', 10) }))}
                    className="w-full bg-page border border-subtle px-4 py-2.5 rounded-xl outline-none text-sm font-medium focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
                
                <div className="flex flex-col justify-center gap-3 mt-1 md:mt-5 md:pl-4">
                  <label className="flex items-center gap-3 text-sm font-bold text-heading cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={!!formData.is_default}
                        onChange={(e) => setFormData((prev) => ({ ...prev, is_default: e.target.checked }))}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 border-2 border-muted rounded bg-card peer-checked:bg-brand peer-checked:border-brand transition-all"></div>
                      <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 scale-50 peer-checked:scale-100 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    Default status
                  </label>
                  
                  <label className="flex items-center gap-3 text-sm font-bold text-heading cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={!!formData.is_active}
                        onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 border-2 border-muted rounded bg-card peer-checked:bg-brand peer-checked:border-brand transition-all"></div>
                      <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 scale-50 peer-checked:scale-100 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    Active status
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-subtle mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-page text-body border border-subtle rounded-xl font-bold hover:bg-subtle hover:text-heading transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-brand to-brand-dark text-white rounded-xl font-bold shadow-md hover:shadow-pop hover:-translate-y-0.5 transition-all"
                >
                  Save Status
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StatusCodeSettings;
