import React, { useState } from "react";
import {
  Boxes,
  Variable,
  Settings,
  Search,
  Plus,
  Copy,
  Check,
  Heading,
  Type,
  Image as ImageIcon,
  Minus,
  Table as TableIcon,
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
  FileCode,
  MessageSquare,
  Link,
  ShieldAlert,
  GripVertical,
  StickyNote,
} from "lucide-react";
import { getWidgetsForMode } from "../config/widgetToolboxConfig";
import { getVariablesForMode } from "../config/variableRegistry";

const ICON_MAP = {
  Heading,
  Type,
  StickyNote,
  Notes: StickyNote,
  Image: ImageIcon,
  Minus,
  Table: TableIcon,
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
  FileCode,
  MessageSquare,
  Link,
  ShieldAlert,
};

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
}) {
  const [activeTab, setActiveTab] = useState("widgets"); // widgets | variables | settings
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedTag, setCopiedTag] = useState(null);

  const { specific, common } = getWidgetsForMode(mode);
  const variableGroups = getVariablesForMode(mode);
  const isLandscape = String(orientation).toLowerCase() === "landscape";

  const handleCopyTag = (tag) => {
    navigator.clipboard?.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1800);
    if (onInsertVariable) {
      onInsertVariable(tag);
    }
  };

  const renderIcon = (iconName) => {
    const Component = ICON_MAP[iconName] || Boxes;
    return <Component size={16} />;
  };

  const filterItem = (text) =>
    !searchTerm || text.toLowerCase().includes(searchTerm.toLowerCase());

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-3.5rem)] select-none">
      {/* 3 Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => setActiveTab("widgets")}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === "widgets"
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Boxes size={14} />
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
        >
          <Variable size={14} />
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
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
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
            {specific.filter((w) => filterItem(w.label)).length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Document Widgets
                </h3>
                <div className="grid grid-cols-1 gap-1.5">
                  {specific
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
                        onClick={() => onAddWidget(widget)}
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

            {/* Standard Common Layout & Grid Widgets */}
            {common.filter((w) => filterItem(w.label)).length > 0 && (
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
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                PAGE SETTINGS
              </div>

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

