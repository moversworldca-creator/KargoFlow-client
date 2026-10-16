/**
 * Legacy HTML Parser
 * Converts stored HTML documents or legacy block-separated strings into
 * the Unified Template Builder JSON model.
 */

import { createInitialDocument, createHtmlWidget } from "./templateModel";

export function parseLegacyHtmlToDoc(htmlContent = "", mode = "estimate") {
  const initial = createInitialDocument(mode);
  if (!htmlContent || typeof htmlContent !== "string") {
    return initial;
  }

  // If already contains JSON data embedded
  try {
    const parsed = JSON.parse(htmlContent);
    if (parsed && typeof parsed === "object" && (parsed.version === 2 || Array.isArray(parsed.items))) {
      return parsed;
    }
  } catch {
    // Not raw JSON, parse as HTML
  }

  // Fallback: encapsulate HTML in a custom HTML widget
  const htmlItem = createHtmlWidget(htmlContent, "", "Imported Template Content");
  return {
    ...initial,
    name: "Imported Document",
    items: [htmlItem],
    pages: [{ id: "page-1", name: "Page 1", items: [htmlItem] }],
  };
}
