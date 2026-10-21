import React, { useEffect, useState } from "react";
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

import { sanitizeHtml } from "../core/htmlSanitizer";

const SAMPLE_VARIABLES = {
  "company.name": "KargoFlow Moving",
  "company.phone": "(800) 555-0199",
  "company.email": "dispatch@kargoflow.example",
  "branch.name": "Vancouver Branch",
  "customer.full_name": "Alex Customer",
  "customer.first_name": "Alex",
  "customer.last_name": "Customer",
  "customer.email": "alex.customer@example.com",
  "customer.phone": "(555) 019-2834",
  "opportunity.number": "OPP-0042",
  "opportunity.service_type": "Residential move",
  "opportunity.move_type": "Local",
  "move.date": "June 15, 2026",
  "move.size": "3 bedroom home",
  "move.estimated_weight": "3 bedroom home",
  "move.origin_address": "123 Main Street, Vancouver, BC",
  "move.destination_address": "456 Oak Avenue, Burnaby, BC",
  "move.distance_miles": "12",
  "sales_rep.name": "Jordan Lee",
  "sales_rep.email": "jordan.lee@kargoflow.example",
  "estimate.number": "EST-00042",
  "estimate.binding_type": "Non-binding",
  "estimate.subtotal": "$1,475.00",
  "estimate.discount": "$50.00",
  "estimate.tax": "$77.63",
  "estimate.tax_amount": "$77.63",
  "estimate.grand_total": "$1,502.63",
  "estimate.deposit_amount": "$300.00",
  "estimate.deposit_due": "$300.00",
  "estimate.hourly_rate": "$185.00",
  "estimate.crew_size": "3",
  "estimate.truck_count": "1",
  "estimate.estimated_hours": "6",
  "estimate.total_volume_cuft": "620",
  "estimate.total_weight_lbs": "3,200",
  "invoice.number": "INV-00128",
  "invoice.issued_at": "June 15, 2026",
  "invoice.due_at": "June 30, 2026",
  "invoice.subtotal": "$1,475.00",
  "invoice.discount": "$50.00",
  "invoice.tax_amount": "$77.63",
  "invoice.tax": "$77.63",
  "invoice.total": "$1,502.63",
  "invoice.amount_paid": "$300.00",
  "invoice.balance_due": "$1,202.63",
  "job.number": "JOB-00042",
  "job.start_time": "June 15, 2026, 8:00 AM",
  "links.estimate_portal": "https://example.com/estimates/EST-00042",
  "links.pay_now": "https://example.com/pay/INV-00128",
  "links.sign_document": "https://example.com/sign/CON-00042",
  "system.today": "June 15, 2026",
  "system.now": "June 15, 2026, 8:00 AM",
};

const SAMPLE_CHARGES = [
  { name: "Moving labor", category: "Labor", description: "3 movers × 5 hours", quantity: "5", unit_price: "$185.00", total: "$925.00" },
  { name: "Moving truck", category: "Transportation", description: "Truck and fuel", quantity: "1", unit_price: "$350.00", total: "$350.00" },
  { name: "Packing materials", category: "Materials", description: "Boxes and wrapping", quantity: "1", unit_price: "$200.00", total: "$200.00" },
];
const SAMPLE_INVENTORY = [
  { room: "Living room", item: "Sofa", quantity: "1", volume_cuft: "90", weight_lbs: "180" },
  { room: "Bedroom", item: "Queen bed", quantity: "1", volume_cuft: "65", weight_lbs: "140" },
];
const SAMPLE_PAYMENTS = [
  { date: "June 15, 2026", method: "Visa ending 4242", amount: "$300.00", reference: "PAY-0084" },
];
const SAMPLE_CREW = [
  { name: "Morgan Chen", role: "Crew lead" },
  { name: "Taylor Rivera", role: "Mover" },
  { name: "Riley Singh", role: "Mover" },
];
const SAMPLE_TRUCKS = [{ name: "Truck 12", size: "26 ft" }];

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

function resolvePreviewText(value, sampleData, scope = {}) {
  return String(value || "").replace(/\{\{\s*([a-zA-Z0-9_.]+)(?:\|([^}]+))?\s*\}\}/g, (token, name, filter) => {
    if (!sampleData) return token;
    if (name.startsWith("item.")) return escapeHtml(scope[name.slice(5)] ?? token);
    const sample = SAMPLE_VARIABLES[name];
    if (sample === undefined) return token;
    if (filter?.startsWith("default:") && !sample) return escapeHtml(filter.slice(8).replace(/^["']|["']$/g, ""));
    return escapeHtml(sample);
  });
}

const CURRENCY_AMOUNT_FIELDS = new Set(["subtotal", "discount", "tax", "total", "deposit", "balance"]);
const LEGACY_TOTAL_FIELD_KEYS = {
  subtotal: "subtotal",
  discount: "discount",
  tax: "tax",
  grandTotal: "total",
  depositDue: "deposit",
  balanceDue: "balance",
};

function getConfiguredField(props, key, label, value, sampleData, scope = {}, { amount = false } = {}) {
  const field = (props?.custom_fields || props?.customFields)?.[key];
  const configuredLabel = field?.label || label;
  const configuredValue = field?.mode === "custom"
    ? String(field.customValue ?? (field.mode === "custom" ? field.value : "") ?? "")
    : field?.dynamicValue || (field?.mode === "dynamic" ? field.value : "") || value;
  const displayValue = field?.mode === "custom" && (amount || CURRENCY_AMOUNT_FIELDS.has(key))
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(configuredValue))
    : configuredValue;
  return {
    label: resolvePreviewText(configuredLabel, sampleData, scope),
    value: field?.mode === "custom"
      ? escapeHtml(displayValue)
      : resolvePreviewText(configuredValue, sampleData, scope),
  };
}

function ConfiguredCustomFields({ fields, sampleData, scope }) {
  const entries = Object.entries(fields || {}).filter(([key]) => key.startsWith("custom_"));
  if (!entries.length) return null;
  return (
    <div className="mt-2 space-y-1 text-xs">
      {entries.map(([key, field]) => {
        const isCustom = field?.mode === "custom";
        const configuredValue = isCustom
          ? field.customValue ?? field.value ?? ""
          : field?.dynamicValue || field?.value || "";
        const displayValue = isCustom && field.type === "currency" && Number.isFinite(Number(configuredValue))
          ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(configuredValue))
          : configuredValue;
        const value = isCustom
          ? escapeHtml(displayValue)
          : resolvePreviewText(configuredValue, sampleData, scope);
        return (
          <div key={key} className="flex justify-between gap-3">
            <span className="text-slate-600">{resolvePreviewText(field?.label || "Custom field", sampleData, scope)}</span>
            <span className="font-medium text-slate-800">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function matchesPreviewCondition(condition, sampleData, scope) {
  if (!condition) return true;
  if (Array.isArray(condition.all)) return condition.all.every((child) => matchesPreviewCondition(child, sampleData, scope));
  if (Array.isArray(condition.any)) return condition.any.some((child) => matchesPreviewCondition(child, sampleData, scope));
  if (condition.not) return !matchesPreviewCondition(condition.not, sampleData, scope);
  const raw = condition.var?.startsWith("item.")
    ? scope[condition.var.slice(5)]
    : SAMPLE_VARIABLES[condition.var];
  if (!sampleData) return true;
  if (condition.op === "empty") return raw === undefined || raw === null || raw === "";
  if (condition.op === "not_empty") return raw !== undefined && raw !== null && raw !== "";
  const value = condition.value;
  if (condition.op === "eq") return String(raw).toLowerCase() === String(value).toLowerCase();
  if (condition.op === "ne") return String(raw).toLowerCase() !== String(value).toLowerCase();
  if (condition.op === "contains") return String(raw ?? "").toLowerCase().includes(String(value).toLowerCase());
  const left = Number(raw);
  const right = Number(value);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  if (condition.op === "gt") return left > right;
  if (condition.op === "gte") return left >= right;
  if (condition.op === "lt") return left < right;
  if (condition.op === "lte") return left <= right;
  return true;
}

function PreviewTable({ columns, rows, columnWidths }) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className="w-full border-collapse text-xs"
        style={columnWidths ? { tableLayout: "fixed" } : undefined}
      >
        {columnWidths && (
          <colgroup>
            {columnWidths.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
        )}
        <thead className="bg-slate-50">
          <tr>{columns.map((column) => <th key={column.key} className="border-b border-slate-300 px-2 py-1.5 text-left font-semibold text-slate-600">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => <td key={column.key} className="border-b border-slate-200 px-2 py-1.5 text-slate-700">{row[column.key] || ""}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BackendWidgetPreview({ block, sampleData = true, scope = {}, customerPreview = false }) {
  const props = block.props || {};
  const children = Array.isArray(block.children) ? block.children : [];
  const [imageUrl, setImageUrl] = useState("");
  const imageError = "Global templates cannot reference tenant image files.";
  const [clauseBlocks, setClauseBlocks] = useState(null);
  const clauseError = "Use inline terms in global templates.";
  const nested = children.map((child, index) => (
    <BackendWidgetPreview key={`${child.key || index}-${child.props?.asset_id || ""}-${child.props?.block_id || ""}`} block={child} sampleData={sampleData} scope={scope} customerPreview={customerPreview} />
  ));



  if (block.type === "heading") {
    const HeadingTag = `h${Math.min(4, Math.max(1, Number(props.level) || 2))}`;
    return <HeadingTag className="font-semibold text-slate-800" style={{ textAlign: props.align || "left" }}>{resolvePreviewText(props.text || "Heading", sampleData, scope)}</HeadingTag>;
  }
  if (block.type === "header") {
    const company = getConfiguredField(
      props,
      "company_name",
      "Company name",
      props.company_name || "{{company.name}}",
      sampleData,
      scope
    ).value;
    const title = getConfiguredField(
      props,
      "document_title",
      "Document title",
      props.title || "Estimate",
      sampleData,
      scope
    ).value;
    const number = getConfiguredField(
      props,
      "document_number",
      "Document number",
      props.document_number || "{{estimate.number}}",
      sampleData,
      scope
    ).value;
    return (
      <header className="flex w-full flex-wrap items-start justify-between gap-3 border-b-2 border-slate-200 pb-4">
        <div className="min-w-0 flex-1 text-xl font-bold text-slate-800">{company}</div>
        <div className="min-w-0 text-right">
          <h1 className="text-lg font-bold text-blue-700">{title}</h1>
          {number && <p className="mt-1 font-mono text-xs text-slate-500">{number}</p>}
        </div>
      </header>
    );
  }
  if (block.type === "text" || block.type === "terms") {
    const richText = sanitizeHtml(resolvePreviewText(props.html || "", sampleData, scope)).cleanHtml;
    return (
      <div className="text-sm text-slate-700 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-700 [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: block.type === "terms" && props.title ? `<h3>${escapeHtml(resolvePreviewText(props.title, sampleData, scope))}</h3>${richText}` : richText }} />
    );
  }
  if (block.type === "table") {
    const columns = Array.isArray(props.columns) ? props.columns : [];
    const rows = Array.isArray(props.rows) ? props.rows : [];
    return (
      <PreviewTable
        columns={columns.map((column, index) => ({ key: String(index), label: resolvePreviewText(column, sampleData, scope) }))}
        rows={rows.map((row) => Object.fromEntries(columns.map((_column, index) => [String(index), resolvePreviewText(row?.[index], sampleData, scope)])))}
      />
    );
  }
  if (block.type === "divider") return <hr className="my-2" style={{ borderStyle: props.style || "solid", borderColor: props.color || "#cbd5e1" }} />;
  if (block.type === "spacer") return <div style={{ height: Math.min(Number(props.height) || 24, 100) }} />;
  if (block.type === "page_break") return <div className="border-y border-dashed border-slate-300 py-2 text-center text-[10px] uppercase text-slate-400">PDF page break</div>;
  if (block.type === "variable") {
    const configuredField = props.custom_fields?.merge_field;
    const label = configuredField?.label || props.label;
    const value = configuredField?.mode === "custom"
      ? escapeHtml(configuredField.customValue ?? configuredField.value ?? "")
      : resolvePreviewText(`{{${props.token || "variable"}${props.format ? `|${props.format}` : ""}}}`, sampleData, scope);
    return <span>{label ? `${resolvePreviewText(label, sampleData, scope)}: ` : ""}{value}</span>;
  }
  if (block.type === "image") {
    const altField = props.custom_fields?.image_alt;
    const captionField = props.custom_fields?.image_caption;
    const altText = altField
      ? getConfiguredField(props, "image_alt", props.alt || "", "{{customer.full_name}}", sampleData, scope).value
      : resolvePreviewText(props.alt || "", sampleData, scope);
    const captionText = captionField
      ? getConfiguredField(props, "image_caption", "", "{{customer.full_name}}", sampleData, scope).value
      : "";
    return imageUrl
      ? <div className="my-2" style={{ textAlign: props.align || "left" }}><img src={imageUrl} alt={altText} width={props.width || undefined} className="inline-block h-auto max-w-full" />{captionText && <p className="mt-1 text-xs text-slate-500">{captionText}</p>}</div>
      : <div role={imageError ? "alert" : undefined} className={`rounded border border-dashed p-4 text-center text-xs ${imageError ? "border-red-300 text-red-600" : "border-slate-300 text-slate-500"}`}>{imageError || (props.asset_id ? "Loading uploaded image…" : "Select an uploaded image asset to preview it.")}</div>;
  }
  if (block.type === "signature" || block.type === "initial") {
    return <div className="max-w-sm py-2 text-xs text-slate-700"><span>{props.label || block.type.replace(/_/g, " ")}{props.required ? " *" : ""}</span><div className="mt-6 border-b border-slate-400" />{props.signer_role && <small className="mt-1 block text-slate-400">Signer: {props.signer_role}</small>}</div>;
  }
  if (block.type === "form_field") {
    if (props.field_type === "checkbox") {
      return <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" disabled={customerPreview} onClick={(event) => { if (!customerPreview) event.preventDefault(); }} />{props.label || "Checkbox"}{props.required ? " *" : ""}</label>;
    }
    if (props.field_type === "date") {
      return <label className="block max-w-sm text-xs text-slate-600">{props.label || "Date"}{props.required ? " *" : ""}<input type="date" disabled={customerPreview} readOnly={!customerPreview} onClick={(event) => { if (!customerPreview) event.preventDefault(); }} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1" /></label>;
    }
    return <label className="block max-w-sm text-xs text-slate-600">{props.label || "Enter a value"}{props.required ? " *" : ""}<input type="text" disabled={customerPreview} readOnly={!customerPreview} placeholder="Customer response" onClick={(event) => { if (!customerPreview) event.preventDefault(); }} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5" /></label>;
  }
  if (block.type === "button") return <div className="py-2" style={{ textAlign: props.align || "left" }}><span className="inline-block rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white">{resolvePreviewText(props.label || "Continue", sampleData, scope)}</span></div>;
  if (block.type === "columns") {
    const count = Math.min(4, Math.max(2, Number(props.count) || 2));
    const columns = Array.from({ length: count }, (_, index) => children.filter((child) => Number(child.column || 0) === index));
    return (
      <div className="grid" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`, gap: `${Math.max(0, Number(props.gap) || 0)}px` }}>
        {columns.map((column, index) => <div key={index} className="min-w-0 space-y-2">{column.map((child, childIndex) => <BackendWidgetPreview key={child.key || childIndex} block={child} sampleData={sampleData} scope={scope} />)}</div>)}
      </div>
    );
  }
  if (block.type === "conditional") {
    if (customerPreview && !matchesPreviewCondition(block.condition, sampleData, scope)) return null;
    return <div className="space-y-2">{nested}</div>;
  }
  if (block.type === "repeater") {
    const rows = props.source === "invoice.line_items" ? SAMPLE_CHARGES : props.source === "estimate.inventory" ? SAMPLE_INVENTORY : SAMPLE_CHARGES;
    if (!rows.length) return <p className="text-xs text-slate-500">{resolvePreviewText(props.empty_text, sampleData, scope)}</p>;
    return <div className="space-y-2">{rows.map((row, index) => <div key={index}>{children.map((child, childIndex) => <BackendWidgetPreview key={`${child.key || childIndex}-${index}`} block={child} sampleData={sampleData} scope={row} customerPreview={customerPreview} />)}</div>)}</div>;
  }
  if (block.type === "clause") return clauseBlocks
    ? <div className="space-y-2">{clauseBlocks.map((child, index) => <BackendWidgetPreview key={child.key || index} block={child} sampleData={sampleData} scope={scope} customerPreview={customerPreview} />)}</div>
    : <p role={clauseError ? "alert" : undefined} className={`text-xs ${clauseError ? "text-red-600" : "text-slate-500"}`}>{clauseError || "Loading saved clause…"}</p>;
  if (block.type === "move_details") {
    const rows = [
      ...(props.show_dates !== false ? [getConfiguredField(props, "move_date", "Move date", "{{move.date}}", sampleData, scope)] : []),
      ...(props.show_move_size !== false ? [getConfiguredField(props, "move_size", "Move size", "{{move.estimated_weight}}", sampleData, scope)] : []),
      ...(props.show_stops !== false ? [
        getConfiguredField(props, "origin", "From", "{{move.origin_address}}", sampleData, scope),
        getConfiguredField(props, "destination", "To", "{{move.destination_address}}", sampleData, scope),
      ] : []),
    ];
    return <PreviewTable
      columns={[{ key: "label", label: getConfiguredField(props, "section_title", block.label || "Move details", "", sampleData, scope).label }, { key: "value", label: " " }]}
      rows={rows}
      columnWidths={["20%", "80%"]}
    />;
  }
  if (block.type === "crew_trucks") {
    const rows = [
      ...(props.show_names !== false ? SAMPLE_CREW.map((member) => ({ type: member.role, name: member.name })) : []),
      ...(props.show_trucks !== false ? SAMPLE_TRUCKS.map((truck) => ({ type: "Truck", name: `${truck.name} · ${truck.size}` })) : []),
    ];
    return <PreviewTable columns={[
      { key: "type", label: getConfiguredField(props, "crew_title", "Crew / vehicle", "", sampleData, scope).label },
      { key: "name", label: getConfiguredField(props, "truck_title", "Assignment", "", sampleData, scope).label },
    ]} rows={rows} />;
  }
  if (block.type === "charges" || block.type === "line_items") {
    const isCharges = block.type === "charges";
    const title = getConfiguredField(props, "section_title", block.label || (isCharges ? "Estimate charges" : "Invoice line items"), "", sampleData, scope).label;
    const rows = SAMPLE_CHARGES.map((row, index) => {
      const rate = getConfiguredField(
        props,
        `charge_${index}_unit_price`,
        "Rate",
        row.unit_price,
        sampleData,
        scope,
        { amount: true },
      );
      const rawRate = Number(props.custom_fields?.[`charge_${index}_unit_price`]?.customValue
        ?? props.custom_fields?.[`charge_${index}_unit_price`]?.value
        ?? row.unit_price);
      const quantity = Number(row.quantity) || 0;
      return {
      description: getConfiguredField(
        props,
        `charge_${index}_description`,
        "Description",
        row.name,
        sampleData,
        scope,
      ).value,
      quantity: row.quantity,
      unit_price: rate.value,
      total: props.custom_fields?.[`charge_${index}_unit_price`]?.mode === "custom"
        && Number.isFinite(rawRate)
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(rawRate * quantity)
        : row.total,
    };
    });
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-700">{title}</p>
        <PreviewTable columns={[
          { key: "description", label: getConfiguredField(props, "description_label", "Description", "", sampleData, scope).label },
          ...(props.show_quantity !== false && isCharges ? [{ key: "quantity", label: getConfiguredField(props, "quantity_label", "Qty", "", sampleData, scope).label }] : []),
          { key: "unit_price", label: getConfiguredField(props, "rate_label", "Rate", "", sampleData, scope).label },
          { key: "total", label: getConfiguredField(props, "amount_label", "Amount", "", sampleData, scope).label },
        ]} rows={rows} />
      </div>
    );
  }
  if (block.type === "estimate_summary" || block.type === "totals") {
    const isEstimate = block.type === "estimate_summary";
    const names = isEstimate
      ? { subtotal: "Subtotal", discount: "Discount", tax: "Tax", total: "Estimate total", deposit: "Deposit due", balance: "Balance due" }
      : { subtotal: "Subtotal", discount: "Discount", tax: "Tax", total: "Invoice total", balance: "Balance due" };
    const rows = [
      getConfiguredField(props, "subtotal", names.subtotal, isEstimate ? "{{estimate.subtotal}}" : "{{invoice.total}}", sampleData, scope),
      ...((props.show_discount !== false) ? [getConfiguredField(props, "discount", names.discount, isEstimate ? "{{estimate.discount}}" : "{{invoice.total}}", sampleData, scope)] : []),
      ...((props.show_tax !== false) ? [getConfiguredField(props, "tax", names.tax, isEstimate ? "{{estimate.tax_amount}}" : "{{invoice.total}}", sampleData, scope)] : []),
      getConfiguredField(props, "total", names.total, isEstimate ? "{{estimate.grand_total}}" : "{{invoice.total}}", sampleData, scope),
      ...(isEstimate && props.show_deposit ? [getConfiguredField(props, "deposit", names.deposit, "{{estimate.deposit_due}}", sampleData, scope)] : []),
      ...(!isEstimate && props.show_balance !== false ? [getConfiguredField(props, "balance", names.balance, "{{invoice.balance_due}}", sampleData, scope)] : []),
      ...(isEstimate && props.show_binding_note ? [{ label: "Estimate type", value: SAMPLE_VARIABLES["estimate.binding_type"] }] : []),
    ];
    return <PreviewTable columns={[{ key: "label", label: getConfiguredField(props, "section_title", block.label || (isEstimate ? "Estimate summary" : "Invoice totals"), "", sampleData, scope).label }, { key: "value", label: "Amount" }]} rows={rows} />;
  }
  if (block.type === "inventory") {
    if (props.mode === "detailed") return <PreviewTable columns={[
      { key: "room", label: getConfiguredField(props, "inventory_room", "Room", "", sampleData, scope).label },
      { key: "item", label: getConfiguredField(props, "inventory_item", "Item", "", sampleData, scope).label },
      { key: "quantity", label: "Qty" },
      ...(props.show_volume !== false ? [{ key: "volume_cuft", label: getConfiguredField(props, "inventory_volume", "Volume (cu ft)", "", sampleData, scope).label }] : []),
      ...(props.show_weight !== false ? [{ key: "weight_lbs", label: getConfiguredField(props, "inventory_weight", "Weight (lbs)", "", sampleData, scope).label }] : []),
    ]} rows={SAMPLE_INVENTORY} />;
    return <div className="grid grid-cols-3 gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs"><span>{getConfiguredField(props, "inventory_room", "Rooms", "", sampleData, scope).label}<strong className="block">2</strong></span><span>{props.show_volume !== false ? getConfiguredField(props, "inventory_volume", "Volume", "", sampleData, scope).label : getConfiguredField(props, "inventory_item", "Items", "", sampleData, scope).label}<strong className="block">{props.show_volume !== false ? "155 cu ft" : "2"}</strong></span>{props.show_weight !== false && <span>{getConfiguredField(props, "inventory_weight", "Weight", "", sampleData, scope).label}<strong className="block">320 lbs</strong></span>}</div>;
  }
  if (block.type === "payment_history") return <PreviewTable columns={[
    { key: "date", label: "Date" }, ...(props.show_method !== false ? [{ key: "method", label: "Method" }] : []),
    { key: "amount", label: "Amount" }, { key: "reference", label: "Reference" },
  ]} rows={SAMPLE_PAYMENTS} />;
  if (block.type === "options") return <fieldset className="space-y-2 rounded border border-slate-200 p-3"><legend className="px-1 text-xs font-semibold">Choose a package</legend>{["Standard Move", "Full-Service Move"].map((name) => <label key={name} className="flex items-center gap-2 text-xs text-slate-700"><input type={props.selection === "multiple" ? "checkbox" : "radio"} disabled={customerPreview} onClick={(event) => { if (!customerPreview) event.preventDefault(); }} />{name}<span className="ml-auto">$1,502.63</span></label>)}</fieldset>;
  if (block.type === "payment") return <div className="rounded border border-slate-200 bg-slate-50 p-3"><p className="mb-2 text-xs text-slate-600">{props.amount_source === "balance" ? `Balance due: ${SAMPLE_VARIABLES["invoice.balance_due"]}` : `Deposit due: ${SAMPLE_VARIABLES["estimate.deposit_amount"]}`}</p><button type="button" disabled={customerPreview} onClick={(event) => event.preventDefault()} className="rounded bg-blue-600 px-4 py-2 text-xs font-semibold text-white">{props.label || "Pay now"}</button></div>;
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{block.label || block.type.replace(/_/g, " ")}</div>
  );
}

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
  sampleData = true,
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
        const configuredHeaderValue = (key, value) => {
          const configured = item.customFields?.[key];
          if (configured?.mode === "custom") return configured.customValue ?? configured.value ?? value;
          return configured?.dynamicValue || configured?.value || value;
        };

        const hasCustomSize = Boolean(style.fontSize);
        const hasCustomWeight = style.fontWeight !== undefined || style.bold !== undefined;
        const fontW = style.bold ? 700 : style.fontWeight;

        return (
          <div className="doc-header flex flex-wrap sm:flex-nowrap justify-between items-start gap-3 pb-4 border-b-2 border-slate-200 w-full max-w-full min-w-0 box-border">
            <div className="min-w-0 flex-1 pr-2">
              <InlineEdit
                value={configuredHeaderValue("company_name", companyField)}
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
                value={configuredHeaderValue("document_title", titleField)}
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
                value={configuredHeaderValue("document_number", numberField)}
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
              {visibleFields.map((f) => {
                const configuredField = getConfiguredField(item, f.id, f.label, f.value || "—", sampleData);
                return (
                <div key={f.id} className="flex flex-col min-w-0 max-w-full overflow-hidden">
                  <InlineEdit
                    value={configuredField.label}
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
                    value={configuredField.value || "—"}
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
                );
              })}
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
                  {cols.map((col) => {
                    const labelKeys = {
                      description: "description_label",
                      quantity: "quantity_label",
                      unitPrice: "rate_label",
                      unit_price: "rate_label",
                      rate: "rate_label",
                      amount: "amount_label",
                      total: "amount_label",
                    };
                    const configuredLabel = item.customFields?.[labelKeys[col.key]]?.label;
                    return (<th
                      key={col.id}
                      style={{ width: col.width ? `${col.width}%` : undefined }}
                      className={`p-2.5 text-${col.align || "left"} break-words overflow-visible align-top`}
                    >
                      <InlineEdit
                        value={configuredLabel || col.label}
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
                    </th>);
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(item.rows || []).map((row, rowIndex) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    {cols.map((col) => {
                      const normalizedKey = ["unitPrice", "unit_price", "rate"].includes(col.key)
                        ? "unit_price"
                        : col.key === "total" || col.key === "amount"
                          ? "amount"
                          : col.key;
                      const configured = item.customFields?.[`charge_${rowIndex}_${normalizedKey}`];
                      const customRate = item.customFields?.[`charge_${rowIndex}_unit_price`];
                      const quantity = Number(row.quantity) || 0;
                      const rate = Number(customRate?.customValue ?? customRate?.value);
                      const value = normalizedKey === "amount" && customRate?.mode === "custom" && Number.isFinite(rate)
                        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(rate * quantity)
                        : configured?.mode === "custom"
                          ? configured.customValue ?? configured.value ?? row[col.key] ?? ""
                          : row[col.key] || "";
                      return (
                      <td
                        key={col.id}
                        className={`p-2.5 text-${col.align || "left"} text-slate-700 break-words overflow-hidden [overflow-wrap:anywhere] [word-break:break-word]`}
                      >
                        <InlineEdit
                          value={value}
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
                    );})}
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
              {visibleFields.map((f) => {
                const configuredField = item.customFields?.[LEGACY_TOTAL_FIELD_KEYS[f.id]];
                const configuredValue = configuredField?.mode === "custom"
                  ? configuredField.customValue ?? configuredField.value
                  : configuredField?.mode === "dynamic"
                    ? configuredField.dynamicValue || configuredField.value
                    : f.value || "$0.00";
                const displayValue = configuredField?.mode === "custom"
                  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(configuredValue))
                  : configuredValue;
                return (
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
                    value={displayValue}
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
                );
              })}
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
        const textContent = item.content || "Click to type custom text...";
        const containsRichText = /<\/?[a-z][\s\S]*>/i.test(textContent);

        return (
          <div className="text-block-widget my-1 w-full max-w-full min-w-0 overflow-hidden">
            {containsRichText ? (
              <div
                className={`leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] w-full ${
                  hasCustomSize ? "" : "text-xs"
                } ${hasCustomWeight ? "" : "font-normal"} ${style.color ? "" : "text-slate-700"}`}
                style={{
                  fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
                  fontWeight: fontW,
                  fontFamily: style.fontFamily || undefined,
                  color: style.color || undefined,
                  lineHeight: style.lineHeight || undefined,
                  textAlign: style.align || style.textAlign || undefined,
                }}
                onClick={() => {
                  if (!preview) {
                    onSelect();
                    onSelectPart("content");
                  }
                }}
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(resolvePreviewText(textContent, resolveVariables)).cleanHtml,
                }}
              />
            ) : (
              <InlineEdit
                value={textContent}
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
            )}
          </div>
        );
      }

      case "callout": {
        return (
          <div className="my-2 w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <InlineEdit
              value={item.content || item.label || "Important notice"}
              part="content"
              selection={selection}
              preview={preview}
              resolveVariables={resolveVariables}
              onSelect={() => {
                onSelect();
                onSelectPart("content");
              }}
              onCommit={(val) => onUpdate({ ...item, content: val })}
              className="block w-full break-words [overflow-wrap:anywhere]"
            />
          </div>
        );
      }

      case "button": {
        return (
          <div className="my-2 w-full">
            <InlineEdit
              value={item.content || item.label || "Continue"}
              part="content"
              selection={selection}
              preview={preview}
              resolveVariables={resolveVariables}
              onSelect={() => {
                onSelect();
                onSelectPart("content");
              }}
              onCommit={(val) => onUpdate({ ...item, content: val })}
              className="inline-block max-w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white break-words"
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
              <div className="max-w-full">
                <img
                  src={imgSrc}
                  alt={item.customFields?.image_alt?.mode === "custom"
                    ? item.customFields.image_alt.customValue ?? item.customFields.image_alt.value
                    : resolvePreviewText(item.customFields?.image_alt?.dynamicValue || item.customFields?.image_alt?.value || item.label || "Document Image", sampleData)}
                  style={{ width: `${imgWidth}%`, maxWidth: "100%", height: "auto" }}
                  className="rounded-lg object-contain border border-slate-200"
                />
                {item.customFields?.image_caption && (
                  <p className="mt-1 text-xs text-slate-500">
                    {item.customFields.image_caption.mode === "custom"
                      ? item.customFields.image_caption.customValue ?? item.customFields.image_caption.value
                      : resolvePreviewText(item.customFields.image_caption.dynamicValue || item.customFields.image_caption.value || "", sampleData)}
                  </p>
                )}
              </div>
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
          <div className="doc-divider-widget w-full py-2">
            <hr
              className="my-1"
              style={{
                borderTopStyle: style.borderStyle || "solid",
                borderTopColor: style.borderColor || item.color || "#CBD5E1",
              }}
            />
          </div>
        );
      }

      case "spacer": {
        return <div aria-label="Spacer" style={{ height: `${Math.max(4, Math.min(400, Number(item.height) || 24))}px` }} />;
      }

      case "page_break": {
        return (
          <div className="border-y border-dashed border-slate-300 py-2 text-center text-[10px] uppercase text-slate-400">
            PDF page break
          </div>
        );
      }

      case "builder_block": {
        return (
          <div
            className="backend-widget-typography w-full py-1"
            style={{
              "--builder-widget-font-family": style.fontFamily || "inherit",
              "--builder-widget-font-size": style.fontSize ? `${style.fontSize}px` : "inherit",
              "--builder-widget-font-weight": style.bold ? 700 : style.fontWeight || "inherit",
              "--builder-widget-text-transform": style.textTransform || "inherit",
            }}
          >
            <BackendWidgetPreview
              key={`${item.id}-${item.props?.asset_id || ""}-${item.props?.block_id || ""}`}
              block={{ type: item.blockType, label: item.label, props: item.props, children: item.children, condition: item.condition }}
              sampleData={sampleData}
              customerPreview={preview}
            />
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
          className={`absolute ${isFirst ? "top-1.5" : "-top-3.5"} right-3 flex items-center gap-0.5 bg-white border border-slate-200 rounded-md shadow-md px-1 py-0.5 z-40 transition ${
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
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
              onSelectPart("edit-content");
            }}
            className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100"
            title="Edit widget settings"
            aria-label="Edit widget"
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

      {renderContent()}
      {item.type !== "builder_block" && (
        <ConfiguredCustomFields fields={item.customFields} sampleData={sampleData} scope={{}} />
      )}
      {item.type === "builder_block" && (
        <ConfiguredCustomFields fields={item.props?.custom_fields} sampleData={sampleData} scope={{}} />
      )}
    </div>
  );
}
