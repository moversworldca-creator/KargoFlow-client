import React, { useState } from "react";
import { Table, X } from "lucide-react";

export default function InsertTablePopup({ isOpen, onClose, onInsert }) {
  const [hoverRows, setHoverRows] = useState(3);
  const [hoverCols, setHoverCols] = useState(3);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 w-80 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Table size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800">Insert Table</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Matrix Hover Grid (6x6) */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-semibold text-blue-600 mb-2">
            {hoverRows} × {hoverCols} Table
          </div>
          <div className="grid grid-cols-6 gap-1 bg-slate-50 p-2 border border-slate-200 rounded-md">
            {Array.from({ length: 6 }).map((_, rIdx) =>
              Array.from({ length: 6 }).map((_, cIdx) => {
                const isHovered = rIdx < hoverRows && cIdx < hoverCols;
                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    onMouseEnter={() => {
                      setHoverRows(rIdx + 1);
                      setHoverCols(cIdx + 1);
                    }}
                    onClick={() => {
                      onInsert(rIdx + 1, cIdx + 1);
                      onClose();
                    }}
                    className={`w-6 h-6 border rounded cursor-pointer transition ${
                      isHovered
                        ? "bg-blue-500 border-blue-600"
                        : "bg-white border-slate-300 hover:border-blue-400"
                    }`}
                  />
                );
              })
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onInsert(hoverRows, hoverCols);
            onClose();
          }}
          className="w-full py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs"
        >
          Insert {hoverRows} × {hoverCols} Grid
        </button>
      </div>
    </div>
  );
}
