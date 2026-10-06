import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { X } from 'lucide-react';
import {
  createAutomationStep,
  createAutomationWorkflow,
  deleteAutomationStep,
  getAutomationSteps,
  uploadFile,
  updateAutomationWorkflow,
} from '../../../services/api';
import { initialDraft, reducer, stepLabels } from './wizard/state';
import TriggerStep from './wizard/TriggerStep';
import ActionStep from './wizard/ActionStep';
import TargetStep from './wizard/TargetStep';
import FiltersStep from './wizard/FiltersStep';
import LivePreviewPane from './wizard/LivePreviewPane';

const steps = [TriggerStep, ActionStep, TargetStep, FiltersStep];

export default function AutomationWizardModal({ open, onClose, onSaved, initialValue, branches = [] }) {
  const [activeStep, setActiveStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [draft, dispatch] = useReducer(reducer, null, () => (initialValue ? initialValue : initialDraft()));

  const StepCmp = steps[activeStep];
  useEffect(() => {
    if (!open) return;
    dispatch({ type: 'load', value: initialValue ? initialValue : initialDraft() });
    setActiveStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValue]);

  const canNext = activeStep < steps.length - 1;
  const canPrev = activeStep > 0;

  const stepper = useMemo(
    () =>
      stepLabels.map((label, idx) => ({
        label,
        idx,
        status: idx < activeStep ? 'done' : idx === activeStep ? 'active' : 'todo',
      })),
    [activeStep]
  );

  const close = () => {
    setError(null);
    onClose?.();
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const wfPayload = {
        definition_version: 1,
        name: draft.meta.name,
        description: draft.meta.description || '',
        target_type: draft.meta.target_type,
        is_active: !!draft.meta.is_active,
        trigger: draft.trigger,
        recipients: draft.recipients,
        conditions: draft.filters,
        branch: draft.meta.branch,
      };

      let wfId = draft.meta.id;
      if (!wfId) {
        const created = await createAutomationWorkflow(wfPayload);
        wfId = created.id;
      } else {
        await updateAutomationWorkflow(wfId, wfPayload);
      }

      const pendingFiles = (draft.steps || []).map((step, index) => ({
        index,
        file: step?.config?._attachment_file,
      })).filter((item) => item.file);
      const stepsToSave = (draft.steps || []).filter((s) => s && s.step_type);
      const savedConfigs = stepsToSave.map((step) => ({ ...(step.config || {}) }));
      for (const { index, file } of pendingFiles) {
        const stepIndex = (draft.steps || []).slice(0, index).filter((s) => s && s.step_type).length;
        const uploaded = await uploadFile({
          target_type: 'automationworkflow',
          target_id: wfId,
          branch_id: draft.meta.branch || null,
          category: 'automation_attachment',
          file,
        });
        const assetId = uploaded?.id;
        if (!assetId) throw new Error('PDF upload did not return a file asset.');
        const config = savedConfigs[stepIndex];
        config.attachments = (config.attachments || []).map((key) => key === 'custom_pdf' ? `file_asset:${assetId}` : key);
        delete config._attachment_file;
      }
      savedConfigs.forEach((config) => { delete config._attachment_file; });

      // Replace steps with the single action step (v1 video-style).
      const existingStepsRes = await getAutomationSteps({ workflow: wfId });
      const existingSteps = existingStepsRes?.results || existingStepsRes || [];
      for (const s of existingSteps) {
        await deleteAutomationStep(s.id);
      }

      for (let i = 0; i < stepsToSave.length; i++) {
        const s = stepsToSave[i];
        await createAutomationStep({
          workflow: wfId,
          sort_order: i,
          step_type: s.step_type,
          config: savedConfigs[i] || {},
          run_once: !!s.run_once,
          is_active: s.is_active !== false,
        });
      }

      onSaved?.();
      close();
    } catch (e) {
      setError('Failed to save automation.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6">
      <div className="bg-card rounded-2xl w-full max-w-6xl max-h-[95vh] border border-border overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="font-bold text-heading">{draft.meta.id ? 'Edit Automation' : 'Create Automation'}</div>
          <button type="button" onClick={close} className="p-2 rounded-lg hover:bg-border/50">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[240px]">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Name</label>
                <input
                  className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                  value={draft.meta.name}
                  onChange={(e) => dispatch({ type: 'meta', patch: { name: e.target.value } })}
                  placeholder="e.g. New Lead Welcome"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Target</label>
                <select
                  className="mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                  value={draft.meta.target_type}
                  onChange={(e) => dispatch({ type: 'meta', patch: { target_type: e.target.value } })}
                >
                  <option value="lead">Lead</option>
                  <option value="estimate">Estimate</option>
                  <option value="job">Job</option>
                  <option value="opportunity">Opportunity</option>
                </select>
              </div>
              {branches.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted">Branch</label>
                  <select
                    className="mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
                    value={draft.meta.branch || ''}
                    onChange={(e) => dispatch({ type: 'meta', patch: { branch: e.target.value ? Number(e.target.value) : null } })}
                  >
                    <option value="">Global / All Branches</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-body pb-2">
                <input
                  type="checkbox"
                  checked={!!draft.meta.is_active}
                  onChange={(e) => dispatch({ type: 'meta', patch: { is_active: e.target.checked } })}
                />
                Enabled
              </label>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Description (Optional)</label>
              <textarea
                className="w-full mt-1 px-3 py-2 bg-subtle rounded-xl text-sm outline-none resize-y min-h-[40px] max-h-[120px]"
                value={draft.meta.description || ''}
                onChange={(e) => dispatch({ type: 'meta', patch: { description: e.target.value } })}
                placeholder="What does this automation do?"
                rows={1}
              />
            </div>
          </div>
        </div>

        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center gap-4">
            {stepper.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    s.status === 'done'
                      ? 'bg-primary text-white'
                      : s.status === 'active'
                      ? 'bg-primary/10 text-primary border border-primary'
                      : 'bg-border text-muted'
                  }`}
                >
                  {s.idx + 1}
                </div>
                <div className={`text-sm ${s.status === 'active' ? 'font-bold text-heading' : 'text-muted'}`}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {error && <div className="px-6 pt-4 text-sm text-red-700 shrink-0">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto min-h-0 flex-1">
          <div className="lg:col-span-8 p-6 flex flex-col min-h-0">
            <StepCmp draft={draft} dispatch={dispatch} />
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={!canPrev || isSaving}
                onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                className="px-4 py-2 bg-border rounded-xl text-sm font-bold disabled:opacity-60"
              >
                Previous
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={isSaving || !String(draft.meta.name || '').trim()}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  disabled={!canNext || isSaving}
                  onClick={() => setActiveStep((s) => Math.min(steps.length - 1, s + 1))}
                  className="px-4 py-2 bg-border rounded-xl text-sm font-bold disabled:opacity-60"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 p-6 border-l border-border bg-page lg:overflow-y-auto">
            <LivePreviewPane draft={draft} />
          </div>
        </div>
      </div>
    </div>
  );
}
