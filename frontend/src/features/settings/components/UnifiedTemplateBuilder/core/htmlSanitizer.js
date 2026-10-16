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
      <h1 class="company-name">KargoFlow Moving & Logistics</h1>
      <p class="company-tagline">Licensed & Insured Household Goods Carriage</p>
      <p class="company-contact">info@kargoflow.com • +1 (800) 555-0199</p>
    </div>
    <div class="kargo-meta">
      <div class="meta-badge">OFFICIAL DOCUMENT</div>
    </div>
  </div>
</div>`;

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
.company-name {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}
.meta-badge {
  display: inline-block;
  background-color: #0284c7;
  color: #ffffff;
  font-weight: 700;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 4px;
}`;

export const HTML_SNIPPETS = [
  {
    name: "Full Estimate Template",
    description: "Complete estimate layout with header, totals, and notes",
    html: DEFAULT_SAMPLE_HTML,
    css: DEFAULT_SAMPLE_CSS,
  },
  {
    name: "Header Section",
    description: "Company branding and document reference header",
    html: `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
  <div>
    <h2 style="margin:0; font-size:20px; color:#0f172a;">KargoFlow Logistics</h2>
    <p style="margin:2px 0 0 0; font-size:12px; color:#64748b;">Licensed Moving Services</p>
  </div>
  <div style="background:#0284c7; color:#fff; font-size:12px; font-weight:700; padding:4px 12px; border-radius:4px;">
    JOB #{{job.number}}
  </div>
</div>`,
    css: "",
  },
  {
    name: "Electronic Signature Line",
    description: "Standard E-Signature pad with date and printed name",
    html: `<div style="margin-top:24px; display:grid; grid-template-columns:1fr 1fr; gap:20px;">
  <div>
    <div style="border-bottom:1px solid #94a3b8; height:36px;" data-sign="signature"></div>
    <div style="font-size:11px; color:#64748b; margin-top:4px;">Authorized Customer Signature</div>
  </div>
  <div>
    <div style="border-bottom:1px solid #94a3b8; height:36px;" data-sign="date"></div>
    <div style="font-size:11px; color:#64748b; margin-top:4px;">Date</div>
  </div>
</div>`,
    css: "",
  },
];
