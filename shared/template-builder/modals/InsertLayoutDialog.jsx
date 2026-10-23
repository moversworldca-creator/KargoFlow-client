import React, { useState } from "react";
import { Columns, X } from "lucide-react";

const PRESETS = [
  { id: "50-50", label: "2 Columns (50 / 50)", desc: "Equal two columns, ideal for Image + Text" },
  { id: "single", label: "1 Column (100%)", desc: "Single full width card" },
  { id: "30-70", label: "2 Columns (30 / 70)", desc: "Sidebar thumbnail with wide text" },
  { id: "70-30", label: "2 Columns (70 / 30)", desc: "Wide text with right info box" },
  { id: "three-col", label: "3 Columns (33 / 34 / 33)", desc: "Three equal cards or feature columns" },
];

export default function InsertLayoutDialog({ isOpen, onClose, onInsert }) {
  const [selectedPreset, setSelectedPreset] = useState("50-50");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 w-96 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Columns size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800">Select Column Layout</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          {PRESETS.map((preset) => (
            <div
              key={preset.id}
              onClick={() => setSelectedPreset(preset.id)}
              className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                selectedPreset === preset.id
                  ? "border-blue-600 bg-blue-50/50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="font-semibold text-slate-800">{preset.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{preset.desc}</div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            onInsert(selectedPreset);
            onClose();
          }}
          className="w-full py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs"
        >
          Insert Layout
        </button>
      </div>
    </div>
  );
}
