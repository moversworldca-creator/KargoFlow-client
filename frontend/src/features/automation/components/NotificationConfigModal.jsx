import React, { useEffect, useState } from 'react';
import { X, Mail, MessageSquare, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { getNotificationTemplates, updateBranchNotification } from '../../../services/api';

export default function NotificationConfigModal({
  open,
  onClose,
  notification,
  branchId,
  branchName,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [emailTemplates, setEmailTemplates] = useState([]);
  const [smsTemplates, setSmsTemplates] = useState([]);

  const [enabled, setEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailTemplateId, setEmailTemplateId] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsTemplateId, setSmsTemplateId] = useState('');

  useEffect(() => {
    if (!open || !notification) return;

    setError(null);
    setEnabled(Boolean(notification.enabled));

    const emailConfig = notification.channels?.email || {};
    setEmailEnabled(Boolean(emailConfig.enabled));
    setEmailTemplateId(emailConfig.template_id ? String(emailConfig.template_id) : '');

    const smsConfig = notification.channels?.sms || {};
    setSmsEnabled(Boolean(smsConfig.enabled));
    setSmsTemplateId(smsConfig.template_id ? String(smsConfig.template_id) : '');

    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const [emailRes, smsRes] = await Promise.all([
          getNotificationTemplates({ channel: 'email' }),
          getNotificationTemplates({ channel: 'sms' }),
        ]);
        const filterActive = (list) =>
          (list || []).filter((t) => {
            if (t.state && t.state !== 'active') return false;
            if (t.is_active === false) return false;
            return true;
          });

        setEmailTemplates(filterActive(emailRes?.results || emailRes || []));
        setSmsTemplates(filterActive(smsRes?.results || smsRes || []));
      } catch (err) {
        console.error('Failed to load notification templates:', err);
        setError('Failed to load notification templates. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [open, notification]);

  if (!open || !notification) return null;

  const validate = () => {
    if (enabled) {
      if (!emailEnabled && !smsEnabled) {
        return 'When notification is enabled, at least one channel (Email or SMS) must be enabled.';
      }
      if (emailEnabled) {
        if (!emailTemplateId) return 'Please select a template for the Email channel before saving.';
        if (emailTemplates.length > 0 && !emailTemplates.some((t) => String(t.id) === String(emailTemplateId))) {
          return 'The selected Email template is inactive or unavailable. Please choose an active template.';
        }
      }
      if (smsEnabled) {
        if (!smsTemplateId) return 'Please select a template for the SMS channel before saving.';
        if (smsTemplates.length > 0 && !smsTemplates.some((t) => String(t.id) === String(smsTemplateId))) {
          return 'The selected SMS template is inactive or unavailable. Please choose an active template.';
        }
      }
    } else {
      if (emailEnabled) {
        if (!emailTemplateId) return 'Please select a template for the Email channel.';
        if (emailTemplates.length > 0 && !emailTemplates.some((t) => String(t.id) === String(emailTemplateId))) {
          return 'The selected Email template is inactive or unavailable. Please choose an active template.';
        }
      }
      if (smsEnabled) {
        if (!smsTemplateId) return 'Please select a template for the SMS channel.';
        if (smsTemplates.length > 0 && !smsTemplates.some((t) => String(t.id) === String(smsTemplateId))) {
          return 'The selected SMS template is inactive or unavailable. Please choose an active template.';
        }
      }
    }
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      enabled,
      channels: {
        email: {
          enabled: emailEnabled,
          template_id: emailTemplateId ? Number(emailTemplateId) : null,
        },
        sms: {
          enabled: smsEnabled,
          template_id: smsTemplateId ? Number(smsTemplateId) : null,
        },
      },
    };

    try {
      const updated = await updateBranchNotification(branchId, notification.key, payload);
      onSaved?.(updated);
      onClose();
    } catch (err) {
      console.error('Failed to update branch notification:', err);
      const data = err?.response?.data;
      let detail = 'Failed to update notification';
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
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl border border-brand-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-brand-border flex items-center justify-between shrink-0 bg-slate-50/70">
          <div>
            <h3 className="text-lg font-bold text-heading">Configure Notification</h3>
            <p className="text-xs text-muted mt-0.5">
              Branch: <span className="font-semibold text-body">{branchName || `#${branchId}`}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          {/* Info Card */}
          <div className="p-4 bg-subtle rounded-xl border border-brand-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-heading">{notification.name}</span>
              <span className="text-[11px] font-mono uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                Target: {notification.target}
              </span>
            </div>
            {notification.description && (
              <p className="text-xs text-muted mt-1 leading-relaxed">{notification.description}</p>
            )}
            {!notification.trigger_ready && (
              <div className="mt-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-2 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-amber-600" />
                <span>
                  This notification trigger is not ready yet in the current version. Configuring it will save your preferences for when the event is emitted.
                </span>
              </div>
            )}
          </div>

          {/* Master Switch */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-brand-border">
            <div>
              <div className="text-sm font-bold text-heading">Notification Enabled</div>
              <div className="text-xs text-muted mt-0.5">
                Enable or disable automated sends for this branch
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Channels Configuration */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">
              Delivery Channels
            </div>

            {/* Email Channel */}
            <div className={`p-4 rounded-xl border transition-all ${emailEnabled ? 'border-primary/40 bg-primary/5' : 'border-brand-border bg-white'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${emailEnabled ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-heading">Email Channel</div>
                    <div className="text-xs text-muted">Send transactional email via transactional provider</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Email Notification Template {emailEnabled && <span className="text-rose-500">*</span>}
                </label>
                <select
                  value={emailTemplateId}
                  onChange={(e) => setEmailTemplateId(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-brand-border outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-100"
                >
                  <option value="">Select an Email Notification Template...</option>
                  {emailTemplateId && !emailTemplates.some((t) => String(t.id) === String(emailTemplateId)) && (
                    <option value={emailTemplateId} disabled>
                      {notification.channels?.email?.template_name || `Template #${emailTemplateId}`} (Inactive / Unavailable — Please change)
                    </option>
                  )}
                  {emailTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.is_active === false ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
                {emailTemplates.length === 0 && !loading && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No active Notification templates found for Email channel.
                  </p>
                )}
              </div>
            </div>

            {/* SMS Channel */}
            <div className={`p-4 rounded-xl border transition-all ${smsEnabled ? 'border-primary/40 bg-primary/5' : 'border-brand-border bg-white'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${smsEnabled ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-heading">SMS Channel</div>
                    <div className="text-xs text-muted">Send automated SMS via branch business number</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsEnabled}
                    onChange={(e) => setSmsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  SMS Notification Template {smsEnabled && <span className="text-rose-500">*</span>}
                </label>
                <select
                  value={smsTemplateId}
                  onChange={(e) => setSmsTemplateId(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-brand-border outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-100"
                >
                  <option value="">Select an SMS Notification Template...</option>
                  {smsTemplateId && !smsTemplates.some((t) => String(t.id) === String(smsTemplateId)) && (
                    <option value={smsTemplateId} disabled>
                      {notification.channels?.sms?.template_name || `Template #${smsTemplateId}`} (Inactive / Unavailable — Please change)
                    </option>
                  )}
                  {smsTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.is_active === false ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
                {smsTemplates.length === 0 && !loading && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No active Notification templates found for SMS channel.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-brand-border">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#003d2f] transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
