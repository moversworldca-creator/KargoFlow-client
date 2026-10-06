import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Loader2, Save, Trash2, Upload } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import RichTextEditor from '../../../shared/ui/RichTextEditor';
import API from '../../../services/api';

const BrandingSettings = ({ branchId}) => {
  const [branches, setBranches] = useState([]);
  const [selectedId, setSelectedId] = useState(branchId);
  const [draft, setDraft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (branchId) {
      setSelectedId(branchId);
    }
  }, [branchId]);

  const selectedBranch = useMemo(
    () => branches.find((b) => String(b.id) === String(selectedId)) || null,
    [branches, selectedId]
  );

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const res = await API.general.getBranches();
      const rows = Array.isArray(res) ? res : res?.results || [];
      setBranches(rows);
      const firstId = rows[0]?.id || null;
      setSelectedId((prev) => branchId ?? prev ?? firstId);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load branches.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (branchId !== null) {
      setSelectedId(branchId);
    }
  }, [branchId]);

  useEffect(() => {
    if (!selectedBranch) {
      setDraft(null);
      return;
    }
    setDraft({
      id: selectedBranch.id,
      logo_url: selectedBranch.logo_url || '',
      email_footer_html: selectedBranch.email_footer_html || '',
    });
  }, [selectedBranch]);

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };

  const handleSave = async () => {
    if (!draft?.id) return;
    setIsSaving(true);
    try {
      const updated = await API.general.updateBranch(draft.id, {
        logo_url: draft.logo_url || '',
        email_footer_html: draft.email_footer_html || '',
      });
      setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      flash('success', 'Branding saved.');
    } catch (e) {
      flash('error', 'Failed to save branding.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (file) => {
    if (!draft?.id || !file) return;
    setIsUploading(true);
    try {
      const updated = await API.general.uploadBranchLogo(draft.id, file);
      setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      flash('success', 'Logo uploaded.');
    } catch (e) {
      flash('error', 'Failed to upload logo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!draft?.id) return;
    setIsUploading(true);
    try {
      const updated = await API.general.removeBranchLogo(draft.id);
      setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      flash('success', 'Logo removed.');
    } catch (e) {
      flash('error', 'Failed to remove logo.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h3 className="text-xl font-bold text-heading tracking-tight">Branding</h3>
        <p className="text-sm text-muted">Upload branch logo and configure the email footer shown on all emails.</p>
      </div>

      {message && message.text ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-bold ${
            message.type === 'success' ? 'bg-primary-tint/30 text-primary' : 'bg-[#FDE8E8]/30 text-[#791F1F]'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className={branchId ? "w-full" : "grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]"}>
        {!branchId && (
          <Card className="p-4">
            <p className="mb-3 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Branches</p>
            <div className="space-y-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${
                    String(selectedId) === String(b.id) ? 'bg-primary text-white' : 'bg-page hover:bg-subtle text-body'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[0.625rem] font-bold uppercase tracking-widest text-muted">Logo</p>
                <p className="text-sm text-body">Used in the email header for this branch.</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[#003d2f]">
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0])}
                    disabled={isUploading}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#791F1F] px-4 py-2 text-sm font-bold text-white hover:bg-[#b0000a] disabled:opacity-60"
                >
                  <Trash2 size={16} /> Remove
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-subtle bg-page p-4">
              {selectedBranch?.logo ? (
                <img
                  src={selectedBranch.logo}
                  alt={`${selectedBranch.name} logo`}
                  className="max-h-40 w-auto rounded bg-white p-2 ring-1 ring-disabled/30"
                />
              ) : selectedBranch?.logo_url ? (
                <img
                  src={selectedBranch.logo_url}
                  alt={`${selectedBranch.name} logo`}
                  className="max-h-40 w-auto rounded bg-white p-2 ring-1 ring-disabled/30"
                />
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <ImageIcon size={18} /> No logo set
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted ml-1">Logo URL (optional fallback)</label>
              <input
                value={draft?.logo_url || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://.../logo.png"
                className="w-full rounded-xl bg-subtle px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[0.625rem] font-bold uppercase tracking-widest text-muted">Email Footer</p>
                <p className="text-sm text-body">This footer is appended to every email for the branch.</p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-[#003d2f] disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>

            <RichTextEditor
              value={draft?.email_footer_html || ''}
              onChange={(html) => setDraft((prev) => ({ ...prev, email_footer_html: html }))}
              placeholder="Enter footer content (address, email, website, contact)..."
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BrandingSettings;

