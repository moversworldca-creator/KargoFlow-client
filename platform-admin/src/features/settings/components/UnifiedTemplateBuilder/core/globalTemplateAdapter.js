import { fromBackendDocument, toBackendDocument } from './documentAdapter';
import { createBlankDocument, createHtmlWidget } from '../model/templateModel';
import { compileDocumentBodyToHtml } from '../model/htmlCompiler';

export function getTemplateMode(template) {
  if (template.kind === 'communication') {
    if (!['email', 'sms'].includes(template.subtype)) throw new Error('Unsupported message template type.');
    return template.subtype;
  }
  if (template.kind === 'estimate_portal') return 'estimate';
  if (template.kind === 'invoice') return 'invoice';
  if (template.kind !== 'document') throw new Error('Unsupported template kind.');
  if (template.subtype === 'cc_authorization') return 'cc_auth';
  return template.subtype === 'bol' ? 'bol' : 'contract';
}

export function fromGlobalDocument(document, meta) {
  if (!['email', 'sms'].includes(meta.mode)) return fromBackendDocument(document, meta);
  const doc = createBlankDocument('Letter', 'Portrait');
  doc.name = meta.name;
  doc.settings = { ...doc.settings, subject: document.subject || '' };
  doc.smsText = document.body_text ?? '';
  if (meta.mode === 'email' && (document.body_html || document.body_text)) {
    const html = document.body_html || document.body_text.split('\n').map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('<br>');
    const item = createHtmlWidget(html, '', 'Email content');
    item.globalEmailBody = true;
    doc.items = [item];
    doc.pages = [{ id: 'page-1', name: 'Page 1', items: [item] }];
  }
  return doc;
}

export function toGlobalDocument(doc, mode, smsText = '') {
  if (mode === 'sms') return { subject: '', body_html: '', body_text: smsText };
  if (mode === 'email') return { subject: doc.settings?.subject || '', body_html: compileDocumentBodyToHtml(doc), body_text: '' };
  return toBackendDocument(doc, mode);
}

export { isTemplateForMode } from '../../../../../../../shared/template-builder/core/templateBoundary.js';
