import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../../shared/ui/Card';
import { Plus, Search, Edit2, Trash2, Loader2, AlertCircle, Save } from 'lucide-react';
import API from '../../../services/api';
import { filterAccessibleBranches, getUserBranchIds } from '../../../shared/utils/branchScope';
import { useAuth } from '../../auth/context/AuthContext';

const Input = ({ value, onChange, placeholder, className = '' }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-4 py-3 rounded-xl border-2 border-subtle bg-card text-sm font-bold text-heading outline-none ${className}`}
  />
);

const CrewModal = ({ title, initial, onClose, onSave, isSaving }) => {
  const { user } = useAuth();
  const [form, setForm] = useState(() => ({
    display_name: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'mover',
    hourly_rate: '0.00',
    is_active: true,
    notes: '',
    branch_id: '',
    ...initial,
  }));




  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await API.general.getBranches({ ordering: 'name' });
        const list = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
        setBranches(filterAccessibleBranches(user, list));
      } catch (err) {
        console.error('Unable to load branches for crew member:', err);
      }
    };
    fetchBranches();
  }, [user]);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    await onSave({
      display_name: form.display_name,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      hourly_rate: form.hourly_rate,
      is_active: !!form.is_active,
      notes: form.notes,
      branch_id: form.branch_id ? Number(form.branch_id) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 border-0 shadow-2xl rounded-[2rem]">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-body">Crew</div>
            <div className="text-xl font-heading font-extrabold text-heading">{title}</div>
          </div>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border-2 border-subtle bg-card text-xs font-black uppercase tracking-widest text-heading hover:border-primary/40">
            Close
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Display Name</label>
              <Input value={form.display_name || ''} onChange={(e) => update('display_name', e.target.value)} placeholder="e.g., Marcus Johnson" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Role</label>
              <select
                value={form.role}
                onChange={(e) => update('role', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-subtle bg-card text-sm font-bold text-heading outline-none"
              >
                <option value="driver">Driver</option>
                <option value="lead">Lead</option>
                <option value="helper">Helper</option>
                <option value="mover">Mover</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Branch</label>
              <select
                value={form.branch_id || ''}
                onChange={(e) => update('branch_id', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-subtle bg-card text-sm font-bold text-heading outline-none"
              >
                <option value="">Unassigned</option>
                 {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>


            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">First Name</label>
              <Input value={form.first_name || ''} onChange={(e) => update('first_name', e.target.value)} placeholder="First name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Last Name</label>
              <Input value={form.last_name || ''} onChange={(e) => update('last_name', e.target.value)} placeholder="Last name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Email</label>
              <Input value={form.email || ''} onChange={(e) => update('email', e.target.value)} placeholder="Email (optional)" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Phone</label>
              <Input value={form.phone || ''} onChange={(e) => update('phone', e.target.value)} placeholder="Phone (optional)" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Hourly Rate</label>
              <Input value={form.hourly_rate || ''} onChange={(e) => update('hourly_rate', e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Active</label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-subtle bg-card">
                <input type="checkbox" checked={!!form.is_active} onChange={(e) => update('is_active', e.target.checked)} className="w-5 h-5" />
                <span className="text-sm font-bold text-heading">{form.is_active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[0.625rem] font-black uppercase tracking-widest text-body">Notes</label>
            <textarea
              rows={4}
              value={form.notes || ''}
              onChange={(e) => update('notes', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-subtle bg-card text-sm font-bold text-heading outline-none"
              placeholder="Internal notes (optional)"
            />
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

export default function CrewDirectory({ branchId }) {
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
      const text = `${r.display_name || ''} ${r.first_name || ''} ${r.last_name || ''} ${r.email || ''} ${r.phone || ''}`.toLowerCase();
      return text.includes(needle);
    });
  }, [rows, q, showInactive]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const branchRes = await API.general.getBranches({ ordering: 'name' });
      const branchList = Array.isArray(branchRes?.results) ? branchRes.results : Array.isArray(branchRes) ? branchRes : [];
      setBranches(branchList);
      const params = { ordering: '-created_at' };
      if (branchId) {
        params.branch = branchId;
      } else if (branchList.length) {
        params.branch = branchList.find((branch) => getUserBranchIds({ branches: [branch] }).includes(String(branch.id)))?.id || branchList[0].id;
      }
      const res = await API.crew.getCrewMembers(params);
      const list = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
      setRows(list);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load crew directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const saveRow = async (payload) => {
    setSaving(true);
    setError('');
    try {
      if (modal.mode === 'edit' && modal.row?.id) {
        await API.crew.updateCrewMember(modal.row.id, payload);
      } else {
        await API.crew.createCrewMember(payload);
      }
      setModal({ open: false, mode: 'create', row: null });
      await load();
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to save crew member.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    setDeletingId(id);
    setError('');
    try {
      await API.crew.deleteCrewMember(id);
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to delete crew member.');
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
              placeholder="Search crew…"
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
          <Plus size={18} /> Add Crew
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
            <div className="text-lg font-heading font-extrabold text-heading">Crew Members</div>
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
                    <th className="text-left py-3 pr-3">Role</th>
                    <th className="text-left py-3 pr-3">Contact</th>
                    <th className="text-right py-3 pr-3">Rate</th>
                    <th className="text-left py-3 pr-3">Status</th>
                    <th className="text-right py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-page">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-page/30 transition-colors">
                      <td className="py-3 pr-3 font-extrabold text-heading">{(r.display_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || '—').trim()}</td>
                      <td className="py-3 pr-3 text-body">{r.role || '—'}</td>
                      <td className="py-3 pr-3 text-body">{[r.email, r.phone].filter(Boolean).join(' • ') || '—'}</td>
                      <td className="py-3 pr-3 text-right font-extrabold text-heading">${Number(r.hourly_rate || 0).toFixed(2)}</td>
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
                      <td colSpan={6} className="py-10 text-center text-body">
                        No crew members found.
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
        <CrewModal
          title={modal.mode === 'edit' ? 'Edit Crew Member' : 'Add Crew Member'}
          initial={modal.row || {}}
          onClose={() => setModal({ open: false, mode: 'create', row: null })}
          onSave={saveRow}
          isSaving={saving}
        />
      ) : null}
    </div>
  );
}
