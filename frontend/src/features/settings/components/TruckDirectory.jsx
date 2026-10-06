import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../../shared/ui/Card';
import { Plus, Search, Edit2, Trash2, Loader2, AlertCircle, Save } from 'lucide-react';
import API from '../../../services/api';
import { filterAccessibleBranches } from '../../../shared/utils/branchScope';
import { useAuth } from '../../auth/context/AuthContext';

const Input = ({ value, onChange, placeholder, className = '' }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-4 py-3 rounded-xl border-2 border-subtle bg-card text-sm font-bold text-heading outline-none ${className}`}
  />
);

const TruckModal = ({ title, initial, onClose, onSave, isSaving }) => {
  const [form, setForm] = useState(() => ({
    name: '',
    plate_number: '',
    is_active: true,
    branch_id: '',
    ...initial,
  }));

  const [Branches, setBranches] = useState([]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await API.general.getBranches({ ordering: 'name' });
        setBranches(Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : []);
      }
      catch (err) {
        console.error('Failed to load branches:', err);
      }
    };
    fetchBranches();
  }, []);



  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    await onSave({
      name: String(form.name || '').trim(),
      plate_number: String(form.plate_number || '').trim(),
      is_active: !!form.is_active,
      branch_id: form.branch_id ? Number(form.branch_id) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl p-6 border-0 shadow-2xl rounded-[2rem]">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-body">Fleet</div>
            <div className="text-xl font-heading font-extrabold text-heading">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border-2 border-subtle bg-card text-xs font-black uppercase tracking-widest text-heading hover:border-primary/40"
          >
            Close
          </button>
        </div>

       <form onSubmit={submit} className="space-y-5">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-1.5">
      <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Truck Name</label>
      <Input value={form.name || ''} onChange={(e) => update('name', e.target.value)} placeholder="e.g., Truck 1" />
    </div>
    
    <div className="space-y-1.5">
      <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Plate Number</label>
      <Input value={form.plate_number || ''} onChange={(e) => update('plate_number', e.target.value)} placeholder="Optional" />
    </div>

    {/* --- NEW BRANCH DROPDOWN SECTION --- */}
    <div className="space-y-1.5 md:col-span-2">
      <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Branch</label>
      <select
        value={form.branch_id || ''}
        onChange={(e) => update('branch_id', e.target.value)}
        className="w-full px-4 py-3 text-sm font-medium rounded-xl border-2 border-subtle bg-card text-heading focus:outline-none focus:border-primary appearance-none"
      >
        <option value="" disabled>Select a branch</option>
        {Branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
    {/* ----------------------------------- */}

    <div className="space-y-1.5 md:col-span-2">
      <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Active</label>
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-subtle bg-card">
        <input type="checkbox" checked={!!form.is_active} onChange={(e) => update('is_active', e.target.checked)} className="w-5 h-5" />
        <span className="text-sm font-bold text-heading">{form.is_active ? 'Active' : 'Inactive'}</span>
      </div>
    </div>
  </div>

  <div className="flex justify-end">
    <button
      type="submit"
      disabled={isSaving}
      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary-dark disabled:opacity-50"
    >
      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
      {isSaving ? 'Saving...' : 'Save'}
    </button>
  </div>
</form>
      </Card>
    </div>
  );
};

export default function TruckDirectory({ branchId }) {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: 'create', row: null });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = Array.isArray(rows) ? rows : [];
    const activeFiltered = showInactive ? base : base.filter((r) => r.is_active);
    if (!needle) return activeFiltered;
    return activeFiltered.filter((r) => {
      const text = `${r.name || ''} ${r.plate_number || ''}`.toLowerCase();
      return text.includes(needle);
    });
  }, [rows, q, showInactive]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ordering: 'name' };
      if (branchId) {
        params.branch = branchId;
      }
      if (!branchId) {
        const branchRes = await API.general.getBranches({ ordering: 'name' });
        const list = Array.isArray(branchRes?.results) ? branchRes.results : Array.isArray(branchRes) ? branchRes : [];
        branches && setBranches(filterAccessibleBranches(user, list));
      }
      const res = await API.jobs.getTrucks(params);
      const list = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
      setRows(list);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load trucks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, user]);

  const saveRow = async (payload) => {
    setSaving(true);
    setError('');
    try {
      if (modal.mode === 'edit' && modal.row?.id) {
        await API.jobs.updateTruck(modal.row.id, payload);
      } else {
        await API.jobs.createTruck(payload);
      }
      setModal({ open: false, mode: 'create', row: null });
      await load();
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to save truck.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    setDeletingId(id);
    setError('');
    try {
      await API.jobs.deleteTruck(id);
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to delete truck.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex-1 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search trucks…"
              className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-subtle bg-card text-sm font-bold text-heading outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-body">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="w-4 h-4" />
            Show inactive
          </label>
        </div>
        <button
          type="button"
          onClick={() => setModal({ open: true, mode: 'create', row: { branch_id: branchId || branches[0]?.id || '' } })}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary-dark"
        >
          <Plus size={18} /> Add Truck
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[#FDE8E8] bg-[#FDE8E8]/40 px-5 py-4 text-sm text-[#791F1F]">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <p className="font-bold">{error}</p>
        </div>
      ) : null}

      <Card className="p-0 overflow-hidden border-0 shadow-xl bg-card rounded-[2rem]">
        <div className="px-6 py-5 border-b border-page flex items-center justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-body">Directory</div>
            <div className="text-lg font-heading font-extrabold text-heading">Trucks</div>
          </div>
          <button type="button" onClick={load} className="px-4 py-2 rounded-xl border-2 border-subtle bg-card text-xs font-black uppercase tracking-widest text-heading hover:border-primary/40">
            Refresh
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-16 flex items-center justify-center text-body">
              <Loader2 className="animate-spin mr-2" size={18} /> Loading…
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-[0.625rem] font-black uppercase tracking-widest text-body">
                  <tr>
                    <th className="text-left py-3 pr-3">Name</th>
                    <th className="text-left py-3 pr-3">Plate</th>
                    <th className="text-left py-3 pr-3">Status</th>
                    <th className="text-right py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-page">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-page/30 transition-colors">
                      <td className="py-3 pr-3 font-extrabold text-heading">{r.name || '—'}</td>
                      <td className="py-3 pr-3 text-body">{r.plate_number || '—'}</td>
                      <td className="py-3 pr-3">
                        <span className={`px-3 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-widest border ${r.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModal({ open: true, mode: 'edit', row: r })}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-subtle bg-card text-xs font-black uppercase tracking-widest text-heading hover:border-primary/40"
                          >
                            <Edit2 size={16} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(r.id)}
                            disabled={deletingId === r.id}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-subtle bg-card text-xs font-black uppercase tracking-widest text-heading hover:border-primary/40 disabled:opacity-50"
                          >
                            {deletingId === r.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-body">
                        No trucks found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {modal.open ? (
        <TruckModal
          title={modal.mode === 'edit' ? 'Edit Truck' : 'Add Truck'}
          initial={modal.row || {}}
          onClose={() => setModal({ open: false, mode: 'create', row: null })}
          onSave={saveRow}
          isSaving={saving}
        />
      ) : null}
    </div>
  );
}
