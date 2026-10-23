import { getDocumentSurfaceStyle } from '../../../../../../../shared/template-builder/core/documentPresentation';
import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import DocumentBlock from "./DocumentBlock";
import { getPageDimensions } from "../model/templateModel";
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
  Mail,
  MessageSquare,
  CircleAlert,
  Tag,
  Receipt,
} from "lucide-react";

function ScaledPageFrame({ width, zoom, minHeight, children }) {
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);
  const scale = zoom / 100;

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return undefined;

    const measureContentHeight = () => {
      const contentRect = content.getBoundingClientRect();
      let measuredHeight = Math.max(
        content.offsetHeight,
        (contentRect.bottom - contentRect.top) / scale
      );

      content.querySelectorAll("*").forEach((element) => {
        const elementRect = element.getBoundingClientRect();
        measuredHeight = Math.max(
          measuredHeight,
          (elementRect.bottom - contentRect.top) / scale
        );
      });

      const nextHeight = Math.ceil(measuredHeight);
      setContentHeight((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight);
    };
    measureContentHeight();

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(measureContentHeight)
      : null;
    resizeObserver?.observe(content);
    content.querySelectorAll("*").forEach((element) => resizeObserver?.observe(element));

    const mutationObserver = typeof MutationObserver !== "undefined"
      ? new MutationObserver(() => {
          content.querySelectorAll("*").forEach((element) => resizeObserver?.observe(element));
          measureContentHeight();
        })
      : null;
    mutationObserver?.observe(content, { childList: true, subtree: true, attributes: true });

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [width, zoom, minHeight, scale]);

  return (
    <div
      className="page-sheet-scale-frame relative isolate shrink-0"
      style={{
        width: `${(width * zoom) / 100}px`,
        height: `${(Math.max(minHeight, contentHeight) * zoom) / 100}px`,
      }}
    >
      <div
        ref={contentRef}
        className="page-sheet-wrapper flex flex-col items-center"
        style={{
          width,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

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
  onMoveItemUp = () => {},
  onMoveItemDown = () => {},
  onToggleItemVisibility = () => {},
  selectedItem = null,
  documentSettings = {},
  onUpdateDocumentSettings = () => {},
  onDirectCreateItem = () => {},
}) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [addMenuPosition, setAddMenuPosition] = useState({ left: 8, top: 52 });
  const [toolbarTooltip, setToolbarTooltip] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [dragCreateBox, setDragCreateBox] = useState(null);
  const canvasViewportRef = useRef(null);
  const canvasType = modeConfig?.canvasType || "paged";
  const openAddMenu = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 288;
    const menuHeight = canvasType === "sms" ? 280 : 460;
    const maxLeft = Math.max(8, window.innerWidth - menuWidth - 8);
    setAddMenuPosition({
      left: Math.min(Math.max(rect.left, 8), maxLeft),
      top:
        rect.bottom + menuHeight + 8 <= window.innerHeight
          ? rect.bottom + 6
          : Math.max(8, rect.top - menuHeight - 6),
    });
    setIsAddMenuOpen(true);
  };
  const toggleAddMenu = (event) => {
    if (isAddMenuOpen) {
      setIsAddMenuOpen(false);
    } else {
      openAddMenu(event);
    }
  };
  const updateToolbarTooltip = (event) => {
    const button = event.target.closest?.("button[title], button[aria-label]");
    if (!button || !event.currentTarget.contains(button)) return;

    const label = button.getAttribute("title") || button.getAttribute("aria-label");
    if (!label) return;

    const rect = button.getBoundingClientRect();
    const showBelow = rect.bottom + 36 < window.innerHeight;
    const tooltipWidth = Math.min(
      window.innerWidth - 16,
      Math.max(90, label.length * 6.5 + 16)
    );
    setToolbarTooltip({
      label,
      left: Math.max(
        8,
        Math.min(
          rect.left + (rect.width - tooltipWidth) / 2,
          window.innerWidth - tooltipWidth - 8
        )
      ),
      top: showBelow ? rect.bottom + 8 : rect.top - 8,
      placement: showBelow ? "below" : "above",
    });
  };
  const renderToolbarTooltip = () => {
    if (!toolbarTooltip || typeof document === "undefined") return null;
    return createPortal(
      <div
        role="tooltip"
        className={`canvas-toolbar-tooltip canvas-toolbar-tooltip-${toolbarTooltip.placement}`}
        style={{ left: toolbarTooltip.left, top: toolbarTooltip.top }}
      >
        {toolbarTooltip.label}
      </div>,
      document.body
    );
  };
  const getCanvasAvailableSize = () => {
    const viewport = canvasViewportRef.current;
    if (!viewport) return null;

    const styles = window.getComputedStyle(viewport);
    const horizontalPadding =
      (Number.parseFloat(styles.paddingLeft) || 0) +
      (Number.parseFloat(styles.paddingRight) || 0);
    const verticalPadding =
      (Number.parseFloat(styles.paddingTop) || 0) +
      (Number.parseFloat(styles.paddingBottom) || 0);

    return {
      width: Math.max(0, viewport.clientWidth - horizontalPadding),
      height: Math.max(0, viewport.clientHeight - verticalPadding),
    };
  };

  useEffect(() => {
    if (canvasType !== "paged" || devicePreview !== "desktop") return undefined;
    const viewport = canvasViewportRef.current;
    if (!viewport) return undefined;

    const baseWidth = pageSize === "Letter" ? 816 : 794;
    const baseHeight = pageSize === "Letter" ? 1056 : pageSize === "Legal" ? 1344 : 1123;
    const isLandscape = String(orientation).toLowerCase() === "landscape";
    const pageWidth = isLandscape ? baseHeight : baseWidth;
    const pageHeight = isLandscape ? baseWidth : baseHeight;
    const fitToViewport = () => {
      const styles = window.getComputedStyle(viewport);
      const horizontalPadding =
        (Number.parseFloat(styles.paddingLeft) || 0) +
        (Number.parseFloat(styles.paddingRight) || 0);
      const verticalPadding =
        (Number.parseFloat(styles.paddingTop) || 0) +
        (Number.parseFloat(styles.paddingBottom) || 0);
      const availableWidth = viewport.clientWidth - horizontalPadding;
      const availableHeight = viewport.clientHeight - verticalPadding;
      if (availableWidth <= 0 || availableHeight <= 0) return;

      const fitWidth = (availableWidth / pageWidth) * 92;
      const fitHeight = (availableHeight / pageHeight) * 92;
      const fit = Math.min(100, Math.max(30, Math.round(Math.min(fitWidth, fitHeight))));
      onZoomChange(fit);
    };

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fitToViewport) : null;
    observer?.observe(viewport);
    const resizeFrame = window.requestAnimationFrame(fitToViewport);
    if (!observer) window.addEventListener("resize", fitToViewport);

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      if (!observer) window.removeEventListener("resize", fitToViewport);
    };
  }, [canvasType, devicePreview, pageSize, orientation, onZoomChange]);

  // Mouse Drag & Click Interactive Creation on Blank Canvas
  const handleSheetMouseDown = (e, pageIndex, isEmail = false) => {
    if (e.button !== 0) return;
    if (e.target.closest("button, input, textarea, a, select, [contenteditable='true'], .kargoflow-block")) {
      return;
    }
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const scaleFactor = (zoom || 100) / 100;
    const relX = (e.clientX - rect.left) / scaleFactor;
    const relY = (e.clientY - rect.top) / scaleFactor;

    setDragCreateBox({
      pageIndex,
      isEmail,
      container,
      startX: relX,
      startY: relY,
      currentX: relX,
      currentY: relY,
      isDragging: false,
    });
  };

  useEffect(() => {
    if (!dragCreateBox) return;

    const handleMouseMove = (e) => {
      const rect = dragCreateBox.container.getBoundingClientRect();
      const scaleFactor = (zoom || 100) / 100;
      const relX = (e.clientX - rect.left) / scaleFactor;
      const relY = (e.clientY - rect.top) / scaleFactor;

      const dx = Math.abs(relX - dragCreateBox.startX);
      const dy = Math.abs(relY - dragCreateBox.startY);

      setDragCreateBox((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentX: relX,
          currentY: relY,
          isDragging: prev.isDragging || dx > 15 || dy > 15,
        };
      });
    };

    const handleMouseUp = () => {
      if (dragCreateBox) {
        const dx = Math.abs(dragCreateBox.currentX - dragCreateBox.startX);
        const dy = Math.abs(dragCreateBox.currentY - dragCreateBox.startY);
        const wasDragging = dragCreateBox.isDragging || dx > 20 || dy > 20;

        if (wasDragging) {
          const height = Math.max(40, Math.round(dy));
          const created = onDirectCreateItem(
            {
              type: "text",
              label: "Text Block",
              content: "",
              style: {
                minHeight: `${height}px`,
                fontSize: documentSettings?.fontSize || 13,
              },
            },
            dragCreateBox.pageIndex
          );
          if (!created && onAddWidgetClick) {
            onAddWidgetClick({ type: "text", label: "Text Block" });
          }
        } else {
          // Single click on empty page -> Click-to-type: Create text box immediately!
          const created = onDirectCreateItem(
            {
              type: "text",
              label: "Text Block",
              content: "",
              style: {
                fontSize: documentSettings?.fontSize || 13,
              },
            },
            dragCreateBox.pageIndex
          );
          if (!created && onAddWidgetClick) {
            onAddWidgetClick({ type: "text", label: "Text Block" });
          }
        }
        setDragCreateBox(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragCreateBox, zoom, onDirectCreateItem, onAddWidgetClick, documentSettings]);

  // 1. SMS Simulator Canvas
  if (canvasType === "sms") {
    const analysis = analyzeSmsText(smsText);
    const isMobile = devicePreview === "mobile";
    const isTablet = devicePreview === "tablet";
    const smsWidth = isMobile ? 340 : isTablet ? 560 : 600;

    return (
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-slate-200/60">
        {/* Secondary Canvas Toolbar for SMS */}
        <div
          className="h-11 border-b border-slate-200 bg-white/95 backdrop-blur-xs px-3 sm:px-4 flex items-center justify-between text-xs select-none shadow-2xs z-10 shrink-0 overflow-x-auto no-scrollbar gap-2 sm:gap-4"
          onMouseOver={updateToolbarTooltip}
          onFocusCapture={updateToolbarTooltip}
          onMouseLeave={() => setToolbarTooltip(null)}
          onBlurCapture={() => setToolbarTooltip(null)}
          onClickCapture={() => setToolbarTooltip(null)}
          onScroll={() => setToolbarTooltip(null)}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="gdoc-tooltip-container">
              <div
                className="flex items-center gap-1.5 px-2 py-1 text-slate-600 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                title="SMS Dispatch Simulator · GSM-7 & UCS-2"
              >
                <MessageSquare size={14} className="text-emerald-600" />
                <span>SMS Simulator</span>
              </div>
              <div className="gdoc-tooltip">SMS Dispatch Simulator · GSM-7 & UCS-2</div>
            </div>

            <div className="h-4 w-px bg-slate-200 mx-0.5" />

            {/* Quick Variable Dropdown for SMS */}
            {!preview && (
              <div className="relative inline-flex items-center">
                <div className="gdoc-tooltip-container">
                  <button
                    type="button"
                    onClick={toggleAddMenu}
                    className={`h-8 inline-flex items-center justify-center gap-0.5 px-2 rounded-md transition ${
                      isAddMenuOpen ? "bg-emerald-100 text-emerald-700" : "hover:bg-slate-100 text-slate-700"
                    }`}
                    aria-label="Insert Variable Menu"
                    title="Insert Variable"
                    aria-expanded={isAddMenuOpen}
                  >
                    <Plus size={18} />
                    <ChevronDown size={13} className="text-slate-400" />
                  </button>
                  {!isAddMenuOpen && <div className="gdoc-tooltip">Insert Variable</div>}
                </div>

                {isAddMenuOpen && createPortal(
                  <>
                    <div
                      className="fixed inset-0 z-[70001]"
                      onClick={() => setIsAddMenuOpen(false)}
                    />
                    <div
                      className="add-component-dropdown-menu fixed w-64 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-2xl border border-slate-200/90 p-2 z-[70002] text-xs animate-in fade-in zoom-in-95 duration-100"
                      style={{ left: addMenuPosition.left, top: addMenuPosition.top }}
                    >
                      <div className="px-3 pt-1.5 pb-1 font-bold text-[10px] text-slate-400 uppercase tracking-wider select-none">
                        Merge Variables
                      </div>
                      {[
                        { token: "{{customer_name}}", label: "Customer Full Name" },
                        { token: "{{move_date}}", label: "Scheduled Move Date" },
                        { token: "{{estimate_number}}", label: "Estimate Number" },
                        { token: "{{company_name}}", label: "Company Name" },
                        { token: "{{company_phone}}", label: "Company Phone" },
                        { token: "{{crew_leader}}", label: "Assigned Crew Leader" },
                      ].map((item) => (
                        <button
                          key={item.token}
                          type="button"
                          onClick={() => {
                            setIsAddMenuOpen(false);
                            onSmsTextChange?.(smsText ? `${smsText} ${item.token}` : item.token);
                          }}
                          className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition rounded-lg text-left"
                        >
                          <span className="font-medium text-xs">{item.label}</span>
                          <code className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-500">
                            {item.token}
                          </code>
                        </button>
                      ))}
                    </div>
                  </>,
                  document.body
                )}
              </div>
            )}

            {/* Quick Variable Tag Shortcut */}
            {!preview && (
              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={openAddMenu}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-700 transition"
                  aria-label="Insert Variable Tag"
                  title="Insert Variable Tag"
                >
                  <Tag size={18} />
                </button>
                <div className="gdoc-tooltip">Insert Variable Tag</div>
              </div>
            )}

            <div className="h-4 w-px bg-slate-200 mx-0.5" />

            <div className="gdoc-tooltip-container">
              <span
                className="text-slate-500 text-xs font-medium px-2 py-0.5 bg-slate-50 border border-slate-200 rounded"
                title={`Carrier payload: ${analysis.charCount} characters across ${analysis.segments} SMS segment(s)`}
              >
                {analysis.charCount} chars · {analysis.segments} segment{analysis.segments === 1 ? "" : "s"} ({analysis.encoding})
              </span>
              <div className="gdoc-tooltip">
                Carrier payload: {analysis.charCount} characters across {analysis.segments} SMS segment(s)
              </div>
            </div>
          </div>

          {/* Center: Device Switcher (Desktop 600px / Tablet 560px / Mobile 340px) & Font Size Stepper */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() => onDevicePreviewChange("desktop")}
                  className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition ${
                    devicePreview === "desktop" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Desktop preview"
                  aria-label="Desktop preview"
                >
                  <Monitor size={17} />
                </button>
                <div className="gdoc-tooltip">Desktop (600px)</div>
              </div>

              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() => onDevicePreviewChange("tablet")}
                  className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition ${
                    devicePreview === "tablet" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Tablet preview"
                  aria-label="Tablet preview"
                >
                  <Tablet size={17} />
                </button>
                <div className="gdoc-tooltip">Tablet (560px)</div>
              </div>

              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() => onDevicePreviewChange("mobile")}
                  className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition ${
                    devicePreview === "mobile" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Mobile preview"
                  aria-label="Mobile preview"
                >
                  <Smartphone size={17} />
                </button>
                <div className="gdoc-tooltip">Mobile (340px)</div>
              </div>
            </div>

            {/* Quick Font Size Stepper for SMS */}
            <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDocumentSettings({
                      ...documentSettings,
                      fontSize: Math.max(10, (documentSettings?.fontSize || 13) - 1),
                    })
                  }
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white text-slate-700 transition"
                  title="Decrease message font size"
                  aria-label="Decrease message font size"
                >
                  <Minus size={14} />
                </button>
                <div className="gdoc-tooltip">Decrease message font size</div>
              </div>

              <span className="text-xs font-semibold text-slate-600 px-1.5 min-w-[36px] text-center select-none font-mono">
                {documentSettings?.fontSize || 13}px
              </span>

              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDocumentSettings({
                      ...documentSettings,
                      fontSize: Math.min(24, (documentSettings?.fontSize || 13) + 1),
                    })
                  }
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white text-slate-700 transition"
                  title="Increase message font size"
                  aria-label="Increase message font size"
                >
                  <Plus size={14} />
                </button>
                <div className="gdoc-tooltip">Increase message font size</div>
              </div>
            </div>
          </div>

          {/* Right: Standardized Zoom Tools */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() => onZoomChange(Math.max(50, zoom - 10))}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white text-slate-700 transition"
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
                  onClick={() => onZoomChange(Math.min(150, zoom + 10))}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white text-slate-700 transition"
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
                onClick={() => onZoomChange(100)}
                className="h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
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
                onClick={() => onZoomChange(90)}
                className="h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
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
                className="h-8 w-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                title="Reset Zoom (100%)"
                aria-label="Reset Zoom"
              >
                <RotateCcw size={17} />
              </button>
              <div className="gdoc-tooltip">Reset zoom (100%)</div>
            </div>
          </div>
        </div>
        {renderToolbarTooltip()}

        <div
          className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain bg-slate-200/60 p-4 sm:p-8 flex flex-col items-center justify-start"
          data-testid="template-canvas-viewport"
        >
          <ScaledPageFrame width={smsWidth} zoom={zoom} minHeight={0}>
            <div className="flex flex-col items-center transition-all duration-200 w-full max-w-full">
            {/* Clean White Card Container (Dynamic Responsive Width: 600px Desktop / 560px Tablet / 340px Mobile) */}
            <div
              style={{
                width: smsWidth,
                transition: "width 0.2s ease",
              }}
              className="w-full max-w-[min(600px,calc(100vw-1.5rem))] bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col animate-in fade-in duration-150"
            >
              {/* Clean Header Bar */}
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                </div>
              </div>

              {/* Message Display Area */}
              <div className="p-5 flex-1 min-h-[220px] flex flex-col justify-between bg-white">
                <div className="py-2">
                  <div
                    style={{
                      maxWidth: isMobile ? "90%" : isTablet ? "78%" : "70%",
                      fontSize: documentSettings?.fontSize ? `${documentSettings.fontSize}px` : "13px",
                    }}
                    className="bg-blue-600 text-white p-3.5 rounded-2xl rounded-tr-xs shadow-xs leading-relaxed ml-auto break-words whitespace-pre-wrap"
                  >
                    {smsText || "Compose your SMS message below or select merge tags to insert dynamic fields..."}
                  </div>
                  <div className="text-right text-[10px] text-slate-400 mt-1 pr-1">Just now</div>
                </div>

                {/* Textarea Input Inside Card */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <textarea
                    value={smsText}
                    onChange={(e) => onSmsTextChange(e.target.value)}
                    placeholder="Type SMS message or insert variable tags from the toolbox..."
                    rows={3}
                    style={{
                      fontSize: documentSettings?.fontSize ? `${documentSettings.fontSize}px` : "13px",
                    }}
                    className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white resize-none text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Telecom Compliance Metrics */}
            <div
              style={{ width: smsWidth }}
              className="mt-6 w-full max-w-[min(600px,calc(100vw-1.5rem))] bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs text-xs space-y-2 transition-all duration-200"
            >
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
          </ScaledPageFrame>
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
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-slate-200/60">
        {/* Secondary Canvas Toolbar for Email */}
        <div
          className="h-11 border-b border-slate-200 bg-white/95 backdrop-blur-xs px-3 sm:px-4 flex items-center justify-between text-xs select-none shadow-2xs z-10 shrink-0 overflow-x-auto no-scrollbar gap-2 sm:gap-4"
          onMouseOver={updateToolbarTooltip}
          onFocusCapture={updateToolbarTooltip}
          onMouseLeave={() => setToolbarTooltip(null)}
          onBlurCapture={() => setToolbarTooltip(null)}
          onClickCapture={() => setToolbarTooltip(null)}
          onScroll={() => setToolbarTooltip(null)}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Email Format & Dimensions Badge */}
            <div className="gdoc-tooltip-container">
              <div
                className="flex items-center gap-1.5 px-2 py-1 text-slate-600 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
                title={`Email preview: Responsive width (${emailWidth}px)`}
              >
                <Mail size={14} className="text-blue-600" />
                <span>Email (Responsive)</span>
              </div>
              <div className="gdoc-tooltip">Email preview: Responsive width ({emailWidth}px)</div>
            </div>

            <div className="h-4 w-px bg-slate-200 mx-0.5" />

            {/* Direct Add Section Block Button */}
            {!preview && (
              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() => onAddWidgetClick({ label: "Text Block", type: "text" })}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-700 transition"
                  aria-label="Add Section Block"
                  title="Add Section Block"
                >
                  <Plus size={18} />
                </button>
                <div className="gdoc-tooltip">Add Section Block</div>
              </div>
            )}

            {/* Quick Add Component Menu Button for Email */}
            {!preview && (
              <div className="relative inline-flex items-center">
                <div className="gdoc-tooltip-container">
                  <button
                    type="button"
                    onClick={toggleAddMenu}
                    className={`h-8 inline-flex items-center justify-center gap-0.5 px-2 rounded-md transition ${
                      isAddMenuOpen ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-700"
                    }`}
                    aria-label="Add Component Menu"
                    title="Add Component"
                    aria-expanded={isAddMenuOpen}
                  >
                    <Plus size={18} />
                    <ChevronDown size={13} className="text-slate-400" />
                  </button>
                  {!isAddMenuOpen && <div className="gdoc-tooltip">Add Component</div>}
                </div>

                {isAddMenuOpen && createPortal(
                  <>
                    <div
                      className="fixed inset-0 z-[70001]"
                      onClick={() => setIsAddMenuOpen(false)}
                    />
                    <div
                      className="add-component-dropdown-menu fixed w-72 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-2xl border border-slate-200/90 p-2 z-[70002] text-xs animate-in fade-in zoom-in-95 duration-100 max-h-[460px] overflow-y-auto"
                      style={{ left: addMenuPosition.left, top: addMenuPosition.top }}
                    >
                      <div className="px-3 pt-1.5 pb-1 font-bold text-[10px] text-slate-400 uppercase tracking-wider select-none">
                        Email Content & Widgets
                      </div>

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
                          <small className="text-[10.5px] text-slate-400 truncate">Prominent heading title</small>
                        </div>
                      </button>

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
                          <small className="text-[10.5px] text-slate-400 truncate">Editable email paragraph copy</small>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAddMenuOpen(false);
                          onAddWidgetClick({ label: "Callout Box", type: "callout" });
                        }}
                        className="add-component-item w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition rounded-lg text-left cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center shrink-0 transition">
                          <CircleAlert size={16} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <b className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 leading-snug">Highlight Callout</b>
                          <small className="text-[10.5px] text-slate-400 truncate">Important notice or banner box</small>
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
                          <small className="text-[10.5px] text-slate-400 truncate">Interactive data grid & charges</small>
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
                  </>,
                  document.body
                )}
              </div>
            )}

            {/* Direct Layout & Table Shortcuts for Email */}
            {!preview && (
              <div className="flex items-center gap-1">
                <div className="gdoc-tooltip-container">
                  <button
                    type="button"
                    onClick={onInsertLayout}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-700 transition"
                    aria-label="Custom Layout"
                    title="Custom Layout"
                  >
                    <Layout size={18} />
                  </button>
                  <div className="gdoc-tooltip">Custom Layout</div>
                </div>

                <div className="gdoc-tooltip-container">
                  <button
                    type="button"
                    onClick={onInsertTable}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-700 transition"
                    aria-label="Insert Table"
                    title="Insert Table"
                  >
                    <Table size={18} />
                  </button>
                  <div className="gdoc-tooltip">Insert Table</div>
                </div>
              </div>
            )}
          </div>

          {/* Center/Right: Device Switchers & Zoom Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Device Switcher (Desktop 600px / Tablet 560px / Mobile 360px) */}
            <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() => onDevicePreviewChange("desktop")}
                  className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition ${
                    devicePreview === "desktop" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Desktop preview"
                  aria-label="Desktop preview"
                >
                  <Monitor size={17} />
                </button>
                <div className="gdoc-tooltip">Desktop preview (600px)</div>
              </div>

              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() => onDevicePreviewChange("tablet")}
                  className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition ${
                    devicePreview === "tablet" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Tablet preview"
                  aria-label="Tablet preview"
                >
                  <Tablet size={17} />
                </button>
                <div className="gdoc-tooltip">Tablet preview (560px)</div>
              </div>

              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() => onDevicePreviewChange("mobile")}
                  className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition ${
                    devicePreview === "mobile" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Mobile preview"
                  aria-label="Mobile preview"
                >
                  <Smartphone size={17} />
                </button>
                <div className="gdoc-tooltip">Mobile preview (360px)</div>
              </div>
            </div>

            {/* Standardized Zoom Tools */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
                <div className="gdoc-tooltip-container">
                  <button
                    type="button"
                    onClick={() => onZoomChange(Math.max(40, zoom - 10))}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white text-slate-700 transition"
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
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white text-slate-700 transition"
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
                  onClick={() => onZoomChange(100)}
                  className="h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
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
                  onClick={() => onZoomChange(90)}
                  className="h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
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
                  className="h-8 w-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
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

        {renderToolbarTooltip()}

        <div
          className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain bg-slate-200/60 p-4 sm:p-8 flex flex-col items-center justify-start select-none"
          data-testid="template-canvas-viewport"
        >
          <ScaledPageFrame width={emailWidth} zoom={zoom} minHeight={700}>
            <div
              data-template-document
              style={{
                fontFamily: documentSettings.fontFamily || "Inter, system-ui, sans-serif",
                fontSize: documentSettings?.fontSize ? `${documentSettings.fontSize}px` : undefined,
              }}
              className="w-full max-w-[min(600px,calc(100vw-1.5rem))] bg-white min-h-[700px] shadow-lg rounded-lg border border-slate-200 p-4 sm:p-6 space-y-4 transition-all duration-300 relative select-none"
            >
            {/* Marquee Drag Box Selection Overlay for Email */}
            {dragCreateBox?.isDragging && dragCreateBox.isEmail && (
              <div
                className="absolute pointer-events-none border-2 border-dashed border-blue-600 bg-blue-500/15 rounded-lg z-30 transition-none flex items-center justify-center shadow-lg"
                style={{
                  left: Math.min(dragCreateBox.startX, dragCreateBox.currentX),
                  top: Math.min(dragCreateBox.startY, dragCreateBox.currentY),
                  width: Math.abs(dragCreateBox.currentX - dragCreateBox.startX),
                  height: Math.abs(dragCreateBox.currentY - dragCreateBox.startY),
                }}
              >
                <div className="bg-blue-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-md flex items-center gap-1.5 select-none">
                  <Type size={12} />
                  <span>New Text Box ({Math.round(Math.abs(dragCreateBox.currentX - dragCreateBox.startX))} × {Math.round(Math.abs(dragCreateBox.currentY - dragCreateBox.startY))}px)</span>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div
                onMouseDown={(e) => handleSheetMouseDown(e, 0, true)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDropInPage(e, 0, 0);
                }}
                className="min-h-[300px] h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300/80 rounded-xl bg-slate-50/50 hover:bg-blue-50/20 hover:border-blue-400 transition-all p-6 text-center select-none cursor-crosshair"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Mail size={20} />
                </div>
                <p className="text-xs font-bold text-slate-700">Email Canvas is Empty</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Drag widgets from the left sidebar or click below to start building your email.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => onAddWidgetClick({ type: "heading", label: "Heading" })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                    aria-label="Add Heading"
                  >
                    <Plus size={13} />
                    <span>Add Heading</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddWidgetClick({ type: "text", label: "Text Block" })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition"
                    aria-label="Add Text"
                  >
                    <Plus size={13} />
                    <span>Add Text Block</span>
                  </button>
                </div>
              </div>
            ) : (
              items.map((item, index) => (
                <DocumentBlock
                  key={item.id}
                  item={item}
                  isSelected={selectedItemId === item.id}
                  onSelect={() => onSelectItem(item.id)}
                  onUpdate={(patch) => onUpdateItem(patch)}
                  onDelete={() => onDeleteItem(item.id)}
                  onDuplicate={() => onDuplicateItem(item)}
                  onMoveUp={() => onMoveItemUp(item.id)}
                  onMoveDown={() => onMoveItemDown(item.id)}
                  onToggleVisibility={() => onToggleItemVisibility(item.id)}
                  isFirst={index === 0}
                  isLast={index === items.length - 1}
                  preview={preview}
                  resolveVariables={resolveVariables}
                  selection={selection}
                  onSelectPart={(part) => onSelectPart(item.id, part)}
                  onOpenHtmlEditor={onOpenHtmlEditor}
                />
              ))
            )}
            </div>
          </ScaledPageFrame>
        </div>
      </div>
    );
  }

  // 3. Multi-Page Print Canvas (Letter / A4 / Legal)
  const isLandscape = String(orientation).toLowerCase() === "landscape";
  const { width: pageWidth, height: pageMinHeight } = getPageDimensions(pageSize, orientation);

  // Normalized document pages stack
  const docPages =
    pages && Array.isArray(pages) && pages.length > 0
      ? pages
      : [{ id: "page-1", name: "Page 1", items: items || [] }];

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-slate-200/60">
      {/* Secondary Canvas Toolbar */}
    <div
      className="h-11 border-b border-slate-200 bg-white/95 backdrop-blur-xs px-3 sm:px-4 flex items-center justify-between text-xs select-none shadow-2xs z-10 shrink-0 overflow-x-auto no-scrollbar gap-2 sm:gap-4"
      onMouseOver={updateToolbarTooltip}
      onFocusCapture={updateToolbarTooltip}
      onMouseLeave={() => setToolbarTooltip(null)}
      onBlurCapture={() => setToolbarTooltip(null)}
      onClickCapture={() => setToolbarTooltip(null)}
      onScroll={() => setToolbarTooltip(null)}
    >
      <div className="flex items-center gap-1.5 shrink-0">
          {/* Document Format & Dimensions Badge */}
          <div className="gdoc-tooltip-container tooltip-left">
            <div
              className="flex items-center gap-1.5 px-2 py-1 text-slate-600 bg-slate-50 border border-slate-200 rounded text-xs font-semibold"
              title={`Document preview: ${pageSize} · ${orientation}`}
            >
              <FileText size={14} className="text-blue-600" />
              <span>{pageSize}</span>
            </div>
            <div className="gdoc-tooltip tooltip-left">Document preview: {pageSize} · {orientation}</div>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* 1-Click Rotate Page Orientation Button */}
          <div className="gdoc-tooltip-container">
            <button
              type="button"
              onClick={onToggleOrientation}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-700 transition ${
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
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-700 transition"
                aria-label="Add Blank Page"
                title={`Add Blank Page (${pageSize})`}
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
                  onClick={toggleAddMenu}
                  className={`h-8 inline-flex items-center justify-center gap-0.5 px-2 rounded-md transition ${
                    isAddMenuOpen ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100 text-slate-700"
                  }`}
                  aria-label="Add Component Menu"
                  title="Add Component"
                  aria-expanded={isAddMenuOpen}
                >
                  <Plus size={18} />
                  <ChevronDown size={13} className="text-slate-400" />
                </button>
                {!isAddMenuOpen && <div className="gdoc-tooltip">Add Component</div>}
              </div>

              {isAddMenuOpen && createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[70001]"
                    onClick={() => setIsAddMenuOpen(false)}
                  />
                  <div
                    className="add-component-dropdown-menu fixed w-72 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-2xl border border-slate-200/90 p-2 z-[70002] text-xs animate-in fade-in zoom-in-95 duration-100 max-h-[460px] overflow-y-auto"
                    style={{ left: addMenuPosition.left, top: addMenuPosition.top }}
                  >
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
                </>,
                document.body
              )}
            </div>
          )}

          {/* Direct Layout & Table Shortcuts */}
          {!preview && (
            <div className="flex items-center gap-1.5">
              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={onInsertLayout}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-700 transition"
                  aria-label="Custom Layout"
                  title="Custom Layout"
                >
                  <Layout size={18} />
                </button>
                <div className="gdoc-tooltip">Custom Layout</div>
              </div>

              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={onInsertTable}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-700 transition"
                  aria-label="Insert Table"
                  title="Insert Table"
                >
                  <Table size={18} />
                </button>
                <div className="gdoc-tooltip">Insert Table</div>
              </div>
            </div>
          )}
        </div>

        {/* Center/Right: Device Switchers & Zoom Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Device Switcher (Desktop / Tablet / Mobile) */}
          <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
            <div className="gdoc-tooltip-container">
              <button
                type="button"
                onClick={() => onDevicePreviewChange("desktop")}
                className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition ${
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
                className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition ${
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
                className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition ${
                  devicePreview === "mobile" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Mobile view (375px)"
                aria-label="Mobile preview"
              >
                <Smartphone size={17} />
              </button>
              <div className="gdoc-tooltip">Mobile view </div>
            </div>
          </div>

          {/* Zoom Tools */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
              <div className="gdoc-tooltip-container">
                <button
                  type="button"
                  onClick={() => onZoomChange(Math.max(40, zoom - 10))}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white text-slate-700 transition"
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
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white text-slate-700 transition"
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
                onClick={() => {
                  const availableSize = getCanvasAvailableSize();
                  if (!availableSize || availableSize.width <= 0) return;

                  const fitW = Math.min(
                    150,
                    Math.max(30, Math.round((availableSize.width / pageWidth) * 92))
                  );
                  onZoomChange(fitW);
                }}
                className="h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
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
                onClick={() => {
                  const availableSize = getCanvasAvailableSize();
                  if (
                    !availableSize ||
                    availableSize.width <= 0 ||
                    availableSize.height <= 0
                  ) {
                    return;
                  }

                  const fitW = (availableSize.width / pageWidth) * 92;
                  const fitH = (availableSize.height / pageMinHeight) * 92;
                  const fit = Math.min(100, Math.max(30, Math.round(Math.min(fitW, fitH))));
                  onZoomChange(fit);
                }}
                className="h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
                title="Fit to Page"
                aria-label="Fit to Page"
              >
                <Maximize2 size={17} />
              </button>
              <div className="gdoc-tooltip">Fit to page</div>
            </div>

            <div className="gdoc-tooltip-container tooltip-right">
              <button
                type="button"
                onClick={() => onZoomChange(100)}
                className="h-8 w-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                title="Reset Zoom (100%)"
                aria-label="Reset Zoom"
              >
                <RotateCcw size={17} />
              </button>
              <div className="gdoc-tooltip tooltip-right">Reset zoom (100%)</div>
            </div>
          </div>
        </div>
      </div>

      {renderToolbarTooltip()}

      {/* Main Canvas Scroll Area */}
      <div
        ref={canvasViewportRef}
        className="document-canvas-scroll-area flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex items-start"
      >
        {devicePreview === "desktop" ? (
          <div className="flex flex-col items-center gap-16 min-w-fit m-auto" data-testid="document-page-stack">
            {docPages.map((page, pageIndex) => {
              const pageOrientation = page.orientation || orientation;
              const { width: currentPageWidth, height: currentPageHeight } = getPageDimensions(page.pageSize || pageSize, pageOrientation);

              return (
              <ScaledPageFrame
                key={page.id || `page-${pageIndex}`}
                width={currentPageWidth}
                zoom={zoom}
                minHeight={currentPageHeight + 30}
              >
                {/* Page Sheet Header */}
                <div className="page-sheet-header">
                  <div className="page-header-title-group">
                    <span className="page-badge">
                      {page.name || `Page ${pageIndex + 1}`}
                    </span>
                    <small className="page-subinfo">
                      {page.pageSize || pageSize} · {pageOrientation} (Page {pageIndex + 1} of{" "}
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
                  data-template-document
                  style={{
                    width: currentPageWidth,
                    minHeight: currentPageHeight,
                    ...getDocumentSurfaceStyle(documentSettings),
                  }}
                  className="bg-white shadow-xl rounded-sm p-12 space-y-6 transition-all box-border max-w-full overflow-x-hidden relative select-none"
                >
                  {/* Marquee Drag Box Selection Overlay */}
                  {dragCreateBox?.isDragging && dragCreateBox.pageIndex === pageIndex && (
                    <div
                      className="absolute pointer-events-none border-2 border-dashed border-blue-600 bg-blue-500/15 rounded-lg z-30 transition-none flex items-center justify-center shadow-lg"
                      style={{
                        left: Math.min(dragCreateBox.startX, dragCreateBox.currentX),
                        top: Math.min(dragCreateBox.startY, dragCreateBox.currentY),
                        width: Math.abs(dragCreateBox.currentX - dragCreateBox.startX),
                        height: Math.abs(dragCreateBox.currentY - dragCreateBox.startY),
                      }}
                    >
                      <div className="bg-blue-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-md flex items-center gap-1.5 select-none">
                        <Type size={12} />
                        <span>New Text Box ({Math.round(Math.abs(dragCreateBox.currentX - dragCreateBox.startX))} × {Math.round(Math.abs(dragCreateBox.currentY - dragCreateBox.startY))}px)</span>
                      </div>
                    </div>
                  )}

                  {(page.items || []).length === 0 ? (
                    <div
                      onMouseDown={(e) => handleSheetMouseDown(e, pageIndex)}
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
                      className={`min-h-[300px] h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all cursor-crosshair select-none p-8 ${
                        dragOverTarget?.pageIndex === pageIndex && dragOverTarget?.itemIndex === 0
                          ? "border-blue-500 bg-blue-50/50 text-blue-600 shadow-inner"
                          : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 text-slate-400"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-3 shadow-xs">
                        <Type size={22} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Blank Page {pageIndex + 1}</p>
                      <p className="text-xs text-slate-500 mt-1 text-center max-w-sm">
                        Click anywhere or drag your mouse across this sheet to create a customized text box.
                      </p>

                      {/* Quick Inserter Action Shortcuts */}
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDirectCreateItem({ type: "heading", label: "Heading" }, pageIndex);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold shadow-2xs transition"
                        >
                          <Plus size={13} className="text-blue-600" />
                          <span>Add Heading</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDirectCreateItem({ type: "text", label: "Text Block" }, pageIndex);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                        >
                          <Plus size={13} />
                          <span>Add Text Block</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertTable();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold shadow-2xs transition"
                        >
                          <Table size={13} className="text-purple-600" />
                          <span>Insert Table</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddWidgetClick({ label: "Itemized Charges Table", type: "charges" });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold shadow-2xs transition"
                        >
                          <Receipt size={13} className="text-emerald-600" />
                          <span>Add Charges</span>
                        </button>
                      </div>
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
                            onMoveUp={() => onMoveItemUp(item.id)}
                            onMoveDown={() => onMoveItemDown(item.id)}
                            onToggleVisibility={() => onToggleItemVisibility(item.id)}
                            isFirst={itemIndex === 0}
                            isLast={itemIndex === (page.items || []).length - 1}
                            preview={preview}
                            resolveVariables={resolveVariables}
                            selection={selection}
                            onSelectPart={(part) => onSelectPart(item.id, part)}
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
              </ScaledPageFrame>
              );
            })}
          </div>
        ) : (
          /* Mobile (375px) / Tablet (768px) Device Frame View */
          (() => {
            const viewportWidth = devicePreview === "mobile" ? 375 : 768;

            return (
              <div
                className="device-frame-scale-wrap"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                  marginBottom: `${Math.max(0, (devicePreview === "mobile" ? 780 : 960) * (zoom / 100 - 1))}px`,
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
                        marginBottom: "48px",
                      }}
                    >
                      <div className="device-page-tag">
                        <span>
                          Page {pageIndex + 1} of {docPages.length}
                        </span>
                        <small>
                          {devicePreview === "mobile"
                            ? `Mobile Viewport (${viewportWidth}px)`
                            : `Tablet Viewport (${viewportWidth}px)`}
                        </small>
                      </div>

                      <div
                        className={`document device-view-doc ${
                          devicePreview === "mobile" ? "mobile-viewport" : "tablet-viewport"
                        } bg-white shadow-md rounded-lg p-4 sm:p-6 space-y-6 box-border max-w-full`}
                        style={{
                          minHeight: "auto",
                          width: "100%",
                          fontFamily: documentSettings.fontFamily || "Inter, system-ui, sans-serif",
                fontSize: documentSettings?.fontSize ? `${documentSettings.fontSize}px` : undefined,
                        }}
                      >
                        {(page.items || []).length === 0 ? (
                          <div
                            onMouseDown={(e) => handleSheetMouseDown(e, pageIndex)}
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
                            className={`min-h-[220px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors cursor-crosshair select-none p-4 ${
                              dragOverTarget?.pageIndex === pageIndex && dragOverTarget?.itemIndex === 0
                                ? "border-blue-500 bg-blue-50/50 text-blue-600"
                                : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 text-slate-400"
                            }`}
                          >
                            <p className="text-sm font-semibold text-slate-700">Page {pageIndex + 1} is empty.</p>
                            <p className="text-xs text-slate-500 mt-1">Click or drag mouse to create a text box</p>
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
                                  onSelectPart={(part) => onSelectPart(item.id, part)}
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
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
