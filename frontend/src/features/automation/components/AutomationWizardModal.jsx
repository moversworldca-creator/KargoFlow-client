import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, AlertCircle, ChevronRight } from 'lucide-react';
import {
  createCustomAutomation,
  updateCustomAutomation,
  getCustomAutomationEvents,
  getGeneralTemplates,
} from '../../../services/api';

const OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'ne', label: 'Not Equals' },
  { value: 'in', label: 'In list' },
  { value: 'not_in', label: 'Not in list' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'is_set', label: 'Is set' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'contains', label: 'Contains' },
];

const LEAD_FILTER_OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'ne', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'in', label: 'In list' },
  { value: 'is_set', label: 'Is set' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'within_next_days', label: 'Within next (days)', uiOnly: true },
  { value: 'within_past_days', label: 'Within past (days)', uiOnly: true },
];

const COMMON_FIELDS = {
  lead: [
    { field: 'lead.system_state', label: 'Lead Status', valueType: 'select', options: [
      { value: 'new', label: 'New' },
      { value: 'in_progress', label: 'Contacted' },
      { value: 'qualified', label: 'Qualified' },
      { value: 'disqualified', label: 'Unqualified' },
      { value: 'converted', label: 'Converted' },
      { value: 'lost', label: 'Lost' },
    ] },
    { field: 'lead.custom_status_code_id', label: 'Lead Custom Status' },
    { field: 'lead.workflow_stage', label: 'Lead Workflow Stage' },
    { field: 'lead.branch_id', label: 'Lead Branch', valueType: 'select', optionsFrom: 'branches' },
    { field: 'lead.assigned_employee_id', label: 'Lead Assigned To' },
    { field: 'lead.move_date', label: 'Lead Move Date', valueType: 'date' },
    { field: 'lead.referral_source_id', label: 'Referral Source' },
    { field: 'contact.email', label: 'Has Email', valueType: 'presence' },
    { field: 'contact.phone', label: 'Has Phone', valueType: 'presence' },
    { field: 'lead.sms_opt_in', label: 'SMS Opt-in', valueType: 'boolean' },
  ],
  opportunity: [
    { field: 'opportunity.stage', label: 'Stage' },
    { field: 'opportunity.status', label: 'Status' },
    { field: 'opportunity.source', label: 'Source' },
    { field: 'opportunity.estimated_value', label: 'Estimated Value' },
    { field: 'opportunity.move_date', label: 'Move Date' },
    { field: 'opportunity.pickup_city', label: 'Pickup City' },
    { field: 'opportunity.dropoff_city', label: 'Dropoff City' },
    { field: 'opportunity.branch_id', label: 'Branch ID' },
  ],
};

let filterIdSequence = 0;
const createFilterId = () => {
  filterIdSequence += 1;
  return `filter-${Date.now()}-${filterIdSequence}`;
};

const TRIGGER_TARGETS = [
  { value: 'lead', label: 'Lead' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'job', label: 'Job' },
  { value: 'opportunity', label: 'Opportunity' },
];

const getTriggerTarget = (eventName) =>
  TRIGGER_TARGETS.find(({ value }) => String(eventName || '').startsWith(`${value}.`))?.value || 'lead';

const getTriggerEventType = (eventName) => {
  const eventSuffix = String(eventName || '').split('.').slice(1).join('.');
  if (eventSuffix === 'updated') return 'update';
  if (eventSuffix === 'status_changed' || eventSuffix === 'status_change') return 'status_change';
  return 'create';
};

const RECIPIENT_OPTIONS = {
  lead: [
    { key: 'contact1', label: 'Lead contact' },
    { key: 'contact2', label: 'Lead contact 2' },
    { key: 'contact3', label: 'Lead contact 3' },
    { key: 'sales_person_email', label: 'Sales person email' },
    { key: 'branch_email', label: 'Branch email' },
  ],
  opportunity: [
    { key: 'customer', label: 'Customer' },
    { key: 'sales_person_email', label: 'Sales person email' },
    { key: 'branch_email', label: 'Branch email' },
  ],
  estimate: [
    { key: 'customer', label: 'Customer' },
    { key: 'sales_person_email', label: 'Sales person email' },
    { key: 'branch_email', label: 'Branch email' },
  ],
  job: [
    { key: 'customer', label: 'Customer' },
    { key: 'sales_person_email', label: 'Sales person email' },
    { key: 'branch_email', label: 'Branch email' },
  ],
};

const defaultRecipientKeys = (target) => (RECIPIENT_OPTIONS[target] || RECIPIENT_OPTIONS.lead).map(({ key }) => key);

const normalizeRecipients = (recipients, target) => {
  const availableKeys = defaultRecipientKeys(target);
  const configured = Array.isArray(recipients?.tokens) ? recipients.tokens : availableKeys;
  return {
    tokens: configured.filter((key) => availableKeys.includes(key)),
    custom_emails: Array.isArray(recipients?.custom_emails) ? recipients.custom_emails : [],
    custom_phones: Array.isArray(recipients?.custom_phones) ? recipients.custom_phones : [],
  };
};

const createDefaultStep = () => ({
  channel: 'email',
  template_id: '',
  delay_minutes: 0,
  delay_value: 0,
  delay_unit: 'minutes',
  is_active: true,
  attachments: [],
  attachment_file: null,
});

const initialAutomationState = (branchId = null) => ({
  id: null,
  name: '',
  description: '',
  event: 'lead.created',
  branch_id: branchId ? Number(branchId) : null,
  is_active: true,
  conditions: {
    all: [],
    any: [],
  },
  recipients: normalizeRecipients(null, 'lead'),
  steps: [createDefaultStep()],
});

const createInitialFormData = (initialValue, defaultBranchId) => {
  if (!initialValue) return initialAutomationState(defaultBranchId);

  const conditions = {
    all: (Array.isArray(initialValue.conditions?.all) ? initialValue.conditions.all : [])
      .map((condition) => ({ ...condition, id: condition.id || createFilterId() })),
    any: (Array.isArray(initialValue.conditions?.any) ? initialValue.conditions.any : [])
      .map((condition) => ({ ...condition, id: condition.id || createFilterId() })),
  };
  const steps = (initialValue.steps || []).map((step) => {
    const totalMinutes = Number(step.delay_minutes || 0);
    let delayUnit = 'minutes';
    let delayValue = totalMinutes;

    if (totalMinutes > 0 && totalMinutes % 1440 === 0) {
      delayUnit = 'days';
      delayValue = totalMinutes / 1440;
    } else if (totalMinutes > 0 && totalMinutes % 60 === 0) {
      delayUnit = 'hours';
      delayValue = totalMinutes / 60;
    }

    return {
      id: step.id,
      channel: step.channel || 'email',
      template_id: step.template_id ? String(step.template_id) : '',
      template_name: step.template_name || step.template?.name || '',
      delay_minutes: totalMinutes,
      delay_value: delayValue,
      delay_unit: delayUnit,
      is_active: step.is_active !== false,
      attachments: Array.isArray(step.attachments) ? step.attachments : [],
      attachment_file: null,
    };
  });

  return {
    id: initialValue.id || null,
    name: initialValue.name || '',
    description: initialValue.description || '',
    event: initialValue.event || 'lead.created',
    branch_id: initialValue.branch_id ?? null,
    is_active: initialValue.is_active !== false,
    conditions,
    recipients: normalizeRecipients(initialValue.recipients, getTriggerTarget(initialValue.event || 'lead.created')),
    steps: [steps[0] || createDefaultStep()],
  };
};

export default function AutomationWizardModal(props) {
  if (!props.open) return null;

  return (
    <AutomationWizardModalContent
      key={`${props.initialValue?.id || 'new'}-${props.defaultBranchId || ''}`}
      {...props}
    />
  );
}

function AutomationWizardModalContent({
  open,
  onClose,
  onSaved,
  initialValue,
  branches = [],
  defaultBranchId = null,
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState('');
  const [error, setError] = useState(null);

  const [events, setEvents] = useState([]);
  const [generalEmailTemplates, setGeneralEmailTemplates] = useState([]);
  const [generalSmsTemplates, setGeneralSmsTemplates] = useState([]);
  const [triggerEventType, setTriggerEventType] = useState(() => getTriggerEventType(initialValue?.event));
  const [recipientInput, setRecipientInput] = useState({ email: '', phone: '' });
  const [recipientErrors, setRecipientErrors] = useState({ email: '', phone: '' });

  const [formData, setFormData] = useState(() => createInitialFormData(initialValue, defaultBranchId));

  // Load events and general templates on modal open
  useEffect(() => {
    if (!open) return;

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

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const currentEventMeta = events.find((e) => e.event === formData.event);
  const targetType = currentEventMeta?.target || (formData.event.startsWith('lead.') ? 'lead' : 'opportunity');
  const selectedTriggerTarget = getTriggerTarget(formData.event);
  const targetLabel = TRIGGER_TARGETS.find(({ value }) => value === selectedTriggerTarget)?.label || 'Lead';
  const triggerEventLabel = {
    create: 'create',
    update: 'update',
    status_change: 'status change',
  }[triggerEventType];
  const recipientOptions = RECIPIENT_OPTIONS[selectedTriggerTarget] || RECIPIENT_OPTIONS.lead;
  const selectedRecipients = normalizeRecipients(formData.recipients, selectedTriggerTarget);
  const selectedRecipientLabels = [
    ...recipientOptions
      .filter(({ key }) => selectedRecipients.tokens.includes(key))
      .map(({ label }) => label),
    ...selectedRecipients.custom_emails,
    ...selectedRecipients.custom_phones,
  ];

  const updateRecipients = (patch) => {
    setFormData((previous) => ({
      ...previous,
      recipients: { ...normalizeRecipients(previous.recipients, selectedTriggerTarget), ...patch },
    }));
  };

  const addCustomEmail = () => {
    const email = recipientInput.email.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRecipientErrors((previous) => ({ ...previous, email: 'Enter a valid email address.' }));
      return;
    }
    if (selectedRecipients.custom_emails.some((value) => value.toLowerCase() === email.toLowerCase())) {
      setRecipientErrors((previous) => ({ ...previous, email: 'This email is already added.' }));
      return;
    }
    updateRecipients({ custom_emails: [...selectedRecipients.custom_emails, email] });
    setRecipientInput((previous) => ({ ...previous, email: '' }));
    setRecipientErrors((previous) => ({ ...previous, email: '' }));
  };

  const addCustomPhone = () => {
    const phone = recipientInput.phone.trim();
    if (!phone) return;
    if (!/^\+?[0-9\s().-]{7,20}$/.test(phone) || phone.replace(/\D/g, '').length < 7) {
      setRecipientErrors((previous) => ({ ...previous, phone: 'Enter a valid phone number.' }));
      return;
    }
    const normalizedPhone = phone.replace(/\D/g, '');
    if (selectedRecipients.custom_phones.some((value) => value.replace(/\D/g, '') === normalizedPhone)) {
      setRecipientErrors((previous) => ({ ...previous, phone: 'This phone number is already added.' }));
      return;
    }
    updateRecipients({ custom_phones: [...selectedRecipients.custom_phones, phone] });
    setRecipientInput((previous) => ({ ...previous, phone: '' }));
    setRecipientErrors((previous) => ({ ...previous, phone: '' }));
  };

  // Steps for the stepper
  const stepLabels = ['Trigger', 'Action', 'Target', 'Filters'];
  const triggerEvents = events.filter((event) => getTriggerTarget(event.event) === selectedTriggerTarget);
  const availableTriggerTargets = new Set(events.map((event) => getTriggerTarget(event.event)));
  const branchName = branches.find((branch) => String(branch.id) === String(formData.branch_id))?.name;
  const allConditionsCount = (formData.conditions.all || []).length;
  const anyConditionsCount = (formData.conditions.any || []).length;
  const filterFieldOptions = COMMON_FIELDS[targetType] || COMMON_FIELDS.opportunity;
  const filterCount = allConditionsCount + anyConditionsCount;
  const filterOperators = targetType === 'lead'
    ? LEAD_FILTER_OPERATORS
    : OPERATORS;
  // Add condition rule
  const addConditionRule = (group) => {
    const defaultField = filterFieldOptions[0]?.field || 'opportunity.stage';
    setFormData((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [group]: [...(prev.conditions[group] || []), { id: createFilterId(), field: defaultField, op: 'eq', value: '' }],
      },
    }));
  };

  const updateConditionRule = (group, filterId, patch) => {
    setFormData((prev) => {
      const updatedGroup = (prev.conditions[group] || []).map((condition) =>
        condition.id === filterId ? { ...condition, ...patch } : condition
      );
      return {
        ...prev,
        conditions: {
          ...prev.conditions,
          [group]: updatedGroup,
        },
      };
    });
  };

  const removeConditionRule = (group, filterId) => {
    setFormData((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [group]: prev.conditions[group].filter((condition) => condition.id !== filterId),
      },
    }));
  };

  const renderConditionRow = (group, rule) => {
    const selectedField = filterFieldOptions.find((field) => field.field === rule.field);
    const fieldOperators = selectedField?.valueType === 'date'
      ? filterOperators
      : filterOperators.filter((operator) => !operator.uiOnly);
    const operators = fieldOperators.some((operator) => operator.value === rule.op)
      ? fieldOperators
      : [...fieldOperators, [...LEAD_FILTER_OPERATORS, ...OPERATORS].find((operator) => operator.value === rule.op)].filter(Boolean);
    const valueRequired = rule.op !== 'is_set' && rule.op !== 'is_empty';
    const valueClass = 'h-[34px] min-w-0 w-full rounded-lg border border-[#E6EDF5] bg-[#F0F4F8] px-3 text-xs text-[#17212B] outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100';

    let valueControl = null;
    if (rule.op === 'within_next_days' || rule.op === 'within_past_days') {
      valueControl = (
        <input
          aria-label="Number of days"
          type="number"
          min="1"
          step="1"
          value={rule.value ?? ''}
          onChange={(event) => updateConditionRule(group, rule.id, { value: event.target.value })}
          placeholder="Days"
          className={valueClass}
        />
      );
    } else if (valueRequired && selectedField?.valueType === 'select' && selectedField.options) {
      valueControl = (
        <select
          aria-label="Filter value"
          value={rule.value ?? ''}
          onChange={(event) => updateConditionRule(group, rule.id, { value: event.target.value })}
          className={valueClass}
        >
          <option value="">Select</option>
          {selectedField.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    } else if (valueRequired && selectedField?.optionsFrom === 'branches') {
      valueControl = (
        <select
          aria-label="Filter value"
          value={rule.value ?? ''}
          onChange={(event) => updateConditionRule(group, rule.id, { value: event.target.value })}
          className={valueClass}
        >
          <option value="">Select</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
      );
    } else if (valueRequired && selectedField?.valueType === 'boolean') {
      valueControl = (
        <select
          aria-label="Filter value"
          value={rule.value ?? ''}
          onChange={(event) => updateConditionRule(group, rule.id, { value: event.target.value })}
          className={valueClass}
        >
          <option value="">Select</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    } else if (valueRequired) {
      valueControl = (
        <input
          aria-label="Filter value"
          type={selectedField?.valueType === 'date' ? 'date' : 'text'}
          value={Array.isArray(rule.value) ? rule.value.join(', ') : rule.value ?? ''}
          onChange={(event) => updateConditionRule(group, rule.id, { value: event.target.value })}
          placeholder={selectedField?.valueType === 'date' ? 'Select date' : 'Enter value'}
          className={valueClass}
        />
      );
    }

    return (
      <div key={rule.id} className="grid min-w-0 grid-cols-[34px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[34px_minmax(0,1.55fr)_minmax(110px,0.9fr)_minmax(90px,0.65fr)]">
        <button
          type="button"
          aria-label="Remove filter"
          onClick={() => removeConditionRule(group, rule.id)}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[#E6EDF5] bg-white text-xs font-semibold text-[#17212B] hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          ×
        </button>
        <select
          aria-label="Filter field"
          value={rule.field}
          onChange={(event) => {
            const field = filterFieldOptions.find((option) => option.field === event.target.value);
            updateConditionRule(group, rule.id, {
              field: event.target.value,
              op: field?.valueType === 'presence' ? 'is_set' : 'eq',
              value: '',
            });
          }}
          className={`${valueClass} sm:min-w-0`}
        >
          {!filterFieldOptions.some((field) => field.field === rule.field) && (
            <option value={rule.field}>{`Current field: ${rule.field}`}</option>
          )}
          {filterFieldOptions.map((field) => (
            <option key={field.field} value={field.field}>{field.label}</option>
          ))}
        </select>
        <select
          aria-label="Filter operator"
          value={rule.op}
          onChange={(event) => updateConditionRule(group, rule.id, {
            op: event.target.value,
            ...(['is_set', 'is_empty'].includes(event.target.value) ? { value: '' } : {}),
            ...(['within_next_days', 'within_past_days'].includes(event.target.value) ? { value: '' } : {}),
          })}
          className={valueClass}
        >
          {operators.map((operator) => (
            <option key={operator.value} value={operator.value}>{operator.label}</option>
          ))}
        </select>
        <div className="col-start-2 min-w-0 sm:col-start-auto">
          {valueControl}
        </div>
      </div>
    );
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
          attachments: [],
          attachment_file: null,
        },
      ],
    }));
  };

  const toggleStepAttachment = (index, attachment) => {
    setFormData((prev) => {
      const steps = [...prev.steps];
      const current = steps[index];
      const attachments = current.attachments || [];
      steps[index] = {
        ...current,
        attachments: attachments.includes(attachment)
          ? attachments.filter((item) => item !== attachment)
          : [...attachments, attachment],
      };
      return { ...prev, steps };
    });
  };

  const selectStepAttachment = (index, file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      window.alert('Please select a PDF file.');
      return;
    }
    updateCommunicationStep(index, { attachment_file: file });
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
        cur.delay_minutes = Math.min(10080, mins); // Cap at 7 days (10,080 minutes) per spec
      }

      nextSteps[index] = cur;
      return { ...prev, steps: nextSteps };
    });
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
      if (c.op === 'within_next_days' || c.op === 'within_past_days') {
        return 'Relative date filters are currently UI-only and cannot be saved yet.';
      }
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
      if (s.delay_minutes < 0 || s.delay_minutes > 10080) {
        return `Step ${i + 1} delay must be between 0 and 10,080 minutes (7 days max per specification).`;
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
            <div className="md:col-span-5">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-1">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={160}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. New Lead Welcome"
                className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-1">
                Target
              </label>
              <select
                aria-label="Target"
                value={selectedTriggerTarget}
                onChange={(e) => {
                  const nextTarget = e.target.value;
                  const matchingEvent = events.find((event) => getTriggerTarget(event.event) === nextTarget);
                  if (matchingEvent) {
                    setFormData({
                      ...formData,
                      event: matchingEvent.event,
                      recipients: normalizeRecipients(formData.recipients, nextTarget),
                    });
                  }
                }}
                className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                {TRIGGER_TARGETS.map((target) => (
                  <option key={target.value} value={target.value} disabled={!availableTriggerTargets.has(target.value)}>
                    {target.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-1">
                Branch
              </label>
              <select
                aria-label="Branch"
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
            <label className="md:col-span-2 flex items-center gap-2 text-xs sm:text-sm font-semibold text-heading h-[38px] px-3 rounded-xl bg-subtle border border-brand-border cursor-pointer hover:bg-slate-100 transition-colors">
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
              placeholder="What does this automation do?"
              className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-y"
            />
          </div>
        </div>

        {/* Stepper Header */}
        <div className="px-5 py-2.5 border-b border-brand-border shrink-0 overflow-x-auto">
          <div className="flex items-center gap-5 min-w-max">
            {stepLabels.map((label, idx) => {
              const isActive = activeStep === idx;
              const isPast = activeStep > idx;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  disabled={metadataLoading || Boolean(metadataError)}
                  aria-current={isActive ? 'step' : undefined}
                  className="flex items-center gap-2.5 group cursor-pointer focus:outline-none disabled:cursor-not-allowed"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center text-xs font-bold transition-colors ${
                      isActive
                        ? 'rounded-full border border-blue-500 bg-blue-50 text-blue-600'
                        : isPast
                          ? 'rounded-md bg-orange-300 text-heading'
                          : 'rounded-full bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`text-sm tracking-tight ${
                      isActive || isPast ? 'font-bold text-heading' : 'font-medium text-slate-500'
                    }`}
                  >
                    {label}
                  </span>
                </button>
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
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          <div className="w-full min-w-0 p-5 md:flex-1 md:overflow-y-auto">
          {/* STEP 0: Trigger & Scope */}
          {activeStep === 0 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div>
                <h3 className="text-xl font-bold text-heading">When should this automation trigger?</h3>

                <p className="text-xs text-muted mt-0.5">
                  Choose the event that will start this automation.
                </p>
              </div>

              <button
                type="button"
                aria-pressed="true"
                className="w-full md:w-1/2 rounded-xl border border-primary bg-primary/5 p-4 text-left"
              >
                <div className="text-sm font-bold text-heading">When Something Changes</div>
                <div className="text-xs text-muted mt-1">Trigger on an available business event</div>
              </button>

              <div className="rounded-xl border border-brand-border p-4 space-y-3">
                <div className="text-sm font-bold text-heading">Configure Trigger</div>
                <div className="max-w-md">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-muted mb-1">
                    Event
                  </label>
                  <select
                    aria-label="Event"
                    value={triggerEventType}
                    onChange={(e) => setTriggerEventType(e.target.value)}
                    disabled={metadataLoading || Boolean(metadataError)}
                    className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="create">On Create</option>
                    <option value="update">On Update</option>
                    <option value="status_change">On Status Change</option>
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
            <div className="mx-auto max-w-4xl space-y-4">
              <div>
                <h3 className="text-lg font-bold text-[#17212B]">Add filters (optional)</h3>
                <p className="mt-1 text-xs text-[#526A8D]">
                  Optionally add conditions to limit when this automation runs
                </p>
              </div>

              <section aria-label="Filters" className="rounded-xl border border-[#E6EDF5] bg-white p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-xs font-bold text-[#17212B]">Filters</h4>
                  <button
                    type="button"
                    onClick={() => addConditionRule('all')}
                    className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-[#EDF4FA] px-3 text-xs font-bold text-[#17212B] transition-colors hover:bg-[#e2edf7]"
                  >
                    <Plus size={14} /> Add Filter
                  </button>
                </div>

                {allConditionsCount > 0 ? (
                  <div className="space-y-2">
                    {formData.conditions.all.map((rule) => renderConditionRow('all', rule))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#E6EDF5] bg-[#F7F9FC] px-3 py-4 text-center text-xs text-[#526A8D]">
                    No filters added
                  </div>
                )}

                {anyConditionsCount > 0 && (
                  <div className="mt-4 border-t border-[#E6EDF5] pt-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-xs font-bold text-[#17212B]">Match any (OR)</h5>
                        <p className="mt-0.5 text-[11px] text-[#526A8D]">At least one of these filters must match.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addConditionRule('any')}
                        className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-[#EDF4FA] px-3 text-xs font-bold text-[#17212B] hover:bg-[#e2edf7]"
                      >
                        <Plus size={14} /> Add Filter
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.conditions.any.map((rule) => renderConditionRow('any', rule))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeStep === 4 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div>
                <h3 className="text-xl font-bold text-heading">Add filters (optional)</h3>
                <datalist id="common-fields-list">
                  {[...(COMMON_FIELDS[targetType] || []), ...(COMMON_FIELDS[targetType === 'lead' ? 'opportunity' : 'lead'] || [])].map((f) => (
                    <option key={f.field} value={f.field}>{f.label}</option>
                  ))}
                </datalist>

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
                    {formData.conditions.all.map((rule) => (
                      <div key={rule.id} className="flex flex-wrap items-center gap-2 p-2.5 bg-white rounded-xl border border-brand-border">
                        <select
                          aria-label="Filter field"
                          value={rule.field}
                          onChange={(e) => {
                            const selectedField = filterFieldOptions.find((field) => field.field === e.target.value);
                            updateConditionRule('all', rule.id, {
                              field: e.target.value,
                              op: selectedField?.valueType === 'presence' ? 'is_set' : 'eq',
                              value: '',
                            });
                          }}
                          className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border min-w-[190px]"
                        >
                          {!filterFieldOptions.some((field) => field.field === rule.field) && (
                            <option value={rule.field}>{`Current field: ${rule.field}`}</option>
                          )}
                          {filterFieldOptions.map((field) => (
                            <option key={field.field} value={field.field}>{field.label}</option>
                          ))}
                        </select>
                        <select
                          aria-label="Filter operator"
                          value={rule.op}
                          onChange={(e) => updateConditionRule('all', rule.id, { op: e.target.value })}
                          className="px-2.5 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border"
                        >
                          {filterOperators.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        {rule.op !== 'is_set' && rule.op !== 'is_empty' && (
                          (() => {
                            const selectedField = filterFieldOptions.find((field) => field.field === rule.field);
                            if (selectedField?.valueType === 'select' && selectedField.options) {
                              return (
                                <select
                                  aria-label="Filter value"
                                  value={rule.value ?? ''}
                                  onChange={(e) => updateConditionRule('all', rule.id, { value: e.target.value })}
                                  className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border flex-1 min-w-[120px]"
                                >
                                  <option value="">Select</option>
                                  {selectedField.options.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              );
                            }
                            if (selectedField?.valueType === 'select' && selectedField.optionsFrom === 'branches') {
                              return (
                                <select
                                  aria-label="Filter value"
                                  value={rule.value ?? ''}
                                  onChange={(e) => updateConditionRule('all', rule.id, { value: e.target.value })}
                                  className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border flex-1 min-w-[120px]"
                                >
                                  <option value="">Select branch</option>
                                  {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                  ))}
                                </select>
                              );
                            }
                            if (selectedField?.valueType === 'boolean') {
                              return (
                                <select
                                  aria-label="Filter value"
                                  value={rule.value ?? ''}
                                  onChange={(e) => updateConditionRule('all', rule.id, { value: e.target.value })}
                                  className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border flex-1 min-w-[120px]"
                                >
                                  <option value="">Select</option>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                              );
                            }
                            return (
                              <input
                                aria-label="Filter value"
                                type={selectedField?.valueType === 'date' ? 'date' : 'text'}
                                value={Array.isArray(rule.value) ? rule.value.join(', ') : rule.value ?? ''}
                                onChange={(e) => updateConditionRule('all', rule.id, { value: e.target.value })}
                                placeholder={rule.op === 'in' ? 'Select values (comma-separated)' : 'Value'}
                                className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border flex-1 min-w-[120px]"
                              />
                            );
                          })()
                        )}
                        <button
                          type="button"
                          onClick={() => removeConditionRule('all', rule.id)}
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
                    {formData.conditions.any.map((rule) => (
                      <div key={rule.id} className="flex flex-wrap items-center gap-2 p-2.5 bg-white rounded-xl border border-brand-border">
                        <select
                          aria-label="Filter field"
                          value={rule.field}
                          onChange={(e) => {
                            const selectedField = filterFieldOptions.find((field) => field.field === e.target.value);
                            updateConditionRule('any', rule.id, {
                              field: e.target.value,
                              op: selectedField?.valueType === 'presence' ? 'is_set' : 'eq',
                              value: '',
                            });
                          }}
                          className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border min-w-[190px]"
                        >
                          {!filterFieldOptions.some((field) => field.field === rule.field) && (
                            <option value={rule.field}>{`Current field: ${rule.field}`}</option>
                          )}
                          {filterFieldOptions.map((field) => (
                            <option key={field.field} value={field.field}>{field.label}</option>
                          ))}
                        </select>
                        <select
                          aria-label="Filter operator"
                          value={rule.op}
                          onChange={(e) => updateConditionRule('any', rule.id, { op: e.target.value })}
                          className="px-2.5 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border"
                        >
                          {filterOperators.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        {rule.op !== 'is_set' && rule.op !== 'is_empty' && (
                          (() => {
                            const selectedField = filterFieldOptions.find((field) => field.field === rule.field);
                            if (selectedField?.valueType === 'select' && selectedField.options) {
                              return (
                                <select
                                  aria-label="Filter value"
                                  value={rule.value ?? ''}
                                  onChange={(e) => updateConditionRule('any', rule.id, { value: e.target.value })}
                                  className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border flex-1 min-w-[120px]"
                                >
                                  <option value="">Select</option>
                                  {selectedField.options.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              );
                            }
                            if (selectedField?.valueType === 'select' && selectedField.optionsFrom === 'branches') {
                              return (
                                <select
                                  aria-label="Filter value"
                                  value={rule.value ?? ''}
                                  onChange={(e) => updateConditionRule('any', rule.id, { value: e.target.value })}
                                  className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border flex-1 min-w-[120px]"
                                >
                                  <option value="">Select branch</option>
                                  {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                  ))}
                                </select>
                              );
                            }
                            if (selectedField?.valueType === 'boolean') {
                              return (
                                <select
                                  aria-label="Filter value"
                                  value={rule.value ?? ''}
                                  onChange={(e) => updateConditionRule('any', rule.id, { value: e.target.value })}
                                  className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border flex-1 min-w-[120px]"
                                >
                                  <option value="">Select</option>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                              );
                            }
                            return (
                              <input
                                aria-label="Filter value"
                                type={selectedField?.valueType === 'date' ? 'date' : 'text'}
                                value={Array.isArray(rule.value) ? rule.value.join(', ') : rule.value ?? ''}
                                onChange={(e) => updateConditionRule('any', rule.id, { value: e.target.value })}
                                placeholder={rule.op === 'in' ? 'Select values (comma-separated)' : 'Value'}
                                className="px-3 py-1.5 text-xs bg-subtle rounded-lg border border-brand-border flex-1 min-w-[120px]"
                              />
                            );
                          })()
                        )}
                        <button
                          type="button"
                          onClick={() => removeConditionRule('any', rule.id)}
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

          {/* STEP 1: Action */}
          {activeStep === 1 && (() => {
            const step = formData.steps[0] || createDefaultStep();
            const availableTemplates =
              step.channel === 'sms' ? generalSmsTemplates : generalEmailTemplates;

            return (
              <div className="space-y-6 max-w-3xl mx-auto">
                <div>
                  <h3 className="text-xl font-bold text-heading">Action</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Configure the message action to send. This uses an active General template.
                  </p>
                </div>

                <div className="p-5 bg-slate-50/70 rounded-2xl border border-brand-border space-y-4 relative transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-heading">
                        Send {step.channel.toUpperCase()}
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
                          updateCommunicationStep(0, {
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
                        onChange={(e) => updateCommunicationStep(0, { template_id: e.target.value })}
                        className="w-full px-3 py-2 bg-white rounded-xl text-xs font-semibold border border-brand-border outline-none focus:border-primary"
                      >
                        <option value="">Select General Template...</option>
                        {step.template_id && !availableTemplates.some((t) => String(t.id) === String(step.template_id)) && (
                          <option value={step.template_id} disabled>
                            {step.template_name || `Template #${step.template_id}`} (Inactive / Unavailable — Please change)
                          </option>
                        )}
                        {availableTemplates.length === 0 && (
                          <option value="" disabled>
                            No active General {step.channel.toUpperCase()} templates found
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
                          max={10080}
                          value={step.delay_value}
                          onChange={(e) =>
                            updateCommunicationStep(0, { delay_value: e.target.value })
                          }
                          className="w-20 px-2.5 py-2 bg-white rounded-xl text-xs font-semibold border border-brand-border outline-none focus:border-primary text-center"
                        />
                        <select
                          value={step.delay_unit}
                          onChange={(e) =>
                            updateCommunicationStep(0, { delay_unit: e.target.value })
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

                  {step.channel === 'email' && (
                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-muted">Attachments</div>
                      {[
                        {
                          key: 'estimate_pdf',
                          label: 'Attach estimate PDF',
                          description: 'Attach the latest estimate PDF when available.',
                        },
                        {
                          key: 'invoice_pdf',
                          label: 'Attach invoice PDF',
                          description: 'Attach the latest invoice PDF when available.',
                        },
                      ].map((attachment) => {
                        const selected = (step.attachments || []).includes(attachment.key);
                        return (
                          <button
                            key={attachment.key}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleStepAttachment(0, attachment.key)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                              selected
                                ? 'border-primary bg-primary/5'
                                : 'border-brand-border bg-white hover:bg-slate-50'
                            }`}
                          >
                            <span>
                              <span className="block text-sm font-bold text-heading">{attachment.label}</span>
                              <span className="block text-xs text-muted">{attachment.description}</span>
                            </span>
                            <input
                              type="checkbox"
                              checked={selected}
                              readOnly
                              tabIndex={-1}
                              aria-hidden="true"
                              className="h-4 w-4 rounded border-slate-300 text-primary"
                            />
                          </button>
                        );
                      })}
                      <div className="rounded-xl border border-brand-border bg-white px-4 py-3">
                        <div className="text-sm font-bold text-heading">Attach PDF file</div>
                        <p className="text-xs text-muted">Browse and select a PDF to send with this automation.</p>
                        {step.attachment_file?.name && (
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="truncate text-xs font-semibold text-primary">
                              {step.attachment_file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCommunicationStep(0, { attachment_file: null })}
                              className="shrink-0 text-xs font-bold text-muted hover:text-heading"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-brand-border bg-subtle px-3 py-2 text-xs font-bold text-heading hover:bg-slate-100">
                          Browse PDF
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            aria-label="Browse PDF for step 1"
                            className="sr-only"
                            onChange={(event) => {
                              selectStepAttachment(0, event.target.files?.[0]);
                              event.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs text-muted">
                    <span>
                      Total delay: <strong>{step.delay_minutes} minutes</strong> ({Math.round(step.delay_minutes / 60 * 10) / 10} hours)
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={step.is_active}
                        onChange={(e) =>
                          updateCommunicationStep(0, { is_active: e.target.checked })
                        }
                        className="rounded border-slate-300 text-primary h-3.5 w-3.5"
                      />
                      <span>Action Active</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* STEP 2: Target */}
          {activeStep === 2 && (
            <>
              <div className="max-w-3xl mx-auto space-y-4">
              <div>
                <h3 className="text-xl font-bold text-heading">Who should receive this?</h3>
                <p className="text-sm text-muted mt-0.5">Choose who will be targeted by this automation</p>
              </div>

              <section aria-label="Dynamic recipients" className="rounded-xl border border-brand-border bg-white p-3 space-y-2">
                <h4 className="text-sm font-bold text-heading">Dynamic recipients</h4>
                {recipientOptions.map(({ key, label }) => {
                  const enabled = selectedRecipients.tokens.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`${label} recipient`}
                      onClick={() => updateRecipients({
                        tokens: enabled
                          ? selectedRecipients.tokens.filter((token) => token !== key)
                          : [...selectedRecipients.tokens, key],
                      })}
                      className={`flex min-h-[48px] w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                        enabled ? 'border-blue-500 bg-blue-50/60' : 'border-brand-border bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span>
                        <span className="block text-xs font-bold text-heading">{label}</span>
                        <span className="block text-[11px] text-muted">{enabled ? 'Enabled' : 'Disabled'}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`relative h-4 w-7 rounded-full transition-colors ${
                          enabled ? 'bg-gradient-to-r from-orange-300 to-rose-200' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                            enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <section aria-label="Custom emails" className="min-w-0 rounded-xl border border-brand-border bg-white p-3 space-y-2">
                  <h4 className="text-xs font-bold text-heading">Custom emails</h4>
                  <input
                    type="email"
                    aria-label="Custom email address"
                    value={recipientInput.email}
                    onChange={(event) => {
                      setRecipientInput((previous) => ({ ...previous, email: event.target.value }));
                      setRecipientErrors((previous) => ({ ...previous, email: '' }));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addCustomEmail();
                      }
                    }}
                    placeholder="Type email and press Enter"
                    className="w-full rounded-lg bg-subtle px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {recipientErrors.email && <p role="alert" className="text-xs text-rose-600">{recipientErrors.email}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecipients.custom_emails.map((email) => (
                      <span key={email} className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-heading">
                        <span className="truncate">{email}</span>
                        <button
                          type="button"
                          aria-label={`Remove email ${email}`}
                          onClick={() => updateRecipients({
                            custom_emails: selectedRecipients.custom_emails.filter((value) => value !== email),
                          })}
                          className="font-bold text-muted hover:text-rose-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </section>

                <section aria-label="Custom phone numbers" className="min-w-0 rounded-xl border border-brand-border bg-white p-3 space-y-2">
                  <h4 className="text-xs font-bold text-heading">Custom phone numbers</h4>
                  <input
                    type="tel"
                    aria-label="Custom phone number"
                    value={recipientInput.phone}
                    onChange={(event) => {
                      setRecipientInput((previous) => ({ ...previous, phone: event.target.value }));
                      setRecipientErrors((previous) => ({ ...previous, phone: '' }));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addCustomPhone();
                      }
                    }}
                    placeholder="Type phone and press Enter"
                    className="w-full rounded-lg bg-subtle px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {recipientErrors.phone && <p role="alert" className="text-xs text-rose-600">{recipientErrors.phone}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecipients.custom_phones.map((phone) => (
                      <span key={phone} className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-heading">
                        <span className="truncate">{phone}</span>
                        <button
                          type="button"
                          aria-label={`Remove phone ${phone}`}
                          onClick={() => updateRecipients({
                            custom_phones: selectedRecipients.custom_phones.filter((value) => value !== phone),
                          })}
                          className="font-bold text-muted hover:text-rose-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </section>
              </div>

              <div className="rounded-xl border border-brand-border bg-slate-50 px-3 py-2 text-xs text-muted">
                Branch: {formData.branch_id ? branchName || `Branch #${formData.branch_id}` : 'All branches'}
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
                  <div className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Action Details</div>
                  {(() => {
                    const s = formData.steps[0] || createDefaultStep();
                    const tmpl = (s.channel === 'sms' ? generalSmsTemplates : generalEmailTemplates).find(
                      (t) => String(t.id) === String(s.template_id)
                    );

                    return (
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-brand-border text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold uppercase tracking-wider text-heading px-2 py-0.5 bg-slate-100 rounded">
                            {s.channel}
                          </span>
                          <span className="font-semibold text-body">
                            Template: <span className="text-heading font-bold">{tmpl?.name || `#${s.template_id || 'Not set'}`}</span>
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
                  })()}
                </div>
              </div>
            </div>
            </>
          )}
          </div>

          <aside className="w-full shrink-0 border-t border-brand-border bg-slate-50/70 p-5 md:w-[34%] md:max-w-[380px] md:min-w-[280px] md:border-l md:border-t-0 md:overflow-y-auto">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-bold text-heading">Live Preview</div>
                <div className="text-xs text-muted">See your automation as you build it</div>
              </div>
              <div className="space-y-2">
                <div className="rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm">
                  When {targetLabel.toLowerCase()} {triggerEventLabel}
                </div>
                <div className="rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm">
                  To: {selectedRecipientLabels.length ? selectedRecipientLabels.join(' ') : 'No recipients selected'}
                </div>
              </div>
              <div className="text-xs text-muted">
                {filterCount === 0
                  ? 'No filters'
                  : `${filterCount} ${filterCount === 1 ? 'filter' : 'filters'} applied`}

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
              className="px-5 py-2 bg-gradient-to-r from-orange-300 to-rose-200 text-heading rounded-xl text-sm font-bold shadow-sm transition-all hover:brightness-95 disabled:opacity-50"
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
