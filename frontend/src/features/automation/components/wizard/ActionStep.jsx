import React, { useEffect, useMemo, useState } from 'react';
import { getCommunicationTemplates, getCommunicationTemplate, getAutomationVariables, listFiles, updateCommunicationTemplate } from '../../../../services/api';
import EmailVisualBuilder from '../../../../features/settings/components/EmailVisualBuilder';

const cardClass = (active) =>
  `p-3 rounded-xl border text-left transition-all ${
    active ? 'border-primary bg-primary/5' : 'border-border hover:bg-subtle/50'
  }`;

export default function ActionStep({ draft, dispatch }) {
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [smsTemplates, setSmsTemplates] = useState([]);
  const [templateVariables, setTemplateVariables] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingSubject, setEditingSubject] = useState('');
  const [editingBody, setEditingBody] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [storedPdfName, setStoredPdfName] = useState('');

  const deduplicateByKey = (list) => {
    const keys = new Set();
    return list.filter((t) => {
      if (!t.template_key) return true;
      if (keys.has(t.template_key)) return false;
      keys.add(t.template_key);
      return true;
    });
  };

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const params = { limit: 500 };
        if (draft.meta?.branch) params.branch = draft.meta.branch;
        const [emailRes, smsRes] = await Promise.all([
          getCommunicationTemplates({ ...params, channel: 'email' }),
          getCommunicationTemplates({ ...params, channel: 'sms' }),
        ]);
        const allEmails = emailRes?.results || emailRes || [];
        const allSms = smsRes?.results || smsRes || [];
        window._allWizardTemplatesCache = [...allEmails, ...allSms];
        
        setEmailTemplates(deduplicateByKey(allEmails));
        setSmsTemplates(deduplicateByKey(allSms));
      } catch {
        setEmailTemplates([]);
        setSmsTemplates([]);
      }
    };
    loadTemplates();
  }, [draft.meta?.branch]);

  useEffect(() => {
    const loadVariables = async () => {
      try {
        const res = await getAutomationVariables(draft.meta?.target_type || 'lead');
        setTemplateVariables(res?.template_variables || []);
      } catch {
        setTemplateVariables([]);
      }
    };
    loadVariables();
  }, [draft.meta?.target_type]);

  const steps = draft.steps || [];
  const activeStep = steps[activeIdx] || steps[0] || { step_type: 'send_email', config: {} };
  const stepType = activeStep.step_type || 'send_email';
  const config = activeStep.config || {};

  useEffect(() => {
    let cancelled = false;
    const loadStoredPdf = async () => {
      const assetId = (config.attachments || [])
        .find((key) => String(key).startsWith('file_asset:'))
        ?.split(':')[1];
      if (!draft.meta?.id || !assetId) {
        setStoredPdfName('');
        return;
      }
      try {
        const response = await listFiles({
          target_type: 'automationworkflow',
          target_id: draft.meta.id,
          category: 'automation_attachment',
        });
        const files = response?.results || response || [];
        const asset = files.find((file) => String(file.id) === String(assetId));
        if (!cancelled) setStoredPdfName(asset?.original_filename || '');
      } catch {
        if (!cancelled) setStoredPdfName('');
      }
    };
    loadStoredPdf();
    return () => { cancelled = true; };
  }, [draft.meta?.id, config.attachments]);

  const isMultichannel = stepType === 'send_multichannel';
  const activeTemplateChannel = isMultichannel
    ? ((config.channels || []).includes('sms') && !(config.channels || []).includes('email') ? 'sms' : 'email')
    : (stepType === 'send_sms' ? 'sms' : 'email');
  const activeEditorTemplateKey = isMultichannel
    ? (activeTemplateChannel === 'sms' ? (config.sms_template_key || '') : (config.email_template_key || ''))
    : (config.template_key || '');

  const templates = useMemo(() => {
    if (isMultichannel) return activeTemplateChannel === 'sms' ? smsTemplates : emailTemplates;
    if (stepType === 'send_sms') return smsTemplates;
    return emailTemplates;
  }, [isMultichannel, activeTemplateChannel, stepType, emailTemplates, smsTemplates]);

  const selectedTemplate = useMemo(() => {
    const currentKey = activeEditorTemplateKey || (config.template_id ? window._allWizardTemplatesCache?.find(t => t.id === config.template_id)?.template_key : null);
    return templates.find((t) => t.template_key === currentKey) || null;
  }, [templates, activeEditorTemplateKey, config.template_id]);

  const missingTemplateVars = useMemo(() => {
    const used = Array.isArray(selectedTemplate?.variables) ? selectedTemplate.variables : [];
    const allowed = new Set(templateVariables);
    return used.filter((key) => !allowed.has(key));
  }, [selectedTemplate, templateVariables]);

  const attachmentOptions = useMemo(() => {
    const targetType = draft.meta?.target_type || 'lead';
    const options = [];
    if (['lead', 'estimate', 'opportunity', 'job'].includes(targetType)) {
      options.push({ key: 'estimate_pdf', label: 'Attach estimate PDF', hint: 'Attach the latest estimate PDF when available.' });
    }
    if (['lead', 'estimate', 'opportunity', 'job'].includes(targetType)) {
      options.push({ key: 'invoice_pdf', label: 'Attach invoice PDF', hint: 'Attach the latest invoice PDF when available.' });
    }
    return options;
  }, [draft.meta?.target_type]);

  const selectedPdf = config._attachment_file || null;
  const selectedPdfName = selectedPdf?.name || storedPdfName;

  const selectPdf = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      window.alert('Please select a PDF file.');
      return;
    }
    dispatch({
      type: 'stepsUpdateConfig',
      index: activeIdx,
      patch: {
        _attachment_file: file,
        attachments: Array.from(new Set([
          ...(config.attachments || []).filter((key) => key !== 'custom_pdf' && !String(key).startsWith('file_asset:')),
          'custom_pdf',
        ])),
      },
    });
  };

  const clearPdf = () => {
    dispatch({
      type: 'stepsUpdateConfig',
      index: activeIdx,
      patch: {
        _attachment_file: null,
        attachments: (config.attachments || []).filter((key) => key !== 'custom_pdf' && !String(key).startsWith('file_asset:')),
      },
    });
  };

  const defaultStep = (type) => {
    if (type === 'wait') return { step_type: 'wait', config: { duration: 10, unit: 'minutes' }, run_once: false, is_active: true };
    if (type === 'send_email') return { step_type: 'send_email', config: { template_key: '', require_email: true, attachments: [] }, run_once: false, is_active: true };
    if (type === 'send_sms') return { step_type: 'send_sms', config: { template_key: '', require_sms_opt_in: true }, run_once: false, is_active: true };
    if (type === 'send_multichannel') return { step_type: 'send_multichannel', config: { channels: ['email', 'sms'], email_template_key: '', sms_template_key: '', require_email: true, require_sms_opt_in: true, attachments: [] }, run_once: false, is_active: true };
    if (type === 'update_status') return { step_type: 'update_status', config: { field: 'status', value: '' }, run_once: false, is_active: true };
    return {
      step_type: 'create_task',
      config: { task_type: 'general', assign_to: 'record_owner', due_in: { duration: 1, unit: 'days' }, notes: '' },
      run_once: false,
      is_active: true,
    };
  };

  const addStep = (type) => {
    dispatch({ type: 'stepsAdd', value: defaultStep(type) });
    setActiveIdx(steps.length);
  };

  const removeStep = (idx) => {
    dispatch({ type: 'stepsRemove', index: idx });
    setActiveIdx((p) => Math.max(0, Math.min(p, (steps.length - 2))));
  };

  const moveStep = (idx, dir) => {
    const to = idx + dir;
    dispatch({ type: 'stepsMove', from: idx, to });
    setActiveIdx(to);
  };

  const setStepType = (type) => {
    dispatch({ type: 'stepsUpdate', index: activeIdx, patch: { step_type: type, config: defaultStep(type).config } });
  };

  const startEditTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const fullTemplateRes = await getCommunicationTemplate(selectedTemplate.id);
      const fullTemplate = fullTemplateRes?.results || fullTemplateRes || selectedTemplate;
      setEditingTemplate(fullTemplate);
      setEditingSubject(fullTemplate.subject || '');
      setEditingBody(fullTemplate.body_html || fullTemplate.body || '');
    } catch (e) {
      alert("Failed to load template details.");
    }
  };

  const saveEditedTemplate = async () => {
    if (!editingTemplate) return;
    setIsSavingTemplate(true);
    try {
      const payload = {
        subject: editingSubject,
        body: activeTemplateChannel === 'sms' ? editingBody : '',
        body_html: activeTemplateChannel === 'sms' ? '' : editingBody,
      };
      const res = await updateCommunicationTemplate(editingTemplate.id, payload);
      
      const updateList = (list) => list.map(t => t.id === res.id ? { ...t, ...payload } : t);
      if (activeTemplateChannel === 'sms') {
        setSmsTemplates(updateList(smsTemplates));
      } else {
        setEmailTemplates(updateList(emailTemplates));
      }
      
      const cachedIdx = window._allWizardTemplatesCache?.findIndex(t => t.id === res.id);
      if (cachedIdx > -1 && window._allWizardTemplatesCache) {
        window._allWizardTemplatesCache[cachedIdx] = { ...window._allWizardTemplatesCache[cachedIdx], ...payload };
      }
      
      setEditingTemplate(null);
    } catch (err) {
      alert('Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const startPreviewTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const res = await getCommunicationTemplate(selectedTemplate.id);
      setPreviewTemplate(res);
      setShowPreviewModal(true);
    } catch {
      alert('Failed to load template details for preview');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-heading">Actions</h2>
        <p className="text-sm text-muted">Build a multi-step workflow (add, remove, and reorder steps)</p>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-heading">Steps</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="px-3 py-2 bg-border rounded-xl text-sm font-bold" onClick={() => addStep('wait')}>
              + Wait
            </button>
            <button type="button" className="px-3 py-2 bg-border rounded-xl text-sm font-bold" onClick={() => addStep('send_email')}>
              + Email
            </button>
            <button type="button" className="px-3 py-2 bg-border rounded-xl text-sm font-bold" onClick={() => addStep('send_sms')}>
              + SMS
            </button>
            <button type="button" className="px-3 py-2 bg-border rounded-xl text-sm font-bold" onClick={() => addStep('send_multichannel')}>
              + Multichannel
            </button>
            <button type="button" className="px-3 py-2 bg-border rounded-xl text-sm font-bold" onClick={() => addStep('update_status')}>
              + Status
            </button>
            <button type="button" className="px-3 py-2 bg-border rounded-xl text-sm font-bold" onClick={() => addStep('create_task')}>
              + Task
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {steps.map((s, idx) => (
            <div key={idx} className={`flex items-center justify-between gap-2 rounded-xl border p-2 ${idx === activeIdx ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <button type="button" className="flex-1 text-left px-2 py-1 text-sm font-bold" onClick={() => setActiveIdx(idx)}>
                {idx + 1}. {s.step_type}
              </button>
              <div className="flex gap-2">
                <button type="button" className="px-2 py-1 rounded-lg bg-border text-xs font-bold disabled:opacity-60" disabled={idx === 0} onClick={() => moveStep(idx, -1)}>
                  ↑
                </button>
                <button type="button" className="px-2 py-1 rounded-lg bg-border text-xs font-bold disabled:opacity-60" disabled={idx === steps.length - 1} onClick={() => moveStep(idx, 1)}>
                  ↓
                </button>
                <button type="button" className="px-2 py-1 rounded-lg bg-[#FDE8E8]/60 text-[#791F1F] text-xs font-bold" onClick={() => removeStep(idx)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!steps.length && <div className="text-sm text-muted">No steps yet. Add one above.</div>}
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="text-sm font-bold text-heading">Step Settings</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted">Type</label>
            <select
              className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
              value={stepType}
              onChange={(e) => setStepType(e.target.value)}
            >
              <option value="wait">Wait</option>
              <option value="send_email">Send Email</option>
              <option value="send_sms">Send SMS</option>
              <option value="send_multichannel">Send Multichannel</option>
              <option value="update_status">Update Status</option>
              <option value="create_task">Create Task</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-body mt-6 md:mt-0">
            <input
              type="checkbox"
              checked={activeStep.is_active !== false}
              onChange={(e) => dispatch({ type: 'stepsUpdate', index: activeIdx, patch: { is_active: e.target.checked } })}
            />
            Enabled
          </label>
        </div>

        {stepType === 'wait' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Duration</label>
              <input
                type="number"
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={config.duration ?? 10}
                onChange={(e) => dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { duration: Number(e.target.value) } })}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Unit</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={config.unit || 'minutes'}
                onChange={(e) => dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { unit: e.target.value } })}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
        ) : null}

        {stepType === 'send_email' || stepType === 'send_sms' || stepType === 'send_multichannel' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">
                {isMultichannel ? `${activeTemplateChannel === 'sms' ? 'SMS' : 'Email'} Template` : 'Template'}
              </label>
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 mt-1 px-4 py-2 bg-subtle rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  value={String(activeEditorTemplateKey || (config.template_id ? window._allWizardTemplatesCache?.find(t => t.id === config.template_id)?.template_key : ''))}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (isMultichannel) {
                      const keyField = activeTemplateChannel === 'sms' ? 'sms_template_key' : 'email_template_key';
                      dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { [keyField]: value, template_id: undefined } });
                    } else {
                      dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { template_key: value, template_id: undefined } });
                    }
                  }}
                >
                  <option value="">Select template</option>
                  {templates.map((t) => (
                    <option key={t.template_key || t.id} value={t.template_key || t.id}>
                      {t.name || t.template_key}
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={startPreviewTemplate}
                      className="mt-1 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-bold whitespace-nowrap"
                    >
                      Preview
                    </button>
                    <button 
                      type="button" 
                      onClick={startEditTemplate}
                      className="mt-1 px-3 py-2 bg-border hover:bg-border/80 rounded-xl text-sm font-bold whitespace-nowrap"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              
              {editingTemplate && editingTemplate.id === selectedTemplate?.id && (
                <div className="mt-3 p-3 bg-subtle rounded-xl border border-border space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold">Edit Template</h4>
                    <button type="button" onClick={() => setEditingTemplate(null)} className="text-xs text-muted hover:text-body">Cancel</button>
                  </div>
                  {activeTemplateChannel !== 'sms' && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-muted">Subject</label>
                      <input 
                        className="w-full mt-1 px-3 py-2 bg-white rounded-lg border border-border text-sm outline-none"
                        value={editingSubject}
                        onChange={(e) => setEditingSubject(e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-muted">Body</label>
                    {activeTemplateChannel !== 'sms' ? (
                      <div className="mt-1 border border-border rounded-xl overflow-hidden bg-white">
                        <EmailVisualBuilder 
                          key={`email-builder-${editingTemplate?.id || 'new'}`}
                          value={editingBody}
                          onChange={(html) => setEditingBody(html)}
                        />
                      </div>
                    ) : (
                      <textarea 
                        className="w-full mt-1 px-3 py-2 bg-white rounded-lg border border-border text-sm outline-none min-h-[100px]"
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                      />
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      onClick={saveEditedTemplate}
                      disabled={isSavingTemplate}
                      className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-bold shadow disabled:opacity-60"
                    >
                      {isSavingTemplate ? 'Saving...' : 'Save Template'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {(stepType === 'send_email' || stepType === 'send_multichannel') && (
              <div className="space-y-3 mt-1 md:mt-0 md:col-span-2">
                <label className="flex items-center gap-2 text-sm text-body">
                  <input
                    type="checkbox"
                    checked={config.require_email !== false}
                    onChange={(e) => dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { require_email: e.target.checked } })}
                  />
                  Require email
                </label>

                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted">Attachments</div>
                  {attachmentOptions.map((option) => {
                    const enabled = Array.isArray(config.attachments) && config.attachments.includes(option.key);
                    return (
                      <button
                        key={option.key}
                        type="button"
                        className={`flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                          enabled ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-subtle/60'
                        }`}
                        onClick={() => {
                          const next = enabled
                            ? (config.attachments || []).filter((x) => x !== option.key)
                            : Array.from(new Set([...(config.attachments || []), option.key]));
                          dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { attachments: next } });
                        }}
                      >
                        <div>
                          <div className="text-sm font-bold text-heading">{option.label}</div>
                          <div className="text-xs text-muted">{option.hint}</div>
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
                  <div className={`rounded-xl border px-4 py-3 ${selectedPdfName ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-heading">Attach PDF file</div>
                        <div className="text-xs text-muted">Browse and select a PDF to send with this automation.</div>
                        {selectedPdfName && <div className="mt-1 text-xs font-semibold text-primary">{selectedPdfName}</div>}
                      </div>
                      {selectedPdfName && (
                        <button type="button" className="text-xs font-bold text-muted hover:text-heading" onClick={clearPdf}>
                          Remove
                        </button>
                      )}
                    </div>
                    <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-border bg-subtle px-3 py-2 text-xs font-bold text-heading hover:bg-border/50">
                      Browse PDF
                      <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={selectPdf} />
                    </label>
                  </div>
                </div>

                {selectedTemplate && (
                  <div className="rounded-xl border border-border bg-subtle/40 p-3 text-xs text-body">
                    <div className="font-bold text-heading">Template variables</div>
                    <div className="mt-1">
                      {Array.isArray(selectedTemplate.variables) && selectedTemplate.variables.length
                        ? selectedTemplate.variables.join(', ')
                        : 'No variables declared on this template.'}
                    </div>
                    {missingTemplateVars.length > 0 && (
                      <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                        Missing from automation variable catalog: {missingTemplateVars.join(', ')}
                      </div>
                    )}
                  </div>
                )}
                {stepType === 'send_multichannel' && (
                  <div className="rounded-xl border border-border bg-white p-3 space-y-3">
                    <label className="flex items-center gap-2 text-sm text-body">
                      <input
                        type="checkbox"
                        checked={(config.channels || ['email', 'sms']).includes('sms')}
                        onChange={(e) => {
                          const channels = new Set(config.channels || ['email', 'sms']);
                          if (e.target.checked) channels.add('sms');
                          else channels.delete('sms');
                          dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { channels: Array.from(channels) } });
                        }}
                      />
                      Include SMS
                    </label>
                    <label className="flex items-center gap-2 text-sm text-body">
                      <input
                        type="checkbox"
                        checked={(config.channels || ['email', 'sms']).includes('email')}
                        onChange={(e) => {
                          const channels = new Set(config.channels || ['email', 'sms']);
                          if (e.target.checked) channels.add('email');
                          else channels.delete('email');
                          dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { channels: Array.from(channels) } });
                        }}
                      />
                      Include Email
                    </label>
                  </div>
                )}
                {stepType === 'send_multichannel' && (
                  <div className="rounded-xl border border-border bg-white p-3 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted">Company Template Keys</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">Email Key</label>
                        <select
                          className="w-full mt-1 px-4 py-2 bg-subtle rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                          value={String(config.email_template_key || '')}
                          onChange={(e) => dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { email_template_key: e.target.value, template_id: undefined } })}
                        >
                          <option value="">Select email template</option>
                          {emailTemplates.map((t) => (
                            <option key={`email-${t.template_key || t.id}`} value={t.template_key || t.id}>
                              {t.name || t.template_key}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-muted">SMS Key</label>
                        <select
                          className="w-full mt-1 px-4 py-2 bg-subtle rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                          value={String(config.sms_template_key || '')}
                          onChange={(e) => dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { sms_template_key: e.target.value, template_id: undefined } })}
                        >
                          <option value="">Select SMS template</option>
                          {smsTemplates.map((t) => (
                            <option key={`sms-${t.template_key || t.id}`} value={t.template_key || t.id}>
                              {t.name || t.template_key}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {stepType === 'update_status' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted">Field</label>
            <select
              className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
              value={config.field || 'status'}
              onChange={(e) => dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { field: e.target.value, value: '' } })}
            >
              <option value="status">Status</option>
              {(draft.meta?.target_type === 'lead' || draft.meta?.target_type === 'opportunity') && <option value="workflow_stage">Workflow Stage</option>}
            </select>
          </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Value</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={String(config.value || '')}
                onChange={(e) => dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { value: e.target.value } })}
              />
            </div>
          </div>
        ) : null}

        {stepType === 'create_task' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Task Type</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={config.task_type || 'general'}
                onChange={(e) => dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { task_type: e.target.value } })}
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
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={config.assign_to || 'record_owner'}
                onChange={(e) => dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { assign_to: e.target.value } })}
              >
                <option value="record_owner">Record Owner</option>
                <option value="specific_user">Specific User</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Due In</label>
              <input
                type="number"
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={config.due_in?.duration ?? 1}
                onChange={(e) =>
                  dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { due_in: { ...(config.due_in || {}), duration: Number(e.target.value) } } })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Unit</label>
              <select
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                value={config.due_in?.unit || 'days'}
                onChange={(e) =>
                  dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { due_in: { ...(config.due_in || {}), unit: e.target.value } } })
                }
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Notes (templated)</label>
              <textarea
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none min-h-[90px]"
                value={String(config.notes || '')}
                onChange={(e) => dispatch({ type: 'stepsUpdateConfig', index: activeIdx, patch: { notes: e.target.value } })}
                placeholder="e.g. Call {{customer_name}} about deposit"
              />
            </div>
          </div>
        ) : null}
      </div>
      
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b flex justify-between items-center bg-subtle">
              <h3 className="font-bold text-heading">Template Preview</h3>
              <button onClick={() => setShowPreviewModal(false)} className="text-muted hover:text-body">
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {previewTemplate.subject && (
                <div className="mb-4 pb-4 border-b">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted mb-1">Subject</div>
                  <div className="text-sm font-medium">{previewTemplate.subject}</div>
                </div>
              )}
              <div className="text-xs font-bold uppercase tracking-widest text-muted mb-2">Message Body</div>
              <div className="p-4 bg-white border rounded-xl overflow-hidden shadow-inner min-h-[100px]">
                {(() => {
                  const html = previewTemplate.body_html;
                  const text = previewTemplate.body || '';
                  
                  if (!html && !text) {
                    return <div className="text-muted italic flex items-center justify-center h-full">Empty template</div>;
                  }
                  
                  return (
                    <div 
                      className="prose prose-sm max-w-none" 
                      dangerouslySetInnerHTML={{ __html: html || text.replace(/\n/g, '<br/>') }} 
                    />
                  );
                })()}
              </div>
            </div>
            <div className="p-4 border-t bg-subtle flex justify-end">
              <button onClick={() => setShowPreviewModal(false)} className="px-4 py-2 bg-border font-bold text-sm rounded-xl hover:bg-border/80">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
