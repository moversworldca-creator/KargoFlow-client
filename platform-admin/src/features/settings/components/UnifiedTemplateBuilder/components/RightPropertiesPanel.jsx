import React, { useEffect, useState } from "react";
import {
  Trash2,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Eye,
  EyeOff,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  Columns,
  Table,
  DollarSign,
  Calculator,
  Sliders,
  Check,
  AlertCircle,
  X,
  ImageIcon,
  Upload,
  Mail,
  MessageSquare,
  Info,
  Monitor,
  Tablet,
  Smartphone,
  Loader2,
  Send,
} from "lucide-react";
import { createId } from "../model/templateModel";
import { getVariablesForMode } from "../config/variableRegistry";
import { analyzeSmsText } from "../core/smsCalculator";
import { getBuilderMeta } from "../../../../../services/api";
import {
  insertRows,
  insertCols,
  deleteRowKeepGap,
  deleteColKeepGap,
  mergeSelectedCells,
  clearSelectedCells,
  buildLogicalGrid,
} from "../core/tableOperations";

function SchemaField({ name, schema = {}, value, onChange }) {
  const [jsonValue, setJsonValue] = useState(() => JSON.stringify(value ?? (schema.type === "array" ? [] : {}), null, 2));
  const [jsonError, setJsonError] = useState("");

  const inputClass = "w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500";
  if (schema.type === "boolean") {
    return (
      <label className="flex min-h-8 items-center justify-between gap-3 cursor-pointer text-[11px] font-medium text-slate-600">
        <span className="grow capitalize">
          {name.replace(/_/g, " ")}{schema.required ? " *" : ""}
        </span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
        />
      </label>
    );
  }

  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-slate-600">
        {name.replace(/_/g, " ")}{schema.required ? " *" : ""}
      </span>
      {schema.enum ? (
        <select className={inputClass} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
          {schema.enum.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : schema.type === "integer" || schema.type === "number" ? (
        <input
          type="number"
          min={schema.minimum}
          max={schema.maximum}
          className={inputClass}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
        />
      ) : schema.type === "array" || schema.type === "object" ? (
        <>
          <textarea
            className={`${inputClass} min-h-20 font-mono`}
            value={jsonValue}
            onChange={(event) => {
              setJsonValue(event.target.value);
              setJsonError("");
            }}
            onBlur={() => {
              try {
                const parsed = JSON.parse(jsonValue);
                if (schema.type === "array" ? Array.isArray(parsed) : parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                  onChange(parsed);
                  setJsonError("");
                } else setJsonError(`Enter a JSON ${schema.type}.`);
              } catch {
                setJsonError("Enter valid JSON.");
              }
            }}
          />
          {jsonError && <span role="alert" className="text-[10px] text-red-600">{jsonError}</span>}
        </>
      ) : schema.format === "html" || name === "html" ? (
        <textarea className={`${inputClass} min-h-24`} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className={inputClass} type="text" value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export const FONT_FAMILIES = [
  {
    group: "Modern Sans-Serif",
    fonts: [
      { label: "Inter", value: "Inter, sans-serif" },
      { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif" },
      { label: "Roboto", value: "Roboto, sans-serif" },
      { label: "Open Sans", value: "'Open Sans', sans-serif" },
      { label: "Lato", value: "Lato, sans-serif" },
      { label: "Montserrat", value: "Montserrat, sans-serif" },
      { label: "Poppins", value: "Poppins, sans-serif" },
      { label: "Arial", value: "Arial, sans-serif" },
      { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
      { label: "Verdana", value: "Verdana, sans-serif" },
    ],
  },
  {
    group: "Elegant Serif",
    fonts: [
      { label: "Georgia", value: "Georgia, serif" },
      { label: "Merriweather", value: "Merriweather, serif" },
      { label: "Playfair Display", value: "'Playfair Display', serif" },
      { label: "Lora", value: "Lora, serif" },
      { label: "Times New Roman", value: "'Times New Roman', serif" },
      { label: "Garamond", value: "Garamond, serif" },
    ],
  },
  {
    group: "Monospace & Technical",
    fonts: [
      { label: "Roboto Mono", value: "'Roboto Mono', monospace" },
      { label: "Fira Code", value: "'Fira Code', monospace" },
      { label: "Courier New", value: "'Courier New', monospace" },
      { label: "Consolas", value: "Consolas, monospace" },
    ],
  },
];

export default function RightPropertiesPanel({
  selectedItem,
  selection = null,
  onUpdateItem,
  onDeleteItem,
  onDuplicateItem,
  documentSettings,
  onUpdateDocumentSettings,
  docName = "Standard Estimate",
  onUpdateDocName = () => {},
  pageSize = "A4",
  onPageSizeChange = () => {},
  orientation = "Portrait",
  onOrientationChange = () => {},
  mode = "estimate",
  branches = [],
  smsText = "",
  devicePreview = "desktop",
  onClosePanel = () => {},
  onModeChange,
  onSendTestEmail,
  isSendingTest = false,
}) {
  const [insertCount, setInsertCount] = useState(1);
  const [testToEmail, setTestToEmail] = useState("");
  const [localSendingTest, setLocalSendingTest] = useState(false);
  const [testStatusMsg, setTestStatusMsg] = useState(null);
  const [savedClauses, setSavedClauses] = useState([]);
  const [clauseLoadError, setClauseLoadError] = useState("");
  const [backendBlockMeta, setBackendBlockMeta] = useState({ kind: null, blocks: [], error: "" });
  const activeBuilderKind = ["estimate", "estimate_portal"].includes(mode) ? "estimate_portal" : mode === "invoice" ? "invoice" : "document";

  useEffect(() => {
    if (selectedItem?.type !== "builder_block" || Object.keys(selectedItem.propsSchema?.properties || {}).length > 0) return undefined;
    let isMounted = true;
    getBuilderMeta(activeBuilderKind)
      .then((res) => {
        const data = res?.data ?? res;
        if (!Array.isArray(data?.blocks)) throw new Error("The Builder widget palette response is invalid.");
        if (isMounted) setBackendBlockMeta({ kind: activeBuilderKind, blocks: data.blocks, error: "" });
      })
      .catch((error) => {
        if (isMounted) {
          setBackendBlockMeta({
            kind: activeBuilderKind,
            blocks: [],
            error: error?.response?.data?.detail || error.message || "Unable to load widget settings.",
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [selectedItem?.type, selectedItem?.blockType, activeBuilderKind, selectedItem?.propsSchema]);

  const selectedBlockSchema = Object.keys(selectedItem?.propsSchema?.properties || {}).length > 0
    ? selectedItem.propsSchema
    : backendBlockMeta.kind === activeBuilderKind
      ? backendBlockMeta.blocks.find((block) => block.type === selectedItem?.blockType)?.props_schema
      : null;

  const handleSendTestClick = async () => {
    const trimmed = (testToEmail || "").trim();
    if (!trimmed) {
      setTestStatusMsg({ type: "error", text: "Please enter a test email address." });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setTestStatusMsg({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    setTestStatusMsg(null);
    if (onSendTestEmail) {
      try {
        await onSendTestEmail(trimmed);
        setTestStatusMsg({ type: "success", text: "Test email sent successfully!" });
      } catch (err) {
        setTestStatusMsg({ type: "error", text: err?.message || "Failed to send test email." });
      }
    } else {
      setTestStatusMsg({ type: "error", text: "Global templates support sample preview. Test sending is not available." });
    }
  };

  // 1. If no item selected, display document-level settings
  if (!selectedItem) {
    if (mode === "email") {
      return (
        <aside className="w-80 max-w-[85vw] bg-white border-l border-slate-200 p-4 flex flex-col h-full min-h-0 select-none overflow-y-auto">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Email Settings
              </h3>
            </div>
            <button
              type="button"
              onClick={onClosePanel}
              className="xl:hidden p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Close panel"
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Channel</label>
              <select
                disabled={!onModeChange}
                value={documentSettings?.channel || mode || "email"}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateDocumentSettings({ ...documentSettings, channel: val });
                  if (onModeChange) onModeChange(val);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 font-medium"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Category</label>
              <input
                type="text"
                value={documentSettings?.category || "Email"}
                onChange={(e) =>
                  onUpdateDocumentSettings({ ...documentSettings, category: e.target.value })
                }
                placeholder="e.g. Transactional, Marketing, Notifications"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Email Subject</label>
              <input
                type="text"
                value={documentSettings?.subject || ""}
                onChange={(e) =>
                  onUpdateDocumentSettings({ ...documentSettings, subject: e.target.value })
                }
                placeholder="e.g. Your Move Quote #{{estimate_number}}"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Supports dynamic merge tags like {'{{customer_name}}'}</span>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Description</label>
              <input
                type="text"
                value={documentSettings?.description || ""}
                onChange={(e) =>
                  onUpdateDocumentSettings({ ...documentSettings, description: e.target.value })
                }
                placeholder="What this template is used for"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Template Name</label>
              <input
                type="text"
                value={docName}
                onChange={(e) => onUpdateDocName(e.target.value)}
                placeholder="e.g. Booking Confirmation Email"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Template Key</label>
              <input
                type="text"
                value={documentSettings?.template_key || ""}
                onChange={(e) =>
                  onUpdateDocumentSettings({ ...documentSettings, template_key: e.target.value })
                }
                placeholder="e.g. quote_sent, job_confirmed"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 font-mono font-medium"
              />
            </div>

            {branches && branches.length > 0 && (
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Branch Scope</label>
                <select
                  value={documentSettings?.branch || ""}
                  onChange={(e) =>
                    onUpdateDocumentSettings({
                      ...documentSettings,
                      branch: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-700 font-medium"
                >
                  <option value="">All Branches (Global)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Testing Section */}
            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                <Send size={13} className="text-blue-600" />
                <span>Testing</span>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">To Email</label>
                <input
                  type="email"
                  value={testToEmail}
                  onChange={(e) => {
                    setTestToEmail(e.target.value);
                    if (testStatusMsg) setTestStatusMsg(null);
                  }}
                  placeholder="customer@example.com"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleSendTestClick}
                disabled={!onSendTestEmail || isSendingTest || localSendingTest}
                className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                {(isSendingTest || localSendingTest) ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                <span>Send Test Email</span>
              </button>

              {testStatusMsg && (
                <div
                  className={`p-2 rounded-lg text-[11px] font-medium flex items-center gap-1.5 ${
                    testStatusMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {testStatusMsg.type === "success" ? (
                    <Check size={12} className="shrink-0" />
                  ) : (
                    <AlertCircle size={12} className="shrink-0" />
                  )}
                  <span>{testStatusMsg.text}</span>
                </div>
              )}
            </div>

            {/* Responsive Viewport Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            </div>
          </div>
        </aside>
      );
    }

    if (mode === "sms") {
      const smsAnalysis = analyzeSmsText(smsText || "");
      return (
        <aside className="w-80 max-w-[85vw] bg-white border-l border-slate-200 p-4 flex flex-col h-full min-h-0 select-none overflow-y-auto">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                SMS Settings
              </h3>
            </div>
            <button
              type="button"
              onClick={onClosePanel}
              className="xl:hidden p-1 text-slate-400 hover:text-slate-600 rounded"
              title="Close panel"
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Template Name</label>
              <input
                type="text"
                value={docName}
                onChange={(e) => onUpdateDocName(e.target.value)}
                placeholder="e.g. Appointment Reminder SMS"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Template Key</label>
              <input
                type="text"
                value={documentSettings?.template_key || ""}
                onChange={(e) =>
                  onUpdateDocumentSettings({ ...documentSettings, template_key: e.target.value })
                }
                placeholder="e.g. reminder_sms, dispatched_sms"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Category</label>
              <input
                type="text"
                value={documentSettings?.category || "SMS"}
                onChange={(e) =>
                  onUpdateDocumentSettings({ ...documentSettings, category: e.target.value })
                }
                placeholder="e.g. SMS Notifications, Alerts"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-700"
              />
            </div>

            {branches && branches.length > 0 && (
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Branch Scope</label>
                <select
                  value={documentSettings?.branch || ""}
                  onChange={(e) =>
                    onUpdateDocumentSettings({
                      ...documentSettings,
                      branch: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-700 font-medium"
                >
                  <option value="">All Branches (Global)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* SMS Message Font Size */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Message Font Size (px)</label>
              <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:bg-white">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDocumentSettings({
                      ...documentSettings,
                      fontSize: Math.max(10, (documentSettings?.fontSize || 13) - 1),
                    })
                  }
                  className="p-1.5 hover:bg-slate-200 text-slate-600 transition"
                  title="Decrease SMS font size"
                  aria-label="Decrease SMS font size"
                >
                  <Minus size={12} />
                </button>
                <input
                  type="number"
                  min="10"
                  max="24"
                  aria-label="Message font size"
                  value={documentSettings?.fontSize || 13}
                  onChange={(e) =>
                    onUpdateDocumentSettings({
                      ...documentSettings,
                      fontSize: Math.max(10, Math.min(24, Number(e.target.value) || 13)),
                    })
                  }
                  className="w-full px-1 py-1 text-center bg-transparent border-0 outline-none text-xs font-semibold text-slate-800"
                />
                <button
                  type="button"
                  onClick={() =>
                    onUpdateDocumentSettings({
                      ...documentSettings,
                      fontSize: Math.min(24, (documentSettings?.fontSize || 13) + 1),
                    })
                  }
                  className="p-1.5 hover:bg-slate-200 text-slate-600 transition"
                  title="Increase SMS font size"
                  aria-label="Increase SMS font size"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            {/* Carrier Diagnostics Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span>Carrier Payload Metrics</span>
                <span className="font-mono text-emerald-700 font-semibold">{smsAnalysis.encoding}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <div className="text-base font-bold text-slate-800">{smsAnalysis.charCount}</div>
                  <div className="text-[10px] text-slate-500">Total Characters</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <div className="text-base font-bold text-slate-800">{smsAnalysis.segments}</div>
                  <div className="text-[10px] text-slate-500">SMS Segment{smsAnalysis.segments === 1 ? "" : "s"}</div>
                </div>
              </div>
              <div className="text-[10.5px] text-slate-500">
                {smsAnalysis.encoding === "GSM-7"
                  ? "Standard GSM-7 7-bit charset (160 characters per single message segment)."
                  : "Unicode UCS-2 characters detected (70 characters per segment)."}
              </div>
            </div>
          </div>

          <div className="mt-auto p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed">
            <p className="font-semibold text-slate-700 mb-1">SMS Simulator</p>
            Edit your message directly in the interactive smartphone simulator or insert merge tags from the left sidebar.
          </div>
        </aside>
      );
    }

    const isLandscape = String(orientation).toLowerCase() === "landscape";
    return (
      <aside className="w-80 max-w-[85vw] bg-white border-l border-slate-200 p-4 flex flex-col h-full min-h-0 select-none overflow-y-auto">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Document Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClosePanel}
            className="xl:hidden p-1 text-slate-400 hover:text-slate-600 rounded"
            title="Close panel"
            aria-label="Close panel"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Template Name</label>
            <input
              type="text"
              value={docName}
              onChange={(e) => onUpdateDocName(e.target.value)}
              placeholder="e.g. Standard Freight Estimate"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Category</label>
            <input
              type="text"
              value={documentSettings?.category || "Estimate"}
              onChange={(e) =>
                onUpdateDocumentSettings({ ...documentSettings, category: e.target.value })
              }
              placeholder="e.g. Estimate, Invoice, Quote"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-700"
            />
          </div>

          {mode === "estimate" && (
            <div>
              <label htmlFor="portal-template-type-select" className="block text-slate-600 font-semibold mb-1">
                Template Type
              </label>
              <select
                id="portal-template-type-select"
                aria-label="Template Type"
                value={documentSettings?.template_type || "binding"}
                onChange={(e) =>
                  onUpdateDocumentSettings({ ...documentSettings, template_type: e.target.value, subtype: e.target.value })
                }
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-700 font-medium"
              >
                <option value="binding">Binding</option>
                <option value="non_binding">Non-Binding</option>
                <option value="hourly">Hourly</option>
                <option value="flat_rate">Flat Rate</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Page Size</label>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-700 font-medium"
              >
                <option value="A4">A4 (210×297)</option>
                <option value="Letter">Letter (8.5×11)</option>
                <option value="Legal">Legal (8.5×14)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Orientation</label>
              <select
                value={orientation}
                onChange={(e) => onOrientationChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-700 font-medium"
              >
                <option value="Portrait">Portrait</option>
                <option value="Landscape">Landscape</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Estimate Validity Period</label>
            <input
              type="text"
              value={documentSettings?.validity || "30 days"}
              onChange={(e) =>
                onUpdateDocumentSettings({ ...documentSettings, validity: e.target.value })
              }
              placeholder="e.g. 30 days"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs text-slate-700"
            />
          </div>

          {/* Base Document Font Size */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Base Document Font Size (px)</label>
            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:bg-white">
              <button
                type="button"
                onClick={() =>
                  onUpdateDocumentSettings({
                    ...documentSettings,
                    fontSize: Math.max(8, (documentSettings?.fontSize || 12) - 1),
                  })
                }
                className="p-1.5 hover:bg-slate-200 text-slate-600 transition"
                title="Decrease base font size"
                aria-label="Decrease base font size"
              >
                <Minus size={12} />
              </button>
              <input
                type="number"
                min="8"
                max="32"
                aria-label="Base font size"
                value={documentSettings?.fontSize || 12}
                onChange={(e) =>
                  onUpdateDocumentSettings({
                    ...documentSettings,
                    fontSize: Math.max(8, Math.min(32, Number(e.target.value) || 12)),
                  })
                }
                className="w-full px-1 py-1 text-center bg-transparent border-0 outline-none text-xs font-semibold text-slate-800"
              />
              <button
                type="button"
                onClick={() =>
                  onUpdateDocumentSettings({
                    ...documentSettings,
                    fontSize: Math.min(32, (documentSettings?.fontSize || 12) + 1),
                  })
                }
                className="p-1.5 hover:bg-slate-200 text-slate-600 transition"
                title="Increase base font size"
                aria-label="Increase base font size"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const style = selectedItem.style || {};

  const handleStyleChange = (patch) => {
    onUpdateItem({
      ...selectedItem,
      style: { ...style, ...patch },
    });
  };

  // Helper: Patch table settings
  const patchTableSettings = (settingsPatch) => {
    onUpdateItem({
      ...selectedItem,
      tableSettings: {
        ...(selectedItem.tableSettings || {}),
        ...settingsPatch,
      },
    });
  };

  // ==========================================
  // TABLE INSPECTOR HELPERS & STATE
  // ==========================================
  const rows = selectedItem.tableRows || [];
  const settings = selectedItem.tableSettings || {};
  const currentColsCount = rows[0]?.cells?.length || 0;

  // Selected cell detection from selection prop
  const isCellSelection = Boolean(selection?.part?.startsWith("cell:"));
  const selectedCellId = isCellSelection ? selection.part.replace("cell:", "") : null;
  const multiCellIds = selection?.multiCellIds || (selectedCellId ? [selectedCellId] : []);

  // Find selected cell object & coordinate
  let selRowIdx = -1;
  let selColIdx = -1;
  let selCellObj = null;

  if (selectedCellId && rows.length > 0) {
    const { cellCoordMap, matrix } = buildLogicalGrid(rows);
    const coord = cellCoordMap.get(selectedCellId);
    if (coord) {
      selRowIdx = coord.row;
      selColIdx = coord.col;
      selCellObj = matrix[coord.row]?.[coord.col]?.cell || null;
    }
  }

  // Update selected cell(s)
  const updateCell = (patch) => {
    const targetSet = new Set(multiCellIds.length > 0 ? multiCellIds : (selectedCellId ? [selectedCellId] : []));
    const nextRows = rows.map((r) => ({
      ...r,
      cells: (r.cells || []).map((c) => {
        if (targetSet.size === 0 || targetSet.has(c.id)) {
          return { ...c, ...patch };
        }
        return c;
      }),
    }));
    onUpdateItem({ ...selectedItem, tableRows: nextRows });
  };

  // Add rows / cols to custom table
  const handleAddRow = (direction) => {
    const atIdx = selRowIdx >= 0 ? selRowIdx : direction === "above" ? 0 : rows.length - 1;
    const next = insertRows(rows, atIdx, direction, insertCount);
    onUpdateItem({ ...selectedItem, tableRows: next });
  };

  const handleAddCol = (direction) => {
    const atIdx = selColIdx >= 0 ? selColIdx : direction === "left" ? 0 : currentColsCount - 1;
    const res = insertCols(rows, settings, atIdx, direction, insertCount);
    onUpdateItem({ ...selectedItem, tableRows: res.rows, tableSettings: res.settings });
  };

  const handleDeleteRowGap = () => {
    const targetRowIdx = selRowIdx >= 0 ? selRowIdx : 0;
    const next = deleteRowKeepGap(rows, [targetRowIdx]);
    onUpdateItem({ ...selectedItem, tableRows: next });
  };

  const handleDeleteColGap = () => {
    const targetColIdx = selColIdx >= 0 ? selColIdx : 0;
    const res = deleteColKeepGap(rows, settings, [targetColIdx]);
    onUpdateItem({ ...selectedItem, tableRows: res.rows, tableSettings: res.settings });
  };

  const handleClearCells = () => {
    const targetIds = multiCellIds.length > 0 ? multiCellIds : (selectedCellId ? [selectedCellId] : rows.flatMap(r => r.cells.map(c => c.id)));
    const next = clearSelectedCells(rows, targetIds);
    onUpdateItem({ ...selectedItem, tableRows: next });
  };

  // Distribute custom table columns evenly
  const distributeColsEvenly = () => {
    if (currentColsCount <= 0) return;
    const equalWidth = +(100 / currentColsCount).toFixed(1);
    const newWidths = Array.from({ length: currentColsCount }, (_, i) =>
      i === currentColsCount - 1 ? +(100 - equalWidth * (currentColsCount - 1)).toFixed(1) : equalWidth
    );
    patchTableSettings({ columnWidths: newWidths });
  };

  // Column width percentage array for table
  const columnWidths =
    settings.columnWidths && settings.columnWidths.length === currentColsCount
      ? settings.columnWidths
      : Array.from({ length: currentColsCount || 1 }, () => +(100 / (currentColsCount || 1)).toFixed(1));

  const totalTableColWidth = Math.round(columnWidths.reduce((a, b) => a + Number(b || 0), 0));

  // ==========================================
  // CHARGES TABLE HELPERS
  // ==========================================
  const chargesCols = selectedItem.columns || [];
  const chargesRows = selectedItem.rows || [];
  const totalChargesColWidth = Math.round(
    chargesCols.filter((c) => c.visible !== false).reduce((sum, c) => sum + Number(c.width || 0), 0)
  );

  const distributeChargesColsEvenly = () => {
    const visibleCols = chargesCols.filter((c) => c.visible !== false);
    if (visibleCols.length === 0) return;
    const equalW = Math.floor(100 / visibleCols.length);
    const remainder = 100 - equalW * visibleCols.length;
    let visibleIdx = 0;
    const nextCols = chargesCols.map((c) => {
      if (c.visible === false) return c;
      const w = visibleIdx === 0 ? equalW + remainder : equalW;
      visibleIdx++;
      return { ...c, width: w };
    });
    onUpdateItem({ ...selectedItem, columns: nextCols });
  };

  const moveChargeRow = (from, to) => {
    if (to < 0 || to >= chargesRows.length) return;
    const nextRows = [...chargesRows];
    const [moved] = nextRows.splice(from, 1);
    nextRows.splice(to, 0, moved);
    onUpdateItem({ ...selectedItem, rows: nextRows });
  };

  return (
    <aside className="w-80 max-w-[85vw] bg-white border-l border-slate-200 flex flex-col h-full min-h-0 select-none overflow-hidden">
      {/* Inspector Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">
              {selectedItem.type}
            </span>
            <h3 className="text-xs font-bold text-slate-800 truncate">{selectedItem.label}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDuplicateItem}
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
            title="Duplicate Widget"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            onClick={onDeleteItem}
            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition"
            title="Delete Widget"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            onClick={onClosePanel}
            className="xl:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded ml-1"
            title="Close panel"
            aria-label="Close panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Widget Label Input */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">Widget Label</label>
          <input
            type="text"
            value={selectedItem.label || ""}
            onChange={(e) => onUpdateItem({ ...selectedItem, label: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 text-xs font-medium text-slate-800"
          />
        </div>

        {selectedItem.type === "builder_block" && selectedItem.blockType !== "conditional" && (
          <section className="space-y-3 border-t border-slate-100 pt-3">
            <h4 className="font-bold uppercase tracking-wide text-[11px] text-slate-700">
              {selectedItem.blockType?.replace(/_/g, " ")} settings
            </h4>
            <div className="space-y-2.5">
              {Object.entries(selectedBlockSchema?.properties || {}).length > 0
                ? Object.entries(selectedBlockSchema.properties)
                  .filter(([name]) => !(selectedItem.blockType === "conditional" && name === "rule_key"))
                  .map(([name, schema]) => (
                  name === "block_id" && selectedItem.blockType === "clause" && savedClauses.length > 0 ? (
                    <label key={name} className="block space-y-1">
                      <span className="text-[11px] font-medium text-slate-600">Saved clause *</span>
                      <select
                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"
                        value={selectedItem.props?.block_id ?? ""}
                        onChange={(event) => onUpdateItem({
                          ...selectedItem,
                          props: { ...(selectedItem.props || {}), block_id: Number(event.target.value) },
                        })}
                      >
                        <option value="">Choose a saved clause</option>
                        {savedClauses.map((clause) => (
                          <option key={clause.id} value={clause.id}>
                            {clause.name || clause.label || `Clause #${clause.id}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <SchemaField
                      key={`${selectedItem.id}-${selectedItem.blockType}-${name}`}
                      name={name}
                      schema={{ ...schema, required: schema.required || selectedBlockSchema.required?.includes(name) }}
                      value={selectedItem.props?.[name]}
                      onChange={(value) => onUpdateItem({
                        ...selectedItem,
                        props: { ...(selectedItem.props || {}), [name]: value },
                      })}
                    />
                  )
                ))
                : (
                  <SchemaField
                    key={`props-${selectedItem.id}-${selectedItem.blockType}`}
                    name="props"
                    schema={{ type: "object" }}
                    value={selectedItem.props || {}}
                    onChange={(props) => onUpdateItem({ ...selectedItem, props })}
                  />
                )}
                {backendBlockMeta.error && !selectedBlockSchema && (
                  <p role="alert" className="text-[10px] text-red-600">{backendBlockMeta.error}</p>
                )}
            </div>
            {selectedItem.blockType === "clause" && clauseLoadError && (
              <p role="alert" className="text-[10px] text-red-600">
                {clauseLoadError} Enter the ID of a saved clause manually.
              </p>
            )}
            {selectedItem.blockType === "clause" && !clauseLoadError && savedClauses.length === 0 && (
              <p className="text-[10px] text-slate-500">No saved clauses are available yet. Enter an existing clause ID or add one from the reusable blocks library.</p>
            )}
            {selectedItem.blockType === "image" && (
              <p className="text-[10px] text-slate-500">Use the ID of an image already uploaded to your company files.</p>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* 1. TABLE STRUCTURE & LAYOUT INSPECTOR (when selectedItem.type === "table") */}
        {/* ========================================================================= */}
        {selectedItem.type === "table" && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {/* Table Structure */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Table size={14} className="text-blue-600" />
                  Table Structure
                </span>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {rows.length}R × {currentColsCount}C
                </span>
              </div>

              {/* Multi-insert quantity selector */}
              <div className="flex items-center justify-between mb-2.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-600 font-medium">Batch count:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setInsertCount(cnt)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                        insertCount === cnt
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddRow("above")}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] text-left transition"
                  title="Insert row above"
                  aria-label="Insert row above"
                >
                  + Row Above {insertCount > 1 ? `(${insertCount})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => handleAddRow("below")}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] text-left transition"
                  title="Insert row below"
                  aria-label="Insert row below"
                >
                  + Row Below {insertCount > 1 ? `(${insertCount})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCol("left")}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] text-left transition"
                  title="Insert column left"
                  aria-label="Insert column left"
                >
                  + Col Left {insertCount > 1 ? `(${insertCount})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCol("right")}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] text-left transition"
                  title="Insert column right"
                  aria-label="Insert column right"
                >
                  + Col Right {insertCount > 1 ? `(${insertCount})` : ""}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRowGap}
                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg text-[11px] text-left transition"
                  title="Delete row and preserve dimensional height gap"
                >
                  Delete Row & Gap
                </button>
                <button
                  type="button"
                  onClick={handleDeleteColGap}
                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg text-[11px] text-left transition"
                  title="Delete column and preserve dimensional width gap"
                >
                  Delete Col & Gap
                </button>
              </div>

              <button
                type="button"
                onClick={handleClearCells}
                className="w-full mt-1.5 py-1.5 text-center text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Clear Cell Contents (Retain Layout)
              </button>
            </div>

            {/* Table Layout & Padding */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Table Layout</span>
                <button
                  type="button"
                  onClick={distributeColsEvenly}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition"
                >
                  Equal Columns
                </button>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Table Width</label>
                <select
                  value={selectedItem.width || "full"}
                  onChange={(e) => onUpdateItem({ ...selectedItem, width: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="full">Full width (100%)</option>
                  <option value="half">Half width (50%)</option>
                  <option value="auto">Auto width</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-600 font-medium">Cell Padding</label>
                  <span className="text-[11px] font-mono text-slate-500">{settings.cellPadding ?? 8}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="24"
                  value={settings.cellPadding ?? 8}
                  onChange={(e) => patchTableSettings({ cellPadding: Number(e.target.value) })}
                  className="w-full cursor-pointer"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="text-xs text-slate-700 font-medium">Header Row (Distinct BG)</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.headerRow)}
                    onChange={(e) => patchTableSettings({ headerRow: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="text-xs text-slate-700 font-medium">Zebra Striped Rows</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.striped)}
                    onChange={(e) => patchTableSettings({ striped: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="text-xs text-slate-700 font-medium">Stack Columns on Mobile</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.mobileStack)}
                    onChange={(e) => patchTableSettings({ mobileStack: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                </label>
              </div>
            </div>

            {/* Column Width Distribution Sliders */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Column Distribution ({totalTableColWidth}%)
                </span>
                {totalTableColWidth !== 100 && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold" title="Total should equal 100%">
                    <AlertCircle size={12} /> !=100%
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {columnWidths.map((w, cIdx) => (
                  <div key={cIdx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-slate-700">Column {cIdx + 1}</span>
                      <span className="font-mono text-slate-500">{w}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={w}
                      onChange={(e) => {
                        const nextW = [...columnWidths];
                        nextW[cIdx] = Number(e.target.value);
                        patchTableSettings({ columnWidths: nextW });
                      }}
                      className="w-full cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Cell Formatting Inspector */}
            <div className="space-y-3 pt-3 border-t border-slate-100 bg-blue-50/40 p-3 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Sliders size={13} className="text-blue-600" />
                  {selCellObj ? `Cell (${selRowIdx + 1}, ${selColIdx + 1})` : "Cell Formatting"}
                </span>
                <span className="text-[10px] text-blue-600 font-semibold">
                  {multiCellIds.length > 1 ? `${multiCellIds.length} Cells Selected` : selCellObj ? "Active" : "All Cells"}
                </span>
              </div>

              {/* Cell Font Family & Size */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Cell Font</label>
                  <select
                    value={selCellObj?.fontFamily || ""}
                    onChange={(e) => updateCell({ fontFamily: e.target.value })}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-700"
                  >
                    <option value="">Default (Table Font)</option>
                    {FONT_FAMILIES.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.fonts.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Size (px)</label>
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = selCellObj?.fontSize || 12;
                        updateCell({ fontSize: Math.max(8, cur - 1) });
                      }}
                      className="p-1 hover:bg-slate-100 text-slate-600 transition"
                      title="Decrease cell font size"
                      aria-label="Decrease cell font size"
                    >
                      <Minus size={11} />
                    </button>
                    <input
                      type="number"
                      min="8"
                      max="48"
                      placeholder="12"
                      aria-label="Cell font size"
                      value={selCellObj?.fontSize || ""}
                      onChange={(e) => updateCell({ fontSize: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-1 py-1 text-center bg-transparent border-0 outline-none text-[11px] text-slate-700 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = selCellObj?.fontSize || 12;
                        updateCell({ fontSize: Math.min(48, cur + 1) });
                      }}
                      className="p-1 hover:bg-slate-100 text-slate-600 transition"
                      title="Increase cell font size"
                      aria-label="Increase cell font size"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Text formatting & colors */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateCell({ bold: !selCellObj?.bold })}
                  className={`p-1.5 rounded border transition ${
                    selCellObj?.bold ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => updateCell({ italic: !selCellObj?.italic })}
                  className={`p-1.5 rounded border transition ${
                    selCellObj?.italic ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Italic"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => updateCell({ underline: !selCellObj?.underline })}
                  className={`p-1.5 rounded border transition ${
                    selCellObj?.underline ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Underline"
                >
                  <Underline size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => updateCell({ strikethrough: !selCellObj?.strikethrough })}
                  className={`p-1.5 rounded border transition ${
                    selCellObj?.strikethrough ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Strikethrough"
                >
                  <Strikethrough size={13} />
                </button>

                <span className="w-px h-5 bg-slate-300 mx-1" />

                {/* Text Color */}
                <label className="flex items-center gap-1 cursor-pointer bg-white p-1 rounded border border-slate-200 hover:bg-slate-50" title="Text Color">
                  <span className="text-[11px] font-bold text-amber-500">A</span>
                  <input
                    type="color"
                    value={selCellObj?.color || "#0f172a"}
                    onChange={(e) => updateCell({ color: e.target.value })}
                    className="sr-only"
                  />
                </label>

                {/* Background Color */}
                <label className="flex items-center gap-1 cursor-pointer bg-white p-1 rounded border border-slate-200 hover:bg-slate-50" title="Cell Background Color">
                  <span
                    className="w-3.5 h-3.5 rounded border border-slate-400 inline-block"
                    style={{ backgroundColor: selCellObj?.backgroundColor || "#ffffff" }}
                  />
                  <input
                    type="color"
                    value={selCellObj?.backgroundColor || "#ffffff"}
                    onChange={(e) => updateCell({ backgroundColor: e.target.value })}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Horizontal Alignment */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Horizontal Align</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["left", "center", "right"]).map((al) => (
                    <button
                      key={al}
                      type="button"
                      onClick={() => updateCell({ textAlign: al })}
                      className={`py-1 rounded text-[11px] font-semibold border transition ${
                        (selCellObj?.textAlign || "left") === al
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {al[0].toUpperCase() + al.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vertical Alignment */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Vertical Align</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["top", "middle", "bottom"]).map((valign) => (
                    <button
                      key={valign}
                      type="button"
                      onClick={() => updateCell({ verticalAlign: valign })}
                      className={`py-1 rounded text-[11px] font-semibold border transition ${
                        (selCellObj?.verticalAlign || "middle") === valign
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {valign === "middle" ? "Middle" : valign[0].toUpperCase() + valign.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table Borders */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <span className="font-bold text-slate-800">Table Borders</span>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Border Scope</label>
                <select
                  value={settings.borderScope || "all"}
                  onChange={(e) => patchTableSettings({ borderScope: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="all">All borders</option>
                  <option value="outside">Outside borders only</option>
                  <option value="inside">Inside gridlines only</option>
                  <option value="horizontal">Horizontal borders only</option>
                  <option value="vertical">Vertical borders only</option>
                  <option value="none">No borders</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Style</label>
                  <select
                    value={settings.borderStyle || "solid"}
                    onChange={(e) => patchTableSettings({ borderStyle: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Width (px)</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={settings.borderWidth ?? 1}
                    onChange={(e) => patchTableSettings({ borderWidth: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Border Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.borderColor || "#cbd5e1"}
                    onChange={(e) => patchTableSettings({ borderColor: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                  />
                  <span className="font-mono text-xs text-slate-500">{settings.borderColor || "#cbd5e1"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. ITEMIZED CHARGES INSPECTOR (when selectedItem.type === "charges")       */}
        {/* ========================================================================= */}
        {selectedItem.type === "charges" && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {/* Columns Management */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Columns size={14} className="text-blue-600" />
                  Table Columns ({totalChargesColWidth}%)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={distributeChargesColsEvenly}
                    className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition"
                    title="Distribute column widths evenly to 100%"
                  >
                    Distribute
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newCol = {
                        id: createId("col"),
                        label: "New Column",
                        key: `custom_${chargesCols.length + 1}`,
                        width: 15,
                        align: "right",
                        visible: true,
                      };
                      const allCols = [...chargesCols, newCol];
                      const visibleCols = allCols.filter((c) => c.visible !== false);
                      const eq = Math.floor(100 / visibleCols.length);
                      const rem = 100 - eq * visibleCols.length;
                      let vIdx = 0;
                      const nextCols = allCols.map((c) => {
                        if (c.visible === false) return c;
                        const w = vIdx === 0 ? eq + rem : eq;
                        vIdx++;
                        return { ...c, width: w };
                      });
                      onUpdateItem({
                        ...selectedItem,
                        columns: nextCols,
                      });
                    }}
                    className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition"
                    title="Add column"
                    aria-label="Add column"
                  >
                    + Add Column
                  </button>
                </div>
              </div>

              {/* Column list */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {chargesCols.map((col, idx) => (
                  <div key={col.id || idx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={col.visible !== false}
                        onChange={(e) => {
                          const next = chargesCols.map((c, i) =>
                            i === idx ? { ...c, visible: e.target.checked } : c
                          );
                          onUpdateItem({ ...selectedItem, columns: next });
                        }}
                        className="rounded text-blue-600"
                      />
                      <input
                        type="text"
                        value={col.label}
                        onChange={(e) => {
                          const next = chargesCols.map((c, i) =>
                            i === idx ? { ...c, label: e.target.value } : c
                          );
                          onUpdateItem({ ...selectedItem, columns: next });
                        }}
                        className="flex-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700"
                      />
                      <input
                        type="number"
                        value={col.width || 15}
                        onChange={(e) => {
                          const next = chargesCols.map((c, i) =>
                            i === idx ? { ...c, width: Number(e.target.value) } : c
                          );
                          onUpdateItem({ ...selectedItem, columns: next });
                        }}
                        className="w-12 px-1 py-0.5 bg-white border border-slate-200 rounded text-xs text-center font-mono"
                        title="Width percentage (%)"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = chargesCols.filter((_, i) => i !== idx);
                          onUpdateItem({ ...selectedItem, columns: next });
                        }}
                        className="text-slate-400 hover:text-red-500 p-0.5"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <select
                        value={col.key}
                        onChange={(e) => {
                          const next = chargesCols.map((c, i) =>
                            i === idx ? { ...c, key: e.target.value } : c
                          );
                          onUpdateItem({ ...selectedItem, columns: next });
                        }}
                        className="px-1.5 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-700"
                      >
                        <option value="description">Description</option>
                        <option value="quantity">Quantity</option>
                        <option value="unitPrice">Unit Price</option>
                        <option value="discount">Discount</option>
                        <option value="tax">Tax %</option>
                        <option value="amount">Amount</option>
                      </select>
                      <select
                        value={col.align || "left"}
                        onChange={(e) => {
                          const next = chargesCols.map((c, i) =>
                            i === idx ? { ...c, align: e.target.value } : c
                          );
                          onUpdateItem({ ...selectedItem, columns: next });
                        }}
                        className="px-1.5 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-700"
                      >
                        <option value="left">Left Align</option>
                        <option value="center">Center Align</option>
                        <option value="right">Right Align</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Itemized Charge Rows */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign size={14} className="text-emerald-600" />
                  Charge Rows ({chargesRows.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newRow = {
                      id: createId("row"),
                      description: "New Freight Charge",
                      quantity: "1",
                      unitPrice: "100.00",
                      discount: "0",
                      tax: "0",
                      amount: "100.00",
                    };
                    onUpdateItem({ ...selectedItem, rows: [...chargesRows, newRow] });
                  }}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition"
                >
                  <Plus size={12} /> Add Row
                </button>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {chargesRows.map((row, rIdx) => (
                  <div key={row.id || rIdx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => {
                          const next = chargesRows.map((r, i) =>
                            i === rIdx ? { ...r, description: e.target.value } : r
                          );
                          onUpdateItem({ ...selectedItem, rows: next });
                        }}
                        placeholder="Charge description..."
                        className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800"
                      />
                      <button
                        type="button"
                        disabled={rIdx === 0}
                        onClick={() => moveChargeRow(rIdx, rIdx - 1)}
                        className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={rIdx === chargesRows.length - 1}
                        onClick={() => moveChargeRow(rIdx, rIdx + 1)}
                        className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = chargesRows.filter((_, i) => i !== rIdx);
                          onUpdateItem({ ...selectedItem, rows: next });
                        }}
                        className="p-1 rounded text-red-500 hover:bg-red-50"
                        title="Delete Charge Row"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Qty</span>
                        <input
                          type="text"
                          value={row.quantity ?? "1"}
                          onChange={(e) => {
                            const next = chargesRows.map((r, i) =>
                              i === rIdx ? { ...r, quantity: e.target.value } : r
                            );
                            onUpdateItem({ ...selectedItem, rows: next });
                          }}
                          className="w-full px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-center"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Rate ($)</span>
                        <input
                          type="text"
                          value={row.unitPrice ?? "0"}
                          onChange={(e) => {
                            const next = chargesRows.map((r, i) =>
                              i === rIdx ? { ...r, unitPrice: e.target.value } : r
                            );
                            onUpdateItem({ ...selectedItem, rows: next });
                          }}
                          className="w-full px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-center"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Disc %</span>
                        <input
                          type="text"
                          value={row.discount ?? "0"}
                          onChange={(e) => {
                            const next = chargesRows.map((r, i) =>
                              i === rIdx ? { ...r, discount: e.target.value } : r
                            );
                            onUpdateItem({ ...selectedItem, rows: next });
                          }}
                          className="w-full px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-center"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Tax %</span>
                        <input
                          type="text"
                          value={row.tax ?? "0"}
                          onChange={(e) => {
                            const next = chargesRows.map((r, i) =>
                              i === rIdx ? { ...r, tax: e.target.value } : r
                            );
                            onUpdateItem({ ...selectedItem, rows: next });
                          }}
                          className="w-full px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. FINANCIAL SUMMARY (TOTALS) INSPECTOR (when selectedItem.type === "totals") */}
        {/* ========================================================================= */}
        {selectedItem.type === "totals" && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Calculator size={14} className="text-blue-600" />
              Financial Summary Breakdown
            </span>

            {/* Breakdown Toggle Switches */}
            <div className="space-y-2">
              {[
                ["subtotal", "Subtotal Calculation"],
                ["discount", "Discount Line"],
                ["tax", "Tax / GST Assessment"],
                ["additional", "Accessorial / Additional Charges"],
                ["grandTotal", "Grand Total Highlight"],
                ["depositRequired", "Upfront Deposit Requirement"],
              ].map(([key, label]) => {
                const isChecked = selectedItem.totals ? selectedItem.totals[key] !== false : true;
                return (
                  <label
                    key={key}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition"
                  >
                    <span className="text-xs text-slate-700 font-medium">{label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const nextTotals = {
                          ...(selectedItem.totals || {}),
                          [key]: e.target.checked,
                        };
                        onUpdateItem({ ...selectedItem, totals: nextTotals });
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                );
              })}
            </div>

            {/* Discount & Additional Values */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Discount Value</label>
                <input
                  type="text"
                  value={selectedItem.totals?.discountValue || ""}
                  onChange={(e) =>
                    onUpdateItem({
                      ...selectedItem,
                      totals: { ...(selectedItem.totals || {}), discountValue: e.target.value },
                    })
                  }
                  placeholder="e.g. 10% or $50"
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Deposit Required</label>
                <input
                  type="text"
                  value={selectedItem.totals?.depositValue || ""}
                  onChange={(e) =>
                    onUpdateItem({
                      ...selectedItem,
                      totals: { ...(selectedItem.totals || {}), depositValue: e.target.value },
                    })
                  }
                  placeholder="e.g. 25% or $250"
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Number Format</label>
              <select
                value={selectedItem.totals?.numberFormat || "currency"}
                onChange={(e) =>
                  onUpdateItem({
                    ...selectedItem,
                    totals: { ...(selectedItem.totals || {}), numberFormat: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="currency">Currency ($1,250.00)</option>
                <option value="decimal">Plain Decimal (1250.00)</option>
              </select>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. SHIPMENT LAYOUT INSPECTOR (when selectedItem.type === "shipment")       */}
        {/* ========================================================================= */}
        {selectedItem.type === "shipment" && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-800">Shipment Route Grid</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => handleStyleChange({ gridCols: cols })}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                    (style.gridCols || 2) === cols
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {cols} Col
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4B. IMAGE & LOGO INSPECTOR (when selectedItem.type === "image")           */}
        {/* ========================================================================= */}
        {selectedItem.type === "image" && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <ImageIcon size={14} className="text-blue-600" />
              Image & Logo Settings
            </span>

            {/* Image URL Input */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Image URL / Data</label>
              <input
                type="text"
                value={selectedItem.image?.src || selectedItem.content || ""}
                onChange={(e) =>
                  onUpdateItem({
                    ...selectedItem,
                    content: e.target.value,
                    image: { ...(selectedItem.image || {}), src: e.target.value },
                  })
                }
                placeholder="https://example.com/logo.png or data:image/..."
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>

            {/* Upload File Input */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Upload Image</label>
              <label className="flex items-center justify-center gap-2 p-2 bg-slate-50 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition text-xs text-slate-600 font-medium">
                <Upload size={14} className="text-slate-500" />
                <span>Choose Image File...</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result;
                        onUpdateItem({
                          ...selectedItem,
                          content: dataUrl,
                          image: { ...(selectedItem.image || {}), src: dataUrl },
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {/* Image Width Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] text-slate-600 font-medium">Image Width</label>
                <span className="text-[10px] font-mono text-slate-500">{selectedItem.image?.width || 80}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={selectedItem.image?.width || 80}
                onChange={(e) =>
                  onUpdateItem({
                    ...selectedItem,
                    image: { ...(selectedItem.image || {}), width: Number(e.target.value) },
                  })
                }
                className="w-full cursor-pointer"
              />
            </div>

            {/* Alignment */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Alignment</label>
              <div className="grid grid-cols-3 gap-1">
                {(["left", "center", "right"]).map((al) => (
                  <button
                    key={al}
                    type="button"
                    onClick={() =>
                      onUpdateItem({
                        ...selectedItem,
                        image: { ...(selectedItem.image || {}), align: al },
                      })
                    }
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                      (selectedItem.image?.align || "left") === al
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {al.charAt(0).toUpperCase() + al.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4C. FOOTER BLOCK INSPECTOR (when selectedItem.type === "footer")          */}
        {/* ========================================================================= */}
        {selectedItem.type === "footer" && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-800">Footer Text & Disclaimer</span>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Footer Message</label>
              <textarea
                rows={3}
                value={selectedItem.content || selectedItem.label || ""}
                onChange={(e) =>
                  onUpdateItem({
                    ...selectedItem,
                    content: e.target.value,
                    label: e.target.value,
                  })
                }
                placeholder="Footer disclaimer, copyright, or contact information..."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. COMPLETE TYPOGRAPHY SECTION (for non-table items or fallback)          */}
        {/* ========================================================================= */}
        {selectedItem.type !== "table" && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <label className="block text-slate-700 font-bold tracking-wide uppercase text-[11px]">Typography</label>
            
            {/* Font Family Grouped Dropdown */}
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">Font Family</label>
              <select
                value={style.fontFamily || "Inter, sans-serif"}
                onChange={(e) => handleStyleChange({ fontFamily: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white"
                style={{ fontFamily: style.fontFamily || "Inter, sans-serif" }}
              >
                {FONT_FAMILIES.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.fonts.map((f) => (
                      <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                        {f.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Font Size & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">Size (px)</label>
                <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:bg-white">
                  <button
                    type="button"
                    onClick={() => handleStyleChange({ fontSize: Math.max(7, (style.fontSize || 12) - 1) })}
                    className="p-1.5 hover:bg-slate-200 text-slate-600 transition"
                    title="Decrease font size"
                    aria-label="Decrease font size"
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    type="number"
                    min="7"
                    max="72"
                    aria-label="Font size"
                    value={style.fontSize || 12}
                    onChange={(e) => handleStyleChange({ fontSize: Math.max(7, Math.min(72, Number(e.target.value) || 12)) })}
                    className="w-full px-1 py-1 text-center bg-transparent border-0 outline-none text-xs font-semibold text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => handleStyleChange({ fontSize: Math.min(72, (style.fontSize || 12) + 1) })}
                    className="p-1.5 hover:bg-slate-200 text-slate-600 transition"
                    title="Increase font size"
                    aria-label="Increase font size"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">Weight</label>
                <select
                  value={style.fontWeight || 400}
                  onChange={(e) => {
                    const weight = Number(e.target.value);
                    handleStyleChange({ fontWeight: weight, bold: weight >= 700 });
                  }}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium"
                >
                  <option value="300">Light (300)</option>
                  <option value="400">Regular (400)</option>
                  <option value="500">Medium (500)</option>
                  <option value="600">Semibold (600)</option>
                  <option value="700">Bold (700)</option>
                  <option value="800">Extra Bold (800)</option>
                </select>
              </div>
            </div>

            {/* Text Transform */}
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">Transform</label>
              <select
                value={style.textTransform || "none"}
                onChange={(e) => handleStyleChange({ textTransform: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium"
              >
                <option value="none">Normal</option>
                <option value="uppercase">UPPERCASE</option>
                <option value="lowercase">lowercase</option>
                <option value="capitalize">Capitalize</option>
              </select>
            </div>

            {/* Formatting Tools: B, I, U, S + Color Picker */}
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">Formatting & Color</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    handleStyleChange({
                      bold: !style.bold,
                      fontWeight: !style.bold ? 700 : 400,
                    })
                  }
                  className={`p-1.5 rounded border transition font-bold ${
                    style.bold
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleStyleChange({ italic: !style.italic })}
                  className={`p-1.5 rounded border transition italic ${
                    style.italic
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Italic"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleStyleChange({ underline: !style.underline })}
                  className={`p-1.5 rounded border transition underline ${
                    style.underline
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Underline"
                >
                  <Underline size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleStyleChange({ strikethrough: !style.strikethrough })}
                  className={`p-1.5 rounded border transition line-through ${
                    style.strikethrough
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Strikethrough"
                >
                  <Strikethrough size={13} />
                </button>

                <span className="w-px h-5 bg-slate-200 mx-1" />

                {/* Text Color Picker */}
                <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50" title="Text Color">
                  <span className="text-xs font-bold text-amber-500">A</span>
                  <input
                    type="color"
                    value={style.color || "#0b2948"}
                    onChange={(e) => handleStyleChange({ color: e.target.value })}
                    className="w-5 h-5 rounded border-0 cursor-pointer p-0"
                  />
                  <span className="font-mono text-[10px] text-slate-500">{style.color || "#0b2948"}</span>
                </label>
              </div>
            </div>

            {/* Letter Spacing & Line Height */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">Letter Spacing</label>
                <select
                  value={style.letterSpacing ?? 0}
                  onChange={(e) => handleStyleChange({ letterSpacing: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium"
                >
                  <option value="-1">Tight (-1px)</option>
                  <option value="-0.5">Semi-tight (-0.5px)</option>
                  <option value="0">Normal (0px)</option>
                  <option value="0.5">Wide (+0.5px)</option>
                  <option value="1">Wider (+1px)</option>
                  <option value="2">Spacious (+2px)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-1">Line Height</label>
                <select
                  value={style.lineHeight ?? 1.4}
                  onChange={(e) => handleStyleChange({ lineHeight: Number(e.target.value) })}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium"
                >
                  <option value="1">Tight (1.0)</option>
                  <option value="1.2">Compact (1.2)</option>
                  <option value="1.4">Normal (1.4)</option>
                  <option value="1.6">Relaxed (1.6)</option>
                  <option value="1.8">Loose (1.8)</option>
                </select>
              </div>
            </div>

            {/* Text Alignment */}
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">Text Alignment</label>
              <div className="grid grid-cols-3 gap-1">
                {(["left", "center", "right"]).map((al) => (
                  <button
                    key={al}
                    type="button"
                    onClick={() => handleStyleChange({ align: al })}
                    className={`py-1.5 rounded text-xs font-semibold border flex items-center justify-center gap-1 transition ${
                      (style.align || "left") === al
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {al === "left" && <AlignLeft size={13} />}
                    {al === "center" && <AlignCenter size={13} />}
                    {al === "right" && <AlignRight size={13} />}
                    <span>{al.charAt(0).toUpperCase() + al.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. LAYOUT & BOX STYLING SECTION (Width, Padding, Bg, Radius, Borders)      */}
        {/* ========================================================================= */}
        <div className="space-y-3.5 pt-3 border-t border-slate-100">
          <label className="block text-slate-700 font-bold tracking-wide uppercase text-[11px]">
            Layout & Styling
          </label>

          {/* Width & Padding */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">Width</label>
              <select
                value={selectedItem.width || "full"}
                onChange={(e) => onUpdateItem({ ...selectedItem, width: e.target.value })}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium"
              >
                <option value="full">Full width (100%)</option>
                <option value="half">Half width (50%)</option>
                <option value="auto">Auto width</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] text-slate-500 font-medium">Padding</label>
                <span className="text-[10px] font-mono text-slate-400">{selectedItem.padding ?? 0}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="48"
                value={selectedItem.padding ?? 0}
                onChange={(e) => onUpdateItem({ ...selectedItem, padding: Number(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Background Color & Corner Radius */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">Background</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={
                    style.backgroundColor && style.backgroundColor !== "transparent"
                      ? style.backgroundColor
                      : "#ffffff"
                  }
                  onChange={(e) => handleStyleChange({ backgroundColor: e.target.value })}
                  className="w-7 h-7 p-0.5 rounded border border-slate-200 cursor-pointer"
                  title="Background color"
                />
                <button
                  type="button"
                  onClick={() => handleStyleChange({ backgroundColor: "transparent" })}
                  className="px-2 py-1 text-[10px] font-semibold bg-white border border-slate-200 hover:bg-slate-50 rounded text-slate-600"
                  title="Set transparent background"
                >
                  Clear
                </button>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] text-slate-500 font-medium">Corner Radius</label>
                <span className="text-[10px] font-mono text-slate-400">{style.borderRadius ?? 0}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                value={style.borderRadius ?? 0}
                onChange={(e) => handleStyleChange({ borderRadius: Number(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>
          </div>

          {/* Border Style & Border Width */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">Border Style</label>
              <select
                value={style.borderStyle || "none"}
                onChange={(e) => handleStyleChange({ borderStyle: e.target.value })}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium"
              >
                <option value="none">None</option>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">Border Width (px)</label>
              <input
                type="number"
                min="1"
                max="10"
                disabled={style.borderStyle === "none" || !style.borderStyle}
                value={style.borderWidth ?? 1}
                onChange={(e) => handleStyleChange({ borderWidth: Number(e.target.value) })}
                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium disabled:opacity-50"
              />
            </div>
          </div>

          {/* Border Color (when border style !== none) */}
          {style.borderStyle && style.borderStyle !== "none" && (
            <div>
              <label className="block text-[11px] text-slate-500 font-medium mb-1">Border Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={style.borderColor || "#cbd5e1"}
                  onChange={(e) => handleStyleChange({ borderColor: e.target.value })}
                  className="w-7 h-7 p-0.5 rounded border border-slate-200 cursor-pointer"
                />
                <span className="font-mono text-[10px] text-slate-500">{style.borderColor || "#cbd5e1"}</span>
              </div>
            </div>
          )}

          {/* Show / Hide Component Switch */}
          <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
            <div>
              <span className="text-xs text-slate-700 font-medium block">Show Component</span>
              <small className="text-[10px] text-slate-400">Visible in canvas, preview and export</small>
            </div>
            <input
              type="checkbox"
              checked={selectedItem.visible !== false}
              onChange={(e) => onUpdateItem({ ...selectedItem, visible: e.target.checked })}
              className="rounded text-blue-600"
            />
          </label>
        </div>

        {/* ========================================================================= */}
        {/* 7. DYNAMIC FIELDS LIST WITH VARIABLE BINDING                              */}
        {/* ========================================================================= */}
        {Array.isArray(selectedItem.fields) && selectedItem.fields.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-slate-700 font-bold tracking-wide uppercase text-[11px] mb-2">
              Fields & Variables
            </label>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {selectedItem.fields.map((f, idx) => {
                const varGroups = getVariablesForMode(mode);
                const allVars = varGroups.flatMap((g) => g.items || []);

                return (
                  <div key={f.id || idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={f.label}
                        onChange={(e) => {
                          const newFields = [...selectedItem.fields];
                          newFields[idx] = { ...f, label: e.target.value };
                          onUpdateItem({ ...selectedItem, fields: newFields });
                        }}
                        className="text-xs font-semibold text-slate-700 bg-transparent border-b border-dashed border-slate-300 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newFields = [...selectedItem.fields];
                          newFields[idx] = { ...f, visible: f.visible === false };
                          onUpdateItem({ ...selectedItem, fields: newFields });
                        }}
                        className="text-slate-400 hover:text-slate-600"
                        title={f.visible !== false ? "Hide field" : "Show field"}
                      >
                        {f.visible !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    </div>

                    {/* Field Value Input */}
                    <input
                      type="text"
                      value={f.value}
                      onChange={(e) => {
                        const newFields = [...selectedItem.fields];
                        newFields[idx] = { ...f, value: e.target.value };
                        onUpdateItem({ ...selectedItem, fields: newFields });
                      }}
                      className="w-full min-w-0 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 font-mono truncate focus:overflow-visible focus:text-clip"
                    />

                    {/* Bind Variable Dropdown */}
                    <div className="pt-0.5">
                      <select
                        value={allVars.some((v) => v.tag === f.value) ? f.value : ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            const newFields = [...selectedItem.fields];
                            newFields[idx] = { ...f, value: e.target.value };
                            onUpdateItem({ ...selectedItem, fields: newFields });
                          }
                        }}
                        className="w-full min-w-0 max-w-full px-2 py-1 bg-white border border-slate-200 rounded text-[11px] text-slate-600 font-medium truncate"
                      >
                        <option value="">Bind Variable (Custom Value)</option>
                        {varGroups.map((group) => (
                          <optgroup key={group.group} label={group.group}>
                            {(group.items || []).map((v) => (
                              <option key={v.tag} value={v.tag}>
                                {v.label} ({v.tag})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
