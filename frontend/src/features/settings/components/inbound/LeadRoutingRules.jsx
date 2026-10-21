import React, { useState, useEffect } from 'react';
import { Route, Plus, Trash2, Edit3, ArrowUpDown, CheckCircle2, ShieldCheck, X, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { routingApi } from '../../../../services/api';
import { GhostBtn, PrimaryBtn, Pill, StatusDot } from '../../../../shared/ui/RedesignAtoms';
import { useToast } from '../../../../shared/context/ToastContext';

const CONDITION_FIELDS = [
  { value: 'origin_state', label: 'Origin State' },
  { value: 'origin_zip', label: 'Origin Zip Code' },
  { value: 'origin_city', label: 'Origin City' },
  { value: 'destination_state', label: 'Destination State' },
  { value: 'destination_zip', label: 'Destination Zip Code' },
  { value: 'destination_city', label: 'Destination City' },
  { value: 'service_type', label: 'Service Type Code' },
  { value: 'move_type', label: 'Move Type Code' },
  { value: 'opportunity_type', label: 'Opportunity Type' },
  { value: 'move_size', label: 'Move Size Code' },
  { value: 'utm_source', label: 'UTM Source' },
  { value: 'utm_campaign', label: 'UTM Campaign' },
  { value: 'phone_type', label: 'Phone Type' },
  { value: 'bedrooms', label: 'Bedrooms Count' },
  { value: 'referral_source_id', label: 'Referral Source ID' },
  { value: 'provider_id', label: 'Lead Provider ID' },
];

const OPERATORS = [
  { value: 'eq', label: 'Equals (eq)' },
  { value: 'neq', label: 'Does Not Equal (neq)' },
  { value: 'in', label: 'In List (comma separated)' },
  { value: 'prefix', label: 'Starts With / Prefix (e.g. 75)' },
  { value: 'contains', label: 'Contains Substring' },
  { value: 'exists', label: 'Field Is Present' },
];

export default function LeadRoutingRules({ branches = [], staff = [], statuses = [] }) {
  const toast = useToast();
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleName, setRuleName] = useState('');
  const [priority, setPriority] = useState(10);
  const [conditions, setConditions] = useState([]);
  const [actions, setActions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const getNextAvailablePriority = (ruleList = rules) => {
    if (!ruleList || ruleList.length === 0) return 10;
    const used = new Set(ruleList.map(r => Number(r.priority)).filter(p => !isNaN(p) && p > 0));
    let next = 10;
    while (used.has(next)) {
      next += 10;
    }
    return next;
  };

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const data = await routingApi.listRules();
      // Sort by priority descending
      setRules([...data].sort((a, b) => (b.priority || 0) - (a.priority || 0)));
    } catch (err) {
      console.error('Failed to load routing rules:', err);
      toast?.showError?.('Failed to load routing rules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const openCreateModal = () => {
    setEditingRuleId(null);
    setRuleName('');
    setPriority(getNextAvailablePriority(rules));
    setConditions([{ field: 'origin_state', op: 'eq', value: '' }]);
    setActions([{ type: 'assign_branch', branch_id: branches[0]?.id || 1 }]);
    setIsModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name || '');
    setPriority(rule.priority ?? 10);
    setConditions(Array.isArray(rule.conditions) ? rule.conditions : []);
    setActions(Array.isArray(rule.actions) ? rule.actions : []);
    setIsModalOpen(true);
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this routing rule?')) return;
    try {
      await routingApi.deleteRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      toast?.showSuccess?.('Routing rule deleted');
    } catch (err) {
      toast?.showError?.('Failed to delete routing rule');
    }
  };

  const numericPriority = Number(priority);
  const duplicateRule = rules.find(
    r => r.id !== editingRuleId && Number(r.priority) === numericPriority
  );
  const isPriorityInvalid = priority === '' || isNaN(numericPriority) || numericPriority < 1;

  const handleSaveRule = async () => {
    if (!ruleName.trim()) {
      toast?.showError?.('Rule name is required');
      return;
    }
    if (isPriorityInvalid) {
      toast?.showError?.('Priority rank must be a valid number (1 or higher)');
      return;
    }
    if (duplicateRule) {
      toast?.showError?.(`Priority rank ${numericPriority} is already used by "${duplicateRule.name}". Please choose a unique priority rank.`);
      return;
    }
    if (actions.length === 0) {
      toast?.showError?.('At least one routing action is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: ruleName.trim(),
        priority: numericPriority,
        is_active: true,
        conditions: conditions.map(c => {
          let val = c.value;
          if (c.op === 'in' && typeof val === 'string') {
            val = val.split(',').map(s => s.trim()).filter(Boolean);
          }
          return { field: c.field, op: c.op, value: val };
        }),
        actions: actions.map(a => {
          if (a.type === 'assign_branch') return { type: 'assign_branch', branch_id: Number(a.branch_id) };
          if (a.type === 'assign_employee') return { type: 'assign_employee', employee_id: Number(a.employee_id) };
          if (a.type === 'set_custom_status') return { type: 'set_custom_status', status_code_id: Number(a.status_code_id) };
          if (a.type === 'create_task') return { type: 'create_task', title: a.title || 'Follow up with lead', due_in_days: Number(a.due_in_days || 0), task_type: a.task_type || 'follow_up' };
          return a;
        }),
      };

      if (editingRuleId) {
        await routingApi.updateRule(editingRuleId, payload);
        toast?.showSuccess?.('Routing rule updated');
      } else {
        await routingApi.createRule(payload);
        toast?.showSuccess?.('Routing rule created');
      }

      setIsModalOpen(false);
      loadRules();
    } catch (err) {
      console.error('Save rule error:', err);
      toast?.showError?.(err?.response?.data?.detail || err?.message || 'Failed to save routing rule');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Tenant Lead Routing Rules</h4>
          <p className="text-xs text-slate-500">Rules evaluate in descending priority order. The first matching rule assigns the destination branch and representative.</p>
        </div>
        <PrimaryBtn icon="plus" onClick={openCreateModal}>
          New Routing Rule
        </PrimaryBtn>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {rules.map((rule) => {
            const isDuplicatePriority = rules.filter(r => Number(r.priority) === Number(rule.priority)).length > 1;
            const branchAction = (rule.actions || []).find(a => a.type === 'assign_branch');
            const targetBranch = branches.find(b => b.id === branchAction?.branch_id);

            return (
              <div key={rule.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition dark:hover:bg-slate-800/40">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{rule.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                      isDuplicatePriority
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      Priority: {rule.priority}
                    </span>
                    {isDuplicatePriority && (
                      <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                        <AlertCircle size={10} /> Duplicate Rank
                      </span>
                    )}
                    <Pill tone={rule.is_active ? 'green' : 'slate'}>
                      <StatusDot tone={rule.is_active ? 'green' : 'slate'} />
                      <span>{rule.is_active ? 'Active' : 'Inactive'}</span>
                    </Pill>
                  </div>

                  {/* Conditions & Actions Summary */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Conditions:</span>
                    {rule.conditions?.length ? (
                      rule.conditions.map((c, i) => (
                        <span key={i} className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {c.field} {c.op} "{Array.isArray(c.value) ? c.value.join(', ') : String(c.value)}"
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic">Always matches (Universal)</span>
                    )}

                    <span className="text-slate-400 font-bold uppercase text-[10px] ml-2">Assigned:</span>
                    <span className="font-bold text-primary">
                      {targetBranch ? targetBranch.name : branchAction ? `Branch #${branchAction.branch_id}` : 'No branch action'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(rule)}
                    className="p-2 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}

          {rules.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No custom routing rules defined. Inbound leads will use provider default branches or main branch fallback.
            </div>
          )}
        </div>
      )}

      {/* Rule Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingRuleId ? 'Edit Routing Rule' : 'New Lead Routing Rule'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3 items-start">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g. Texas Local Long-Haul Route"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Priority (Rank)</label>
                  <input
                    type="number"
                    min="1"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 text-xs font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white transition-colors ${
                      duplicateRule
                        ? 'border-amber-400 focus:border-amber-500 ring-1 ring-amber-400 bg-amber-50/20 dark:bg-amber-950/20'
                        : isPriorityInvalid
                        ? 'border-rose-400 focus:border-rose-500 ring-1 ring-rose-400 bg-rose-50/20 dark:bg-rose-950/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Priority rank validation and status indicator */}
              <div className="transition-all duration-150">
                {duplicateRule ? (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    <AlertCircle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Priority rank <strong>{priority}</strong> is already used by <strong>"{duplicateRule.name}"</strong>. Each rule must have a unique rank.
                    </span>
                  </div>
                ) : isPriorityInvalid ? (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
                    <AlertCircle size={15} className="shrink-0 text-rose-500" />
                    <span>Please enter a valid rank number (1 or higher). Higher numbers evaluate first.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Priority rank <strong>{priority}</strong> is accepted & unique.</span>
                  </div>
                )}
              </div>

              {/* Conditions List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                    If ALL of the following match:
                  </span>
                  <button
                    type="button"
                    onClick={() => setConditions(prev => [...prev, { field: 'origin_state', op: 'eq', value: '' }])}
                    className="text-primary hover:underline text-xs font-bold flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Condition
                  </button>
                </div>

                {conditions.map((cond, idx) => (
                  <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <select
                      value={cond.field}
                      onChange={(e) => {
                        const next = [...conditions];
                        next[idx].field = e.target.value;
                        setConditions(next);
                      }}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900"
                    >
                      {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>

                    <select
                      value={cond.op}
                      onChange={(e) => {
                        const next = [...conditions];
                        next[idx].op = e.target.value;
                        setConditions(next);
                      }}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900"
                    >
                      {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>

                    <input
                      type="text"
                      placeholder="Expected value..."
                      value={Array.isArray(cond.value) ? cond.value.join(', ') : cond.value || ''}
                      onChange={(e) => {
                        const next = [...conditions];
                        next[idx].value = e.target.value;
                        setConditions(next);
                      }}
                      className="flex-1 rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900"
                    />

                    <button
                      type="button"
                      onClick={() => setConditions(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Actions List */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block">
                  Then apply these actions:
                </span>

                {actions.map((act, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-500 uppercase text-[10px] w-28">
                      {act.type === 'assign_branch' ? 'Assign Branch' : act.type === 'assign_employee' ? 'Assign Rep' : act.type === 'set_custom_status' ? 'Custom Status' : 'Create Task'}
                    </span>

                    {act.type === 'assign_branch' && (
                      <select
                        value={act.branch_id || ''}
                        onChange={(e) => {
                          const next = [...actions];
                          next[idx].branch_id = Number(e.target.value);
                          setActions(next);
                        }}
                        className="flex-1 rounded-lg border border-slate-200 bg-white p-1.5 text-xs"
                      >
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    )}

                    {act.type === 'create_task' && (
                      <input
                        type="text"
                        value={act.title || ''}
                        onChange={(e) => {
                          const next = [...actions];
                          next[idx].title = e.target.value;
                          setActions(next);
                        }}
                        placeholder="Task title..."
                        className="flex-1 rounded-lg border border-slate-200 bg-white p-1.5 text-xs"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
              <GhostBtn onClick={() => setIsModalOpen(false)}>Cancel</GhostBtn>
              <PrimaryBtn onClick={handleSaveRule} loading={isSaving} disabled={Boolean(duplicateRule) || isPriorityInvalid}>
                Save Rule
              </PrimaryBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
