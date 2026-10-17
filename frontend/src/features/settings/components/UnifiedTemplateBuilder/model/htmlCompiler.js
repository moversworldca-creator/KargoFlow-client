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
      word-break: break-word;
      overflow-wrap: anywhere;
      page-break-inside: avoid;
      break-inside: avoid;
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
