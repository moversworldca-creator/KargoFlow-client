import React, { useEffect, useState } from 'react';
import { AlertCircle, Copy, KeyRound, Loader2, Plus, RefreshCcw } from 'lucide-react';
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
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${enabled ? 'bg-primary' : 'bg-slate-200'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
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
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-xl font-black text-slate-900 font-heading">Inbound Lead API & Routing</h3>
          <p className="text-sm text-slate-600 max-w-3xl">
            Manage inbound lead credentials and branch posting here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsImportModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-white hover:bg-primary-dark shadow-sm transition whitespace-nowrap"
        >
          <Plus size={16} />
          Import Leads
        </button>
      </div>

      <LeadImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-[#FDE8E8] bg-[#FDE8E8]/30 px-4 py-3 text-[#791F1F]">
          <AlertCircle size={18} />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border border-slate-200 bg-white shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">API Credentials</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{inboundConfig?.api_key ? 'Ready' : 'Missing'}</div>
          <div className="mt-1 text-xs text-slate-500">Inbound lead config status</div>
        </Card>
        <Card className="border border-slate-200 bg-white shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Branches</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{branches.length}</div>
          <div className="mt-1 text-xs text-slate-500">Available posting targets</div>
        </Card>
        <Card className="border border-slate-200 bg-white shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Import</div>
          <div className="mt-2 text-2xl font-black text-slate-900">Bulk</div>
          <div className="mt-1 text-xs text-slate-500">Open the lead import modal</div>
        </Card>
      </div>

      <Card className="p-6 space-y-4 border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-slate-900">Credentials</h4>
            <p className="text-sm text-slate-600">Use these headers on external POST requests: `X-Company-Key` and `X-Company-Secret`.</p>
          </div>
          <button
            type="button"
            onClick={handleRotateSecret}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-bold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            <RefreshCcw size={16} />
            Rotate Secret
          </button>
        </div>

        {(!inboundConfig?.api_key && !inboundConfig?.api_secret && !inboundConfig?.api_secret_preview) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Inbound credentials have not been generated yet for this company.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">API Key</span>
              <button type="button" onClick={() => copyValue('key', inboundConfig?.api_key)} className="text-slate-500 hover:text-slate-900">
                <Copy size={16} />
              </button>
            </div>
            <p className="mt-3 break-all font-mono text-sm text-slate-900">{inboundConfig?.api_key || '-'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">API Secret</span>
              <button type="button" onClick={() => copyValue('secret', inboundConfig?.api_secret || inboundConfig?.api_secret_preview)} className="text-slate-500 hover:text-slate-900">
                <Copy size={16} />
              </button>
            </div>
            <p className="mt-3 break-all font-mono text-sm text-slate-900">
              {inboundConfig?.api_secret || inboundConfig?.api_secret_preview || 'Rotate secret to reveal a new value.'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <KeyRound size={16} />
            Endpoint
          </div>
          <p className="mt-2 font-mono text-xs text-slate-600">POST /api/leads/inbound/submit/</p>
          {copied && <p className="mt-3 text-xs font-bold text-primary">Copied {copied}.</p>}
        </div>
      </Card>

      <Card className="p-6 space-y-4 border border-slate-200 bg-white shadow-sm">
        <div>
          <h4 className="text-base font-bold text-slate-900">Lead Posting to Branches</h4>
          <p className="text-sm text-slate-600">
            Manage which branches receive duplicates of inbound leads. If no branch posting is enabled, leads are routed only to the main branch.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {branches.length > 0 ? branches.map((branch) => (
            <div key={branch.id} className="flex items-center justify-between py-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{branch.name}</span>
                  {branch.is_main && (
                    <span className="rounded bg-primary-tint/40 px-2 py-0.5 text-[0.625rem] font-bold uppercase text-primary">
                      Main
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  ID: {branch.id} | Location: {branch.city || '-'}, {branch.state || '-'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">
                  {branch.enable_lead_posting ? 'Lead Posting Enabled' : 'Lead Posting Disabled'}
                </span>
                <Toggle
                  enabled={branch.enable_lead_posting}
                  onToggle={() => handleToggleBranchPosting(branch)}
                />
              </div>
            </div>
          )) : (
            <p className="text-sm text-slate-600 py-2">No branches configured.</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LeadSourceSettings;
