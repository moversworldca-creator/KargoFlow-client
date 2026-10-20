import React, { useState } from "react";
import { Sliders, X, Plus } from "lucide-react";
import { getVariablesForMode } from "../config/variableRegistry";

export default function CustomFieldModal({
  isOpen,
  mode = "estimate",
  onClose,
  onAdd,
}) {
  const [fieldLabel, setFieldLabel] = useState("Customer Reference");
  const [fieldValue, setFieldValue] = useState("PO-98421");
  const [fieldVar, setFieldVar] = useState("");

  if (!isOpen) return null;

  const variableGroups = getVariablesForMode(mode);
  const allVariables = variableGroups.flatMap((grp) => grp.items);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!fieldLabel.trim()) return;
    onAdd({
      label: fieldLabel.trim(),
      value: fieldValue.trim() || "Enter value",
      variable: fieldVar.trim() || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[90000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add Custom Field"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Add Custom Field</h3>
              <p className="text-[11px] text-slate-500">User-defined key-value component</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Create a user-defined field with a custom label, default placeholder value, and optional dynamic template variable binding.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="e.g. Customer Reference, PO Number, Delivery Window"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Value or Placeholder
            </label>
            <input
              type="text"
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
              placeholder="e.g. PO-98421 or Enter reference number"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dynamic Variable Binding (Optional)
            </label>
            <select
              value={fieldVar}
              onChange={(e) => setFieldVar(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None (Static text / placeholder)</option>
              {allVariables.map((v) => (
                <option key={v.tag} value={v.tag}>
                  {v.label} ({v.tag})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              When dynamic data is merged, this variable tag will be automatically populated.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
            >
              <Plus size={14} />
              <span>Add Field</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
