import React, { useEffect, useState } from 'react';
import { AlertCircle, Copy, KeyRound, Loader2, Plus, RefreshCcw, Webhook, Building2 } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import {
  getInboundLeadConfig,
  getBranches,
  rotateInboundLeadSecret,
  updateBranch,
} from '../../../services/api';
import LeadImportModal from '../../crm/components/LeadImportModal';

const Toggle = ({ enabled, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
    />
  </button>
);

const LeadSourceSettings = () => {
  const [inboundConfig, setInboundConfig] = useState(null);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const toList = (res) => {
    const data = res?.data ?? res;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const normalizeConfig = (res) => res?.data ?? res ?? null;

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [configRes, branchRes] = await Promise.all([getInboundLeadConfig(), getBranches()]);
        setInboundConfig(normalizeConfig(configRes));
        setBranches(toList(branchRes));
      } catch (err) {
        console.error('Failed to load inbound lead settings:', err);
        setError('Failed to load inbound lead settings.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const copyValue = async (label, value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1600);
    } catch (err) {
      console.error('Copy failed:', err);
      setError(`Failed to copy ${label}.`);
    }
  };

  const handleRotateSecret = async () => {
    setIsSaving(true);
    setError('');
    try {
      const next = await rotateInboundLeadSecret();
      setInboundConfig(normalizeConfig(next));
    } catch (err) {
      console.error('Rotate secret failed:', err);
      setError('Failed to rotate inbound API secret.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBranchPosting = async (branch) => {
    setError('');
    try {
      const nextVal = !branch.enable_lead_posting;
      await updateBranch(branch.id, { enable_lead_posting: nextVal });
      setBranches((prev) => prev.map((b) => (b.id === branch.id ? { ...b, enable_lead_posting: nextVal } : b)));
    } catch (err) {
      console.error('Failed to update branch lead posting setting:', err);
      setError('Failed to update branch lead posting setting.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={20} />
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Compact Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3 dark:border-slate-700">
            <Webhook size={14} className="text-primary" />
            <h3 className="text-xs font-bold text-heading dark:text-white">Inbound Lead API</h3>
          </div>
          <span className="text-[11px] text-body hidden sm:inline">Secure API intake and branch lead routing</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRotateSecret}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
            Rotate Secret
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90"
          >
            <Plus size={13} /> Import Leads
          </button>
        </div>
      </div>

      <LeadImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-[#FDE8E8] bg-[#FDE8E8]/30 px-3 py-1.5 text-xs text-[#791F1F]">
          <AlertCircle size={14} />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Metric Cards - Compact row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <Card className="!p-3 !rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-body">API Status</p>
              <p className="mt-0.5 text-sm font-black text-heading dark:text-white">{inboundConfig?.api_key ? 'Active & Ready' : 'Pending Key'}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${inboundConfig?.api_key ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'}`}>
              {inboundConfig?.api_key ? 'Verified' : 'Unconfigured'}
            </span>
          </div>
        </Card>
        <Card className="!p-3 !rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-body">Posting Targets</p>
              <p className="mt-0.5 text-sm font-black text-heading dark:text-white">{branches.filter(b => b.enable_lead_posting).length} / {branches.length} Branches</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <Building2 size={14} />
            </div>
          </div>
        </Card>
        <Card className="!p-3 !rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-body">Endpoint</p>
              <p className="mt-0.5 font-mono text-xs font-bold text-heading dark:text-white truncate">POST /api/leads/inbound/submit/</p>
            </div>
            <button type="button" onClick={() => copyValue('endpoint', '/api/leads/inbound/submit/')} className="rounded-lg p-1 text-slate-400 hover:text-primary">
              <Copy size={13} />
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.3fr] gap-3">
        {/* Credentials Card */}
        <Card className="!p-3.5 !rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-heading">API Credentials</h4>
            <span className="text-[10px] text-body">Headers: X-Company-Key & X-Company-Secret</span>
          </div>

          {(!inboundConfig?.api_key && !inboundConfig?.api_secret && !inboundConfig?.api_secret_preview) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              Inbound credentials have not been generated yet for this company.
            </div>
          )}

          <div className="space-y-2">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-body">API Key</span>
                <button type="button" onClick={() => copyValue('key', inboundConfig?.api_key)} className="text-slate-400 hover:text-primary">
                  <Copy size={13} />
                </button>
              </div>
              <p className="mt-1 break-all font-mono text-xs font-medium text-heading dark:text-white">{inboundConfig?.api_key || '-'}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-body">API Secret</span>
                <button type="button" onClick={() => copyValue('secret', inboundConfig?.api_secret || inboundConfig?.api_secret_preview)} className="text-slate-400 hover:text-primary">
                  <Copy size={13} />
                </button>
              </div>
              <p className="mt-1 break-all font-mono text-xs font-medium text-heading dark:text-white">
                {inboundConfig?.api_secret || inboundConfig?.api_secret_preview || 'Rotate secret to reveal a new key.'}
              </p>
            </div>
          </div>

          {copied && <p className="text-[11px] font-bold text-emerald-600">Copied {copied} to clipboard.</p>}
        </Card>

        {/* Lead Posting to Branches */}
        <Card className="!p-3.5 !rounded-xl space-y-2.5">
          <div>
            <h4 className="text-xs font-bold text-heading">Branch Lead Routing</h4>
            <p className="text-[10px] text-body">Select which branch facilities receive copies of inbound web leads.</p>
          </div>

          <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/40 overflow-hidden max-h-72 overflow-y-auto">
            {branches.length > 0 ? branches.map((branch) => (
              <div key={branch.id} className="flex items-center justify-between px-3 py-2 transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-heading dark:text-white text-xs truncate">{branch.name}</span>
                    {branch.is_main && (
                      <span className="rounded bg-primary-tint/40 px-1.5 py-0.2 text-[9px] font-bold uppercase text-primary">
                        Main
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-body truncate">
                    {branch.city || '-'}, {branch.state || '-'} · #{branch.id}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-body">
                    {branch.enable_lead_posting ? 'Posting Active' : 'Off'}
                  </span>
                  <Toggle
                    enabled={branch.enable_lead_posting}
                    onToggle={() => handleToggleBranchPosting(branch)}
                  />
                </div>
              </div>
            )) : (
              <p className="text-xs text-body p-3">No branches found.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LeadSourceSettings;
