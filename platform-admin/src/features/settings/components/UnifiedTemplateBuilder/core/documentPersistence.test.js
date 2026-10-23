import { describe, expect, it } from 'vitest';
import * as platform from './documentAdapter';
import * as tenant from '../../../../../../../frontend/src/features/settings/components/UnifiedTemplateBuilder/core/documentAdapter.js';

const block = (id, text) => ({ id, type: 'builder_block', blockType: 'text', props: { html: `<p>${text}</p>` } });
const source = () => ({
  settings: {
    page: { size: 'Letter', orientation: 'portrait', margins: { top: 0, right: 12, bottom: 24, left: 36 } },
    theme: { font_family: 'Georgia', primary_color: '#112233', accent_color: '#445566', logo_asset_id: null },
    portal: { allow_option_selection: false, require_signature: false, collect_deposit: false },
  },
  header: [], footer: [], rules: [], attachments: [],
  sections: [{ key: 'main', title: 'Main', page_break_before: false,
    blocks: [{ key: 'summary', type: 'estimate_summary', props: {} }] }],
});

describe.each([['platform', platform], ['tenant', tenant]])('%s document persistence', (_name, adapter) => {
  it('preserves false portal flags, zero margins, and theme on an unchanged save', () => {
    const original = source();
    const loaded = adapter.fromBackendDocument(original, { mode: 'estimate' });
    expect(adapter.toBackendDocument(loaded, 'estimate').settings).toEqual(original.settings);
    expect(original).toEqual(source());
  });

  it('saves the page controls instead of stale values from hydration', () => {
    const doc = adapter.fromBackendDocument(source());
    doc.settings = { ...doc.settings, pageSize: 'Legal', orientation: 'Landscape',
      margins: { ...doc.settings.margins, left: 0 }, portal: { ...doc.settings.portal, collect_deposit: true } };
    const result = adapter.toBackendDocument(doc, 'estimate');
    expect(result.settings.page).toEqual({ size: 'Legal', orientation: 'landscape', margins: { top: 0, right: 12, bottom: 24, left: 0 } });
    expect(result.settings.portal).toEqual({ allow_option_selection: false, require_signature: false, collect_deposit: true });
  });

  it('preserves new pages, intentional blank pages, and all page contents after reopening', () => {
    const first = block('first', 'Page one');
    const last = block('last', 'Page three');
    const doc = { settings: {}, items: [first, last], pages: [
      { id: 'page-1', items: [first] }, { id: 'page-2', items: [] }, { id: 'page-3', items: [last] },
    ] };
    const saved = adapter.toBackendDocument(doc, 'contract');
    expect(saved.sections.map((section) => section.page_break_before)).toEqual([false, true, true]);
    expect(new Set(saved.sections.map((section) => section.key)).size).toBe(3);
    const loaded = adapter.fromBackendDocument(saved);
    expect(loaded.pages.map((page) => page.items.map((item) => item.id))).toEqual([['first'], [], ['last']]);
    expect(adapter.toBackendDocument(loaded, 'contract')).toMatchObject(saved);
  });

  it('keeps section visibility, nested blocks, rules, and regions when splitting a section across pages', () => {
    const original = source();
    original.sections[0].visible_when = 'visible';
    original.rules = [{ key: 'visible', when: { var: 'company.name', op: 'not_empty' }, then: [{ action: 'show', target: 'main' }] }];
    const doc = adapter.fromBackendDocument(original);
    const duplicate = { ...doc.items[0], id: 'other' };
    doc.pages.push({ id: 'page-2', items: [duplicate] });
    const saved = adapter.toBackendDocument(doc, 'estimate');
    expect(saved.sections.map((section) => section.visible_when)).toEqual(['visible', 'visible']);
    expect(saved.sections[1].page_break_before).toBe(true);
    expect(saved.sections[0].key).not.toBe(saved.sections[1].key);
    expect(saved.rules).toEqual(original.rules);
  });
});

it('both applications use the same document conversion implementation', () => {
  expect(platform.toBackendDocument).toBe(tenant.toBackendDocument);
  expect(platform.fromBackendDocument).toBe(tenant.fromBackendDocument);
});
