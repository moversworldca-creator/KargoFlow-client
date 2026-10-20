import React, { useRef, useState, useEffect } from "react";
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
  Link as LinkIcon,
  Table as TableIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Code,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  Sliders,
  Type,
  Palette,
} from "lucide-react";
import { compressImageFile } from "../core/storageService";

export default function NotesRichTextEditor({
  value = "",
  preview = false,
  isSelected = false,
  style = {},
  onSelect = () => {},
  onChange = () => {},
}) {
  const [showToolbar, setShowToolbar] = useState(false);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [currentFontSize, setCurrentFontSize] = useState("3");
  const [currentFontFamily, setCurrentFontFamily] = useState("Inter, sans-serif");
  const savedNotesRangeRef = useRef(null);
  const isTypingRef = useRef(false);

  const [activeNotesFormats, setActiveNotesFormats] = useState({
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
  });

  const saveNotesSelection = () => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const anchor = sel.anchorNode;
    if (anchor && editorRef.current.contains(anchor)) {
      savedNotesRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreNotesSelection = () => {
    if (!editorRef.current || !savedNotesRangeRef.current) return;
    const sel = window.getSelection();
    if (!sel) return;
    try {
      if (
        editorRef.current.contains(
          savedNotesRangeRef.current.commonAncestorContainer
        )
      ) {
        sel.removeAllRanges();
        sel.addRange(savedNotesRangeRef.current);
      }
    } catch {
      // Ignore
    }
  };

  const updateNotesFormatStatus = () => {
    saveNotesSelection();
    try {
      setActiveNotesFormats({
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
      });
    } catch {
      // Ignore
    }
  };

  const runCmd = (command, arg = null) => {
    restoreNotesSelection();
    if (editorRef.current && !editorRef.current.contains(document.activeElement)) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    saveNotesSelection();
    updateNotesFormatStatus();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleFontSizeChange = (val) => {
    setCurrentFontSize(val);
    runCmd("fontSize", val);
  };

  const handleFontFamilyChange = (val) => {
    setCurrentFontFamily(val);
    runCmd("fontName", val);
  };

  const handleColorChange = (command, val) => {
    runCmd(command, val);
  };

  const stepFontSize = (delta) => {
    const cur = parseInt(currentFontSize, 10) || 3;
    const next = Math.max(1, Math.min(7, cur + delta));
    setCurrentFontSize(String(next));
    runCmd("fontSize", String(next));
  };

  const insertLink = () => {
    const url = window.prompt("Enter link URL (e.g. https://example.com):");
    if (url) {
      runCmd("createLink", url);
    }
  };

  const insertTable = () => {
    const tableHtml = `<table class="notes-custom-table" style="width:100%; max-width:100%; table-layout:fixed; border-collapse:collapse; margin:10px 0; border:1px solid #cbd5e1; word-break:break-word;">
      <tbody>
        <tr>
          <th style="border:1px solid #cbd5e1; padding:6px 10px; background:#f1f5f9; text-align:left; word-break:break-word;">Header 1</th>
          <th style="border:1px solid #cbd5e1; padding:6px 10px; background:#f1f5f9; text-align:left; word-break:break-word;">Header 2</th>
        </tr>
        <tr>
          <td style="border:1px solid #cbd5e1; padding:6px 10px; word-break:break-word;">Item 1</td>
          <td style="border:1px solid #cbd5e1; padding:6px 10px; word-break:break-word;">Details</td>
        </tr>
      </tbody>
    </table><p><br></p>`;
    runCmd("insertHTML", tableHtml);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const src = await compressImageFile(file);
      if (src) {
        runCmd("insertImage", src);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result;
        if (src) {
          runCmd("insertImage", src);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Sync external value when not typing
  useEffect(() => {
    if (!editorRef.current) return;
    if (!isTypingRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div
      className={`notes-rich-editor-wrapper w-full max-w-full box-border overflow-hidden rounded-xl transition-all border ${
        isSelected
          ? "border-blue-500 shadow-sm ring-2 ring-blue-500/10"
          : "border-slate-200 hover:border-slate-300"
      } ${preview ? "border-transparent shadow-none" : "bg-white"}`}
      style={{
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (!preview) {
          e.stopPropagation();
          onSelect();
        }
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*"
        onChange={handleImageUpload}
      />

      {!preview && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 rounded-t-xl select-none">
          <span className="flex items-center gap-1.5 text-blue-700">
            <Sliders size={13} />
            <span>Formatted Terms & Notes</span>
          </span>
          <button
            type="button"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition ${
              showToolbar
                ? "bg-blue-600 text-white"
                : "bg-slate-200/80 text-slate-600 hover:bg-slate-300"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setShowToolbar((prev) => !prev);
            }}
            title={showToolbar ? "Hide formatting toolbar" : "Show formatting toolbar"}
          >
            {showToolbar ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            <span>{showToolbar ? "Hide Tools" : "Format Tools"}</span>
          </button>
        </div>
      )}

      {!preview && showToolbar && (
        <div
          className="flex flex-wrap items-center gap-1 p-2 bg-white border-b border-slate-200 select-none animate-in fade-in duration-150"
          role="toolbar"
          aria-label="Rich text formatting"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Font Family */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <select
              aria-label="Font family"
              value={currentFontFamily}
              onChange={(e) => handleFontFamilyChange(e.target.value)}
              className="text-xs font-medium bg-transparent px-1.5 py-0.5 outline-none text-slate-700 cursor-pointer"
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>

          {/* Font Size */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <select
              aria-label="Font size"
              value={currentFontSize}
              onChange={(e) => handleFontSizeChange(e.target.value)}
              className="text-xs font-medium bg-transparent px-1.5 py-0.5 outline-none text-slate-700 cursor-pointer"
            >
              <option value="1">Small</option>
              <option value="3">Normal</option>
              <option value="5">Large</option>
              <option value="7">Huge</option>
            </select>
            <button
              type="button"
              className="p-1 hover:bg-white rounded text-slate-600"
              onClick={() => stepFontSize(1)}
              title="Increase font size"
            >
              <Plus size={12} />
            </button>
            <button
              type="button"
              className="p-1 hover:bg-white rounded text-slate-600"
              onClick={() => stepFontSize(-1)}
              title="Decrease font size"
            >
              <Minus size={12} />
            </button>
          </div>

          <span className="w-px h-5 bg-slate-200 mx-1" />

          {/* History */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              type="button"
              className="p-1.5 hover:bg-white rounded text-slate-600"
              onClick={() => runCmd("undo")}
              title="Undo"
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              className="p-1.5 hover:bg-white rounded text-slate-600"
              onClick={() => runCmd("redo")}
              title="Redo"
            >
              <Redo2 size={13} />
            </button>
          </div>

          <span className="w-px h-5 bg-slate-200 mx-1" />

          {/* Text Styling */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                activeNotesFormats.bold
                  ? "bg-blue-600 text-white font-bold"
                  : "hover:bg-white text-slate-700"
              }`}
              onClick={() => runCmd("bold")}
              title="Bold"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                activeNotesFormats.italic
                  ? "bg-blue-600 text-white italic"
                  : "hover:bg-white text-slate-700"
              }`}
              onClick={() => runCmd("italic")}
              title="Italic"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                activeNotesFormats.underline
                  ? "bg-blue-600 text-white underline"
                  : "hover:bg-white text-slate-700"
              }`}
              onClick={() => runCmd("underline")}
              title="Underline"
            >
              <Underline size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                activeNotesFormats.strike
                  ? "bg-blue-600 text-white line-through"
                  : "hover:bg-white text-slate-700"
              }`}
              onClick={() => runCmd("strikeThrough")}
              title="Strikethrough"
            >
              <Strikethrough size={13} />
            </button>
            <button
              type="button"
              className="p-1.5 hover:bg-white rounded text-slate-700"
              onClick={() => {
                const sel = window.getSelection();
                if (sel && sel.toString()) {
                  runCmd("insertHTML", `<code>${sel.toString()}</code>`);
                } else {
                  runCmd("insertHTML", `<code>code</code>`);
                }
              }}
              title="Inline Code"
            >
              <Code size={13} />
            </button>
          </div>

          {/* Text and Highlight Colors */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 gap-0.5">
            <label className="p-1 hover:bg-white rounded text-slate-700 cursor-pointer flex items-center" title="Text Color">
              <Type size={13} />
              <input
                type="color"
                defaultValue="#0f172a"
                onChange={(e) => handleColorChange("foreColor", e.target.value)}
                className="sr-only"
              />
            </label>
            <label className="p-1 hover:bg-white rounded text-amber-500 cursor-pointer flex items-center" title="Highlight Color">
              <Palette size={13} />
              <input
                type="color"
                defaultValue="#fef08a"
                onChange={(e) => handleColorChange("hiliteColor", e.target.value)}
                className="sr-only"
              />
            </label>
          </div>

          <span className="w-px h-5 bg-slate-200 mx-1" />

          {/* Alignment */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              type="button"
              className={`p-1.5 rounded ${
                activeNotesFormats.alignLeft ? "bg-blue-600 text-white" : "hover:bg-white text-slate-700"
              }`}
              onClick={() => runCmd("justifyLeft")}
              title="Align Left"
            >
              <AlignLeft size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${
                activeNotesFormats.alignCenter ? "bg-blue-600 text-white" : "hover:bg-white text-slate-700"
              }`}
              onClick={() => runCmd("justifyCenter")}
              title="Align Center"
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${
                activeNotesFormats.alignRight ? "bg-blue-600 text-white" : "hover:bg-white text-slate-700"
              }`}
              onClick={() => runCmd("justifyRight")}
              title="Align Right"
            >
              <AlignRight size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${
                activeNotesFormats.alignJustify ? "bg-blue-600 text-white" : "hover:bg-white text-slate-700"
              }`}
              onClick={() => runCmd("justifyFull")}
              title="Justify"
            >
              <AlignJustify size={13} />
            </button>
          </div>

          <span className="w-px h-5 bg-slate-200 mx-1" />

          {/* Lists */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              type="button"
              className={`p-1.5 rounded ${
                activeNotesFormats.bulletList ? "bg-blue-600 text-white" : "hover:bg-white text-slate-700"
              }`}
              onClick={() => runCmd("insertUnorderedList")}
              title="Bullet List"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${
                activeNotesFormats.numberList ? "bg-blue-600 text-white" : "hover:bg-white text-slate-700"
              }`}
              onClick={() => runCmd("insertOrderedList")}
              title="Numbered List"
            >
              <ListOrdered size={13} />
            </button>
          </div>

          <span className="w-px h-5 bg-slate-200 mx-1" />

          {/* Inserts: Link, Table, Image */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              type="button"
              className="p-1.5 hover:bg-white rounded text-slate-700"
              onClick={insertLink}
              title="Insert Link"
            >
              <LinkIcon size={13} />
            </button>
            <button
              type="button"
              className="p-1.5 hover:bg-white rounded text-slate-700"
              onClick={insertTable}
              title="Insert Table"
            >
              <TableIcon size={13} />
            </button>
            <button
              type="button"
              className="p-1.5 hover:bg-white rounded text-slate-700"
              onClick={() => fileInputRef.current?.click()}
              title="Upload & Insert Image"
            >
              <ImageIcon size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Editable Canvas Area */}
      <div
        ref={editorRef}
        contentEditable={!preview}
        suppressContentEditableWarning
        data-placeholder="Click here to type notes, terms, or insert tables/images..."
        className={`notes-blank-editor-content p-4 outline-none min-h-[80px] w-full max-w-full box-border break-words [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap leading-relaxed text-slate-700 ${
          preview ? "cursor-default" : "cursor-text"
        }`}
        style={{
          maxWidth: "100%",
          boxSizing: "border-box",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          whiteSpace: "pre-wrap",
          overflowX: "hidden",
          fontFamily: style?.fontFamily || undefined,
          fontSize: style?.fontSize ? `${style.fontSize}px` : undefined,
          color: style?.color || undefined,
          textAlign: style?.align || undefined,
        }}
        onInput={() => {
          isTypingRef.current = true;
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }}
        onBlur={() => {
          isTypingRef.current = false;
          saveNotesSelection();
          if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }}
        onKeyUp={updateNotesFormatStatus}
        onMouseUp={updateNotesFormatStatus}
      />
    </div>
  );
}
