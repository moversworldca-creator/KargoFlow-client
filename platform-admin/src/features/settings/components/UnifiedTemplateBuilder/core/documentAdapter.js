/**
 * Bidirectional Document Adapter
 *
 * Bridges the frontend canvas document model (UnifiedTemplateBuilder)
 * with the strict backend Document specification (KargoFlow_Domain.tenant.builder.document).
 */

import { normalizeLegacyMergeFieldAliases } from "../config/variableRegistry";
import { prepareHtmlWidget } from "./htmlSanitizer";

const VALID_PAGE_SIZES = ['Letter', 'Legal', 'A4'];
const VALID_ORIENTATIONS = ['portrait', 'landscape'];
const HEADING_STYLE_KEYS = {
  fontFamily: 'font_family',
  fontSize: 'font_size',
  fontWeight: 'font_weight',
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strikethrough: 'strikethrough',
  textTransform: 'text_transform',
  letterSpacing: 'letter_spacing',
  lineHeight: 'line_height',
  color: 'color',
};

function toBackendHeadingStyle(style = {}, existing = {}) {
  const result = { ...existing };
  Object.entries(HEADING_STYLE_KEYS).forEach(([frontendKey, backendKey]) => {
    if (style[frontendKey] !== undefined) result[backendKey] = style[frontendKey];
  });
  return result;
}

function fromBackendHeadingStyle(props = {}) {
  const style = {};
  Object.entries(HEADING_STYLE_KEYS).forEach(([frontendKey, backendKey]) => {
    if (props.style?.[backendKey] !== undefined) style[frontendKey] = props.style[backendKey];
  });
  if (props.align) style.align = props.align;
  return style;
}

const BLOCK_DEFAULTS = {
  columns: () => ({ count: 2, gap: 16 }),
  spacer: () => ({ height: 24 }),
  divider: () => ({ style: 'solid', color: '#CBD5E1' }),
  page_break: () => ({}),
  conditional: (id) => ({ rule_key: `rule_${id}` }),
  repeater: (_id, kind) => ({ source: kind === 'invoice' ? 'invoice.line_items' : 'estimate.charges', empty_text: '' }),
  heading: (_id, _kind, label) => ({ text: label || 'Heading', level: 2, align: 'left' }),
  text: () => ({ html: '<p>Enter text here.</p>' }),
  image: () => ({ asset_id: '', alt: '', width: 300, align: 'center' }),
  table: () => ({ columns: ['Item', 'Details'], rows: [] }),
  variable: () => ({ token: 'company.name', format: '', label: '' }),
  clause: () => ({ block_id: '' }),
  terms: () => ({ title: 'Terms and Conditions', html: '<p>Enter terms here.</p>' }),
  button: () => ({ label: 'Continue', url: 'https://example.com', align: 'center' }),
  move_details: () => ({ show_dates: true, show_stops: true, show_move_size: true }),
  crew_trucks: () => ({ show_names: true, show_trucks: true }),
  estimate_summary: () => ({ show_discount: true, show_tax: true, show_deposit: true, show_binding_note: true }),
  charges: () => ({ group_by: 'none', show_tax: true, show_quantity: true }),
  inventory: () => ({ mode: 'summary', show_volume: true, show_weight: true }),
  line_items: () => ({ group_by: 'none', show_tax: true }),
  totals: () => ({ show_discount: true, show_tax: true, show_balance: true }),
  payment_history: () => ({ show_method: true }),
  options: () => ({ selection: 'single', required: true }),
  payment: () => ({ amount_source: 'deposit', show_qr: false, label: 'Pay now' }),
  signature: (id) => ({ field_key: `sig_${id}`, signer_role: 'customer', label: 'Customer Signature', required: true }),
  initial: (id) => ({ field_key: `initial_${id}`, signer_role: 'customer', label: 'Initials', required: true }),
  form_field: (id) => ({ field_key: `field_${id}`, signer_role: 'customer', label: 'Enter a value', required: false, field_type: 'text' }),
};

export function createBackendWidget(block, kind = 'document') {
  const id = `block_${createWidgetId()}`;
  const type = String(block?.type || '');
  const defaults = BLOCK_DEFAULTS[type]?.(id, kind, block?.label) || {};
  const children = block?.container
    ? [{ key: `${id}_child`, type: 'text', props: { html: '<p>Enter text here.</p>' } }]
    : [];
  return {
    id,
    type: 'builder_block',
    label: block?.label || type,
    blockType: type,
    props: defaults,
    condition: type === 'conditional' ? { var: 'company.name', op: 'not_empty' } : undefined,
    children,
    propsSchema: block?.props_schema || { properties: {} },
    container: Boolean(block?.container),
    interactive: Boolean(block?.interactive),
    pdfOnly: Boolean(block?.pdf_only),
    style: {},
  };
}

let backendWidgetSequence = 0;
function createWidgetId() {
  backendWidgetSequence += 1;
  return `${Date.now().toString(36)}_${backendWidgetSequence.toString(36)}`;
}

const VALID_VARIABLE_FORMATS = new Set([
  '', 'money', 'date', 'datetime', 'phone', 'upper', 'lower', 'title', 'default',
]);
const VALID_SIGNER_ROLES = new Set(['customer', 'co_customer', 'company_rep', 'crew_lead']);
const VALID_FIELD_KEY = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const REQUIRED_BLOCK_PROPS = {
  columns: ['count'],
  spacer: ['height'],
  conditional: ['rule_key'],
  repeater: ['source'],
  heading: ['text'],
  text: ['html'],
  image: ['asset_id'],
  table: ['columns'],
  variable: ['token'],
  clause: ['block_id'],
  terms: ['html'],
  button: ['label', 'url'],
  signature: ['field_key', 'signer_role'],
  initial: ['field_key', 'signer_role'],
  form_field: ['field_key', 'signer_role', 'field_type'],
};

function normalizeFieldKey(value, fallback) {
  const candidate = String(value ?? '').trim();
  if (VALID_FIELD_KEY.test(candidate)) return candidate;

  const source = candidate || String(fallback || 'signature_field');
  const sanitized = source.replace(/[^A-Za-z0-9_-]/g, '_');
  const withLetterPrefix = /^[A-Za-z]/.test(sanitized) ? sanitized : `field_${sanitized}`;
  const normalized = withLetterPrefix.slice(0, 64);
  if (VALID_FIELD_KEY.test(normalized)) return normalized;

  const sanitizedFallback = String(fallback || 'signature_field')
    .replace(/[^A-Za-z0-9_-]/g, '_');
  const fallbackWithPrefix = /^[A-Za-z]/.test(sanitizedFallback)
    ? sanitizedFallback
    : `field_${sanitizedFallback}`;
  return fallbackWithPrefix.slice(0, 64);
}

function normalizeBlockProps(type, props, key, kind, label) {
  const normalized = { ...(props || {}) };
  const defaults = BLOCK_DEFAULTS[type]?.(key, kind, label) || {};
  (REQUIRED_BLOCK_PROPS[type] || []).forEach((name) => {
    if (normalized[name] === undefined && defaults[name] !== undefined && defaults[name] !== '') {
      normalized[name] = defaults[name];
    }
  });
  const integerRanges = {
    count: [2, 4, 2],
    gap: [0, 1000, 16],
    height: [4, 400, 24],
  };
  Object.entries(integerRanges).forEach(([name, [minimum, maximum, fallback]]) => {
    if (normalized[name] === undefined) return;
    const value = Number(normalized[name]);
    const hasDefault = defaults[name] !== undefined;
    if (Number.isInteger(value) && value >= minimum && value <= maximum) normalized[name] = value;
    else if (hasDefault) normalized[name] = fallback;
    else delete normalized[name];
  });
  if (type === 'variable' && normalized.format !== undefined && !VALID_VARIABLE_FORMATS.has(normalized.format)) {
    delete normalized.format;
  }
  if (['signature', 'initial', 'form_field'].includes(type)
    && !VALID_SIGNER_ROLES.has(normalized.signer_role)) {
    normalized.signer_role = 'customer';
  }
  if (['signature', 'initial', 'form_field'].includes(type)) {
    normalized.field_key = normalizeFieldKey(normalized.field_key, `${type}_${key}`);
  }
  return normalized;
}

function toBackendBlock(item, index, kind) {
  if (item?.key && item?.props && !item.id) {
    return {
      ...item,
      props: normalizeBlockProps(item.type, item.props, item.key, kind, item.label),
      ...(Array.isArray(item.children) ? { children: item.children.map((child, childIndex) => toBackendBlock(child, childIndex, kind)) } : {}),
    };
  }
  const key = String(item.id || `b_${index + 1}`).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60);
  if (item.type === 'builder_block') {
    const props = normalizeBlockProps(item.blockType, item.props, key, kind, item.label);
    if (item.blockType === 'heading') {
      const style = toBackendHeadingStyle(item.style, props.style);
      if (Object.keys(style).length) props.style = style;
      if (item.style?.align || item.style?.textAlign) props.align = item.style.align || item.style.textAlign;
    }
    return {
      ...(item.backendBlock || {}),
      key,
      type: item.blockType,
      props,
      ...(Array.isArray(item.children)
        ? { children: item.children.map((child, childIndex) => toBackendBlock(child, childIndex, kind)) }
        : {}),
      ...(Number.isInteger(item.column) ? { column: item.column } : {}),
    };
  }

  const type = String(item.type || '').toLowerCase();
  const props = item.backendProps || {};
  const blockType = item.backendType || type;
  const legacyCustomFields = { ...(item.customFields || {}) };
  const columnFieldKeys = {
    description: 'description_label',
    quantity: 'quantity_label',
    unitPrice: 'rate_label',
    unit_price: 'rate_label',
    amount: 'amount_label',
    total: 'amount_label',
  };
  (item.columns || []).forEach((column) => {
    const fieldKey = columnFieldKeys[column.key];
    if (fieldKey && column.label) {
      legacyCustomFields[fieldKey] = { ...(legacyCustomFields[fieldKey] || {}), label: column.label };
    }
  });
  const totalFieldKeys = {
    subtotal: 'subtotal',
    discount: 'discount',
    tax: 'tax',
    grandTotal: 'total',
    depositDue: 'deposit',
    balanceDue: 'balance',
  };
  (item.fields || []).forEach((field) => {
    const fieldKey = totalFieldKeys[field.id];
    if (fieldKey && field.label) {
      legacyCustomFields[fieldKey] = { ...(legacyCustomFields[fieldKey] || {}), label: field.label };
    }
  });
  const customFieldProps = Object.keys(legacyCustomFields).length
    ? { custom_fields: legacyCustomFields }
    : {};
  if (item.backendType) {
    return {
      key,
      type: blockType,
      props: normalizeBlockProps(blockType, props, key, kind, item.label),
      ...(Array.isArray(item.backendChildren) && item.backendChildren.length
        ? { children: item.backendChildren.map((child, childIndex) => toBackendBlock(child, childIndex, kind)) }
        : {}),
      ...(Number.isInteger(item.backendColumn) ? { column: item.backendColumn } : {}),
    };
  }

  if (type === 'html') {
    const scopeClass = `html-doc-${String(item.id || `html-${index + 1}`).replace(/[^A-Za-z0-9_-]/g, '_')}`;
    const { cleanHtml, scopedCss } = prepareHtmlWidget(item, scopeClass);
    return {
      key,
      type: 'text',
      props: {
        html: `<style>${scopedCss}</style><div class="${scopeClass}">${cleanHtml}</div>`,
      },
    };
  }

  if (type === 'heading') {
    const props = {
      text: String(item.text || item.title || item.content || 'Heading'),
      level: Number(item.level) || 1,
      align: item.style?.align || item.style?.textAlign || item.align || 'left',
      ...customFieldProps,
    };
    const style = toBackendHeadingStyle(item.style);
    if (Object.keys(style).length) props.style = style;
    return { key, type, props };
  }
  if (type === 'table') return { key, type, props: { columns: item.columns || ['Item', 'Amount'], rows: item.rows || item.tableRows || [] } };
  if (type === 'divider') return { key, type, props: { style: item.style?.borderStyle || 'solid', color: item.style?.borderColor || item.color || '#CBD5E1' } };
  if (type === 'spacer') return { key, type, props: { height: Math.max(4, Math.min(400, Number(item.height) || 20)) } };
  if (type === 'signature') return {
    key,
    type,
    props: normalizeBlockProps(type, {
      field_key: item.field_key || `sig_${index + 1}`,
      signer_role: item.signer_role || 'customer',
      label: item.label || 'Customer Signature',
      required: item.required !== false,
      ...customFieldProps,
    }, key, kind, item.label),
  };
  if (type === 'charges' && ['estimate_portal', 'document'].includes(kind)) return { key, type, props: { group_by: item.group_by || 'none', show_tax: Boolean(item.show_tax), show_quantity: Boolean(item.show_quantity), ...customFieldProps } };
  if (type === 'estimate_summary' && ['estimate_portal', 'document'].includes(kind)) return { key, type, props: { show_discount: Boolean(item.show_discount), show_tax: Boolean(item.show_tax), show_deposit: Boolean(item.show_deposit), show_binding_note: Boolean(item.show_binding_note), ...customFieldProps } };
  if (type === 'move_details') return { key, type, props: { show_dates: true, show_stops: true, show_move_size: true, ...customFieldProps } };
  if (type === 'line_items' && kind === 'invoice') return { key, type, props: { group_by: item.group_by || 'none', show_tax: item.show_tax !== false, ...customFieldProps } };
  if (type === 'totals' && kind === 'invoice') return { key, type, props: { show_discount: item.show_discount !== false, show_tax: item.show_tax !== false, show_balance: item.show_balance !== false, ...customFieldProps } };
  return { key, type: 'text', props: { html: String(item.content || item.html || item.text || ''), ...customFieldProps } };
}

export function normalizePageSize(size) {
  const s = String(size || 'Letter').toLowerCase();
  if (s === 'legal') return 'Legal';
  if (s === 'a4') return 'A4';
  return 'Letter';
}

export function normalizeOrientation(ori) {
  const o = String(ori || 'portrait').toLowerCase();
  return o === 'landscape' ? 'landscape' : 'portrait';
}

/**
 * Transforms frontend builder document into backend-compliant schema.
 */
export function toBackendDocument(doc, mode = 'contract') {
  if (!doc) return null;
  doc = normalizeLegacyMergeFieldAliases(doc);

  // Determine backend kind
  let kind = 'document';
  const m = String(mode || doc.mode || '').toLowerCase();
  if (m === 'estimate' || m === 'estimate_portal') {
    kind = 'estimate_portal';
  } else if (m === 'invoice') {
    kind = 'invoice';
  }

  const rawSettings = doc.settings || {};
  const pageSize = normalizePageSize(doc.pageSize || rawSettings.pageSize || rawSettings.page_size);
  const orientation = normalizeOrientation(doc.orientation || rawSettings.orientation);

  const settings = {
    page: {
      size: pageSize,
      orientation: orientation,
      margins: { top: 40, right: 40, bottom: 40, left: 40 },
    },
    theme: {
      font_family: rawSettings.fontFamily || 'Inter',
      primary_color: rawSettings.primaryColor || '#1E40AF',
      accent_color: rawSettings.accentColor || '#F59E0B',
      logo_asset_id: null,
    },
  };

  if (kind === 'estimate_portal') {
    settings.portal = {
      allow_option_selection: true,
      require_signature: true,
      collect_deposit: true,
    };
  }

  const sections = [];
  const items = Array.isArray(doc.items) && doc.items.length > 0
    ? doc.items
    : (doc.pages && Array.isArray(doc.pages) && doc.pages[0]?.items?.length > 0
      ? doc.pages.flatMap((p) => p.items || [])
      : []);

  if (items.length > 0) {
    const grouped = new Map();
    items.forEach((item, index) => {
      const section = item.backendSection || { key: 'section_main', title: 'Main Content', page_break_before: false };
      const sectionKey = section.key || 'section_main';
      if (!grouped.has(sectionKey)) grouped.set(sectionKey, { ...section, blocks: [] });
      grouped.get(sectionKey).blocks.push(toBackendBlock(item, index, kind));
    });
    sections.push(...grouped.values());
  } else {
    // Fallback: If no structured items, use raw compiled HTML
    const htmlContent = doc.html_content || doc.body_html || '';
    const fallbackBlocks = [];
    if (htmlContent) {
      fallbackBlocks.push({
        key: 'b_content',
        type: 'text',
        props: { html: String(htmlContent) },
      });
    } else {
      fallbackBlocks.push({
        key: 'b_welcome',
        type: 'heading',
        props: { text: doc.name || 'Untitled Document', level: 1, align: 'left' },
      });
    }

    // If kind requires signature and has none, ensure a signature block for signed subtypes
    const isSignedDoc = kind === 'document' && (
      m === 'contract' || m === 'bol' || m === 'cc_authorization' ||
      m === 'cc_auth' || m === 'credit_card_authorization' || m === 'valuation_waiver'
    );
    if (isSignedDoc && !fallbackBlocks.some((b) => b.type === 'signature')) {
      fallbackBlocks.push({
        key: 'b_sig_1',
        type: 'signature',
        props: {
          field_key: 'sig_customer',
          signer_role: 'customer',
          label: 'Customer Signature',
          required: true,
        },
      });
    }

    // If kind is estimate_portal and requires estimate_summary or charges
    if (kind === 'estimate_portal') {
      fallbackBlocks.push({
        key: 'b_charges',
        type: 'charges',
        props: { group_by: 'none', show_tax: true, show_quantity: true },
      });
    }
    if (kind === 'invoice') {
      fallbackBlocks.push(
        { key: 'b_line_items', type: 'line_items', props: { group_by: 'none', show_tax: true } },
        { key: 'b_totals', type: 'totals', props: { show_discount: true, show_tax: true, show_balance: true } }
      );
    }

    sections.push({
      key: 'section_main',
      title: 'Main Content',
      page_break_before: false,
      blocks: fallbackBlocks,
    });
  }

  if (kind === 'invoice') {
    if (!sections.some((section) => section.blocks.some((block) => block.type === 'line_items'))) {
      sections[0].blocks.push({
        key: 'b_line_items',
        type: 'line_items',
        props: { group_by: 'none', show_tax: true },
      });
    }
    if (!sections.some((section) => section.blocks.some((block) => block.type === 'totals'))) {
      sections[0].blocks.push({
        key: 'b_totals',
        type: 'totals',
        props: { show_discount: true, show_tax: true, show_balance: true },
      });
    }
  }

  const rules = Array.isArray(doc.backendRules) ? [...doc.backendRules] : [];
  const addConditionalRules = (blocks) => blocks.forEach((item, index) => {
    const blockType = item.type === 'builder_block' ? item.blockType : item.type;
    const ruleKey = blockType === 'conditional' ? item.props?.rule_key : null;
    if (ruleKey) {
      const blockKey = String(item.id || item.key || `b_${index + 1}`).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60);
      const condition = item.condition || { var: 'company.name', op: 'not_empty' };
      const existingIndex = rules.findIndex((rule) => rule.key === ruleKey);
      if (existingIndex >= 0) {
        if (item.condition) rules[existingIndex] = { ...rules[existingIndex], when: condition };
      } else {
        rules.push({
          key: ruleKey,
          name: item.label || 'Conditional group',
          priority: 100,
          when: condition,
          then: [{ action: 'show', target: blockKey }],
        });
      }
    }
    if (Array.isArray(item.children)) addConditionalRules(item.children);
  });
  addConditionalRules(items);

  return {
    settings,
    header: Array.isArray(doc.backendHeader) ? doc.backendHeader : [],
    footer: Array.isArray(doc.backendFooter) ? doc.backendFooter : [],
    sections,
    rules,
    attachments: Array.isArray(doc.backendAttachments) ? doc.backendAttachments : [],
  };
}

/**
 * Transforms backend draft document into frontend builder document format.
 */
export function fromBackendDocument(backendDoc, fallbackMeta = {}) {
  if (!backendDoc) return null;
  backendDoc = normalizeLegacyMergeFieldAliases(backendDoc);

  const rawSettings = backendDoc.settings || {};
  const pageSize = normalizePageSize(rawSettings.page?.size);
  const orientation = normalizeOrientation(rawSettings.page?.orientation);

  const items = [];
  const sections = Array.isArray(backendDoc.sections) ? backendDoc.sections : [];

  sections.forEach((section) => {
    const blocks = Array.isArray(section.blocks) ? section.blocks : [];
    blocks.forEach((block) => {
      const bKey = block.key || `item_${items.length + 1}`;
      items.push({
        id: bKey,
        type: 'builder_block',
        label: block.type.replace(/_/g, ' '),
        blockType: block.type,
        props: block.props || {},
        children: Array.isArray(block.children) ? block.children : [],
        condition: (backendDoc.rules || []).find((rule) => rule.key === block.props?.rule_key)?.when,
        backendBlock: block,
        propsSchema: {},
        container: Array.isArray(block.children),
        column: block.column,
        backendSection: { ...section, blocks: undefined },
        style: block.type === 'heading' ? fromBackendHeadingStyle(block.props || {}) : {},
      });
    });
  });

  return {
    name: fallbackMeta.name || 'Untitled Document',
    mode: fallbackMeta.mode || 'contract',
    pageSize,
    orientation,
    settings: {
      pageSize,
      orientation,
      fontFamily: rawSettings.theme?.font_family || 'Inter',
      primaryColor: rawSettings.theme?.primary_color || '#1E40AF',
      accentColor: rawSettings.theme?.accent_color || '#F59E0B',
    },
    backendHeader: Array.isArray(backendDoc.header) ? backendDoc.header : [],
    backendFooter: Array.isArray(backendDoc.footer) ? backendDoc.footer : [],
    backendRules: Array.isArray(backendDoc.rules) ? backendDoc.rules : [],
    backendAttachments: Array.isArray(backendDoc.attachments) ? backendDoc.attachments : [],
    items,
    pages: [
      {
        id: 'page-1',
        name: 'Page 1',
        items,
      },
    ],
  };
}
