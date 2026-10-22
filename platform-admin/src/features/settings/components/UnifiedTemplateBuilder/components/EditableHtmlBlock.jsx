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
  Type,
  Code2,
} from "lucide-react";
import { prepareHtmlWidget, sanitizeHtml } from "../core/htmlSanitizer";

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
  const { cleanHtml, scopedCss } = useMemo(
    () => prepareHtmlWidget(item, scopeClass),
    [item, scopeClass]
  );

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
        ...item,
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

  const handleStyleChange = (val) => {
    restoreSavedRange();
    const sel = window.getSelection();
    if (!sel) return;
    const tagWithoutBrackets = val.replace(/[<>]/g, "").toLowerCase();
    const tagWithBrackets = `<${tagWithoutBrackets}>`;

    let success = false;
    try {
      success = document.execCommand("formatBlock", false, tagWithBrackets);
    } catch {
      // Ignore
    }
    if (!success) {
      try {
        success = document.execCommand("formatBlock", false, tagWithoutBrackets);
      } catch {
        // Ignore
      }
    }
    saveSelection();
    updateFormatStatus();
    syncContent();
  };

  const handleColorChange = (type, color) => {
    restoreSavedRange();
    if (containerRef.current) {
      containerRef.current.focus();
    }
    document.execCommand("styleWithCSS", false, "true");
    if (type === "foreColor") {
      document.execCommand("foreColor", false, color);
    } else {
      if (!document.execCommand("hiliteColor", false, color)) {
        document.execCommand("backColor", false, color);
      }
    }
    saveSelection();
    updateFormatStatus();
    syncContent();
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
      } ${preview ? "border-transparent" : "bg-white"} w-full max-w-full overflow-hidden`}
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
          className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-white text-slate-700 border border-slate-200 rounded-t-xl text-xs select-none shadow-md animate-in fade-in duration-150"
          onMouseDown={(e) => {
            const target = e.target;
            if (target.tagName !== "SELECT" && target.tagName !== "INPUT") {
              e.preventDefault();
            }
          }}
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                activeFormats.bold ? "bg-blue-600 text-white font-bold" : "hover:bg-slate-100 text-slate-600"
              }`}
              onClick={() => exec("bold")}
              title="Bold"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                activeFormats.italic ? "bg-blue-600 text-white italic" : "hover:bg-slate-100 text-slate-600"
              }`}
              onClick={() => exec("italic")}
              title="Italic"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                activeFormats.underline ? "bg-blue-600 text-white underline" : "hover:bg-slate-100 text-slate-600"
              }`}
              onClick={() => exec("underline")}
              title="Underline"
            >
              <Underline size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                activeFormats.strike ? "bg-blue-600 text-white line-through" : "hover:bg-slate-100 text-slate-600"
              }`}
              onClick={() => exec("strikeThrough")}
              title="Strikethrough"
            >
              <Strikethrough size={13} />
            </button>

            <span className="w-px h-4 bg-slate-200 mx-1" />

            {/* Block Style Dropdown */}
            <select
              value={activeFormats.style || ""}
              onMouseDown={(e) => {
                e.stopPropagation();
                saveSelection();
              }}
              onChange={(e) => handleStyleChange(e.target.value)}
              className="bg-white text-slate-700 text-[11px] font-medium border border-slate-200 rounded px-1.5 py-1 focus:outline-hidden cursor-pointer hover:bg-slate-50"
            >
              <option value="">Style...</option>
              <option value="<h1>">Heading 1</option>
              <option value="<h2>">Heading 2</option>
              <option value="<h3>">Heading 3</option>
              <option value="<h4>">Heading 4</option>
              <option value="<p>">Paragraph</option>
              <option value="<blockquote>">Quote</option>
            </select>

            <span className="w-px h-4 bg-slate-200 mx-1" />

            <button
              type="button"
              className={`p-1.5 rounded ${activeFormats.alignLeft ? "bg-blue-600 text-white" : "hover:bg-slate-100 text-slate-600"}`}
              onClick={() => exec("justifyLeft")}
              title="Align Left"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${activeFormats.alignCenter ? "bg-blue-600 text-white" : "hover:bg-slate-100 text-slate-600"}`}
              onClick={() => exec("justifyCenter")}
              title="Align Center"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${activeFormats.alignRight ? "bg-blue-600 text-white" : "hover:bg-slate-100 text-slate-600"}`}
              onClick={() => exec("justifyRight")}
              title="Align Right"
            >
              <AlignRight size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${activeFormats.alignJustify ? "bg-blue-600 text-white" : "hover:bg-slate-100 text-slate-600"}`}
              onClick={() => exec("justifyFull")}
              title="Justify"
            >
              <AlignJustify size={13} />
            </button>

            <span className="w-px h-4 bg-slate-200 mx-1" />

            <button
              type="button"
              className={`p-1.5 rounded ${activeFormats.bulletList ? "bg-blue-600 text-white" : "hover:bg-slate-100 text-slate-600"}`}
              onClick={() => exec("insertUnorderedList")}
              title="Bullet List"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${activeFormats.numberList ? "bg-blue-600 text-white" : "hover:bg-slate-100 text-slate-600"}`}
              onClick={() => exec("insertOrderedList")}
              title="Numbered List"
            >
              <ListOrdered size={13} />
            </button>

            <span className="w-px h-4 bg-slate-200 mx-1" />

            {/* Text Color Picker */}
            <label
              className="relative p-1.5 rounded hover:bg-slate-100 text-slate-600 cursor-pointer flex items-center"
              title="Text Color"
              onMouseDown={(e) => {
                e.stopPropagation();
                saveSelection();
              }}
            >
              <Type size={13} />
              <input
                type="color"
                value={activeFormats.foreColor || "#0f172a"}
                onChange={(e) => handleColorChange("foreColor", e.target.value)}
                className="sr-only"
              />
            </label>

            {/* Highlight Background Color Picker */}
            <label
              className="relative p-1.5 rounded hover:bg-slate-100 text-amber-500 cursor-pointer flex items-center"
              title="Highlight Color"
              onMouseDown={(e) => {
                e.stopPropagation();
                saveSelection();
              }}
            >
              <Palette size={13} />
              <input
                type="color"
                value={activeFormats.hiliteColor || "#fef08a"}
                onChange={(e) => handleColorChange("hiliteColor", e.target.value)}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
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
        className={`w-full min-w-0 box-border p-4 outline-none min-h-[60px] text-xs max-w-full overflow-x-auto [word-break:break-word] [&_img]:max-w-full [&_img]:h-auto [&_table]:max-w-full ${scopeClass} ${
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
