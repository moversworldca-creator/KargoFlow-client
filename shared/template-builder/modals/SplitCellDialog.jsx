import React, { useState, useEffect } from "react";
import { Grid, X, Columns, Rows } from "lucide-react";

export default function SplitCellDialog({
  isOpen,
  cell,
  onClose,
  onSplit,
}) {
  if (!isOpen || !cell) return null;

  const originalRowSpan = Math.max(1, cell.rowSpan || 1);
  const originalColSpan = Math.max(1, cell.colSpan || 1);

  const [rows, setRows] = useState(originalRowSpan > 1 ? originalRowSpan : 2);
  const [cols, setCols] = useState(originalColSpan > 1 ? originalColSpan : 2);

  useEffect(() => {
    const rSpan = Math.max(1, cell.rowSpan || 1);
    const cSpan = Math.max(1, cell.colSpan || 1);
    setRows(rSpan > 1 ? rSpan : 2);
    setCols(cSpan > 1 ? cSpan : 2);
  }, [cell]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isValidSplit = rows >= 1 && cols >= 1 && (rows > 1 || cols > 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidSplit) return;
    onSplit(rows, cols);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Grid size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Split Table Cell</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-500">
            Specify how many smaller sub-cells to divide this cell into horizontally and vertically:
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Rows size={14} className="text-slate-500" />
                <span>Rows:</span>
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={rows}
                onChange={(e) => setRows(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Columns size={14} className="text-slate-500" />
                <span>Columns:</span>
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={cols}
                onChange={(e) => setCols(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Visual Mini Preview */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <div className="text-[11px] font-medium text-slate-500 mb-2">
              Preview: {rows} &times; {cols} ({rows * cols} sub-cells)
            </div>
            <div
              className="grid gap-1 bg-white p-2 border border-slate-200 rounded max-w-[160px] mx-auto"
              style={{
                gridTemplateRows: `repeat(${rows}, 18px)`,
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
              }}
            >
              {Array.from({ length: rows * cols }).map((_, i) => (
                <div
                  key={i}
                  className="bg-blue-100 border border-blue-300 rounded-xs flex items-center justify-center text-[9px] font-mono text-blue-700"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValidSplit}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition"
            >
              Apply Split
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
