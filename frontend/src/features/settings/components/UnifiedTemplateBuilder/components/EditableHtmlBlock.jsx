import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  RemoveFormatting,
  Palette,
  Code2,
} from "lucide-react";
import { sanitizeHtml, scopeCss } from "../core/htmlSanitizer";

export default function EditableHtmlBlock({
  item,
  preview = false,
  isSelected = false,
  onSelect = () => {},
  onItem = () => {},
  onOpenHtmlEditor = () => {},
}) {
  const containerRef = useRef(null);
  const isTypingRef = useRef(false);
  const savedRangeRef = useRef(null);

  const [showToolbar, setShowToolbar] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    alignLeft: true,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    bulletList: false,
    numberList: false,
    foreColor: "#0f172a",
    hiliteColor: "#fef08a",
  });

  const scopeClass = `html-doc-${(item.id || "item").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const rawHtml = item.htmlContent || item.content || "";
  const rawCss = item.cssContent || "";

  const { cleanHtml } = useMemo(() => sanitizeHtml(rawHtml), [rawHtml]);
  const scopedCss = useMemo(() => {
    return rawCss ? scopeCss(rawCss, scopeClass) : "";
  }, [rawCss, scopeClass]);

  const lastSyncedHtmlRef = useRef(cleanHtml);

  // Sync external HTML changes into contentEditable
  useEffect(() => {
    if (!containerRef.current) return;
    if (!isTypingRef.current || cleanHtml !== lastSyncedHtmlRef.current) {
      if (containerRef.current.innerHTML !== cleanHtml) {
        containerRef.current.innerHTML = cleanHtml;
      }
      lastSyncedHtmlRef.current = cleanHtml;
    }
  }, [cleanHtml]);

  const syncContent = () => {
    if (!containerRef.current) return;
    const currentInner = containerRef.current.innerHTML;
    const sanitized = sanitizeHtml(currentInner).cleanHtml;
    lastSyncedHtmlRef.current = sanitized;
    if (sanitized !== item.htmlContent) {
      onItem({
        htmlContent: sanitized,
        content: sanitized,
      });
    }
  };

  const saveSelection = () => {
    if (!containerRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const anchor = sel.anchorNode;
    if (anchor && containerRef.current.contains(anchor)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSavedRange = () => {
    if (!containerRef.current || !savedRangeRef.current) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    try {
      if (
        containerRef.current.contains(
          savedRangeRef.current.commonAncestorContainer
        )
      ) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
        return true;
      }
    } catch {
      // Ignore
    }
    return false;
  };

  const updateFormatStatus = () => {
    saveSelection();
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strike: document.queryCommandState("strikeThrough"),
        alignLeft: document.queryCommandState("justifyLeft"),
        alignCenter: document.queryCommandState("justifyCenter"),
        alignRight: document.queryCommandState("justifyRight"),
        alignJustify: document.queryCommandState("justifyFull"),
        bulletList: document.queryCommandState("insertUnorderedList"),
        numberList: document.queryCommandState("insertOrderedList"),
        foreColor: "#0f172a",
        hiliteColor: "#fef08a",
      });
    } catch {
      // Ignore
    }
  };

  const exec = (command, value = null) => {
    restoreSavedRange();
    if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
      containerRef.current.focus();
    }
    document.execCommand(command, false, value);
    saveSelection();
    updateFormatStatus();
    syncContent();
  };

  return (
    <div
      className={`relative rounded-xl transition-all border ${
        isSelected
          ? "border-blue-500 shadow-sm ring-2 ring-blue-500/10"
          : "border-slate-200 hover:border-slate-300"
      } ${preview ? "border-transparent" : "bg-white"}`}
      onClick={(e) => {
        if (!preview) {
          e.stopPropagation();
          onSelect();
          setShowToolbar(true);
        }
      }}
    >
      {scopedCss && <style>{scopedCss}</style>}

      {/* Floating Toolbar */}
      {!preview && isSelected && (
        <div
          className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-slate-900 text-white rounded-t-xl text-xs select-none shadow-lg animate-in fade-in duration-150"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                activeFormats.bold ? "bg-blue-600 text-white font-bold" : "hover:bg-slate-800 text-slate-300"
              }`}
              onClick={() => exec("bold")}
              title="Bold"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                activeFormats.italic ? "bg-blue-600 text-white italic" : "hover:bg-slate-800 text-slate-300"
              }`}
              onClick={() => exec("italic")}
              title="Italic"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                activeFormats.underline ? "bg-blue-600 text-white underline" : "hover:bg-slate-800 text-slate-300"
              }`}
              onClick={() => exec("underline")}
              title="Underline"
            >
              <Underline size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                activeFormats.strike ? "bg-blue-600 text-white line-through" : "hover:bg-slate-800 text-slate-300"
              }`}
              onClick={() => exec("strikeThrough")}
              title="Strikethrough"
            >
              <Strikethrough size={13} />
            </button>

            <span className="w-px h-4 bg-slate-700 mx-1" />

            <button
              type="button"
              className={`p-1.5 rounded ${activeFormats.alignLeft ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-300"}`}
              onClick={() => exec("justifyLeft")}
              title="Align Left"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${activeFormats.alignCenter ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-300"}`}
              onClick={() => exec("justifyCenter")}
              title="Align Center"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${activeFormats.alignRight ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-300"}`}
              onClick={() => exec("justifyRight")}
              title="Align Right"
            >
              <AlignRight size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${activeFormats.alignJustify ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-300"}`}
              onClick={() => exec("justifyFull")}
              title="Justify"
            >
              <AlignJustify size={13} />
            </button>

            <span className="w-px h-4 bg-slate-700 mx-1" />

            <button
              type="button"
              className={`p-1.5 rounded ${activeFormats.bulletList ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-300"}`}
              onClick={() => exec("insertUnorderedList")}
              title="Bullet List"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${activeFormats.numberList ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-300"}`}
              onClick={() => exec("insertOrderedList")}
              title="Numbered List"
            >
              <ListOrdered size={13} />
            </button>
            <button
              type="button"
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300"
              onClick={() => exec("removeFormat")}
              title="Clear Formatting"
            >
              <RemoveFormatting size={13} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
              onClick={() => onOpenHtmlEditor(item)}
              title="Open full HTML/CSS code editor"
            >
              <Code2 size={13} />
              <span>Edit HTML/CSS</span>
            </button>
          </div>
        </div>
      )}

      {/* WYSIWYG Content Area */}
      <div
        ref={containerRef}
        contentEditable={!preview}
        suppressContentEditableWarning
        className={`p-4 outline-none min-h-[60px] text-xs ${scopeClass} ${
          preview ? "cursor-default" : "cursor-text"
        }`}
        onInput={() => {
          isTypingRef.current = true;
          syncContent();
        }}
        onBlur={() => {
          isTypingRef.current = false;
          syncContent();
        }}
        onKeyUp={updateFormatStatus}
        onMouseUp={updateFormatStatus}
      />
    </div>
  );
}
