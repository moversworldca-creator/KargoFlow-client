import DocumentSettings from '../../../../../../../shared/template-builder/components/DocumentSettings.jsx';
import React, { useState, useEffect } from "react";
import { getBuilderVariables, getBuilderBlocks, getBuilderSettings, getBuilderMeta } from "../../../../../services/api";
import {
  Blocks,
  Bookmark,
  Tags,
  ShieldCheck,
  Settings2,
  Search,
  Plus,
  Copy,
  Check,
  Heading,
  Type,
  Image as ImageIcon,
  Minus,
  Table as TableIcon,
  Table2,
  Columns,
  Code2,
  LayoutTemplate,
  FileText,
  Truck,
  DollarSign,
  Calculator,
  ScrollText,
  CheckSquare,
  Receipt,
  UserCheck,
  ListOrdered,
  QrCode,
  Building,
  CreditCard,
  Lock,
  MapPin,
  Sliders,
  PenTool,
  FileSignature,
  Navigation,
  Shield,
  CheckCircle,
  ClipboardList,
  Box,
  CalendarX,
  Mail,
  MousePointerClick,
  AlertCircle,
  CircleAlert,
  FileCode,
  MessageSquare,
  Link,
  ShieldAlert,
  GripVertical,
  StickyNote,
  NotebookPen,
  X,
} from "lucide-react";
import { getWidgetsForMode } from "../config/widgetToolboxConfig";
import { getVariablesForMode, normalizeBuilderVariableGroups } from "../config/variableRegistry";
import { BACKEND_WIDGET_ICONS } from "../config/backendWidgetIcons";

const ICON_MAP = {
  Heading,
  Type,
  StickyNote,
  Notes: NotebookPen,
  NotebookPen,
  Image: ImageIcon,
  Minus,
  Table: TableIcon,
  Table2,
  Columns,
  Code2,
  LayoutTemplate,
  FileText,
  Truck,
  DollarSign,
  Calculator,
  ScrollText,
  CheckSquare,
  Receipt,
  UserCheck,
  ListOrdered,
  QrCode,
  Building,
  CreditCard,
  ShieldCheck,
  Lock,
  MapPin,
  Sliders,
  PenTool,
  FileSignature,
  Navigation,
  Shield,
  CheckCircle,
  ClipboardList,
  Box,
  CalendarX,
  Mail,
  MousePointerClick,
  AlertCircle,
  CircleAlert,
  FileCode,
  MessageSquare,
  Link,
  ShieldAlert,
  X,
};

// Palette groups in SmartMoving order: ready-made sections first, then data, signer actions and building blocks.
const PALETTE_GROUPS = [
  ["section", "Prebuilt sections"],
  ["data", "Move data"],
  ["interactive", "Signatures & customer actions"],
  ["content", "Content"],
  ["layout", "Layout"],
];

function groupPaletteWidgets(widgets, mode) {
  if (["email", "sms"].includes(mode)) {
    return [{ key: mode, label: mode === "email" ? "Email Widgets" : "SMS Widgets", widgets }];
  }
  const known = new Set(PALETTE_GROUPS.map(([key]) => key));
  return [
    ...PALETTE_GROUPS.map(([key, label]) => ({ key, label, widgets: widgets.filter((widget) => widget.category === key) })),
    { key: "other", label: "Document Widgets", widgets: widgets.filter((widget) => !known.has(widget.category)) },
  ].filter((group) => group.widgets.length > 0);
}

export default function LeftSidebar({
  mode,
  pageSize = "A4",
  onPageSizeChange = () => {},
  orientation = "Portrait",
  onOrientationChange = () => {},
  category = "Estimate",
  onCategoryChange = () => {},
  library = [],
  onLoadFromLibrary = () => {},
  onDeleteFromLibrary = () => {},
  onAddWidget,
  onInsertTable,
  onInsertLayout,
  onInsertVariable,
  onOpenCustomFieldDialog = () => {},
  templateSettings = {},
  onTemplateSettingsChange = () => {},
  branchId = null,
  branches = [],
  onClose = () => {},
}) {
  const [activeTab, setActiveTab] = useState("widgets"); // widgets | variables | settings
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedTag, setCopiedTag] = useState(null);

  const { common: toolboxCommon = [], specific = [] } = getWidgetsForMode(mode) || {};
  // Saved (native) templates use the Builder "Columns" widget; the legacy layout grid cannot be stored.
  const common = ["email", "sms"].includes(mode) ? toolboxCommon : toolboxCommon.filter((widget) => widget.type !== "layout");
  const defaultGroups = getVariablesForMode(mode);
  const [variableGroups, setVariableGroups] = useState(defaultGroups);
  const [savedBlocks, setSavedBlocks] = useState([]);
  const [backendPalette, setBackendPalette] = useState({ kind: null, blocks: [], error: "" });
  const [builderSettings, setBuilderSettings] = useState(null);
  const fallbackBranchId = branches[0]?.id;
  const activeBuilderKind = ["estimate", "estimate_portal"].includes(mode) ? "estimate_portal" : mode === "invoice" ? "invoice" : "document";
  const backendWidgets = backendPalette.kind === activeBuilderKind ? backendPalette.blocks : [];
  const backendWidgetsError = backendPalette.kind === activeBuilderKind ? backendPalette.error : "";

  useEffect(() => {
    let isMounted = true;
    const kind = activeBuilderKind;
    const variableBranchId = branchId || fallbackBranchId;
    if (!["email", "sms"].includes(mode) && typeof getBuilderMeta === "function") {
      getBuilderMeta(kind)
        .then((res) => {
          const data = res?.data ?? res;
          if (!Array.isArray(data?.blocks)) {
            throw new Error("The Builder widget palette response is invalid.");
          }
          if (isMounted) setBackendPalette({ kind, blocks: data.blocks, error: "" });
        })
        .catch((error) => {
          if (isMounted) {
            setBackendPalette({
              kind,
              blocks: [],
              error: error?.response?.data?.detail || error.message || "Unable to load Builder widgets.",
            });
          }
        });
    }
    if (!["email", "sms"].includes(mode) && typeof getBuilderVariables === "function") {
      getBuilderVariables(kind, variableBranchId ? { branch_id: variableBranchId } : {})
        .then((res) => {
          const data = res?.data ?? res;
          const formatted = normalizeBuilderVariableGroups(data);
          if (isMounted && formatted.length > 0) {
            setVariableGroups(formatted);
          }
        })
        .catch(() => {
          // Fallback gracefully to default static registry
        });
    }

    // Also load reusable saved clauses/blocks from backend
    if (typeof getBuilderBlocks === "function") {
      getBuilderBlocks()
        .then((res) => {
          const data = res?.data ?? res;
          const list = Array.isArray(data) ? data : data?.results || [];
          if (isMounted && Array.isArray(list)) {
            setSavedBlocks(list);
          }
        })
        .catch(() => {
          // Ignore if unconfigured
        });
    }

    // Load publishing & approval policy
    if (typeof getBuilderSettings === "function") {
      getBuilderSettings()
        .then((res) => {
          if (isMounted && res?.data) {
            setBuilderSettings(res.data);
          }
        })
        .catch(() => {
          // Default
        });
    }

    return () => {
      isMounted = false;
    };
  }, [mode, branchId, fallbackBranchId, activeBuilderKind]);

  const isLandscape = String(orientation).toLowerCase() === "landscape";

  const handleCopyTag = (tag) => {
    navigator.clipboard?.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1800);
    if (onInsertVariable) {
      onInsertVariable(tag);
    }
  };

  const renderIcon = (iconName, size = 16) => {
    const Component = typeof iconName === "string" ? ICON_MAP[iconName] || Blocks : iconName || Blocks;
    return <Component size={size} strokeWidth={1.8} aria-hidden="true" focusable="false" />;
  };

  const filterItem = (text) =>
    !searchTerm || text.toLowerCase().includes(searchTerm.toLowerCase());

  return (
    <aside className="w-72 max-w-[85vw] bg-white border-r border-slate-200 flex flex-col h-full min-h-0 select-none">
      {/* 3 Tab Switcher */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setActiveTab("widgets")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === "widgets"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          title="Components & Content Blocks"
          aria-label="Widgets"
        >
          <Blocks size={14} />
          <span>Widgets</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("variables")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === "variables"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          title="Dynamic Merge Tags & Tokens"
          aria-label="Tags"
        >
          <Tags size={14} />
          <span>Tags</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === "settings"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          title="Template & Layout Settings"
          aria-label="Settings"
        >
          <Settings2 size={14} />
          <span>Settings</span>
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0 cursor-pointer"
            title="Close Sidebar"
            aria-label="Close Sidebar"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Input (for widgets and tags) */}
      {activeTab !== "settings" && (
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === "widgets" ? "Search widgets..." : "Search merge tags..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === "widgets" ? (
          <>
            {/* Feature-Specific Widgets */}
            {(!["email", "sms"].includes(mode) ? backendWidgets.length > 0 : specific.length > 0) && (
              <div>
                {groupPaletteWidgets(!["email", "sms"].includes(mode)
                    ? backendWidgets.map((block) => ({
                        id: `backend_${block.type}`,
                        type: "builder_block",
                        block_type: block.type,
                        label: block.label,
                        description: block.description,
                        category: block.category,
                        props_schema: block.props_schema,
                        container: block.container,
                        interactive: block.interactive,
                        pdf_only: block.pdf_only,
                        icon: BACKEND_WIDGET_ICONS[block.type],
                      }))
                    : specific, mode)
                  .map((group) => ({ ...group, widgets: group.widgets.filter((w) => filterItem(w.label)) }))
                  .filter((group) => group.widgets.length > 0)
                  .map((group) => (
                  <div key={group.key} className="mb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  {group.label}
                </h3>
                <div className="grid grid-cols-1 gap-1.5">
                  {group.widgets.map((widget) => (
                      <button
                        key={widget.id}
                        type="button"
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("widget", JSON.stringify(widget));
                          e.dataTransfer.setData("text/plain", widget.label || widget.type);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => onAddWidget(widget)}
                        className="flex items-center gap-2 px-2.5 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 hover:border-blue-200 rounded-md transition group cursor-grab active:cursor-grabbing"
                        title="Click to add or drag into document"
                      >
                        <GripVertical size={13} className="text-slate-300 group-hover:text-slate-500 shrink-0" />
                        <span className="text-slate-500 group-hover:text-blue-600">
                          {renderIcon(widget.icon, widget.type === "builder_block" ? 19 : 16)}
                        </span>
                        <span className="truncate flex-1">{widget.label}</span>
                        <Plus size={14} className="opacity-0 group-hover:opacity-100 transition" />
                      </button>
                    ))}
                </div>
                  </div>
                ))}
                {backendWidgetsError && !["email", "sms"].includes(mode) && (
                  <p role="alert" className="mt-2 text-[11px] text-red-600">{backendWidgetsError}</p>
                )}
              </div>
            )}
            {backendWidgetsError && !["email", "sms"].includes(mode) && backendWidgets.length === 0 && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                Unable to load document widgets: {backendWidgetsError}
              </p>
            )}

            {/* Standard Common Layout & Grid Widgets (Non-SMS Modes) */}
            {mode !== "sms" && common.filter((w) => filterItem(w.label)).length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  General & Layout
                </h3>
                <div className="grid grid-cols-1 gap-1.5">
                  {common
                    .filter((w) => filterItem(w.label))
                    .map((widget) => (
                      <button
                        key={widget.id}
                        type="button"
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("widget", JSON.stringify(widget));
                          e.dataTransfer.setData("text/plain", widget.label || widget.type);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => {
                          if (widget.type === "table" && onInsertTable) {
                            onInsertTable();
                          } else if (widget.type === "layout" && onInsertLayout) {
                            onInsertLayout();
                          } else if (widget.type === "custom_field") {
                            onOpenCustomFieldDialog();
                          } else {
                            onAddWidget(widget);
                          }
                        }}
                        className="flex items-center gap-2 px-2.5 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 hover:border-blue-200 rounded-md transition group cursor-grab active:cursor-grabbing"
                        title="Click to add or drag into document"
                      >
                        <GripVertical size={13} className="text-slate-300 group-hover:text-slate-500 shrink-0" />
                        <span className="text-slate-500 group-hover:text-blue-600">
                          {renderIcon(widget.icon)}
                        </span>
                        <span className="truncate flex-1">{widget.label}</span>
                        <Plus size={14} className="opacity-0 group-hover:opacity-100 transition" />
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Reusable Saved Blocks from Backend */}
            {savedBlocks.length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Saved Reusable Blocks
                </h3>
                <div className="grid grid-cols-1 gap-1.5">
                  {savedBlocks
                    .filter((b) => filterItem(b.name || b.label || "Block"))
                    .map((block) => (
                      <button
                        key={block.id}
                        type="button"
                        onClick={() => {
                          const html =
                            block.blocks?.[0]?.html ||
                            (typeof block.content === "string" ? block.content : block.blocks?.[0]?.content) ||
                            block.description ||
                            `<p><strong>${block.name}</strong></p>`;
                          onAddWidget({
                            id: `custom_block_${block.id}_${Date.now()}`,
                            type: "html",
                            label: block.name || "Saved Clause",
                            htmlContent: html,
                          });
                        }}
                        className="flex items-center gap-2 px-2.5 py-2 text-left text-xs font-medium text-slate-700 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-900 border border-indigo-200/80 rounded-md transition group"
                        title="Click to insert this saved block"
                      >
                        <Bookmark size={13} className="text-indigo-500 shrink-0" />
                        <span className="truncate flex-1 font-semibold">{block.name}</span>
                        <Plus size={14} className="opacity-0 group-hover:opacity-100 text-indigo-600 transition" />
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* SMS Quick Snippets */}
            {mode === "sms" && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  SMS Quick Snippets
                </h3>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { label: "Opt-Out Compliance", snippet: "Reply STOP to unsubscribe." },
                  ].map((snip) => (
                    <button
                      key={snip.label}
                      type="button"
                      onClick={() => handleCopyTag(snip.snippet)}
                      className="flex items-center justify-between px-2.5 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200/80 hover:border-emerald-200 rounded-md transition"
                      title="Click to insert snippet into SMS"
                    >
                      <span>{snip.label}</span>
                      <code className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                        {snip.snippet}
                      </code>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : activeTab === "variables" ? (
          /* Merge Tags Picker */
          <div className="space-y-4">
            {variableGroups.map((group) => {
              const matchingItems = group.items.filter(
                (item) => filterItem(item.label) || filterItem(item.tag)
              );
              if (matchingItems.length === 0) return null;

              return (
                <div key={group.group}>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                    {group.group}
                  </h3>
                  <div className="space-y-1.5">
                    {matchingItems.map((item) => (
                      <div
                        key={item.tag}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("variable", item.tag);
                          e.dataTransfer.setData("text/plain", item.tag);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => handleCopyTag(item.tag)}
                        className="flex items-center justify-between p-2 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/70 cursor-grab active:cursor-grabbing transition text-xs group"
                        title="Click to copy & insert, or drag into document"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                          <GripVertical size={12} className="text-slate-300 group-hover:text-slate-500 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-700 truncate">{item.label}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {item.tag}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="p-1 rounded text-slate-400 group-hover:text-blue-600 transition"
                        >
                          {copiedTag === item.tag ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Settings Tab: Visual Orientation Cards & Template Library Quick Shelf */
          <div className="space-y-4 text-xs">
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
                <span>{mode === "email" ? "EMAIL SETTINGS" : mode === "sms" ? "SMS SETTINGS" : "PAGE SETTINGS"}</span>
                {builderSettings && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                    title="Publishing review requirements configured in builder settings"
                  >
                    <ShieldCheck size={11} className="text-blue-600" />
                    <span>Review {builderSettings.require_approval ? "Required" : "Direct"}</span>
                  </span>
                )}
              </div>

              <DocumentSettings mode={mode} settings={templateSettings} onChange={onTemplateSettingsChange} />

              {mode === "email" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={templateSettings?.subject || ""}
                    onChange={(e) => onTemplateSettingsChange?.({ subject: e.target.value })}
                    placeholder="e.g. Your Quote from {{branch_name}}"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              )}

              {(mode === "email" || mode === "sms") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Template Key
                  </label>
                  <input
                    type="text"
                    value={templateSettings?.template_key || ""}
                    onChange={(e) => onTemplateSettingsChange?.({ template_key: e.target.value })}
                    placeholder="e.g. quote_sent, job_confirmed"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-mono font-medium"
                  />
                </div>
              )}

              {(mode === "email" || mode === "sms") && branches && branches.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Branch
                  </label>
                  <select
                    value={templateSettings?.branch || ""}
                    onChange={(e) => onTemplateSettingsChange?.({ branch: e.target.value ? Number(e.target.value) : null })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  placeholder="e.g. Freight Estimate, Invoice, Quote"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              {(mode === "email" || mode === "sms") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={templateSettings?.description || ""}
                    onChange={(e) => onTemplateSettingsChange?.({ description: e.target.value })}
                    placeholder="What this template is used for"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              )}

              {mode !== "email" && mode !== "sms" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Page Size
                    </label>
                    <select
                      value={pageSize}
                      onChange={(e) => onPageSizeChange(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
                    >
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="Letter">Letter (8.5 × 11 in)</option>
                      <option value="Legal">Legal (8.5 × 14 in)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-700">Page Orientation</label>
                      <span className="text-[11px] text-slate-400 font-medium">{orientation}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Choose how your document is laid out.
                    </p>

                    {/* Visual SVG Graphic Cards */}
                    <div className="orientation-picker" role="radiogroup" aria-label="Page orientation">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={!isLandscape}
                        className={`orientation-card ${!isLandscape ? "selected" : ""}`}
                        onClick={() => onOrientationChange("Portrait")}
                      >
                        <div className="orientation-card-icon">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="5" y="2" width="14" height="20" rx="2" />
                          </svg>
                        </div>
                        <span className="orientation-card-label">Portrait</span>
                        <div className="orientation-mini-preview portrait-preview">
                          <div className="mini-sheet">
                            <span className="mini-line line-1" />
                            <span className="mini-line line-2" />
                            <span className="mini-line line-3" />
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={isLandscape}
                        className={`orientation-card ${isLandscape ? "selected" : ""}`}
                        onClick={() => onOrientationChange("Landscape")}
                      >
                        <div className="orientation-card-icon">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                          </svg>
                        </div>
                        <span className="orientation-card-label">Landscape</span>
                        <div className="orientation-mini-preview landscape-preview">
                          <div className="mini-sheet">
                            <span className="mini-line line-1" />
                            <span className="mini-line line-2" />
                            <span className="mini-line line-3" />
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Template Library Quick Shelf (X/25) */}
            <div className="library-section">
              <div className="section-header">
                <span>TEMPLATE LIBRARY</span>
                <span className="font-bold text-blue-600">{library.length}/25</span>
              </div>
              {library.length === 0 ? (
                <p className="library-empty">
                  Save a reusable template with "Save Template" in the top bar.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {library.map((item) => (
                    <div
                      key={item.id || item.name}
                      className="library-item group"
                    >
                      <button
                        type="button"
                        className="library-load"
                        onClick={() => onLoadFromLibrary(item)}
                        title={`Load template "${item.name}"`}
                      >
                        <b>{item.name || "Untitled Template"}</b>
                        <small>
                          {item.settings?.category || "Standard"} · {(item.items || []).length} components
                        </small>
                      </button>
                      <button
                        type="button"
                        className="remove-mini"
                        onClick={() => onDeleteFromLibrary(item.id || item.name)}
                        title="Delete from library"
                        aria-label={`Delete ${item.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
