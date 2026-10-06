export const decodeHtmlEntities = (raw) => {
  const html = String(raw || '');
  if (!html) return '';
  if (typeof document === 'undefined') return html;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
};

export const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const hasHtmlTags = (value) => /<[a-z][\s\S]*>/i.test(String(value || ''));
const hasDocumentWrapper = (value) => /<\s*(?:!doctype|html|body|head)\b/i.test(String(value || ''));

const dedupeConsecutiveTextBlocks = (value) => {
  const parts = String(value || '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return String(value || '').trim();

  const deduped = [];
  for (const part of parts) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev === part) continue;
    deduped.push(part);
  }
  return deduped.join('\n\n');
};

const dedupeRepeatedParagraphHtml = (html) => {
  const textOnly = String(html || '').trim();
  if (!textOnly) return '';
  if (!hasHtmlTags(textOnly)) {
    return dedupeConsecutiveTextBlocks(textOnly);
  }

  const normalized = textOnly.replace(/<\/p>\s*<p\b/gi, '</p>\n\n<p');
  const parts = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return textOnly;

  const deduped = [];
  for (const part of parts) {
    const prev = deduped[deduped.length - 1];
    if (prev && stripHtml(prev) === stripHtml(part)) continue;
    deduped.push(part);
  }

  return deduped.join('\n');
};

const PREVIEW_BACKGROUND_OVERRIDE = `
  html, body, .crm-email-wrapper {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    background-color: #fff !important;
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }
  .crm-email-container {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;
  }
  .crm-email-header,
  .crm-email-body,
  .crm-email-footer {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
  .crm-email-body table,
  .crm-email-body table table {
    width: 100% !important;
    max-width: 100% !important;
    table-layout: fixed !important;
  }
  .crm-email-body td,
  .crm-email-body th,
  .crm-email-body div,
  .crm-email-body p,
  .crm-email-body h1,
  .crm-email-body h2,
  .crm-email-body h3,
  .crm-email-body h4,
  .crm-email-body h5,
  .crm-email-body h6 {
    max-width: 100% !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
  }
  .crm-email-body img {
    max-width: 100% !important;
    height: auto !important;
  }
  .crm-email-body .crm-email-logo,
  .crm-email-body .email-header-logo img {
    display: block !important;
    width: auto !important;
    max-width: 160px !important;
    height: auto !important;
    max-height: 56px !important;
    object-fit: contain !important;
  }
  .crm-email-body .email-row-table {
    width: 100% !important;
  }
  .crm-email-body .email-column {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
  .crm-email-body .email-column-inner {
    width: 100% !important;
  }
  .crm-email-body .email-header-table {
    width: 100% !important;
  }
  .crm-email-body .email-header-cell {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    white-space: normal !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    text-align: center !important;
  }
  .crm-email-body .email-header-logo {
    margin: 0 auto 12px auto !important;
    max-width: 160px !important;
  }
`;
const PREVIEW_BACKGROUND_OVERRIDE_TAG = `<base target="_blank"/><style>${PREVIEW_BACKGROUND_OVERRIDE}</style>`;

export const resolveRenderableUrl = (value, baseUrl = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(?:https?:|data:image\/|blob:|cid:)/i.test(raw)) return raw;
  if (/^\/\//.test(raw)) {
    return `${typeof window !== 'undefined' && window.location?.protocol ? window.location.protocol : 'https:'}${raw}`;
  }
  const envApiUrl = typeof import.meta !== 'undefined' && import.meta.env ? String(import.meta.env.VITE_API_URL || '').trim() : '';
  const envApiOrigin = envApiUrl ? envApiUrl.replace(/\/api\/?$/, '') : '';
  const safeBase = String(
    baseUrl ||
    envApiOrigin ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  ).trim();
  if (!safeBase) return raw;
  try {
    return new URL(raw, safeBase).href;
  } catch {
    return raw;
  }
};

export const replaceBranchLogoUrlTokens = (value, branchLogoUrl = '') => {
  const html = String(value || '');
  const logoUrl = resolveRenderableUrl(branchLogoUrl);
  if (!html || !logoUrl) return html;
  return html.replace(/\{\{\s*branch_logo_url\s*\}\}/gi, logoUrl);
};

const normalizeBranchContext = (branchContext = '') => {
  if (typeof branchContext === 'string') {
    return {
      branchLogoUrl: branchContext,
      branchName: '',
    };
  }

  if (branchContext && typeof branchContext === 'object') {
    return {
      branchLogoUrl: String(
        branchContext.branchLogoUrl ||
        branchContext.logoUrl ||
        branchContext.effectiveLogoUrl ||
        ''
      ).trim(),
      branchName: String(
        branchContext.branchName ||
        branchContext.name ||
        branchContext.branch_name ||
        ''
      ).trim(),
    };
  }

  return { branchLogoUrl: '', branchName: '' };
};

const looksLikeStandaloneLogoText = (text, logoUrl) => {
  const trimmed = String(text || '').trim();
  if (!trimmed || !logoUrl) return false;
  if (trimmed === logoUrl) return true;
  if (trimmed === '{{branch_logo_url}}') return true;
  return false;
};

export const renderBranchLogoAsImage = (value, branchLogoUrl = '') => {
  const html = replaceBranchLogoUrlTokens(String(value || ''), branchLogoUrl);
  const logoUrl = resolveRenderableUrl(branchLogoUrl);
  if (!html || !logoUrl) return html;

  if (typeof document === 'undefined') {
    return html;
  }

  const container = document.createElement('div');
  container.innerHTML = html;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes = [];

  let node = walker.nextNode();
  while (node) {
    textNodes.push(node);
    node = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    if (!looksLikeStandaloneLogoText(textNode.nodeValue, logoUrl)) return;
    const img = document.createElement('img');
    img.src = logoUrl;
    img.alt = 'Branch logo';
    img.style.display = 'inline-block';
    img.style.border = '0';
    img.style.verticalAlign = 'middle';
    textNode.parentNode?.replaceChild(img, textNode);
  });

  return container.innerHTML;
};

export const replaceBranchPlaceholders = (value, branchContext = '') => {
  const { branchLogoUrl, branchName } = normalizeBranchContext(branchContext);
  let html = renderBranchLogoAsImage(String(value || ''), branchLogoUrl);
  if (branchName) {
    html = html.replace(/\{\{\s*branch_name\s*\}\}/gi, branchName);
  }
  return html;
};

const injectPreviewBackgroundOverride = (html) => {
  if (!hasHtmlTags(html)) return html;

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${PREVIEW_BACKGROUND_OVERRIDE_TAG}</head>`);
  }

  if (/<head\b/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${PREVIEW_BACKGROUND_OVERRIDE_TAG}`);
  }

  return `${PREVIEW_BACKGROUND_OVERRIDE_TAG}${html}`;
};

export const normalizePreviewHtml = (value, branchLogoUrl = '') => {
  const decoded = dedupeRepeatedParagraphHtml(
    replaceBranchPlaceholders(decodeHtmlEntities(value).trim(), branchLogoUrl)
  );
  if (!decoded) return '';
  if (!hasHtmlTags(decoded)) {
    return decoded;
  }

  const neutralized = decoded
    .replace(/background(?:-color)?:\s*#f6f7f9/gi, 'background:#fff')
    .replace(/background(?:-color)?:\s*#fbfbfc/gi, 'background:#fff');

  if (hasDocumentWrapper(neutralized)) {
    return injectPreviewBackgroundOverride(neutralized);
  }

  return `<!doctype html><html><head><meta charset="utf-8">${PREVIEW_BACKGROUND_OVERRIDE_TAG}</head><body style="margin:0;padding:0;background:#fff;">${neutralized}</body></html>`;
};

export const extractVisibleTextFromHtml = (html) => {
  let cleaned = decodeHtmlEntities(html);
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  cleaned = cleaned.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, ' ');
  return dedupeConsecutiveTextBlocks(stripHtml(cleaned));
};
