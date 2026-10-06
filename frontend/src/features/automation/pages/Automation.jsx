import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Zap, Mail, Plus, Copy, Trash2, Pencil, ToggleLeft, ToggleRight, Clock3 } from 'lucide-react';
import {
  activateAutomationWorkflow,
  createAutomationStep,
  createAutomationWorkflow,
  deactivateAutomationWorkflow,
  deleteAutomationStep,
  deleteAutomationWorkflow,
  getAutomationRuns,
  getAutomationSteps,
  getAutomationWorkflows,
} from '../../../services/api';
import API from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import AutomationWizardModal from '../components/AutomationWizardModal';

const NOTIFICATION_AUDIENCES = [
  {
    id: 'sales_person',
    label: 'Sales Person',
    categories: [
      { id: 'lead_intake', label: 'Lead Intake' },
      { id: 'sales_updates', label: 'Sales Updates' },
    ],
  },
  {
    id: 'customer',
    label: 'Customer',
    categories: [
      { id: 'lead_intake', label: 'Lead Intake' },
      { id: 'customer_sign_off', label: 'Customer Sign-Off' },
      { id: 'job_communications', label: 'Job Communications' },
      { id: 'outbound_delivery', label: 'Outbound Delivery' },
    ],
  },
];

const normalizeWorkflowName = (name) => String(name || '').trim().toLowerCase();

const FALLBACK_NOTIFICATION_META = {
  'new lead received': { audience: 'sales_person', category: 'lead_intake' },
  'new lead request response': { audience: 'customer', category: 'lead_intake' },
  'customer payment made': { audience: 'sales_person', category: 'sales_updates' },
  'customer payment made (manual)': { audience: 'sales_person', category: 'sales_updates' },
  'customer submit inventory': { audience: 'sales_person', category: 'sales_updates' },
  'document completed': { audience: 'sales_person', category: 'sales_updates' },
  'estimate accepted': { audience: 'sales_person', category: 'sales_updates' },
  'job cancel (sales person)': { audience: 'sales_person', category: 'sales_updates' },
  'job confirm (sales person)': { audience: 'sales_person', category: 'sales_updates' },
  'opportunity booked (sales person)': { audience: 'sales_person', category: 'sales_updates' },
  'new email & sms reply (opportunity - sales person)': { audience: 'sales_person', category: 'sales_updates' },
  'new email & sms reply (lead - sales person)': { audience: 'sales_person', category: 'sales_updates' },
  'document signed': { audience: 'customer', category: 'customer_sign_off' },
  'estimate signed': { audience: 'customer', category: 'customer_sign_off' },
  'opportunity booked (customer)': { audience: 'customer', category: 'customer_sign_off' },
  'new email & sms reply (opportunity - customer)': { audience: 'customer', category: 'customer_sign_off' },
  'job cancel (customer)': { audience: 'customer', category: 'job_communications' },
  'job confirm (customer)': { audience: 'customer', category: 'job_communications' },
  'job remainder': { audience: 'customer', category: 'job_communications' },
  'job rescheduled': { audience: 'customer', category: 'job_communications' },
  'send quote': { audience: 'customer', category: 'outbound_delivery' },
  'send invoice': { audience: 'customer', category: 'outbound_delivery' },
  'send inventory': { audience: 'customer', category: 'outbound_delivery' },
  'send document': { audience: 'customer', category: 'outbound_delivery' },
  'new email & sms reply (lead - customer)': { audience: 'customer', category: 'lead_intake' },
};

const getNotificationMeta = (workflow) => {
  const normalized = normalizeWorkflowName(workflow?.name);
  return workflow?.trigger?.notification_meta || FALLBACK_NOTIFICATION_META[normalized] || { audience: 'sales_person', category: 'sales_updates' };
};

const notificationDisplayName = (workflowName) => {
  const normalized = normalizeWorkflowName(workflowName);
  if (normalized === 'customer payment made (manual)') return 'Customer Payment Made';
  return workflowName;
};

const getWorkflowChannels = (workflow) => {
  const stepTypes = new Set(
    (workflow?.steps || []).map((step) => String(step?.step_type || '').trim().toLowerCase())
  );
  const configChannels = new Set();

  (workflow?.steps || []).forEach((step) => {
    const declaredChannels = Array.isArray(step?.config?.channels) ? step.config.channels : [];
    declaredChannels.forEach((channel) => {
      const normalized = String(channel || '').trim().toLowerCase();
      if (normalized === 'email' || normalized === 'sms') configChannels.add(normalized);
    });
    if (String(step?.config?.email_template_key || '').trim() || step?.config?.email_template_id) {
      configChannels.add('email');
    }
    if (String(step?.config?.sms_template_key || '').trim() || step?.config?.sms_template_id) {
      configChannels.add('sms');
    }
  });

  return {
    hasEmail: stepTypes.has('send_email') || stepTypes.has('send_multichannel') || configChannels.has('email'),
    hasSms: stepTypes.has('send_sms') || stepTypes.has('send_multichannel') || configChannels.has('sms'),
  };
};

const Automation = () => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [workflows, setWorkflows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitial, setWizardInitial] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runFilters, setRunFilters] = useState({ workflow: '', status: '', target_type: '' });
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Mail },
    { id: 'rules', label: 'Automations', icon: Zap },
    { id: 'logs', label: 'Automation Logs', icon: Clock3 },
  ];

  const load = async (branchId = selectedBranchId, scope = activeTab) => {
    setIsLoading(true);
    try {
      const params = {};
      if (scope !== 'notifications' && branchId) params.branch = branchId;
      const res = await getAutomationWorkflows(params);
      setWorkflows(res?.results || res || []);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRuns = async (nextFilters = runFilters) => {
    setRunsLoading(true);
    try {
      const params = {};
      if (nextFilters.workflow) params.workflow = nextFilters.workflow;
      if (nextFilters.status) params.status = nextFilters.status;
      if (nextFilters.target_type) params.target_type = nextFilters.target_type;
      const res = await getAutomationRuns(params);
      setRuns(res?.results || res || []);
    } finally {
      setRunsLoading(false);
    }
  };

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await API.general.getBranches();
        const list = res?.results || res || [];
        setBranches(list);
        const defaultBranch = list.find(b => b.id === user?.branch_id) || list[0];
        if (defaultBranch) {
          setSelectedBranchId(String(defaultBranch.id));
          load(String(defaultBranch.id), 'notifications');
        } else {
          load('', 'notifications');
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
        load('', 'notifications');
      }
    };
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    if (branches.length > 0) {
      load(selectedBranchId, activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, activeTab]);

  useEffect(() => {
    if (activeTab === 'logs') loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filtered = useMemo(() => {
    let list = workflows;
    if (activeTab === 'notifications') {
      list = list.filter(w => w.is_notifications);
    } else if (activeTab === 'rules') {
      list = list.filter(w => !w.is_notifications);
    }
    const q = String(search || '').toLowerCase().trim();
    if (!q) return list;
    return list.filter((w) => String(w.name || '').toLowerCase().includes(q));
  }, [search, workflows, activeTab]);

  const notificationGroups = useMemo(() => {
    if (activeTab !== 'notifications') return [];

    const grouped = NOTIFICATION_AUDIENCES.map((audience) => ({
      ...audience,
      categories: audience.categories.map((category) => ({ ...category, items: [] })),
    }));
    const groupedIndex = new Map(
      grouped.flatMap((audience) =>
        audience.categories.map((category) => [`${audience.id}:${category.id}`, category])
      )
    );
    const dedupedByDisplayName = new Map();

    for (const workflow of filtered) {
      const displayName = notificationDisplayName(workflow.name || '');
      const normalizedDisplayName = normalizeWorkflowName(displayName);
      const meta = getNotificationMeta(workflow);
      const key = `${meta.audience}:${meta.category}:${normalizedDisplayName}`;
      const existing = dedupedByDisplayName.get(key);
      if (existing) {
        existing.members.push(workflow);
        existing.is_active = existing.members.some((item) => item.is_active);
        const mergedSteps = [...(existing.steps || []), ...(workflow.steps || [])];
        existing.steps = mergedSteps;
        continue;
      }
      dedupedByDisplayName.set(key, {
        ...workflow,
        name: displayName,
        members: [workflow],
        notification_meta: meta,
      });
    }

    for (const workflow of dedupedByDisplayName.values()) {
      const meta = workflow.notification_meta || getNotificationMeta(workflow);
      const category = groupedIndex.get(`${meta.audience}:${meta.category}`);
      if (category) {
        category.items.push(workflow);
      }
    }
    return grouped
      .map((audience) => ({
        ...audience,
        categories: audience.categories.filter((category) => category.items.length > 0),
      }))
      .filter((audience) => audience.categories.length > 0);
  }, [activeTab, filtered]);

  const summarizeTrigger = (wf) => {
    const t = wf.trigger?.type;
    if (t === 'time_based') return 'Time-Based';
    if (t === 'recurring') return 'Recurring';
    if (t === 'change') return `On ${wf.trigger?.params?.event || 'change'}`;
    if (wf.trigger_policy?.on_create) return 'On Create';
    return 'On Update';
  };

  const summarizeAction = (wf) => {
    const s = (wf.steps || [])[0];
    if (!s) return 'No action';
    if (s.step_type === 'send_email') return 'Send email';
    if (s.step_type === 'send_sms') return 'Send SMS';
    if (s.step_type === 'update_status') return 'Update status';
    if (s.step_type === 'create_task') return 'Create task';
    if (s.step_type === 'wait') return 'Wait';
    return s.step_type;
  };

  const defaultRecipientTokens = (targetType) => {
    if (targetType === 'lead') return ['contact1'];
    if (targetType === 'opportunity') return ['customer', 'sales_person_email', 'branch_email'];
    return ['customer', 'sales_person_email', 'branch_email'];
  };

  const openCreate = () => {
    setWizardInitial({
      meta: { name: '', description: '', target_type: 'lead', is_active: true, branch: selectedBranchId ? Number(selectedBranchId) : null },
      trigger: { type: 'change', params: { event: 'create' } },
      recipients: { mode: 'lead_contacts_or_custom', tokens: ['contact1'], custom_emails: [], custom_phones: [] },
      filters: { match: 'all', rules: [] },
      steps: [],
    });
    setWizardOpen(true);
  };

  const openEdit = async (wf) => {
    try {
      const stepsRes = await getAutomationSteps({ workflow: wf.id });
      const steps = (stepsRes?.results || stepsRes || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      setWizardInitial({
        meta: { id: wf.id, name: wf.name, description: wf.description || '', target_type: wf.target_type, is_active: !!wf.is_active, branch: wf.branch },
        trigger: wf.trigger || { type: 'change', params: { event: 'update' } },
        recipients: wf.recipients || { mode: 'lead_contacts_or_custom', tokens: defaultRecipientTokens(wf.target_type), custom_emails: [], custom_phones: [] },
        filters: wf.conditions || { match: 'all', rules: [] },
        steps: steps.map((s) => ({ step_type: s.step_type, config: s.config || {}, run_once: !!s.run_once, is_active: s.is_active !== false })),
      });
      setWizardOpen(true);
    } catch {
      // ignore
    }
  };

  const toggleActive = async (wf) => {
    const members = wf?.members?.length ? wf.members : (wf?.id ? [wf] : []);
    if (!members.length) return;

    const previousIsActive = wf.is_active;
    const nextIsActive = !previousIsActive;
    const memberIds = new Set(members.map((member) => member.id));

    setWorkflows((current) =>
      current.map((workflow) =>
        memberIds.has(workflow.id)
          ? { ...workflow, is_active: nextIsActive }
          : workflow
      )
    );

    try {
      for (const member of members) {
        if (previousIsActive) await deactivateAutomationWorkflow(member.id);
        else await activateAutomationWorkflow(member.id);
      }
    } catch (error) {

      setWorkflows((current) =>
        current.map((workflow) =>
          memberIds.has(workflow.id)
            ? { ...workflow, is_active: previousIsActive }
            : workflow
        )
      );
      throw error;
    }
  };

  const duplicate = async (wf) => {
    if (!wf?.id) return;
    const stepsRes = await getAutomationSteps({ workflow: wf.id });
    const steps = (stepsRes?.results || stepsRes || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const created = await createAutomationWorkflow({
      definition_version: wf.definition_version || 1,
      name: `${wf.name || 'Automation'} (Copy)`,
      target_type: wf.target_type,
      is_active: false,
      trigger: wf.trigger || {},
      recipients: wf.recipients || {},
      conditions: wf.conditions || { match: 'all', rules: [] },
      branch: wf.branch,
    });
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      await createAutomationStep({
        workflow: created.id,
        sort_order: i,
        step_type: s.step_type,
        config: s.config,
        run_once: !!s.run_once,
        is_active: s.is_active !== false,
      });
    }
    await load(selectedBranchId, activeTab);
  };

  const openEditTemplate = (wf) => {
    if (!wf.steps || !wf.steps.length) return;
    const step = wf.steps[0];
    const isMultichannel = step.step_type === 'send_multichannel';
    const stepChannels = isMultichannel
      ? (Array.isArray(step.config?.channels) && step.config.channels.length ? step.config.channels : ['email', 'sms'])
      : (step.step_type === 'send_sms' ? ['sms'] : ['email']);
    const emailTemplateKey = step.config.email_template_key || step.config.template_key || '';
    const smsTemplateKey = isMultichannel
      ? (step.config.sms_template_key || step.config.template_key || emailTemplateKey || '')
      : (step.step_type === 'send_sms' ? (step.config.sms_template_key || step.config.template_key || '') : '');
    const primaryTemplateKey = step.config.template_key || emailTemplateKey || smsTemplateKey || '';
    navigate('/automation/templates/new/builder', {
      state: {
        automationWorkflowId: wf.id,
        automationWorkflowName: wf.name,
        automationStepId: step.id,
        automationStepType: step.step_type,
        draftData: {
          name: step.config.name || wf.name || step.step_type || 'Notification',
          template_key: isMultichannel ? '' : primaryTemplateKey,
          subject: step.config.email_subject || step.config.inline_subject || step.config.subject || '',
          email_subject: step.config.email_subject || step.config.subject || '',
          body: step.config.inline_body || step.config.body || '',
          body_html: step.config.inline_body_html || step.config.body_html || '',
          sms_body: step.config.sms_body || step.config.inline_sms_body || step.config.body || '',
          email_template_key: emailTemplateKey,
          sms_template_key: smsTemplateKey,
          email_template_id: step.config.email_template_id || (step.step_type === 'send_email' ? step.config.template_id : null),
          sms_template_id: step.config.sms_template_id || (step.step_type === 'send_sms' ? step.config.template_id : null),
          channel: isMultichannel ? 'email_sms' : (step.step_type === 'send_sms' ? 'sms' : 'email'),
          channels: isMultichannel ? ['email', 'sms'] : stepChannels,
          notification_scope: step.config.notification_scope || 'company',
        },
      },
    });
  };

  const remove = async (wf) => {
    if (!wf?.id) return;
    if (!window.confirm('Delete this automation?')) return;
    const stepsRes = await getAutomationSteps({ workflow: wf.id });
    const steps = stepsRes?.results || stepsRes || [];
    for (const s of steps) {
      await deleteAutomationStep(s.id);
    }
    await deleteAutomationWorkflow(wf.id);
    await load(selectedBranchId, activeTab);
  };

  const statusTone = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'success') return 'bg-emerald-100 text-emerald-700';
    if (normalized === 'failed') return 'bg-rose-100 text-rose-700';
    if (normalized === 'running') return 'bg-amber-100 text-amber-700';
    if (normalized === 'skipped') return 'bg-slate-200 text-slate-700';
    return 'bg-blue-100 text-blue-700';
  };

  const fmtDateTime = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Automation Hub</h1>
            <p className="text-content-sec">Manage automated workflows and communication templates</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {branches.length > 0 && activeTab !== 'notifications' && (
            <div className="flex items-center space-x-2 bg-subtle rounded-lg p-1.5 border border-brand-border">
              <span className="text-xs font-bold text-muted pl-2 uppercase tracking-wide">Branch:</span>
              <select
                className="bg-transparent text-sm font-medium text-heading border-none focus:ring-0 cursor-pointer pl-1 pr-8 py-1"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
              >
                <option value="">Global / All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          {activeTab === 'rules' && (
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#003d2f] transition-all inline-flex items-center gap-2"
            >
              <Plus size={16} /> Create Automation
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-brand-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-primary active-tab'
                  : 'text-content-sec hover:text-content-main'
              }`}
            >
              <Icon size={18} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-brand-border p-6">
        {activeTab === 'rules' || activeTab === 'notifications' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search automations..."
                className="w-full max-w-md px-4 py-2 bg-subtle rounded-xl text-sm outline-none"
              />
            </div>

            <div className="border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-subtle text-[0.6875rem] font-bold uppercase tracking-widest text-muted">
                {activeTab === 'notifications' ? (
                  <>
                    <div className="col-span-7">Workflow</div>
                    <div className="col-span-3">Channel</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </>
                ) : (
                  <>
                    <div className="col-span-3">Trigger</div>
                    <div className="col-span-5">Workflow</div>
                    <div className="col-span-2">Filters</div>
                    <div className="col-span-2">Status</div>
                  </>
                )}
              </div>
              {isLoading ? (
                <div className="p-6 text-sm text-muted">Loading…</div>
              ) : filtered.length ? (
                activeTab === 'notifications' ? (
                  notificationGroups.map((audience) => (
                    <div key={audience.id} className="mb-6 last:mb-0">
                      <div className="bg-slate-100 px-4 py-2 border-y border-border text-xs font-bold uppercase tracking-wider text-slate-600">
                        {audience.label}
                      </div>
                      {audience.categories.map((category) => (
                        <div key={`${audience.id}:${category.id}`} className="last:mb-0">
                          <div className="bg-slate-50 px-4 py-2 border-b border-border text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            {category.label}
                          </div>
                          {category.items.map((wf) => (
                            <div key={wf.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-border last:border-b-0 items-center">
                              <div className="col-span-7">
                                <button
                                  type="button"
                                  className="text-left text-sm font-bold text-heading hover:text-primary transition-colors"
                                  onClick={() => openEditTemplate(wf)}
                                >
                                  {wf.name}
                                </button>
                                {wf.description && <div className="text-xs text-muted font-normal mt-0.5 whitespace-pre-wrap">{wf.description}</div>}
                              </div>
                              <div className="col-span-3 flex items-center gap-2">
                                {(() => {
                                  const { hasEmail, hasSms } = getWorkflowChannels(wf);
                                  const channelLabel = hasEmail && hasSms ? 'Email & SMS' : hasSms ? 'SMS' : 'Email';
                                  return (
                                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                                      {channelLabel}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="col-span-2 flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  className="p-2 rounded-lg hover:bg-subtle"
                                  onClick={() => toggleActive(wf)}
                                  title={wf.is_active ? 'Disable' : 'Enable'}
                                >
                                  {wf.is_active ? <ToggleRight size={30} className="text-primary" /> : <ToggleLeft size={30} className="text-muted" />}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  filtered.map((wf) => (
                    <div key={wf.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-t border-border items-center">
                      <div className="col-span-3 text-sm font-medium text-body">{summarizeTrigger(wf)}</div>
                      <div className="col-span-5">
                        <div className="text-sm font-bold text-heading">{wf.name}</div>
                        {wf.description && <div className="text-xs text-muted font-normal mt-0.5 whitespace-pre-wrap">{wf.description}</div>}
                        <div className="text-xs text-muted mt-1">{summarizeAction(wf)}</div>
                      </div>
                      <div className="col-span-2 text-sm text-body">
                        {(wf.conditions?.rules || []).length ? `${(wf.conditions?.rules || []).length} filter` : 'No filters'}
                      </div>
                    <div className="col-span-2 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                          wf.is_active ? 'bg-primary/10 text-primary' : 'bg-border text-muted'
                        }`}
                      >
                        {wf.is_active ? 'Active' : 'Paused'}
                      </span>
                      <div className="flex gap-1">
                        <button type="button" className="p-2 rounded-lg hover:bg-subtle" onClick={() => openEdit(wf)} title="Edit">
                          <Pencil size={16} />
                        </button>
                        <button type="button" className="p-2 rounded-lg hover:bg-subtle" onClick={() => duplicate(wf)} title="Duplicate">
                          <Copy size={16} />
                        </button>
                        <button type="button" className="p-2 rounded-lg hover:bg-subtle" onClick={() => toggleActive(wf)} title="Toggle">
                          {wf.is_active ? <ToggleRight size={30} className="text-primary" /> : <ToggleLeft size={30} className="text-muted" />}
                        </button>
                        {!wf.is_notifications && (
                          <button 
                            type="button" 
                            className="p-2 rounded-lg text-[#791F1F] hover:bg-subtle" 
                            onClick={() => remove(wf)} 
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )
              ) : (
                <div className="p-6 text-sm text-muted">No automations yet.</div>
              )}
            </div>

            <AutomationWizardModal
              open={wizardOpen}
              onClose={() => setWizardOpen(false)}
              onSaved={load}
              initialValue={wizardInitial}
              branches={branches}
            />
          </div>
        ) : activeTab === 'logs' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={runFilters.workflow}
                onChange={(e) => setRunFilters((prev) => ({ ...prev, workflow: e.target.value }))}
                className="rounded-xl border border-brand-border px-3 py-2 text-sm"
              >
                <option value="">All workflows</option>
                {workflows.map((wf) => (
                  <option key={wf.id} value={wf.id}>{wf.name}</option>
                ))}
              </select>
              <select
                value={runFilters.status}
                onChange={(e) => setRunFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="rounded-xl border border-brand-border px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="running">Running</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
              <select
                value={runFilters.target_type}
                onChange={(e) => setRunFilters((prev) => ({ ...prev, target_type: e.target.value }))}
                className="rounded-xl border border-brand-border px-3 py-2 text-sm"
              >
                <option value="">All targets</option>
                <option value="lead">Lead</option>
                <option value="estimate">Estimate</option>
                <option value="job">Job</option>
                <option value="opportunity">Opportunity</option>
              </select>
              <button
                type="button"
                onClick={() => loadRuns(runFilters)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#003d2f] transition-all"
              >
                Refresh Logs
              </button>
            </div>

            <div className="border border-border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-subtle text-[0.6875rem] font-bold uppercase tracking-widest text-muted">
                <div className="col-span-3">Workflow</div>
                <div className="col-span-2">Step</div>
                <div className="col-span-1">Target</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Scheduled</div>
                <div className="col-span-2">Executed</div>
              </div>
              {runsLoading ? (
                <div className="p-6 text-sm text-muted">Loading logs…</div>
              ) : runs.length ? (
                runs.map((run) => (
                  <div key={run.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-t border-border items-start">
                    <div className="col-span-3">
                      <div className="text-sm font-bold text-heading">{run.workflow_name || `Workflow #${run.workflow}`}</div>
                      <div className="text-xs text-muted">Run #{run.id}</div>
                    </div>
                    <div className="col-span-2 text-sm text-body">
                      <div>{run.step_type}</div>
                      <div className="text-xs text-muted">Order {run.step_order ?? '—'}</div>
                    </div>
                    <div className="col-span-1 text-sm text-body">
                      <div>{run.target_type}</div>
                      <div className="text-xs text-muted">#{run.target_id}</div>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${statusTone(run.status)}`}>
                        {run.status}
                      </span>
                      {run.error ? <div className="mt-1 text-xs text-rose-600">{run.error}</div> : null}
                    </div>
                    <div className="col-span-2 text-sm text-body">{fmtDateTime(run.scheduled_for)}</div>
                    <div className="col-span-2 text-sm text-body">{fmtDateTime(run.executed_at)}</div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-sm text-muted">No automation logs yet.</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Automation;
