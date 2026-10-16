import React, { useState } from "react";
import DocumentBlock from "./DocumentBlock";
import { analyzeSmsText } from "../core/smsCalculator";
import {
  Smartphone,
  Tablet,
  Monitor,
  Info,
  RotateCw,
  Plus,
  Copy,
  Trash2,
  ChevronDown,
  Type,
  Heading,
  Sliders,
  Table,
  Layout,
  Code,
  FileText,
  StickyNote,
  Minus,
  ZoomIn,
  ZoomOut,
  MoveHorizontal,
  Maximize2,
  RotateCcw,
} from "lucide-react";

export default function DocumentCanvas({
  items,
  pages,
  selectedItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
  mode,
  modeConfig,
  zoom = 100,
  onZoomChange = () => {},
  devicePreview = "desktop",
  onDevicePreviewChange = () => {},
  pageSize = "A4",
  orientation = "Portrait",
  smsText,
  onSmsTextChange,
  preview = false,
  resolveVariables = false,
  selection = null,
  onSelectPart = () => {},
  onOpenHtmlEditor = () => {},
  onToggleOrientation = () => {},
  onAddPage = () => {},
  onAddPageBefore = () => {},
  onAddPageAfter = () => {},
  onDuplicatePage = () => {},
  onDeletePage = () => {},
  onMovePage = () => {},
  onAddWidgetClick = () => {},
  onInsertTable = () => {},
  onInsertLayout = () => {},
  onOpenCustomFieldDialog = () => {},
  onDropInPage = () => {},
}) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const canvasType = modeConfig?.canvasType || "paged";

  // 1. SMS Simulator Canvas
  if (canvasType === "sms") {
    const analysis = analyzeSmsText(smsText);

    return (
      <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex flex-col items-center justify-center select-none">
        {/* Smartphone Shell Frame */}
        <div className="w-[340px] bg-slate-900 rounded-[40px] p-4 shadow-2xl border-4 border-slate-700">
          {/* Speaker / Camera Notch */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-4 bg-slate-800 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-slate-700" />
            </div>
          </div>

          {/* Screen */}
          <div className="bg-slate-50 rounded-[28px] p-4 h-[480px] flex flex-col justify-between overflow-hidden">
            {/* Header */}
            <div className="text-center pb-2 border-b border-slate-200">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center mx-auto text-sm">
                KF
              </div>
              <div className="text-xs font-semibold text-slate-800 mt-1">KargoFlow Dispatch</div>
              <div className="text-[10px] text-slate-400">SMS Notification</div>
            </div>

            {/* Bubble Message Display */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-xs text-xs shadow-xs leading-relaxed max-w-[85%] ml-auto break-words">
                {smsText || "Compose your SMS message below or select merge tags to insert dynamic fields..."}
              </div>
            </div>

            {/* Textarea Input Inside Screen */}
            <div className="mt-2 pt-2 border-t border-slate-200">
              <textarea
                value={smsText}
                onChange={(e) => onSmsTextChange(e.target.value)}
                placeholder="Type SMS message..."
                rows={3}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Telecom Compliance Metrics */}
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-4 shadow-xs w-[340px] text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Character Count:</span>
            <span className="font-bold text-slate-800">{analysis.charCount} characters</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Segments Billed:</span>
            <span className="font-bold text-blue-600">{analysis.segments} Segment(s)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Encoding:</span>
            <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
              {analysis.encoding}
            </span>
          </div>

          {analysis.nonGsmChars.length > 0 && (
            <div className="pt-2 border-t border-slate-100 text-[11px] text-amber-700 flex items-start gap-1.5">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                Non-GSM characters detected: {analysis.nonGsmChars.join(" ")}. Message will send via UCS-2 (max 70 chars/segment).
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Email Responsive Container Canvas
  if (canvasType === "email") {
    const isMobile = devicePreview === "mobile";
    const isTablet = devicePreview === "tablet";
    const emailWidth = isMobile ? 360 : isTablet ? 560 : 600;

    return (
      <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center">
        <div
          style={{ width: emailWidth }}
          className="bg-white min-h-[700px] shadow-lg rounded-lg border border-slate-200 p-6 space-y-4 transition-all duration-300"
        >
          {items.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
              <p className="text-xs">Email template is empty.</p>
              <p className="text-[11px] mt-1">Select widgets from the left panel to build your email.</p>
            </div>
          ) : (
            items.map((item) => (
              <DocumentBlock
                key={item.id}
                item={item}
                isSelected={selectedItemId === item.id}
                onSelect={() => onSelectItem(item.id)}
                onUpdate={(patch) => onUpdateItem(patch)}
                onDelete={() => onDeleteItem(item.id)}
                onDuplicate={() => onDuplicateItem(item)}
                preview={preview}
                resolveVariables={resolveVariables}
                selection={selection}
                onSelectPart={onSelectPart}
                onOpenHtmlEditor={onOpenHtmlEditor}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  // 3. Multi-Page Print Canvas (Letter / A4 / Legal)
  const isLandscape = orientation?.toLowerCase() === "landscape";
  const pageBaseWidth = pageSize === "Letter" ? 816 : pageSize === "Legal" ? 816 : 794;
  const pageBaseHeight = pageSize === "Letter" ? 1056 : pageSize === "Legal" ? 1344 : 1123;
  const pageWidth = isLandscape ? pageBaseHeight : pageBaseWidth;
  const pageMinHeight = isLandscape ? pageBaseWidth : pageBaseHeight;

  // Normalized document pages stack
  const docPages =
    pages && Array.isArray(pages) && pages.length > 0
      ? pages
      : [{ id: "page-1", name: "Page 1", items: items || [] }];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-200/60">
      {/* Secondary Canvas Toolbar */}
      <div className="h-10 border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4 flex items-center justify-between text-xs select-none shadow-2xs z-10 shrink-0">
        <div className="flex items-center gap-1">
          {/* Document Format & Dimensions Badge */}
          <div className="gdoc-tooltip-container">
            <div className="flex items-center gap-1.5 px-2 py-1 text-slate-600 bg-slate-50 border border-slate-200 rounded text-xs font-semibold">
              <FileText size={14} className="text-blue-600" />
              <span>{pageSize}</span>
            </div>
            <div className="gdoc-tooltip">Document preview: {pageSize} · {orientation}</div>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* 1-Click Rotate Page Orientation Button */}
          <div className="gdoc-tooltip-container">
            <button
              type="button"
              onClick={onToggleOrientation}
              className={`p-1.5 rounded hover:bg-slate-100 text-slate-700 transition ${
                isLandscape ? "text-blue-600 bg-blue-50" : ""
              }`}
              title={`Rotate orientation to ${isLandscape ? "Portrait" : "Landscape"}`}
              aria-label="Rotate Page Orientation"
            >
              {isLandscape ? (
                /* Exact reference rectangle-horizontal SVG */
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="18" height="14" x="3" y="5" rx="2" strokeWidth="2" />
                  <path d="M7 9h10M7 13h6" strokeWidth="1.5" />
                </svg>
              ) : (
                /* Exact reference rectangle-vertical SVG */
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="14" height="18" x="5" y="3" rx="2" strokeWidth="2" />
                  <path d="M9 7h6M9 11h6" strokeWidth="1.5" />
                </svg>
              )}
            </button>
            <div className="gdoc-tooltip">
              Rotate {isLandscape ? "Portrait" : "Landscape"}
            </div>
          </div>

          {/* Add Blank Page Button */}
          {!preview && (
            <div className="gdoc-tooltip-container">
              <button
                type="button"
                onClick={onAddPage}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition"
                aria-label="Add Blank Page"
              >
                <Plus size={18} />
              </button>
              <div className="gdoc-tooltip">Add Blank Page ({pageSize})</div>
            </div>
          )}

          {/* Add Component Menu */}
          {!preview && (
            <div className="relative inline-flex items-center">
              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                  className={`flex items-center gap-0.5 p-1.5 rounded transition ${
                    isAddMenuOpen ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-700"
                  }`}
                  aria-label="Add Component Menu"
                  aria-expanded={isAddMenuOpen}
                >
                  <Plus size={18} />
                  <ChevronDown size={13} className="text-slate-400" />
                </button>
                {!isAddMenuOpen && <div className="gdoc-tooltip">Add Component</div>}
              </div>

              {isAddMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsAddMenuOpen(false)}
                  />
                  <div className="add-component-dropdown-menu absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-2xl border border-slate-200/90 p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-[460px] overflow-y-auto">
                    <div className="px-3 pt-1.5 pb-1 font-bold text-[10px] text-slate-400 uppercase tracking-wider select-none">
                      Content & Fields
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        onAddWidgetClick({ label: "Text Block", type: "text" });
                      }}
                      className="add-component-item w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition rounded-lg text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center shrink-0 transition">
                        <Type size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <b className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 leading-snug">Text Block</b>
                        <small className="text-[10.5px] text-slate-400 truncate">Editable multiline paragraph</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        onAddWidgetClick({ label: "Section Heading", type: "heading" });
                      }}
                      className="add-component-item w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition rounded-lg text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center shrink-0 transition">
                        <Heading size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <b className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 leading-snug">Section Heading</b>
                        <small className="text-[10.5px] text-slate-400 truncate">Prominent title or section header</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        onAddWidgetClick({ label: "Label and Value", type: "meta" });
                      }}
                      className="add-component-item w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition rounded-lg text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center shrink-0 transition">
                        <Sliders size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <b className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 leading-snug">Label and Value</b>
                        <small className="text-[10.5px] text-slate-400 truncate">Side-by-side label and data value</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        onOpenCustomFieldDialog();
                      }}
                      className="add-component-item highlight-action w-full flex items-center gap-3 px-3 py-2 bg-blue-50/60 border border-blue-200/80 hover:bg-blue-100/70 text-blue-800 transition rounded-lg text-left cursor-pointer my-1 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 group-hover:bg-blue-200 text-blue-600 flex items-center justify-center shrink-0 transition">
                        <Plus size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <b className="text-xs font-semibold text-blue-700 leading-snug">Custom Field...</b>
                        <small className="text-[10.5px] text-blue-500 truncate">User-defined custom field & value</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        onAddWidgetClick({ label: "Notes / Terms", type: "notes" });
                      }}
                      className="add-component-item w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition rounded-lg text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center shrink-0 transition">
                        <StickyNote size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <b className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 leading-snug">Notes / Terms</b>
                        <small className="text-[10.5px] text-slate-400 truncate">Rich formatted terms and conditions</small>
                      </div>
                    </button>

                    <div className="border-t border-slate-100 my-1.5" />
                    <div className="px-3 pt-1 pb-1 font-bold text-[10px] text-slate-400 uppercase tracking-wider select-none">
                      Media & Layout
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        onInsertLayout();
                      }}
                      className="add-component-item w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition rounded-lg text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center shrink-0 transition">
                        <Layout size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <b className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 leading-snug">Custom Layout...</b>
                        <small className="text-[10.5px] text-slate-400 truncate">Email-style multi-column layout</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        onInsertTable();
                      }}
                      className="add-component-item w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition rounded-lg text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center shrink-0 transition">
                        <Table size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <b className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 leading-snug">Custom Table...</b>
                        <small className="text-[10.5px] text-slate-400 truncate">Interactive data grid & table</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAddMenuOpen(false);
                        onOpenHtmlEditor();
                      }}
                      className="add-component-item w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition rounded-lg text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center shrink-0 transition">
                        <Code size={16} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <b className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 leading-snug">HTML Code...</b>
                        <small className="text-[10.5px] text-slate-400 truncate">Directly editable HTML & CSS code block</small>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Direct Layout & Table Shortcuts */}
          {!preview && (
            <div className="flex items-center gap-1">
              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={onInsertLayout}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition"
                  aria-label="Custom Layout"
                >
                  <Layout size={18} />
                </button>
                <div className="gdoc-tooltip">Custom Layout</div>
              </div>

              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={onInsertTable}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition"
                  aria-label="Insert Table"
                >
                  <Table size={18} />
                </button>
                <div className="gdoc-tooltip">Insert Table</div>
              </div>
            </div>
          )}
        </div>

        {/* Center/Right: Device Switchers & Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Device Switcher (Desktop / Tablet / Mobile) */}
          <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
            <div className="gdoc-tooltip-container">
              <button
                type="button"
                onClick={() => onDevicePreviewChange("desktop")}
                className={`p-1.5 rounded transition ${
                  devicePreview === "desktop" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Desktop view (Standard page)"
                aria-label="Desktop preview"
              >
                <Monitor size={17} />
              </button>
              <div className="gdoc-tooltip">Desktop view (Standard page)</div>
            </div>

            <div className="gdoc-tooltip-container">
              <button
                type="button"
                onClick={() => onDevicePreviewChange("tablet")}
                className={`p-1.5 rounded transition ${
                  devicePreview === "tablet" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Tablet view (768px)"
                aria-label="Tablet preview"
              >
                <Tablet size={17} />
              </button>
              <div className="gdoc-tooltip">Tablet view (768px)</div>
            </div>

            <div className="gdoc-tooltip-container">
              <button
                type="button"
                onClick={() => onDevicePreviewChange("mobile")}
                className={`p-1.5 rounded transition ${
                  devicePreview === "mobile" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Mobile view (375px)"
                aria-label="Mobile preview"
              >
                <Smartphone size={17} />
              </button>
              <div className="gdoc-tooltip">Mobile view (375px)</div>
            </div>
          </div>

          {/* Zoom Tools */}
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() => onZoomChange(Math.max(40, zoom - 10))}
                  className="p-1.5 rounded hover:bg-white text-slate-700 transition"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <div className="gdoc-tooltip">Zoom out</div>
              </div>

              <span className="text-xs font-semibold text-slate-600 px-2 min-w-[40px] text-center select-none">
                {zoom}%
              </span>

              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() => onZoomChange(Math.min(200, zoom + 10))}
                  className="p-1.5 rounded hover:bg-white text-slate-700 transition"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <div className="gdoc-tooltip">Zoom in</div>
              </div>
            </div>

            <div className="gdoc-tooltip-container">
              <button
                type="button"
                onClick={() => onZoomChange(115)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                title="Fit to Width"
                aria-label="Fit to Width"
              >
                <MoveHorizontal size={17} />
              </button>
              <div className="gdoc-tooltip">Fit to width</div>
            </div>

            <div className="gdoc-tooltip-container">
              <button
                type="button"
                onClick={() => onZoomChange(75)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                title="Fit to Page"
                aria-label="Fit to Page"
              >
                <Maximize2 size={17} />
              </button>
              <div className="gdoc-tooltip">Fit to page</div>
            </div>

            <div className="gdoc-tooltip-container">
              <button
                type="button"
                onClick={() => onZoomChange(100)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                title="Reset Zoom (100%)"
                aria-label="Reset Zoom"
              >
                <RotateCcw size={17} />
              </button>
              <div className="gdoc-tooltip">Reset zoom (100%)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center">
        {devicePreview === "desktop" ? (
          <div className="flex flex-col items-center gap-10">
            {docPages.map((page, pageIndex) => (
              <div
                key={page.id || `page-${pageIndex}`}
                className="page-sheet-wrapper flex flex-col items-center"
                style={{
                  width: pageWidth,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                  marginBottom: Math.max(0, pageMinHeight * (zoom / 100 - 1)),
                }}
              >
                {/* Page Sheet Header */}
                <div className="page-sheet-header">
                  <div className="page-header-title-group">
                    <span className="page-badge">
                      {page.name || `Page ${pageIndex + 1}`}
                    </span>
                    <small className="page-subinfo">
                      {pageSize} · {orientation} (Page {pageIndex + 1} of{" "}
                      {docPages.length})
                    </small>
                  </div>

                  {!preview && (
                    <div className="page-header-actions">
                      <div className="gdoc-tooltip-container">
                        <button
                          type="button"
                          className="page-mini-action-btn"
                          onClick={() => onAddPageBefore(pageIndex)}
                          title="Insert a blank page before this page"
                          aria-label="Add blank page before"
                        >
                          <Plus size={16} />
                        </button>
                        <div className="gdoc-tooltip">Page Before</div>
                      </div>

                      <div className="gdoc-tooltip-container">
                        <button
                          type="button"
                          className="page-mini-action-btn"
                          onClick={() => onAddPageAfter(pageIndex)}
                          title="Insert a blank page after this page"
                          aria-label="Add blank page after"
                        >
                          <Plus size={16} />
                        </button>
                        <div className="gdoc-tooltip">Page After</div>
                      </div>

                      <div className="gdoc-tooltip-container">
                        <button
                          type="button"
                          className="page-mini-action-btn"
                          onClick={() => onDuplicatePage(pageIndex)}
                          title="Duplicate this entire page and its components"
                          aria-label="Duplicate page"
                        >
                          <Copy size={15} />
                        </button>
                        <div className="gdoc-tooltip">Duplicate Page</div>
                      </div>

                      {docPages.length > 1 && (
                        <div className="page-order-btns">
                          <button
                            type="button"
                            className="page-order-btn"
                            disabled={pageIndex === 0}
                            onClick={() => onMovePage(pageIndex, "up")}
                            title="Move page up"
                            aria-label="Move page up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="page-order-btn"
                            disabled={pageIndex === docPages.length - 1}
                            onClick={() => onMovePage(pageIndex, "down")}
                            title="Move page down"
                            aria-label="Move page down"
                          >
                            ↓
                          </button>
                        </div>
                      )}

                      {docPages.length > 1 && (
                        <button
                          type="button"
                          className="remove-page-btn"
                          onClick={() => onDeletePage(pageIndex)}
                          title="Delete this page"
                          aria-label="Delete page"
                        >
                          <Trash2 size={11} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Physical Printable Sheet Canvas */}
                <div
                  style={{
                    width: pageWidth,
                    minHeight: pageMinHeight,
                  }}
                  className="bg-white shadow-xl rounded-sm p-12 space-y-6 transition-all box-border max-w-full overflow-x-hidden"
                >
                  {(page.items || []).length === 0 ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTarget({ pageIndex, itemIndex: 0 });
                      }}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        onDropInPage(e, pageIndex, 0);
                        setDragOverTarget(null);
                      }}
                      className={`h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors ${
                        dragOverTarget?.pageIndex === pageIndex && dragOverTarget?.itemIndex === 0
                          ? "border-blue-500 bg-blue-50/50 text-blue-600"
                          : "border-slate-200 text-slate-400"
                      }`}
                    >
                      <p className="text-sm font-medium">Page {pageIndex + 1} is empty.</p>
                      <p className="text-xs mt-1">
                        Drag & drop widgets here, or click from the left toolbox.
                      </p>
                    </div>
                  ) : (
                    <>
                      {page.items.map((item, itemIndex) => (
                        <React.Fragment key={item.id}>
                          {!preview && (
                            <div
                              className={`drop-zone ${
                                dragOverTarget?.pageIndex === pageIndex &&
                                dragOverTarget?.itemIndex === itemIndex
                                  ? "active"
                                  : ""
                              }`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverTarget({ pageIndex, itemIndex });
                              }}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                onDropInPage(e, pageIndex, itemIndex);
                                setDragOverTarget(null);
                              }}
                            >
                              <span>+ Drop widget here</span>
                            </div>
                          )}
                          <DocumentBlock
                            item={item}
                            isSelected={selectedItemId === item.id}
                            onSelect={() => onSelectItem(item.id)}
                            onUpdate={(patch) => onUpdateItem(patch)}
                            onDelete={() => onDeleteItem(item.id)}
                            onDuplicate={() => onDuplicateItem(item)}
                            preview={preview}
                            resolveVariables={resolveVariables}
                            selection={selection}
                            onSelectPart={onSelectPart}
                            onOpenHtmlEditor={onOpenHtmlEditor}
                          />
                        </React.Fragment>
                      ))}
                      {!preview && (
                        <div
                          className={`drop-zone end ${
                            dragOverTarget?.pageIndex === pageIndex &&
                            dragOverTarget?.itemIndex === (page.items || []).length
                              ? "active"
                              : ""
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverTarget({ pageIndex, itemIndex: (page.items || []).length });
                          }}
                          onDragLeave={() => setDragOverTarget(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            onDropInPage(e, pageIndex, (page.items || []).length);
                            setDragOverTarget(null);
                          }}
                        >
                          <span>+ Drop widget here</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Mobile (375px) / Tablet (768px) Device Frame View */
          (() => {
            const viewportWidth = devicePreview === "mobile" ? 375 : 768;
            const deviceScale = viewportWidth / pageWidth;
            const effectiveScale = (zoom / 100) * deviceScale;

            return (
              <div
                className="device-frame-scale-wrap"
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div
                  className={`device-viewport-container device-${devicePreview}`}
                  style={{
                    width: `${viewportWidth}px`,
                    maxWidth: "100%",
                  }}
                >
                  {docPages.map((page, pageIndex) => (
                    <div
                      key={page.id || `dev-page-${pageIndex}`}
                      className="device-page-wrapper"
                      style={{
                        marginBottom: `${Math.max(24, 32 * (zoom / 100))}px`,
                      }}
                    >
                      <div className="device-page-tag">
                        <span>
                          Page {pageIndex + 1} of {docPages.length}
                        </span>
                        <small>
                          {devicePreview === "mobile"
                            ? `Mobile Viewport (${viewportWidth}px · ${Math.round(deviceScale * 100)}% scale)`
                            : `Tablet Viewport (${viewportWidth}px · ${Math.round(deviceScale * 100)}% scale)`}
                        </small>
                      </div>

                      {/* Scaled Device Container preserving 100% of A4 Sheet Dimensions & Content */}
                      <div
                        style={{
                          width: `${viewportWidth}px`,
                          height: `${pageMinHeight * effectiveScale}px`,
                          overflow: "hidden",
                          position: "relative",
                          borderRadius: "8px",
                          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.08)",
                          background: "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            width: `${pageWidth}px`,
                            minHeight: `${pageMinHeight}px`,
                            transform: `scale(${effectiveScale})`,
                            transformOrigin: "top left",
                          }}
                          className="bg-white p-12 space-y-6 box-border max-w-full overflow-x-hidden"
                        >
                          {(page.items || []).length === 0 ? (
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverTarget({ pageIndex, itemIndex: 0 });
                              }}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                onDropInPage(e, pageIndex, 0);
                                setDragOverTarget(null);
                              }}
                              className={`h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors ${
                                dragOverTarget?.pageIndex === pageIndex && dragOverTarget?.itemIndex === 0
                                  ? "border-blue-500 bg-blue-50/50 text-blue-600"
                                  : "border-slate-200 text-slate-400"
                              }`}
                            >
                              <p className="text-sm font-medium">Page {pageIndex + 1} is empty.</p>
                            </div>
                          ) : (
                            <>
                              {page.items.map((item, itemIndex) => (
                                <React.Fragment key={item.id}>
                                  {!preview && (
                                    <div
                                      className={`drop-zone ${
                                        dragOverTarget?.pageIndex === pageIndex &&
                                        dragOverTarget?.itemIndex === itemIndex
                                          ? "active"
                                          : ""
                                      }`}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOverTarget({ pageIndex, itemIndex });
                                      }}
                                      onDragLeave={() => setDragOverTarget(null)}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        onDropInPage(e, pageIndex, itemIndex);
                                        setDragOverTarget(null);
                                      }}
                                    >
                                      <span>+ Drop widget here</span>
                                    </div>
                                  )}
                                  <DocumentBlock
                                    item={item}
                                    isSelected={selectedItemId === item.id}
                                    onSelect={() => onSelectItem(item.id)}
                                    onUpdate={(patch) => onUpdateItem(patch)}
                                    onDelete={() => onDeleteItem(item.id)}
                                    onDuplicate={() => onDuplicateItem(item)}
                                    preview={preview}
                                    resolveVariables={resolveVariables}
                                    selection={selection}
                                    onSelectPart={onSelectPart}
                                    onOpenHtmlEditor={onOpenHtmlEditor}
                                  />
                                </React.Fragment>
                              ))}
                              {!preview && (
                                <div
                                  className={`drop-zone end ${
                                    dragOverTarget?.pageIndex === pageIndex &&
                                    dragOverTarget?.itemIndex === (page.items || []).length
                                      ? "active"
                                      : ""
                                  }`}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragOverTarget({ pageIndex, itemIndex: (page.items || []).length });
                                  }}
                                  onDragLeave={() => setDragOverTarget(null)}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    onDropInPage(e, pageIndex, (page.items || []).length);
                                    setDragOverTarget(null);
                                  }}
                                >
                                  <span>+ Drop widget here</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

