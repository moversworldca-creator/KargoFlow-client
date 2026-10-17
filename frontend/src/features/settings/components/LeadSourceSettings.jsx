import React, { useEffect, useState } from 'react';
import {
  Webhook, Plus, RefreshCcw, KeyRound, Copy, Building2, Sliders, Route, Terminal, Shield, Check, Loader2, Edit3
} from 'lucide-react';
import Card from '../../../shared/ui/Card';
import { GhostBtn, PrimaryBtn, Pill, StatusDot } from '../../../shared/ui/RedesignAtoms';
import { getBranches, updateBranch } from '../../../services/api';
import { providerApi } from '../../crm/leads/inboundApi';
import LeadImportModal from '../../crm/components/LeadImportModal';
import ProviderSecretModal from './inbound/ProviderSecretModal';
import ProviderConfigDrawer from './inbound/ProviderConfigDrawer';
import LeadRoutingRules from './inbound/LeadRoutingRules';
import LeadIntakeAuditLog from './inbound/LeadIntakeAuditLog';
import { useToast } from '../../../shared/context/ToastContext';

export default function LeadSourceSettings({ branchId }) {
  const toast = useToast();
  const [subTab, setSubTab] = useState('providers');
  const [providers, setProviders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // New Provider Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);

  // Secret Modal State
  const [secretModalData, setSecretModalData] = useState({ isOpen: false, provider: null, apiSecret: '' });

  // Config Drawer State
  const [configDrawerData, setConfigDrawerData] = useState({ isOpen: false, provider: null });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [providersList, branchesRes] = await Promise.all([
        providerApi.list(),
        getBranches(),
      ]);
      setProviders(providersList);
      const bData = branchesRes?.data ?? branchesRes;
      setBranches(Array.isArray(bData) ? bData : bData?.results || []);
    } catch (err) {
      console.error('Failed to load inbound lead sources:', err);
      toast?.showError?.('Failed to load inbound settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProvider = async () => {
    if (!newProviderName.trim()) {
      toast?.showError?.('Provider name is required');
      return;
    }
    setIsCreatingProvider(true);
    try {
      const res = await providerApi.create({
        name: newProviderName.trim(),
        is_active: true,
        duplicate_to_selected_branches: false,
        normalization_enabled: true,
        normalization_settings: {
          duplicate_policy: 'review',
          unknown_catalog: 'warn',
          date_format: '%m/%d/%Y',
        },
      });

      const providerObj = res.provider || res;
      const apiSecret = res.api_secret || '';

      setProviders(prev => [providerObj, ...prev]);
      setIsCreateModalOpen(false);
      setNewProviderName('');

      // Show one-time secret modal
      setSecretModalData({
        isOpen: true,
        provider: providerObj,
        apiSecret,
      });
      toast?.showSuccess?.(`Lead provider "${providerObj.name}" created!`);
    } catch (err) {
      console.error('Create provider failed:', err);
      toast?.showError?.(err?.response?.data?.detail || err?.message || 'Failed to create provider');
    } finally {
      setIsCreatingProvider(false);
    }
  };

  const handleRotateSecret = async (provider) => {
    if (!window.confirm(`Rotate API secret for "${provider.name}"? Previous secret will stop working immediately.`)) return;
    try {
      const res = await providerApi.rotateSecret(provider.id);
      setSecretModalData({
        isOpen: true,
        provider: res.provider || provider,
        apiSecret: res.api_secret,
      });
      toast?.showSuccess?.('API secret rotated');
    } catch (err) {
      toast?.showError?.('Failed to rotate API secret');
    }
  };

  const handleToggleBranchPosting = async (branch) => {
    try {
      const nextVal = !branch.enable_lead_posting;
      await updateBranch(branch.id, { enable_lead_posting: nextVal });
      setBranches((prev) => prev.map((b) => (b.id === branch.id ? { ...b, enable_lead_posting: nextVal } : b)));
      toast?.showSuccess?.(`Updated posting status for ${branch.name}`);
    } catch (err) {
      toast?.showError?.('Failed to update branch setting');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Webhook className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Inbound Lead Integration Hub</h3>
            <p className="text-xs text-slate-500">Configure external lead providers, routing rules, webhooks, and audit logs.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GhostBtn icon="upload-cloud" onClick={() => setIsImportModalOpen(true)}>
            Import CSV / Excel
          </GhostBtn>
          <PrimaryBtn icon="plus" onClick={() => setIsCreateModalOpen(true)}>
            New Lead Provider
          </PrimaryBtn>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 text-xs">
        <button
          type="button"
          onClick={() => setSubTab('providers')}
          className={`flex items-center gap-1.5 px-3 py-2 font-bold rounded-xl transition ${
            subTab === 'providers'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <KeyRound size={14} />
          Lead Providers ({providers.length})
        </button>

        <button
          type="button"
          onClick={() => setSubTab('routing')}
          className={`flex items-center gap-1.5 px-3 py-2 font-bold rounded-xl transition ${
            subTab === 'routing'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Route size={14} />
          Routing Rules
        </button>

        <button
          type="button"
          onClick={() => setSubTab('logs')}
          className={`flex items-center gap-1.5 px-3 py-2 font-bold rounded-xl transition ${
            subTab === 'logs'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Terminal size={14} />
          Webhook Audit Log
        </button>

        <button
          type="button"
          onClick={() => setSubTab('branches')}
          className={`flex items-center gap-1.5 px-3 py-2 font-bold rounded-xl transition ${
            subTab === 'branches'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 size={14} />
          Branch Inbound Status
        </button>
      </div>

      {/* Sub-Tab Content */}
      {subTab === 'providers' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {providers.map((p) => {
                const defaultBranch = branches.find(b => b.id === p.default_branch_id);
                return (
                  <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</span>
                        <Pill tone={p.is_active ? 'green' : 'slate'}>
                          <StatusDot tone={p.is_active ? 'green' : 'slate'} />
                          <span>{p.is_active ? 'Active' : 'Disabled'}</span>
                        </Pill>
                        {p.duplicate_to_selected_branches && (
                          <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            Fan-Out Mode
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>Key: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{p.provider_key}</code></span>
                        <span>&bull;</span>
                        <span>Default Branch: <strong>{defaultBranch ? defaultBranch.name : 'Main HQ'}</strong></span>
                        {p.last_used_at && (
                          <>
                            <span>&bull;</span>
                            <span>Last used: {new Date(p.last_used_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRotateSecret(p)}
                        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <RefreshCcw size={12} />
                        Rotate Secret
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfigDrawerData({ isOpen: true, provider: p })}
                        className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <Sliders size={12} />
                        Configure
                      </button>
                    </div>
                  </div>
                );
              })}

              {providers.length === 0 && (
                <div className="p-12 text-center space-y-3">
                  <KeyRound size={28} className="mx-auto text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium">No lead providers created yet.</p>
                  <PrimaryBtn icon="plus" onClick={() => setIsCreateModalOpen(true)}>
                    Create First Provider
                  </PrimaryBtn>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {subTab === 'routing' && (
        <LeadRoutingRules branches={branches} />
      )}

      {subTab === 'logs' && (
        <LeadIntakeAuditLog />
      )}

      {subTab === 'branches' && (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-sm">
          {branches.map((b) => (
            <div key={b.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">{b.name}</span>
                  {b.is_main && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                      Main HQ
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{b.city || ''}, {b.state || ''} &bull; #{b.id}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {b.enable_lead_posting ? 'Inbound Active' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(b.enable_lead_posting)}
                  onChange={() => handleToggleBranchPosting(b)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Provider Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Lead Provider</h3>
            <p className="text-xs text-slate-500">Add an external marketing source (e.g. Website Webhook, Yelp Leads, MovingVan.com).</p>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Provider Name
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Corporate Website Inbound"
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <GhostBtn onClick={() => setIsCreateModalOpen(false)}>Cancel</GhostBtn>
              <PrimaryBtn onClick={handleCreateProvider} loading={isCreatingProvider}>
                Generate Credentials
              </PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {/* Secret Reveal Modal */}
      <ProviderSecretModal
        isOpen={secretModalData.isOpen}
        onClose={() => setSecretModalData({ isOpen: false, provider: null, apiSecret: '' })}
        provider={secretModalData.provider}
        apiSecret={secretModalData.apiSecret}
      />

      {/* Provider Config Drawer */}
      <ProviderConfigDrawer
        isOpen={configDrawerData.isOpen}
        onClose={() => setConfigDrawerData({ isOpen: false, provider: null })}
        provider={configDrawerData.provider}
        branches={branches}
        onUpdated={loadData}
      />

      {/* Bulk Lead Import Modal */}
      <LeadImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
