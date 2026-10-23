import React, { useState } from 'react';
import api from '../../../services/axios';

export default function MessageAttachments({ messageId, attachments = [] }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  if (!messageId || !attachments.length) return null;

  const download = async (attachment) => {
    setError('');
    setBusy(attachment.id);
    try {
      const response = await api.get(
        `/tenant/communications/messages/${messageId}/attachments/${attachment.id}/`,
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(response.data ?? response);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download attachment. Please retry.');
    } finally {
      setBusy(null);
    }
  };

  return <div className="border-t border-ink-100 px-4 py-3">
    <div className="text-xs font-bold text-ink-600">Attachments</div>
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map(attachment => <button key={attachment.id} type="button"
        disabled={busy !== null} onClick={() => download(attachment)}
        className="rounded-lg border border-ink-100 px-3 py-2 text-xs text-brand-dark">
        {busy === attachment.id ? 'Downloading…' : attachment.filename}
        {Number(attachment.size_bytes) > 0 ? ` (${Math.ceil(attachment.size_bytes / 1024)} KB)` : ''}
      </button>)}
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </div>;
}
