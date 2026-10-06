import { describe, expect, it } from 'vitest';
import { normalizePreviewHtml, renderBranchLogoAsImage, replaceBranchLogoUrlTokens } from './emailPreview';

describe('emailPreview helpers', () => {
  it('renders a standalone branch logo url as an image in preview html', () => {
    const html = '<div>https://cdn.acme.test/logo.png</div>';

    const rendered = normalizePreviewHtml(html, 'https://cdn.acme.test/logo.png');

    expect(rendered).toContain('<img');
    expect(rendered).toContain('src="https://cdn.acme.test/logo.png"');
    expect(rendered).not.toContain('https://cdn.acme.test/logo.png</div>');
  });

  it('replaces the branch logo token with the resolved url', () => {
    const html = '<img src="{{branch_logo_url}}" alt="Logo" />';

    expect(replaceBranchLogoUrlTokens(html, 'https://cdn.acme.test/logo.png')).toContain('src="https://cdn.acme.test/logo.png"');
  });

  it('replaces the branch name token in preview html', () => {
    const html = '<div>{{branch_name}}</div>';

    const rendered = normalizePreviewHtml(html, {
      branchLogoUrl: 'https://cdn.acme.test/logo.png',
      branchName: 'Main Branch',
    });

    expect(rendered).toContain('Main Branch');
    expect(rendered).not.toContain('{{branch_name}}');
  });

  it('leaves non-standalone text unchanged when embedding the branch logo image', () => {
    const html = '<p>Logo: https://cdn.acme.test/logo.png</p>';

    expect(renderBranchLogoAsImage(html, 'https://cdn.acme.test/logo.png')).toContain('Logo: https://cdn.acme.test/logo.png');
  });

  it('injects preview css that keeps wide email tables and headings contained', () => {
    const html = '<table><tr><td><h2>Move Cancellation Notice</h2></td></tr></table>';

    const rendered = normalizePreviewHtml(html);

    expect(rendered).toContain('table-layout: fixed');
    expect(rendered).toContain('overflow-wrap: anywhere');
    expect(rendered).toContain('max-width: 100%');
  });
});
