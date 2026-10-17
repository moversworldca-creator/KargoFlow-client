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
  Mail,
  MessageSquare,
  Monitor,
  Tablet,
  Smartphone,
  Pencil,
  GripVertical,
} from "lucide-react";
import DocumentBlock from "../components/DocumentBlock";
import { getPageDimensions, getDocumentPages } from "../model/templateModel";
import { compileDocumentToHtml } from "../model/htmlCompiler";

const SAMPLE_SMS_MAP = {
  "customer.full_name": "Alex Customer",
  "customer.first_name": "Alex",
  "customer.phone": "(555) 019-2834",
  "customer.email": "alex.customer@example.com",
  "move.pickup_date": "June 15, 2026",
  "move.pickup_address": "123 Main St, Vancouver, BC",
  "move.delivery_address": "456 Oak Ave, Burnaby, BC",
  "estimate.number": "EST-00042",
  "estimate.grand_total": "$1,008.00",
  "invoice.balance_due": "$908.00",
  "company.name": "KargoFlow",
  "company.phone": "+1 800 555 0199",
  "portal.action_url": "https://kargoflow.com/portal/est-42",
  "tracking.short_url": "https://kargoflow.com/track/42",
  branch_name: "KargoFlow Main",
  customer_name: "Alex Customer",
  move_date: "June 15, 2026",
  quote_link: "https://kargoflow.com/portal/est-42",
  balance_due: "$908.00",
};

const resolveSmsVariables = (text, resolve) => {
  if (!resolve || !text) return text;
  return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
    return SAMPLE_SMS_MAP[key.trim()] || SAMPLE_SMS_MAP[key.trim().toLowerCase()] || match;
  });
};

export default function PreviewModal({
  isOpen,
  doc,
  mode = "estimate",
  pageSize = "A4",
  orientation = "Portrait",
  smsText = "",
  onClose,
  onExportJson,
  onUpdateDoc = () => {},
  onUpdateItem = () => {},
  onDeleteItem = () => {},
  onDuplicateItem = () => {},
}) {
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== "undefined" && window.innerHeight) {
      const availableH = window.innerHeight * 0.94 - 150;
      if (availableH > 0 && availableH < 1123) {
        return Math.min(100, Math.max(50, Math.round((availableH / 1123) * 100)));
      }
    }
    return 75;
  });
  const [resolveVariables, setResolveVariables] = useState(true);
  const [devicePreview, setDevicePreview] = useState("desktop"); // desktop | tablet | mobile
  const [isInteractivePreview, setIsInteractivePreview] = useState(true);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selection, setSelection] = useState(null);

  if (!isOpen || !doc) return null;

  const effPageSize = doc.settings?.pageSize || pageSize || "A4";
  const effOrientation = doc.settings?.orientation || orientation || "Portrait";
  const isLandscape = String(effOrientation).toLowerCase() === "landscape";
  const pageDims = getPageDimensions(effPageSize, effOrientation);
  const docPages = getDocumentPages(doc);
  const html = compileDocumentToHtml(doc, mode, effPageSize, effOrientation);

  // Handle Drag Reorder Inside Preview
  const handleDropInPreview = (e, targetPageIndex, targetItemIndex) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    if (!itemId) return;

    const pages = docPages.map((page) => ({
      ...page,
      items: [...(page.items || [])],
    }));

    let srcPageIdx = -1;
    let srcItemIdx = -1;

    pages.forEach((page, pIdx) => {
      const iIdx = page.items.findIndex((it) => it.id === itemId);
      if (iIdx >= 0) {
        srcPageIdx = pIdx;
        srcItemIdx = iIdx;
      }
    });

    if (srcPageIdx >= 0 && srcItemIdx >= 0) {
      const sourceItem = pages[srcPageIdx].items[srcItemIdx];
      pages[srcPageIdx].items.splice(srcItemIdx, 1);

      const destInsertIdx =
        srcPageIdx === targetPageIndex && targetItemIndex > srcItemIdx
          ? targetItemIndex - 1
          : Math.max(0, Math.min(pages[targetPageIndex].items.length, targetItemIndex));

      pages[targetPageIndex].items.splice(destInsertIdx, 0, sourceItem);
      const nextItems = pages.flatMap((p) => p.items);

      onUpdateDoc({
        ...doc,
        pages,
        items: nextItems,
      });
      setSelectedItemId(sourceItem.id);
    }
    setDragOverTarget(null);
  };

  // Block handlers inside preview
  const handleUpdateBlockInPreview = (updatedItem) => {
    onUpdateItem(updatedItem);
  };

  const handleDeleteBlockInPreview = (itemId) => {
    onDeleteItem(itemId);
    if (selectedItemId === itemId) setSelectedItemId(null);
  };

  const handleDuplicateBlockInPreview = (item) => {
    onDuplicateItem(item);
  };

  const handleMoveItem = (itemId, direction) => {
    const pages = docPages.map((page) => ({
      ...page,
      items: [...(page.items || [])],
    }));

    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const iIdx = pages[pIdx].items.findIndex((it) => it.id === itemId);
      if (iIdx >= 0) {
        const targetIdx = direction === "up" ? iIdx - 1 : iIdx + 1;
        if (targetIdx >= 0 && targetIdx < pages[pIdx].items.length) {
          const temp = pages[pIdx].items[iIdx];
          pages[pIdx].items[iIdx] = pages[pIdx].items[targetIdx];
          pages[pIdx].items[targetIdx] = temp;
          const nextItems = pages.flatMap((p) => p.items);
          onUpdateDoc({
            ...doc,
            pages,
            items: nextItems,
          });
          setSelectedItemId(itemId);
        }
        break;
      }
    }
  };

  const handlePrint = () => {
    // If hidden iframe exists, write clean document without about:srcdoc URL stamping
    let iframe = document.getElementById("preview-document-frame");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "preview-document-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
    }

    try {
      const docObj = iframe.contentWindow?.document || iframe.contentDocument;
      if (docObj) {
        docObj.open();
        docObj.write(html);
        docObj.close();

        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
        }, 150);
        return;
      }
    } catch {
      // Fallback to window.print if iframe access is restricted
    }

    let pageStyle = window.document.getElementById("kargoflow-print-page");
    if (!pageStyle) {
      pageStyle = window.document.createElement("style");
      pageStyle.id = "kargoflow-print-page";
      window.document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `
      @page {
        size: ${effPageSize} ${effOrientation.toLowerCase()};
        margin: 0;
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
        .preview-modal-sheet {
          box-shadow: none !important;
          border: none !important;
          margin: 0 auto !important;
          padding: 10mm 12mm !important;
          page-break-after: always !important;
          break-after: page !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
      }
    `;
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header Toolbar */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 select-none shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              {mode === "sms" ? <MessageSquare size={18} /> : mode === "email" ? <Mail size={18} /> : <Eye size={18} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[120px] sm:max-w-[200px]">
                  {doc.name || "Customer Preview"}
                </h3>
                {mode === "email" ? (
                  <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    Email
                  </span>
                ) : mode === "sms" ? (
                  <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    SMS
                  </span>
                ) : (
                  <>
                    <span className="hidden sm:inline-block text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      {effPageSize} • {effOrientation}
                    </span>
                    <span className="hidden md:inline-block text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                      {docPages.length} {docPages.length === 1 ? "page" : "pages"}
                    </span>
                  </>
                )}
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 truncate">
                {mode === "email"
                  ? "Live customer email preview with device responsiveness and merge tags"
                  : mode === "sms"
                  ? "Live mobile carrier SMS delivery simulator"
                  : "Exact 1:1 page dimensions preview with printable layout containment"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Device preview toggles for all document and messaging modes */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setDevicePreview("desktop")}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-medium transition ${
                  devicePreview === "desktop"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={mode === "sms" ? "Desktop 600px Preview" : "Desktop 100% Page View"}
              >
                <Monitor size={13} />
                <span className="hidden md:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDevicePreview("tablet")}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-medium transition ${
                  devicePreview === "tablet"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={mode === "sms" ? "Tablet 560px Preview" : "Tablet 768px View"}
              >
                <Tablet size={13} />
                <span className="hidden md:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setDevicePreview("mobile")}
                className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-medium transition ${
                  devicePreview === "mobile"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={mode === "sms" ? "Mobile 340px Preview" : "Mobile 375px View"}
                aria-label="Mobile preview"
              >
                <Smartphone size={13} />
                <span className="hidden md:inline">Mobile</span>
              </button>
            </div>

            {/* Mode Toggle: Edit & Drag vs Customer View */}
            {mode !== "sms" && (
              <button
                type="button"
                onClick={() => {
                  setIsInteractivePreview((prev) => !prev);
                  setSelectedItemId(null);
                }}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  isInteractivePreview
                    ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
                title={
                  isInteractivePreview
                    ? "Interactive mode active: drag handles and inline editing enabled. Click to switch to clean customer view."
                    : "Clean customer view active. Click to enable drag reordering and inline editing."
                }
              >
                {isInteractivePreview ? (
                  <>
                    <Pencil size={13} className="text-blue-600" />
                    <span>Edit & Drag Mode</span>
                  </>
                ) : (
                  <>
                    <Eye size={13} className="text-slate-400" />
                    <span>Customer View</span>
                  </>
                )}
              </button>
            )}

            {/* Toggle Sample Data / Merge Tags */}
            <button
              type="button"
              onClick={() => setResolveVariables((v) => !v)}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                resolveVariables
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
              title={resolveVariables ? "Showing sample data values" : "Showing raw merge tag variables"}
            >
              <Database size={13} className={resolveVariables ? "text-emerald-600" : "text-slate-400"} />
              <span className="hidden lg:inline">{resolveVariables ? "Sample Data" : "Raw Variables"}</span>
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(30, z - 10))}
                className="p-1 sm:p-1.5 hover:bg-slate-100 rounded text-slate-600"
                title="Zoom Out"
                aria-label="Zoom out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-700 px-1 sm:px-2 min-w-[36px] sm:min-w-[42px] text-center select-none">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(180, z + 10))}
                className="p-1 sm:p-1.5 hover:bg-slate-100 rounded text-slate-600"
                title="Zoom In"
                aria-label="Zoom in"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetW = devicePreview === "mobile" ? 375 : devicePreview === "tablet" ? 768 : (pageDims.width || 794);
                  const targetH = pageDims.height || 1123;
                  const availableW = (typeof window !== "undefined" ? window.innerWidth : 1024) - 64;
                  const availableH = (typeof window !== "undefined" ? window.innerHeight : 900) * 0.94 - 150;
                  const fitW = (availableW / targetW) * 100;
                  const fitH = (availableH / targetH) * 100;
                  const fit = Math.min(100, Math.max(30, Math.round(Math.min(fitW, fitH))));
                  setZoom(fit);
                }}
                className="px-1.5 sm:px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 border-l border-slate-200"
                title="Fit full page on screen"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                className="hidden sm:inline-block px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 border-l border-slate-200"
                title="Reset Zoom (100%)"
              >
                100%
              </button>
            </div>

            {/* Export JSON Button */}
            {onExportJson && (
              <button
                type="button"
                onClick={onExportJson}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition"
                title="Export template schema as JSON"
              >
                <FileText size={14} className="text-slate-500" />
                <span>Export JSON</span>
              </button>
            )}

            {/* Save as PDF / Print Button */}
            {mode !== "sms" && (
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
                title="Save as PDF or Print document"
              >
                <Printer size={14} />
                <span className="hidden md:inline">Save as PDF / Print</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-600 rounded-lg ml-0.5 sm:ml-1 shrink-0"
              title="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body Canvas */}
        {mode === "sms" ? (
          <div className="flex-1 bg-slate-200/70 p-8 overflow-y-auto flex flex-col items-center justify-start">
            <div
              style={{
                width: devicePreview === "mobile" ? 340 : devicePreview === "tablet" ? 560 : 600,
                transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                transformOrigin: "top center",
                transition: "width 0.2s ease, transform 0.15s ease",
              }}
              className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-12 flex flex-col"
            >
              {/* Clean Header Bar */}
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0">
                    KF
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">KargoFlow Dispatch</div>
                    <div className="text-[10.5px] text-slate-400">SMS Notification &bull; Recipient View</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {devicePreview === "mobile" ? "340px" : devicePreview === "tablet" ? "560px" : "600px"}
                  </span>
                  <span className="text-[10.5px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Delivered
                  </span>
                </div>
              </div>

              {/* Message Display Area */}
              <div className="p-6 min-h-[300px] flex flex-col justify-end bg-white">
                <div
                  style={{
                    maxWidth: devicePreview === "mobile" ? "88%" : devicePreview === "tablet" ? "76%" : "70%",
                    fontSize: doc.settings?.fontSize ? `${doc.settings.fontSize}px` : "13px",
                  }}
                  className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-xs shadow-xs leading-relaxed ml-auto break-words whitespace-pre-wrap"
                >
                  {resolveSmsVariables(smsText || "No SMS message text entered.", resolveVariables)}
                </div>
                <div className="text-right text-[10px] text-slate-400 mt-1.5 pr-1">Just now</div>
              </div>
            </div>
          </div>
        ) : mode === "email" ? (
          <div className="flex-1 bg-slate-200/70 p-8 overflow-y-auto overflow-x-auto flex flex-col items-center">
            <div
              style={{
                width: devicePreview === "mobile" ? 360 : devicePreview === "tablet" ? 560 : 600,
                transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                transformOrigin: "top center",
                transition: "width 0.25s ease, transform 0.15s ease",
              }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden mb-12"
            >
              {/* Simulated Email Envelope Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium w-14">Subject:</span>
                  <span className="font-bold text-slate-800">
                    {resolveSmsVariables(doc.settings?.subject || doc.name || "Notification", resolveVariables)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <span className="text-slate-400 font-medium w-14">From:</span>
                  <span>KargoFlow Dispatch &lt;dispatch@kargoflow.com&gt;</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                  <span className="text-slate-400 font-medium w-14">To:</span>
                  <span>Alex Customer &lt;customer@example.com&gt;</span>
                </div>
              </div>

              {/* Rendered Email Content Blocks */}
              <div
                style={{
                  fontSize: doc.settings?.fontSize ? `${doc.settings.fontSize}px` : undefined,
                }}
                className="p-6 space-y-4"
              >
                {(() => {
                  const emailItems = (docPages[0]?.items || doc.items || []).filter((it) => it.visible !== false);
                  return (
                    <>
                      {emailItems.map((item, itemIndex) => (
                        <React.Fragment key={item.id}>
                          {isInteractivePreview && (
                            <div
                              className={`drop-zone no-print ${
                                dragOverTarget?.pageIndex === 0 && dragOverTarget?.itemIndex === itemIndex ? "active" : ""
                              }`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverTarget({ pageIndex: 0, itemIndex });
                              }}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleDropInPreview(e, 0, itemIndex);
                              }}
                            >
                              <span>+ Drop widget here</span>
                            </div>
                          )}
                          <div className="w-full">
                            <DocumentBlock
                              item={item}
                              isSelected={isInteractivePreview && selectedItemId === item.id}
                              onSelect={() => {
                                if (isInteractivePreview) setSelectedItemId(item.id);
                              }}
                              onUpdate={handleUpdateBlockInPreview}
                              onDelete={() => handleDeleteBlockInPreview(item.id)}
                              onDuplicate={() => handleDuplicateBlockInPreview(item)}
                              onMoveUp={() => handleMoveItem(item.id, "up")}
                              onMoveDown={() => handleMoveItem(item.id, "down")}
                              isFirst={itemIndex === 0}
                              isLast={itemIndex === emailItems.length - 1}
                              preview={!isInteractivePreview}
                              resolveVariables={resolveVariables}
                              selection={selection}
                              onSelectPart={(part) => setSelection({ blockId: item.id, part })}
                              onOpenHtmlEditor={() => {}}
                            />
                          </div>
                        </React.Fragment>
                      ))}
                      {isInteractivePreview && (
                        <div
                          className={`drop-zone end no-print ${
                            dragOverTarget?.pageIndex === 0 &&
                            dragOverTarget?.itemIndex === emailItems.length
                              ? "active"
                              : ""
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverTarget({
                              pageIndex: 0,
                              itemIndex: emailItems.length,
                            });
                          }}
                          onDragLeave={() => setDragOverTarget(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDropInPreview(e, 0, emailItems.length);
                          }}
                        >
                          <span>+ Drop widget here</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : (
          /* Scaled Sheet Preview Canvas */
          <div className="flex-1 bg-slate-200/70 p-4 sm:p-8 overflow-y-auto overflow-x-auto flex justify-center items-start">
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
                marginBottom: `${Math.max(0, pageDims.height * (zoom / 100 - 1) * docPages.length)}px`,
              }}
              className="flex flex-col items-center gap-8 w-fit"
            >
              {docPages.map((page, pageIndex) => {
                const isMobileFrame = devicePreview === "mobile";
                const isTabletFrame = devicePreview === "tablet";
                const frameWidth = isMobileFrame ? 375 : isTabletFrame ? 768 : pageDims.width;

                return (
                  <div
                    key={page.id || `page-${pageIndex}`}
                    style={{ width: `${frameWidth}px`, maxWidth: "100%" }}
                    className={`flex flex-col items-center mx-auto ${
                      isMobileFrame
                        ? "border-[6px] border-slate-700 rounded-3xl overflow-hidden shadow-2xl bg-slate-100"
                        : isTabletFrame
                        ? "border-[4px] border-slate-500 rounded-2xl overflow-hidden shadow-2xl bg-slate-100"
                        : ""
                    }`}
                    data-testid={`preview-page-${pageIndex + 1}`}
                  >
                    {/* Page Indicator Tag */}
                    <div className="self-start text-[11px] font-semibold text-slate-500 mb-2 px-1 flex items-center justify-between w-full no-print">
                      <span>
                        Page {pageIndex + 1} of {docPages.length} &bull; {effPageSize} ({effOrientation})
                        {isMobileFrame ? " — Mobile 375px" : isTabletFrame ? " — Tablet 768px" : ""}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {frameWidth}px × {pageDims.height}px
                      </span>
                    </div>

                    {/* Physical Printable Page Sheet */}
                    <article
                      style={{
                        width: isMobileFrame ? "375px" : isTabletFrame ? "768px" : `${pageDims.width}px`,
                        minHeight: `${pageDims.height}px`,
                        padding: isMobileFrame ? "24px 16px 24px" : isTabletFrame ? "36px 32px 32px" : "58px 60px 42px",
                        boxSizing: "border-box",
                        backgroundColor: "#ffffff",
                        fontSize: doc.settings?.fontSize ? `${doc.settings.fontSize}px` : undefined,
                      }}
                      className="preview-modal-sheet document preview clean-preview-doc bg-white shadow-2xl rounded-xs space-y-6 transition-all box-border max-w-full border border-slate-300/80"
                    >
                      {(() => {
                        const pageItems = (page.items || []).filter((it) => it.visible !== false);
                        return (
                          <>
                            {pageItems.map((item, itemIndex) => (
                              <React.Fragment key={item.id}>
                                {isInteractivePreview && (
                                  <div
                                    className={`drop-zone no-print ${
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
                                      handleDropInPreview(e, pageIndex, itemIndex);
                                    }}
                                  >
                                    <span>+ Drop widget here</span>
                                  </div>
                                )}
                                <div className="w-full max-w-full min-w-0 box-border">
                                  <DocumentBlock
                                    item={item}
                                    isSelected={isInteractivePreview && selectedItemId === item.id}
                                    onSelect={() => {
                                      if (isInteractivePreview) setSelectedItemId(item.id);
                                    }}
                                    onUpdate={handleUpdateBlockInPreview}
                                    onDelete={() => handleDeleteBlockInPreview(item.id)}
                                    onDuplicate={() => handleDuplicateBlockInPreview(item)}
                                    onMoveUp={() => handleMoveItem(item.id, "up")}
                                    onMoveDown={() => handleMoveItem(item.id, "down")}
                                    isFirst={itemIndex === 0}
                                    isLast={itemIndex === pageItems.length - 1}
                                    preview={!isInteractivePreview}
                                    resolveVariables={resolveVariables}
                                    selection={selection}
                                    onSelectPart={(part) => setSelection({ blockId: item.id, part })}
                                    onOpenHtmlEditor={() => {}}
                                  />
                                </div>
                              </React.Fragment>
                            ))}
                            {isInteractivePreview && (
                              <div
                                className={`drop-zone end no-print ${
                                  dragOverTarget?.pageIndex === pageIndex &&
                                  dragOverTarget?.itemIndex === pageItems.length
                                    ? "active"
                                    : ""
                                }`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setDragOverTarget({ pageIndex, itemIndex: pageItems.length });
                                }}
                                onDragLeave={() => setDragOverTarget(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  handleDropInPreview(e, pageIndex, pageItems.length);
                                }}
                              >
                                <span>+ Drop widget here</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </article>
                  </div>
                );
              })}
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
        )}
      </div>
    </div>
  );
}
