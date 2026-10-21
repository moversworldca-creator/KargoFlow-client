import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UnifiedTemplateBuilder from './UnifiedTemplateBuilder';
import { createBlankDocument } from './model/templateModel';
import * as api from '../../../../services/api';

vi.mock('../../../../services/api', async (original) => ({
  ...await original(), saveBuilderTemplateDraft: vi.fn(), validateBuilderTemplateDraft: vi.fn(),
  publishBuilderTemplateDraft: vi.fn(), startBuilderTemplateDraft: vi.fn(), discardBuilderTemplateDraft: vi.fn(),
  previewBuilderTemplate: vi.fn(),
}));
vi.mock('./components/LeftSidebar', () => ({ default: () => null }));
vi.mock('./components/RightPropertiesPanel', () => ({ default: () => null }));
vi.mock('./components/DocumentCanvas', () => ({ default: ({ items = [], smsText, onSmsTextChange, onOpenHtmlEditor, onUpdateItem }) =>
  <>
    <textarea aria-label="SMS content" value={smsText} onChange={(event) => onSmsTextChange(event.target.value)} />
    {items.filter((item) => item.type === 'html').map((item) => (
      <button key={item.id} type="button" onClick={() => onOpenHtmlEditor(item)}>Edit HTML {item.id}</button>
    ))}
    {items.filter((item) => item.type === 'builder_block').map((item) => (
      <div key={item.id}>
        <button
          type="button"
          onClick={() => onUpdateItem({ ...item, props: { ...item.props, show_tax: false } })}
        >
          Update widget {item.id}
        </button>
        <output aria-label={`Widget props ${item.id}`}>{JSON.stringify(item.props)}</output>
      </div>
    ))}
  </> }));

function showEditor({ items = [], ...props } = {}) {
  const content = createBlankDocument('Letter', 'Portrait');
  content.name = 'Global template';
  content.smsText = 'Old reminder';
  content.items = items;
  content.pages[0].items = items;
  return render(<UnifiedTemplateBuilder template={{ id: 7, name: content.name, content, lock_version: 5,
    isHydratedFromServer: true, published_revision: { id: 3 } }} mode="sms" {...props} />);
}
beforeEach(() => {
  vi.clearAllMocks();
  let lock = 5;
  api.saveBuilderTemplateDraft.mockImplementation(async () => ({ data: { revision: { lock_version: ++lock } } }));
  api.validateBuilderTemplateDraft.mockResolvedValue({ data: { valid: true, errors: [] } });
  api.publishBuilderTemplateDraft.mockResolvedValue({ data: {} });
  api.startBuilderTemplateDraft.mockResolvedValue({ data: { revision: { lock_version: 1 } } });
});

describe('Global editor persistence', () => {
  it('saves SMS once, including clearing text, and uses the returned version on the next save', async () => {
    const metadata = vi.fn();
    showEditor({ onSave: metadata });
    fireEvent.change(screen.getByLabelText('SMS content'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Save Template'));
    await waitFor(() => expect(metadata).toHaveBeenCalledTimes(1));
    expect(api.saveBuilderTemplateDraft).toHaveBeenCalledExactlyOnceWith(7, {
      lock_version: 5, document: { subject: '', body_html: '', body_text: '' },
    });
    await waitFor(() => expect(screen.getByLabelText('Save Template')).toBeEnabled());
    fireEvent.click(screen.getByLabelText('Save Template'));
    await waitFor(() => expect(api.saveBuilderTemplateDraft).toHaveBeenCalledTimes(2));
    expect(api.saveBuilderTemplateDraft.mock.calls[1][1].lock_version).toBe(6);
  });

  it('aborts publication when draft saving conflicts', async () => {
    api.saveBuilderTemplateDraft.mockRejectedValue({ response: { status: 409, data: { detail: 'Draft changed elsewhere.' } } });
    const metadata = vi.fn();
    showEditor({ onSave: metadata });
    fireEvent.click(screen.getByLabelText('Publish Template'));
    expect(await screen.findByText('Draft changed elsewhere.')).toBeInTheDocument();
    expect(api.validateBuilderTemplateDraft).not.toHaveBeenCalled();
    expect(api.publishBuilderTemplateDraft).not.toHaveBeenCalled();
    expect(metadata).not.toHaveBeenCalled();
  });

  it('does not publish invalid drafts or show a success message', async () => {
    api.validateBuilderTemplateDraft.mockResolvedValue({ data: { valid: false, errors: [{ message: 'A text message needs a body.' }] } });
    showEditor();
    fireEvent.click(screen.getByLabelText('Publish Template'));
    expect(await screen.findByText('A text message needs a body.')).toBeInTheDocument();
    expect(api.publishBuilderTemplateDraft).not.toHaveBeenCalled();
    expect(screen.queryByText('Template published successfully.')).not.toBeInTheDocument();
  });

  it('starts a fresh draft for the next save after publishing', async () => {
    showEditor();
    fireEvent.click(screen.getByLabelText('Publish Template'));
    await screen.findByText('Template published successfully.');
    fireEvent.click(screen.getByLabelText('Save Template'));
    await waitFor(() => expect(api.startBuilderTemplateDraft).toHaveBeenCalledExactlyOnceWith(7));
    await waitFor(() => expect(api.saveBuilderTemplateDraft).toHaveBeenCalledTimes(2));
    expect(api.saveBuilderTemplateDraft.mock.calls[1][1].lock_version).toBe(1);
  });

  it('keeps the selected HTML editor open when applying multiple edits', async () => {
    showEditor({
      items: [{
        id: 'html-1',
        type: 'html',
        label: 'Custom HTML',
        htmlContent: '<p>Original block</p>',
        content: '<p>Original block</p>',
      }],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Edit HTML html-1' }));
    const editor = screen.getByPlaceholderText('Write or paste HTML/CSS code here...');
    expect(editor).toHaveValue('<p>Original block</p>');

    fireEvent.change(editor, { target: { value: '<p>First update</p>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));
    expect(screen.getByRole('heading', { name: 'HTML & CSS Code Editor' })).toBeInTheDocument();
    expect(editor).toHaveValue('<p>First update</p>');

    fireEvent.change(editor, { target: { value: '<p>Second update</p>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Changes' }));
    expect(editor).toHaveValue('<p>Second update</p>');
  });

  it('saves edited widget configuration and retains it when the draft save fails', async () => {
    const item = {
      id: 'estimate-summary-1',
      type: 'builder_block',
      label: 'Estimate summary',
      blockType: 'estimate_summary',
      props: { show_discount: true, show_tax: true, show_deposit: false },
      children: [],
    };
    showEditor({ mode: 'estimate', items: [item] });
    fireEvent.click(screen.getByRole('button', { name: 'Update widget estimate-summary-1' }));
    fireEvent.click(screen.getByLabelText('Save Template'));

    await waitFor(() => expect(api.saveBuilderTemplateDraft).toHaveBeenCalledTimes(1));
    expect(api.saveBuilderTemplateDraft.mock.calls[0][1].document.sections[0].blocks[0]).toEqual({
      key: 'estimate-summary-1',
      type: 'estimate_summary',
      props: { show_discount: true, show_tax: false, show_deposit: false },
      children: [],
    });

    api.saveBuilderTemplateDraft.mockRejectedValueOnce({
      response: { status: 409, data: { detail: 'Draft changed elsewhere.' } },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update widget estimate-summary-1' }));
    fireEvent.click(screen.getByLabelText('Save Template'));

    expect(await screen.findByText('Draft changed elsewhere.')).toBeInTheDocument();
    expect(screen.getByLabelText('Widget props estimate-summary-1')).toHaveTextContent('"show_tax":false');
    expect(screen.getByTitle('Unsaved changes')).toBeInTheDocument();
    expect(api.saveBuilderTemplateDraft).toHaveBeenCalledTimes(2);
  });

  it('disables persistence for view-only staff and previews unsaved content through the server', async () => {
    api.previewBuilderTemplate.mockResolvedValue({ data: { body_text: 'Sample SMS' } });
    showEditor({ canSave: false, canPublish: false });
    expect(screen.getByLabelText('Save Template')).toBeDisabled();
    expect(screen.queryByLabelText('Publish Template')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Preview Template'));
    expect(await screen.findByText('Sample SMS')).toBeInTheDocument();
    expect(api.previewBuilderTemplate).toHaveBeenCalledExactlyOnceWith(7, {
      document: { subject: '', body_html: '', body_text: 'Old reminder' }, format: 'both',
    });
    expect(api.saveBuilderTemplateDraft).not.toHaveBeenCalled();
  });
});
