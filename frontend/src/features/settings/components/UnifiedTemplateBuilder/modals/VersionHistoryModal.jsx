import React, { useState } from "react";
import { History, X, RotateCcw, Plus, Clock, Check, Bookmark } from "lucide-react";

export default function VersionHistoryModal({
  isOpen,
  snapshots = [],
  onClose,
  onCreateSnapshot,
  onRestoreSnapshot,
}) {
  const [snapshotName, setSnapshotName] = useState("");
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);

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

        {/* Snapshot List & Detail View */}
        <div className="flex-1 overflow-y-auto p-6">
          {snapshots.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <Clock size={28} className="text-slate-300 mb-2" />
              <p className="text-xs font-medium">No snapshots saved yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Create a snapshot above or one will be automatically created when publishing.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
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
