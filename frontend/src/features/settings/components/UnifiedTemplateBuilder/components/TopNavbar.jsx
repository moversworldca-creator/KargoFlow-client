import React from "react";
import {
  Undo2,
  Redo2,
  Save,
  ArrowLeft,
  Eye,
  Printer,
  FileDown,
  History,
  Menu,
  FileClock,
  Code,
} from "lucide-react";
import fullLogo from "../../../../../assets/full_logo.png";


export function Logo({ compact = false }) {
  return (
    <div className="flex items-center mr-1">
      <img
        src={fullLogo}
        alt="KargoFlow"
        className="h-8 w-auto max-w-[140px] object-contain"
      />
    </div>
  );
}

export default function TopNavbar({
  title,
  onTitleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDirty,
  isSaving,
  onSave,
  onSaveDraft = () => {},
  onBack,
  onOpenCode = () => {},
  onOpenPreview,
  mode,
  modeConfig,
  onOpenTransfer = () => {},
  onOpenHistory = () => {},
  onPrint = () => {},
  isSidebarOpen = true,
  onToggleSidebar = () => {},
}) {
  return (
    <header className="h-14 border-b border-slate-200 bg-white px-3 flex items-center justify-between shadow-xs select-none">
      {/* Left: Sidebar Toggle, Logo, Back & Title */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition"
          title="Toggle toolkit sidebar"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        <Logo compact />

        <div className="h-5 w-px bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition"
          title="Back to Templates"
        >
          <ArrowLeft size={17} />
        </button>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-sm font-semibold text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 max-w-[200px] truncate"
            title="Edit Template Title"
          />
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {modeConfig?.label || mode}
          </span>
          {isDirty && (
            <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
          )}
        </div>
      </div>

      {/* Middle: Undo / Redo */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-100 rounded-md p-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>

      {/* Right: Code, Transfer, History, Print, Preview & Split Save */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenCode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
          title="Edit HTML Source Code"
        >
          <Code size={15} />
          <span className="hidden sm:inline">HTML Code</span>
        </button>

        <button
          type="button"
          onClick={onOpenPreview}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
          title="Customer Live Preview"
        >
          <Eye size={14} />
          <span>Preview</span>
        </button>

        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition disabled:opacity-50"
          title="Save Draft"
          aria-label="Save Draft"
        >
          <FileClock size={15} />
          <span>Draft</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition disabled:opacity-50"
          title="Save Template"
        >
          <Save size={15} />
          <span>{isSaving ? "Saving..." : "Save"}</span>
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={onOpenTransfer}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
          title="Import or Export Template Data (JSON)"
        >
          <FileDown size={14} />
          <span className="hidden lg:inline">Import / Export</span>
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
          title="Version History & Snapshots"
        >
          <History size={14} />
          <span className="hidden lg:inline">History</span>
        </button>

        <button
          type="button"
          onClick={onPrint}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
          title="Direct Print or Save as PDF"
        >
          <Printer size={14} />
          <span className="hidden sm:inline">Print</span>
        </button>
      </div>
    </header>
  );
}
