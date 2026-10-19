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
  FilePen,
  Code2,
  Sliders,
  MoreVertical,
  CheckCircle2,
  RotateCcw,
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
  onDiscardDraft = null,
  onPublish = () => {},
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
  isPanelOpen = false,
  onTogglePanel = () => {},
}) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = React.useState(false);

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-2 sm:px-3 flex items-center justify-between gap-2 shadow-xs select-none">
      {/* Left: Sidebar Toggle, Logo, Back & Title */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 transition shrink-0"
          title="Toggle toolkit sidebar"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="hidden sm:flex items-center">
          <Logo compact />
          <div className="h-5 w-px bg-slate-200 mx-1" />
        </div>

        <button
          type="button"
          onClick={onBack}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 transition shrink-0"
          title="Back to Templates"
          aria-label="Back to Templates"
        >
          <ArrowLeft size={17} />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter document title..."
            className="text-xs sm:text-sm font-semibold text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1 max-w-[110px] sm:max-w-[160px] md:max-w-[200px] truncate"
            title="Edit Template Title"
          />
          <span className="hidden md:inline text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
            {modeConfig?.label || mode}
          </span>
          {isDirty && (
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />
          )}
        </div>
      </div>

      {/* Middle: Undo / Redo */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="flex items-center bg-slate-100 rounded-md p-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 size={15} />
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {mode !== "sms" && (
          <button
            type="button"
            onClick={onOpenCode}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            title="Edit HTML Source Code"
            aria-label="Edit HTML Code"
          >
            <Code2 size={15} />
            <span>HTML Code</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenPreview}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
          title="Customer Live Preview"
          aria-label="Preview Template"
        >
          <Eye size={14} />
          <span className="hidden sm:inline">Preview</span>
        </button>

        {onDiscardDraft && (
          <button
            type="button"
            onClick={onDiscardDraft}
            disabled={isSaving}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-md transition disabled:opacity-50"
            title="Discard uncommitted draft and revert to published version"
            aria-label="Discard Draft"
          >
            <RotateCcw size={14} />
            <span className="hidden xl:inline">Revert</span>
          </button>
        )}

        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition disabled:opacity-50"
          title="Save Draft"
          aria-label="Save Draft"
        >
          <FilePen size={15} />
          <span>Draft</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition disabled:opacity-50"
          title="Save Template"
          aria-label="Save Template"
        >
          <Save size={15} />
          <span>{isSaving ? "..." : "Save"}</span>
        </button>

       

        <div className="hidden lg:block h-5 w-px bg-slate-200 mx-0.5" />

        <button
          type="button"
          onClick={onOpenTransfer}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
          title="Import or Export Template Data (JSON)"
          aria-label="Import or Export Template"
        >
          <FileDown size={14} />
          <span className="hidden xl:inline">Import / Export</span>
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
          title="Version History & Snapshots"
          aria-label="Version History & Snapshots"
        >
          <History size={14} />
          <span className="hidden xl:inline">History</span>
        </button>

        {mode !== "sms" && (
          <button
            type="button"
            onClick={onPrint}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            title="Direct Print or Save as PDF"
          >
            <Printer size={14} />
            <span className="hidden md:inline">Print</span>
          </button>
        )}

        {/* Responsive More Actions Dropdown (Visible on viewports < 1024px) */}
        <div className="relative lg:hidden">
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen((prev) => !prev)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 transition"
            title="More actions"
            aria-label="More actions"
          >
            <MoreVertical size={16} />
          </button>

          {isMoreMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMoreMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                {mode !== "sms" && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onOpenCode();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-slate-100 text-slate-700 text-left"
                  >
                    <Code2 size={14} className="text-slate-500" />
                    <span>HTML Code</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onSaveDraft();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-slate-100 text-slate-700 text-left md:hidden"
                >
                  <FilePen size={14} className="text-slate-500" />
                  <span>Save Draft</span>
                </button>
                {onDiscardDraft && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onDiscardDraft();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-rose-50 text-rose-600 text-left lg:hidden"
                  >
                    <RotateCcw size={14} className="text-rose-500" />
                    <span>Revert to Published</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenTransfer();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-slate-100 text-slate-700 text-left"
                >
                  <FileDown size={14} className="text-slate-500" />
                  <span>Import / Export</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenHistory();
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-slate-100 text-slate-700 text-left"
                >
                  <History size={14} className="text-slate-500" />
                  <span>Version History</span>
                </button>
                {mode !== "sms" && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onPrint();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 hover:bg-slate-100 text-slate-700 text-left sm:hidden"
                  >
                    <Printer size={14} className="text-slate-500" />
                    <span>Print Document</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Inspector Panel Toggle Button for screens < 1280px */}
        <button
          type="button"
          onClick={onTogglePanel}
          className={`xl:hidden h-8 w-8 inline-flex items-center justify-center rounded-md transition ${
            isPanelOpen ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-600"
          }`}
          title="Toggle properties panel"
          aria-label="Toggle inspector panel"
        >
          <Sliders size={17} />
        </button>
      </div>
    </header>
  );
}
