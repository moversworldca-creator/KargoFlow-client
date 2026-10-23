import React, { useState, useEffect } from "react";
import { Trash2, X, AlertTriangle } from "lucide-react";

export default function DeleteCellsDialog({
  isOpen,
  selectedCount = 1,
  onClose,
  onConfirm,
}) {
  const [behavior, setBehavior] = useState("keep-gap");

  useEffect(() => {
    if (isOpen) {
      setBehavior("keep-gap");
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(behavior);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-red-50/50 border-b border-red-100">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-red-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Delete {selectedCount} Selected Cell{selectedCount > 1 ? "s" : ""}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Options */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-slate-600">
            Choose how to handle the table layout when deleting the selected cell(s):
          </p>

          <div className="space-y-2.5">
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                behavior === "keep-gap"
                  ? "border-blue-500 bg-blue-50/20"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="deleteBehavior"
                value="keep-gap"
                checked={behavior === "keep-gap"}
                onChange={() => setBehavior("keep-gap")}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-xs font-bold text-slate-800">
                  Keep Dimensions & Leave Spacer Gap (Recommended)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Leaves transparent empty cell with preserved column width and row height. Neighboring cells will not shift or collapse.
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                behavior === "clear-contents"
                  ? "border-blue-500 bg-blue-50/20"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="deleteBehavior"
                value="clear-contents"
                checked={behavior === "clear-contents"}
                onChange={() => setBehavior("clear-contents")}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-xs font-bold text-slate-800">
                  Clear Content Only
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Erases text and elements inside the cell while keeping table borders and backgrounds intact.
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                behavior === "shift-left"
                  ? "border-blue-500 bg-blue-50/20"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="deleteBehavior"
                value="shift-left"
                checked={behavior === "shift-left"}
                onChange={() => setBehavior("shift-left")}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-xs font-bold text-slate-800">
                  Shift Cells Left
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Removes the cells and pulls adjacent rightward cells into their positions, adding blank cells at the end of the row.
                </div>
              </div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition"
            >
              Delete Cells
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
