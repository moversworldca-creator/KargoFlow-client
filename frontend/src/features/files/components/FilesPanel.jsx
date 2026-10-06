import React, { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Image as ImageIcon, Link2, Loader2, Trash2, Upload } from 'lucide-react';

import API from '../../../services/api';

const asList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

const formatBytes = (bytes) => {
  const value = Number(bytes || 0);
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const num = value / Math.pow(1024, idx);
  return `${num.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const isImage = (row) => {
  const contentType = String(row?.content_type || '').toLowerCase();
  if (contentType.startsWith('image/')) return true;
  if (row?.is_image) return true;

  const name = String(row?.original_filename || row?.filename || row?.name || row?.file_name || '').toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|tif|tiff)$/i.test(name);
};

const getPhotoUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  try {
    const origin = new URL(apiUrl).origin;
    return `${origin}${url}`;
  } catch (e) {
    return `http://localhost:8000${url}`;
  }
};

export default function FilesPanel({ targetType, targetId }) {
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('gallery'); // gallery | list
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [shareBusyId, setShareBusyId] = useState(null);
  const [shareLinksByAsset, setShareLinksByAsset] = useState({});
  const [expiryDays, setExpiryDays] = useState(7);

  const imageItems = useMemo(() => items.filter(isImage), [items]);
  const nonImageItems = useMemo(() => items.filter((x) => !isImage(x)), [items]);

  const load = async () => {
    if (!targetType || !targetId) return;
    setLoading(true);
    setError('');
    try {
      const res = await API.files.list({ target_type: targetType, target_id: String(targetId) });
      setItems(asList(res));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId]);

  const onPickFiles = async (evt) => {
    const files = Array.from(evt?.target?.files || []);
    if (!files.length) return;
    setError('');
    setLoading(true);
    try {
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        await API.files.upload({ target_type: targetType, target_id: String(targetId), file });
      }
      await load();
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Upload failed.');
    } finally {
      setLoading(false);
      if (evt?.target) evt.target.value = '';
    }
  };

  const downloadUrl = (id) => `/api/files/${id}/download/`;

  const remove = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await API.files.remove(id);
      setItems((prev) => prev.filter((x) => x?.id !== id));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  const loadShareLinks = async (assetId) => {
    try {
      const res = await API.files.listShareLinks(assetId);
      setShareLinksByAsset((p) => ({ ...p, [assetId]: asList(res) }));
    } catch {
      // ignore
    }
  };

  const createShare = async (assetId) => {
    setShareBusyId(assetId);
    setError('');
    try {
      const expiresAt = new Date(Date.now() + Math.max(1, Number(expiryDays || 7)) * 86400000).toISOString();
      const link = await API.files.createShareLink(assetId, { expires_at: expiresAt });
      setShareLinksByAsset((p) => ({ ...p, [assetId]: [link, ...(p[assetId] || [])] }));
      if (link?.public_url) {
        await navigator.clipboard.writeText(link.public_url);
      }
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.detail || Object.values(data || {}).flat().join(' ') || 'Unable to create share link.');
    } finally {
      setShareBusyId(null);
    }
  };

  const revokeShare = async (linkId, assetId) => {
    setShareBusyId(assetId);
    setError('');
    try {
      await API.files.revokeShareLink(linkId);
      setShareLinksByAsset((p) => ({ ...p, [assetId]: (p[assetId] || []).filter((x) => x?.id !== linkId) }));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to revoke link.');
    } finally {
      setShareBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone Panel */}
      <div className="p-6 rounded-[2rem] border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800">Upload Files & Photos</h3>
          <p className="text-xs text-slate-500 font-medium">Attach photos, documents, or inventory records to this opportunity.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <span>Share Expiry</span>
            <input
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              type="number"
              min="1"
              className="w-12 text-center font-extrabold text-slate-800 bg-slate-100 border border-slate-200 rounded-md py-0.5 outline-none focus:border-brand"
            />
            <span className="text-slate-400">days</span>
          </div>

          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest text-white hover:bg-brand-dark transition-all active:scale-[0.98] shadow-sm">
            <Upload className="h-4 w-4" />
            Choose Files
            <input type="file" className="hidden" multiple onChange={onPickFiles} />
          </label>
        </div>
      </div>

      {/* Toolbar Options */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            type="button"
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'gallery' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setMode('gallery')}
          >
            Gallery
          </button>
          <button
            type="button"
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'list' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setMode('list')}
          >
            List View
          </button>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
          onClick={load}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div> : null}

      {loading && (
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-brand" /> Syncing files…
        </div>
      )}

      {!loading && mode === 'gallery' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Photos Grid */}
          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Photos</div>
            {imageItems.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {imageItems.map((photo) => {
                  const id = photo.id;
                  const filename = photo.original_filename || `Photo #${id}`;
                  const previewUrl = getPhotoUrl(photo.file);
                  const isBusy = busyId === id;
                  const shareBusy = shareBusyId === id;
                  const links = shareLinksByAsset[id] || null;
                  const showLinks = Array.isArray(links) && links.length;

                  return (
                    <div 
                      key={id} 
                      className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 aspect-square flex flex-col justify-end"
                    >
                      <img 
                        src={previewUrl} 
                        alt={filename} 
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-350 group-hover:scale-105" 
                      />
                      
                      {/* Black gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 text-white">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-bold bg-white/20 backdrop-blur px-2 py-0.5 rounded-full truncate max-w-[80px]">
                            {formatBytes(photo.size)}
                          </span>
                          <button
                            type="button"
                            onClick={() => remove(id)}
                            disabled={isBusy}
                            className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white rounded-lg transition-all"
                            title="Delete photo"
                          >
                            {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] font-black truncate" title={filename}>{filename}</p>
                          {photo.notes && (
                            <p className="text-[9px] text-slate-300 line-clamp-1 italic" title={photo.notes}>"{photo.notes}"</p>
                          )}
                          <div className="flex gap-1.5 mt-2">
                            <a
                              href={downloadUrl(id)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 text-center py-1 bg-white/20 hover:bg-white/35 rounded-lg text-[9px] font-bold transition-all"
                            >
                              Download
                            </a>
                            <button
                              type="button"
                              onClick={() => createShare(id)}
                              disabled={shareBusy}
                              className="flex-1 py-1 bg-brand hover:bg-brand-dark rounded-lg text-[9px] font-bold transition-all text-white"
                            >
                              {shareBusy ? 'Sharing…' : 'Share'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Default overlay showing tiny badge of filename */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent group-hover:opacity-0 transition-opacity pointer-events-none">
                        <p className="text-[10px] font-bold text-white truncate">{filename}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs font-semibold text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100 p-6 text-center">
                No photos uploaded yet.
              </div>
            )}
          </div>

          {/* Other Files Grid */}
          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Other Files</div>
            {nonImageItems.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {nonImageItems.map((file) => {
                  const id = file.id;
                  const filename = file.original_filename || `File #${id}`;
                  const ext = filename.split('.').pop().toUpperCase();
                  const isBusy = busyId === id;
                  const shareBusy = shareBusyId === id;
                  const links = shareLinksByAsset[id] || null;
                  const showLinks = Array.isArray(links) && links.length;

                  return (
                    <div 
                      key={id} 
                      className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-300 aspect-square flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-600 font-extrabold text-[10px] tracking-wider border border-blue-100">
                          {ext}
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(id)}
                          disabled={isBusy}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                          title="Delete file"
                        >
                          {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800 line-clamp-2" title={filename}>{filename}</p>
                        <p className="text-[10px] font-medium text-slate-400">{formatBytes(file.size)}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <a
                            href={downloadUrl(id)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 text-center py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-bold transition-all text-slate-700"
                          >
                            Open
                          </a>
                          <button
                            type="button"
                            onClick={() => createShare(id)}
                            disabled={shareBusy}
                            className="flex-1 py-1.5 bg-brand hover:bg-brand-dark rounded-xl text-[10px] font-bold transition-all text-white"
                          >
                            {shareBusy ? 'Sharing…' : 'Share'}
                          </button>
                        </div>
                        {showLinks && (
                          <button
                            type="button"
                            className="w-full text-center text-[9px] font-bold text-slate-500 hover:text-slate-800"
                            onClick={() => loadShareLinks(id)}
                          >
                            View links ({links.length})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs font-semibold text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100 p-6 text-center">
                No additional document files.
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && mode === 'list' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100 shadow-sm animate-in fade-in duration-300">
          {items.length ? (
            items.map((file) => {
              const id = file.id;
              const filename = file.original_filename || `File #${id}`;
              const isBusy = busyId === id;
              const shareBusy = shareBusyId === id;
              const links = shareLinksByAsset[id] || null;
              const showLinks = Array.isArray(links) && links.length;

              return (
                <div key={id} className="p-4 hover:bg-slate-50/55 transition-colors duration-150 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        {isImage(file) ? <ImageIcon size={20} /> : <Link2 size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate" title={filename}>{filename}</p>
                        <p className="text-xs text-slate-500">
                          {formatBytes(file.size)} • {file.content_type || 'Unknown Type'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={downloadUrl(id)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-all"
                        title="Download file"
                      >
                        <ExternalLink size={16} />
                      </a>
                      <button
                        type="button"
                        onClick={() => createShare(id)}
                        disabled={shareBusy}
                        className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-all disabled:opacity-50"
                        title="Create expiring share link"
                      >
                        {shareBusy ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(id)}
                        disabled={isBusy}
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                        title="Delete file"
                      >
                        {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                      <button
                        type="button"
                        className="ml-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                        onClick={() => loadShareLinks(id)}
                      >
                        Links
                      </button>
                    </div>
                  </div>

                  {showLinks && (
                    <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Share Links</div>
                      <div className="space-y-1.5">
                        {links.map((l) => (
                          <div key={l.id} className="flex items-center justify-between gap-3 text-xs">
                            <a className="truncate text-brand hover:underline font-semibold" href={l.public_url} target="_blank" rel="noreferrer">
                              {l.public_url}
                            </a>
                            <button
                              type="button"
                              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-all"
                              onClick={() => revokeShare(l.id, id)}
                            >
                              Revoke
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-xs font-semibold text-slate-400 bg-slate-50/50 p-6 text-center">
              No files uploaded yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
