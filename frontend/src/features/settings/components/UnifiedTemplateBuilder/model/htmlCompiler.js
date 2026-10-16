/**
 * HTML Serialization & Export Compiler
 * Compiles internal JSON template models into clean standalone HTML
 * suitable for PDF generation, email distribution, and customer portals.
 */

import { scopeCss } from "../core/htmlSanitizer";

export function compileDocumentToHtml(doc, mode = "estimate", pageSize = "A4", orientation = "Portrait") {
  if (!doc) return "";

  const effPageSize = doc.settings?.pageSize || pageSize || "A4";
  const effOrientation = doc.settings?.orientation || orientation || "Portrait";
  const isLandscape = String(effOrientation).toLowerCase() === "landscape";
  const pageBaseWidth = effPageSize === "Letter" ? 816 : effPageSize === "Legal" ? 816 : 794;
  const pageBaseHeight = effPageSize === "Letter" ? 1056 : effPageSize === "Legal" ? 1344 : 1123;
  const targetWidth = isLandscape ? pageBaseHeight : pageBaseWidth;

  const items = doc.items || [];
  const bodyItemsHtml = items
    .filter((it) => it.visible !== false)
    .map((item) => compileItemToHtml(item))
    .join("\n");

  const pageCss = `
    @page {
      size: ${effPageSize} ${effOrientation.toLowerCase()};
      margin: 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0b2948;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .kargoflow-doc-container {
      max-width: ${targetWidth}px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }
    .kargoflow-block {
      margin-bottom: 20px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    table {
      width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      box-sizing: border-box;
    }
    th, td {
      padding: 8px 12px;
      box-sizing: border-box;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${doc.name || "Document"}</title>
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

  if (item.type === "html") {
    const scopeClass = `html-doc-${item.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const scopedStyle = item.cssContent
      ? `<style>${scopeCss(item.cssContent, scopeClass)}</style>`
      : "";
    return `<div class="kargoflow-block ${scopeClass}">${scopedStyle}${item.htmlContent || item.content || ""}</div>`;
  }

  if (item.type === "header") {
    const titleField = item.fields?.find((f) => f.id === "estimateTitle")?.value || item.label;
    const companyField = item.fields?.find((f) => f.id === "companyName")?.value || "";
    const numberField = item.fields?.find((f) => f.id === "estimateNumber")?.value || "";

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
          `<th style="text-align: ${c.align || "left"}; background: #0b2948; color: #ffffff; font-size: 11px; text-transform: uppercase; word-break: break-word; overflow-wrap: anywhere; width: ${c.width ? c.width + '%' : 'auto'};">${c.label}</th>`
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

    return `
      <div class="kargoflow-block">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #0b2948;">${item.label}</h4>
        <table style="border: 1px solid #e2e8f0; width: 100%; table-layout: fixed; border-collapse: collapse;">
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  if (item.type === "totals") {
    const fieldRows = (item.fields || [])
      .filter((f) => f.visible !== false)
      .map(
        (f) =>
          `<tr><td style="text-align: right; font-weight: 600; font-size: 12px; padding: 4px 8px; word-break: break-word;">${f.label}:</td><td style="text-align: right; font-size: 13px; font-weight: 700; padding: 4px 8px; word-break: break-word;">${f.value}</td></tr>`
      )
      .join("");

    return `
      <div class="kargoflow-block" style="display: flex; justify-content: flex-end;">
        <table style="width: auto; min-width: 280px; max-width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
          ${fieldRows}
        </table>
      </div>
    `;
  }

  if (item.type === "terms" || item.type === "notes") {
    return `
      <div class="kargoflow-block" style="border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 12px; color: #475569; width: 100%; max-width: 100%; box-sizing: border-box; word-break: break-word; overflow-wrap: anywhere;">
        <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #0b2948;">${item.label || "Notes"}</h4>
        <div style="margin: 0; line-height: 1.6; word-break: break-word; overflow-wrap: anywhere; max-width: 100%;">${item.content || ""}</div>
      </div>
    `;
  }

  if (item.type === "table" && item.tableRows) {
    const rowsHtml = item.tableRows
      .map((r) => {
        const cellsHtml = (r.cells || [])
          .map((c) => {
            const rSpan = c.rowSpan ? ` rowspan="${c.rowSpan}"` : "";
            const cSpan = c.colSpan ? ` colspan="${c.colSpan}"` : "";
            return `<td${rSpan}${cSpan} style="border: 1px solid #cbd5e1; padding: 8px; text-align: ${c.textAlign || "left"}; word-break: break-word; overflow-wrap: anywhere;">${c.content || ""}</td>`;
          })
          .join("");
        return `<tr>${cellsHtml}</tr>`;
      })
      .join("");

    return `
      <div class="kargoflow-block">
        <table style="border: 1px solid #cbd5e1; width: 100%; table-layout: fixed; border-collapse: collapse;">
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  return `<div class="kargoflow-block">${item.content || ""}</div>`;
}
