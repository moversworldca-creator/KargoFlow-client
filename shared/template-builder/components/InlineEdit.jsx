import React, { useState, useEffect, useRef } from "react";

export const SAMPLE_LOGISTICS_DATA = {
  "{{company_name}}": "KargoFlow Global Logistics Inc.",
  "{{company.name}}": "KargoFlow Global Logistics Inc.",
  "{{company_logo}}": "",
  "{{company_address}}": "742 Evergreen Freight Way, Suite 400, Chicago, IL 60601",
  "{{company.address}}": "742 Evergreen Freight Way, Suite 400, Chicago, IL 60601",
  "{{company_email}}": "operations@kargoflow.com",
  "{{company.email}}": "operations@kargoflow.com",
  "{{company_phone}}": "+1 (800) 555-4746",
  "{{company.primary_phone}}": "+1 (800) 555-4746",
  "{{customer_name}}": "Alex Mercer",
  "{{customer.full_name}}": "Alex Mercer",
  "{{customer_company}}": "Apex Manufacturing Corp.",
  "{{customer_address}}": "1200 Industrial Parkway, Dock 4B, Detroit, MI 48201",
  "{{estimate_number}}": "EST-2026-08492",
  "{{estimate.number}}": "EST-2026-08492",
  "{{estimate_title}}": "Door-to-Door Freight Estimate",
  "{{issue_date}}": "October 15, 2026",
  "{{expiry_date}}": "November 14, 2026",
  "{{sales_rep_name}}": "Sarah Jenkins (Senior Logistics Consultant)",
  "{{sales_rep.name}}": "Sarah Jenkins (Senior Logistics Consultant)",
  "{{sales_rep_email}}": "s.jenkins@kargoflow.com",
  "{{origin}}": "Chicago Terminal (ORD-Hub 2)",
  "{{destination}}": "Detroit Distribution Center (DTW-South)",
  "{{pickup_date}}": "Oct 20, 2026",
  "{{delivery_date}}": "Oct 22, 2026",
  "{{service_type}}": "Expedited Dedicated LTL",
  "{{vehicle_type}}": "53ft Temperature Controlled Dry Van",
  "{{total_weight}}": "14,850 lbs (6,735 kg)",
  "{{subtotal}}": "$4,250.00",
  "{{tax_amount}}": "$340.00",
  "{{grand_total}}": "$4,590.00",
  "{{notes}}": "Standard transit times apply. Fuel surcharge indexed weekly.",
  "{{page_number}}": "1",
};

export function resolveVariableContent(rawText, active = true) {
  if (!active || !rawText || typeof rawText !== "string") return rawText;
  let resolved = rawText;
  for (const [key, val] of Object.entries(SAMPLE_LOGISTICS_DATA)) {
    if (resolved.includes(key)) {
      resolved = resolved.split(key).join(val);
    }
  }
  return resolved;
}

export default function InlineEdit({
  value = "",
  part = "",
  selection = null,
  preview = false,
  className = "",
  resolveVariables = false,
  placeholder = "",
  allowEmpty = false,
  editRequest = 0,
  style = {},
  onSelect = () => {},
  onCommit = () => {},
  onNext = null,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);
  const handledEditRequest = useRef(0);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (preview || !editRequest || editRequest === handledEditRequest.current) return;
    handledEditRequest.current = editRequest;
    cancelled.current = false;
    setDraft(value);
    setEditing(true);
  }, [editRequest, preview, value]);

  const finish = () => {
    setEditing(false);
    if (!cancelled.current && draft !== value) {
      const finalVal = allowEmpty ? draft.trim() : (draft.trim() || value);
      onCommit(finalVal);
    }
    cancelled.current = false;
  };

  const displayValue =
    resolveVariables && !editing ? resolveVariableContent(value, true) : value;

  const isSelected =
    selection &&
    (typeof selection === "string" ? selection === part : selection.part === part);

  if (editing && !preview) {
    const isMultiline = String(draft || "").includes("\n") || draft.length > 50;

    if (isMultiline) {
      return (
        <textarea
          style={style}
          className={`w-full min-w-0 max-w-full px-1.5 py-0.5 rounded border border-blue-500 bg-white text-slate-800 shadow-xs outline-2 outline-blue-500/20 text-inherit font-inherit resize-y break-words [overflow-wrap:anywhere] [word-break:break-word] overflow-auto ${className}`}
          rows={Math.min(10, Math.max(2, (draft.match(/\n/g) || []).length + 1))}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={finish}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              cancelled.current = true;
              setDraft(value);
              e.currentTarget.blur();
            }
          }}
        />
      );
    }

    return (
      <input
        style={style}
        className={`w-full min-w-0 max-w-full px-1.5 py-0.5 rounded border border-blue-500 bg-white text-slate-800 shadow-xs outline-2 outline-blue-500/20 text-inherit font-inherit break-words [overflow-wrap:anywhere] [word-break:break-word] overflow-hidden text-ellipsis ${className}`}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={finish}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Tab" && onNext) {
            e.preventDefault();
            finish();
            onNext();
          } else if (e.key === "Escape") {
            cancelled.current = true;
            setDraft(value);
            e.currentTarget.blur();
          }
        }}
      />
    );
  }

  const isPlaceholder = String(value || "").includes("{{");

  return (
    <span
      style={style}
      className={`relative rounded-xs min-h-[1.25em] min-w-0 max-w-full break-words [overflow-wrap:anywhere] [word-break:break-word] inline-block ${
        preview ? "cursor-default select-text" : "cursor-text"
      } transition-colors ${
        isPlaceholder
          ? resolveVariables
            ? "text-blue-900 bg-blue-50/60 font-medium px-1 rounded break-words [overflow-wrap:anywhere]"
            : "text-blue-600 bg-blue-50/40 px-1 rounded font-mono text-[11px] break-all"
          : ""
      } ${
        !preview ? "hover:outline-1 hover:outline-dashed hover:outline-blue-300 hover:bg-blue-50/30" : ""
      } ${isSelected ? "outline-2 outline-blue-600 bg-blue-50/80 shadow-xs" : ""} ${className}`}
      tabIndex={preview ? -1 : 0}
      role={preview ? undefined : "button"}
      onClick={(e) => {
        if (!preview) {
          e.stopPropagation();
          if (isSelected && !editing) {
            setDraft(value);
            setEditing(true);
          } else {
            onSelect(part);
          }
        }
      }}
      onDoubleClick={(e) => {
        if (!preview) {
          e.stopPropagation();
          onSelect(part);
          setDraft(value);
          setEditing(true);
        }
      }}
      onKeyDown={(e) => {
        if (preview) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onSelect(part);
          setDraft(value);
          setEditing(true);
          return;
        }
        if (
          !editing &&
          e.key.length === 1 &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey
        ) {
          e.stopPropagation();
          onSelect(part);
          setDraft(e.key);
          setEditing(true);
        }
      }}
      title={
        preview
          ? undefined
          : resolveVariables
          ? "Displaying mock sample data. Double-click to edit variable."
          : "Click to select, click again or double-click to edit in place"
      }
    >
      {displayValue || placeholder || (allowEmpty ? "" : "—")}
    </span>
  );
}
