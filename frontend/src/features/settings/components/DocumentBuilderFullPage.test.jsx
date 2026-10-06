import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DocumentBuilderFullPage from './DocumentBuilderFullPage';

const createDataTransfer = () => {
  const values = new Map();
  return {
    effectAllowed: 'all',
    dropEffect: 'none',
    setData: vi.fn((type, value) => values.set(type, value)),
    getData: vi.fn((type) => values.get(type) || ''),
  };
};

const renderBuilder = (htmlContent = '', registry = []) => {
  const onChange = vi.fn();
  render(
    <DocumentBuilderFullPage
      draft={{ name: 'Test document', template_type: 'Contract', html_content: htmlContent }}
      onChange={onChange}
      onSave={vi.fn()}
      onBack={vi.fn()}
      onPreview={vi.fn()}
      registry={registry}
    />,
  );
  return onChange;
};

describe('DocumentBuilderFullPage drag and drop', () => {
  it('drops a toolkit widget onto an empty document', () => {
    const onChange = renderBuilder();
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(screen.getByText('Simple Heading'), { dataTransfer });
    fireEvent.drop(screen.getByTestId('document-empty-drop-zone'), { dataTransfer });

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0].html_content).toContain('>Heading</div>');
  });

  it('inserts a toolkit widget at the selected lane', () => {
    const existingHtml = '<p>First</p>\n<!-- BLOCK_SEPARATOR -->\n<p>Second</p>';
    const onChange = renderBuilder(existingHtml);
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(screen.getByText('Simple Heading'), { dataTransfer });
    fireEvent.drop(screen.getByTestId('document-drop-zone-1'), { dataTransfer });

    const updatedHtml = onChange.mock.calls[0][0].html_content;
    expect(updatedHtml.indexOf('First')).toBeLessThan(updatedHtml.indexOf('>Heading</div>'));
    expect(updatedHtml.indexOf('>Heading</div>')).toBeLessThan(updatedHtml.indexOf('Second'));
  });

  it('inserts a variable token from the sidebar into the document', () => {
    const onChange = renderBuilder('', [
      {
        label: 'Customer',
        entity: 'customer',
        fields: [
          { key: 'Customer.full_name', description: 'Customer full name' },
        ],
      },
    ]);

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Variables' }));
    fireEvent.click(screen.getByText('{{Customer.full_name}}'));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0].html_content).toContain('{{Customer.full_name}}');
  });
});
