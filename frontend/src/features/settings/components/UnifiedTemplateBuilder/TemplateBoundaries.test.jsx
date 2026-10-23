import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import UnifiedTemplateBuilder from './UnifiedTemplateBuilder';
import { createBlankDocument } from './model/templateModel';
import { loadLibrarySync } from './core/storageService';

vi.mock('./core/storageService', async (original) => ({ ...await original(), loadLibrarySync: vi.fn(() => []) }));
vi.mock('./components/TopNavbar', () => ({ default: ({ title }) => <h1>{title}</h1> }));
vi.mock('./components/LeftSidebar', () => ({ default: ({ library, onLoadFromLibrary }) => <>
  <output data-testid="library">{library.map((item) => item.name).join(', ')}</output>
  <button onClick={() => onLoadFromLibrary({ mode: 'estimate', name: 'Estimate layout', items: [] })}>Load estimate</button>
</> }));
vi.mock('./components/RightPropertiesPanel', () => ({ default: () => null }));
vi.mock('./components/DocumentCanvas', () => ({ default: () => null }));

function show() {
  const content = createBlankDocument('Letter', 'Portrait');
  content.name = 'Invoice layout';
  const items = [{ id: 'text', type: 'text', text: 'Invoice content' }];
  return render(<UnifiedTemplateBuilder mode="invoice" template={{ name: content.name, settings: content.settings, items, pages: [{ id: 'page-1', items }] }} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  loadLibrarySync.mockReturnValue([]);
});

describe('Tenant editor template boundaries', () => {
  it('shows only saved templates for its editor mode', () => {
    loadLibrarySync.mockReturnValue([
      { name: 'Saved invoice', mode: 'invoice' },
      { name: 'Saved estimate', mode: 'estimate' },
      { name: 'Saved contract', mode: 'contract' },
    ]);
    show();
    expect(screen.getByTestId('library')).toHaveTextContent('Saved invoice');
    expect(screen.getByTestId('library')).not.toHaveTextContent('Saved estimate');
    expect(screen.getByTestId('library')).not.toHaveTextContent('Saved contract');
  });

  it('rejects loading an estimate into an invoice editor', async () => {
    show();
    fireEvent.click(screen.getByText('Load estimate'));
    expect(await screen.findByText('Choose a saved template from this editor type.')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('Invoice layout');
  });

  it('rejects importing an estimate file into an invoice editor', async () => {
    const { container } = show();
    const file = { size: 100, text: async () => JSON.stringify({ mode: 'estimate', name: 'Wrong template' }) };
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
    expect(await screen.findByText('Import a template exported from this editor type.')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('Invoice layout');
  });
});
