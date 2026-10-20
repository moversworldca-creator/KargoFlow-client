import React from "react";
import { FileText, Copy, X, Upload, Download, CheckCircle2 } from "lucide-react";

export default function TransferModal({
  isOpen,
  onClose,
  onExport,
  onImportClick,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Import / Export Template</h3>
              <p className="text-[11px] text-slate-500">Migrate and back up template structures via standard JSON</p>
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

        {/* Transfer Options */}
        <div className="p-6 space-y-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onExport();
            }}
            className="w-full flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 text-left transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Download size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                Export Template (JSON)
              </div>
              <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Download the active estimate or document template schema, components, custom tables, and styles as a portable JSON file.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onImportClick();
            }}
            className="w-full flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 text-left transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Upload size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                Import Template (JSON)
              </div>
              <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Upload a previously exported template file to replace and edit in this builder with full schema validation.
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
