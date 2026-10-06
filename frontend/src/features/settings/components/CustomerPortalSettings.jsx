import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Globe, Loader2, Save } from 'lucide-react';

import Card from '../../../shared/ui/Card';
import {
  createCustomerPortalSettings,
  getCustomerPortalSettings,
  updateCustomerPortalSettings,
} from '../../../services/api';

const inputCls = 'w-full rounded-xl border border-[#d9e7f2] bg-white px-3 py-2 text-sm text-[#111d23] outline-none focus:border-[#00513f]/35 focus:ring-2 focus:ring-[#00513f]/10';

const emptyForm = {
  id: null,
  portal_title: 'Customer Inventory Portal',
  portal_intro:
    'Add the items you expect us to move. Your sales representative will review this list manually before finalizing the estimate.',
  submit_button_label: 'Submit Inventory',
  estimate_portal_title: 'Review Your Estimate',
  estimate_portal_intro:
    'Review your move details, approve the estimate electronically, and continue to payment.',
  contract_page_title: 'Moving Contract',
  contract_page_intro:
    'Read this contract carefully before signing. Your signature confirms approval of the estimate and moving terms.',
  contract_terms:
    'These services are subject to the terms presented by the moving company, including the estimate charges, scheduling requirements, and deposit conditions.',
  estimate_esign_enabled: true,
  selection_mode: 'room_based',
};

const normalize = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const CustomerPortalSettings = () => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const flash = (type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await getCustomerPortalSettings();
      const [row] = normalize(response);
      setForm(row || emptyForm);
    } catch {
      flash('error', 'Failed to load customer portal settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        portal_title: form.portal_title,
        portal_intro: form.portal_intro,
        submit_button_label: form.submit_button_label,
        estimate_portal_title: form.estimate_portal_title,
        estimate_portal_intro: form.estimate_portal_intro,
        contract_page_title: form.contract_page_title,
        contract_page_intro: form.contract_page_intro,
        contract_terms: form.contract_terms,
        estimate_esign_enabled: form.estimate_esign_enabled,
        selection_mode: form.selection_mode,
      };
      const saved = form.id
        ? await updateCustomerPortalSettings(form.id, payload)
        : await createCustomerPortalSettings(payload);
      setForm(saved);
      flash('success', 'Customer portal settings saved.');
    } catch {
      flash('error', 'Failed to save customer portal settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#60727b]">
        <Loader2 className="mr-3 animate-spin" size={18} />
        Loading customer portal settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="rounded-[2rem] border border-[#dce8f1] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#edf8f4] text-[#00513f]">
            <Globe size={18} />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-[#111d23]">Customer Portal</h3>
            <p className="text-sm text-[#60727b]">
              Configure the customer-facing inventory portal separately from email templates and inventory helper catalogs.
            </p>
          </div>
        </div>
      </Card>

      {message && message.text ? (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-[#ccebdc] bg-[#f3fcf7] text-[#00513f]'
              : 'border-[#f1d7d5] bg-[#fff8f7] text-[#b42318]'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Card className="rounded-[2rem] border border-[#dce8f1] bg-white p-6 shadow-sm">
          <div className="grid gap-5">
            <label className="space-y-2">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Portal Title</span>
              <input
                className={inputCls}
                value={form.portal_title}
                onChange={(e) => setForm((prev) => ({ ...prev, portal_title: e.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Portal Intro</span>
              <textarea
                className={`${inputCls} min-h-[110px] resize-y`}
                value={form.portal_intro}
                onChange={(e) => setForm((prev) => ({ ...prev, portal_intro: e.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#60727b]">Estimate Portal Title</span>
              <input
                className={inputCls}
                value={form.estimate_portal_title}
                onChange={(e) => setForm((prev) => ({ ...prev, estimate_portal_title: e.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#60727b]">Estimate Portal Intro</span>
              <textarea
                className={`${inputCls} min-h-[110px] resize-y`}
                value={form.estimate_portal_intro}
                onChange={(e) => setForm((prev) => ({ ...prev, estimate_portal_intro: e.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#60727b]">Contract Page Title</span>
              <input
                className={inputCls}
                value={form.contract_page_title}
                onChange={(e) => setForm((prev) => ({ ...prev, contract_page_title: e.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#60727b]">Contract Page Intro</span>
              <textarea
                className={`${inputCls} min-h-[110px] resize-y`}
                value={form.contract_page_intro}
                onChange={(e) => setForm((prev) => ({ ...prev, contract_page_intro: e.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#60727b]">Contract Terms</span>
              <textarea
                className={`${inputCls} min-h-[150px] resize-y`}
                value={form.contract_terms}
                onChange={(e) => setForm((prev) => ({ ...prev, contract_terms: e.target.value }))}
              />
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-[#dce8f1] bg-[#fbfdff] p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-[#9eb7c9] text-[#00513f] focus:ring-[#00513f]/20"
                checked={Boolean(form.estimate_esign_enabled)}
                onChange={(e) => setForm((prev) => ({ ...prev, estimate_esign_enabled: e.target.checked }))}
              />
              <span className="space-y-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[#60727b]">Require Estimate Signature</span>
                <span className="block text-sm text-[#60727b]">
                  When enabled, customers must draw a signature before accepting the estimate. When disabled, they only need to accept the terms.
                </span>
              </span>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#60727b]">Submit Button Label</span>
              <input
                className={inputCls}
                value={form.submit_button_label}
                onChange={(e) => setForm((prev) => ({ ...prev, submit_button_label: e.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Selection Mode</span>
              <select
                className={inputCls}
                value={form.selection_mode}
                onChange={(e) => setForm((prev) => ({ ...prev, selection_mode: e.target.value }))}
              >
                <option value="room_based">Room Based</option>
              </select>
            </label>
          </div>
        </Card>

        <Card className="rounded-[2rem] border border-[#dce8f1] bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <h4 className="font-display text-lg font-bold text-[#111d23]">Preview</h4>
            <div className="rounded-2xl border border-[#dce8f1] bg-[#fbfdff] p-4">
              <div className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Portal Title</div>
              <div className="mt-2 text-lg font-bold text-[#111d23]">{form.portal_title}</div>
            </div>
            <div className="rounded-2xl border border-[#dce8f1] bg-[#fbfdff] p-4">
              <div className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Portal Intro</div>
              <div className="mt-2 text-sm text-[#506169]">{form.portal_intro}</div>
            </div>
            <div className="rounded-2xl border border-[#dce8f1] bg-[#fbfdff] p-4">
              <div className="text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-[#60727b]">Submit Button</div>
              <button className="mt-3 rounded-xl bg-[#00513f] px-4 py-2 text-sm font-bold text-white">
                {form.submit_button_label}
              </button>
            </div>
            <div className="rounded-2xl border border-[#dce8f1] bg-[#fbfdff] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#60727b]">Estimate Portal</div>
              <div className="mt-2 text-lg font-bold text-[#111d23]">{form.estimate_portal_title}</div>
              <div className="mt-2 text-sm text-[#506169]">{form.estimate_portal_intro}</div>
            </div>
            <div className="rounded-2xl border border-[#dce8f1] bg-[#fbfdff] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#60727b]">Contract Page</div>
              <div className="mt-2 text-lg font-bold text-[#111d23]">{form.contract_page_title}</div>
              <div className="mt-2 text-sm text-[#506169] whitespace-pre-line">{form.contract_page_intro}</div>
            </div>
            <div className="rounded-2xl border border-[#dce8f1] bg-[#fbfdff] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#60727b]">Contract Terms Preview</div>
              <div className="mt-2 text-sm text-[#506169] whitespace-pre-line">{form.contract_terms}</div>
            </div>

            <div className="pt-2">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#00513f] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save Portal Settings
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CustomerPortalSettings;
