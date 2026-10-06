import React, { useEffect, useMemo, useState } from 'react';
import {
  PlusCircle,
  Save,
  Trash2,
  Copy,
  RefreshCw,
  Play,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  activateAutomationWorkflow,
  createAutomationStep,
  createAutomationWorkflow,
  deactivateAutomationWorkflow,
  deleteAutomationStep,
  deleteAutomationWorkflow,
  getAutomationFields,
  getAutomationVariables,
  getAutomationSteps,
  getAutomationWorkflows,
  testRunAutomationWorkflow,
  updateAutomationWorkflow,
  getCommunicationTemplates,
} from '../../../services/api';

const DEFAULT_WORKFLOW = {
  name: '',
  target_type: 'lead',
  is_active: true,
  trigger_policy: { on_create: true, on_update: true, on_status_change: true, scheduled: true },
  conditions: { match: 'all', rules: [] },
};

const DEFAULT_STEP = (step_type = 'wait') => {
  if (step_type === 'wait') return { step_type, run_once: true, is_active: true, config: { duration: 10, unit: 'minutes' } };
  if (step_type === 'send_email') return { step_type, run_once: true, is_active: true, config: { template_key: '', recipient: 'customer_email', require_email: true, attachments: [] } };
  if (step_type === 'send_sms') return { step_type, run_once: true, is_active: true, config: { template_key: '', recipient: 'customer_phone', require_sms_opt_in: true } };
  if (step_type === 'update_status') return { step_type, run_once: true, is_active: true, config: { field: 'status', value: '' } };
  return {
    step_type: 'create_task',
    run_once: true,
    is_active: true,
    config: {
      task_type: 'general',
      assign_to: 'record_owner',
      assigned_to_id: '',
      due_in: { duration: 1, unit: 'days' },
      notes: '',
    },
  };
};

const fallbackFieldsMeta = (target_type) => {
  const ops = [
    { op: 'equals', label: 'Equals' },
    { op: 'not_equals', label: 'Not Equals' },
    { op: 'contains', label: 'Contains' },
    { op: 'in', label: 'In list' },
    { op: 'is_set', label: 'Is set' },
    { op: 'date_within_next_days', label: 'Within next (days)' },
    { op: 'date_within_past_days', label: 'Within past (days)' },
  ];

  if (target_type === 'estimate') {
    return {
      fields: [
        { field: 'estimate.status', label: 'Estimate Status', type: 'choice', choices: [['draft', 'Draft'], ['sent', 'Sent'], ['signed', 'Signed'], ['voided', 'Voided']] },
        { field: 'estimate.sent', label: 'Estimate Sent', type: 'bool' },
        { field: 'estimate.esigned', label: 'Estimate Signed', type: 'bool' },
        { field: 'estimate.inventory_request_status', label: 'Inventory Request Status', type: 'choice', choices: [['not_requested', 'Not Requested'], ['requested', 'Requested'], ['submitted', 'Submitted']] },
        { field: 'estimate.inventory_review_status', label: 'Inventory Review Status', type: 'choice', choices: [['not_requested', 'Not Requested'], ['requested', 'Requested'], ['submitted', 'Submitted'], ['reviewed', 'Reviewed']] },
        { field: 'estimate.customer_selected_payment_option', label: 'Customer Selected Payment Option', type: 'choice', choices: [['deposit', 'Deposit'], ['full', 'Full'], ['custom', 'Custom']] },
        { field: 'opportunity.branch_id', label: 'Opportunity Branch', type: 'branch' },
        { field: 'opportunity.assigned_user_id', label: 'Opportunity Assigned To', type: 'user' },
        { field: 'opportunity.move_date', label: 'Opportunity Move Date', type: 'date' },
      ],
      operators: ops,
      choices: { branches: [], users: [] },
    };
  }

  if (target_type === 'job') {
    return {
      fields: [
        { field: 'job.status', label: 'Job Status', type: 'choice', choices: [['booked', 'Booked'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['canceled', 'Canceled']] },
        { field: 'job.move_date', label: 'Job Move Date', type: 'date' },
        { field: 'opportunity.branch_id', label: 'Opportunity Branch', type: 'branch' },
        { field: 'opportunity.assigned_user_id', label: 'Opportunity Assigned To', type: 'user' },
        { field: 'opportunity.move_date', label: 'Opportunity Move Date', type: 'date' },
      ],
      operators: ops,
      choices: { branches: [], users: [] },
    };
  }

  if (target_type === 'opportunity') {
    return {
      fields: [
        { field: 'opportunity.status', label: 'Opportunity Status', type: 'choice', choices: [['new', 'New'], ['active', 'Active'], ['estimate_ready', 'Estimate Ready'], ['booked', 'Booked'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['lost', 'Lost'], ['canceled', 'Canceled']] },
        { field: 'opportunity.workflow_stage', label: 'Opportunity Workflow Stage', type: 'choice', choices: [['new_lead', 'New Lead'], ['lead_in_progress', 'Lead In Progress'], ['opportunity', 'Opportunity'], ['estimate_ready', 'Estimate Ready'], ['booked', 'Booked'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['lost', 'Lost'], ['canceled', 'Canceled']] },
        { field: 'opportunity.is_booked', label: 'Opportunity Is Booked', type: 'bool' },
        { field: 'opportunity.booked_at', label: 'Opportunity Booked At', type: 'date' },
        { field: 'opportunity.cancelled_at', label: 'Opportunity Cancelled At', type: 'date' },
        { field: 'opportunity.branch_id', label: 'Opportunity Branch', type: 'branch' },
        { field: 'opportunity.assigned_user_id', label: 'Opportunity Assigned To', type: 'user' },
        { field: 'opportunity.move_date', label: 'Opportunity Move Date', type: 'date' },
      ],
      operators: ops,
      choices: { branches: [], users: [] },
    };
  }

  // lead
  return {
    fields: [
      { field: 'lead.status', label: 'Lead Status', type: 'string' },
      { field: 'lead.workflow_stage', label: 'Lead Workflow Stage', type: 'string' },
      { field: 'lead.branch_id', label: 'Lead Branch', type: 'branch' },
      { field: 'lead.assigned_to_id', label: 'Lead Assigned To', type: 'user' },
      { field: 'lead.move_date', label: 'Lead Move Date', type: 'date' },
      { field: 'lead.referral_source_id', label: 'Referral Source', type: 'number' },
      { field: 'lead.has_email', label: 'Has Email', type: 'bool' },
      { field: 'lead.has_phone', label: 'Has Phone', type: 'bool' },
      { field: 'lead.sms_opt_in', label: 'SMS Opt-in', type: 'bool' },
    ],
    operators: ops,
    choices: { branches: [], users: [] },
  };
};

const RuleBuilder = () => {
  const [workflows, setWorkflows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState({ ...DEFAULT_WORKFLOW });
  const [steps, setSteps] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [fieldsMeta, setFieldsMeta] = useState(() => fallbackFieldsMeta('lead'));
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [smsTemplates, setSmsTemplates] = useState([]);
  const [templateVariables, setTemplateVariables] = useState([]);
  const [testTargetId, setTestTargetId] = useState('');
  const [testTrace, setTestTrace] = useState(null);

  const filtered = useMemo(() => {
    const q = String(search || '').toLowerCase().trim();
    if (!q) return workflows;
    return workflows.filter((w) => String(w.name || '').toLowerCase().includes(q));
  }, [search, workflows]);

  const flash = (type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 2500);
  };

  const deduplicateByKey = (list) => {
    const keys = new Set();
    return list.filter((t) => {
      if (!t.template_key) return true;
      if (keys.has(t.template_key)) return false;
      keys.add(t.template_key);
      return true;
    });
  };

  const loadTemplates = async () => {
    try {
      const [emailRes, smsRes] = await Promise.all([
        getCommunicationTemplates({ channel: 'email', limit: 500 }),
        getCommunicationTemplates({ channel: 'sms', limit: 500 }),
      ]);
      
      const allEmails = emailRes?.results || emailRes || [];
      const allSms = smsRes?.results || smsRes || [];
      
      // Store full list to resolve legacy template_ids to template_keys
      window._allTemplatesCache = [...allEmails, ...allSms];

      setEmailTemplates(deduplicateByKey(allEmails));
      setSmsTemplates(deduplicateByKey(allSms));
    } catch (e) {
      // ignore
    }
  };

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const res = await getAutomationWorkflows();
      const items = res?.results || res || [];
      setWorkflows(items);
      if (!selectedId && items.length) {
        await handleSelect(items[0]);
      }
    } catch (e) {
      flash('error', 'Failed to load workflows.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFieldsMeta = async (target_type) => {
    try {
      const res = await getAutomationFields(target_type);
      setFieldsMeta(res || fallbackFieldsMeta(target_type));
    } catch (e) {
      setFieldsMeta(fallbackFieldsMeta(target_type));
      flash('error', 'Could not load condition fields (permissions or API issue). Showing fallback fields.');
    }
  };

  const loadTemplateVariables = async (target_type) => {
    try {
      const res = await getAutomationVariables(target_type);
      setTemplateVariables(res?.template_variables || []);
    } catch (e) {
      setTemplateVariables([]);
    }
  };

  const loadSteps = async (workflowId) => {
    try {
      const res = await getAutomationSteps({ workflow: workflowId });
      const items = res?.results || res || [];
      setSteps(items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
    } catch (e) {
      setSteps([]);
    }
  };

  const handleSelect = async (wf) => {
    if (!wf) return;
    setSelectedId(wf.id);
    setDraft({
      id: wf.id,
      name: wf.name,
      target_type: wf.target_type,
      is_active: !!wf.is_active,
      trigger_policy: wf.trigger_policy || { on_create: true, on_update: true, on_status_change: true, scheduled: true },
      conditions: wf.conditions || { match: 'all', rules: [] },
    });
    setTestTrace(null);
    setTestTargetId('');
    await Promise.all([loadFieldsMeta(wf.target_type), loadSteps(wf.id), loadTemplateVariables(wf.target_type)]);
  };

  const handleNew = async () => {
    setSelectedId(null);
    setDraft({ ...DEFAULT_WORKFLOW });
    setSteps([]);
    setTestTrace(null);
    setTestTargetId('');
    await loadFieldsMeta('lead');
    await loadTemplateVariables('lead');
  };

  const handleDuplicate = async () => {
    if (!draft?.id) return;
    setIsSaving(true);
    try {
      const wfPayload = {
        name: `${draft.name || 'Workflow'} (Copy)`,
        target_type: draft.target_type,
        is_active: false,
        trigger_policy: draft.trigger_policy,
        conditions: draft.conditions,
      };
      const newWf = await createAutomationWorkflow(wfPayload);
      const currentSteps = [...steps].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      for (let i = 0; i < currentSteps.length; i++) {
        const s = currentSteps[i];
        await createAutomationStep({
          workflow: newWf.id,
          sort_order: i,
          step_type: s.step_type,
          config: s.config,
          run_once: s.run_once,
          is_active: s.is_active,
        });
      }
      flash('success', 'Workflow duplicated.');
      await loadWorkflows();
      const refreshedRes = await getAutomationWorkflows();
      const refreshed = refreshedRes?.results || refreshedRes || [];
      const found = refreshed.find((x) => x.id === newWf.id);
      if (found) await handleSelect(found);
    } catch (e) {
      flash('error', 'Failed to duplicate workflow.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft?.id) return;
    if (!window.confirm('Delete this workflow?')) return;
    setIsSaving(true);
    try {
      await deleteAutomationWorkflow(draft.id);
      flash('success', 'Workflow deleted.');
      await loadWorkflows();
      await handleNew();
    } catch (e) {
      flash('error', 'Failed to delete workflow.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveAll = async () => {
    setIsSaving(true);
    try {
      const wfPayload = {
        name: draft.name,
        target_type: draft.target_type,
        is_active: !!draft.is_active,
        trigger_policy: draft.trigger_policy,
        conditions: draft.conditions,
      };
      let wfId = draft.id;
      if (!wfId) {
        const created = await createAutomationWorkflow(wfPayload);
        wfId = created.id;
      } else {
        await updateAutomationWorkflow(wfId, wfPayload);
      }

      // Replace steps (v1 simple approach)
      const existingStepsRes = await getAutomationSteps({ workflow: wfId });
      const existingSteps = existingStepsRes?.results || existingStepsRes || [];
      for (const s of existingSteps) {
        await deleteAutomationStep(s.id);
      }
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await createAutomationStep({
          workflow: wfId,
          sort_order: i,
          step_type: s.step_type,
          config: s.config,
          run_once: !!s.run_once,
          is_active: s.is_active !== false,
        });
      }

      flash('success', 'Saved.');
      await loadWorkflows();
      const res = await getAutomationWorkflows();
      const items = res?.results || res || [];
      const found = items.find((w) => w.id === wfId);
      if (found) await handleSelect(found);
    } catch (e) {
      flash('error', 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!draft?.id) {
      setDraft((p) => ({ ...p, is_active: !p.is_active }));
      return;
    }
    setIsSaving(true);
    try {
      if (draft.is_active) await deactivateAutomationWorkflow(draft.id);
      else await activateAutomationWorkflow(draft.id);
      await loadWorkflows();
      flash('success', 'Updated status.');
    } catch (e) {
      flash('error', 'Failed to update status.');
    } finally {
      setIsSaving(false);
    }
  };

  const runTest = async () => {
    if (!draft?.id) return;
    if (!String(testTargetId || '').trim()) return flash('error', 'Enter a record ID for test run.');
    setIsSaving(true);
    try {
      const res = await testRunAutomationWorkflow(draft.id, Number(testTargetId));
      setTestTrace(res || null);
    } catch (e) {
      flash('error', 'Test run failed.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadWorkflows();
    loadFieldsMeta('lead');
    loadTemplateVariables('lead');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCondition = () => {
    const firstField = fieldsMeta.fields?.[0]?.field || 'lead.status';
    setDraft((p) => ({
      ...p,
      conditions: {
        ...(p.conditions || { match: 'all', rules: [] }),
        rules: [...((p.conditions || {}).rules || []), { field: firstField, op: 'equals', value: '' }],
      },
    }));
  };

  const updateCondition = (idx, patch) => {
    setDraft((p) => {
      const rules = [...(((p.conditions || {}).rules) || [])];
      rules[idx] = { ...(rules[idx] || {}), ...patch };
      return { ...p, conditions: { ...(p.conditions || { match: 'all', rules: [] }), rules } };
    });
  };

  const removeCondition = (idx) => {
    setDraft((p) => {
      const rules = [...(((p.conditions || {}).rules) || [])].filter((_, i) => i !== idx);
      return { ...p, conditions: { ...(p.conditions || { match: 'all', rules: [] }), rules } };
    });
  };

  const addStep = () => setSteps((p) => [...p, DEFAULT_STEP('wait')]);

  const updateStep = (idx, patch) => {
    setSteps((p) => {
      const next = [...p];
      next[idx] = { ...(next[idx] || {}), ...patch };
      return next;
    });
  };

  const moveStep = (idx, dir) => {
    setSteps((p) => {
      const next = [...p];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return next;
      const tmp = next[idx];
      next[idx] = next[j];
      next[j] = tmp;
      return next;
    });
  };

  const removeStep = (idx) => setSteps((p) => p.filter((_, i) => i !== idx));

  const renderConditionValueInput = (rule, idx) => {
    const fieldInfo = (fieldsMeta.fields || []).find((f) => f.field === rule.field);
    const type = fieldInfo?.type || 'string';

    if (type === 'bool') {
      return (
        <select
          value={String(rule.value ?? '')}
          onChange={(e) => updateCondition(idx, { value: e.target.value === '' ? '' : e.target.value === 'true' })}
          className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
        >
          <option value="">Select</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }

    if (type === 'branch') {
      return (
        <select
          value={String(rule.value ?? '')}
          onChange={(e) => updateCondition(idx, { value: e.target.value === '' ? '' : Number(e.target.value) })}
          className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
        >
          <option value="">Select branch</option>
          {(fieldsMeta.choices?.branches || []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      );
    }

    if (type === 'user') {
      return (
        <select
          value={String(rule.value ?? '')}
          onChange={(e) => updateCondition(idx, { value: e.target.value === '' ? '' : Number(e.target.value) })}
          className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
        >
          <option value="">Select user</option>
          {(fieldsMeta.choices?.users || []).map((u) => (
            <option key={u.id} value={u.id}>
              {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'choice') {
      return (
        <select
          value={String(rule.value ?? '')}
          onChange={(e) => updateCondition(idx, { value: e.target.value })}
          className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
        >
          <option value="">Select</option>
          {(fieldInfo?.choices || []).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      );
    }

    if (type === 'date') {
      const isWindow = ['date_within_next_days', 'date_within_past_days'].includes(rule.op);
      return (
        <input
          type={isWindow ? 'number' : 'date'}
          value={String(rule.value ?? '')}
          onChange={(e) => updateCondition(idx, { value: e.target.value })}
          className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
          placeholder={isWindow ? 'Days' : ''}
        />
      );
    }

    return (
      <input
        value={String(rule.value ?? '')}
        onChange={(e) => updateCondition(idx, { value: e.target.value })}
        className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
        placeholder="Value"
      />
    );
  };

  const onChangeTargetType = async (target_type) => {
    setDraft((p) => ({
      ...p,
      target_type,
      conditions: { match: 'all', rules: [] },
    }));
    setSteps([]);
    await loadFieldsMeta(target_type);
    await loadTemplateVariables(target_type);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-heading">Automation Rules</h2>
          <p className="text-sm text-muted">Create multi-step workflows to send Email/SMS, update statuses, and create tasks.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadWorkflows}
            disabled={isLoading}
            className="px-4 py-2 bg-border rounded-xl text-sm font-bold hover:bg-border/70 transition-all flex items-center gap-2"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#003d2f] transition-all flex items-center gap-2"
          >
            <PlusCircle size={16} /> New
          </button>
        </div>
      </div>

      {message?.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-primary-tint/30 text-primary' : 'bg-[#FDE8E8]/30 text-[#791F1F]'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Workflow list */}
        <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 space-y-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows..."
            className="w-full px-4 py-2 bg-subtle rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
          />
          <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
            {filtered.map((w) => (
              <button
                key={w.id}
                onClick={() => handleSelect(w)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedId === w.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-subtle/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-body">{w.name}</div>
                  <span className={`text-[0.625rem] font-bold uppercase tracking-widest ${w.is_active ? 'text-primary' : 'text-muted'}`}>
                    {w.is_active ? 'Active' : 'Off'}
                  </span>
                </div>
                <div className="text-xs text-muted mt-1">Target: {w.target_type}</div>
              </button>
            ))}
            {!filtered.length && (
              <div className="text-sm text-muted py-6 text-center">No workflows</div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-8 bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted">Name</label>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                    className="w-full mt-1 px-4 py-2 bg-subtle rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
                    placeholder="e.g. New Lead Welcome"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted">Target</label>
                  <select
                    value={draft.target_type}
                    onChange={(e) => onChangeTargetType(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                  >
                    <option value="lead">Lead</option>
                    <option value="estimate">Estimate</option>
                    <option value="job">Job</option>
                    <option value="opportunity">Opportunity</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleActive}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${draft.is_active ? 'bg-primary' : 'bg-disabled'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${draft.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <div className="text-sm text-muted">Enabled</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDuplicate}
                disabled={!draft.id || isSaving}
                className="px-3 py-2 bg-border rounded-xl text-sm font-bold hover:bg-border/70 transition-all flex items-center gap-2"
              >
                <Copy size={16} /> Duplicate
              </button>
              <button
                onClick={handleDelete}
                disabled={!draft.id || isSaving}
                className="px-3 py-2 bg-[#FDE8E8]/60 text-[#791F1F] rounded-xl text-sm font-bold hover:bg-[#FDE8E8] transition-all flex items-center gap-2"
              >
                <Trash2 size={16} /> Delete
              </button>
              <button
                onClick={saveAll}
                disabled={isSaving || !String(draft.name || '').trim()}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#003d2f] transition-all flex items-center gap-2"
              >
                <Save size={16} /> Save
              </button>
            </div>
          </div>

          {/* Trigger policy */}
          <div className="border border-border rounded-2xl p-4 space-y-3">
            <div className="text-sm font-bold text-heading">Triggers</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['on_create', 'On Create'],
                ['on_update', 'On Update'],
                ['on_status_change', 'On Status Change'],
                ['scheduled', 'Scheduled Recheck'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 text-sm text-body">
                  <input
                    type="checkbox"
                    checked={!!draft.trigger_policy?.[key]}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        trigger_policy: { ...(p.trigger_policy || {}), [key]: e.target.checked },
                      }))
                    }
                    className="h-4 w-4"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Conditions */}
          <div className="border border-border rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-heading">Conditions</div>
              <div className="flex items-center gap-3">
                <select
                  value={draft.conditions?.match || 'all'}
                  onChange={(e) => setDraft((p) => ({ ...p, conditions: { ...(p.conditions || {}), match: e.target.value } }))}
                  className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                >
                  <option value="all">Match ALL</option>
                  <option value="any">Match ANY</option>
                </select>
                <button
                  onClick={addCondition}
                  className="px-3 py-2 bg-border rounded-xl text-sm font-bold hover:bg-border/70 transition-all flex items-center gap-2"
                >
                  <PlusCircle size={16} /> Add
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {(draft.conditions?.rules || []).map((rule, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-subtle/30 border border-border rounded-xl p-3">
                  <div className="md:col-span-4">
                    <select
                      value={rule.field}
                      onChange={(e) => updateCondition(idx, { field: e.target.value, value: '' })}
                      className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                    >
                      {(fieldsMeta.fields || []).map((f) => (
                        <option key={f.field} value={f.field}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <select
                      value={rule.op}
                      onChange={(e) => updateCondition(idx, { op: e.target.value, value: rule.value })}
                      className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                    >
                      {(fieldsMeta.operators || []).map((o) => (
                        <option key={o.op} value={o.op}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    {renderConditionValueInput(rule, idx)}
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button onClick={() => removeCondition(idx)} className="p-2 text-muted hover:text-body hover:bg-border rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {!((draft.conditions?.rules || []).length) && (
                <div className="text-sm text-muted">No conditions (will match everything).</div>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="border border-border rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-heading">Steps</div>
              <button
                onClick={addStep}
                className="px-3 py-2 bg-border rounded-xl text-sm font-bold hover:bg-border/70 transition-all flex items-center gap-2"
              >
                <PlusCircle size={16} /> Add Step
              </button>
            </div>

            <div className="space-y-3">
              {steps.map((s, idx) => (
                <div key={idx} className="border border-border rounded-2xl p-4 bg-subtle/20 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-muted">#{idx + 1}</span>
                      <select
                        value={s.step_type}
                        onChange={(e) => updateStep(idx, DEFAULT_STEP(e.target.value))}
                        className="px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                      >
                        <option value="wait">Wait</option>
                        <option value="send_email">Send Email</option>
                        <option value="send_sms">Send SMS</option>
                        <option value="update_status">Update Status</option>
                        <option value="create_task">Create Task</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="p-2 bg-border rounded-xl disabled:opacity-40"><ArrowUp size={16} /></button>
                      <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} className="p-2 bg-border rounded-xl disabled:opacity-40"><ArrowDown size={16} /></button>
                      <button onClick={() => removeStep(idx)} className="p-2 text-muted hover:text-body hover:bg-border rounded-xl transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 text-sm text-body">
                      <input
                        type="checkbox"
                        checked={s.run_once !== false}
                        onChange={(e) => updateStep(idx, { run_once: e.target.checked })}
                        className="h-4 w-4"
                      />
                      Run once per record
                    </label>
                  </div>

                  {s.step_type === 'wait' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">Duration</label>
                        <input
                          type="number"
                          value={s.config?.duration ?? 0}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), duration: Number(e.target.value) } })}
                          className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">Unit</label>
                        <select
                          value={s.config?.unit || 'minutes'}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), unit: e.target.value } })}
                          className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {s.step_type === 'send_email' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">Email Template</label>
                        <select
                          value={String(s.config?.template_key || (s.config?.template_id ? window._allTemplatesCache?.find(t => t.id === s.config.template_id)?.template_key : ''))}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), template_key: e.target.value, template_id: undefined } })}
                          className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                        >
                          <option value="">Select template</option>
                          {emailTemplates.map((t) => (
                            <option key={t.template_key || t.id} value={t.template_key || t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-3 text-sm text-body md:col-span-2">
                        <input
                          type="checkbox"
                          checked={s.config?.require_email !== false}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), require_email: e.target.checked } })}
                          className="h-4 w-4"
                        />
                        Require customer email
                      </label>

                      <div className="md:col-span-2 space-y-2">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted">Attachments</div>
                        {['estimate_pdf', 'invoice_pdf'].map((key) => {
                          const label = key === 'estimate_pdf' ? 'Attach estimate PDF' : 'Attach invoice PDF';
                          const hint = key === 'estimate_pdf'
                            ? 'Attach the latest estimate PDF when available.'
                            : 'Attach the latest invoice PDF when available.';
                          const enabled = Array.isArray(s.config?.attachments) && s.config.attachments.includes(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              className={`flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                                enabled ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-subtle/60'
                              }`}
                              onClick={() => {
                                const next = enabled
                                  ? (s.config?.attachments || []).filter((x) => x !== key)
                                  : Array.from(new Set([...(s.config?.attachments || []), key]));
                                updateStep(idx, { config: { ...(s.config || {}), attachments: next } });
                              }}
                            >
                              <div>
                                <div className="text-sm font-bold text-heading">{label}</div>
                                <div className="text-xs text-muted">{hint}</div>
                              </div>
                              <div className={`h-5 w-9 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-disabled'}`}>
                                <div
                                  className={`mt-[2px] ml-[2px] h-4 w-4 rounded-full bg-white transition-transform ${
                                    enabled ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {(() => {
                        const currentKey = s.config?.template_key || (s.config?.template_id ? window._allTemplatesCache?.find(t => t.id === s.config.template_id)?.template_key : null);
                        const template = emailTemplates.find((t) => t.template_key === currentKey) || null;
                        const used = Array.isArray(template?.variables) ? template.variables : [];
                        const allowed = new Set(templateVariables);
                        const missing = used.filter((key) => !allowed.has(key));
                        if (!template) return null;
                        return (
                          <div className="md:col-span-2 rounded-xl border border-border bg-subtle/40 p-3 text-xs text-body">
                            <div className="font-bold text-heading">Template variables</div>
                            <div className="mt-1">
                              {used.length ? used.join(', ') : 'No variables declared on this template.'}
                            </div>
                            {missing.length > 0 && (
                              <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                                Missing from automation variable catalog: {missing.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {s.step_type === 'send_sms' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">SMS Template</label>
                        <select
                          value={String(s.config?.template_key || (s.config?.template_id ? window._allTemplatesCache?.find(t => t.id === s.config.template_id)?.template_key : ''))}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), template_key: e.target.value, template_id: undefined } })}
                          className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                        >
                          <option value="">Select template</option>
                          {smsTemplates.map((t) => (
                            <option key={t.template_key || t.id} value={t.template_key || t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-3 text-sm text-body md:col-span-2">
                        <input
                          type="checkbox"
                          checked={s.config?.require_sms_opt_in !== false}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), require_sms_opt_in: e.target.checked } })}
                          className="h-4 w-4"
                        />
                        Require SMS opt-in
                      </label>
                    </div>
                  )}

                  {s.step_type === 'update_status' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">Field</label>
                        <select
                          value={s.config?.field || 'status'}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), field: e.target.value, value: '' } })}
                          className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                        >
                          <option value="status">Status</option>
                          {(draft.target_type === 'lead' || draft.target_type === 'opportunity') && <option value="workflow_stage">Workflow Stage</option>}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">Value</label>
                        <input
                          value={String(s.config?.value || '')}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), value: e.target.value } })}
                          className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                          placeholder="e.g. confirmed"
                        />
                      </div>
                    </div>
                  )}

                  {s.step_type === 'create_task' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">Task Type</label>
                        <select
                          value={s.config?.task_type || 'general'}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), task_type: e.target.value } })}
                          className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                        >
                          <option value="call">Call</option>
                          <option value="email">Email</option>
                          <option value="sms">SMS</option>
                          <option value="meeting">Meeting</option>
                          <option value="general">General</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">Assign To</label>
                        <select
                          value={s.config?.assign_to || 'record_owner'}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), assign_to: e.target.value } })}
                          className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                        >
                          <option value="record_owner">Record Owner</option>
                          <option value="specific_user">Specific User</option>
                        </select>
                      </div>
                      {s.config?.assign_to === 'specific_user' && (
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-muted">User</label>
                          <select
                            value={String(s.config?.assigned_to_id || '')}
                            onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), assigned_to_id: e.target.value ? Number(e.target.value) : '' } })}
                            className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                          >
                            <option value="">Select user</option>
                            {(fieldsMeta.choices?.users || []).map((u) => (
                              <option key={u.id} value={u.id}>
                                {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">Due In</label>
                        <input
                          type="number"
                          value={s.config?.due_in?.duration ?? 1}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), due_in: { ...(s.config?.due_in || {}), duration: Number(e.target.value) } } })}
                          className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">Unit</label>
                        <select
                          value={s.config?.due_in?.unit || 'days'}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), due_in: { ...(s.config?.due_in || {}), unit: e.target.value } } })}
                          className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">Notes (templated)</label>
                        <textarea
                          value={String(s.config?.notes || '')}
                          onChange={(e) => updateStep(idx, { config: { ...(s.config || {}), notes: e.target.value } })}
                          className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none min-h-[90px]"
                          placeholder="e.g. Call {{customer_name}} about deposit"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {!steps.length && <div className="text-sm text-muted">No steps yet.</div>}
            </div>
          </div>

          {/* Test run */}
          <div className="border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-heading">Test Run</div>
              <button
                onClick={runTest}
                disabled={!draft.id || isSaving}
                className="px-3 py-2 bg-border rounded-xl text-sm font-bold hover:bg-border/70 transition-all flex items-center gap-2"
              >
                <Play size={16} /> Run
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Record ID</label>
                <input
                  value={testTargetId}
                  onChange={(e) => setTestTargetId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                  placeholder={`Enter ${draft.target_type} id`}
                />
              </div>
              <div className="md:col-span-2 text-xs text-muted">
                Runs a dry evaluation and shows condition matches + configured steps (does not send messages).
              </div>
            </div>
            {testTrace && (
              <pre className="text-xs bg-subtle/60 border border-border rounded-xl p-3 overflow-auto max-h-64">
                {JSON.stringify(testTrace, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleBuilder;
