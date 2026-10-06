import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EmailVisualBuilder, { normalizeAutomationBrandingBlocks } from './EmailVisualBuilder';

const createDataTransfer = () => {
  const store = {};
  return {
    effectAllowed: '',
    dropEffect: '',
    setData: (type, value) => {
      store[type] = String(value);
    },
    getData: (type) => store[type] || '',
    setDragImage: vi.fn(),
    types: [],
  };
};

const buildBuilderValue = (content) => {
  const payload = encodeURIComponent(JSON.stringify({
    blocks: [
      {
        id: 'block-1',
        type: 'typography',
        content,
        style: {
          textAlign: 'left',
          fontSize: '16px',
          color: '#333333',
          padding: '20px',
        },
      },
    ],
    settings: {
      contentAreaWidth: 900,
      contentAreaAlignment: 'center',
      backgroundColor: '#ffffff',
      contentAreaBgColor: 'transparent',
      backgroundImage: false,
      backgroundImageUrl: '',
      defaultFont: 'Arial, sans-serif',
      linkColor: '#0068a5',
      title: '',
      language: 'en',
    },
  }));

  return `<!DOCTYPE html><html><body><!-- BUILDER_DATA:${payload} --></body></html>`;
};

const buildRowBuilderValue = (content) => {
  const payload = encodeURIComponent(JSON.stringify({
    blocks: [
      {
        id: 'row-1',
        type: 'row',
        layout: '2-2',
        style: {
          padding: '12px 20px',
          gap: '16px',
          backgroundColor: 'transparent',
        },
        columns: [
          {
            id: 'col-1',
            width: '50%',
            style: {
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '0px',
            },
            blocks: [
              {
                id: 'row-text-1',
                type: 'typography',
                content,
                style: {
                  textAlign: 'left',
                  fontSize: '16px',
                  color: '#333333',
                  padding: '20px',
                },
              },
            ],
          },
          {
            id: 'col-2',
            width: '50%',
            style: {
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '0px',
            },
            blocks: [],
          },
        ],
      },
    ],
    settings: {
      contentAreaWidth: 900,
      contentAreaAlignment: 'center',
      backgroundColor: '#ffffff',
      contentAreaBgColor: 'transparent',
      backgroundImage: false,
      backgroundImageUrl: '',
      defaultFont: 'Arial, sans-serif',
      linkColor: '#0068a5',
      title: '',
      language: 'en',
    },
  }));

  return `<!DOCTYPE html><html><body><!-- BUILDER_DATA:${payload} --></body></html>`;
};

describe('EmailVisualBuilder', () => {
  it('starts blank emails with a branch logo header block', async () => {
    render(<EmailVisualBuilder value="" branchLogoUrl="https://cdn.acme.test/logo.png" branchName="Main Branch" onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.acme.test/logo.png');
    });
    expect(screen.getByText('Main Branch')).toBeInTheDocument();
  });

  it('keeps live edits when inserting a variable from the toolbar', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <EmailVisualBuilder
        value={buildBuilderValue('<p>KEEP_THIS_TEMPLATE</p>')}
        onChange={onChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('KEEP_THIS_TEMPLATE')).toBeInTheDocument();
    });
    onChange.mockClear();

    const editable = screen.getByText('KEEP_THIS_TEMPLATE');
    editable.innerHTML = '<p>KEPT_EDITED</p>';
    fireEvent.input(editable);
    fireEvent.blur(editable);

    rerender(
      <EmailVisualBuilder
        value={buildBuilderValue('<p>KEEP_THIS_TEMPLATE</p>')}
        onChange={onChange}
        insertTokenRequest={{ id: 1, token: '{{customer_name}}' }}
      />
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });

    const latestHtml = onChange.mock.calls.at(-1)?.[0] || '';
    expect(latestHtml).toContain('KEPT_EDITED');
    expect(latestHtml).toContain('{{customer_name}}');
    expect(latestHtml).not.toContain('KEEP_THIS_TEMPLATE');
  });

  it('allows typing inside a row column text block', async () => {
    const onChange = vi.fn();
    render(
      <EmailVisualBuilder
        value={buildRowBuilderValue('ROW_TEXT')}
        onChange={onChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('ROW_TEXT')).toBeInTheDocument();
    });
    onChange.mockClear();

    const editable = screen.getByText('ROW_TEXT');
    editable.innerHTML = '<p>ROW_EDITED</p>';
    fireEvent.input(editable);
    fireEvent.blur(editable);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });

    const latestHtml = onChange.mock.calls.at(-1)?.[0] || '';
    expect(latestHtml).toContain('ROW_EDITED');
  });

  it('preserves the branch logo when dragging the header block into the canvas', async () => {
    const { container } = render(
      <EmailVisualBuilder
        value=""
        branchLogoUrl="https://cdn.acme.test/logo.png"
        branchName="Main Branch"
        onChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.acme.test/logo.png');
    });

    const headerPalette = Array.from(container.querySelectorAll('[draggable="true"]')).find((node) =>
      String(node.textContent || '').includes('HEADER')
    );
    expect(headerPalette).toBeTruthy();

    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(headerPalette, { dataTransfer });

    const canvasDropTarget = container.querySelector('.email-builder-canvas')?.parentElement?.parentElement;
    expect(canvasDropTarget).toBeTruthy();

    fireEvent.drop(canvasDropTarget, { dataTransfer });

    await waitFor(() => {
      expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(2);
    });

    const imgs = screen.getAllByRole('img');
    expect(imgs.some((img) => img.getAttribute('src') === 'https://cdn.acme.test/logo.png')).toBe(true);
  });

  it('emits responsive table hooks for mobile email rendering', async () => {
    const onChange = vi.fn();
    render(
      <EmailVisualBuilder
        value={buildRowBuilderValue('ROW_TEXT')}
        onChange={onChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('ROW_TEXT')).toBeInTheDocument();
    });

    onChange.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /preview/i }));

    await waitFor(() => {
      expect(onChange).not.toHaveBeenCalled();
    });

    const html = buildRowBuilderValue('ROW_TEXT');
    expect(html).toContain('BUILDER_DATA');
    expect(html).toContain('ROW_TEXT');
  });

  it('resolves relative branch logo urls in the builder header', async () => {
    render(
      <EmailVisualBuilder
        value=""
        branchLogoUrl="/media/branch_logos/logo.png"
        branchName="Main Branch"
        onChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src');
    });

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('/media/branch_logos/logo.png');
  });

  it('normalizes automation branding blocks to dynamic branch tokens', () => {
    const blocks = [
      {
        id: 'header-1',
        type: 'brandHeader',
        logoUrl: 'https://cdn.example.com/amazon-logo.png',
        companyName: 'Amazonvanlines',
        style: {},
      },
      {
        id: 'footer-1',
        type: 'brandFooter',
        address: '123 Static St',
        contact: '111-222-3333 | branch@example.com',
        style: {},
      },
    ];

    expect(normalizeAutomationBrandingBlocks(blocks)).toEqual([
      expect.objectContaining({
        type: 'brandHeader',
        logoUrl: '',
        companyName: '{{branch_name}}',
      }),
      expect.objectContaining({
        type: 'brandFooter',
        address: '{{branch_address}}',
        contact: '{{branch_phone}} | {{branch_email}}',
      }),
    ]);
  });
});
