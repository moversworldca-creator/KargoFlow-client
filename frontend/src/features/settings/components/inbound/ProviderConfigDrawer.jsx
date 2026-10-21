import React, { useState, useEffect } from 'react';
import { X, Sliders, Layers, GitBranch, ArrowRight, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { providerApi } from '../../../../services/api';
import { GhostBtn, PrimaryBtn, Pill } from '../../../../shared/ui/RedesignAtoms';
import { useToast } from '../../../../shared/context/ToastContext';

export default function ProviderConfigDrawer({
  isOpen,
  onClose,
  provider,
  branches = [],
  referralSources = [],
  onUpdated,
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [defaultBranchId, setDefaultBranchId] = useState('');
  const [referralSourceId, setReferralSourceId] = useState('');
  const [duplicateToBranches, setDuplicateToBranches] = useState(false);
  const [normalizationEnabled, setNormalizationEnabled] = useState(true);

  // Normalization sub-settings
  const [duplicatePolicy, setDuplicatePolicy] = useState('queue');
  const [unknownCatalog, setUnknownCatalog] = useState('warn');
  const [dateFormat, setDateFormat] = useState('%m/%d/%Y');

  // Branch targets & mappings
  const [branchTargets, setBranchTargets] = useState([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState(new Set());
  const [mappings, setMappings] = useState([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);

  // New mapping input
  const [newMappingField, setNewMappingField] = useState('move_size');
  const [newMappingExternal, setNewMappingExternal] = useState('');
  const [newMappingTargetCode, setNewMappingTargetCode] = useState('');

  // New branch target input
  const [newTargetBranchId, setNewTargetBranchId] = useState('');

  useEffect(() => {
    if (!isOpen || !provider) return;

    setName(provider.name || '');
    setIsActive(Boolean(provider.is_active));
    setDefaultBranchId(provider.default_branch_id ? String(provider.default_branch_id) : '');
    setReferralSourceId(provider.referral_source_id ? String(provider.referral_source_id) : '');
    setDuplicateToBranches(Boolean(provider.duplicate_to_selected_branches));
    setNormalizationEnabled(Boolean(provider.normalization_enabled));

    const settings = provider.normalization_settings || {};
    setDuplicatePolicy(settings.duplicate_policy || 'review');
    setUnknownCatalog(settings.unknown_catalog || 'warn');
    setDateFormat(settings.date_format || '%m/%d/%Y');

    // Fetch branch targets and mappings
    setIsLoadingLists(true);
    Promise.all([
      providerApi.listBranches(provider.id),
      providerApi.listMappings(provider.id),
    ])
      .then(([bList, mList]) => {
        const rawBranches = Array.isArray(bList) ? bList : [];
        setBranchTargets(rawBranches);
        setMappings(Array.isArray(mList) ? mList : []);
        
        const activeTargets = rawBranches.filter(t => t.is_active !== false);
        const targetIds = new Set(activeTargets.map(t => Number(t.branch_id)));
        if (targetIds.size > 0) {
          setSelectedBranchIds(targetIds);
        } else if (provider.duplicate_to_selected_branches && branches.length > 0) {
          // If fan-out is enabled but no targets configured yet, default to all available branches
          setSelectedBranchIds(new Set(branches.map(b => Number(b.id))));
        } else {
          setSelectedBranchIds(new Set());
        }
      })
      .catch(err => console.error('Failed to load provider sub-records:', err))
      .finally(() => setIsLoadingLists(false));
  }, [isOpen, provider, branches]);

  if (!isOpen || !provider) return null;

  const handleToggleDuplicateToBranches = (checked) => {
    setDuplicateToBranches(checked);
    if (checked && selectedBranchIds.size === 0 && branches.length > 0) {
      setSelectedBranchIds(new Set(branches.map(b => Number(b.id))));
    }
  };

  const handleSaveGeneral = async () => {
    if (!name.trim()) {
      toast?.showError?.('Provider name cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        is_active: isActive,
        default_branch_id: defaultBranchId ? Number(defaultBranchId) : null,
        referral_source_id: referralSourceId ? Number(referralSourceId) : null,
        duplicate_to_selected_branches: duplicateToBranches,
        normalization_enabled: normalizationEnabled,
        normalization_settings: {
          ...(provider.normalization_settings || {}),
          duplicate_policy: duplicatePolicy,
          unknown_catalog: unknownCatalog,
          date_format: dateFormat,
        },
      };

      await providerApi.update(provider.id, payload);

      // Synchronize branch targets if fan-out is enabled
      if (duplicateToBranches) {
        const existingMap = new Map((branchTargets || []).map(t => [Number(t.branch_id), t.id]));
        const selectedArr = Array.from(selectedBranchIds);

        // Add newly selected branches
        for (const bId of selectedArr) {
          if (!existingMap.has(bId)) {
            try {
              const created = await providerApi.addBranch(provider.id, {
                branch_id: bId,
                is_active: true,
                conditions: [],
              });
              setBranchTargets(prev => [...prev, created]);
            } catch (err) {
              console.error(`Failed to add branch target ${bId}:`, err);
            }
          }
        }

        // Remove unselected branches that were previously targets
        for (const [bId, recordId] of existingMap.entries()) {
          if (!selectedBranchIds.has(bId)) {
            try {
              await providerApi.removeBranch(provider.id, recordId);
              setBranchTargets(prev => prev.filter(t => t.id !== recordId));
            } catch (err) {
              console.error(`Failed to remove branch target ${recordId}:`, err);
            }
          }
        }
      }

      toast?.showSuccess?.('Provider configuration updated successfully');
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error('Update provider failed:', err);
      toast?.showError?.(err?.response?.data?.detail || err?.message || 'Failed to update provider');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBranchTarget = async () => {
    if (!newTargetBranchId) return;
    try {
      const created = await providerApi.addBranch(provider.id, {
        branch_id: Number(newTargetBranchId),
        is_active: true,
        conditions: [],
      });
      setBranchTargets(prev => [...prev, created]);
      setSelectedBranchIds(prev => new Set([...prev, Number(created.branch_id)]));
      setNewTargetBranchId('');
      toast?.showSuccess?.('Branch target added');
    } catch (err) {
      toast?.showError?.(err?.response?.data?.detail || err?.message || 'Failed to add branch target');
    }
  };

  const handleRemoveBranchTarget = async (recordId) => {
    try {
      const targetToRemove = branchTargets.find(b => b.id === recordId);
      await providerApi.removeBranch(provider.id, recordId);
      setBranchTargets(prev => prev.filter(b => b.id !== recordId));
      if (targetToRemove) {
        setSelectedBranchIds(prev => {
          const next = new Set(prev);
          next.delete(Number(targetToRemove.branch_id));
          return next;
        });
      }
      toast?.showSuccess?.('Branch target removed');
    } catch (err) {
      toast?.showError?.('Failed to remove branch target');
    }
  };

  const handleAddMapping = async () => {
    if (!newMappingExternal.trim()) return;
    try {
      const created = await providerApi.createMapping(provider.id, {
        field_name: newMappingField,
        external_value: newMappingExternal.trim(),
        normalized_value: newMappingTargetCode.trim(),
        target_code: newMappingTargetCode.trim(),
      });
      setMappings(prev => [...prev, created]);
      setNewMappingExternal('');
      setNewMappingTargetCode('');
      toast?.showSuccess?.('Mapping added');
    } catch (err) {
      toast?.showError?.(err?.response?.data?.detail || err?.message || 'Failed to add mapping');
    }
  };

  const handleRemoveMapping = async (recordId) => {
    try {
      await providerApi.removeMapping(provider.id, recordId);
      setMappings(prev => prev.filter(m => m.id !== recordId));
      toast?.showSuccess?.('Mapping removed');
    } catch (err) {
      toast?.showError?.('Failed to remove mapping');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Provider Settings: {provider.name}
            </h3>
            <span className="font-mono text-xs text-slate-400">{provider.provider_key}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'general'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            General & Routing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('normalization')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'normalization'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Normalization & Mappings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fanout')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'fanout'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Branch Fan-Out ({selectedBranchIds.size})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Provider Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Active Status</span>
                  <span className="text-[11px] text-slate-500">Enable or disable accepting leads from this provider key.</span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Default Fallback Branch
                </label>
                <select
                  value={defaultBranchId}
                  onChange={(e) => setDefaultBranchId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Company Main Branch (System Fallback)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.is_main ? '(Main HQ)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Default Marketing Referral Source
                </label>
                <select
                  value={referralSourceId}
                  onChange={(e) => setReferralSourceId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">None (Organic / Unassigned)</option>
                  {referralSources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name || r.code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Duplicate to Selected Branches (Fan-Out)</span>
                    <span className="text-[11px] text-slate-500">Deliver copies of each lead to multiple eligible branches simultaneously.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={duplicateToBranches}
                    onChange={(e) => handleToggleDuplicateToBranches(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                {duplicateToBranches && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Target Branches ({selectedBranchIds.size} of {branches.length} selected)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBranchIds(new Set(branches.map(b => Number(b.id))))}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedBranchIds(new Set())}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/40">
                      {branches.map(b => {
                        const bId = Number(b.id);
                        const isSelected = selectedBranchIds.has(bId);
                        const acceptsInbound = b.accepts_inbound_leads ?? b.enable_lead_posting ?? true;
                        return (
                          <label
                            key={b.id}
                            className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition cursor-pointer select-none ${
                              isSelected
                                ? 'bg-white shadow-sm border border-primary/30 dark:bg-slate-800'
                                : 'hover:bg-white/60 dark:hover:bg-slate-800/50 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  const next = new Set(selectedBranchIds);
                                  if (next.has(bId)) next.delete(bId);
                                  else next.add(bId);
                                  setSelectedBranchIds(next);
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                              />
                              <span className={`font-medium ${isSelected ? 'text-primary font-bold dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                {b.name}
                              </span>
                              {b.is_main && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                  Main HQ
                                </span>
                              )}
                            </div>
                            <div>
                              {!acceptsInbound ? (
                                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/40 dark:bg-amber-950/30">
                                  Inbound Disabled
                                </span>
                              ) : isSelected ? (
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                                  Will Receive Lead
                                </span>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                      {branches.length === 0 && (
                        <p className="p-3 text-center text-xs text-slate-400">No branches found for this workspace.</p>
                      )}
                    </div>

                    {selectedBranchIds.size === 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200 dark:border-amber-900/30">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>No branches selected. Check at least one branch to enable fan-out delivery.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'normalization' && (
            <div className="space-y-6">
              <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Ingestion Policies
                </h4>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Duplicate Submission Policy
                  </label>
                  <select
                    value={duplicatePolicy}
                    onChange={(e) => setDuplicatePolicy(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="review">Queue for Staff Review (Standard CRM)</option>
                    <option value="reject">Reject Immediately at Intake (Automated Gate)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Unknown Catalog Values
                  </label>
                  <select
                    value={unknownCatalog}
                    onChange={(e) => setUnknownCatalog(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="warn">Leave Empty & Log Normalization Warning (Permissive)</option>
                    <option value="reject">Reject Inbound Submission (Strict)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Move Date Format Pattern
                  </label>
                  <input
                    type="text"
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    placeholder="%m/%d/%Y"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Value Mappings Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Field Value Translations ({mappings.length})
                  </h4>
                </div>

                {/* Add new mapping */}
                <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
                  <select
                    value={newMappingField}
                    onChange={(e) => setNewMappingField(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  >
                    <option value="move_size">Move Size</option>
                    <option value="service_type">Service Type</option>
                    <option value="move_type">Move Type</option>
                    <option value="state">State</option>
                    <option value="country">Country</option>
                    <option value="phone_type">Phone Type</option>
                  </select>
                  <input
                    type="text"
                    placeholder="External: 2 Bed"
                    value={newMappingExternal}
                    onChange={(e) => setNewMappingExternal(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Target: 2BR"
                    value={newMappingTargetCode}
                    onChange={(e) => setNewMappingTargetCode(e.target.value)}
                    className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddMapping}
                    className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white"
                  >
                    Add
                  </button>
                </div>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs dark:divide-slate-800 dark:border-slate-800">
                  {mappings.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900">
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 mr-2 uppercase text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {m.field_name}
                        </span>
                        <span className="font-mono text-slate-500">"{m.external_value}"</span>
                        <span className="mx-2 text-slate-400">&rarr;</span>
                        <span className="font-bold font-mono text-primary">{m.target_code || m.normalized_value}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMapping(m.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {mappings.length === 0 && (
                    <p className="p-4 text-center text-xs text-slate-400">No value mappings configured.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fanout' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
                When <strong>Duplicate to Selected Branches</strong> is enabled, leads are cloned across these designated target facilities simultaneously.
              </div>

              {/* Add Branch Target */}
              <div className="flex gap-2">
                <select
                  value={newTargetBranchId}
                  onChange={(e) => setNewTargetBranchId(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="">Select branch target...</option>
                  {branches.filter(b => !branchTargets.some(t => t.branch_id === b.id)).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddBranchTarget}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
                >
                  Add Target
                </button>
              </div>

              {/* Targets List */}
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs dark:divide-slate-800 dark:border-slate-800">
                {branchTargets.map((t) => {
                  const branchObj = branches.find(b => b.id === t.branch_id);
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{branchObj?.name || `Branch #${t.branch_id}`}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {t.conditions?.length ? `${t.conditions.length} condition(s)` : 'Universal delivery (no conditions)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBranchTarget(t.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
                {branchTargets.length === 0 && (
                  <p className="p-4 text-center text-xs text-slate-400">No branch fan-out targets configured.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <GhostBtn onClick={onClose} disabled={isSaving}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handleSaveGeneral} loading={isSaving}>Save Changes</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
