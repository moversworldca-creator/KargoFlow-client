import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import {
  createCustomAutomation,
  updateCustomAutomation,
  getCustomAutomationEvents,
  getGeneralTemplates,
} from '../../../services/api';

const OPERATORS = [
  { value: 'eq', label: 'Equals (==)' },
  { value: 'ne', label: 'Does not equal (!=)' },
  { value: 'in', label: 'Is in list (comma-separated)' },
  { value: 'not_in', label: 'Is not in list' },
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'gte', label: 'Greater than or equal (>=)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'lte', label: 'Less than or equal (<=)' },
  { value: 'is_set', label: 'Is set (not empty)' },
  { value: 'is_empty', label: 'Is empty / not set' },
  { value: 'contains', label: 'Contains (case-insensitive)' },
];

const COMMON_FIELDS = {
  lead: [
    { field: 'lead.system_state', label: 'System State (e.g. new)' },
    { field: 'lead.status', label: 'Status' },
    { field: 'lead.source', label: 'Lead Source' },
    { field: 'lead.email', label: 'Customer Email' },
    { field: 'lead.phone', label: 'Customer Phone' },
    { field: 'lead.move_type', label: 'Move Type' },
  ],
  opportunity: [
    { field: 'opportunity.stage', label: 'Stage' },
    { field: 'opportunity.status', label: 'Status' },
    { field: 'opportunity.source', label: 'Source' },
    { field: 'opportunity.branch_id', label: 'Branch ID' },
  ],
};

const initialAutomationState = () => ({
  id: null,
  name: '',
  description: '',
  event: 'lead.created',
  branch_id: null,
  is_active: true,
  conditions: {
    all: [],
    any: [],
  },
  steps: [
    {
      channel: 'email',
      template_id: '',
      delay_minutes: 0,
      delay_value: 0,
      delay_unit: 'minutes',
      is_active: true,
    },
  ],
});

export default function AutomationWizardModal({
  open,
  onClose,
  onSaved,
  initialValue,
  branches = [],
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState('');
  const [error, setError] = useState(null);

  const [events, setEvents] = useState([]);
  const [generalEmailTemplates, setGeneralEmailTemplates] = useState([]);
  const [generalSmsTemplates, setGeneralSmsTemplates] = useState([]);

  const [formData, setFormData] = useState(initialAutomationState);

  // Load events and general templates on modal open
  useEffect(() => {
    if (!open) return;

    setError(null);
    setMetadataError('');
    setMetadataLoading(true);
    setActiveStep(0);
    let cancelled = false;

    const loadMetadata = async () => {
      try {
        const [eventsRes, emailTemplatesRes, smsTemplatesRes] = await Promise.all([
          getCustomAutomationEvents(),
          getGeneralTemplates({ channel: 'email' }),
          getGeneralTemplates({ channel: 'sms' }),
        ]);

        if (cancelled) return;
        const eventList = eventsRes?.results || eventsRes || [];
        setEvents(eventList);

        const filterActiveTemplates = (list) => {
          return (list || []).filter((t) => {
            if (t.state && t.state !== 'active') return false;
            if (t.is_active === false) return false;
            if (Object.prototype.hasOwnProperty.call(t, 'revision_id') && !t.revision_id) return false;
            return true;
          });
        };

        const emailList = filterActiveTemplates(emailTemplatesRes?.results || emailTemplatesRes || []);
        const smsList = filterActiveTemplates(smsTemplatesRes?.results || smsTemplatesRes || []);
        setGeneralEmailTemplates(emailList);
        setGeneralSmsTemplates(smsList);
      } catch (err) {
        console.error('Failed to load automation metadata:', err);
        if (!cancelled) {
          const data = err?.response?.data;
          setMetadataError(
            data?.detail ||
              data?.error ||
              err?.message ||
              'Could not load automation events and active General templates. Try again before saving.'
          );
          setEvents([]);
          setGeneralEmailTemplates([]);
          setGeneralSmsTemplates([]);
        }
      } finally {
        if (!cancelled) setMetadataLoading(false);
      }
    };

    loadMetadata();

    if (initialValue) {
      // Normalize incoming automation
      const condAll = Array.isArray(initialValue.conditions?.all) ? initialValue.conditions.all : [];
      const condAny = Array.isArray(initialValue.conditions?.any) ? initialValue.conditions.any : [];

      const mappedSteps = (initialValue.steps || []).map((s) => {
        const totalMinutes = Number(s.delay_minutes || 0);
        let delay_unit = 'minutes';
        let delay_value = totalMinutes;

        if (totalMinutes > 0 && totalMinutes % 1440 === 0) {
          delay_unit = 'days';
          delay_value = totalMinutes / 1440;
        } else if (totalMinutes > 0 && totalMinutes % 60 === 0) {
          delay_unit = 'hours';
          delay_value = totalMinutes / 60;
        }

        return {
          id: s.id,
          channel: s.channel || 'email',
          template_id: s.template_id ? String(s.template_id) : '',
          template_name: s.template_name || s.template?.name || '',
          delay_minutes: totalMinutes,
          delay_value,
          delay_unit,
          is_active: s.is_active !== false,
        };
      });

      setFormData({
        id: initialValue.id || null,
        name: initialValue.name || '',
        description: initialValue.description || '',
        event: initialValue.event || 'lead.created',
        branch_id: initialValue.branch_id ?? null,
        is_active: initialValue.is_active !== false,
        conditions: {
          all: condAll,
          any: condAny,
        },
        steps: mappedSteps.length ? mappedSteps : [
          {
            channel: 'email',
            template_id: '',
            delay_minutes: 0,
            delay_value: 0,
            delay_unit: 'minutes',
            is_active: true,
          },
        ],
      });
    } else {
      setFormData(initialAutomationState());
    }

    return () => {
      cancelled = true;
    };
  }, [open, initialValue]);

  if (!open) return null;

  const currentEventMeta = events.find((e) => e.event === formData.event);
  const targetType = currentEventMeta?.target || (formData.event.startsWith('lead.') ? 'lead' : 'opportunity');

  // Steps for the stepper
  const stepLabels = ['Trigger', 'Action', 'Target', 'Filters'];
  const triggerEvents = events;
  const targetOptions = Array.from(new Set([
    targetType,
    ...triggerEvents.map((event) => event.target).filter(Boolean),
  ]));
  const branchName = branches.find((branch) => String(branch.id) === String(formData.branch_id))?.name;
  const allConditionsCount = (formData.conditions.all || []).length;
  const anyConditionsCount = (formData.conditions.any || []).length;

  // Add condition rule
  const addConditionRule = (group) => {
    const defaultField = targetType === 'lead' ? 'lead.system_state' : 'opportunity.stage';
    setFormData((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [group]: [...(prev.conditions[group] || []), { field: defaultField, op: 'eq', value: '' }],
      },
    }));
  };

  const updateConditionRule = (group, index, patch) => {
    setFormData((prev) => {
      const updatedGroup = [...(prev.conditions[group] || [])];
      updatedGroup[index] = { ...updatedGroup[index], ...patch };
      return {
        ...prev,
        conditions: {
          ...prev.conditions,
          [group]: updatedGroup,
        },
      };
    });
  };

  const removeConditionRule = (group, index) => {
    setFormData((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [group]: prev.conditions[group].filter((_, i) => i !== index),
      },
    }));
  };

  // Add communication step
  const addCommunicationStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          channel: 'email',
          template_id: '',
          delay_minutes: 0,
          delay_value: 0,
          delay_unit: 'minutes',
          is_active: true,
        },
      ],
    }));
  };

  const updateCommunicationStep = (index, patch) => {
    setFormData((prev) => {
      const nextSteps = [...prev.steps];
      const cur = { ...nextSteps[index], ...patch };

      // Recompute delay_minutes if delay_value or delay_unit changes
      if ('delay_value' in patch || 'delay_unit' in patch) {
        const val = Math.max(0, parseInt(cur.delay_value || 0, 10));
        let mins = val;
        if (cur.delay_unit === 'hours') mins = val * 60;
        if (cur.delay_unit === 'days') mins = val * 1440;
        cur.delay_minutes = Math.min(525600, mins); // Cap at 365 days
      }

      nextSteps[index] = cur;
      return { ...prev, steps: nextSteps };
    });
  };

  const removeCommunicationStep = (index) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const moveCommunicationStep = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= formData.steps.length) return;
    setFormData((prev) => {
      const copy = [...prev.steps];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return { ...prev, steps: copy };
    });
  };

  // Validation
  const validateForm = () => {
    if (metadataLoading) {
      return 'Automation events and templates are still loading.';
    }
    if (metadataError) {
      return 'Automation metadata could not be loaded. Retry by closing and reopening the editor.';
    }
    if (triggerEvents.length === 0) {
      return 'No automation events are available.';
    }
    const trimmedName = String(formData.name || '').trim();
    if (!trimmedName) {
      return 'Automation name is required.';
    }
    if (trimmedName.length > 160) {
      return 'Automation name must not exceed 160 characters.';
    }
    if (trimmedName.toLowerCase().startsWith('notification:')) {
      return 'Names starting with "notification:" are reserved for system notifications.';
    }
    if (formData.description && formData.description.length > 2000) {
      return 'Description must not exceed 2000 characters.';
    }
    if (!formData.event) {
      return 'Please select a trigger event.';
    }

    // Validate condition fields (must have single dot: entity.field)
    const allConds = [...(formData.conditions.all || []), ...(formData.conditions.any || [])];
    for (const c of allConds) {
      const f = String(c.field || '').trim();
      if (!f) {
        return 'Condition field name cannot be empty.';
      }
      const parts = f.split('.');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return `Invalid condition field "${f}". Field names must use single-dot notation (e.g. "lead.status" or "opportunity.stage").`;
      }
    }

    if (!formData.steps || formData.steps.length === 0) {
      return 'At least one communication step is required.';
    }
    for (let i = 0; i < formData.steps.length; i++) {
      const s = formData.steps[i];
      if (!s.template_id) {
        return `Step ${i + 1} (${s.channel.toUpperCase()}) requires a template.`;
      }
      const pool = s.channel === 'sms' ? generalSmsTemplates : generalEmailTemplates;
      const activeMatch = pool.find((t) => String(t.id) === String(s.template_id));
      if (!activeMatch) {
        return pool.length === 0
          ? `No active General ${s.channel.toUpperCase()} templates are available for step ${i + 1}.`
          : `Step ${i + 1} (${s.channel.toUpperCase()}) must use an active, usable General template.`;
      }
      if (s.delay_minutes < 0 || s.delay_minutes > 525600) {
        return `Step ${i + 1} delay must be between 0 and 525,600 minutes (365 days).`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    // Format clean conditions
    const cleanConditions = {};
    if (formData.conditions.all && formData.conditions.all.length > 0) {
      cleanConditions.all = formData.conditions.all.map((c) => ({
        field: c.field.trim(),
        op: c.op,
        ...(c.op === 'is_set' || c.op === 'is_empty'
          ? {}
          : {
              value:
                c.op === 'in' || c.op === 'not_in'
                  ? String(c.value || '')
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean)
                  : c.value,
            }),
      }));
    }
    if (formData.conditions.any && formData.conditions.any.length > 0) {
      cleanConditions.any = formData.conditions.any.map((c) => ({
        field: c.field.trim(),
        op: c.op,
        ...(c.op === 'is_set' || c.op === 'is_empty'
          ? {}
          : {
              value:
                c.op === 'in' || c.op === 'not_in'
                  ? String(c.value || '')
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean)
                  : c.value,
            }),
      }));
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description?.trim() || '',
      event: formData.event,
      branch_id: formData.branch_id ? Number(formData.branch_id) : null,
      is_active: Boolean(formData.is_active),
      conditions: cleanConditions,
      steps: formData.steps.map((s) => ({
        channel: s.channel,
        template_id: Number(s.template_id),
        delay_minutes: Number(s.delay_minutes || 0),
        is_active: Boolean(s.is_active),
      })),
    };

    try {
      if (formData.id) {
        await updateCustomAutomation(formData.id, payload);
      } else {
        await createCustomAutomation(payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to save custom automation:', err);
      const data = err?.response?.data;
      let detail = 'Failed to save custom automation.';
      if (typeof data === 'string') {
        detail = data;
      } else if (data?.detail) {
        detail = data.detail;
      } else if (data?.error) {
        detail = data.error;
      } else if (data && typeof data === 'object') {
        const parts = [];
        for (const [k, v] of Object.entries(data)) {
          if (Array.isArray(v)) {
            parts.push(`${k}: ${v.join(' ')}`);
          } else if (typeof v === 'object' && v !== null) {
            for (const [subK, subV] of Object.entries(v)) {
              parts.push(`${k}.${subK}: ${Array.isArray(subV) ? subV.join(' ') : subV}`);
            }
          } else {
            parts.push(`${k}: ${v}`);
          }
        }
        if (parts.length > 0) detail = parts.join('; ');
      } else if (err?.message) {
        detail = err.message;
      }
      setError(detail);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[94vh] border border-brand-border shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-brand-border flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-heading">
            {formData.id ? 'Edit Automation' : 'Create Automation'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close automation editor"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-brand-border shrink-0 space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-1">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={160}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Automation name"
                className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-1">
                Target
              </label>
              <select
                value={targetType}
                onChange={(e) => {
                  const matchingEvent = triggerEvents.find((event) => event.target === e.target.value);
                  if (matchingEvent) setFormData({ ...formData, event: matchingEvent.event });
                }}
                className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                {targetOptions.map((target) => (
                  <option key={target} value={target}>
                    {target.charAt(0).toUpperCase() + target.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-1">
                Branch
              </label>
              <select
                value={formData.branch_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    branch_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            <label className="md:col-span-1 flex items-center gap-2 text-sm text-heading pb-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span>Enabled</span>
            </label>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-1">
              Description (optional)
            </label>
            <textarea
              rows={1}
              maxLength={2000}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this automation does"
              className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-y"
            />
          </div>
        </div>

        {/* Stepper Header */}
        <div className="px-5 py-2.5 border-b border-brand-border shrink-0 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[520px]">
            {stepLabels.map((label, idx) => {
              const isActive = activeStep === idx;
              const isPast = activeStep > idx;
              return (
                <React.Fragment key={label}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    disabled={metadataLoading || Boolean(metadataError)}
                    className="flex items-center gap-2 group cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-blue-50 text-primary border border-primary'
                          : isPast
                          ? 'bg-orange-200 text-heading'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}
                    >
                      {isPast ? <CheckCircle2 size={15} /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs font-bold tracking-tight ${
                        isActive ? 'text-primary' : isPast ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                  {idx < stepLabels.length - 1 && (
                    <div className="flex-1 mx-4 h-0.5 bg-slate-200">
                      <div
                        className={`h-full transition-all duration-300 ${
                          activeStep > idx ? 'bg-emerald-600 w-full' : 'w-0'
                        }`}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-sm shrink-0">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{error}</div>
          </div>
        )}
        {metadataError && (
          <div role="alert" className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-sm shrink-0">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">
              <span className="font-bold">Could not load automation setup data.</span>{' '}
              {metadataError}
            </div>
          </div>
        )}
        {metadataLoading && (
          <div role="status" className="mx-5 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm shrink-0">
            Loading automation events and active General templates...
          </div>
        )}

        {/* Step Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-w-0 overflow-y-auto p-5">
          {/* STEP 0: Trigger & Scope */}
          {activeStep === 0 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div>
                <h3 className="text-xl font-bold text-heading">When should this automation trigger?</h3>
                <p className="text-xs text-muted mt-0.5">
                  Choose the event that will start this automation.
                </p>
              </div>

              <div className="rounded-xl border border-brand-border p-4 space-y-3">
                <div className="text-sm font-bold text-heading">Configure Trigger</div>
                <div className="max-w-md">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-1">
                    Event
                  </label>
                  <select
                    value={formData.event}
                    onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                    disabled={metadataLoading || Boolean(metadataError) || triggerEvents.length === 0}
                    className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {triggerEvents.map((event) => (
                      <option key={event.event} value={event.event}>
                        {event.event} ({event.target}) {!event.emitted ? '— [Not emitted yet]' : ''}
                      </option>
                    ))}
                  </select>
                  {currentEventMeta && !currentEventMeta.emitted && (
                    <div className="mt-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-2 flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0 text-amber-600" />
                      <span>This event is accepted but not currently emitted by the application.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Filters */}
          {activeStep === 3 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div>
                <h3 className="text-xl font-bold text-heading">Add filters (optional)</h3>
                <p className="text-xs text-muted mt-0.5">
                  Define matching rules to filter when this automation should execute. If left empty, it runs for every record of target <strong>{targetType}</strong>.
                </p>
              </div>

              {/* ALL Group */}
              <div className="p-5 bg-slate-50/60 rounded-2xl border border-brand-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-mono text-[11px]">ALL</span>
                      <span>Must Match All Conditions (AND)</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">Every condition in this group must be satisfied.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addConditionRule('all')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-brand-border rounded-xl text-xs font-bold text-heading hover:bg-slate-100 transition-colors shadow-xs"
                  >
                    <Plus size={14} /> Add Rule
                  </button>
                </div>

                {formData.conditions.all.length === 0 ? (
                  <div className="text-xs text-muted py-2 text-center bg-white/60 rounded-xl border border-dashed border-slate-200">
                    No "ALL" conditions defined.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formData.conditions.all.map((rule, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 bg-white rounded-xl border border-brand-border">
                        <input
                          type="text"
                          value={rule.field}
                          onChange={(e) => updateConditionRule('all', idx, { field: e.target.value })}
                          placeholder="e.g. lead.system_state"
                          className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border font-mono w-48"
                        />
                        <select
                          value={rule.op}
                          onChange={(e) => updateConditionRule('all', idx, { op: e.target.value })}
                          className="px-2.5 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border"
                        >
                          {OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        {rule.op !== 'is_set' && rule.op !== 'is_empty' && (
                          <input
                            type="text"
                            value={Array.isArray(rule.value) ? rule.value.join(', ') : rule.value ?? ''}
                            onChange={(e) => updateConditionRule('all', idx, { value: e.target.value })}
                            placeholder={rule.op === 'in' || rule.op === 'not_in' ? 'item1, item2' : 'value'}
                            className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border flex-1 min-w-[120px]"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeConditionRule('all', idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ANY Group */}
              <div className="p-5 bg-slate-50/60 rounded-2xl border border-brand-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-heading flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 rounded font-mono text-[11px]">ANY</span>
                      <span>Match At Least One Condition (OR)</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">At least one condition in this group must be satisfied.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addConditionRule('any')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-brand-border rounded-xl text-xs font-bold text-heading hover:bg-slate-100 transition-colors shadow-xs"
                  >
                    <Plus size={14} /> Add Rule
                  </button>
                </div>

                {formData.conditions.any.length === 0 ? (
                  <div className="text-xs text-muted py-2 text-center bg-white/60 rounded-xl border border-dashed border-slate-200">
                    No "ANY" conditions defined.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formData.conditions.any.map((rule, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 bg-white rounded-xl border border-brand-border">
                        <input
                          type="text"
                          value={rule.field}
                          onChange={(e) => updateConditionRule('any', idx, { field: e.target.value })}
                          placeholder="e.g. lead.source"
                          className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border font-mono w-48"
                        />
                        <select
                          value={rule.op}
                          onChange={(e) => updateConditionRule('any', idx, { op: e.target.value })}
                          className="px-2.5 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border"
                        >
                          {OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        {rule.op !== 'is_set' && rule.op !== 'is_empty' && (
                          <input
                            type="text"
                            value={Array.isArray(rule.value) ? rule.value.join(', ') : rule.value ?? ''}
                            onChange={(e) => updateConditionRule('any', idx, { value: e.target.value })}
                            placeholder={rule.op === 'in' || rule.op === 'not_in' ? 'item1, item2' : 'value'}
                            className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border flex-1 min-w-[120px]"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeConditionRule('any', idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 1: Actions */}
          {activeStep === 1 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-heading">Actions</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Configure the message steps to send. Each step uses an active General template.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addCommunicationStep}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-[#003d2f] transition-all shadow-sm"
                >
                  <Plus size={15} /> Add Step
                </button>
              </div>

              <div className="space-y-4">
                {formData.steps.map((step, idx) => {
                  const availableTemplates =
                    step.channel === 'sms' ? generalSmsTemplates : generalEmailTemplates;

                  return (
                    <div
                      key={idx}
                      className="p-5 bg-slate-50/70 rounded-2xl border border-brand-border space-y-4 relative transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-bold text-heading">
                            Step {idx + 1}: Send {step.channel.toUpperCase()}
                          </span>
                          {step.delay_minutes === 0 ? (
                            <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-200">
                              Immediate
                            </span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-200">
                              Wait {step.delay_value} {step.delay_unit}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveCommunicationStep(idx, idx - 1)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 rounded"
                            title="Move Up"
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === formData.steps.length - 1}
                            onClick={() => moveCommunicationStep(idx, idx + 1)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 rounded"
                            title="Move Down"
                          >
                            <ArrowDown size={15} />
                          </button>
                          {formData.steps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCommunicationStep(idx)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                              title="Delete Step"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                        {/* Channel selector */}
                        <div className="md:col-span-3">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                            Channel
                          </label>
                          <select
                            value={step.channel}
                            onChange={(e) =>
                              updateCommunicationStep(idx, {
                                channel: e.target.value,
                                template_id: '',
                              })
                            }
                            className="w-full px-3 py-2 bg-white rounded-xl text-xs font-semibold border border-brand-border outline-none focus:border-primary"
                          >
                            <option value="email">Email</option>
                            <option value="sms">SMS</option>
                          </select>
                        </div>

                        {/* General Template selector */}
                        <div className="md:col-span-5">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                            General Template <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={step.template_id}
                            onChange={(e) => updateCommunicationStep(idx, { template_id: e.target.value })}
                            className="w-full px-3 py-2 bg-white rounded-xl text-xs font-semibold border border-brand-border outline-none focus:border-primary"
                          >
                            <option value="">Select General Template...</option>
                            {step.template_id && !availableTemplates.some((t) => String(t.id) === String(step.template_id)) && (
                              <option value={step.template_id} disabled>
                                {step.template_name || `Template #${step.template_id}`} (Inactive / Unavailable — Please change)
                              </option>
                            )}
                            {availableTemplates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Delay Timing */}
                        <div className="md:col-span-4">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                            Execution Delay
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={525600}
                              value={step.delay_value}
                              onChange={(e) =>
                                updateCommunicationStep(idx, { delay_value: e.target.value })
                              }
                              className="w-20 px-2.5 py-2 bg-white rounded-xl text-xs font-semibold border border-brand-border outline-none focus:border-primary text-center"
                            />
                            <select
                              value={step.delay_unit}
                              onChange={(e) =>
                                updateCommunicationStep(idx, { delay_unit: e.target.value })
                              }
                              className="px-2.5 py-2 bg-white rounded-xl text-xs font-semibold border border-brand-border outline-none focus:border-primary"
                            >
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs text-muted">
                        <span>
                          Total delay: <strong>{step.delay_minutes} minutes</strong> ({Math.round(step.delay_minutes / 60 * 10) / 10} hours)
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={step.is_active}
                            onChange={(e) =>
                              updateCommunicationStep(idx, { is_active: e.target.checked })
                            }
                            className="rounded border-slate-300 text-primary h-3.5 w-3.5"
                          />
                          <span>Step Active</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Target */}
          {activeStep === 2 && (
            <>
              <div className="max-w-3xl mx-auto space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-heading">Target</h3>
                  <p className="text-sm text-muted mt-0.5">
                    The selected trigger determines the record type this automation targets.
                  </p>
                </div>
                <div className="rounded-xl border border-brand-border p-4 space-y-3">
                  <div className="text-sm font-bold text-heading">Automation scope</div>
                  <div className="rounded-xl border border-primary bg-primary/5 p-4">
                    <div className="text-sm font-bold text-heading capitalize">{targetType}</div>
                    <div className="text-xs text-muted mt-1">Triggered by {formData.event}</div>
                  </div>
                  <div className="rounded-xl border border-brand-border bg-slate-50 p-4">
                    <div className="text-sm font-bold text-heading">Branch</div>
                    <div className="text-xs text-muted mt-1">
                      {formData.branch_id ? branchName || `Branch #${formData.branch_id}` : 'All branches'}
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    Target type is tied to the selected trigger event and cannot be changed independently.
                  </p>
                </div>
              </div>
              <div className="hidden">
              <div>
                <h3 className="text-base font-bold text-heading">4. Review Automation Configuration</h3>
                <p className="text-xs text-muted mt-0.5">
                  Confirm your settings before saving the custom automation.
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-brand-border space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono uppercase bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                      {formData.event}
                    </span>
                    <h4 className="text-lg font-bold text-heading mt-2">{formData.name || 'Untitled Automation'}</h4>
                    {formData.description && (
                      <p className="text-xs text-muted mt-1">{formData.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${formData.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {formData.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="text-xs text-muted mt-1">
                      {formData.branch_id
                        ? `Branch #${formData.branch_id}`
                        : 'Company-Wide'}
                    </div>
                  </div>
                </div>

                <div className="border-t border-brand-border pt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Conditions</div>
                  {formData.conditions.all?.length === 0 && formData.conditions.any?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No conditions configured (executes on every event match).</p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {formData.conditions.all?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">ALL</span>
                          <div className="space-y-1">
                            {formData.conditions.all.map((c, i) => (
                              <div key={i} className="font-mono text-slate-700">
                                {c.field} {c.op} {c.value !== undefined ? String(c.value) : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {formData.conditions.any?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="font-mono font-bold bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded text-[10px]">ANY</span>
                          <div className="space-y-1">
                            {formData.conditions.any.map((c, i) => (
                              <div key={i} className="font-mono text-slate-700">
                                {c.field} {c.op} {c.value !== undefined ? String(c.value) : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-brand-border pt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Sequence Steps ({formData.steps.length})</div>
                  <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {formData.steps.map((s, i) => {
                      const tmpl = (s.channel === 'sms' ? generalSmsTemplates : generalEmailTemplates).find(
                        (t) => String(t.id) === String(s.template_id)
                      );

                      return (
                        <div key={i} className="relative flex items-center justify-between bg-white p-3 rounded-xl border border-brand-border text-xs">
                          <div className="absolute -left-[27px] w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                            {i + 1}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold uppercase tracking-wider text-heading px-2 py-0.5 bg-slate-100 rounded">
                              {s.channel}
                            </span>
                            <span className="font-semibold text-body">
                              Template: <span className="text-heading font-bold">{tmpl?.name || `#${s.template_id}`}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-muted">
                              {s.delay_minutes === 0 ? 'Immediately' : `+${s.delay_minutes} min delay`}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            </>
          )}
          </div>

          <aside className="hidden md:block w-80 shrink-0 border-l border-brand-border bg-slate-50/70 overflow-y-auto p-5">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-bold text-heading">Live Preview</div>
                <div className="text-xs text-muted">See your automation as you build it</div>
              </div>
              <div className="space-y-2">
                <div className="rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm">
                  When {targetType} {String(formData.event.split('.').slice(1).join(' ') || 'changes')}
                </div>
                {formData.steps.map((step, index) => {
                  const templates = step.channel === 'sms' ? generalSmsTemplates : generalEmailTemplates;
                  const template = templates.find((item) => String(item.id) === String(step.template_id));
                  const action = `Send ${step.channel}`;
                  return (
                    <div key={`${step.channel}-${index}`} className="rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm">
                      {index + 1}. {action}
                      {template?.name ? ` · ${template.name}` : ''}
                      {step.delay_minutes > 0 ? ` · after ${step.delay_value} ${step.delay_unit}` : ''}
                    </div>
                  );
                })}
                <div className="rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm">
                  Scope: {formData.branch_id ? branchName || `Branch #${formData.branch_id}` : 'All branches'}
                </div>
              </div>
              <div className="text-xs text-muted">
                {allConditionsCount + anyConditionsCount} {allConditionsCount + anyConditionsCount === 1 ? 'filter' : 'filters'} applied
              </div>
            </div>
          </aside>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-brand-border flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={activeStep === 0 || isSaving || metadataLoading || Boolean(metadataError)}
            onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
            className="px-4 py-2 bg-slate-100 text-heading rounded-xl text-sm font-semibold hover:bg-slate-200 disabled:opacity-40 transition-colors"
          >
            Previous
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || metadataLoading || Boolean(metadataError)}
              className="px-5 py-2 bg-gradient-to-r from-orange-300 to-rose-200 text-heading rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setActiveStep((s) => Math.min(stepLabels.length - 1, s + 1))}
              disabled={activeStep === stepLabels.length - 1 || isSaving || metadataLoading || Boolean(metadataError)}
              className="px-5 py-2 bg-slate-100 text-heading rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
