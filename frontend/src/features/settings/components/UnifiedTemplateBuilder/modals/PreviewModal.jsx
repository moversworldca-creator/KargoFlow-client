import React, { useState } from "react";
import {
  Eye,
  X,
  Printer,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Database,
} from "lucide-react";
import DocumentBlock from "../components/DocumentBlock";
import { getPageDimensions, getDocumentPages } from "../model/templateModel";
import { compileDocumentToHtml } from "../model/htmlCompiler";

export default function PreviewModal({
  isOpen,
  doc,
  mode = "estimate",
  pageSize = "A4",
  orientation = "Portrait",
  onClose,
  onExportJson,
}) {
  const [zoom, setZoom] = useState(100);
  const [resolveVariables, setResolveVariables] = useState(true);

  if (!isOpen || !doc) return null;

  const effPageSize = doc.settings?.pageSize || pageSize || "A4";
  const effOrientation = doc.settings?.orientation || orientation || "Portrait";
  const isLandscape = String(effOrientation).toLowerCase() === "landscape";
  const pageDims = getPageDimensions(effPageSize, effOrientation);
  const docPages = getDocumentPages(doc);
  const html = compileDocumentToHtml(doc, mode, effPageSize, effOrientation);

  const handlePrint = () => {
    let pageStyle = window.document.getElementById("kargoflow-print-page");
    if (!pageStyle) {
      pageStyle = window.document.createElement("style");
      pageStyle.id = "kargoflow-print-page";
      window.document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `
      @page {
        size: ${effPageSize} ${effOrientation.toLowerCase()};
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          background: #ffffff !important;
        }
        .no-print, header, nav, footer, .modal-backdrop {
          display: none !important;
        }
        .preview-print-container {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        .preview-modal-sheet {
          box-shadow: none !important;
          border: none !important;
          margin: 0 !important;
          page-break-after: always !important;
          break-after: page !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
      }
    `;

    const iframe = document.getElementById("preview-document-frame");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 select-none shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Eye size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 truncate">
                  {doc.name || "Customer Preview"}
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  {effPageSize} • {effOrientation}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                  {docPages.length} {docPages.length === 1 ? "page" : "pages"} ({pageDims.width} × {pageDims.height}px)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Exact 1:1 page dimensions preview with printable layout containment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle Sample Data / Merge Tags */}
            <button
              type="button"
              onClick={() => setResolveVariables((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                resolveVariables
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
              title={resolveVariables ? "Showing sample data values" : "Showing raw merge tag variables"}
            >
              <Database size={13} className={resolveVariables ? "text-emerald-600" : "text-slate-400"} />
              <span>{resolveVariables ? "Sample Data" : "Raw Variables"}</span>
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(40, z - 10))}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                title="Zoom Out"
                aria-label="Zoom out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-xs font-semibold text-slate-700 px-2 min-w-[42px] text-center">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(180, z + 10))}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                title="Zoom In"
                aria-label="Zoom in"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 border-l border-slate-200"
                title="Reset Zoom (100%)"
              >
                Reset
              </button>
            </div>

            {/* Export JSON Button */}
            {onExportJson && (
              <button
                type="button"
                onClick={onExportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition"
                title="Export template schema as JSON"
              >
                <FileText size={14} className="text-slate-500" />
                <span>Export JSON</span>
              </button>
            )}

            {/* Save as PDF / Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
              title="Save as PDF or Print document"
            >
              <Printer size={14} />
              <span>Save as PDF / Print</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg ml-1"
              title="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scaled Exact Sheet Preview Canvas */}
        <div className="flex-1 bg-slate-200/70 p-8 overflow-y-auto overflow-x-auto flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease",
              marginBottom: `${Math.max(0, pageDims.height * (zoom / 100 - 1) * docPages.length)}px`,
            }}
            className="flex flex-col items-center gap-8 w-fit"
          >
            {docPages.map((page, pageIndex) => (
              <div
                key={page.id || `page-${pageIndex}`}
                style={{ width: `${pageDims.width}px` }}
                className="flex flex-col items-center mx-auto"
                data-testid={`preview-page-${pageIndex + 1}`}
              >
                {/* Page Indicator Tag */}
                <div className="self-start text-[11px] font-semibold text-slate-500 mb-2 px-1 flex items-center justify-between w-full">
                  <span>
                    Page {pageIndex + 1} of {docPages.length} &bull; {effPageSize} ({effOrientation})
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {pageDims.width}px × {pageDims.height}px
                  </span>
                </div>

                {/* Physical Printable Page Sheet */}
                <article
                  style={{
                    width: `${pageDims.width}px`,
                    minHeight: `${pageDims.height}px`,
                    height: `${pageDims.height}px`,
                    padding: "58px 60px 42px",
                    boxSizing: "border-box",
                    backgroundColor: "#ffffff",
                    overflow: "hidden",
                  }}
                  className="preview-modal-sheet document preview clean-preview-doc bg-white shadow-2xl rounded-xs space-y-6 transition-all box-border max-w-full overflow-hidden border border-slate-300/80"
                >
                  {(page.items || [])
                    .filter((it) => it.visible !== false)
                    .map((item) => (
                      <div key={item.id} className="w-full max-w-full min-w-0 box-border">
                        <DocumentBlock
                          item={item}
                          isSelected={false}
                          onSelect={() => {}}
                          onUpdate={() => {}}
                          onDelete={() => {}}
                          onDuplicate={() => {}}
                          preview={true}
                          resolveVariables={resolveVariables}
                          selection={null}
                          onSelectPart={() => {}}
                          onOpenHtmlEditor={() => {}}
                        />
                      </div>
                    ))}
                </article>
              </div>
            ))}
          </div>

          {/* Hidden iframe for print execution fallback */}
          <iframe
            id="preview-document-frame"
            srcDoc={html}
            title="Document Print Frame"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
