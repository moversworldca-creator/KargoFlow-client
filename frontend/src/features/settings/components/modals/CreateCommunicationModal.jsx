import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, MessageSquare, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { createCommunicationTemplate } from '../../../../services/api';

export const COMMUNICATION_PRESETS = [
  { id: 'standard', label: 'Standard Clean Layout' },
  { id: 'notification', label: 'Alert / Notification Layout' },
  { id: 'blank', label: 'Blank Canvas' },
];

export default function CreateCommunicationModal({
  isOpen,
  onClose,
  onBack,
  onCreated,
  branches = [],
  defaultBranchId = null,
  initialChannel = 'email',
}) {
  const [channel, setChannel] = useState(initialChannel || 'email');
  const [name, setName] = useState('New Email Notification');
  const [templateKey, setTemplateKey] = useState('quote_followup');
  const [subject, setSubject] = useState('Regarding your moving estimate');
  const [selectedBranch, setSelectedBranch] = useState(defaultBranchId ? String(defaultBranchId) : '');
  const [startingPreset, setStartingPreset] = useState('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const nameInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const activeCh = initialChannel === 'sms' ? 'sms' : 'email';
      setChannel(activeCh);
      setName(activeCh === 'sms' ? 'Booking Confirmation SMS' : 'New Email Notification');
      setTemplateKey(activeCh === 'sms' ? 'booking_confirmation_sms' : 'quote_followup_email');
      setSubject(activeCh === 'sms' ? '' : 'Regarding your moving estimate');
      setSelectedBranch(defaultBranchId ? String(defaultBranchId) : (branches[0]?.id ? String(branches[0].id) : ''));
      setStartingPreset('standard');
      setErrorMessage('');
      setTimeout(() => nameInputRef.current?.focus(), 80);
    }
  }, [isOpen, initialChannel, defaultBranchId, branches]);

  const handleChannelChange = (newChannel) => {
    setChannel(newChannel);
    if (newChannel === 'sms') {
      setName('Booking Confirmation SMS');
      setTemplateKey('booking_confirmation_sms');
      setSubject('');
    } else {
      setName('New Email Notification');
      setTemplateKey('quote_followup_email');
      setSubject('Regarding your moving estimate');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const cleanName = String(name || '').trim();
    if (!cleanName || cleanName.length < 3) {
      setErrorMessage('Template name must be at least 3 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        name: cleanName,
        channel,
        template_key: String(templateKey || '').trim().toLowerCase().replace(/\s+/g, '_'),
        subject: channel === 'sms' ? '' : String(subject || '').trim(),
        body: channel === 'sms' ? 'Hello {{Customer.first_name}}, your booking is confirmed!' : '',
        body_html: channel === 'email' ? (startingPreset === 'blank' ? '<div></div>' : '<p>Hello {{Customer.first_name}},</p><p>Thank you for choosing us.</p>') : '',
        branch: selectedBranch ? Number(selectedBranch) : null,
        is_active: true,
      };

      const res = await createCommunicationTemplate(payload);
      const created = res?.data ?? res;
      onCreated?.(created);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.name?.[0] || err?.message || 'Unable to create communication template.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-comm-template-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to step 1"
                className="rounded-xl p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 id="create-comm-template-title" className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {channel === 'sms' ? (
                  <MessageSquare className="text-emerald-600" size={18} />
                ) : (
                  <Mail className="text-emerald-600" size={18} />
                )}
                <span>New Email & SMS Template</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set up initial communication properties and message channel.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-slate-50/75 dark:bg-slate-800/40 px-6 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span className="text-slate-400">Step 1: Category</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">2</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold">Step 2: Communication Details</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Channel selector pill toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              Communication Channel
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => handleChannelChange('email')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  channel === 'email'
                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Mail size={14} />
                <span>Email Message</span>
              </button>
              <button
                type="button"
                onClick={() => handleChannelChange('sms')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  channel === 'sms'
                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <MessageSquare size={14} />
                <span>SMS Text Message</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Booking Confirmation Email"
              maxLength={120}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Template Key (Slug)
              </label>
              <input
                type="text"
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="booking_confirmation"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Starting Layout
              </label>
              <select
                value={startingPreset}
                onChange={(e) => setStartingPreset(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {COMMUNICATION_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {channel === 'email' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Email Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Subject line with merge tags..."
              />
            </div>
          )}

          {branches.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Branch Scope
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Branches (Global)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-sm transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create & Open Builder</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
