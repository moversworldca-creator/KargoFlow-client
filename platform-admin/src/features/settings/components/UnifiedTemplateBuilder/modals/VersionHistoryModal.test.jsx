import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import VersionHistoryModal from './VersionHistoryModal';
import * as api from '../../../../../services/api';

vi.mock('../../../../../services/api', async (original) => ({
  ...await original(), getBuilderTemplateRevisions: vi.fn(), restoreBuilderTemplateRevision: vi.fn(), discardBuilderTemplateDraft: vi.fn(),
  compareBuilderTemplateRevisions: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  api.getBuilderTemplateRevisions.mockResolvedValue({ data: [{ id: 2, revision_number: 1, state: 'published' }] });
  api.discardBuilderTemplateDraft.mockResolvedValue({});
});

describe('Global revision restore', () => {
  it('compares selected revisions without modifying the draft', async () => {
    api.getBuilderTemplateRevisions.mockResolvedValue({ data: [
      { id: 3, revision_number: 2, state: 'draft' }, { id: 2, revision_number: 1, state: 'published' },
    ] });
    api.compareBuilderTemplateRevisions.mockResolvedValue({ data: {
      has_changes: true, settings: [{ path: 'portal.collect_deposit', before: false, after: true }],
    } });
    render(<VersionHistoryModal isOpen templateId={7} canRestore={false} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Compare revisions' }));
    expect(await screen.findByText('portal.collect_deposit')).toBeInTheDocument();
    expect(api.compareBuilderTemplateRevisions).toHaveBeenCalledExactlyOnceWith(7, '2', '3');
    expect(screen.getByRole('table')).toHaveTextContent('false');
    expect(screen.getByRole('table')).toHaveTextContent('true');
    expect(api.discardBuilderTemplateDraft).not.toHaveBeenCalled();
  });

  it('shows comparison errors and permits retrying', async () => {
    api.getBuilderTemplateRevisions.mockResolvedValue({ data: [
      { id: 3, revision_number: 2, state: 'draft' }, { id: 2, revision_number: 1, state: 'published' },
    ] });
    api.compareBuilderTemplateRevisions.mockRejectedValueOnce({ response: { data: { detail: 'Revision unavailable.' } } })
      .mockResolvedValueOnce({ data: { has_changes: false } });
    render(<VersionHistoryModal isOpen templateId={7} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Compare revisions' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Revision unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Compare revisions' }));
    expect(await screen.findByText('No changes between these revisions.')).toBeInTheDocument();
  });
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
