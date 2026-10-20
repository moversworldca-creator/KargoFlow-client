import React, { useState, useEffect } from "react";
import { Table, X } from "lucide-react";

const MAX_ROWS = 20;
const MAX_COLS = 12;
const MATRIX_ROWS = 6;
const MATRIX_COLS = 6;

export default function InsertTablePopup({ isOpen, onClose, onInsert }) {
  const [hoverRows, setHoverRows] = useState(0);
  const [hoverCols, setHoverCols] = useState(0);
  const [selectedRows, setSelectedRows] = useState(3);
  const [selectedCols, setSelectedCols] = useState(3);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedRows(3);
      setSelectedCols(3);
      setHoverRows(0);
      setHoverCols(0);
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreate = () => {
    const r = parseInt(selectedRows, 10);
    const c = parseInt(selectedCols, 10);

    if (isNaN(r) || r < 1 || r > MAX_ROWS) {
      setError(`Rows must be between 1 and ${MAX_ROWS}`);
      return;
    }
    if (isNaN(c) || c < 1 || c > MAX_COLS) {
      setError(`Columns must be between 1 and ${MAX_COLS}`);
      return;
    }

    onInsert(r, c);
    onClose();
  };

  const handleCellClick = (r, c) => {
    setSelectedRows(r);
    setSelectedCols(c);
    setError("");
    onInsert(r, c);
    onClose();
  };

  const currentRows = hoverRows > 0 ? hoverRows : selectedRows;
  const currentCols = hoverCols > 0 ? hoverCols : selectedCols;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 p-5 w-84 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Table size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800">Insert Table</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Matrix Hover Grid (6x6 Quick Select) */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-bold text-blue-600 mb-2">
            {currentRows > 0 && currentCols > 0
              ? `${currentRows} × ${currentCols} Table`
              : "Select dimensions"}
          </div>
          <div
            className="grid grid-cols-6 gap-1.5 bg-slate-50 p-2.5 border border-slate-200 rounded-lg"
            onMouseLeave={() => {
              setHoverRows(0);
              setHoverCols(0);
            }}
          >
            {Array.from({ length: MATRIX_ROWS }).map((_, rIdx) =>
              Array.from({ length: MATRIX_COLS }).map((_, cIdx) => {
                const rowNum = rIdx + 1;
                const colNum = cIdx + 1;
                const isHovered =
                  hoverRows > 0 &&
                  hoverCols > 0 &&
                  rowNum <= hoverRows &&
                  colNum <= hoverCols;
                const isSelected =
                  hoverRows === 0 &&
                  rowNum <= selectedRows &&
                  colNum <= selectedCols;
                const active = isHovered || isSelected;

                return (
                  <div
                    key={`${rowNum}-${colNum}`}
                    onMouseEnter={() => {
                      setHoverRows(rowNum);
                      setHoverCols(colNum);
                    }}
                    onClick={() => handleCellClick(rowNum, colNum)}
                    className={`w-6 h-6 border rounded cursor-pointer transition ${
                      active
                        ? "bg-blue-500 border-blue-600 shadow-xs"
                        : "bg-white border-slate-300 hover:border-blue-400"
                    }`}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Custom Dimensions Input Section (Rows 1-20, Cols 1-12) */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500">Custom Dimensions</div>
          <div className="flex items-center gap-2">
            <label className="flex-1 space-y-1">
              <span className="text-[10px] text-slate-500">Rows (1-{MAX_ROWS})</span>
              <input
                type="number"
                min={1}
                max={MAX_ROWS}
                value={selectedRows}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setSelectedRows(isNaN(val) ? 1 : val);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                className="w-full text-xs font-bold px-2 py-1.5 border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </label>
            <span className="text-slate-400 font-bold mt-4">&times;</span>
            <label className="flex-1 space-y-1">
              <span className="text-[10px] text-slate-500">Cols (1-{MAX_COLS})</span>
              <input
                type="number"
                min={1}
                max={MAX_COLS}
                value={selectedCols}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setSelectedCols(isNaN(val) ? 1 : val);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                className="w-full text-xs font-bold px-2 py-1.5 border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </label>
          </div>
          {error && <div className="text-[11px] text-red-600 font-medium">{error}</div>}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition"
          >
            Create Table
          </button>
        </div>
      </div>
    </div>
  );
}
