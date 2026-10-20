import React, { useState, useEffect, useRef } from "react";
import {
  Code2,
  X,
  Sparkles,
  Search,
  Check,
  RotateCcw,
  Replace,
  ArrowRight,
} from "lucide-react";
import {
  beautifyHtml,
  sanitizeHtml,
  DEFAULT_SAMPLE_HTML,
  HTML_SNIPPETS,
} from "../core/htmlSanitizer";

export default function HtmlCodeModal({
  isOpen,
  initialHtml = "",
  initialCss = "",
  onClose,
  onApply,
}) {
  const [htmlCode, setHtmlCode] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [selectedSnippet, setSelectedSnippet] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const textareaRef = useRef(null);
  const lineGutterRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      let combined = initialHtml || DEFAULT_SAMPLE_HTML;
      if (initialCss && initialCss.trim() && !combined.includes("<style")) {
        combined = `<style>\n${initialCss.trim()}\n</style>\n${combined}`;
      }
      setHtmlCode(combined);
      setShowSearch(false);
      setSearchQuery("");
      setReplaceQuery("");
      setToastMessage("");
    }
  }, [isOpen, initialHtml, initialCss]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (!isOpen) return null;

  const lines = htmlCode.split("\n");
  const lineCount = lines.length;

  const handleScroll = (e) => {
    if (lineGutterRef.current) {
      lineGutterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleFormat = () => {
    const formatted = beautifyHtml(htmlCode);
    setHtmlCode(formatted);
  };

  const handleInsertSnippet = (snippet) => {
    if (!snippet) return;
    let codeToAdd = snippet.html;
    if (snippet.css) {
      codeToAdd = `<style>\n${snippet.css}\n</style>\n${codeToAdd}`;
    }
    setHtmlCode((prev) => `${prev}\n\n${codeToAdd}`);
  };

  const handleApply = (closeModal = false) => {
    const { cleanHtml, extractedCss } = sanitizeHtml(htmlCode);
    onApply(cleanHtml, extractedCss || "");
    setToastMessage("Changes applied to document canvas");
    if (closeModal) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl+Enter or Cmd+Enter to Apply & Close
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleApply(true);
      return;
    }

    // Ctrl+F or Cmd+F to toggle search
    if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
      e.preventDefault();
      setShowSearch((prev) => !prev);
      return;
    }

    // Tab key: insert 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;

      if (e.shiftKey) {
        // Shift+Tab: un-indent current line
        const lastNewLine = value.lastIndexOf("\n", start - 1);
        const lineStart = lastNewLine === -1 ? 0 : lastNewLine + 1;
        if (value.startsWith("  ", lineStart)) {
          const next =
            value.substring(0, lineStart) + value.substring(lineStart + 2);
          setHtmlCode(next);
          setTimeout(() => {
            target.setSelectionRange(
              Math.max(lineStart, start - 2),
              Math.max(lineStart, end - 2)
            );
          }, 0);
        }
      } else {
        // Regular tab: insert 2 spaces
        const next = value.substring(0, start) + "  " + value.substring(end);
        setHtmlCode(next);
        setTimeout(() => {
          target.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 select-none">
          <div className="flex items-center gap-2">
            <Code2 size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">HTML & CSS Code Editor</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Snippet inserter */}
            <select
              value={selectedSnippet}
              onChange={(e) => {
                const s = HTML_SNIPPETS.find((sn) => sn.name === e.target.value);
                if (s) handleInsertSnippet(s);
                setSelectedSnippet("");
              }}
              className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
            >
              <option value="">Insert Snippet...</option>
              {HTML_SNIPPETS.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleFormat}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition"
              title="Beautify HTML"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Format</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSearch(!showSearch)}
              className={`p-1 rounded text-slate-500 hover:bg-slate-200 transition ${
                showSearch ? "bg-slate-200 text-blue-600" : ""
              }`}
              title="Search and Replace"
            >
              <Search size={16} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-5 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-xs">
            <input
              type="text"
              placeholder="Find..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-xs w-48"
            />
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-xs w-48"
            />
            <button
              type="button"
              onClick={() => {
                if (!searchQuery) return;
                setHtmlCode((prev) => prev.split(searchQuery).join(replaceQuery));
              }}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 font-medium text-slate-700 transition"
            >
              Replace All
            </button>
          </div>
        )}

        {/* Code Editor Body with Line Numbers Gutter */}
        <div className="flex-1 bg-white flex overflow-hidden font-mono text-xs border-t border-slate-200">
          {/* Synchronized Line Numbers Gutter */}
          <div
            ref={lineGutterRef}
            className="w-12 py-3 px-2 bg-slate-50 border-r border-slate-200 text-slate-400 text-right select-none overflow-hidden leading-relaxed shrink-0"
          >
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i + 1}>{i + 1}</div>
            ))}
          </div>

          {/* Textarea Code Editor */}
          <textarea
            ref={textareaRef}
            value={htmlCode}
            onChange={(e) => setHtmlCode(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="flex-1 h-full bg-transparent text-slate-800 p-3 outline-none resize-none leading-relaxed overflow-y-auto placeholder:text-slate-400"
            placeholder="Write or paste HTML/CSS code here..."
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>Lines: {lineCount}</span>
            <span>&middot;</span>
            <span>Length: {htmlCode.length} chars</span>
            <span>&middot;</span>
            <small className="text-slate-400">Ctrl+Enter to Apply</small>
            {toastMessage && (
              <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-in fade-in">
                {toastMessage}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleApply(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition"
              title="Apply code immediately to document without closing dialog"
            >
              Apply Changes
            </button>
            <button
              type="button"
              onClick={() => handleApply(true)}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition"
              title="Apply code and return to canvas editor"
            >
              Apply &amp; Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
