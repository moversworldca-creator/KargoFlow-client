import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import VersionHistoryModal from './VersionHistoryModal';
import * as api from '../../../../../services/api';

vi.mock('../../../../../services/api', async (original) => ({
  ...await original(), getBuilderTemplateRevisions: vi.fn(), restoreBuilderTemplateRevision: vi.fn(), discardBuilderTemplateDraft: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  api.getBuilderTemplateRevisions.mockResolvedValue({ data: [{ id: 2, revision_number: 1, state: 'published' }] });
  api.discardBuilderTemplateDraft.mockResolvedValue({});
});

describe('Global revision restore', () => {
  it('replaces the draft and returns its document and lock version to the editor', async () => {
    const draft = { document: { body_text: 'Restored SMS' }, revision: { lock_version: 1 }, template: { id: 7 } };
    api.restoreBuilderTemplateRevision.mockResolvedValue({ data: draft });
    const onRestore = vi.fn();
    const onClose = vi.fn();
    render(<VersionHistoryModal isOpen templateId={7} onClose={onClose} onRestoreServerDraft={onRestore} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(onRestore).toHaveBeenCalledExactlyOnceWith(draft));
    expect(api.discardBuilderTemplateDraft).toHaveBeenCalledExactlyOnceWith(7);
    expect(api.restoreBuilderTemplateRevision).toHaveBeenCalledExactlyOnceWith(7, 2);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps the modal open and shows a restore failure', async () => {
    api.restoreBuilderTemplateRevision.mockRejectedValue({ response: { data: { detail: 'A concurrent draft is already open.' } } });
    const onClose = vi.fn();
    render(<VersionHistoryModal isOpen templateId={7} onClose={onClose} onRestoreServerDraft={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A concurrent draft is already open.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('prevents view-only staff from replacing a draft', async () => {
    render(<VersionHistoryModal isOpen templateId={7} canRestore={false} onClose={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Restore' })).toBeDisabled();
    expect(api.discardBuilderTemplateDraft).not.toHaveBeenCalled();
    expect(api.restoreBuilderTemplateRevision).not.toHaveBeenCalled();
  });
});
