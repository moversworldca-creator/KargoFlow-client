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
vi.mock('./components/DocumentCanvas', () => ({ default: ({ smsText, onSmsTextChange }) =>
  <textarea aria-label="SMS content" value={smsText} onChange={(event) => onSmsTextChange(event.target.value)} /> }));

function showEditor(props = {}) {
  const content = createBlankDocument('Letter', 'Portrait');
  content.name = 'Global template';
  content.smsText = 'Old reminder';
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
