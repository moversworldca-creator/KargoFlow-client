import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Undo2, Redo2, Code, Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Outdent, Indent, Link as LinkIcon, Image as ImageIcon, 
  Table as TableIcon, Minus, Eraser, Type, Eye, EyeOff
} from 'lucide-react';

const btnBase =
  'inline-flex items-center justify-center rounded-lg h-8 w-8 text-ink-600 transition-all hover:bg-ink-50 hover:text-ink-900 border border-transparent active:scale-95 disabled:opacity-30 disabled:pointer-events-none';
const selectBase =
  'rounded-lg px-2 py-1 text-[11px] font-bold transition-colors border border-ink-100 bg-white hover:bg-ink-50 outline-none cursor-pointer';

const clampInt = (value, min, max, fallback) => {
  const num = Number.parseInt(String(value), 10);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
};

const buildTableHtml = (rows, cols) => {
  const safeRows = clampInt(rows, 1, 12, 2);
  const safeCols = clampInt(cols, 1, 12, 2);
  const cell = "<td style='border:1px solid #e6e8ec;padding:8px;'>&nbsp;</td>";
  const row = `<tr>${Array.from({ length: safeCols }).map(() => cell).join('')}</tr>`;
  return `<table style='border-collapse:collapse;width:100%;margin:12px 0;'>${Array.from({ length: safeRows })
    .map(() => row)
    .join('')}</table>`;
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type here...',
  minHeight = '140px',
  toolsVisible,
  onToolsVisibleChange,
  showToolsToggle = true
}) {
  const editorRef = useRef(null);
  const [mode, setMode] = useState('visual'); // visual | source
  const [sourceValue, setSourceValue] = useState(value || '');
  const [localToolsVisible, setLocalToolsVisible] = useState(true);
  const toolbarVisible = toolsVisible ?? localToolsVisible;
  const toggleTools = () => {
    setLocalToolsVisible(!toolbarVisible);
    onToolsVisibleChange?.(!toolbarVisible);
  };

  const setHtml = (html) => {
    const node = editorRef.current;
    if (!node) return;
    const target = html || '';
    if (node.innerHTML !== target) node.innerHTML = target;
  };

  useEffect(() => {
    if (mode === 'source') {
      setSourceValue(value || '');
      return;
    }
    setHtml(value);
  }, [value, mode]);

  const sync = () => {
    const node = editorRef.current;
    if (!node) return;
    onChange?.(node.innerHTML);
  };

  const exec = (command, commandValue = null) => {
    document.execCommand(command, false, commandValue);
    sync();
  };

  const setColor = (color) => exec('foreColor', color);
  const setHighlight = (color) => exec('hiliteColor', color);

  const insertLink = () => {
    const url = window.prompt('Enter URL');
    if (!url) return;
    exec('createLink', url);
  };

  const insertImage = () => {
    const url = window.prompt('Enter image URL');
    if (!url) return;
    exec('insertImage', url);
  };

  const insertTable = () => {
    const rows = window.prompt('Rows?', '2');
    const cols = window.prompt('Columns?', '2');
    const html = buildTableHtml(rows, cols);
    exec('insertHTML', html);
  };

  const toggleMode = () => {
    if (mode === 'visual') {
      setSourceValue(value || editorRef.current?.innerHTML || '');
      setMode('source');
      return;
    }
    onChange?.(sourceValue || '');
    setMode('visual');
  };

  const toolbar = useMemo(
    () => [
      { icon: Undo2, title: 'Undo', onClick: () => exec('undo') },
      { icon: Redo2, title: 'Redo', onClick: () => exec('redo') },
      { icon: Code, title: 'HTML view', onClick: toggleMode, active: mode === 'source' },
      { type: 'divider' },
      { icon: Bold, title: 'Bold', onClick: () => exec('bold') },
      { icon: Italic, title: 'Italic', onClick: () => exec('italic') },
      { icon: Underline, title: 'Underline', onClick: () => exec('underline') },
      { icon: Strikethrough, title: 'Strikethrough', onClick: () => exec('strikeThrough') },
      { type: 'divider' },
      { icon: AlignLeft, title: 'Align left', onClick: () => exec('justifyLeft') },
      { icon: AlignCenter, title: 'Align center', onClick: () => exec('justifyCenter') },
      { icon: AlignRight, title: 'Align right', onClick: () => exec('justifyRight') },
      { icon: AlignJustify, title: 'Justify', onClick: () => exec('justifyFull') },
      { type: 'divider' },
      { icon: ListOrdered, title: 'Ordered list', onClick: () => exec('insertOrderedList') },
      { icon: List, title: 'Unordered list', onClick: () => exec('insertUnorderedList') },
      { icon: Outdent, title: 'Decrease indent', onClick: () => exec('outdent') },
      { icon: Indent, title: 'Increase indent', onClick: () => exec('indent') },
      { type: 'divider' },
      { icon: LinkIcon, title: 'Insert hyperlink', onClick: insertLink },
      { icon: ImageIcon, title: 'Insert image', onClick: insertImage },
      { icon: TableIcon, title: 'Insert table', onClick: insertTable },
      { icon: Minus, title: 'Horizontal line', onClick: () => exec('insertHorizontalRule') },
      { type: 'divider' },
      { icon: Eraser, title: 'Clear formatting', onClick: () => exec('removeFormat') },
    ],
    [mode, sourceValue, value]
  );

  return (
    <div className="flex max-h-[32rem] flex-col overflow-hidden rounded-xl border border-ink-100 bg-white transition-all focus-within:ring-2 focus-within:ring-brand/20">
      {/* Toolbar */}
      <div style={!toolbarVisible && !showToolsToggle ? { display: 'none' } : undefined} className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 border-b border-ink-100 bg-slate-50/95 p-1.5 backdrop-blur-sm">
        {toolbarVisible && <select
          className={selectBase}
          title="Font size"
          disabled={mode === 'source'}
          onChange={(e) => exec('fontSize', e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Size</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">X-Large</option>
        </select>}

        {!toolbarVisible ? null : (
          <>
            <div className="w-px h-4 bg-ink-200 mx-1" />

            <div className="flex items-center gap-1 group relative">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg text-ink-600 hover:bg-ink-100 transition-colors">
                <Type size={16} />
              </div>
              <input
                type="color"
                title="Text color"
                disabled={mode === 'source'}
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
          </div>

            <div className="flex items-center gap-1 group relative">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg text-ink-600 hover:bg-ink-100 transition-colors border-b-2 border-brand">
                <Type size={16} />
              </div>
              <input
                type="color"
                title="Highlight color"
                disabled={mode === 'source'}
                onChange={(e) => setHighlight(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
          </div>

            <div className="w-px h-4 bg-ink-200 mx-1" />

            {toolbar.map((btn, idx) => {
              if (btn.type === 'divider') {
                return <div key={`div-${idx}`} className="w-px h-4 bg-ink-200 mx-1" />;
              }
              const IconComp = btn.icon;
              return (
                <button
                  key={btn.title}
                  type="button"
                  title={btn.title}
                  disabled={mode === 'source' && btn.title !== 'HTML view'}
                  className={`${btnBase} ${btn.active ? 'bg-brand/10 text-brand' : ''}`}
                  onClick={btn.onClick}
                >
                  <IconComp size={16} strokeWidth={2.5} />
                </button>
              );
            })}
          </>
        )}

        <div className="ml-auto" />

        {showToolsToggle && <button
          type="button"
          aria-expanded={toolbarVisible}
          title={toolbarVisible ? 'Hide tools' : 'Show tools'}
          onClick={toggleTools}
          className="inline-flex items-center justify-center rounded-lg border border-ink-100 bg-white px-2 py-1 text-[11px] font-bold text-ink-600 transition-colors hover:bg-ink-50"
        >
          {toolbarVisible ? <Eye size={15} /> : <EyeOff size={15} />}
          <span className="ml-1.5">{toolbarVisible ? 'Hide Tools' : 'Show Tools'}</span>
        </button>}
      </div>

      {/* Editor Area */}
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {mode === 'source' ? (
          <textarea
            rows={8}
            value={sourceValue}
            onChange={(e) => {
              const next = e.target.value;
              setSourceValue(next);
              onChange?.(next);
            }}
            className="w-full bg-white p-4 text-[13px] font-mono text-ink-900 outline-none resize-none leading-relaxed"
            style={{ minHeight }}
            placeholder={placeholder}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={sync}
            onDrop={() => setTimeout(sync, 10)}
            className="w-full bg-white p-4 text-[15px] leading-relaxed text-ink-900 outline-none focus:outline-none"
            style={{ minHeight }}
            data-placeholder={placeholder}
          />
        )}
      </div>
    </div>
  );
};
