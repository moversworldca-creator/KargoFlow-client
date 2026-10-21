import { describe, expect, it } from 'vitest';
import { fromGlobalDocument, getTemplateMode, toGlobalDocument } from './globalTemplateAdapter';

describe('Global template document adapter', () => {
  it('maps every catalog kind and communication channel to the existing canvas', () => {
    for (const [kind, subtype, mode] of [
      ['communication', 'email', 'email'], ['communication', 'sms', 'sms'],
      ['estimate_portal', 'binding', 'estimate'], ['invoice', 'final', 'invoice'],
      ['document', 'contract', 'contract'], ['document', 'bol', 'bol'], ['document', 'cc_authorization', 'cc_auth'],
    ]) expect(getTemplateMode({ kind, subtype })).toBe(mode);
  });

  it('round-trips email HTML repeatedly without adding document wrappers or changing merge fields', () => {
    let wire = { subject: 'Hello {{customer.first_name}}', body_html: '<p>Welcome to {{company.name}}</p>', body_text: '' };
    for (let n = 0; n < 3; n += 1) {
      const doc = fromGlobalDocument(wire, { mode: 'email', name: 'Welcome' });
      wire = toGlobalDocument(doc, 'email');
      expect(wire).toEqual({ subject: 'Hello {{customer.first_name}}', body_html: '<p>Welcome to {{company.name}}</p>', body_text: '' });
    }
  });

  it('escapes a plain-text email fallback and preserves an intentionally empty SMS', () => {
    const email = fromGlobalDocument({ subject: 'Welcome', body_text: '<unsafe> & text' }, { mode: 'email', name: 'Email' });
    expect(toGlobalDocument(email, 'email').body_html).toBe('&lt;unsafe&gt; &amp; text');
    const sms = fromGlobalDocument({ body_text: 'Old message' }, { mode: 'sms', name: 'SMS' });
    expect(sms.smsText).toBe('Old message');
    expect(toGlobalDocument(sms, 'sms', '')).toEqual({ subject: '', body_html: '', body_text: '' });
  });

  it('retains native Builder blocks and merge fields for documents, estimates and invoices', () => {
    for (const [mode, blockType] of [['contract', 'signature'], ['estimate', 'estimate_summary'], ['invoice', 'line_items']]) {
      const native = { settings: {}, header: [{ key: 'company', type: 'text', props: { html: '{{company.name}}' } }], footer: [],
        sections: [{ key: 'main', title: 'Main', blocks: [{ key: 'block', type: blockType, props: {} }] }], rules: [], attachments: [] };
      const doc = fromGlobalDocument(native, { mode, name: 'Template' });
      const wire = toGlobalDocument(doc, mode);
      expect(wire.header).toEqual(native.header);
      expect(wire.sections[0].blocks[0].type).toBe(blockType);
    }
  });
});
