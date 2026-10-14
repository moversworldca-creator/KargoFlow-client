import React, { useEffect, useMemo, useState, useRef } from 'react';
import { AlertCircle, Edit2, Globe2, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import {
  createReferralSource,
  deleteReferralSource,
  getReferralSources,
  updateReferralSource,
} from '../../../services/api';

const emptyReferralForm = {
  name: '',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  description: '',
  is_active: true,
};

const ReferralSourceSettings = () => {
  const [referrals, setReferrals] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingReferral, setEditingReferral] = useState(null);
  const [refForm, setRefForm] = useState(emptyReferralForm);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    if (search) {
      e.preventDefault();
      return;
    }
    dragItem.current = index;
    setDragOverIndex(null);
  };

  const handleDragEnter = (e, index) => {
    if (search) return;
    dragOverItem.current = index;
    setDragOverIndex(index);
  };

  const handleDragEnd = async () => {
    if (search || dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      setDragOverIndex(null);
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const newReferrals = [...filteredReferrals];
    const draggedItemContent = newReferrals[dragItem.current];
    newReferrals.splice(dragItem.current, 1);
    newReferrals.splice(dragOverItem.current, 0, draggedItemContent);

    const reorderedReferrals = newReferrals.map((item, i) => ({
      ...item,
      sort_order: i,
    }));
    
    setReferrals(reorderedReferrals);
    dragItem.current = null;
    dragOverItem.current = null;
    setDragOverIndex(null);

    try {
      await Promise.all(
        reorderedReferrals.map((item) =>
          updateReferralSource(item.id, { sort_order: item.sort_order })
        )
      );
    } catch (err) {
      console.error('Failed to update sort order:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await getReferralSources();
        setReferrals(Array.isArray(res) ? res : Array.isArray(res?.results) ? res.results : []);
      } catch (err) {
        console.error('Failed to load referral sources:', err);
        setError('Failed to load referral sources.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const openReferralForm = (item = null) => {
    if (item) {
      setEditingReferral(item);
      setRefForm({
        name: item.name || '',
        utm_source: item.utm_source || '',
        utm_medium: item.utm_medium || '',
        utm_campaign: item.utm_campaign || '',
        description: item.description || '',
        is_active: item.is_active ?? true,
      });
    } else {
      setEditingReferral(null);
      setRefForm(emptyReferralForm);
    }
    setIsModalOpen(true);
  };

  const saveReferral = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      if (editingReferral?.id) {
        const updated = await updateReferralSource(editingReferral.id, refForm);
        setReferrals((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createReferralSource(refForm);
        setReferrals((prev) => [...prev, created]);
      }
      setIsModalOpen(false);
      setEditingReferral(null);
      setRefForm(emptyReferralForm);
    } catch (err) {
      console.error('Failed to save referral source:', err);
      setError('Failed to save referral source.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeReferral = async (id) => {
    setIsSaving(true);
    setError('');
    try {
      await deleteReferralSource(id);
      setReferrals((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete referral source:', err);
      setError('Failed to delete referral source.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredReferrals = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return referrals;
    return referrals.filter((item) =>
      [item?.name, item?.utm_source, item?.utm_medium, item?.utm_campaign, item?.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [referrals, search]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Compact Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3 dark:border-slate-700">
            <Globe2 size={14} className="text-primary" />
            <span className="text-xs font-bold text-heading dark:text-white">Referrals</span>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sources or UTM tags..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1 pl-8 pr-2.5 text-xs font-medium outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <button
          onClick={() => openReferralForm(null)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90"
        >
          <Plus size={13} /> Add Source
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[#FDE8E8] bg-[#FDE8E8]/30 px-3 py-1.5 text-xs text-[#791F1F]">
          <AlertCircle size={14} />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Compact Table */}
      <Card className="!p-0 !rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-body dark:border-slate-800 dark:bg-slate-900">
                <th className="px-3.5 py-2.5">Source Name</th>
                <th className="px-3.5 py-2.5">Attribution / UTM</th>
                <th className="px-3.5 py-2.5">Description</th>
                <th className="px-3.5 py-2.5 text-center">Status</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredReferrals.map((item, index) => {
                const hasUtm = item.utm_source || item.utm_medium || item.utm_campaign;
                return (
                  <tr
                    key={item.id}
                    draggable={!search}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${!search ? 'cursor-grab active:cursor-grabbing' : ''} ${dragOverIndex === index ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-3.5 py-2">
                      <div className="font-bold text-xs text-heading dark:text-white">{item.name}</div>
                    </td>
                    <td className="px-3.5 py-2 text-xs">
                      {hasUtm ? (
                        <div className="flex flex-wrap gap-1">
                          {item.utm_source && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">src:{item.utm_source}</span>}
                          {item.utm_medium && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">med:{item.utm_medium}</span>}
                          {item.utm_campaign && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">cmp:{item.utm_campaign}</span>}
                        </div>
                      ) : (
                        <span className="text-[11px] text-body">Organic / Direct</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2 text-xs text-body truncate max-w-xs">{item.description || '-'}</td>
                    <td className="px-3.5 py-2 text-center">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const updated = await updateReferralSource(item.id, { is_active: !item.is_active });
                            setReferrals((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                          } catch (err) {
                            console.error('Failed to toggle status:', err);
                          }
                        }}
                        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${item.is_active ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${item.is_active ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openReferralForm(item)}
                          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this referral source?')) {
                              removeReferral(item.id);
                            }
                          }}
                          className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredReferrals.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-3.5 py-6 text-center text-xs text-body">
                    No referral sources found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-heading dark:text-white">
                {editingReferral ? 'Edit Referral Source' : 'New Referral Source'}
              </h4>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingReferral(null);
                  setRefForm(emptyReferralForm);
                }}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={saveReferral} className="space-y-3 pt-3">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-body">Source Name *</span>
                <input
                  value={refForm.name}
                  onChange={(e) => setRefForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Google Ads, Realtor Referral"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-body">UTM Source</span>
                  <input
                    value={refForm.utm_source}
                    onChange={(e) => setRefForm((prev) => ({ ...prev, utm_source: e.target.value }))}
                    placeholder="google"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-body">UTM Medium</span>
                  <input
                    value={refForm.utm_medium}
                    onChange={(e) => setRefForm((prev) => ({ ...prev, utm_medium: e.target.value }))}
                    placeholder="cpc"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-body">UTM Campaign</span>
                  <input
                    value={refForm.utm_campaign}
                    onChange={(e) => setRefForm((prev) => ({ ...prev, utm_campaign: e.target.value }))}
                    placeholder="summer2026"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-body">Description</span>
                <textarea
                  value={refForm.description}
                  onChange={(e) => setRefForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Notes regarding partner commission, agreement, or attribution..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
                />
              </label>

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
                  disabled={isSaving}
                  className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralSourceSettings;
