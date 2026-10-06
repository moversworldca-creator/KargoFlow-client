import React from 'react';
import { X } from 'lucide-react';

const ReportEmailModal = ({ open, title, email, setEmail, format, setFormat, onClose, onSend, sending, formats }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-bold text-heading">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-content-sec hover:bg-slate-100" aria-label="Close email modal">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-content-main">Send to email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-content-main">Export format</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-primary bg-white"
            >
              {formats.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-content-main hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={onSend} disabled={sending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
            {sending ? 'Sending...' : 'Send Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportEmailModal;
