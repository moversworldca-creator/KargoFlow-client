import React, { useState, useEffect, useRef } from 'react';
import {
  Type, Image as ImageIcon, MousePointerClick, Minus, ArrowUpDown, Trash2,
  GripVertical, Settings2, Plus, Copy, X, Heading, AlignLeft, AlignCenter,
  AlignRight, List, ListOrdered, PlusCircle, Code, Star, Menu, Smile,
  Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Eraser
} from 'lucide-react';
import { resolveRenderableUrl } from '../../crm/utils/emailPreview';

const generateId = () => Math.random().toString(36).substring(2, 9);

const INITIAL_PRIMITIVES = [
  { type: 'brandHeader', label: 'HEADER', icon: Heading, color: 'text-slate-700' },
  { type: 'title', label: 'TITLE', icon: Heading, color: 'text-slate-700' },
  { type: 'paragraph', label: 'PARAGRAPH', icon: AlignLeft, color: 'text-slate-700' },
  { type: 'list', label: 'LIST', icon: List, color: 'text-slate-700' },
  { type: 'media', label: 'IMAGE', icon: ImageIcon, color: 'text-slate-700' },
  { type: 'button', label: 'BUTTON', icon: MousePointerClick, color: 'text-slate-700' },
  { type: 'divider', label: 'DIVIDER', icon: Minus, color: 'text-slate-700' },
  { type: 'spacer', label: 'SPACER', icon: ArrowUpDown, color: 'text-slate-700' },
  { type: 'social', label: 'SOCIAL', icon: PlusCircle, color: 'text-slate-700' },
  { type: 'html', label: 'HTML', icon: Code, color: 'text-slate-700' },
  { type: 'icons', label: 'ICONS', icon: Star, color: 'text-slate-700' },
  { type: 'menu', label: 'MENU', icon: Menu, color: 'text-slate-700' },
  { type: 'typography', label: 'TEXT', icon: Type, color: 'text-slate-700' },
  { type: 'brandFooter', label: 'FOOTER', icon: AlignLeft, color: 'text-slate-700' },
  { type: 'stickers', label: 'STICKERS', icon: Smile, color: 'text-slate-700' },
];

const TEXT_TOOL_BUTTONS = [
  { command: 'bold', title: 'Bold', icon: Bold },
  { command: 'italic', title: 'Italic', icon: Italic },
  { command: 'underline', title: 'Underline', icon: Underline },
  { command: 'strikeThrough', title: 'Strikethrough', icon: Strikethrough },
  { command: 'justifyLeft', title: 'Align left', icon: AlignLeft },
  { command: 'justifyCenter', title: 'Align center', icon: AlignCenter },
  { command: 'justifyRight', title: 'Align right', icon: AlignRight },
  { command: 'insertUnorderedList', title: 'Bullet list', icon: List },
  { command: 'insertOrderedList', title: 'Numbered list', icon: ListOrdered },
  { command: 'removeFormat', title: 'Clear formatting', icon: Eraser },
];

const BLOCK_TEXT_TOOL_BUTTONS = [
  { styleKey: 'fontWeight', activeValue: '700', inactiveValue: '400', title: 'Bold', icon: Bold },
  { styleKey: 'fontStyle', activeValue: 'italic', inactiveValue: 'normal', title: 'Italic', icon: Italic },
  { styleKey: 'textDecoration', activeValue: 'underline', inactiveValue: 'none', title: 'Underline', icon: Underline },
  { styleKey: 'textDecoration', activeValue: 'line-through', inactiveValue: 'none', title: 'Strikethrough', icon: Strikethrough },
];

const FREE_EMAIL_ICONS = [
  { key: 'email', label: 'Email', glyph: '✉' },
  { key: 'phone', label: 'Phone', glyph: '☎' },
  { key: 'location', label: 'Location', glyph: '⌖' },
  { key: 'clock', label: 'Time', glyph: '◷' },
  { key: 'check', label: 'Check', glyph: '✓' },
  { key: 'star', label: 'Star', glyph: '★' },
  { key: 'arrow', label: 'Arrow', glyph: '→' },
  { key: 'money', label: 'Amount', glyph: '$' },
  { key: 'box', label: 'Package', glyph: '▣' },
  { key: 'shield', label: 'Secure', glyph: '◇' },
  { key: 'plus', label: 'Add', glyph: '+' },
  { key: 'alert', label: 'Alert', glyph: '!' },
];

const getFreeEmailIcon = (key) =>
  FREE_EMAIL_ICONS.find((icon) => icon.key === key) || FREE_EMAIL_ICONS[0];

const isRenderableImageUrl = (value) => /^https?:\/\//i.test(String(value || '').trim()) || /^data:image\//i.test(String(value || '').trim());
const isPlaceholderToken = (value, token) => String(value || '').trim().toLowerCase() === String(token || '').trim().toLowerCase();

const resolveHeaderLogoUrl = (logoUrl, fallbackLogoUrl) => {
  const candidate = String(logoUrl || '').trim();
  const fallback = String(fallbackLogoUrl || '').trim();
  const selected = !candidate ? fallback : candidate;
  const resolved = resolveRenderableUrl(selected);
  if (!resolved || !isRenderableImageUrl(resolved)) {
    return '';
  }
  return resolved;
};

const resolveHeaderName = (companyName, fallbackBranchName) => {
  const candidate = String(companyName || '').trim();
  if (!candidate || isPlaceholderToken(candidate, '{{branch_name}}')) {
    return String(fallbackBranchName || '{{branch_name}}').trim();
  }
  return candidate;
};

const buildHeaderLogoStyle = (block) => {
  const logoHeight = String(block.style?.logoHeight || '72px').trim();
  return `width:auto;height:auto;max-width:none;max-height:${logoHeight};object-fit:contain;object-position:center center;display:inline-block;border:0;vertical-align:middle;`;
};

const IMAGE_CROP_MODES = ['cover', 'contain', 'fill', 'none', 'scale-down'];
const IMAGE_CROP_POSITIONS = ['left top', 'center top', 'right top', 'left center', 'center center', 'right center', 'left bottom', 'center bottom', 'right bottom'];

const getImageCropMode = (value, fallback = 'cover') =>
  IMAGE_CROP_MODES.includes(String(value || '').trim()) ? String(value).trim() : fallback;

const getImageCropPosition = (value, fallback = 'center center') =>
  IMAGE_CROP_POSITIONS.includes(String(value || '').trim()) ? String(value).trim() : fallback;

const createTextBlock = (content, style = {}) => ({
  id: generateId(),
  type: 'typography',
  content,
  style: {
    textAlign: 'left',
    fontSize: '16px',
    color: '#333333',
    padding: '20px',
    ...style,
  },
});

const createRowBlock = (layout = '2-2') => {
  const columnCount = layout === '3' ? 3 : 2;
  const widths = layout === '3'
    ? ['33.333%', '33.333%', '33.333%']
    : layout === '1-3'
      ? ['25%', '75%']
      : layout === '3-1'
        ? ['75%', '25%']
        : ['50%', '50%'];

  return {
    id: generateId(),
    type: 'row',
    layout,
    style: {
      padding: '12px 20px',
      gap: '16px',
      backgroundColor: 'transparent',
    },
    columns: Array.from({ length: columnCount }, (_, index) => ({
      id: generateId(),
      width: widths[index],
      style: {
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '0px',
      },
      blocks: [createTextBlock(index === 0 ? 'Left column' : index === 1 ? 'Right column' : `Column ${index + 1}`)],
    })),
  };
};

const createBlock = (type, options = {}) => {
  const id = generateId();
  const useDynamicBranchTokens = Boolean(options.useDynamicBranchTokens);
  const defaultLogoUrl = String(options.logoUrl || '').trim();
  const defaultBranchName = useDynamicBranchTokens ? '{{branch_name}}' : String(options.branchName || '').trim();
  switch (type) {
    case 'brandHeader':
      return {
        id,
        type: 'brandHeader',
        logoUrl: defaultLogoUrl || '',
        companyName: defaultBranchName || '{{branch_name}}',
        style: {
          padding: '24px 28px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          logoWidth: '120px',
          logoHeight: '56px',
          logoCropMode: 'contain',
          logoCropPosition: 'center center',
          logoPosition: 'left',
          textAlign: 'right',
          fontSize: '22px',
          fontWeight: '700',
          fontStyle: 'normal',
          textDecoration: 'none',
          color: '#111827',
        },
      };
    case 'brandFooter':
      return {
        id,
        type: 'brandFooter',
        address: '{{branch_address}}',
        contact: '{{branch_phone}} | {{branch_email}}',
        style: {
          padding: '24px 28px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: '400',
          fontStyle: 'normal',
          textDecoration: 'none',
          color: '#64748b',
        },
      };
    case 'title':
      return { id, type: 'typography', content: '<h2 style="margin:0;">Update for {{customer_name}}</h2>', style: { textAlign: 'left', fontSize: '24px', color: '#111827', padding: '20px' } };
    case 'paragraph':
    case 'typography':
      return { id, type: 'typography', content: '<p style="margin:0;">Hi {{customer_name}},<br/><br/>Thank you for choosing {{branch_name}}. Your move on {{move_date}} is coming up.<br/><br/>Reach out to {{agent_name}} if you have any questions.</p>', style: { textAlign: 'left', fontSize: '16px', color: '#333333', padding: '20px' } };
    case 'list':
      return { id, type: 'typography', content: '<ul style="margin:0;padding-left:20px;"><li>Quote Amount: {{quote_amount}}</li><li>Deposit Required: {{deposit_amount}}</li></ul>', style: { textAlign: 'left', fontSize: '16px', color: '#333333', padding: '20px' } };
    case 'text':
      return { id, type: 'typography', content: 'Custom content...', style: { textAlign: 'left', fontSize: '16px', color: '#333333', padding: '20px' } };
    case 'html':
      return {
        id,
        type: 'html',
        content: '<div style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;">Custom HTML content</div>',
        style: { padding: '20px', backgroundColor: '#ffffff' },
      };
    case 'icons':
      return {
        id,
        type: 'icon',
        iconKey: 'email',
        label: 'Email',
        style: {
          textAlign: 'center',
          padding: '20px',
          size: '48px',
          glyphSize: '24px',
          backgroundColor: '#e0f2fe',
          color: '#005f73',
          borderRadius: '999px',
        },
      };
    case 'media':
    case 'stickers':
      return {
        id,
        type: 'media',
        url: 'https://via.placeholder.com/600x200',
        alt: 'Image',
        style: {
          width: '100%',
          align: 'center',
          padding: '0px',
          cropMode: 'cover',
          cropPosition: 'center center',
          height: '240px',
        },
      };
    case 'button':
      return { id, type: 'button', text: 'View Your Quote', url: '{{quote_link}}', style: { backgroundColor: '#005f73', color: '#ffffff', textAlign: 'center', padding: '14px 28px', borderRadius: '8px' } };
    case 'divider':
      return { id, type: 'divider', style: { borderTop: '1px solid #e5e7eb', margin: '20px 0', padding: '0 20px' } };
    case 'spacer':
      return { id, type: 'spacer', style: { height: '30px' } };
    case 'row2':
      return createRowBlock('2-2');
    case 'row1_3':
      return createRowBlock('1-3');
    case 'row3_1':
      return createRowBlock('3-1');
    case 'row3':
      return createRowBlock('3');
    case 'social':
       return { id, type: 'typography', content: '<div style="text-align: center;"><a href="#" style="display:inline-block; margin: 0 8px; text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" width="24" height="24" style="display:block; border:0; outline:none;" /></a><a href="#" style="display:inline-block; margin: 0 8px; text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/733/733558.png" alt="Instagram" width="24" height="24" style="display:block; border:0; outline:none;" /></a><a href="#" style="display:inline-block; margin: 0 8px; text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" alt="Twitter" width="24" height="24" style="display:block; border:0; outline:none;" /></a><a href="#" style="display:inline-block; margin: 0 8px; text-decoration:none;"><img src="https://cdn-icons-png.flaticon.com/512/3536/3536505.png" alt="LinkedIn" width="24" height="24" style="display:block; border:0; outline:none;" /></a></div>', style: { textAlign: 'center', fontSize: '14px', color: '#333333', padding: '20px' } };
    case 'menu':
       return { id, type: 'typography', content: '<div style="text-align:center;"><a href="#" style="color:#005f73; text-decoration:none; margin: 0 10px; font-weight:bold;">Home</a> | <a href="#" style="color:#005f73; text-decoration:none; margin: 0 10px; font-weight:bold;">Services</a> | <a href="#" style="color:#005f73; text-decoration:none; margin: 0 10px; font-weight:bold;">Contact</a></div>', style: { textAlign: 'center', fontSize: '14px', color: '#005f73', padding: '20px' } };
    default:
      return { id, type: 'typography', content: 'New block', style: { textAlign: 'left', fontSize: '16px', color: '#333333', padding: '20px' } };
  }
};

export const normalizeAutomationBrandingBlocks = (blocks = []) =>
  walkBlocksDeep(blocks, (block) => {
    if (block?.type === 'brandHeader') {
      return {
        ...block,
        logoUrl: '',
        companyName: '{{branch_name}}',
      };
    }

    if (block?.type === 'brandFooter') {
      return {
        ...block,
        address: '{{branch_address}}',
        contact: '{{branch_phone}} | {{branch_email}}',
      };
    }

    return block;
  });

const DEFAULT_SETTINGS = {
  contentAreaWidth: 900,
  contentAreaAlignment: 'center',
  backgroundColor: '#ffffff',
  contentAreaBgColor: 'transparent',
  backgroundImage: false,
  backgroundImageUrl: '',
  defaultFont: 'Arial, sans-serif',
  linkColor: '#0068a5',
  title: '',
  language: 'en'
};

const normalizeSettings = (settings = {}) => {
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const width = Number(merged.contentAreaWidth);
  return {
    ...merged,
    contentAreaWidth: Number.isFinite(width) ? Math.min(1200, Math.max(400, Math.round(width))) : DEFAULT_SETTINGS.contentAreaWidth,
    contentAreaAlignment: merged.contentAreaAlignment === 'left' ? 'left' : 'center',
    backgroundColor: String(merged.backgroundColor || DEFAULT_SETTINGS.backgroundColor),
    contentAreaBgColor: String(merged.contentAreaBgColor || DEFAULT_SETTINGS.contentAreaBgColor),
    backgroundImage: Boolean(merged.backgroundImage),
    backgroundImageUrl: String(merged.backgroundImageUrl || ''),
    defaultFont: String(merged.defaultFont || DEFAULT_SETTINGS.defaultFont),
    linkColor: String(merged.linkColor || DEFAULT_SETTINGS.linkColor),
    title: String(merged.title || ''),
    language: String(merged.language || DEFAULT_SETTINGS.language),
  };
};

const escapeHtmlAttr = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeHtmlText = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeCssUrl = (value) =>
  String(value || '').replace(/['"\\\n\r\f]/g, '');

const isHexColor = (value) => /^#[0-9a-f]{6}$/i.test(String(value || '').trim());

const isFullHtmlDocument = (value) => /<!doctype\s+html|<html[\s>]|<body[\s>]/i.test(String(value || ''));

const serializeBuilderData = (data) => encodeURIComponent(JSON.stringify(data));

const parseBuilderDataPayload = (payload) => {
  const raw = String(payload || '').trim();
  const attempts = [raw];
  try {
    attempts.unshift(decodeURIComponent(raw));
  } catch (e) {
    // Older builder payloads were stored as raw JSON, so decoding may fail.
  }

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (e) {
      // Try the next payload format.
    }
  }
  return null;
};

const recoverLegacyWrappedFullHtml = (html) => {
  const match = String(html || '').match(/<!--\s*BUILDER_DATA:\s*\{"blocks":\[\{"id":"[^"]*","type":"typography","content":"([\s\S]*?)","style":\{/i);
  if (!match?.[1]) return '';
  try {
    const content = JSON.parse(`"${match[1]}"`);
    return isFullHtmlDocument(content) ? content : '';
  } catch (e) {
    return '';
  }
};

const getTextOffset = (root, node, offset) => {
  if (!root || !node || typeof document === 'undefined') return 0;
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
};

const getRangeForTextOffsets = (root, startOffset, endOffset = startOffset) => {
  if (!root || typeof document === 'undefined') return null;

  const range = document.createRange();
  const walker = document.createTreeWalker(root, window.NodeFilter.SHOW_TEXT);
  let currentOffset = 0;
  let didSetStart = false;
  let didSetEnd = false;
  let node = walker.nextNode();

  while (node) {
    const nextOffset = currentOffset + node.textContent.length;

    if (!didSetStart && startOffset <= nextOffset) {
      range.setStart(node, Math.max(0, startOffset - currentOffset));
      didSetStart = true;
    }

    if (!didSetEnd && endOffset <= nextOffset) {
      range.setEnd(node, Math.max(0, endOffset - currentOffset));
      didSetEnd = true;
      break;
    }

    currentOffset = nextOffset;
    node = walker.nextNode();
  }

  if (!didSetStart) {
    range.setStart(root, root.childNodes.length);
  }

  if (!didSetEnd) {
    range.setEnd(root, root.childNodes.length);
  }

  return range;
};

const insertTokenIntoHtmlAtTextOffset = (html, token, startOffset, endOffset = startOffset) => {
  if (typeof document === 'undefined') return `${html || ''}${token}`;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = String(html || '');
  const range = getRangeForTextOffsets(wrapper, startOffset, endOffset);

  if (!range) return `${html || ''}${token}`;

  range.deleteContents();
  range.insertNode(document.createTextNode(token));
  return wrapper.innerHTML;
};

const walkBlocksDeep = (blocks, visitor) =>
  blocks.map((block) => {
    const nextBlock = visitor(block) || block;
    if (nextBlock.type === 'row' && Array.isArray(nextBlock.columns)) {
      return {
        ...nextBlock,
        columns: nextBlock.columns.map((column) => ({
          ...column,
          blocks: walkBlocksDeep(column.blocks || [], visitor),
        })),
      };
    }
    return nextBlock;
  });

const findTypographyBlockById = (blocks, id) => {
  for (const block of blocks) {
    if (block.id === id && block.type === 'typography') return block;
    if (block.type === 'row') {
      for (const column of block.columns || []) {
        const found = findTypographyBlockById(column.blocks || [], id);
        if (found) return found;
      }
    }
  }
  return null;
};

const updateTypographyBlockById = (blocks, id, updater) =>
  walkBlocksDeep(blocks, (block) => {
    if (block.id !== id) return block;
    return updater(block);
  });

const removeBlockById = (blocks, id) => {
  let removed = null;
  const nextBlocks = [];

  for (const block of blocks) {
    if (block.id === id) {
      removed = block;
      continue;
    }

    if (block.type === 'row' && Array.isArray(block.columns)) {
      const nextColumns = [];
      let columnChanged = false;

      for (const column of block.columns) {
        const result = removeBlockById(column.blocks || [], id);
        if (result.removed) {
          removed = result.removed;
          columnChanged = true;
        }
        nextColumns.push(result.blocks !== (column.blocks || []) ? { ...column, blocks: result.blocks } : column);
      }

      nextBlocks.push(columnChanged ? { ...block, columns: nextColumns } : block);
      continue;
    }

    nextBlocks.push(block);
  }

  return { blocks: nextBlocks, removed };
};

const appendBlockToRowColumn = (blocks, rowId, columnId, incomingBlock) =>
  blocks.map((block) => {
    if (block.id === rowId && block.type === 'row') {
      return {
        ...block,
        columns: (block.columns || []).map((column) => {
          if (column.id !== columnId) return column;
          return {
            ...column,
            blocks: [...(column.blocks || []), incomingBlock],
          };
        }),
      };
    }
    if (block.type === 'row' && Array.isArray(block.columns)) {
      return {
        ...block,
        columns: block.columns.map((column) => ({
          ...column,
          blocks: appendBlockToRowColumn(column.blocks || [], rowId, columnId, incomingBlock),
        })),
      };
    }
    return block;
  });

const findLastTypographyBlock = (blocks) => {
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const block = blocks[i];
    if (block.type === 'typography') return block;
    if (block.type === 'row') {
      for (let j = (block.columns || []).length - 1; j >= 0; j -= 1) {
        const found = findLastTypographyBlock(block.columns[j].blocks || []);
        if (found) return found;
      }
    }
  }
  return null;
};

const compileToHTML = (blocks, settings = DEFAULT_SETTINGS, branchContext = '') => {
  if (
    blocks.length === 1 &&
    blocks[0]?.type === 'html' &&
    isFullHtmlDocument(blocks[0]?.content)
  ) {
    return blocks[0].content || '';
  }

  const normalizedSettings = normalizeSettings(settings);
  const branchLogoUrl = typeof branchContext === 'string' ? branchContext : String(branchContext?.branchLogoUrl || branchContext?.logoUrl || branchContext?.effectiveLogoUrl || '').trim();
  const branchName = typeof branchContext === 'string' ? '' : String(branchContext?.branchName || branchContext?.name || branchContext?.branch_name || '').trim();
  const backgroundImageStyle = normalizedSettings.backgroundImage && normalizedSettings.backgroundImageUrl
    ? `background-image:url('${escapeCssUrl(normalizedSettings.backgroundImageUrl)}');background-size:cover;background-position:center;background-repeat:no-repeat;`
    : '';
  const renderSimpleBlockHtml = (block) => {
    switch (block?.type) {
      case 'typography':
      case 'title':
      case 'paragraph':
      case 'list':
      case 'text':
        return `<tr><td style="padding:${block.style?.padding || '20px'};text-align:${block.style?.textAlign || 'left'};font-size:${block.style?.fontSize || '16px'};color:${block.style?.color || '#333333'};font-family:${normalizedSettings.defaultFont};">${block.content || ''}</td></tr>`;
      case 'html':
        return `<tr><td style="padding:${block.style?.padding || '20px'};background-color:${block.style?.backgroundColor || 'transparent'};font-family:${normalizedSettings.defaultFont};">${block.content || ''}</td></tr>`;
      case 'media':
      case 'video':
      case 'gifs':
        return `<tr><td style="padding:${block.style?.padding || '0px'};text-align:${block.style?.align || 'center'};"><img src="${escapeHtmlAttr(resolveRenderableUrl(block.url || 'https://via.placeholder.com/600x200'))}" alt="${escapeHtmlAttr(block.alt || '')}" style="width:${block.style?.width || '100%'};max-width:100%;height:${block.style?.height || '240px'};object-fit:${getImageCropMode(block.style?.cropMode, 'cover')};object-position:${getImageCropPosition(block.style?.cropPosition, 'center center')};display:inline-block;border:0;vertical-align:middle;" /></td></tr>`;
      case 'icon': {
        const icon = getFreeEmailIcon(block.iconKey);
        const iconSize = block.style?.size || '48px';
        return `<tr><td style="padding:${block.style?.padding || '20px'};text-align:${block.style?.textAlign || 'center'};font-family:${normalizedSettings.defaultFont};">
          <span role="img" aria-label="${escapeHtmlAttr(block.label || icon.label)}" style="display:inline-block;width:${iconSize};height:${iconSize};line-height:${iconSize};text-align:center;mso-line-height-rule:exactly;border-radius:${block.style?.borderRadius || '999px'};background-color:${block.style?.backgroundColor || '#e0f2fe'};color:${block.style?.color || '#005f73'};font-size:${block.style?.glyphSize || '24px'};font-weight:bold;">${escapeHtmlText(icon.glyph)}</span>
        </td></tr>`;
      }
      case 'button':
        return `<tr><td style="padding:20px;text-align:${block.style?.textAlign || 'center'};"><a href="${escapeHtmlAttr(block.url || '#')}" style="background-color:${block.style?.backgroundColor || '#005f73'};color:${block.style?.color || '#ffffff'};padding:${block.style?.padding || '14px 28px'};border-radius:${block.style?.borderRadius || '8px'};text-decoration:none;display:inline-block;font-family:${normalizedSettings.defaultFont};font-weight:bold;">${block.text || 'Click Here'}</a></td></tr>`;
      case 'brandHeader': {
        const logoPosition = ['left', 'center', 'right'].includes(block.style?.logoPosition) ? block.style.logoPosition : 'left';
        const headerLogoFit = getImageCropMode(block.style?.logoCropMode, 'contain');
        const headerLogoPosition = getImageCropPosition(block.style?.logoCropPosition, 'center center');
        const headerLogoUrl = resolveHeaderLogoUrl(block.logoUrl, branchLogoUrl);
        const headerName = resolveHeaderName(block.companyName, branchName);
        const headerLogoHtml = `<img src="${escapeHtmlAttr(headerLogoUrl)}" alt="${escapeHtmlAttr(headerName)} logo" style="${buildHeaderLogoStyle(block)}object-fit:${headerLogoFit};object-position:${headerLogoPosition};" />`;
        const headerNameHtml = `<div style="text-align:${block.style?.textAlign || 'right'};font-size:${block.style?.fontSize || '22px'};font-weight:${block.style?.fontWeight || '700'};font-style:${block.style?.fontStyle || 'normal'};text-decoration:${block.style?.textDecoration || 'none'};color:${block.style?.color || '#111827'};">${headerName}</div>`;
        return `<tr><td style="padding:${block.style?.padding || '24px 28px'};background-color:${block.style?.backgroundColor || '#ffffff'};border-bottom:${block.style?.borderBottom || '1px solid #e5e7eb'};font-family:${normalizedSettings.defaultFont};">
          ${logoPosition === 'center'
            ? `<div style="text-align:center;margin-bottom:12px;line-height:0;">${headerLogoHtml}</div>${headerNameHtml}`
            : `<table class="email-header-table" width="100%" border="0" cellspacing="0" cellpadding="0"><tr>${logoPosition === 'right'
              ? `<td class="email-header-cell" style="vertical-align:middle;">${headerNameHtml}</td><td class="email-header-cell email-header-logo" style="text-align:right;vertical-align:middle;width:1%;white-space:nowrap;padding-left:16px;line-height:0;">${headerLogoHtml}</td>`
              : `<td class="email-header-cell email-header-logo" style="vertical-align:middle;width:1%;white-space:nowrap;padding-right:16px;line-height:0;">${headerLogoHtml}</td><td class="email-header-cell" style="vertical-align:middle;">${headerNameHtml}</td>`
            }</tr></table>`}
        </td></tr>`;
      }
      case 'brandFooter':
        return `<tr><td style="padding:${block.style?.padding || '24px 28px'};background-color:${block.style?.backgroundColor || '#f8fafc'};border-top:${block.style?.borderTop || '1px solid #e5e7eb'};text-align:${block.style?.textAlign || 'center'};font-size:${block.style?.fontSize || '13px'};font-weight:${block.style?.fontWeight || '400'};font-style:${block.style?.fontStyle || 'normal'};text-decoration:${block.style?.textDecoration || 'none'};line-height:1.6;color:${block.style?.color || '#64748b'};font-family:${normalizedSettings.defaultFont};">
          <div>${block.address || '{{branch_address}}'}</div>
          <div>${block.contact || '{{branch_phone}} | {{branch_email}}'}</div>
        </td></tr>`;
      case 'divider':
        return `<tr><td style="padding:${block.style?.padding || '0 20px'};"><div style="border-top:${block.style?.borderTop || '1px solid #e5e7eb'};margin:${block.style?.margin || '20px 0'};"></div></td></tr>`;
      case 'spacer':
        return `<tr><td style="height:${block.style?.height || '30px'};line-height:${block.style?.height || '30px'};font-size:0;">&nbsp;</td></tr>`;
      default:
        return `<tr><td style="padding:20px;text-align:center;color:#999;font-family:${normalizedSettings.defaultFont};">[${block.label || block.type} Placeholder]</td></tr>`;
    }
  };
  const innerHtml = blocks.map(block => {
    const logoPosition = ['left', 'center', 'right'].includes(block.style?.logoPosition) ? block.style.logoPosition : 'left';
    const headerLogoFit = getImageCropMode(block.style?.logoCropMode, 'contain');
    const headerLogoPosition = getImageCropPosition(block.style?.logoCropPosition, 'center center');
    const headerLogoUrl = resolveHeaderLogoUrl(block.logoUrl, branchLogoUrl);
    const headerName = resolveHeaderName(block.companyName, branchName);
    const headerLogoHtml = `<img src="${escapeHtmlAttr(headerLogoUrl)}" alt="${escapeHtmlAttr(headerName)} logo" style="${buildHeaderLogoStyle(block)}object-fit:${headerLogoFit};object-position:${headerLogoPosition};" />`;
    const headerNameHtml = `<div style="text-align:${block.style?.textAlign || 'right'};font-size:${block.style?.fontSize || '22px'};font-weight:${block.style?.fontWeight || '700'};font-style:${block.style?.fontStyle || 'normal'};text-decoration:${block.style?.textDecoration || 'none'};color:${block.style?.color || '#111827'};">${headerName}</div>`;
    switch (block.type) {
      case 'typography':
      case 'title':
      case 'paragraph':
      case 'list':
      case 'text':
        return `<tr><td style="padding:${block.style.padding || '20px'};text-align:${block.style.textAlign || 'left'};font-size:${block.style.fontSize || '16px'};color:${block.style.color || '#333333'};font-family:${normalizedSettings.defaultFont};">${block.content || ''}</td></tr>`;
      case 'row': {
        const columns = Array.isArray(block.columns) ? block.columns : [];
        const columnHtml = columns.map((column) => {
          const childHtml = (column.blocks || []).map((child) => renderSimpleBlockHtml(child)).join('\n');
          return `<td class="email-column" width="${column.width || '50%'}" valign="top" style="width:${column.width || '50%'};padding:8px;">
            <table class="email-column-inner" width="100%" border="0" cellspacing="0" cellpadding="0" style="border:${column.style?.border || '1px solid #e5e7eb'};border-radius:${column.style?.borderRadius || '12px'};overflow:hidden;background-color:${column.style?.backgroundColor || 'transparent'};">
              <tr><td style="padding:${column.style?.padding || '0px'};font-family:${normalizedSettings.defaultFont};">${childHtml}</td></tr>
            </table>
          </td>`;
        }).join('');
        return `<tr><td style="padding:${block.style?.padding || '12px 20px'};background-color:${block.style?.backgroundColor || 'transparent'};">
          <table class="email-row-table" width="100%" border="0" cellspacing="0" cellpadding="0"><tr>${columnHtml}</tr></table>
        </td></tr>`;
      }
      case 'html':
        return `<tr><td style="padding:${block.style.padding || '20px'};background-color:${block.style.backgroundColor || 'transparent'};font-family:${normalizedSettings.defaultFont};">${block.content || ''}</td></tr>`;
      case 'media':
      case 'video':
      case 'gifs':
        return `<tr><td style="padding:${block.style.padding || '0px'};text-align:${block.style.align || 'center'};"><img src="${block.url || 'https://via.placeholder.com/600x200'}" alt="${block.alt || ''}" style="width:${block.style.width || '100%'};max-width:100%;height:${block.style.height || '240px'};object-fit:${getImageCropMode(block.style?.cropMode, 'cover')};object-position:${getImageCropPosition(block.style?.cropPosition, 'center center')};display:inline-block;border:0;vertical-align:middle;" /></td></tr>`;
      case 'icon': {
        const icon = getFreeEmailIcon(block.iconKey);
        const iconLabel = block.label || icon.label;
        const iconSize = block.style?.size || '48px';
        return `<tr><td style="padding:${block.style?.padding || '20px'};text-align:${block.style?.textAlign || 'center'};font-family:${normalizedSettings.defaultFont};">
          <span role="img" aria-label="${escapeHtmlAttr(iconLabel)}" style="display:inline-block;width:${iconSize};height:${iconSize};line-height:${iconSize};text-align:center;mso-line-height-rule:exactly;border-radius:${block.style?.borderRadius || '999px'};background-color:${block.style?.backgroundColor || '#e0f2fe'};color:${block.style?.color || '#005f73'};font-size:${block.style?.glyphSize || '24px'};font-weight:bold;">${escapeHtmlText(icon.glyph)}</span>
        </td></tr>`;
      }
      case 'button':
        return `<tr><td style="padding:20px;text-align:${block.style.textAlign || 'center'};"><a href="${block.url || '#'}" style="background-color:${block.style.backgroundColor || '#005f73'};color:${block.style.color || '#ffffff'};padding:${block.style.padding || '14px 28px'};border-radius:${block.style.borderRadius || '8px'};text-decoration:none;display:inline-block;font-family:${normalizedSettings.defaultFont};font-weight:bold;">${block.text || 'Click Here'}</a></td></tr>`;
      case 'brandHeader':
        return `<tr><td style="padding:${block.style.padding || '24px 28px'};background-color:${block.style.backgroundColor || '#ffffff'};border-bottom:${block.style.borderBottom || '1px solid #e5e7eb'};font-family:${normalizedSettings.defaultFont};">
          ${logoPosition === 'center'
            ? `<div style="text-align:center;margin-bottom:12px;line-height:0;">${headerLogoHtml}</div>${headerNameHtml}`
            : `<table width="100%" border="0" cellspacing="0" cellpadding="0"><tr>${logoPosition === 'right'
              ? `<td style="vertical-align:middle;">${headerNameHtml}</td><td style="text-align:right;vertical-align:middle;width:1%;white-space:nowrap;padding-left:16px;line-height:0;">${headerLogoHtml}</td>`
              : `<td style="vertical-align:middle;width:1%;white-space:nowrap;padding-right:16px;line-height:0;">${headerLogoHtml}</td><td style="vertical-align:middle;">${headerNameHtml}</td>`
            }</tr></table>`}
        </td></tr>`;
      case 'brandFooter':
        return `<tr><td style="padding:${block.style.padding || '24px 28px'};background-color:${block.style.backgroundColor || '#f8fafc'};border-top:${block.style.borderTop || '1px solid #e5e7eb'};text-align:${block.style.textAlign || 'center'};font-size:${block.style.fontSize || '13px'};font-weight:${block.style.fontWeight || '400'};font-style:${block.style.fontStyle || 'normal'};text-decoration:${block.style.textDecoration || 'none'};line-height:1.6;color:${block.style.color || '#64748b'};font-family:${normalizedSettings.defaultFont};">
          <div>${block.address || '{{branch_address}}'}</div>
          <div>${block.contact || '{{branch_phone}} | {{branch_email}}'}</div>
        </td></tr>`;
      case 'divider':
        return `<tr><td style="padding:${block.style.padding || '0 20px'};"><div style="border-top:${block.style.borderTop || '1px solid #e5e7eb'};margin:${block.style.margin || '20px 0'};"></div></td></tr>`;
      case 'spacer':
        return `<tr><td style="height:${block.style.height || '30px'};line-height:${block.style.height || '30px'};font-size:0;">&nbsp;</td></tr>`;
      default:
        return `<tr><td style="padding:20px;text-align:center;color:#999;font-family:${normalizedSettings.defaultFont};">[${block.label || block.type} Placeholder]</td></tr>`;
    }
  }).join('\n');

  const builderData = serializeBuilderData({ blocks, settings: normalizedSettings });

  return `<!DOCTYPE html>
<html lang="${escapeHtmlAttr(normalizedSettings.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtmlAttr(normalizedSettings.title)}</title>
<style>
  a{color:${normalizedSettings.linkColor};}
  @media only screen and (max-width:600px){
    .email-outer{padding:8px 4px !important;}
    .email-container{border-radius:8px !important;box-shadow:none !important;}
    .email-row-table{width:100% !important;}
    .email-column{display:block !important;width:100% !important;max-width:100% !important;padding-left:0 !important;padding-right:0 !important;}
    .email-column-inner,.email-header-table{width:100% !important;}
    .email-header-cell{display:block !important;width:100% !important;max-width:100% !important;white-space:normal !important;padding-left:0 !important;padding-right:0 !important;text-align:center !important;}
    .email-header-logo{display:block !important;margin:0 auto 12px auto !important;max-width:160px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${normalizedSettings.backgroundColor};${backgroundImageStyle}">
  <!-- BUILDER_DATA:${builderData} -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:${normalizedSettings.backgroundColor};${backgroundImageStyle}width:100%;table-layout:fixed;">
    <tr>
      <td class="email-outer" align="${normalizedSettings.contentAreaAlignment === 'center' ? 'center' : 'left'}" style="padding:24px 10px;">
        <table class="email-container" width="${normalizedSettings.contentAreaWidth}" border="0" cellspacing="0" cellpadding="0" style="background-color:${normalizedSettings.contentAreaBgColor};max-width:${normalizedSettings.contentAreaWidth}px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          ${innerHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const parseHTMLToData = (html) => {
  if (!html) return { blocks: [], settings: normalizeSettings() };
  const recoveredLegacyHtml = recoverLegacyWrappedFullHtml(html);
  if (recoveredLegacyHtml) {
    return {
      blocks: [
        {
          id: generateId(),
          type: 'html',
          content: recoveredLegacyHtml,
          style: { padding: '0px', backgroundColor: 'transparent' },
        },
      ],
      settings: normalizeSettings(),
    };
  }

  const match = html.match(/<!--\s*BUILDER_DATA:\s*([\s\S]*?)\s*-->/);
  if (match && match[1]) {
    const parsed = parseBuilderDataPayload(match[1]);
    if (parsed) {
      const parsedBlocks = Array.isArray(parsed) ? parsed : parsed.blocks || [];
      const parsedSettings = Array.isArray(parsed) ? normalizeSettings() : normalizeSettings(parsed.settings);
      if (
        parsedBlocks.length === 1 &&
        parsedBlocks[0]?.type === 'typography' &&
        isFullHtmlDocument(parsedBlocks[0]?.content)
      ) {
        return {
          blocks: [
            {
              id: parsedBlocks[0].id || generateId(),
              type: 'html',
              content: parsedBlocks[0].content,
              style: { padding: '0px', backgroundColor: 'transparent' },
            },
          ],
          settings: parsedSettings,
        };
      }
      return { blocks: parsedBlocks, settings: parsedSettings };
    }
    console.error('Failed to parse builder data');
  }
  if (isFullHtmlDocument(html)) {
    return {
      blocks: [
        {
          id: generateId(),
          type: 'html',
          content: html,
          style: { padding: '0px', backgroundColor: 'transparent' },
        },
      ],
      settings: normalizeSettings(),
    };
  }
  return { blocks: [ { id: generateId(), type: 'html', content: html, style: { padding: '20px', backgroundColor: '#ffffff' } } ], settings: normalizeSettings() };
};

export default function EmailVisualBuilder({ value, onChange, insertTokenRequest = null, branchLogoUrl = '', branchName = '', forceDynamicBranchTokens = false }) {
  const [blocks, setBlocks] = useState([]);
  const [canvasSettings, setCanvasSettings] = useState(() => normalizeSettings());
  const [activeSidebarTab, setActiveSidebarTab] = useState('CONTENT'); // CONTENT | ROWS | SETTINGS
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState(null);
  const [draggedBlockId, setDraggedBlockId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const editableRefs = useRef({});
  const editableHtmlRef = useRef({});
  const savedSelectionRef = useRef(null);
  const pendingSelectionRestoreRef = useRef(null);
  const resolvedBranchName = String(branchName || '').trim();

  // Initialize blocks from value
  useEffect(() => {
    if (!isReady) {
      if (value) {
        const { blocks: parsedBlocks, settings: parsedSettings } = parseHTMLToData(value);
        setBlocks(forceDynamicBranchTokens ? normalizeAutomationBrandingBlocks(parsedBlocks) : parsedBlocks);
        setCanvasSettings(parsedSettings);
      } else {
        setBlocks([createBlock('brandHeader', { logoUrl: branchLogoUrl, branchName: resolvedBranchName, useDynamicBranchTokens: forceDynamicBranchTokens })]);
        setCanvasSettings(normalizeSettings());
      }
    }
    setIsReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update HTML whenever blocks change
  useEffect(() => {
    if (isReady) {
      const html = compileToHTML(
        forceDynamicBranchTokens ? normalizeAutomationBrandingBlocks(blocks) : blocks,
        canvasSettings,
        { branchLogoUrl, branchName: resolvedBranchName },
      );
      if (html !== value) {
        onChange(html);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, canvasSettings, isReady, branchLogoUrl, resolvedBranchName, forceDynamicBranchTokens]);

  const handleAddBlock = (type) => {
    const newBlock = createBlock(type, {
      logoUrl: branchLogoUrl,
      branchName: resolvedBranchName,
      useDynamicBranchTokens: forceDynamicBranchTokens,
    });
    setBlocks((prev) => [...prev, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const updateBlock = (id, newProps) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, ...newProps } : b));
  };

  const updateStyle = (id, styleProps) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, style: { ...b.style, ...styleProps } } : b));
  };

  const setEditableRef = (id) => (node) => {
    if (node) {
      editableRefs.current[id] = node;
      editableHtmlRef.current[id] = node.innerHTML;
    } else {
      delete editableRefs.current[id];
      delete editableHtmlRef.current[id];
    }
  };

  const getLatestEditableHtml = (blockId, fallbackHtml = '') => {
    const editableNode = editableRefs.current[blockId];
    if (editableHtmlRef.current[blockId] != null) {
      return editableHtmlRef.current[blockId];
    }
    if (editableNode) {
      return editableNode.innerHTML;
    }
    return fallbackHtml;
  };

  const getRenderedBlockHtml = (block) => editableHtmlRef.current[block.id] ?? block.content;

  const saveSelectionForBlock = (blockId) => {
    const editableNode = editableRefs.current[blockId];
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;

    if (!editableNode || !selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (
      !editableNode.contains(range.startContainer) ||
      !editableNode.contains(range.endContainer)
    ) {
      return;
    }

    savedSelectionRef.current = {
      blockId,
      startOffset: getTextOffset(editableNode, range.startContainer, range.startOffset),
      endOffset: getTextOffset(editableNode, range.endContainer, range.endOffset),
    };
  };

  const restoreSelectionForBlock = (blockId, offset) => {
    const editableNode = editableRefs.current[blockId];
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    if (!editableNode || !selection) return;

    const range = getRangeForTextOffsets(editableNode, offset);
    if (!range) return;

    editableNode.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    savedSelectionRef.current = {
      blockId,
      startOffset: offset,
      endOffset: offset,
    };
  };

  const insertTokenIntoCanvas = (token) => {
    const cleanToken = String(token || '').trim();
    if (!cleanToken) return;

    const savedSelection = savedSelectionRef.current;
    const savedSelectionBlock = savedSelection?.blockId
      ? findTypographyBlockById(blocks, savedSelection.blockId)
      : null;
    const targetBlock =
      savedSelectionBlock ||
      findTypographyBlockById(blocks, activeBlockId) ||
      findLastTypographyBlock(blocks);

    if (targetBlock) {
      const editableNode = editableRefs.current[targetBlock.id];
      const currentHtml = getLatestEditableHtml(targetBlock.id, targetBlock.content);
      const startOffset = savedSelectionBlock
        ? savedSelection.startOffset
        : String(editableNode?.textContent || editableHtmlRef.current[targetBlock.id] || targetBlock.content || '').length;
      const endOffset = savedSelectionBlock ? savedSelection.endOffset : startOffset;
      const nextContent = insertTokenIntoHtmlAtTextOffset(currentHtml, cleanToken, startOffset, endOffset);
      editableHtmlRef.current[targetBlock.id] = nextContent;

      pendingSelectionRestoreRef.current = {
        blockId: targetBlock.id,
        offset: startOffset + cleanToken.length,
      };
      setActiveBlockId(targetBlock.id);
      setBlocks((prev) => updateTypographyBlockById(prev, targetBlock.id, (block) => ({ ...block, content: nextContent })));
      return;
    }

    const newBlock = createBlock('text');
    const nextBlock = {
      ...newBlock,
      content: cleanToken,
    };
    setActiveBlockId(nextBlock.id);
    setBlocks((prev) => [...prev, nextBlock]);
  };

  useEffect(() => {
    if (!insertTokenRequest?.token) return;
    insertTokenIntoCanvas(insertTokenRequest.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertTokenRequest?.id]);

  useEffect(() => {
    if (!pendingSelectionRestoreRef.current) return;
    const { blockId, offset } = pendingSelectionRestoreRef.current;
    pendingSelectionRestoreRef.current = null;
    restoreSelectionForBlock(blockId, offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  const deleteBlock = (id) => {
    setBlocks((prev) => removeBlockById(prev, id).blocks);
    if (activeBlockId === id) setActiveBlockId(null);
  };

  const duplicateBlock = (id) => {
    const blockToClone = blocks.find(b => b.id === id);
    if (!blockToClone) return;
    const newBlock = JSON.parse(JSON.stringify(blockToClone));
    newBlock.id = generateId();
    const index = blocks.findIndex(b => b.id === id);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    setActiveBlockId(newBlock.id);
  };

  // Drag and Drop implementation
  const handleDragStart = (e, index) => {
    setDraggedBlockIndex(index);
    const blockId = e.currentTarget?.dataset?.blockId || '';
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('blockId', blockId);
    e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedBlockIndex === null || draggedBlockIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === index) {
      setDragOverIndex(null);
      return;
    }
    
    const newBlocks = [...blocks];
    const draggedItem = newBlocks[draggedBlockIndex];
    newBlocks.splice(draggedBlockIndex, 1);
    newBlocks.splice(index, 0, draggedItem);
    
    setBlocks(newBlocks);
    setDraggedBlockIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedBlockIndex(null);
    setDraggedBlockId(null);
    setDragOverIndex(null);
  };

  // Primitives Drag to Canvas
  const handlePrimitiveDragStart = (e, type) => {
    e.dataTransfer.setData('primitiveType', type);
  };

  const handleColumnDrop = (e, rowId, columnId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    const type = e.dataTransfer.getData('primitiveType');
    if (type) {
      const newBlock = createBlock(type, { logoUrl: branchLogoUrl, branchName: resolvedBranchName });
      setBlocks((prev) => appendBlockToRowColumn(prev, rowId, columnId, newBlock));
      setActiveBlockId(newBlock.id);
      return;
    }

    const sourceId = String(e.dataTransfer.getData('blockId') || draggedBlockId || '').trim();
    if (!sourceId) return;
    setBlocks((prev) => {
      const extracted = removeBlockById(prev, sourceId);
      if (!extracted.removed) return prev;
      const updated = appendBlockToRowColumn(extracted.blocks, rowId, columnId, extracted.removed);
      return updated;
    });
    setActiveBlockId(sourceId);
  };

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    setDragOverIndex(null);
    const type = e.dataTransfer.getData('primitiveType');
    if (type) {
      const newBlock = createBlock(type, { logoUrl: branchLogoUrl, branchName: resolvedBranchName });
      if (dragOverIndex !== null && dragOverIndex < blocks.length) {
        const newBlocks = [...blocks];
        newBlocks.splice(dragOverIndex, 0, newBlock);
        setBlocks(newBlocks);
      } else {
        setBlocks([...blocks, newBlock]);
      }
      setActiveBlockId(newBlock.id);
    }
  };

  const handleCanvasDragOver = (e) => {
    e.preventDefault();
  };

  const activeBlock = findTypographyBlockById(blocks, activeBlockId) || blocks.find(b => b.id === activeBlockId);
  const restoreSavedSelection = (blockId) => {
    const editableNode = editableRefs.current[blockId];
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    const savedSelection = savedSelectionRef.current;
    if (!editableNode || !selection || savedSelection?.blockId !== blockId) return false;

    const range = getRangeForTextOffsets(
      editableNode,
      savedSelection.startOffset,
      savedSelection.endOffset
    );
    if (!range) return false;

    editableNode.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const applyTextCommand = (command, commandValue = null) => {
    if (!activeBlock || activeBlock.type !== 'typography') return;
    const editableNode = editableRefs.current[activeBlock.id];
    if (!editableNode || typeof document === 'undefined') return;

    if (!restoreSavedSelection(activeBlock.id)) {
      editableNode.focus();
    }

    document.execCommand(command, false, commandValue);
    const nextContent = editableNode.innerHTML;
    editableHtmlRef.current[activeBlock.id] = nextContent;
    setBlocks((prev) => updateTypographyBlockById(prev, activeBlock.id, (block) => ({ ...block, content: nextContent })));
    saveSelectionForBlock(activeBlock.id);
  };

  const applyTextLink = () => {
    const url = window.prompt('Enter URL');
    if (!url) return;
    applyTextCommand('createLink', url);
  };

  const toggleBlockTextStyle = (styleKey, activeValue, inactiveValue) => {
    if (!activeBlock || !['brandHeader', 'brandFooter'].includes(activeBlock.type)) return;
    const currentValue = activeBlock.style?.[styleKey];
    updateStyle(activeBlock.id, {
      [styleKey]: currentValue === activeValue ? inactiveValue : activeValue,
    });
  };

  const handleHeaderLogoDrop = (e, blockId, logoPosition) => {
    e.preventDefault();
    e.stopPropagation();
    const dragType = e.dataTransfer.getData('headerLogoDrag');
    if (dragType !== 'logo') return;
    updateStyle(blockId, { logoPosition });
  };

  const handleHeaderLogoDropByPointer = (e, blockId) => {
    e.preventDefault();
    e.stopPropagation();
    const dragType = e.dataTransfer.getData('headerLogoDrag');
    if (dragType !== 'logo') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = rect.width ? (e.clientX - rect.left) / rect.width : 0;
    const logoPosition = ratio < 0.34 ? 'left' : ratio > 0.66 ? 'right' : 'center';
    updateStyle(blockId, { logoPosition });
  };

  const updateCanvasSetting = (key, value) => {
    setCanvasSettings((prev) => normalizeSettings({ ...prev, [key]: value }));
  };
  const backgroundStyle = {
    backgroundColor: canvasSettings.backgroundColor,
    backgroundImage: canvasSettings.backgroundImage && canvasSettings.backgroundImageUrl ? `url("${canvasSettings.backgroundImageUrl}")` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
  const previewAlignClass = canvasSettings.contentAreaAlignment === 'center' ? 'justify-center' : 'justify-start';
  const previewShellStyle = {
    maxWidth: `${canvasSettings.contentAreaWidth}px`,
    fontFamily: canvasSettings.defaultFont,
    backgroundColor: canvasSettings.contentAreaBgColor,
    '--email-builder-link-color': canvasSettings.linkColor,
  };

  return (
    <div className="flex h-full bg-slate-50 border-0 overflow-hidden font-sans shadow-inner">
      {/* LEFT SIDEBAR: Builder Tools */}
      <div className="w-[320px] bg-slate-50 border-r border-border flex flex-col z-10 shrink-0 overflow-y-auto custom-scrollbar">
        {/* TABS */}
        <div className="flex bg-slate-100 border-b border-border shrink-0">
          {['CONTENT', 'ROWS', 'SETTINGS'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSidebarTab(tab)}
              className={`flex-1 py-3 text-[11px] font-bold tracking-widest uppercase transition-colors ${
                activeSidebarTab === tab 
                  ? 'bg-white text-primary border-t-2 border-primary' 
                  : 'text-muted hover:bg-slate-200/50 border-t-2 border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* TAB CONTENT */}
        <div className="p-5 flex-1 bg-white">
          {activeSidebarTab === 'CONTENT' && (
            <div className="grid grid-cols-3 gap-2">
              {INITIAL_PRIMITIVES.map((primitive) => {
                const Icon = primitive.icon;
                return (
                  <div
                    key={primitive.type}
                    draggable
                    onDragStart={(e) => handlePrimitiveDragStart(e, primitive.type)}
                    onClick={() => handleAddBlock(primitive.type)}
                    className="flex flex-col items-center justify-center p-3 aspect-square bg-white border border-border cursor-pointer hover:border-primary hover:shadow-sm transition-all active:scale-95"
                  >
                    <Icon size={24} strokeWidth={1.5} className="mb-2 text-slate-700" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center">{primitive.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {activeSidebarTab === 'ROWS' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'row2', label: '2 Columns', desc: '50 / 50 split' },
                { type: 'row1_3', label: 'Left / Right', desc: '25 / 75 split' },
                { type: 'row3_1', label: 'Right / Left', desc: '75 / 25 split' },
                { type: 'row3', label: '3 Columns', desc: '33 / 33 / 33 split' },
              ].map((row) => (
                <button
                  key={row.type}
                  type="button"
                  onClick={() => handleAddBlock(row.type)}
                  className="rounded-xl border border-border bg-white p-4 text-left transition-all hover:border-primary hover:shadow-sm"
                >
                  <div className="mb-3 flex h-16 items-stretch gap-2">
                    {row.type === 'row3' ? (
                      <>
                        <div className="flex-1 rounded-md border border-dashed border-slate-300 bg-slate-100" />
                        <div className="flex-1 rounded-md border border-dashed border-slate-300 bg-slate-100" />
                        <div className="flex-1 rounded-md border border-dashed border-slate-300 bg-slate-100" />
                      </>
                    ) : row.type === 'row1_3' ? (
                      <>
                        <div className="w-1/4 rounded-md border border-dashed border-slate-300 bg-slate-100" />
                        <div className="w-3/4 rounded-md border border-dashed border-slate-300 bg-slate-100" />
                      </>
                    ) : row.type === 'row3_1' ? (
                      <>
                        <div className="w-3/4 rounded-md border border-dashed border-slate-300 bg-slate-100" />
                        <div className="w-1/4 rounded-md border border-dashed border-slate-300 bg-slate-100" />
                      </>
                    ) : (
                      <>
                        <div className="flex-1 rounded-md border border-dashed border-slate-300 bg-slate-100" />
                        <div className="flex-1 rounded-md border border-dashed border-slate-300 bg-slate-100" />
                      </>
                    )}
                  </div>
                  <div className="text-sm font-bold text-heading">{row.label}</div>
                  <div className="text-[11px] font-medium text-muted">{row.desc}</div>
                </button>
              ))}
            </div>
          )}

          {activeSidebarTab === 'SETTINGS' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 pb-2 border-b border-border">Design Settings</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500">Content area width</label>
                    <span className="text-[11px] font-bold text-primary">{canvasSettings.contentAreaWidth}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="400" 
                    max="1200" 
                    value={canvasSettings.contentAreaWidth} 
                    onChange={(e) => updateCanvasSetting('contentAreaWidth', Number(e.target.value))}
                    className="w-full accent-primary" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500">Content area alignment</label>
                  <div className="flex rounded bg-slate-100 border border-border overflow-hidden">
                    {['left', 'center'].map(align => (
                      <button
                        key={align}
                        onClick={() => updateCanvasSetting('contentAreaAlignment', align)}
                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider ${canvasSettings.contentAreaAlignment === align ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 border-b border-border pb-3">
                  <label className="text-[11px] font-bold text-slate-500">Background color</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5">
                    <input
                      type="color"
                      value={isHexColor(canvasSettings.backgroundColor) ? canvasSettings.backgroundColor : '#ffffff'}
                      onChange={(e) => updateCanvasSetting('backgroundColor', e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
                      aria-label="Background color picker"
                    />
                    <input 
                      type="text" 
                      value={canvasSettings.backgroundColor} 
                      onChange={(e) => updateCanvasSetting('backgroundColor', e.target.value)}
                      className="min-w-0 flex-1 text-[11px] outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2 border-b border-border pb-3">
                  <label className="text-[11px] font-bold text-slate-500">Content area background color</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5">
                    <input
                      type="color"
                      value={isHexColor(canvasSettings.contentAreaBgColor) ? canvasSettings.contentAreaBgColor : '#ffffff'}
                      onChange={(e) => updateCanvasSetting('contentAreaBgColor', e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
                      aria-label="Content area background color picker"
                    />
                    <input 
                      type="text" 
                      value={canvasSettings.contentAreaBgColor} 
                      onChange={(e) => updateCanvasSetting('contentAreaBgColor', e.target.value)}
                      className="min-w-0 flex-1 text-[11px] outline-none font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateCanvasSetting('contentAreaBgColor', 'transparent')}
                    className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary-dark"
                  >
                    Use transparent
                  </button>
                </div>

                <div className="space-y-2 border-b border-border pb-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500">Background image</label>
                    <button
                      type="button"
                      onClick={() => updateCanvasSetting('backgroundImage', !canvasSettings.backgroundImage)}
                      className={`w-8 h-4 rounded-full transition-colors relative ${canvasSettings.backgroundImage ? 'bg-slate-700' : 'bg-slate-300'}`}
                      aria-pressed={canvasSettings.backgroundImage}
                    >
                      <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${canvasSettings.backgroundImage ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {canvasSettings.backgroundImage && (
                    <input
                      type="url"
                      value={canvasSettings.backgroundImageUrl}
                      onChange={(e) => updateCanvasSetting('backgroundImageUrl', e.target.value)}
                      placeholder="https://example.com/background.jpg"
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[11px] font-medium outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  )}
                </div>

                <div className="space-y-2 border-b border-border pb-3">
                  <label className="text-[11px] font-bold text-slate-500">Default font</label>
                  <select 
                    value={canvasSettings.defaultFont} 
                    onChange={(e) => updateCanvasSetting('defaultFont', e.target.value)}
                    className="w-full text-[11px] font-medium border border-border rounded px-2 py-1.5 outline-none"
                  >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                    <option value="'Times New Roman', Times, serif">Times New Roman</option>
                    <option value="'Courier New', Courier, monospace">Courier New</option>
                  </select>
                </div>

                <div className="space-y-2 pb-2">
                  <label className="text-[11px] font-bold text-slate-500">Link color</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5">
                    <input
                      type="color"
                      value={isHexColor(canvasSettings.linkColor) ? canvasSettings.linkColor : '#0068a5'}
                      onChange={(e) => updateCanvasSetting('linkColor', e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
                      aria-label="Link color picker"
                    />
                    <input 
                      type="text" 
                      value={canvasSettings.linkColor} 
                      onChange={(e) => updateCanvasSetting('linkColor', e.target.value)}
                      className="min-w-0 flex-1 text-[11px] outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 pb-2 border-b border-border">Metadata</h4>
                <div className="flex items-center border border-border rounded overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 border-r border-border">Title</div>
                  <input 
                    type="text" 
                    placeholder="Enter Title" 
                    value={canvasSettings.title} 
                    onChange={(e) => updateCanvasSetting('title', e.target.value)}
                    className="flex-1 px-3 py-2 text-[11px] outline-none w-full"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500">Language</label>
                  <select 
                    value={canvasSettings.language} 
                    onChange={(e) => updateCanvasSetting('language', e.target.value)}
                    className="text-[11px] font-medium border border-border rounded px-2 py-1 outline-none min-w-[80px]"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Canvas */}
      <div 
        className="flex-1 overflow-y-auto relative"
        style={backgroundStyle}
        onDrop={handleCanvasDrop}
        onDragOver={handleCanvasDragOver}
      >
        <style>{`.email-builder-canvas a{color:var(--email-builder-link-color);}`}</style>
        <div className={`flex ${previewAlignClass} py-3 px-1.5 sm:py-10 sm:px-4 min-h-full`}>
          <div
            className="email-builder-canvas w-full rounded-lg sm:rounded-2xl shadow-sm border border-border/50 min-h-[500px] overflow-hidden"
            style={previewShellStyle}
          >
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[500px] text-muted space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center border border-dashed border-slate-300">
                  <Plus size={24} className="text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-body">Canvas is empty</p>
                  <p className="text-sm">Drag widgets here to start building</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {blocks.map((block, index) => (
                  <React.Fragment key={block.id}>
                    {dragOverIndex === index && draggedBlockIndex !== index && (
                      <div className="h-1 bg-primary rounded-full mx-4 my-[-2px] z-50 relative" />
                    )}
                    <div
                      className={`relative group transition-all duration-200 outline-none ${
                        activeBlockId === block.id 
                          ? 'ring-2 ring-primary ring-inset bg-primary/5 z-20' 
                          : 'hover:ring-1 hover:ring-primary/30 hover:bg-slate-50 z-10'
                      }`}
                      onClick={() => setActiveBlockId(block.id)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      {/* Floating Glassmorphism Action Menu */}
                      <div className={`absolute right-3 top-3 flex items-center gap-1 p-1 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-white/40 transition-opacity duration-200 ${
                        activeBlockId === block.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <div 
                          draggable 
                          data-block-id={block.id}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          className="p-1.5 text-muted hover:text-body hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical size={16} />
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                          className="p-1.5 text-muted hover:text-body hover:bg-slate-100 rounded-lg transition-colors"
                          title="Duplicate"
                        >
                          <Copy size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                          className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Render Block Content */}
                      <div className="pointer-events-none">
                        {block.type === 'typography' && (
                          <div style={block.style} className="pointer-events-auto">
                              <div
                                ref={setEditableRef(block.id)}
                                contentEditable
                                suppressContentEditableWarning
                                onClick={() => setActiveBlockId(block.id)}
                                onFocus={() => saveSelectionForBlock(block.id)}
                                onMouseUp={() => saveSelectionForBlock(block.id)}
                                onKeyUp={() => saveSelectionForBlock(block.id)}
                                onInput={(e) => {
                                  editableHtmlRef.current[block.id] = e.currentTarget.innerHTML;
                                  saveSelectionForBlock(block.id);
                                }}
                                onBlur={(e) => {
                                  editableHtmlRef.current[block.id] = e.currentTarget.innerHTML;
                                  saveSelectionForBlock(block.id);
                                  if (e.target.innerHTML !== block.content) {
                                    updateBlock(block.id, { content: e.target.innerHTML });
                                  }
                                }}
                                className="outline-none focus:bg-white/50 rounded-lg transition-colors cursor-text min-h-[1em]"
                                dangerouslySetInnerHTML={{ __html: getRenderedBlockHtml(block) }}
                              />
                          </div>
                        )}

                        {block.type === 'html' && (
                          <div
                            className="pointer-events-auto"
                            style={{
                              padding: block.style?.padding || '20px',
                              backgroundColor: block.style?.backgroundColor || 'transparent',
                            }}
                          >
                            <div
                              className="min-h-[40px] rounded-lg"
                              dangerouslySetInnerHTML={{ __html: block.content || '' }}
                            />
                          </div>
                        )}
                        
                        {block.type === 'media' && (
                          <div style={{ padding: block.style.padding }}>
                            <div style={{ textAlign: block.style.align }}>
                              <img
                                src={block.url}
                                alt={block.alt}
                                style={{
                                  width: block.style.width,
                                  maxWidth: '100%',
                                  height: block.style.height || '240px',
                                  objectFit: getImageCropMode(block.style?.cropMode, 'cover'),
                                  objectPosition: getImageCropPosition(block.style?.cropPosition, 'center center'),
                                  display: 'inline-block',
                                  verticalAlign: 'middle',
                                }}
                                className="rounded-lg object-cover"
                              />
                            </div>
                          </div>
                        )}

                        {block.type === 'row' && (
                          <div className="pointer-events-auto" style={{ padding: block.style?.padding || '12px 20px' }}>
                            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(1, (block.columns || []).length)}, minmax(0, 1fr))` }}>
                              {(block.columns || []).map((column) => {
                                return (
                                  <div
                                    key={column.id}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleColumnDrop(e, block.id, column.id)}
                                    className="pointer-events-auto rounded-2xl border border-dashed border-slate-300 bg-white/80 p-2 shadow-sm min-h-[140px]"
                                    style={{
                                      backgroundColor: column.style?.backgroundColor || '#ffffff',
                                      borderRadius: column.style?.borderRadius || '12px',
                                      borderColor: column.style?.borderColor || '#e5e7eb',
                                    }}
                                  >
                                    {(column.blocks || []).length === 0 ? (
                                      <div className="min-h-[120px] rounded-xl bg-white p-4 text-sm text-muted pointer-events-none">
                                        Drop content here
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {(column.blocks || []).map((child) => (
                                          <div
                                            key={child.id}
                                            className={`pointer-events-auto relative rounded-xl border bg-white shadow-sm ${activeBlockId === child.id ? 'ring-2 ring-primary ring-inset' : 'border-border'}`}
                                          >
                                            <div
                                              draggable
                                              data-block-id={child.id}
                                              onDragStart={(e) => handleDragStart(e, null)}
                                              onDragEnd={handleDragEnd}
                                              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-muted shadow-sm ring-1 ring-slate-200 cursor-grab active:cursor-grabbing"
                                              title="Drag"
                                            >
                                              <GripVertical size={14} />
                                            </div>
                                            {child.type === 'typography' && (
                                              <div
                                                ref={setEditableRef(child.id)}
                                                contentEditable
                                                suppressContentEditableWarning
                                                dir="auto"
                                                onClick={() => setActiveBlockId(child.id)}
                                                onFocus={() => saveSelectionForBlock(child.id)}
                                                onMouseUp={() => saveSelectionForBlock(child.id)}
                                                onKeyUp={() => saveSelectionForBlock(child.id)}
                                                onInput={(e) => {
                                                  const nextHtml = e.currentTarget.innerHTML;
                                                  editableHtmlRef.current[child.id] = nextHtml;
                                                  saveSelectionForBlock(child.id);
                                                }}
                                                onBlur={(e) => {
                                                  editableHtmlRef.current[child.id] = e.currentTarget.innerHTML;
                                                  saveSelectionForBlock(child.id);
                                                  setBlocks((prev) => updateTypographyBlockById(prev, child.id, (node) => ({ ...node, content: e.target.innerHTML })));
                                                }}
                                                className="outline-none rounded-xl p-4 pt-10 min-h-[1em] pointer-events-auto"
                                                style={{ unicodeBidi: 'plaintext' }}
                                                dangerouslySetInnerHTML={{ __html: editableHtmlRef.current[child.id] ?? child.content }}
                                              />
                                            )}
                                            {child.type === 'html' && (
                                              <div className="p-4 pt-10">
                                                <div dangerouslySetInnerHTML={{ __html: child.content || '' }} />
                                              </div>
                                            )}
                                            {child.type === 'button' && (
                                              <div className="p-4 pt-10 text-center">
                                                <a href={child.url} onClick={(e) => e.preventDefault()} className="inline-block rounded-lg no-underline" style={{ backgroundColor: child.style.backgroundColor, color: child.style.color, padding: child.style.padding }}>
                                                  {child.text}
                                                </a>
                                              </div>
                                            )}
                                            {child.type === 'media' && (
                                              <div className="p-4 pt-10">
                                                <img
                                                  src={child.url}
                                                  alt={child.alt}
                                                  className="w-full rounded-lg object-cover"
                                                  style={{
                                                    height: child.style.height || '240px',
                                                    objectFit: getImageCropMode(child.style?.cropMode, 'cover'),
                                                    objectPosition: getImageCropPosition(child.style?.cropPosition, 'center center'),
                                                  }}
                                                />
                                              </div>
                                            )}
                                            {child.type === 'icon' && (
                                              <div className="p-4 pt-10 text-center">
                                                <span
                                                  role="img"
                                                  aria-label={child.label || getFreeEmailIcon(child.iconKey).label}
                                                  className="inline-flex items-center justify-center"
                                                  style={{
                                                    width: child.style?.size || '48px',
                                                    height: child.style?.size || '48px',
                                                    borderRadius: child.style?.borderRadius || '999px',
                                                    backgroundColor: child.style?.backgroundColor || '#e0f2fe',
                                                    color: child.style?.color || '#005f73',
                                                    fontSize: child.style?.glyphSize || '24px',
                                                    fontWeight: 700,
                                                  }}
                                                >
                                                  {getFreeEmailIcon(child.iconKey).glyph}
                                                </span>
                                              </div>
                                            )}
                                            {child.type === 'brandHeader' && (
                                              <div
                                                className="p-4 pt-10"
                                                style={{
                                                  backgroundColor: child.style?.backgroundColor || '#ffffff',
                                                  borderBottom: child.style?.borderBottom || '1px solid #e5e7eb',
                                                }}
                                              >
                                                <div className={`flex items-center gap-4 ${
                                                  child.style?.logoPosition === 'center'
                                                    ? 'flex-col justify-center'
                                                    : child.style?.logoPosition === 'right'
                                                      ? 'flex-row-reverse justify-between'
                                                      : 'justify-between'
                                                }`}>
                                                  <img
                                                    src={resolveHeaderLogoUrl(child.logoUrl, branchLogoUrl)}
                                                    alt={child.companyName || 'Branch logo'}
                                                    className="w-auto rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 object-contain"
                                                    style={{
                                    maxWidth: 'none',
                                    maxHeight: child.style?.logoHeight || '72px',
                                    width: 'auto',
                                    height: 'auto',
                                                      objectFit: getImageCropMode(child.style?.logoCropMode, 'contain'),
                                                      objectPosition: getImageCropPosition(child.style?.logoCropPosition, 'center center'),
                                                    }}
                                                  />
                                                  <div style={{ fontSize: child.style?.fontSize || '22px', fontWeight: child.style?.fontWeight || '700', color: child.style?.color || '#111827' }}>
                                                    {resolveHeaderName(child.companyName, resolvedBranchName)}
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                            {child.type === 'brandFooter' && (
                                              <div
                                                className="p-4 pt-10"
                                                style={{
                                                  backgroundColor: child.style?.backgroundColor || '#f8fafc',
                                                  borderTop: child.style?.borderTop || '1px solid #e5e7eb',
                                                  textAlign: child.style?.textAlign || 'center',
                                                  color: child.style?.color || '#64748b',
                                                }}
                                              >
                                                <div>{child.address || '{{branch_address}}'}</div>
                                                <div>{child.contact || '{{branch_phone}} | {{branch_email}}'}</div>
                                              </div>
                                            )}
                                            {(child.type === 'divider' || child.type === 'spacer') && (
                                              <div className="p-4 pt-10">
                                                {child.type === 'divider' ? (
                                                  <div className="border-t border-slate-200" style={{ margin: child.style?.margin || '20px 0' }} />
                                                ) : (
                                                  <div style={{ height: child.style?.height || '30px' }} />
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {block.type === 'icon' && (
                          <div
                            style={{
                              padding: block.style?.padding || '20px',
                              textAlign: block.style?.textAlign || 'center',
                            }}
                          >
                            <span
                              role="img"
                              aria-label={block.label || getFreeEmailIcon(block.iconKey).label}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: block.style?.size || '48px',
                                height: block.style?.size || '48px',
                                borderRadius: block.style?.borderRadius || '999px',
                                backgroundColor: block.style?.backgroundColor || '#e0f2fe',
                                color: block.style?.color || '#005f73',
                                fontSize: block.style?.glyphSize || '24px',
                                fontWeight: 700,
                                lineHeight: 1,
                              }}
                            >
                              {getFreeEmailIcon(block.iconKey).glyph}
                            </span>
                          </div>
                        )}
                        
                        {block.type === 'button' && (
                          <div style={{ padding: '20px', textAlign: block.style.textAlign }}>
                            <a 
                              href={block.url} 
                              onClick={(e) => e.preventDefault()}
                              style={{ 
                                backgroundColor: block.style.backgroundColor, 
                                color: block.style.color,
                                padding: block.style.padding,
                                borderRadius: block.style.borderRadius,
                              }}
                              className="inline-block font-bold no-underline pointer-events-none"
                            >
                              {block.text}
                            </a>
                          </div>
                        )}

                        {block.type === 'brandHeader' && (
                          <div
                            onDragOver={(e) => {
                              if (Array.from(e.dataTransfer.types || []).includes('headerLogoDrag')) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            onDrop={(e) => handleHeaderLogoDropByPointer(e, block.id)}
                            style={{
                              padding: block.style.padding,
                              backgroundColor: block.style.backgroundColor,
                              borderBottom: block.style.borderBottom,
                            }}
                          >
                            <div className={`flex items-center gap-4 ${
                              block.style.logoPosition === 'center'
                                ? 'flex-col justify-center'
                                : block.style.logoPosition === 'right'
                                  ? 'flex-row-reverse justify-between'
                                  : 'justify-between'
                            }`}>
                              {resolveHeaderLogoUrl(block.logoUrl, branchLogoUrl) ? (
                                <img
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('headerLogoDrag', 'logo');
                                  }}
                                  onDragEnd={(e) => e.stopPropagation()}
                                  src={resolveHeaderLogoUrl(block.logoUrl, branchLogoUrl)}
                                  alt={block.companyName || 'Branch logo'}
                                  className="w-auto cursor-grab rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 object-contain active:cursor-grabbing"
                                  style={{
                                    maxWidth: 'none',
                                    maxHeight: block.style.logoHeight || '72px',
                                    width: 'auto',
                                    height: 'auto',
                                    objectFit: getImageCropMode(block.style?.logoCropMode, 'contain'),
                                    objectPosition: getImageCropPosition(block.style?.logoCropPosition, 'center center'),
                                  }}
                                  title="Drag logo left, center, or right"
                                />
                              ) : (
                                <div
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('headerLogoDrag', 'logo');
                                  }}
                                  onDragEnd={(e) => e.stopPropagation()}
                                  className="flex min-h-12 cursor-grab items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 active:cursor-grabbing"
                                  style={{ width: block.style.logoWidth }}
                                  title="Drag logo left, center, or right"
                                >
                                  Logo
                                </div>
                              )}
                              <div
                                style={{
                                  textAlign: block.style.textAlign || 'right',
                                  fontWeight: block.style.fontWeight || '700',
                                  fontStyle: block.style.fontStyle || 'normal',
                                  textDecoration: block.style.textDecoration || 'none',
                                  fontSize: block.style.fontSize,
                                  color: block.style.color,
                                }}
                                className={block.style.logoPosition === 'center' ? 'w-full' : 'flex-1'}
                              >
                                {resolveHeaderName(block.companyName, resolvedBranchName)}
                              </div>
                            </div>
                          </div>
                        )}

                        {block.type === 'brandFooter' && (
                          <div
                            style={{
                              padding: block.style.padding,
                              backgroundColor: block.style.backgroundColor,
                              borderTop: block.style.borderTop,
                              textAlign: block.style.textAlign,
                              fontSize: block.style.fontSize,
                              fontWeight: block.style.fontWeight || '400',
                              fontStyle: block.style.fontStyle || 'normal',
                              textDecoration: block.style.textDecoration || 'none',
                              color: block.style.color,
                            }}
                            className="leading-relaxed"
                          >
                            <div>{block.address || '{{branch_address}}'}</div>
                            <div>{block.contact || '{{branch_phone}} | {{branch_email}}'}</div>
                          </div>
                        )}
                        
                        {block.type === 'divider' && (
                          <div style={{ padding: block.style.padding }}>
                            <div style={{ borderTop: block.style.borderTop, margin: block.style.margin }} />
                          </div>
                        )}
                        
                        {block.type === 'spacer' && (
                          <div style={{ height: block.style.height }} className="bg-slate-50/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-muted uppercase tracking-widest font-bold">Spacer {block.style.height}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
                {dragOverIndex === blocks.length && (
                  <div className="h-1 bg-primary rounded-full mx-4 mb-2 z-50 relative" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR: Properties */}
      {activeBlock && (
        <div className="w-72 bg-white border-l border-border p-5 flex flex-col z-10 shrink-0 overflow-y-auto animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <h4 className="text-sm font-bold text-heading tracking-tight flex items-center gap-2">
              <Settings2 size={16} className="text-primary" />
              Settings
            </h4>
            <button onClick={() => setActiveBlockId(null)} className="text-muted hover:text-body">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5">
            {activeBlock.type === 'typography' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Text Tools</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {TEXT_TOOL_BUTTONS.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <button
                          key={tool.command}
                          type="button"
                          title={tool.title}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyTextCommand(tool.command)}
                          className="inline-flex h-9 items-center justify-center rounded-lg bg-subtle text-muted transition-colors hover:bg-border hover:text-heading"
                        >
                          <Icon size={16} strokeWidth={2.5} />
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      title="Insert link"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={applyTextLink}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-subtle text-muted transition-colors hover:bg-border hover:text-heading"
                    >
                      <LinkIcon size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Text Color</label>
                      <input
                        type="color"
                        onChange={(e) => applyTextCommand('foreColor', e.target.value)}
                        className="w-full h-[36px] p-1 bg-subtle border-none rounded-xl cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Highlight</label>
                      <input
                        type="color"
                        onChange={(e) => applyTextCommand('hiliteColor', e.target.value)}
                        className="w-full h-[36px] p-1 bg-subtle border-none rounded-xl cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Alignment</label>
                  <div className="flex rounded-xl bg-subtle p-1">
                    {['left', 'center', 'right'].map(align => (
                      <button
                        key={align}
                        onClick={() => updateStyle(activeBlock.id, { textAlign: align })}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${activeBlock.style.textAlign === align ? 'bg-white shadow-sm text-heading' : 'text-muted hover:text-body'}`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Size</label>
                    <div className="flex items-center bg-subtle rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/10">
                      <input type="number" value={parseInt(activeBlock.style.fontSize) || 16} onChange={(e) => updateStyle(activeBlock.id, { fontSize: `${e.target.value}px` })} className="w-full bg-transparent border-none text-sm outline-none" />
                      <span className="text-muted text-[10px] font-bold">px</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Color</label>
                    <input type="color" value={activeBlock.style.color} onChange={(e) => updateStyle(activeBlock.id, { color: e.target.value })} className="w-full h-[36px] p-1 bg-subtle border-none rounded-xl cursor-pointer" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Padding</label>
                  <input type="text" value={activeBlock.style.padding} onChange={(e) => updateStyle(activeBlock.id, { padding: e.target.value })} className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10" />
                </div>
              </>
            )}

            {activeBlock.type === 'html' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">HTML Content</label>
                  <textarea
                    value={activeBlock.content || ''}
                    onChange={(e) => updateBlock(activeBlock.id, { content: e.target.value })}
                    placeholder="<div>Write HTML here...</div>"
                    spellCheck={false}
                    className="min-h-[240px] w-full resize-y rounded-xl bg-[#111827] px-3 py-3 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Padding</label>
                    <input
                      type="text"
                      value={activeBlock.style?.padding || '20px'}
                      onChange={(e) => updateStyle(activeBlock.id, { padding: e.target.value })}
                      className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Background</label>
                    <input
                      type="color"
                      value={isHexColor(activeBlock.style?.backgroundColor) ? activeBlock.style.backgroundColor : '#ffffff'}
                      onChange={(e) => updateStyle(activeBlock.id, { backgroundColor: e.target.value })}
                      className="w-full h-[36px] p-1 bg-subtle border-none rounded-xl cursor-pointer"
                    />
                  </div>
                </div>
              </>
            )}

            {activeBlock.type === 'brandHeader' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Text Tools</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {BLOCK_TEXT_TOOL_BUTTONS.map((tool) => {
                      const Icon = tool.icon;
                      const isActive = activeBlock.style?.[tool.styleKey] === tool.activeValue;
                      return (
                        <button
                          key={`${tool.styleKey}-${tool.activeValue}`}
                          type="button"
                          title={tool.title}
                          onClick={() => toggleBlockTextStyle(tool.styleKey, tool.activeValue, tool.inactiveValue)}
                          className={`inline-flex h-9 items-center justify-center rounded-lg transition-colors ${
                            isActive ? 'bg-primary/10 text-primary' : 'bg-subtle text-muted hover:bg-border hover:text-heading'
                          }`}
                        >
                          <Icon size={16} strokeWidth={2.5} />
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex rounded-xl bg-subtle p-1">
                    {['left', 'center', 'right'].map(align => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => updateStyle(activeBlock.id, { textAlign: align })}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${activeBlock.style.textAlign === align ? 'bg-white shadow-sm text-heading' : 'text-muted hover:text-body'}`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Logo URL</label>
                  <input
                    type="text"
                    value={activeBlock.logoUrl || ''}
                    onChange={(e) => updateBlock(activeBlock.id, { logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Logo Position</label>
                  <div className="flex rounded-xl bg-subtle p-1">
                    {['left', 'center', 'right'].map(position => (
                      <button
                        key={position}
                        type="button"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => handleHeaderLogoDrop(e, activeBlock.id, position)}
                        onClick={() => updateStyle(activeBlock.id, { logoPosition: position })}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${activeBlock.style.logoPosition === position ? 'bg-white shadow-sm text-heading' : 'text-muted hover:text-body'}`}
                      >
                        {position}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Logo Crop</label>
                    <select
                      value={activeBlock.style.logoCropMode || 'contain'}
                      onChange={(e) => updateStyle(activeBlock.id, { logoCropMode: e.target.value })}
                      className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                      <option value="fill">Fill</option>
                      <option value="none">None</option>
                      <option value="scale-down">Scale down</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Logo Focus</label>
                    <select
                      value={activeBlock.style.logoCropPosition || 'center center'}
                      onChange={(e) => updateStyle(activeBlock.id, { logoCropPosition: e.target.value })}
                      className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="left top">Top left</option>
                      <option value="center top">Top center</option>
                      <option value="right top">Top right</option>
                      <option value="left center">Middle left</option>
                      <option value="center center">Center</option>
                      <option value="right center">Middle right</option>
                      <option value="left bottom">Bottom left</option>
                      <option value="center bottom">Bottom center</option>
                      <option value="right bottom">Bottom right</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Branch Name</label>
                  <input
                    type="text"
                    value={activeBlock.companyName || ''}
                    onChange={(e) => updateBlock(activeBlock.id, { companyName: e.target.value })}
                    placeholder="{{branch_name}}"
                    className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Logo Width</label>
                    <div className="flex items-center bg-subtle rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/10">
                      <input type="number" value={parseInt(activeBlock.style.logoWidth) || 120} onChange={(e) => updateStyle(activeBlock.id, { logoWidth: `${e.target.value}px` })} className="w-full bg-transparent border-none text-sm outline-none" />
                      <span className="text-muted text-[10px] font-bold">px</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Name Size</label>
                    <div className="flex items-center bg-subtle rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/10">
                      <input type="number" value={parseInt(activeBlock.style.fontSize) || 22} onChange={(e) => updateStyle(activeBlock.id, { fontSize: `${e.target.value}px` })} className="w-full bg-transparent border-none text-sm outline-none" />
                      <span className="text-muted text-[10px] font-bold">px</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Text Color</label>
                    <input type="color" value={activeBlock.style.color || '#111827'} onChange={(e) => updateStyle(activeBlock.id, { color: e.target.value })} className="w-full h-[36px] p-1 bg-subtle border-none rounded-xl cursor-pointer" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Header Background</label>
                    <input type="color" value={activeBlock.style.backgroundColor || '#ffffff'} onChange={(e) => updateStyle(activeBlock.id, { backgroundColor: e.target.value })} className="w-full h-[36px] p-1 bg-subtle border-none rounded-xl cursor-pointer" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Padding</label>
                  <input type="text" value={activeBlock.style.padding || '24px 28px'} onChange={(e) => updateStyle(activeBlock.id, { padding: e.target.value })} className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10" />
                </div>
              </>
            )}

            {activeBlock.type === 'brandFooter' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Text Tools</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {BLOCK_TEXT_TOOL_BUTTONS.map((tool) => {
                      const Icon = tool.icon;
                      const isActive = activeBlock.style?.[tool.styleKey] === tool.activeValue;
                      return (
                        <button
                          key={`${tool.styleKey}-${tool.activeValue}`}
                          type="button"
                          title={tool.title}
                          onClick={() => toggleBlockTextStyle(tool.styleKey, tool.activeValue, tool.inactiveValue)}
                          className={`inline-flex h-9 items-center justify-center rounded-lg transition-colors ${
                            isActive ? 'bg-primary/10 text-primary' : 'bg-subtle text-muted hover:bg-border hover:text-heading'
                          }`}
                        >
                          <Icon size={16} strokeWidth={2.5} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Branch Address</label>
                  <input
                    type="text"
                    value={activeBlock.address || ''}
                    onChange={(e) => updateBlock(activeBlock.id, { address: e.target.value })}
                    placeholder="{{branch_address}}"
                    className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Contact Details</label>
                  <input
                    type="text"
                    value={activeBlock.contact || ''}
                    onChange={(e) => updateBlock(activeBlock.id, { contact: e.target.value })}
                    placeholder="{{branch_phone}} | {{branch_email}}"
                    className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Alignment</label>
                  <div className="flex rounded-xl bg-subtle p-1">
                    {['left', 'center', 'right'].map(align => (
                      <button
                        key={align}
                        onClick={() => updateStyle(activeBlock.id, { textAlign: align })}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${activeBlock.style.textAlign === align ? 'bg-white shadow-sm text-heading' : 'text-muted hover:text-body'}`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Size</label>
                    <div className="flex items-center bg-subtle rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/10">
                      <input type="number" value={parseInt(activeBlock.style.fontSize) || 13} onChange={(e) => updateStyle(activeBlock.id, { fontSize: `${e.target.value}px` })} className="w-full bg-transparent border-none text-sm outline-none" />
                      <span className="text-muted text-[10px] font-bold">px</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Color</label>
                    <input type="color" value={activeBlock.style.color || '#64748b'} onChange={(e) => updateStyle(activeBlock.id, { color: e.target.value })} className="w-full h-[36px] p-1 bg-subtle border-none rounded-xl cursor-pointer" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Footer Background</label>
                    <input type="color" value={activeBlock.style.backgroundColor || '#f8fafc'} onChange={(e) => updateStyle(activeBlock.id, { backgroundColor: e.target.value })} className="w-full h-[36px] p-1 bg-subtle border-none rounded-xl cursor-pointer" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Padding</label>
                    <input type="text" value={activeBlock.style.padding || '24px 28px'} onChange={(e) => updateStyle(activeBlock.id, { padding: e.target.value })} className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10" />
                  </div>
                </div>
              </>
            )}

            {activeBlock.type === 'media' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Image URL</label>
                  <input type="text" value={activeBlock.url} onChange={(e) => updateBlock(activeBlock.id, { url: e.target.value })} className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Width</label>
                    <div className="flex items-center bg-subtle rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/10">
                      <input type="number" value={parseInt(activeBlock.style.width) || 100} onChange={(e) => updateStyle(activeBlock.id, { width: `${e.target.value}%` })} className="w-full bg-transparent border-none text-sm outline-none" />
                      <span className="text-muted text-[10px] font-bold">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Align</label>
                    <select value={activeBlock.style.align} onChange={(e) => updateStyle(activeBlock.id, { align: e.target.value })} className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10">
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Crop mode</label>
                    <select
                      value={activeBlock.style.cropMode || 'cover'}
                      onChange={(e) => updateStyle(activeBlock.id, { cropMode: e.target.value })}
                      className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                      <option value="fill">Fill</option>
                      <option value="none">None</option>
                      <option value="scale-down">Scale down</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Height</label>
                    <div className="flex items-center bg-subtle rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/10">
                      <input type="number" value={parseInt(activeBlock.style.height) || 240} onChange={(e) => updateStyle(activeBlock.id, { height: `${e.target.value}px` })} className="w-full bg-transparent border-none text-sm outline-none" />
                      <span className="text-muted text-[10px] font-bold">px</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Crop focus</label>
                  <select
                    value={activeBlock.style.cropPosition || 'center center'}
                    onChange={(e) => updateStyle(activeBlock.id, { cropPosition: e.target.value })}
                    className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="left top">Top left</option>
                    <option value="center top">Top center</option>
                    <option value="right top">Top right</option>
                    <option value="left center">Middle left</option>
                    <option value="center center">Center</option>
                    <option value="right center">Middle right</option>
                    <option value="left bottom">Bottom left</option>
                    <option value="center bottom">Bottom center</option>
                    <option value="right bottom">Bottom right</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Padding</label>
                  <input type="text" value={activeBlock.style.padding} onChange={(e) => updateStyle(activeBlock.id, { padding: e.target.value })} className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10" />
                </div>
              </>
            )}

            {activeBlock.type === 'icon' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Free Icons</label>
                  <div className="grid grid-cols-4 gap-2">
                    {FREE_EMAIL_ICONS.map((icon) => (
                      <button
                        key={icon.key}
                        type="button"
                        title={icon.label}
                        onClick={() => updateBlock(activeBlock.id, { iconKey: icon.key, label: icon.label })}
                        className={`flex h-11 items-center justify-center rounded-xl border text-lg font-bold transition-colors ${
                          activeBlock.iconKey === icon.key
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-subtle text-heading hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        {icon.glyph}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Icon Label</label>
                  <input
                    type="text"
                    value={activeBlock.label || ''}
                    onChange={(e) => updateBlock(activeBlock.id, { label: e.target.value })}
                    className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Alignment</label>
                  <div className="flex rounded-xl bg-subtle p-1">
                    {['left', 'center', 'right'].map(align => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => updateStyle(activeBlock.id, { textAlign: align })}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${activeBlock.style.textAlign === align ? 'bg-white shadow-sm text-heading' : 'text-muted hover:text-body'}`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Icon Size</label>
                    <div className="flex items-center bg-subtle rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/10">
                      <input type="number" value={parseInt(activeBlock.style.size) || 48} onChange={(e) => updateStyle(activeBlock.id, { size: `${e.target.value}px` })} className="w-full bg-transparent border-none text-sm outline-none" />
                      <span className="text-muted text-[10px] font-bold">px</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Glyph Size</label>
                    <div className="flex items-center bg-subtle rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/10">
                      <input type="number" value={parseInt(activeBlock.style.glyphSize) || 24} onChange={(e) => updateStyle(activeBlock.id, { glyphSize: `${e.target.value}px` })} className="w-full bg-transparent border-none text-sm outline-none" />
                      <span className="text-muted text-[10px] font-bold">px</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Icon Color</label>
                    <input type="color" value={activeBlock.style.color || '#005f73'} onChange={(e) => updateStyle(activeBlock.id, { color: e.target.value })} className="w-full h-[36px] p-1 bg-subtle border-none rounded-xl cursor-pointer" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Background</label>
                    <input type="color" value={activeBlock.style.backgroundColor || '#e0f2fe'} onChange={(e) => updateStyle(activeBlock.id, { backgroundColor: e.target.value })} className="w-full h-[36px] p-1 bg-subtle border-none rounded-xl cursor-pointer" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Radius</label>
                    <input type="text" value={activeBlock.style.borderRadius || '999px'} onChange={(e) => updateStyle(activeBlock.id, { borderRadius: e.target.value })} className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Padding</label>
                    <input type="text" value={activeBlock.style.padding || '20px'} onChange={(e) => updateStyle(activeBlock.id, { padding: e.target.value })} className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10" />
                  </div>
                </div>
              </>
            )}

            {activeBlock.type === 'button' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Button Text</label>
                  <input type="text" value={activeBlock.text} onChange={(e) => updateBlock(activeBlock.id, { text: e.target.value })} className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Link URL (or token)</label>
                  <input type="text" value={activeBlock.url} onChange={(e) => updateBlock(activeBlock.id, { url: e.target.value })} placeholder="{{quote_link}}" className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Bg Color</label>
                    <input type="color" value={activeBlock.style.backgroundColor} onChange={(e) => updateStyle(activeBlock.id, { backgroundColor: e.target.value })} className="w-full h-[36px] p-1 bg-subtle border-none rounded-xl cursor-pointer" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Text Color</label>
                    <input type="color" value={activeBlock.style.color} onChange={(e) => updateStyle(activeBlock.id, { color: e.target.value })} className="w-full h-[36px] p-1 bg-subtle border-none rounded-xl cursor-pointer" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Alignment</label>
                  <div className="flex rounded-xl bg-subtle p-1">
                    {['left', 'center', 'right'].map(align => (
                      <button
                        key={align}
                        onClick={() => updateStyle(activeBlock.id, { textAlign: align })}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${activeBlock.style.textAlign === align ? 'bg-white shadow-sm text-heading' : 'text-muted hover:text-body'}`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Radius</label>
                    <div className="flex items-center bg-subtle rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/10">
                      <input type="number" value={parseInt(activeBlock.style.borderRadius) || 8} onChange={(e) => updateStyle(activeBlock.id, { borderRadius: `${e.target.value}px` })} className="w-full bg-transparent border-none text-sm outline-none" />
                      <span className="text-muted text-[10px] font-bold">px</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Padding</label>
                    <input type="text" value={activeBlock.style.padding} onChange={(e) => updateStyle(activeBlock.id, { padding: e.target.value })} className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10" />
                  </div>
                </div>
              </>
            )}

            {activeBlock.type === 'divider' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Line Style (CSS)</label>
                  <input type="text" value={activeBlock.style.borderTop} onChange={(e) => updateStyle(activeBlock.id, { borderTop: e.target.value })} placeholder="1px solid #e5e7eb" className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10 font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Margin</label>
                    <input type="text" value={activeBlock.style.margin} onChange={(e) => updateStyle(activeBlock.id, { margin: e.target.value })} className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Padding</label>
                    <input type="text" value={activeBlock.style.padding} onChange={(e) => updateStyle(activeBlock.id, { padding: e.target.value })} className="w-full px-3 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10" />
                  </div>
                </div>
              </>
            )}

            {activeBlock.type === 'spacer' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Height</label>
                <div className="flex items-center bg-subtle rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/10">
                  <input type="number" value={parseInt(activeBlock.style.height) || 30} onChange={(e) => updateStyle(activeBlock.id, { height: `${e.target.value}px` })} className="w-full bg-transparent border-none text-sm outline-none" />
                  <span className="text-muted text-[10px] font-bold">px</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
