/**
 * HTML Sanitization, CSS Scoping, and Snippet Utilities
 * for Unified Template Builder (React JavaScript).
 */

export function sanitizeHtml(rawHtml) {
  if (!rawHtml || typeof rawHtml !== "string") {
    return { cleanHtml: "", extractedCss: "" };
  }

  let extractedCss = "";

  // 1. Extract <style> contents and strip the style tags
  const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(rawHtml)) !== null) {
    if (match[1]) {
      extractedCss += match[1] + "\n";
    }
  }
  let workingHtml = rawHtml.replace(styleRegex, "");

  // 2. Browser environment: Use DOMParser
  if (
    typeof window !== "undefined" &&
    typeof window.DOMParser !== "undefined"
  ) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(workingHtml, "text/html");

      const dangerousTags = [
        "script",
        "noscript",
        "iframe",
        "frame",
        "frameset",
        "object",
        "embed",
        "applet",
        "meta",
        "link",
        "base",
        "form",
      ];

      dangerousTags.forEach((tag) => {
        const elements = doc.querySelectorAll(tag);
        elements.forEach((el) => el.remove());
      });

      const allElements = doc.querySelectorAll("*");
      allElements.forEach((el) => {
        const attrs = Array.from(el.attributes);
        for (const attr of attrs) {
          const attrName = attr.name.toLowerCase();
          const attrVal = attr.value.trim().toLowerCase();

          if (attrName.startsWith("on")) {
            el.removeAttribute(attr.name);
            continue;
          }

          if (
            ["href", "src", "action", "formaction", "xlink:href"].includes(
              attrName
            )
          ) {
            if (
              attrVal.startsWith("javascript:") ||
              attrVal.startsWith("vbscript:") ||
              attrVal.startsWith("data:text/html")
            ) {
              el.removeAttribute(attr.name);
              continue;
            }
          }

          if (attrName === "style") {
            if (
              attrVal.includes("expression(") ||
              attrVal.includes("javascript:") ||
              attrVal.includes("behavior:")
            ) {
              el.removeAttribute(attr.name);
            }
          }
        }
      });

      return {
        cleanHtml: doc.body.innerHTML,
        extractedCss: extractedCss.trim(),
      };
    } catch {
      // Fallback
    }
  }

  // 3. Fallback regex sanitizer
  let clean = workingHtml;
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  clean = clean.replace(/<embed\b[^>]*>/gi, "");
  clean = clean.replace(/<meta\b[^>]*>/gi, "");
  clean = clean.replace(/<link\b[^>]*>/gi, "");
  clean = clean.replace(/<base\b[^>]*>/gi, "");
  clean = clean.replace(/\s+on[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");
  clean = clean.replace(
    /\s+(href|src)\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|javascript:[^\s>]+)/gi,
    ""
  );

  return {
    cleanHtml: clean,
    extractedCss: extractedCss.trim(),
  };
}

export function scopeCss(css, scopeClass) {
  if (!css || typeof css !== "string") return "";
  const cleanCss = css.trim();
  if (!cleanCss) return "";

  const prefix = `.${scopeClass}`;
  let result = "";
  let i = 0;
  const len = cleanCss.length;

  while (i < len) {
    if (cleanCss.slice(i, i + 2) === "/*") {
      const commentEnd = cleanCss.indexOf("*/", i + 2);
      if (commentEnd === -1) break;
      i = commentEnd + 2;
      continue;
    }

    if (cleanCss[i] === "@") {
      const openBrace = cleanCss.indexOf("{", i);
      if (openBrace === -1) break;

      const atHeader = cleanCss.slice(i, openBrace).trim();

      if (atHeader.startsWith("@media") || atHeader.startsWith("@supports")) {
        let depth = 1;
        let j = openBrace + 1;
        while (j < len && depth > 0) {
          if (cleanCss[j] === "{") depth++;
          else if (cleanCss[j] === "}") depth--;
          j++;
        }
        const innerCss = cleanCss.slice(openBrace + 1, j - 1);
        const scopedInner = scopeCss(innerCss, scopeClass);
        result += `${atHeader} {\n${scopedInner}\n}\n`;
        i = j;
        continue;
      } else {
        let depth = 1;
        let j = openBrace + 1;
        while (j < len && depth > 0) {
          if (cleanCss[j] === "{") depth++;
          else if (cleanCss[j] === "}") depth--;
          j++;
        }
        result += cleanCss.slice(i, j) + "\n";
        i = j;
        continue;
      }
    }

    const openBrace = cleanCss.indexOf("{", i);
    if (openBrace === -1) break;

    const selectorChunk = cleanCss.slice(i, openBrace).trim();
    const closeBrace = cleanCss.indexOf("}", openBrace);
    if (closeBrace === -1) break;

    const declarations = cleanCss.slice(openBrace + 1, closeBrace).trim();

    if (selectorChunk) {
      const scopedSelectors = selectorChunk
        .split(",")
        .map((sel) => {
          const s = sel.trim();
          if (!s) return "";
          if (s === ":root" || s === "body" || s === "html") {
            return prefix;
          }
          if (s.startsWith(prefix)) {
            return s;
          }
          return `${prefix} ${s}`;
        })
        .filter(Boolean)
        .join(", ");

      if (scopedSelectors) {
        result += `${scopedSelectors} {\n  ${declarations}\n}\n`;
      }
    }

    i = closeBrace + 1;
  }

  return result.trim();
}

export function beautifyHtml(html) {
  if (!html) return "";
  const tab = "  ";
  const compact = html.replace(/>\s+</g, "><").trim();
  const regex = /(<\/?[a-zA-Z0-9\-]+(?:\s+[^>]*?)?>|[^<]+)/g;
  const voidTags = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);

  const tokens = Array.from(compact.matchAll(regex), (m) => m[1]);
  const lines = [];
  let indent = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token.trim()) continue;

    if (token.startsWith("</")) {
      indent = Math.max(indent - 1, 0);
      lines.push(tab.repeat(indent) + token);
      continue;
    }

    if (token.startsWith("<") && !token.startsWith("<!")) {
      const tagNameMatch = token.match(/^<([a-zA-Z0-9\-]+)/);
      const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : "";
      const isSelfClosing = token.endsWith("/>") || voidTags.has(tagName);

      if (!isSelfClosing && i + 2 < tokens.length) {
        const nextText = tokens[i + 1];
        const nextClose = tokens[i + 2];
        if (!nextText.startsWith("<") && nextClose.startsWith(`</${tagName}`)) {
          lines.push(tab.repeat(indent) + `${token}${nextText}${nextClose}`);
          i += 2;
          continue;
        }
      }

      lines.push(tab.repeat(indent) + token);
      if (!isSelfClosing) indent++;
      continue;
    }

    lines.push(tab.repeat(indent) + token);
  }

  return lines.join("\n");
}

export const DEFAULT_SAMPLE_HTML = `<div class="kargo-estimate">
  <div class="kargo-header">
    <div class="kargo-brand">
      <h1 class="company-name">KargoFlow Logistics</h1>
      <p class="company-tagline">Global Freight & Supply Chain Solutions</p>
      <p class="company-contact">742 Evergreen Terrace, Suite 100 • contact@kargoflow.com • +1 (800) 555-0199</p>
    </div>
    <div class="kargo-meta">
      <div class="meta-badge">ESTIMATE</div>
      <table class="meta-table">
        <tr><td><strong>Estimate #:</strong></td><td>EST-2026-0842</td></tr>
        <tr><td><strong>Date:</strong></td><td>October 15, 2026</td></tr>
        <tr><td><strong>Valid Until:</strong></td><td>November 15, 2026</td></tr>
        <tr><td><strong>Currency:</strong></td><td>USD ($)</td></tr>
      </table>
    </div>
  </div>

  <hr class="kargo-divider" />

  <div class="kargo-parties">
    <div class="party-card">
      <h3 class="party-title">PREPARED FOR:</h3>
      <p class="party-name"><strong>Acme International Corp</strong></p>
      <p>Attn: Logistics Department</p>
      <p>1200 Industrial Parkway, Dock 4</p>
      <p>Chicago, IL 60601, USA</p>
    </div>
    <div class="party-card">
      <h3 class="party-title">SHIPMENT DETAILS:</h3>
      <p><strong>Route:</strong> Port of Los Angeles → Chicago Hub</p>
      <p><strong>Mode:</strong> Intermodal Freight (FCL)</p>
      <p><strong>Commodity:</strong> Consumer Electronics</p>
      <p><strong>Weight / Vol:</strong> 18,400 kg / 42.5 CBM</p>
    </div>
  </div>

  <table class="kargo-table">
    <thead>
      <tr>
        <th style="width: 45%;">Description of Service</th>
        <th style="width: 15%; text-align: center;">Qty</th>
        <th style="width: 20%; text-align: right;">Unit Rate</th>
        <th style="width: 20%; text-align: right;">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Ocean Freight (40ft High Cube Container)</strong><br><small>Los Angeles Terminal to Chicago Rail Ramp</small></td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">$3,450.00</td>
        <td style="text-align: right;">$3,450.00</td>
      </tr>
      <tr>
        <td><strong>Bunker Adjustment Factor (BAF)</strong><br><small>Standard marine fuel surcharge index</small></td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">$420.00</td>
        <td style="text-align: right;">$420.00</td>
      </tr>
      <tr>
        <td><strong>Terminal Handling Charges (THC)</strong><br><small>Origin port handling and container inspection</small></td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">$380.00</td>
        <td style="text-align: right;">$380.00</td>
      </tr>
      <tr>
        <td><strong>Customs Clearance & Documentation</strong><br><small>Automated manifest filing and duty processing</small></td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">$175.00</td>
        <td style="text-align: right;">$175.00</td>
      </tr>
    </tbody>
  </table>

  <div class="kargo-summary">
    <div class="summary-notes">
      <h4>Terms & Conditions:</h4>
      <ul>
        <li>Rates are based on standard carrier tariff rules and subject to space availability.</li>
        <li>Payment terms: Net 30 days from date of vessel departure.</li>
        <li>Storage and demurrage fees apply if pickup exceeds 48 hours after arrival.</li>
      </ul>
    </div>
    <div class="summary-totals">
      <div class="total-row"><span>Subtotal:</span><span>$4,425.00</span></div>
      <div class="total-row"><span>Port & Fuel Tax (5%):</span><span>$221.25</span></div>
      <div class="total-row grand-total"><span>Grand Total:</span><span>$4,646.25</span></div>
    </div>
  </div>

  <div class="kargo-signature">
    <div class="sign-block">
      <p class="sign-title">Authorized Representative:</p>
      <div class="sign-line"></div>
      <p class="sign-name">Marcus Vance, Director of Freight Operations</p>
    </div>
    <div class="sign-block">
      <p class="sign-title">Customer Acceptance:</p>
      <div class="sign-line"></div>
      <p class="sign-name">Signature & Date</p>
    </div>
  </div>
</div>`;

/**
 * Standard Starter Freight Estimate Scoped CSS
 */
export const DEFAULT_SAMPLE_CSS = `.kargo-estimate {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  line-height: 1.5;
  font-size: 13px;
}
.kargo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.kargo-brand .company-name {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}
.kargo-brand .company-tagline {
  font-size: 12px;
  color: #0284c7;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 6px 0;
}
.kargo-brand .company-contact {
  font-size: 11px;
  color: #64748b;
  margin: 0;
}
.kargo-meta {
  text-align: right;
}
.kargo-meta .meta-badge {
  display: inline-block;
  background-color: #0284c7;
  color: #ffffff;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 1px;
  padding: 4px 12px;
  border-radius: 4px;
  margin-bottom: 8px;
}
.meta-table {
  font-size: 12px;
  margin-left: auto;
  border-collapse: collapse;
}
.meta-table td {
  padding: 2px 6px;
  text-align: right;
}
.kargo-divider {
  border: none;
  border-top: 2px solid #e2e8f0;
  margin: 16px 0;
}
.kargo-parties {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}
.party-card {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px 14px;
}
.party-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #64748b;
  margin: 0 0 6px 0;
}
.party-name {
  color: #0f172a;
  font-size: 14px;
  margin: 0 0 4px 0;
}
.party-card p {
  margin: 2px 0;
  font-size: 12px;
}
.kargo-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
}
.kargo-table th {
  background-color: #0f172a;
  color: #ffffff;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 12px;
}
.kargo-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 12px;
}
.kargo-table tbody tr:nth-child(even) {
  background-color: #f8fafc;
}
.kargo-summary {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}
.summary-notes {
  flex: 1.2;
  font-size: 11px;
  color: #475569;
}
.summary-notes h4 {
  font-size: 12px;
  margin: 0 0 6px 0;
  color: #0f172a;
}
.summary-notes ul {
  margin: 0;
  padding-left: 18px;
}
.summary-notes li {
  margin-bottom: 4px;
}
.summary-totals {
  flex: 0.8;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px 16px;
}
.total-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
}
.total-row.grand-total {
  border-top: 2px solid #0f172a;
  margin-top: 8px;
  padding-top: 8px;
  font-weight: 700;
  font-size: 15px;
  color: #0284c7;
}
.kargo-signature {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  margin-top: 30px;
}
.sign-block {
  flex: 1;
}
.sign-title {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin: 0 0 40px 0;
}
.sign-line {
  border-bottom: 1px solid #94a3b8;
  margin-bottom: 6px;
}
.sign-name {
  font-size: 11px;
  color: #0f172a;
  margin: 0;
}`;

/**
 * Common estimate snippet library
 */
export const HTML_SNIPPETS = [
  {
    name: "Full Estimate Template",
    description:
      "Complete professional freight estimate with header, table, notes & totals",
    html: DEFAULT_SAMPLE_HTML,
    css: DEFAULT_SAMPLE_CSS,
  },
  {
    name: "Estimate Header",
    description: "Company logo, contact details, and estimate reference badge",
    html: `<div class="estimate-header-snippet" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
  <div>
    <h2 style="margin:0 0 4px 0; font-size:20px; color:#0f172a; font-weight:700;">KargoFlow Logistics</h2>
    <p style="margin:0; font-size:12px; color:#64748b;">Global Logistics & Intermodal Freight Services</p>
  </div>
  <div style="text-align:right;">
    <span style="background:#0284c7; color:#fff; font-weight:700; font-size:11px; padding:3px 10px; border-radius:4px;">ESTIMATE</span>
    <p style="margin:6px 0 0 0; font-size:12px; color:#475569;">#EST-2026-9041 • Oct 15, 2026</p>
  </div>
</div>`,
    css: "",
  },
  {
    name: "Two-Column Info Block",
    description: "Side-by-side Shipper and Consignee cards",
    html: `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin:16px 0;">
  <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px 14px;">
    <div style="font-size:10px; font-weight:700; color:#64748b; margin-bottom:4px;">SHIPPER / ORIGIN</div>
    <div style="font-weight:700; font-size:13px; color:#0f172a;">Pacific Coast Electronics LLC</div>
    <div style="font-size:12px; color:#475569;">Pier 400, Berth 404, Los Angeles, CA 90731</div>
  </div>
  <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px 14px;">
    <div style="font-size:10px; font-weight:700; color:#64748b; margin-bottom:4px;">CONSIGNEE / DESTINATION</div>
    <div style="font-weight:700; font-size:13px; color:#0f172a;">Midwest Distribution Center</div>
    <div style="font-size:12px; color:#475569;">4500 Western Ave, Chicago, IL 60609</div>
  </div>
</div>`,
    css: "",
  },
  {
    name: "Pricing Table",
    description:
      "Styled charges breakdown table with quantity, rates, and amounts",
    html: `<table style="width:100%; border-collapse:collapse; margin:16px 0; border:1px solid #e2e8f0; font-size:12px;">
  <thead>
    <tr style="background:#0f172a; color:#fff; text-transform:uppercase; font-size:11px;">
      <th style="padding:10px 12px; text-align:left;">Service Description</th>
      <th style="padding:10px 12px; text-align:center; width:15%;">Quantity</th>
      <th style="padding:10px 12px; text-align:right; width:20%;">Rate</th>
      <th style="padding:10px 12px; text-align:right; width:20%;">Total</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:10px 12px;"><strong>Freight Drayage & Rail</strong></td>
      <td style="padding:10px 12px; text-align:center;">1 Unit</td>
      <td style="padding:10px 12px; text-align:right;">$2,100.00</td>
      <td style="padding:10px 12px; text-align:right; font-weight:600;">$2,100.00</td>
    </tr>
    <tr style="border-bottom:1px solid #e2e8f0; background:#f8fafc;">
      <td style="padding:10px 12px;"><strong>Fuel Surcharge Index</strong></td>
      <td style="padding:10px 12px; text-align:center;">1 Unit</td>
      <td style="padding:10px 12px; text-align:right;">$340.00</td>
      <td style="padding:10px 12px; text-align:right; font-weight:600;">$340.00</td>
    </tr>
  </tbody>
</table>`,
    css: "",
  },
  {
    name: "Terms & Signature",
    description: "Standard freight terms and dual signature lines",
    html: `<div style="margin-top:24px; font-size:12px; color:#475569;">
  <p style="font-weight:600; color:#0f172a; margin-bottom:4px;">Terms of Service:</p>
  <p style="margin:0 0 20px 0;">All cargo movements are subject to standard carrier liability limits and published tariffs.</p>
  <div style="display:flex; justify-content:space-between; gap:40px; margin-top:24px;">
    <div style="flex:1;">
      <div style="border-bottom:1px solid #94a3b8; height:30px;"></div>
      <p style="margin:6px 0 0 0; font-size:11px; color:#64748b;">Carrier Authorized Signature</p>
    </div>
    <div style="flex:1;">
      <div style="border-bottom:1px solid #94a3b8; height:30px;"></div>
      <p style="margin:6px 0 0 0; font-size:11px; color:#64748b;">Customer Acceptance & Date</p>
    </div>
  </div>
</div>`,
    css: "",
  },
  {
    name: "Status Badge & Pill",
    description: "Logistics status indicators (Confirmed, Pending, In Transit)",
    html: `<div style="display:flex; gap:10px; align-items:center; margin:10px 0;">
  <span style="display:inline-block; background:#dcfce7; color:#166534; font-weight:700; font-size:11px; padding:3px 10px; border-radius:12px;">CONFIRMED</span>
  <span style="display:inline-block; background:#e0f2fe; color:#0369a1; font-weight:700; font-size:11px; padding:3px 10px; border-radius:12px;">IN TRANSIT</span>
  <span style="display:inline-block; background:#fef3c7; color:#92400e; font-weight:700; font-size:11px; padding:3px 10px; border-radius:12px;">CUSTOMS REVIEW</span>
</div>`,
    css: "",
  },
];
