import React, { useEffect, useMemo, useState, useRef } from 'react';
import { AlertCircle, Loader2, Plus, Search } from 'lucide-react';
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

  const openReferralForm = (source = null) => {
    setEditingReferral(source);
    setRefForm({
      name: source?.name || '',
      utm_source: source?.utm_source || '',
      utm_medium: source?.utm_medium || '',
      utm_campaign: source?.utm_campaign || '',
      description: source?.description || '',
      is_active: source?.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const saveReferral = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        name: refForm.name.trim(),
        utm_source: refForm.utm_source.trim(),
        utm_medium: refForm.utm_medium.trim(),
        utm_campaign: refForm.utm_campaign.trim(),
        description: refForm.description.trim(),
        is_active: !!refForm.is_active,
      };
      if (editingReferral?.id) {
        const updated = await updateReferralSource(editingReferral.id, payload);
        setReferrals((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createReferralSource(payload);
        setReferrals((prev) => [created, ...prev]);
      }
      setEditingReferral(null);
      setRefForm(emptyReferralForm);
      setIsModalOpen(false);
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

  const activeReferrals = filteredReferrals.filter((item) => item.is_active);
  const inactiveReferrals = filteredReferrals.filter((item) => !item.is_active);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card className="p-6 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black text-heading">Referral Sources</h3>
            <p className="text-sm text-body">Manage referral partners separately from inbound lead intake.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-disabled" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search referral sources..."
                className="w-full rounded-xl border border-subtle bg-card py-2 pl-10 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={() => {
                setEditingReferral(null);
                setRefForm(emptyReferralForm);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#fdba74] hover:bg-[#f9a852] px-4 py-2 font-bold text-[#111d23] transition-colors whitespace-nowrap"
            >
              <Plus size={16} />
              Add Source
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-[#FDE8E8] bg-[#FDE8E8]/30 px-4 py-3 text-[#791F1F]">
            <AlertCircle size={18} />
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}
      </Card>
      
      <Card className="p-0 overflow-hidden rounded-[2rem] border border-[#dce8f1] bg-white shadow-sm mt-8">
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
              {filteredReferrals.map((item, index) => (
                <tr
                  key={item.id}
                  draggable={!search}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`border-b border-[#dce8f1] last:border-0 transition-colors hover:bg-[#fbfdff] ${!search ? 'cursor-grab active:cursor-grabbing' : ''} ${dragOverIndex === index ? 'bg-[#edf8f4] shadow-inner' : ''}`}
                >
                  <td className="px-6 py-5">
                    <div className="font-bold text-[#111d23]">{item.name}</div>
                  </td>
                  <td className="px-6 py-5 text-sm text-[#60727b]">{item.description || '-'}</td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={item.is_active} 
                          onChange={async () => {
                            try {
                              const updated = await updateReferralSource(item.id, { is_active: !item.is_active });
                              setReferrals((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
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
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openReferralForm(item)} 
                        className="p-2 text-[#60727b] hover:text-[#111d23] hover:bg-[#f0f5f9] rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this referral source?')) {
                            removeReferral(item.id);
                          }
                        }}
                        className="p-2 text-[#60727b] hover:text-[#e11d48] hover:bg-[#ffe4e6] rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReferrals.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm font-bold text-heading">
                    No referral sources found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111d23]/20 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-[#dce8f1] p-8 relative">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setEditingReferral(null);
                setRefForm(emptyReferralForm);
              }}
              className="absolute top-4 right-4 p-2 text-[#60727b] hover:text-[#111d23] hover:bg-[#f0f5f9] rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            
            <form onSubmit={saveReferral} className="grid gap-4 md:grid-cols-2 mt-4 bg-[#f8fafc] p-6 rounded-2xl border border-[#dce8f1]">
              <input
                value={refForm.name}
                onChange={(e) => setRefForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Source name"
                className="rounded-xl border border-[#dce8f1] bg-white px-4 py-3 text-sm outline-none focus:border-[#fdba74] transition-colors"
                required
              />
              <input
                value={refForm.utm_source}
                onChange={(e) => setRefForm((prev) => ({ ...prev, utm_source: e.target.value }))}
                placeholder="UTM source"
                className="rounded-xl border border-[#dce8f1] bg-white px-4 py-3 text-sm outline-none focus:border-[#fdba74] transition-colors"
              />
              <input
                value={refForm.utm_medium}
                onChange={(e) => setRefForm((prev) => ({ ...prev, utm_medium: e.target.value }))}
                placeholder="UTM medium"
                className="rounded-xl border border-[#dce8f1] bg-white px-4 py-3 text-sm outline-none focus:border-[#fdba74] transition-colors"
              />
              <input
                value={refForm.utm_campaign}
                onChange={(e) => setRefForm((prev) => ({ ...prev, utm_campaign: e.target.value }))}
                placeholder="UTM campaign"
                className="rounded-xl border border-[#dce8f1] bg-white px-4 py-3 text-sm outline-none focus:border-[#fdba74] transition-colors"
              />
              <textarea
                value={refForm.description}
                onChange={(e) => setRefForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
                className="min-h-[120px] rounded-xl border border-[#dce8f1] bg-white px-4 py-3 text-sm outline-none focus:border-[#fdba74] transition-colors md:col-span-2 resize-y"
              />
              <div className="flex items-center justify-end gap-2 md:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#fdba74] px-8 py-2.5 font-bold text-[#111d23] hover:bg-[#f9a852] disabled:opacity-60 transition-colors"
                >
                  Save
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
