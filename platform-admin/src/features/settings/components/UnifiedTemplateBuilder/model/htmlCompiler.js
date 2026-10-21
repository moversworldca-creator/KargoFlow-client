/**
 * HTML Serialization & Export Compiler
 * Compiles internal JSON template models into clean standalone HTML
 * suitable for PDF generation, email distribution, and customer portals.
 */

import { sanitizeHtml, scopeCss } from "../core/htmlSanitizer";

const BACKEND_PREVIEW_VALUES = {
  "company.name": "KargoFlow Moving",
  "customer.full_name": "Alex Customer",
  "customer.first_name": "Alex",
  "customer.email": "alex.customer@example.com",
  "customer.phone": "(555) 019-2834",
  "move.date": "June 15, 2026",
  "move.size": "3 bedroom home",
  "move.origin_address": "123 Main Street, Vancouver, BC",
  "move.destination_address": "456 Oak Avenue, Burnaby, BC",
  "estimate.number": "EST-00042",
  "estimate.subtotal": "$1,475.00",
  "estimate.discount": "$50.00",
  "estimate.tax": "$77.63",
  "estimate.grand_total": "$1,502.63",
  "estimate.deposit_amount": "$300.00",
  "invoice.number": "INV-00128",
  "invoice.subtotal": "$1,475.00",
  "invoice.discount": "$50.00",
  "invoice.tax": "$77.63",
  "invoice.total": "$1,502.63",
  "invoice.balance_due": "$1,202.63",
};

function escapePreviewHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
}

function previewMergeFields(value) {
  return String(value ?? "").replace(/\{\{\s*([a-zA-Z0-9_.]+)(?:\|([^}]+))?\s*\}\}/g, (token, name) =>
    BACKEND_PREVIEW_VALUES[name] === undefined ? token : BACKEND_PREVIEW_VALUES[name]
  );
}

function safeAlignment(value) {
  return ["left", "center", "right"].includes(value) ? value : "left";
}

function configuredField(props, key, label, fallback, { allowCustom = true, amount = false } = {}) {
  const field = props.custom_fields?.[key] || {};
  const isCustom = field.mode === "custom" && allowCustom;
  const rawValue = isCustom
    ? field.customValue ?? field.value ?? fallback
    : field.mode === "dynamic"
      ? field.dynamicValue || field.value || fallback
      : fallback;
  const resolvedValue = isCustom ? rawValue : previewMergeFields(rawValue);
  const value = amount && isCustom && resolvedValue !== "" && Number.isFinite(Number(resolvedValue))
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(resolvedValue))
    : resolvedValue;
  return {
    label: previewMergeFields(field.label || label),
    value,
  };
}

function compileBackendWidget(item) {
  const fields = item.props?.custom_fields || {};
  const customFields = Object.entries(fields)
    .filter(([key, field]) => key.startsWith("custom_") && field && typeof field === "object")
    .map(([, field]) => {
      const label = previewMergeFields(field.label || "Custom field");
      const rawValue = field.mode === "custom"
        ? field.customValue ?? field.value ?? ""
        : field.dynamicValue || field.value || "";
      const displayValue = field.mode === "custom" && field.type === "currency" && Number.isFinite(Number(rawValue))
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(rawValue))
        : rawValue;
      const value = field.mode === "custom" ? displayValue : previewMergeFields(rawValue);
      return value === ""
        ? ""
        : `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:4px;font-size:12px"><span>${escapePreviewHtml(label)}</span><span>${escapePreviewHtml(value)}</span></div>`;
    })
    .join("");
  return `${compileBackendWidgetContent(item)}${customFields ? `<div style="margin-top:8px">${customFields}</div>` : ""}`;
}

function compileBackendWidgetContent(item) {
  const type = item.blockType;
  const props = item.props || {};
  const children = Array.isArray(item.children) ? item.children : [];
  const childHtml = children.map(compileBackendWidget).join("");
  const table = (columns, rows, columnWidths) => `<table style="width:100%;border-collapse:collapse;font-size:12px">${columnWidths ? `<colgroup>${columnWidths.map((width) => `<col style="width:${width}">`).join("")}</colgroup>` : ""}<thead><tr>${columns.map((column) => `<th style="padding:6px;border-bottom:2px solid #cbd5e1;text-align:left">${escapePreviewHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td style="padding:6px;border-bottom:1px solid #e2e8f0">${escapePreviewHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const charges = [
    ["Moving labor", "5", "$185.00", "$925.00"],
    ["Moving truck", "1", "$350.00", "$350.00"],
    ["Packing materials", "1", "$200.00", "$200.00"],
  ];
  switch (type) {
    case "heading": {
      const level = Math.min(4, Math.max(1, Number(props.level) || 2));
      return `<h${level} style="text-align:${safeAlignment(props.align)}">${escapePreviewHtml(previewMergeFields(props.text || "Heading"))}</h${level}>`;
    }
    case "header": {
      const customFields = props.custom_fields || {};
      const configuredValue = (key, fallback) => {
        const field = customFields[key];
        if (field?.mode === "custom") return field.customValue ?? field.value ?? fallback;
        return previewMergeFields(field?.dynamicValue || field?.value || fallback);
      };
      const company = configuredValue("company_name", props.company_name || "{{company.name}}");
      const title = configuredValue("document_title", props.title || "Estimate");
      const number = configuredValue("document_number", props.document_number || "{{estimate.number}}");
      return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:2px solid #e2e8f0;padding-bottom:16px"><div style="min-width:0;flex:1;font-size:20px;font-weight:700;color:#1e293b">${escapePreviewHtml(company)}</div><div style="min-width:0;text-align:right"><h1 style="margin:0;font-size:18px;font-weight:700;color:#1d4ed8">${escapePreviewHtml(title)}</h1>${number ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b">${escapePreviewHtml(number)}</p>` : ""}</div></div>`;
    }
    case "text":
      return sanitizeHtml(previewMergeFields(props.html || "")).cleanHtml;
    case "terms":
      return `${props.title ? `<h3>${escapePreviewHtml(previewMergeFields(props.title))}</h3>` : ""}${sanitizeHtml(previewMergeFields(props.html || "")).cleanHtml}`;
    case "table":
      return table(props.columns || [], props.rows || []);
    case "variable": {
      const configured = configuredField(props, "merge_field", props.label || "", `{{${props.token || ""}${props.format ? `|${props.format}` : ""}}}`);
      return `<p>${configured.label ? `${escapePreviewHtml(configured.label)}: ` : ""}${escapePreviewHtml(configured.value)}</p>`;
    }
    case "divider": {
      const style = ["solid", "dashed", "dotted", "double", "none"].includes(props.style) ? props.style : "solid";
      const color = /^#[\da-f]{3,8}$/i.test(props.color || "") ? props.color : "#cbd5e1";
      return `<hr style="border:0;border-top:1px ${style} ${color}">`;
    }
    case "spacer":
      return `<div style="height:${Math.max(4, Number(props.height) || 24)}px"></div>`;
    case "page_break":
      return '<div style="page-break-after:always"></div>';
    case "columns": {
      const count = Math.min(4, Math.max(2, Number(props.count) || 2));
      const columns = Array.from({ length: count }, (_, index) => children
        .filter((child) => Number(child.column || 0) === index)
        .map(compileBackendWidget).join(""));
      return `<div style="display:grid;grid-template-columns:repeat(${count},minmax(0,1fr));gap:${Math.max(0, Number(props.gap) || 0)}px">${columns.map((column) => `<div>${column}</div>`).join("")}</div>`;
    }
    case "conditional":
    case "repeater":
      return `<div>${childHtml}</div>`;
    case "image": {
      const alt = configuredField(props, "image_alt", "Alternative text", props.alt || "");
      const caption = configuredField(props, "image_caption", "", "");
      return `<div style="padding:12px;border:1px dashed #cbd5e1;text-align:center;color:#64748b">Uploaded image asset ${escapePreviewHtml(props.asset_id || "(not selected)")}${alt.value ? ` — ${escapePreviewHtml(alt.value)}` : ""}${caption.value ? `<p>${escapePreviewHtml(caption.value)}</p>` : ""}</div>`;
    }
    case "signature":
    case "initial":
      return `<div style="max-width:360px;margin:16px 0"><div>${escapePreviewHtml(props.label || type)}${props.required ? " *" : ""}</div><div style="height:32px;border-bottom:1px solid #64748b"></div><small>Signer: ${escapePreviewHtml(props.signer_role || "customer")}</small></div>`;
    case "form_field":
      return `<label style="display:block;margin:8px 0">${escapePreviewHtml(props.label || "Enter a value")}${props.required ? " *" : ""}<div style="height:30px;border:1px solid #cbd5e1;margin-top:4px"></div></label>`;
    case "button":
      return `<p style="text-align:${safeAlignment(props.align)}"><span style="display:inline-block;padding:10px 18px;border-radius:6px;background:#1e40af;color:white">${escapePreviewHtml(previewMergeFields(props.label || "Continue"))}</span></p>`;
    case "move_details": {
      const rows = [
        ...(props.show_dates !== false ? [configuredField(props, "move_date", "Move date", "June 15, 2026")] : []),
        ...(props.show_move_size !== false ? [configuredField(props, "move_size", "Move size", "3 bedroom home")] : []),
        ...(props.show_stops !== false ? [
          configuredField(props, "origin", "From", "123 Main Street, Vancouver, BC"),
          configuredField(props, "destination", "To", "456 Oak Avenue, Burnaby, BC"),
        ] : []),
      ];
      return table([configuredField(props, "section_title", "Move details", "").label, ""],
        rows.map(({ label, value }) => [label, value]), ["20%", "80%"]);
    }
    case "crew_trucks":
      return table(["Crew / vehicle", "Assignment"], [
        ...(props.show_names !== false ? [["Crew lead", "Morgan Chen"], ["Mover", "Taylor Rivera"], ["Mover", "Riley Singh"]] : []),
        ...(props.show_trucks !== false ? [["Truck", "Truck 12 · 26 ft"]] : []),
      ]);
    case "charges":
    case "line_items":
      return table(
        [
          configuredField(props, "description_label", "Description", "Description").label,
          ...(props.show_quantity !== false ? [configuredField(props, "quantity_label", "Qty", "Qty").label] : []),
          configuredField(props, "rate_label", "Rate", "Rate").label,
          configuredField(props, "amount_label", "Amount", "Amount").label,
        ],
        charges.map(([name, quantity, rate, total], index) => {
          const customRate = props.custom_fields?.[`charge_${index}_unit_price`];
          const rawRate = Number(customRate?.customValue ?? customRate?.value ?? rate.replace(/[$,]/g, ""));
          const displayRate = configuredField(
            props,
            `charge_${index}_unit_price`,
            "Rate",
            rate,
            { amount: true },
          ).value;
          const displayName = configuredField(
            props,
            `charge_${index}_description`,
            "Description",
            name,
          ).value;
          const calculatedTotal = customRate?.mode === "custom" && Number.isFinite(rawRate)
            ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(rawRate * Number(quantity))
            : total;
          return [
            displayName,
            ...(props.show_quantity !== false ? [quantity] : []),
            displayRate,
            calculatedTotal,
          ];
        }),
      );
    case "estimate_summary":
    case "totals": {
      const estimate = type === "estimate_summary";
      const values = estimate
        ? [
          configuredField(props, "subtotal", "Subtotal", "$1,475.00", { amount: true }),
          ...(props.show_discount !== false ? [configuredField(props, "discount", "Discount", "$50.00", { amount: true })] : []),
          ...(props.show_tax !== false ? [configuredField(props, "tax", "Tax", "$77.63", { amount: true })] : []),
          configuredField(props, "total", "Estimate total", "$1,502.63", { amount: true }),
          ...(props.show_deposit ? [configuredField(props, "deposit", "Deposit due", "$300.00", { amount: true })] : []),
        ]
        : [
          configuredField(props, "subtotal", "Subtotal", "$1,475.00", { amount: true }),
          ...(props.show_discount !== false ? [configuredField(props, "discount", "Discount", "$50.00", { amount: true })] : []),
          ...(props.show_tax !== false ? [configuredField(props, "tax", "Tax", "$77.63", { amount: true })] : []),
          configuredField(props, "total", "Invoice total", "$1,502.63", { amount: true }),
          ...(props.show_balance !== false ? [configuredField(props, "balance", "Balance due", "$1,202.63", { amount: true })] : []),
        ];
      return table([
        configuredField(props, "section_title", estimate ? "Estimate summary" : "Invoice totals", "").label,
        "Amount",
      ], values.map(({ label, value }) => [label, value]));
    }
    case "inventory":
      return props.mode === "detailed"
        ? table(["Room", "Item", "Qty", "Volume", "Weight"], [["Living room", "Sofa", "1", "90 cu ft", "180 lbs"], ["Bedroom", "Queen bed", "1", "65 cu ft", "140 lbs"]])
        : "<p>Inventory summary · 2 rooms · 155 cu ft · 320 lbs</p>";
    case "payment_history":
      return table(["Date", ...(props.show_method !== false ? ["Method"] : []), "Amount"], [["June 15, 2026", ...(props.show_method !== false ? ["Visa ending 4242"] : []), "$300.00"]]);
    case "options":
      return "<fieldset><legend>Choose a package</legend><p>◯ Standard Move <span style=\"float:right\">$1,502.63</span></p><p>◯ Full-Service Move <span style=\"float:right\">$1,852.63</span></p></fieldset>";
    case "payment":
      return `<div><p>${props.amount_source === "balance" ? "Balance due: $1,202.63" : "Deposit due: $300.00"}</p><button disabled>${escapePreviewHtml(props.label || "Pay now")}</button></div>`;
    case "clause":
      return `<p>Saved clause ${escapePreviewHtml(props.block_id || "(not selected)")}</p>`;
    default:
      return "";
  }
}

export function compileDocumentBodyToHtml(doc) {
  return (doc?.items || []).filter((item) => item.visible !== false).map(compileItemToHtml).join('\n');
}

export function compileDocumentToHtml(doc, mode = "estimate", pageSize = "A4", orientation = "Portrait") {
  if (!doc) return "";

  const effPageSize = doc.settings?.pageSize || pageSize || "A4";
  const effOrientation = doc.settings?.orientation || orientation || "Portrait";
  const isLandscape = String(effOrientation).toLowerCase() === "landscape";
  const pageBaseWidth = effPageSize === "Letter" ? 816 : effPageSize === "Legal" ? 816 : 794;
  const pageBaseHeight = effPageSize === "Letter" ? 1056 : effPageSize === "Legal" ? 1344 : 1123;
  const targetWidth = isLandscape ? pageBaseHeight : pageBaseWidth;

  const bodyItemsHtml = compileDocumentBodyToHtml(doc);

  const pageCss = `
    @page {
      size: ${effPageSize} ${effOrientation.toLowerCase()};
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0b2948;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${doc.settings?.fontSize ? `${doc.settings.fontSize}px` : "13px"};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      padding: 12mm 14mm;
    }
    .kargoflow-doc-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }
    .kargoflow-block {
      margin-bottom: 20px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }
    .kargoflow-block:not(.kargoflow-html-block) {
      word-break: break-word;
      overflow-wrap: anywhere;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .kargoflow-block:not(.kargoflow-html-block) table {
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      box-sizing: border-box;
    }
    .kargoflow-block:not(.kargoflow-html-block) th,
    .kargoflow-block:not(.kargoflow-html-block) td {
      padding: 8px 12px;
      box-sizing: border-box;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    @media print {
      body {
        padding: 10mm 12mm;
      }
      .no-print {
        display: none !important;
      }
    }
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title></title>
  <style>
    ${pageCss}
  </style>
</head>
<body>
  <div class="kargoflow-doc-container">
    ${bodyItemsHtml}
  </div>
</body>
</html>`;
}

function compileItemToHtml(item) {
  if (!item) return "";

  if (item.type === "builder_block") {
    return `<div class="kargoflow-block">${compileBackendWidget(item)}</div>`;
  }

  if (item.type === "html") {
    if (item.globalEmailBody && !item.cssContent) return item.htmlContent ?? item.content ?? '';
    const scopeClass = `html-doc-${item.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const scopedStyle = item.cssContent
      ? `<style>${scopeCss(item.cssContent, scopeClass)}</style>`
      : "";
    return `<div class="kargoflow-block kargoflow-html-block ${scopeClass}">${scopedStyle}${item.htmlContent || item.content || ""}</div>`;
  }

  if (item.type === "header") {
    const configuredValue = (key, fieldId, fallback) => {
      const configured = item.customFields?.[key];
      const value = configured?.mode === "custom"
        ? configured.customValue ?? configured.value ?? fallback
        : configured?.dynamicValue || configured?.value || item.fields?.find((field) => field.id === fieldId)?.value || fallback;
      return escapePreviewHtml(previewMergeFields(value));
    };
    const titleField = configuredValue("document_title", "estimateTitle", item.label || "Estimate");
    const companyField = configuredValue("company_name", "companyName", "");
    const numberField = configuredValue("document_number", "estimateNumber", "");

    return `
      <div class="kargoflow-block" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px;">
        <div>
          <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #0b2948;">${companyField}</h2>
        </div>
        <div style="text-align: right;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #0284c7;">${titleField}</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">${numberField}</p>
        </div>
      </div>
    `;
  }

  if (item.type === "meta" || item.type === "shipment") {
    const fieldRows = (item.fields || [])
      .filter((f) => f.visible !== false)
      .map(
        (f) =>
          `<tr><td style="width: 35%; font-weight: 600; color: #64748b; font-size: 12px;">${f.label}:</td><td style="color: #0b2948; font-size: 13px;">${f.value}</td></tr>`
      )
      .join("");

    return `
      <div class="kargoflow-block" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #0284c7;">${item.label}</h4>
        <table style="width: 100%;">
          ${fieldRows}
        </table>
      </div>
    `;
  }

  if (item.type === "charges") {
    const cols = (item.columns || []).filter((c) => c.visible !== false);
    const headers = cols
      .map(
        (c) =>
          `<th style="text-align: ${c.align || "left"}; background: #f8fafc; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: 700; font-size: 11px; text-transform: uppercase; word-break: break-word; overflow-wrap: anywhere; width: ${c.width ? c.width + '%' : 'auto'};">${c.label}</th>`
      )
      .join("");

    const rows = (item.rows || [])
      .map((r) => {
        const cells = cols
          .map(
            (c) =>
              `<td style="text-align: ${c.align || "left"}; border-bottom: 1px solid #e2e8f0; font-size: 12px; word-break: break-word; overflow-wrap: anywhere;">${r[c.key] || ""}</td>`
          )
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const tableFontSize = item.style?.fontSize ? `font-size: ${item.style.fontSize}px;` : "";
    return `
      <div class="kargoflow-block">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #0b2948;">${item.label}</h4>
        <table style="border: 1px solid #e2e8f0; width: 100%; table-layout: fixed; border-collapse: collapse; ${tableFontSize}">
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  if (item.type === "totals") {
    const totalsFontSize = item.style?.fontSize ? `font-size: ${item.style.fontSize}px;` : "";
    const fieldRows = (item.fields || [])
      .filter((f) => f.visible !== false)
      .map(
        (f) =>
          `<tr><td style="text-align: right; font-weight: 600; font-size: 12px; padding: 4px 8px; word-break: break-word;">${f.label}:</td><td style="text-align: right; font-size: 13px; font-weight: 700; padding: 4px 8px; word-break: break-word;">${f.value}</td></tr>`
      )
      .join("");

    return `
      <div class="kargoflow-block" style="display: flex; justify-content: flex-end; ${totalsFontSize}">
        <table style="width: auto; min-width: 280px; max-width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
          ${fieldRows}
        </table>
      </div>
    `;
  }

  if (item.type === "terms" || item.type === "notes") {
    const notesFontSize = item.style?.fontSize ? `${item.style.fontSize}px` : "12px";
    return `
      <div class="kargoflow-block" style="border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: ${notesFontSize}; color: #475569; width: 100%; max-width: 100%; box-sizing: border-box; word-break: break-word; overflow-wrap: anywhere;">
        <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #0b2948;">${item.label || "Notes"}</h4>
        <div style="margin: 0; line-height: 1.6; word-break: break-word; overflow-wrap: anywhere; max-width: 100%;">${item.content || ""}</div>
      </div>
    `;
  }

  if (item.type === "image") {
    const imgSrc = item.image?.src || item.content || "";
    const imgWidth = item.image?.width || 80;
    const imgAlign = item.image?.align || "left";
    const justify =
      imgAlign === "center" ? "center" : imgAlign === "right" ? "flex-end" : "flex-start";

    if (!imgSrc) return "";
    return `
      <div class="kargoflow-block" style="display: flex; justify-content: ${justify}; margin: 12px 0;">
        <img src="${imgSrc}" alt="${item.label || "Document Image"}" style="width: ${imgWidth}%; max-width: 100%; height: auto; border-radius: 4px;" />
      </div>
    `;
  }

  if (item.type === "footer") {
    const footerFontSize = item.style?.fontSize ? `${item.style.fontSize}px` : "11px";
    return `
      <div class="kargoflow-block" style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px; display: flex; justify-content: space-between; font-size: ${footerFontSize}; color: #64748b;">
        <div>${item.content || item.label || "Thank you for your business."}</div>
        <div>Page 1 of 1</div>
      </div>
    `;
  }

  if (item.type === "table" && item.tableRows) {
    const tableSettings = item.tableSettings || {};
    const borderWidth = tableSettings.borderWidth ?? 1;
    const borderStyle = tableSettings.borderStyle || "solid";
    const borderColor = tableSettings.borderColor || "#cbd5e1";
    const borderCss = borderStyle === "none" ? "none" : `${borderWidth}px ${borderStyle} ${borderColor}`;
    const cellPadding = tableSettings.cellPadding ?? 8;

    const rowsHtml = item.tableRows
      .map((r) => {
        const cellsHtml = (r.cells || [])
          .map((c) => {
            const rSpan = c.rowSpan ? ` rowspan="${c.rowSpan}"` : "";
            const cSpan = c.colSpan ? ` colspan="${c.colSpan}"` : "";
            const bg = c.backgroundColor && c.backgroundColor !== "transparent" ? `background-color: ${c.backgroundColor};` : "";
            const color = c.color ? `color: ${c.color};` : "";
            const fontSize = c.fontSize ? `font-size: ${c.fontSize}px;` : "";
            const fontFamily = c.fontFamily ? `font-family: ${c.fontFamily};` : "";
            const weight = c.bold ? "font-weight: 700;" : "";
            const fontStyle = c.italic ? "font-style: italic;" : "";
            const textDecor = [c.underline ? "underline" : "", c.strikethrough ? "line-through" : ""].filter(Boolean).join(" ");
            const decorCss = textDecor ? `text-decoration: ${textDecor};` : "";
            const align = c.textAlign ? `text-align: ${c.textAlign};` : "text-align: left;";
            const vAlign = c.verticalAlign ? `vertical-align: ${c.verticalAlign};` : "vertical-align: middle;";

            // Check for subGrid
            let contentHtml = c.content || "";
            if (c.subGrid && Array.isArray(c.subGrid.cells)) {
              const sgRows = c.subGrid.rows || 1;
              const sgCols = c.subGrid.cols || 1;
              const sgCells = c.subGrid.cells.map((sc) => {
                const scBg = sc.backgroundColor ? `background-color: ${sc.backgroundColor};` : "";
                const scColor = sc.color ? `color: ${sc.color};` : "";
                const scFontSize = (sc.fontSize || c.fontSize) ? `font-size: ${sc.fontSize || c.fontSize}px;` : "";
                const scFontFamily = (sc.fontFamily || c.fontFamily) ? `font-family: ${sc.fontFamily || c.fontFamily};` : "";
                const scWeight = sc.bold ? "font-weight: 700;" : "";
                return `<div style="border: 1px dashed #cbd5e1; padding: 4px; ${scBg} ${scColor} ${scFontSize} ${scFontFamily} ${scWeight}">${sc.content || ""}</div>`;
              }).join("");
              contentHtml = `<div style="display: grid; grid-template-rows: repeat(${sgRows}, 1fr); grid-template-columns: repeat(${sgCols}, 1fr); gap: 2px;">${sgCells}</div>`;
            }

            return `<td${rSpan}${cSpan} style="border: ${borderCss}; padding: ${cellPadding}px; ${align} ${vAlign} ${bg} ${color} ${fontSize} ${fontFamily} ${weight} ${fontStyle} ${decorCss} word-break: break-word; overflow-wrap: anywhere;">${contentHtml}</td>`;
          })
          .join("");
        return `<tr>${cellsHtml}</tr>`;
      })
      .join("");

    return `
      <div class="kargoflow-block">
        <table style="border: ${borderCss}; width: 100%; table-layout: fixed; border-collapse: collapse;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  if (item.type === "heading") {
    const headingFontSize = item.style?.fontSize ? `${item.style.fontSize}px` : "20px";
    const headingFontWeight = item.style?.bold ? "700" : (item.style?.fontWeight || "700");
    const headingColor = item.style?.color || "#0b2948";
    const headingFamily = item.style?.fontFamily ? `font-family: ${item.style.fontFamily};` : "";
    const headingAlign = item.style?.textAlign ? `text-align: ${item.style.textAlign};` : "";
    return `
      <div class="kargoflow-block">
        <h2 style="margin: 0; font-size: ${headingFontSize}; font-weight: ${headingFontWeight}; color: ${headingColor}; ${headingFamily} ${headingAlign}">${item.content || item.label || ""}</h2>
      </div>
    `;
  }

  if (item.type === "text") {
    const textFontSize = item.style?.fontSize ? `${item.style.fontSize}px` : "13px";
    const textFontWeight = item.style?.bold ? "700" : (item.style?.fontWeight || "normal");
    const textColor = item.style?.color || "#334155";
    const textLineHeight = item.style?.lineHeight || "1.6";
    const textFamily = item.style?.fontFamily ? `font-family: ${item.style.fontFamily};` : "";
    const textAlign = item.style?.textAlign ? `text-align: ${item.style.textAlign};` : "";
    return `
      <div class="kargoflow-block" style="font-size: ${textFontSize}; font-weight: ${textFontWeight}; color: ${textColor}; line-height: ${textLineHeight}; ${textFamily} ${textAlign}">
        ${item.content || ""}
      </div>
    `;
  }

  const fallbackFontSize = item.style?.fontSize ? `font-size: ${item.style.fontSize}px;` : "";
  const fallbackColor = item.style?.color ? `color: ${item.style.color};` : "";
  const fallbackFamily = item.style?.fontFamily ? `font-family: ${item.style.fontFamily};` : "";
  return `<div class="kargoflow-block" style="${fallbackFontSize} ${fallbackColor} ${fallbackFamily}">${item.content || ""}</div>`;
}
