import React, { useState, useEffect, useRef } from "react";
import {
  Code2,
  X,
  Sparkles,
  Search,
  Check,
  RotateCcw,
  Replace,
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

  const textareaRef = useRef(null);

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
    }
  }, [isOpen, initialHtml, initialCss]);

  if (!isOpen) return null;

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

  const handleSave = () => {
    const { cleanHtml, extractedCss } = sanitizeHtml(htmlCode);
    onApply(cleanHtml, extractedCss);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
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
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50"
              title="Beautify HTML"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Format</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSearch(!showSearch)}
              className="p-1 rounded text-slate-500 hover:bg-slate-200"
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
              className="px-2.5 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 font-medium text-slate-700"
            >
              Replace All
            </button>
          </div>
        )}

        {/* Code Editor Body */}
        <div className="flex-1 bg-slate-950 p-4 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={htmlCode}
            onChange={(e) => setHtmlCode(e.target.value)}
            spellCheck={false}
            className="w-full h-full bg-transparent text-emerald-400 font-mono text-xs focus:outline-hidden resize-none leading-relaxed"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Script and unsafe tags are automatically sanitized before applying.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
