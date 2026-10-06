import React, { useEffect, useMemo, useState } from 'react';
import { GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import {
  getBranches,
  getEstimateCatalogItems,
  getEstimatePackages,
  createEstimatePackage,
  updateEstimatePackage,
  deleteEstimatePackage,
  createEstimatePackageItem,
  updateEstimatePackageItem,
  deleteEstimatePackageItem,
} from '../../../services/api';

const inputCls =
  'w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-heading outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

const extractRows = (res) => (Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : []);
const money = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount)
    ? `$${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$0.00';
};

const rateLabelForItem = (item) => {
  const metadata = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  if (metadata.rate_label) return metadata.rate_label;
  const quantity = Number(item?.quantity || 0);
  const unitPrice = Number(item?.unit_price || 0);
  const category = String(metadata.category || item?.catalog_item?.category || '');
  const moving = metadata.moving_labor || {};
  if (category === 'moving_labor' && moving.mode === 'flat_plus_hourly') {
    const flat = Number(moving.flat_rate || unitPrice || 0);
    const included = moving.included_hours || '0h';
    const travel = moving.travel_time_display || '0h';
    const rate = Number(moving.additional_hourly_rate || 0);
    const trucks = Number(moving.trucks || 1);
    const crew = Number(moving.crew || 0);
    return `${money(flat)} for first ${included} plus ${travel} @ ${money(rate)}/hr (${trucks} truck${trucks === 1 ? '' : 's'}${crew ? `, ${crew} crew` : ''})`;
  }
  if (category === 'moving_labor' && moving.mode === 'hourly') {
    const hours = moving.labor_time_display || `${quantity} hours`;
    const rate = Number(moving.hourly_rate || unitPrice || 0);
    return `${hours} @ ${money(rate)} per hr`;
  }
  if (quantity === 0 && unitPrice > 0) return `0 @ ${money(unitPrice)}`;
  if (unitPrice === 0) return quantity ? `${quantity} @ --` : '--';
  return `${quantity} @ ${money(unitPrice)}`;
};

const CatalogPackageBuilder = ({ branchId }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState('');
  const [packages, setPackages] = useState([]);
  const [activePackageId, setActivePackageId] = useState('');
  const [catalogItems, setCatalogItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ type: '', text: '' });
  const [newPackageName, setNewPackageName] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [draggedItemId, setDraggedItemId] = useState('');

  const activePackage = useMemo(
    () => packages.find((p) => String(p.id) === String(activePackageId)) || null,
    [packages, activePackageId]
  );

  const filteredPackages = useMemo(() => {
    const q = (packageSearch || '').trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((p) => String(p.name || '').toLowerCase().includes(q));
  }, [packages, packageSearch]);

  useEffect(() => {
    if (branchId) {
      setActiveBranchId(String(branchId));
    }
  }, [branchId]);

  useEffect(() => {
    if (!toast.text) return;
    const t = window.setTimeout(() => setToast({ type: '', text: '' }), 2500);
    return () => window.clearTimeout(t);
  }, [toast.text]);

  const loadBranches = async () => {
    try {
      const res = await getBranches();
      const rows = extractRows(res);
      setBranches(rows);
      const defaultBranchId = branchId || user?.branch_id || rows[0]?.id || '';
      setActiveBranchId(String(defaultBranchId || ''));
    } catch {
      setBranches([]);
    }
  };

  const loadPackages = async (branchId) => {
    if (!branchId) {
      setPackages([]);
      setActivePackageId('');
      return;
    }
    try {
      const res = await getEstimatePackages({ branch: branchId, is_active: 'true' });
      const rows = extractRows(res);
      setPackages(rows);
      if (rows.length && !rows.some((p) => String(p.id) === String(activePackageId))) {
        setActivePackageId(String(rows[0].id));
      }
      if (!rows.length) setActivePackageId('');
    } catch {
      setPackages([]);
      setActivePackageId('');
    }
  };

  const loadCatalogItems = async (branchId) => {
    if (!branchId) {
      setCatalogItems([]);
      return;
    }
    try {
      const res = await getEstimateCatalogItems({ branch: branchId, include_inactive: 0 });
      setCatalogItems(extractRows(res));
    } catch {
      setCatalogItems([]);
    }
  };

  useEffect(() => {
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPackages(activeBranchId);
    loadCatalogItems(activeBranchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  const refreshActivePackage = async () => {
    if (!activeBranchId) return;
    await loadPackages(activeBranchId);
  };

  const handleCreatePackage = async () => {
    if (!activeBranchId || !newPackageName.trim()) return;
    setSaving(true);
    setToast({ type: '', text: '' });
    try {
      const created = await createEstimatePackage({ name: newPackageName.trim(), branch: Number(activeBranchId), is_active: true });
      setNewPackageName('');
      await loadPackages(activeBranchId);
      setActivePackageId(String(created.id));
      setToast({ type: 'success', text: 'Package created.' });
    } catch (err) {
      setToast({ type: 'error', text: err?.response?.data?.detail || 'Failed to create package.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePackage = async () => {
    if (!activePackage) return;
    if (!window.confirm('Delete this package?')) return;
    setSaving(true);
    setToast({ type: '', text: '' });
    try {
      await deleteEstimatePackage(activePackage.id);
      setActivePackageId('');
      await refreshActivePackage();
      setToast({ type: 'success', text: 'Package deleted.' });
    } catch (err) {
      setToast({ type: 'error', text: err?.response?.data?.detail || 'Failed to delete package.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePackageName = async (name) => {
    if (!activePackage) return;
    setSaving(true);
    setToast({ type: '', text: '' });
    try {
      const updated = await updateEstimatePackage(activePackage.id, { name });
      setPackages((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      setToast({ type: 'success', text: 'Package saved.' });
    } catch (err) {
      setToast({ type: 'error', text: err?.response?.data?.detail || 'Failed to save package.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (catalogItemId) => {
    if (!activePackage || !catalogItemId) return;
    const catalogItem = catalogItems.find((i) => String(i.id) === String(catalogItemId));
    if (!catalogItem) return;
    setSaving(true);
    setToast({ type: '', text: '' });
    try {
      await createEstimatePackageItem({
        package: activePackage.id,
        catalog_item: catalogItem.id,
        name: catalogItem.name,
        description: catalogItem.description || '',
        quantity: String(catalogItem.default_quantity ?? '1.000'),
        unit_price: String(catalogItem.default_unit_price ?? '0.00'),
        taxable: !!catalogItem.taxable,
        is_optional: !!catalogItem.is_optional_by_default,
        is_customer_visible: catalogItem.is_customer_visible !== false,
        display_order: (activePackage.items?.length || 0) + 1,
        metadata: {
          category: catalogItem.category || '',
          ...(catalogItem?.category_form_schema ? { [catalogItem.category || 'other']: catalogItem.category_form_schema } : {}),
        },
      });
      await refreshActivePackage();
      setToast({ type: 'success', text: 'Item added.' });
    } catch (err) {
      setToast({ type: 'error', text: err?.response?.data?.detail || 'Failed to add item.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (itemId, patch) => {
    setSaving(true);
    setToast({ type: '', text: '' });
    try {
      await updateEstimatePackageItem(itemId, patch);
      await refreshActivePackage();
    } catch (err) {
      setToast({ type: 'error', text: err?.response?.data?.detail || 'Failed to update item.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Remove this item from the package?')) return;
    setSaving(true);
    setToast({ type: '', text: '' });
    try {
      await deleteEstimatePackageItem(itemId);
      await refreshActivePackage();
      setToast({ type: 'success', text: 'Item removed.' });
    } catch (err) {
      setToast({ type: 'error', text: err?.response?.data?.detail || 'Failed to remove item.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReorderItem = async (sourceId, targetId) => {
    if (!activePackage?.items?.length || String(sourceId) === String(targetId)) return;
    const sourceIndex = activePackage.items.findIndex((item) => String(item.id) === String(sourceId));
    const targetIndex = activePackage.items.findIndex((item) => String(item.id) === String(targetId));
    if (sourceIndex < 0 || targetIndex < 0) return;

    const reordered = [...activePackage.items];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setPackages((prev) => prev.map((pkg) => (
      String(pkg.id) === String(activePackage.id) ? { ...pkg, items: reordered.map((item, index) => ({ ...item, display_order: index + 1 })) } : pkg
    )));

    setSaving(true);
    setToast({ type: '', text: '' });
    try {
      await Promise.all(reordered.map((item, index) => updateEstimatePackageItem(item.id, { display_order: index + 1 })));
      await refreshActivePackage();
      setToast({ type: 'success', text: 'Package item order updated.' });
    } catch (err) {
      await refreshActivePackage();
      setToast({ type: 'error', text: err?.response?.data?.detail || 'Failed to reorder package items.' });
    } finally {
      setSaving(false);
    }
  };

  const [selectedCatalogId, setSelectedCatalogId] = useState('');

  return (
    <div className="relative animate-in fade-in duration-500">
      {toast.text ? (
        <div className="fixed right-6 top-6 z-50">
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.type === 'success' ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            {toast.text}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="sticky top-6 space-y-4">
            {!branchId && (
              <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
                <div className="text-xs font-black uppercase tracking-widest text-muted">Branch</div>
                <select className={inputCls} value={activeBranchId} onChange={(e) => setActiveBranchId(e.target.value)}>
                  <option value="">Select branch...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black uppercase tracking-widest text-muted">Packages</div>
                <div className="text-xs text-muted">{packages.length ? `${packages.length} total` : ''}</div>
              </div>

              <input
                className={inputCls}
                value={packageSearch}
                onChange={(e) => setPackageSearch(e.target.value)}
                placeholder="Search packages…"
              />

              <div className="max-h-[340px] overflow-auto rounded-2xl border border-border bg-white/40">
                {filteredPackages.length ? (
                  <div className="divide-y divide-border">
                    {filteredPackages.map((p) => {
                      const active = String(p.id) === String(activePackageId);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setActivePackageId(String(p.id))}
                          className={`w-full text-left px-4 py-3 text-sm font-semibold ${
                            active ? 'bg-primary/10 text-heading' : 'hover:bg-subtle text-body'
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-muted">{packages.length ? 'No matches.' : 'No packages yet.'}</div>
                )}
              </div>

              <div className="flex gap-2">
                <input className={inputCls} value={newPackageName} onChange={(e) => setNewPackageName(e.target.value)} placeholder="New package name" />
                <button
                  type="button"
                  onClick={handleCreatePackage}
                  disabled={saving || !activeBranchId || !newPackageName.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  <Plus size={16} /> Create
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-muted">Package</div>
                <div className="text-lg font-extrabold text-heading">{activePackage?.name || 'Select a package'}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const name = window.prompt('Package name', activePackage?.name || '');
                    if (!name) return;
                    handleUpdatePackageName(name.trim());
                  }}
                  disabled={!activePackage || saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-body hover:bg-subtle disabled:opacity-60"
                >
                  <Save size={16} /> Rename
                </button>
                <button
                  type="button"
                  onClick={handleDeletePackage}
                  disabled={!activePackage || saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-body hover:bg-subtle disabled:opacity-60"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-center">
              <div className="md:col-span-7">
                <select className={inputCls} value={selectedCatalogId} onChange={(e) => setSelectedCatalogId(e.target.value)} disabled={!activePackage}>
                  <option value="">Add catalog item…</option>
                  {catalogItems.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.code ? `${item.code} — ` : ''}{item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    handleAddItem(selectedCatalogId);
                    setSelectedCatalogId('');
                  }}
                  disabled={!activePackage || !selectedCatalogId || saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-heading px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
              <div className="md:col-span-3 text-xs text-muted">
                Adds defaults; you can override below.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-6 py-4 bg-[#fafafa]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-muted">Line Items</div>
                  <div className="mt-1 text-xs text-muted">{(activePackage?.items || []).length} charges</div>
                </div>
                <div className="text-sm font-black text-heading">
                  Package Total: {money((activePackage?.items || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0))}
                </div>
              </div>
            </div>
            <div>
              {(activePackage?.items || []).length ? (
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[4%]" />
                    <col className="w-[24%]" />
                    <col className="w-[31%]" />
                    <col className="w-[11%]" />
                    <col className="w-[9%]" />
                    <col className="w-[11%]" />
                    <col className="w-[9%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-[#fafafa]">
                      <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-widest text-muted">Actions</th>
                      <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-widest text-muted">Name</th>
                      <th className="px-3 py-3 text-left text-[11px] font-black uppercase tracking-widest text-muted">Rate</th>
                      <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-widest text-muted">Subtotal</th>
                      <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-widest text-muted">Discount</th>
                      <th className="px-3 py-3 text-right text-[11px] font-black uppercase tracking-widest text-muted">Total Cost</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activePackage.items.map((item) => {
                      const subtotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
                      const isDragging = String(draggedItemId || '') === String(item.id);
                      return (
                        <tr
                          key={item.id}
                          draggable
                          onDragStart={(event) => {
                            setDraggedItemId(item.id);
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', String(item.id));
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            const sourceId = event.dataTransfer.getData('text/plain') || draggedItemId;
                            setDraggedItemId('');
                            if (sourceId) handleReorderItem(sourceId, item.id);
                          }}
                          onDragEnd={() => setDraggedItemId('')}
                          className={`cursor-move transition hover:bg-slate-50 ${isDragging ? 'bg-blue-50/60 opacity-70' : ''}`}
                        >
                          <td className="px-3 py-4 text-slate-300">
                            <GripVertical className="h-4 w-4 cursor-grab active:cursor-grabbing" />
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="text-sm font-bold text-primary">{item.name}</div>
                            <div className="mt-1 truncate font-mono text-[11px] text-muted">{item.description || '—'}</div>
                            <select
                              className="mt-3 w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-heading outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              value={item.is_customer_visible ? 'yes' : 'no'}
                              onChange={(e) => handleUpdateItem(item.id, { is_customer_visible: e.target.value === 'yes' })}
                              disabled={saving}
                            >
                              <option value="yes">Customer visible</option>
                              <option value="no">Internal only</option>
                            </select>
                          </td>
                          <td className="px-3 py-4 align-top font-mono text-sm leading-5 tabular-nums text-heading">
                            <div className="whitespace-normal break-words">{rateLabelForItem(item)}</div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted">Qty</span>
                                <input
                                  className={inputCls}
                                  type="number"
                                  step="0.001"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(item.id, { quantity: e.target.value })}
                                  disabled={saving}
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted">Rate</span>
                                <input
                                  className={inputCls}
                                  type="number"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => handleUpdateItem(item.id, { unit_price: e.target.value })}
                                  disabled={saving}
                                />
                              </label>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-right align-top font-mono text-sm font-black tabular-nums text-heading">{money(subtotal)}</td>
                          <td className="px-3 py-4 text-right align-top font-mono text-sm font-black tabular-nums text-muted">--</td>
                          <td className="px-3 py-4 text-right align-top font-mono text-sm font-black tabular-nums text-heading">{money(subtotal)}</td>
                          <td className="px-3 py-4 text-right align-top">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={saving}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-100 disabled:opacity-60"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-[#fafafa]">
                      <td className="px-3 py-3" />
                      <td className="px-5 py-3 text-sm font-black text-heading" colSpan={2}>Estimated Total</td>
                      <td className="px-3 py-3 text-right font-mono text-sm font-black tabular-nums text-heading">
                        {money(activePackage.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0))}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm font-black tabular-nums text-muted">--</td>
                      <td className="px-3 py-3 text-right font-mono text-sm font-black tabular-nums text-heading">
                        {money(activePackage.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0))}
                      </td>
                      <td className="px-3 py-3" />
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div className="p-8 text-sm text-muted">No items yet. Add catalog items to build the package.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogPackageBuilder;
