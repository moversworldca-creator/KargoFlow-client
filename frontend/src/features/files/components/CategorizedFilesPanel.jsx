import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, FileText, Image as ImageIcon, Loader2, UploadCloud } from 'lucide-react';

import API from '../../../services/api';

const asList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

const isImage = (row) => {
  const contentType = String(row?.content_type || '').toLowerCase();
  if (contentType.startsWith('image/')) return true;
  if (row?.is_image) return true;

  const name = String(row?.original_filename || row?.filename || row?.name || row?.file_name || '').toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|tif|tiff)$/i.test(name);
};

const prettyCount = (rows) => {
  const list = Array.isArray(rows) ? rows : [];
  const photos = list.filter(isImage).length;
  const files = list.length - photos;
  return { photos, files, total: list.length };
};

const normalizeUploadCategory = (categoryKey) => (categoryKey === 'inventory' ? 'descriptive-inventory' : categoryKey);

function DropZone({ disabled, label, hint, onFiles }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const onPick = (e) => {
    const files = Array.from(e?.target?.files || []);
    if (files.length) onFiles(files);
    if (e?.target) e.target.value = '';
  };

  return (
    <div
      className={`rounded-xl border-2 border-dashed p-4 transition ${
        disabled
          ? 'border-slate-200 bg-slate-50 text-slate-400'
          : dragOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e?.dataTransfer?.files || []);
        if (files.length) onFiles(files);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900">{label}</div>
          {hint ? <div className="mt-1 text-xs font-medium text-slate-600">{hint}</div> : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud size={16} />
          Add
        </button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={onPick} />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
        <UploadCloud size={14} />
        Drop files here
      </div>
    </div>
  );
}

function CategoryCard({ title, subtitle, icon, rows, collapsed, onToggle, onUpload, busy, onPreview }) {
  const counts = useMemo(() => prettyCount(rows), [rows]);
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
            <Icon size={18} />
          </div>
          <div className="min-w-0 text-left">
            <div className="text-sm font-extrabold text-slate-900 truncate">{title}</div>
            {subtitle ? <div className="text-xs font-bold text-slate-600 truncate">{subtitle}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            {counts.photos} Photos • {counts.files} Files
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-500 transition ${collapsed ? '' : 'rotate-180'}`} />
        </div>
      </button>

      {!collapsed ? (
        <div className="p-5 space-y-4">
          <DropZone
            disabled={busy}
            label={busy ? 'Uploading…' : 'Upload'}
            hint="Attach documents and photos. Images will show in the gallery."
            onFiles={onUpload}
          />

          {rows?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {rows.map((r) => {
                const name = r?.original_filename || `File #${r?.id}`;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onPreview(r)}
                    className="rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 transition flex items-center gap-2 text-left"
                    title="Preview"
                  >
                    {isImage(r) ? <ImageIcon size={16} className="text-slate-500" /> : <FileText size={16} className="text-slate-500" />}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">{name}</div>
                      <div className="truncate text-xs text-slate-600">{r?.content_type || 'file'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-600">No files yet.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function CategorizedFilesPanel({ targetType, targetId, extraTargets = [] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [busyCategory, setBusyCategory] = useState(null);
  const [byCategory, setByCategory] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewBusy, setPreviewBusy] = useState(false);

  const categories = useMemo(
    () => [
      { key: 'documents', title: 'Documents', subtitle: 'Estimates, contracts, insurance, IDs', icon: FileText },
      { key: 'customer', title: 'Customer', subtitle: 'Customer-provided photos / docs', icon: ImageIcon },
      { key: 'survey', title: 'Survey', subtitle: 'On-site / virtual survey media', icon: ImageIcon },
      { key: 'pre-move', title: 'Pre-move', subtitle: 'Before move condition photos', icon: ImageIcon },
      { key: 'inventory', title: 'Inventory Photos', subtitle: 'Customer inventory portal uploads', icon: ImageIcon },
      { key: 'post-move', title: 'Post-move', subtitle: 'After move completion photos', icon: ImageIcon },
      { key: 'claims', title: 'Claims', subtitle: 'Damage / loss documentation', icon: ImageIcon },
    ],
    []
  );

  const load = useCallback(async () => {
    const targets = [
      targetType && targetId ? { targetType, targetId } : null,
      ...(Array.isArray(extraTargets) ? extraTargets : []),
    ].filter((item) => item && item.targetType && item.targetId);

    if (!targets.length) return;
    setLoading(true);
    setError('');
    try {
      const responses = await Promise.all(
        targets.map((target) =>
          API.files.list({
            target_type: target.targetType,
            target_id: String(target.targetId),
          })
        )
      );
      const rows = responses.flatMap((res) => asList(res));
      const map = {};
      const seen = new Set();
      for (const row of rows) {
        if (!row?.id || seen.has(String(row.id))) continue;
        seen.add(String(row.id));
        const rawKey = String(row?.category || '').trim().toLowerCase() || 'documents';
        const key =
          rawKey === 'descriptive-inventory' || rawKey === 'inventory-photos'
            ? 'inventory'
            : rawKey;
        if (!map[key]) map[key] = [];
        map[key].push(row);
      }
      setByCategory(map);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load files.');
    } finally {
      setLoading(false);
    }
  }, [extraTargets, targetId, targetType]);

  useEffect(() => {
    load();
  }, [load]);

  const uploadToCategory = async (categoryKey, files) => {
    setBusyCategory(categoryKey);
    setError('');
    try {
      const uploadCategory = normalizeUploadCategory(categoryKey);
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        await API.files.upload({ target_type: targetType, target_id: String(targetId), category: uploadCategory, file });
      }
      await load();
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Upload failed.');
    } finally {
      setBusyCategory(null);
    }
  };

  const openFile = async (fileRow) => {
    if (!fileRow?.id) return;
    setPreviewBusy(true);
    try {
      const blob = await API.files.download(fileRow.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setPreviewBusy(false);
    }
  };

  const loadPreview = async (fileRow) => {
    if (!fileRow?.id) return;
    setPreviewBusy(true);
    try {
      const blob = await API.files.download(fileRow.id);
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } finally {
      setPreviewBusy(false);
    }
  };

  useEffect(() => {
    if (previewFile) loadPreview(previewFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewFile?.id]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const totals = useMemo(() => {
    const all = Object.values(byCategory).flat();
    return prettyCount(all);
  }, [byCategory]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-body">Files & Photos</div>
          <div className="text-lg font-heading font-extrabold text-heading">
            {totals.photos} Photos • {totals.files} Files
          </div>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-subtle bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-heading hover:border-primary/40 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Refresh
        </button>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div> : null}

      <div className="space-y-4">
        {categories.map((c) => (
          <CategoryCard
            key={c.key}
            title={c.title}
            subtitle={c.subtitle}
            icon={c.icon}
            rows={byCategory[c.key] || []}
            collapsed={Boolean(collapsed[c.key])}
            onToggle={() => setCollapsed((p) => ({ ...p, [c.key]: !p[c.key] }))}
            onUpload={(files) => uploadToCategory(c.key, files)}
            busy={busyCategory === c.key}
            onPreview={(f) => setPreviewFile(f)}
          />
        ))}
      </div>

      {previewFile ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setPreviewFile(null);
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl('');
            }}
            aria-label="Close preview"
          />
          <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-slate-900">
                  {previewFile?.original_filename || `File #${previewFile?.id}`}
                </div>
                <div className="truncate text-xs font-bold text-slate-600">{previewFile?.content_type || 'file'}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openFile(previewFile)}
                  disabled={previewBusy}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-5 bg-slate-50">
              {isImage(previewFile) ? (
                <div className="w-full flex justify-center">
                  <img
                    src={previewUrl || ''}
                    alt={previewFile?.original_filename || 'preview'}
                    className="max-h-[75vh] rounded-xl border border-slate-200 bg-white object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  Preview not available for this file type. Click <span className="font-extrabold">Open</span> to download/view.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
