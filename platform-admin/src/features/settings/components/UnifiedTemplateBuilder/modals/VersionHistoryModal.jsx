import React, { useState, useEffect } from "react";
import { History, X, RotateCcw, Plus, Clock, Check, Bookmark, Loader2 } from "lucide-react";
import { getBuilderTemplateRevisions, restoreBuilderTemplateRevision, discardBuilderTemplateDraft, getApiErrorMessage } from "../../../../../services/api";

export default function VersionHistoryModal({
  isOpen,
  snapshots = [],
  templateId = null,
  onClose,
  onCreateSnapshot,
  onRestoreSnapshot,
  onRestoreServerDraft,
  canRestore = true,
}) {
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);
  const [remoteRevisions, setRemoteRevisions] = useState([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false);

  useEffect(() => {
    if (!isOpen || !templateId) return;
    let active = true;
    setRemoteRevisions([]);
    setError("");
    setIsLoadingRevisions(true);
    getBuilderTemplateRevisions(templateId)
      .then((res) => {
        if (!active) return;
        const data = res?.data ?? res;
        if (Array.isArray(data)) {
          setRemoteRevisions(data);
        } else if (data && Array.isArray(data.results)) {
          setRemoteRevisions(data.results);
        }
      })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); })
      .finally(() => {
        if (active) setIsLoadingRevisions(false);
      });
    return () => { active = false; };
  }, [isOpen, templateId]);

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e.preventDefault();
    if (!snapshotName.trim()) return;
    onCreateSnapshot(snapshotName.trim());
    setSnapshotName("");
  };

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[75vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Version History & Snapshots</h3>
              <p className="text-[11px] text-slate-500">
                Track revisions, create labeled restore points, and roll back changes safely.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Create Snapshot Bar */}
        <form onSubmit={handleCreate} className="p-4 bg-indigo-50/40 border-b border-indigo-100 flex gap-2">
          <div className="relative flex-1">
            <Bookmark size={15} className="absolute left-3 top-2.5 text-indigo-500" />
            <input
              type="text"
              placeholder="Name this snapshot (e.g. Before rate change)..."
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={!snapshotName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition"
          >
            <Plus size={14} />
            <span>Create Snapshot</span>
          </button>
        </form>

        {error && <p role="alert" className="p-4 text-red-700">{error}</p>}
        {/* Snapshot List & Detail View */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingRevisions && (
            <div className="flex items-center justify-center py-4 text-xs text-slate-500 gap-2">
              <Loader2 size={16} className="animate-spin text-indigo-600" />
              <span>Checking revisions from server...</span>
            </div>
          )}
          {snapshots.length === 0 && remoteRevisions.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <Clock size={28} className="text-slate-300 mb-2" />
              <p className="text-xs font-medium">No snapshots or past revisions found.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Create a snapshot above or publish a revision to build revision history.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Remote Published Revisions */}
              {remoteRevisions.map((rev) => (
                <div
                  key={`rev-${rev.id || rev.revision_number}`}
                  className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 flex items-center justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                      <Bookmark size={15} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {rev.name || `Revision v${rev.revision_number || rev.version || rev.id}`}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{rev.created_at ? new Date(rev.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Published"}</span>
                        <span>&bull;</span>
                        <span className="font-medium text-indigo-700">{rev.state || "published"}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canRestore || restoring || !['published', 'retired'].includes(rev.state)}
                    onClick={async () => {
                      if (!window.confirm("Replace the current draft with this revision? Current draft changes will be discarded.")) return;
                      setRestoring(true);
                      setError("");
                      try {
                        try { await discardBuilderTemplateDraft(templateId); }
                        catch (err) { if (err?.response?.status !== 404) throw err; }
                        const { data } = await restoreBuilderTemplateRevision(templateId, rev.id);
                        await onRestoreServerDraft?.(data);
                        onClose();
                      } catch (err) { setError(getApiErrorMessage(err)); }
                      finally { setRestoring(false); }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-xs transition"
                  >
                    <RotateCcw size={13} />
                    <span>Restore</span>
                  </button>
                </div>
              ))}

              {/* Local Snapshots */}
              {snapshots.map((snap) => {
                const isSelected = selectedSnapshotId === snap.id;
                const dateStr = snap.timestamp
                  ? new Date(snap.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "short",
                      day: "numeric",
                    })
                  : "Recent";

                return (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnapshotId(snap.id)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/20 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                        <Clock size={15} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {snap.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{dateStr}</span>
                          <span>&bull;</span>
                          <span>{snap.doc?.items?.length || 0} component(s)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreSnapshot(snap.doc);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
                        title="Rollback workspace to this snapshot"
                      >
                        <RotateCcw size={13} />
                        <span>Restore</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
