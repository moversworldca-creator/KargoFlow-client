import React, { useRef } from "react";
import {
  Trash2,
  Copy,
  PenTool,
  GripVertical,
  ImageIcon,
  Upload,
  ArrowUp,
  ArrowDown,
  Pencil,
  Eye,
  EyeOff,
} from "lucide-react";
import InlineEdit from "./InlineEdit";
import NotesRichTextEditor from "./NotesRichTextEditor";
import EditableHtmlBlock from "./EditableHtmlBlock";
import InteractiveTableBlock from "./InteractiveTableBlock";

export default function DocumentBlock({
  item,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  isFirst = false,
  isLast = false,
  preview = false,
  resolveVariables = false,
  selection = null,
  onSelectPart = () => {},
  onOpenHtmlEditor = () => {},
}) {
  const style = item.style || {};

  const renderContent = () => {
    switch (item.type) {
      case "header": {
        const titleField =
          item.fields?.find((f) => f.id === "estimateTitle")?.value || item.label || "Estimate";
        const companyField =
          item.fields?.find((f) => f.id === "companyName")?.value || "{{company_name}}";
        const numberField =
          item.fields?.find((f) => f.id === "estimateNumber")?.value || "{{estimate_number}}";

        const hasCustomSize = Boolean(style.fontSize);
        const hasCustomWeight = style.fontWeight !== undefined || style.bold !== undefined;
        const fontW = style.bold ? 700 : style.fontWeight;

        return (
          <div className="doc-header flex flex-wrap sm:flex-nowrap justify-between items-start gap-3 pb-4 border-b-2 border-slate-200 w-full max-w-full min-w-0 box-border">
            <div className="min-w-0 flex-1 pr-2">
              <InlineEdit
                value={companyField}
                part="companyName"
                selection={selection}
                preview={preview}
                resolveVariables={resolveVariables}
                onSelect={() => {
                  onSelect();
                  onSelectPart("companyName");
                }}
                onCommit={(val) => {
                  const currentFields = item.fields || [];
                  const exists = currentFields.some((f) => f.id === "companyName");
                  const nextFields = exists
                    ? currentFields.map((f) => (f.id === "companyName" ? { ...f, value: val } : f))
                    : [...currentFields, { id: "companyName", label: "Company Name", value: val }];
                  onUpdate({ ...item, fields: nextFields });
                }}
                className={`text-inherit font-inherit break-words [overflow-wrap:anywhere] [word-break:break-word] ${
                  hasCustomSize ? "" : "text-xl"
                } ${hasCustomWeight ? "" : "font-bold"}`}
                style={{
                  fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
                  fontWeight: fontW,
                  fontFamily: style.fontFamily || undefined,
                  color: style.color || undefined,
                }}
              />
            </div>
            <div className="text-right min-w-0 max-w-full sm:max-w-[55%]">
              <InlineEdit
                value={titleField}
                part="estimateTitle"
                selection={selection}
                preview={preview}
                resolveVariables={resolveVariables}
                onSelect={() => {
                  onSelect();
                  onSelectPart("estimateTitle");
                }}
                onCommit={(val) => {
                  const currentFields = item.fields || [];
                  const exists = currentFields.some((f) => f.id === "estimateTitle");
                  const nextFields = exists
                    ? currentFields.map((f) => (f.id === "estimateTitle" ? { ...f, value: val } : f))
                    : [...currentFields, { id: "estimateTitle", label: "Title", value: val }];
                  onUpdate({ ...item, label: val, fields: nextFields });
                }}
                className={`text-blue-600 block break-words [overflow-wrap:anywhere] [word-break:break-word] ${
                  hasCustomSize ? "" : "text-lg"
                } ${hasCustomWeight ? "" : "font-bold"}`}
                style={{
                  fontSize: style.fontSize ? `${Math.max(12, Math.round(style.fontSize * 0.9))}px` : undefined,
                  fontWeight: fontW,
                  fontFamily: style.fontFamily || undefined,
                }}
              />
              <InlineEdit
                value={numberField}
                part="estimateNumber"
                selection={selection}
                preview={preview}
                resolveVariables={resolveVariables}
                onSelect={() => {
                  onSelect();
                  onSelectPart("estimateNumber");
                }}
                onCommit={(val) => {
                  const currentFields = item.fields || [];
                  const exists = currentFields.some((f) => f.id === "estimateNumber");
                  const nextFields = exists
                    ? currentFields.map((f) => (f.id === "estimateNumber" ? { ...f, value: val } : f))
                    : [...currentFields, { id: "estimateNumber", label: "Number", value: val }];
                  onUpdate({ ...item, fields: nextFields });
                }}
                className="text-xs text-slate-500 font-mono mt-1 block break-words [overflow-wrap:anywhere] [word-break:break-word]"
              />
            </div>
          </div>
        );
      }

      case "meta":
      case "shipment": {
        const visibleFields = (item.fields || []).filter((f) => f.visible !== false);
        return (
          <div
            style={{ fontSize: style.fontSize ? `${style.fontSize}px` : undefined }}
            className="shipment-box bg-slate-50 border border-slate-200/80 rounded-lg p-4 w-full max-w-full min-w-0 box-border overflow-hidden"
          >
            <div className="mb-3 min-w-0">
              <InlineEdit
                value={item.label}
                part="label"
                selection={selection}
                preview={preview}
                resolveVariables={resolveVariables}
                onSelect={() => {
                  onSelect();
                  onSelectPart("label");
                }}
                onCommit={(val) => onUpdate({ ...item, label: val })}
                className="text-xs font-bold uppercase tracking-wider text-blue-600 break-words [overflow-wrap:anywhere] [word-break:break-word]"
              />
            </div>
            <div className="meta-grid grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs w-full max-w-full">
              {visibleFields.map((f) => (
                <div key={f.id} className="flex flex-col min-w-0 max-w-full overflow-hidden">
                  <InlineEdit
                    value={f.label}
                    part={`${f.id}_label`}
                    selection={selection}
                    preview={preview}
                    resolveVariables={false}
                    onSelect={() => {
                      onSelect();
                      onSelectPart(`${f.id}_label`);
                    }}
                    onCommit={(val) => {
                      const nextFields = (item.fields || []).map((field) =>
                        field.id === f.id ? { ...field, label: val } : field
                      );
                      onUpdate({ ...item, fields: nextFields });
                    }}
                    className="text-[11px] font-semibold text-slate-500 break-words [overflow-wrap:anywhere]"
                  />
                  <InlineEdit
                    value={f.value || "—"}
                    part={`${f.id}_value`}
                    selection={selection}
                    preview={preview}
                    resolveVariables={resolveVariables}
                    onSelect={() => {
                      onSelect();
                      onSelectPart(`${f.id}_value`);
                    }}
                    onCommit={(val) => {
                      const nextFields = (item.fields || []).map((field) =>
                        field.id === f.id ? { ...field, value: val } : field
                      );
                      onUpdate({ ...item, fields: nextFields });
                    }}
                    className="text-slate-800 font-medium break-words [overflow-wrap:anywhere] [word-break:break-word]"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "charges": {
        const cols = (item.columns || []).filter((c) => c.visible !== false);
        return (
          <div className="charge-table border border-slate-200 rounded-lg overflow-hidden w-full max-w-full min-w-0 box-border">
            <div className="bg-slate-100 text-slate-800 border-b border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wider truncate">
              <InlineEdit
                value={item.label}
                part="label"
                selection={selection}
                preview={preview}
                resolveVariables={resolveVariables}
                onSelect={() => {
                  onSelect();
                  onSelectPart("label");
                }}
                onCommit={(val) => onUpdate({ ...item, label: val })}
                className="text-slate-800 break-words"
              />
            </div>
            <div className="w-full overflow-x-auto print:overflow-visible">
              <table
                className="w-full min-w-[500px] table-fixed"
                style={{ fontSize: style.fontSize ? `${style.fontSize}px` : undefined }}
              >
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                <tr>
                  {cols.map((col) => (
                    <th
                      key={col.id}
                      style={{ width: col.width ? `${col.width}%` : undefined }}
                      className={`p-2.5 text-${col.align || "left"} break-words overflow-visible align-top`}
                    >
                      <InlineEdit
                        value={col.label}
                        part={`col_${col.id}`}
                        selection={selection}
                        preview={preview}
                        resolveVariables={false}
                        onSelect={() => {
                          onSelect();
                          onSelectPart(`col_${col.id}`);
                        }}
                        onCommit={(val) => {
                          const nextCols = (item.columns || []).map((c) =>
                            c.id === col.id ? { ...c, label: val } : c
                          );
                          onUpdate({ ...item, columns: nextCols });
                        }}
                        className="font-bold break-words [overflow-wrap:anywhere]"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(item.rows || []).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    {cols.map((col) => (
                      <td
                        key={col.id}
                        className={`p-2.5 text-${col.align || "left"} text-slate-700 break-words overflow-hidden [overflow-wrap:anywhere] [word-break:break-word]`}
                      >
                        <InlineEdit
                          value={row[col.key] || ""}
                          part={`cell_${row.id}_${col.key}`}
                          selection={selection}
                          preview={preview}
                          resolveVariables={resolveVariables}
                          allowEmpty={true}
                          className="w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere] [word-break:break-word]"
                          onSelect={() => {
                            onSelect();
                            onSelectPart(`cell_${row.id}_${col.key}`);
                          }}
                          onCommit={(val) => {
                            const nextRows = (item.rows || []).map((r) =>
                              r.id === row.id ? { ...r, [col.key]: val } : r
                            );
                            onUpdate({ ...item, rows: nextRows });
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      }

      case "totals": {
        const visibleFields = (item.fields || []).filter((f) => f.visible !== false);
        return (
          <div className="totals-wrap flex justify-end w-full max-w-full min-w-0">
            <div
              style={{ fontSize: style.fontSize ? `${style.fontSize}px` : undefined }}
              className="totals w-72 max-w-full bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 box-border"
            >
              {visibleFields.map((f) => (
                <div key={f.id} className="flex justify-between items-center py-0.5 gap-2 min-w-0">
                  <InlineEdit
                    value={f.label}
                    part={`total_lbl_${f.id}`}
                    selection={selection}
                    preview={preview}
                    resolveVariables={false}
                    onSelect={() => {
                      onSelect();
                      onSelectPart(`total_lbl_${f.id}`);
                    }}
                    onCommit={(val) => {
                      const nextFields = (item.fields || []).map((field) =>
                        field.id === f.id ? { ...field, label: val } : field
                      );
                      onUpdate({ ...item, fields: nextFields });
                    }}
                    className="text-slate-600 font-medium min-w-0 break-words [overflow-wrap:anywhere]"
                  />
                  <InlineEdit
                    value={f.value || "$0.00"}
                    part={`total_val_${f.id}`}
                    selection={selection}
                    preview={preview}
                    resolveVariables={resolveVariables}
                    onSelect={() => {
                      onSelect();
                      onSelectPart(`total_val_${f.id}`);
                    }}
                    onCommit={(val) => {
                      const nextFields = (item.fields || []).map((field) =>
                        field.id === f.id ? { ...field, value: val } : field
                      );
                      onUpdate({ ...item, fields: nextFields });
                    }}
                    className="font-bold text-slate-800 text-right min-w-0 break-words shrink-0 [overflow-wrap:anywhere]"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "esign":
      case "acceptance": {
        return (
          <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg bg-blue-50/30">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase mb-3">
              <PenTool size={15} />
              <InlineEdit
                value={item.label}
                part="label"
                selection={selection}
                preview={preview}
                resolveVariables={resolveVariables}
                onSelect={() => {
                  onSelect();
                  onSelectPart("label");
                }}
                onCommit={(val) => onUpdate({ ...item, label: val })}
                className="text-blue-700 font-bold uppercase text-xs"
              />
            </div>
            <div className="sign-grid grid grid-cols-2 gap-6">
              <div className="border-b border-slate-400 pb-2">
                <div className="h-10 flex items-end text-xs text-slate-400 italic">
                  Sign electronically here
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Authorized Signature</span>
              </div>
              <div className="border-b border-slate-400 pb-2">
                <div className="h-10 flex items-end text-xs text-slate-700 font-mono">
                  {new Date().toLocaleDateString()}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Date</span>
              </div>
            </div>
          </div>
        );
      }

      case "html": {
        return (
          <EditableHtmlBlock
            item={item}
            preview={preview}
            isSelected={isSelected}
            onSelect={onSelect}
            onItem={onUpdate}
            onOpenHtmlEditor={() => onOpenHtmlEditor && onOpenHtmlEditor(item)}
          />
        );
      }

      case "terms":
      case "notes": {
        return (
          <div className="notes-block-section w-full max-w-full box-border overflow-hidden pt-3 border-t border-slate-200">
            <div className="mb-2">
              <InlineEdit
                value={item.label}
                part="label"
                selection={selection}
                preview={preview}
                resolveVariables={resolveVariables}
                onSelect={() => {
                  onSelect();
                  onSelectPart("label");
                }}
                onCommit={(val) => onUpdate({ ...item, label: val })}
                className="font-bold text-slate-800 text-xs"
              />
            </div>
            <NotesRichTextEditor
              value={item.content || item.variable || ""}
              preview={preview}
              isSelected={isSelected}
              style={item.style}
              onSelect={onSelect}
              onChange={(html) => onUpdate({ ...item, content: html })}
            />
          </div>
        );
      }

      case "table": {
        if (!item.tableRows) return <div>Empty Table</div>;
        return (
          <InteractiveTableBlock
            item={item}
            preview={preview}
            isSelected={isSelected}
            onSelect={onSelect}
            onItem={onUpdate}
            selection={selection}
            resolveVariables={resolveVariables}
            onSelectPart={onSelectPart}
          />
        );
      }

      case "heading": {
        const hasCustomSize = Boolean(style.fontSize);
        const hasCustomWeight = style.fontWeight !== undefined || style.bold !== undefined;
        const fontW = style.bold ? 700 : style.fontWeight;

        return (
          <div className="heading-widget my-1 w-full max-w-full min-w-0 overflow-hidden">
            <InlineEdit
              value={item.content || item.label || "Section Heading"}
              part="content"
              selection={selection}
              preview={preview}
              resolveVariables={resolveVariables}
              onSelect={() => {
                onSelect();
                onSelectPart("content");
              }}
              onCommit={(val) => onUpdate({ ...item, content: val, label: val })}
              className={`break-words [overflow-wrap:anywhere] [word-break:break-word] w-full block ${
                hasCustomSize ? "" : "text-lg"
              } ${hasCustomWeight ? "" : "font-bold"} ${style.color ? "" : "text-slate-800"}`}
              style={{
                fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
                fontWeight: fontW,
                fontFamily: style.fontFamily || undefined,
                color: style.color || undefined,
                textAlign: style.align || style.textAlign || undefined,
                textTransform: style.textTransform || undefined,
                letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
                textDecoration: [
                  style.underline ? "underline" : "",
                  style.strikethrough ? "line-through" : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined,
                fontStyle: style.italic ? "italic" : undefined,
              }}
            />
          </div>
        );
      }

      case "text": {
        const hasCustomSize = Boolean(style.fontSize);
        const hasCustomWeight = style.fontWeight !== undefined || style.bold !== undefined;
        const fontW = style.bold ? 700 : style.fontWeight;

        return (
          <div className="text-block-widget my-1 w-full max-w-full min-w-0 overflow-hidden">
            <InlineEdit
              value={item.content || "Click to type custom text..."}
              part="content"
              selection={selection}
              preview={preview}
              resolveVariables={resolveVariables}
              onSelect={() => {
                onSelect();
                onSelectPart("content");
              }}
              onCommit={(val) => onUpdate({ ...item, content: val })}
              className={`leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] w-full block ${
                hasCustomSize ? "" : "text-xs"
              } ${hasCustomWeight ? "" : "font-normal"} ${style.color ? "" : "text-slate-700"}`}
              style={{
                fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
                fontWeight: fontW,
                fontFamily: style.fontFamily || undefined,
                color: style.color || undefined,
                lineHeight: style.lineHeight || undefined,
                textAlign: style.align || style.textAlign || undefined,
                textTransform: style.textTransform || undefined,
                letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
                textDecoration: [
                  style.underline ? "underline" : "",
                  style.strikethrough ? "line-through" : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined,
                fontStyle: style.italic ? "italic" : undefined,
              }}
            />
          </div>
        );
      }

      case "image": {
        const imgSrc = item.image?.src || item.content || "";
        const imgWidth = item.image?.width || 80;
        const imgAlign = item.image?.align || "left";
        const justifyClass =
          imgAlign === "center"
            ? "justify-center"
            : imgAlign === "right"
            ? "justify-end"
            : "justify-start";

        return (
          <div className={`doc-image-widget w-full flex ${justifyClass} my-2`}>
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={item.label || "Document Image"}
                style={{ width: `${imgWidth}%`, maxWidth: "100%", height: "auto" }}
                className="rounded-lg object-contain border border-slate-200"
              />
            ) : (
              <div
                style={{ width: `${imgWidth}%` }}
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-2 min-h-[100px]"
              >
                <ImageIcon size={28} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">
                  {item.label || "Image Block (Upload or set URL in inspector)"}
                </span>
              </div>
            )}
          </div>
        );
      }

      case "footer": {
        const hasCustomSize = Boolean(style.fontSize);
        return (
          <div
            style={{ fontSize: style.fontSize ? `${style.fontSize}px` : undefined }}
            className="doc-footer-widget w-full pt-4 mt-2 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500"
          >
            <div className="flex-1 pr-4">
              <InlineEdit
                value={item.content || item.label || "Thank you for choosing our services."}
                part="content"
                selection={selection}
                preview={preview}
                resolveVariables={resolveVariables}
                onSelect={() => {
                  onSelect();
                  onSelectPart("content");
                }}
                onCommit={(val) => onUpdate({ ...item, content: val })}
                className={`text-slate-500 leading-normal ${hasCustomSize ? "" : "text-xs"}`}
                style={{
                  fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
                }}
              />
            </div>
            <div className="shrink-0 text-right font-mono text-[11px] text-slate-400">
              Page 1 of 1
            </div>
          </div>
        );
      }

      case "divider": {
        return (
          <div className="doc-divider-widget py-2 w-full">
            <hr className="border-t border-slate-200 my-1" />
          </div>
        );
      }

      default:
        return (
          <div className="p-3 bg-slate-50 rounded text-xs text-slate-700 flex items-center gap-2 max-w-full overflow-hidden">
            <span className="font-semibold shrink-0">{item.label}:</span>
            <InlineEdit
              value={item.content || item.variable || ""}
              part="content"
              selection={selection}
              preview={preview}
              resolveVariables={resolveVariables}
              onSelect={() => {
                onSelect();
                onSelectPart("content");
              }}
              onCommit={(val) => onUpdate({ ...item, content: val })}
              className="flex-1 min-w-0 break-words"
            />
          </div>
        );
    }
  };

  if (item.visible === false) return null;

  const decorations = [
    style.underline ? "underline" : "",
    style.strikethrough ? "line-through" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const blockStyle = {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
    color: style.color,
    textAlign: style.align,
    fontWeight: style.bold ? 700 : style.fontWeight,
    fontStyle: style.italic ? "italic" : undefined,
    textDecoration: decorations || undefined,
    letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
    lineHeight: style.lineHeight ? String(style.lineHeight) : undefined,
    textTransform: style.textTransform && style.textTransform !== "none" ? style.textTransform : undefined,
    backgroundColor:
      style.backgroundColor && style.backgroundColor !== "transparent"
        ? style.backgroundColor
        : undefined,
    borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
    border:
      style.borderStyle && style.borderStyle !== "none"
        ? `${style.borderWidth ?? 1}px ${style.borderStyle} ${style.borderColor || "#cbd5e1"}`
        : undefined,
    padding: item.padding !== undefined ? `${item.padding}px` : undefined,
    maxWidth: "100%",
    boxSizing: "border-box",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    width:
      item.width === "half"
        ? "50%"
        : item.width === "auto"
          ? "max-content"
          : "100%",
  };

  if (preview && item.visible === false) {
    return null;
  }

  const isHidden = item.visible === false;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={blockStyle}
      className={`group doc-component relative rounded-lg transition border-2 p-3 max-w-full box-border overflow-visible hover:z-30 ${
        isSelected
          ? "border-blue-500 bg-blue-50/10 shadow-xs selected z-30"
          : isHidden
            ? "border-dashed border-amber-300 bg-amber-50/20 opacity-70"
            : "border-transparent hover:border-slate-300"
      }`}
    >
      {/* Hidden Status Badge */}
      {!preview && isHidden && (
        <div className="absolute top-1.5 left-2 flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100/80 border border-amber-300 px-1.5 py-0.5 rounded font-medium select-none z-10">
          <EyeOff size={11} />
          <span>Hidden from preview</span>
        </div>
      )}

      {/* Drag Reorder Handle */}
      {!preview && (
        <button
          type="button"
          className="component-grip"
          draggable={true}
          aria-label="Drag component"
          title="Drag to reorder component"
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData("itemId", item.id);
            e.dataTransfer.setData("text/plain", item.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>
      )}

      {/* Floating Action Bar on Hover/Select */}
      {!preview && (
        <div
          className={`absolute -top-3.5 right-3 flex items-center gap-0.5 bg-white border border-slate-200 rounded-md shadow-md px-1 py-0.5 z-40 transition ${
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {onMoveUp && (
            <button
              type="button"
              disabled={isFirst}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
              title="Move block up"
              aria-label="Move block up"
            >
              <ArrowUp size={13} />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              disabled={isLast}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
              title="Move block down"
              aria-label="Move block down"
            >
              <ArrowDown size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
              if (item.type === "html" || item.htmlContent) {
                onOpenHtmlEditor();
              }
            }}
            className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100"
            title="Edit content"
            aria-label="Edit content"
          >
            <Pencil size={13} />
          </button>
          {onToggleVisibility && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility();
              }}
              className={`p-1 rounded hover:bg-slate-100 ${
                isHidden
                  ? "text-amber-600 hover:text-amber-700 bg-amber-50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title={isHidden ? "Show block in preview" : "Hide block from preview"}
              aria-label={isHidden ? "Show block in preview" : "Hide block from preview"}
            >
              {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
            title="Duplicate block"
            aria-label="Duplicate block"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
            title="Delete block"
            aria-label="Delete block"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* Block Body */}
      {renderContent()}
    </div>
  );
}
