import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { render as renderUI, screen } from '@testing-library/react';
import PlatformPreview from '../modals/PreviewModal';
import TenantPreview from '../../../../../../../frontend/src/features/settings/components/UnifiedTemplateBuilder/modals/PreviewModal';
import PlatformBlock from '../components/DocumentBlock';
import TenantBlock from '../../../../../../../frontend/src/features/settings/components/UnifiedTemplateBuilder/components/DocumentBlock';
import * as platformAdapter from './documentAdapter';
import * as tenantAdapter from '../../../../../../../frontend/src/features/settings/components/UnifiedTemplateBuilder/core/documentAdapter';
import * as platformCompiler from '../model/htmlCompiler';
import * as tenantCompiler from '../../../../../../../frontend/src/features/settings/components/UnifiedTemplateBuilder/model/htmlCompiler';
import { getDocumentSurfaceStyle } from '../../../../../../../shared/template-builder/core/documentPresentation';

const document = {
  settings: {
    page: { size: 'Legal', orientation: 'landscape', margins: { top: 0, right: 12, bottom: 24, left: 60 } },
    theme: { font_family: 'Georgia', primary_color: '#112233', accent_color: '#445566', logo_asset_id: null },
  },
  header: [], footer: [], rules: [], attachments: [],
  sections: [{ key: 'main', title: 'Main', blocks: [
    { key: 'title', type: 'heading', props: { text: 'Styled proposal', align: 'right', level: 2,
      style: { font_family: 'Georgia', font_size: 28, color: '#b91c1c', bold: true, italic: true } } },
    { key: 'terms', type: 'text', props: { html: '<p style="color:#166534;text-align:center">Styled terms</p>' } },
    { key: 'summary', type: 'estimate_summary', props: { show_tax: true, custom_fields: { tax: { label: 'Local tax', mode: 'custom', customValue: '42' } } } },
    { key: 'items', type: 'line_items', props: { show_quantity: true, show_rate: true, show_amount: true } },
  ] }],
};
const render = (Component, item) => renderToStaticMarkup(<Component item={item} preview sampleData={false}
  onSelect={() => {}} onUpdate={() => {}} onDelete={() => {}} onDuplicate={() => {}} />);

describe('Platform and tenant clone visual contract', () => {
  it.each(['contract', 'estimate', 'invoice'])('renders copied %s blocks with identical styles and alignment', (mode) => {
    const globalDoc = platformAdapter.fromBackendDocument(document, { mode, name: 'Styled template' });
    const clonedDoc = tenantAdapter.fromBackendDocument(structuredClone(document), { mode, name: 'Styled template' });
    expect(clonedDoc.settings).toEqual(globalDoc.settings);
    for (let index = 0; index < globalDoc.items.length; index += 1) {
      expect(render(TenantBlock, clonedDoc.items[index])).toBe(render(PlatformBlock, globalDoc.items[index]));
    }
    expect(render(TenantBlock, clonedDoc.items[0])).toContain('text-align:right');
    expect(render(TenantBlock, clonedDoc.items[0])).toContain('color:#b91c1c');
    expect(render(TenantBlock, clonedDoc.items[0])).toContain('font-size:28px');
    expect(tenantCompiler.compileDocumentToHtml(clonedDoc, mode)).toBe(platformCompiler.compileDocumentToHtml(globalDoc, mode));
    const saved = tenantAdapter.toBackendDocument(clonedDoc, mode);
    expect(saved.sections[0].blocks[0].props.style).toEqual(document.sections[0].blocks[0].props.style);
  });

  it('uses the same font and zero-preserving margins on canvas and in HTML export', () => {
    const doc = platformAdapter.fromBackendDocument(document);
    expect(getDocumentSurfaceStyle(doc.settings)).toMatchObject({ fontFamily: 'Georgia', paddingTop: 0, paddingRight: 12, paddingBottom: 24, paddingLeft: 60 });
    const html = tenantCompiler.compileDocumentToHtml(doc);
    expect(html).toContain('font-family: Georgia;');
    expect(html).toContain('padding: 0px 12px 24px 60px;');
  });

  it('applies identical saved font and margins to both preview sheets', () => {
    const doc = platformAdapter.fromBackendDocument(document, { mode: 'contract' });
    const platform = renderUI(<PlatformPreview isOpen doc={doc} mode="contract" onClose={() => {}} />);
    const globalSheet = screen.getByTestId('preview-sheet-1');
    expect(globalSheet).toHaveAttribute('data-template-document');
    expect(globalSheet.style.fontFamily).toBe('Georgia');
    expect(globalSheet.style.paddingTop).toBe('0px');
    expect(globalSheet.style.paddingLeft).toBe('60px');
    const globalStyle = globalSheet.style.cssText;
    platform.unmount();
    renderUI(<TenantPreview isOpen doc={structuredClone(doc)} mode="contract" onClose={() => {}} />);
    expect(screen.getByTestId('preview-sheet-1').style.cssText).toBe(globalStyle);
  });

  it('preserves scoped HTML colors and alignment in both applications', () => {
    const doc = { settings: {}, items: [{ id: 'colored-html', type: 'html',
      htmlContent: '<style>.notice { color: #b91c1c; text-align: right; }</style><p class="notice">Notice</p>',
      cssContent: '.notice { background-color: #fef3c7; }' }] };
    expect(render(TenantBlock, doc.items[0])).toBe(render(PlatformBlock, doc.items[0]));
    expect(tenantCompiler.compileDocumentToHtml(doc)).toBe(platformCompiler.compileDocumentToHtml(doc));
    expect(tenantCompiler.compileDocumentToHtml(doc)).toContain('color: #b91c1c');
    expect(tenantCompiler.compileDocumentToHtml(doc)).toContain('background-color: #fef3c7');
  });
});
