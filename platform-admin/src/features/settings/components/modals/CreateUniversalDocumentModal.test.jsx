import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateUniversalDocumentModal from './CreateUniversalDocumentModal';
import { createBuilderTemplate, getBuilderMeta } from '../../../../services/api';

vi.mock('../../../../services/api', async (original) => ({
  ...await original(), getBuilderMeta: vi.fn(), createBuilderTemplate: vi.fn(),
}));
const kinds = [
  { kind: 'document', label: 'Document', subtypes: [{ key: 'contract', label: 'Contract' }] },
  { kind: 'invoice', label: 'Invoice', subtypes: [{ key: 'final', label: 'Final' }, { key: 'deposit', label: 'Deposit' }] },
  { kind: 'communication', label: 'Communication', subtypes: [{ key: 'email', label: 'Email' }, { key: 'sms', label: 'SMS' }] },
];
beforeEach(() => { vi.clearAllMocks(); getBuilderMeta.mockResolvedValue({ data: { kinds } }); });
describe('Global template creation', () => {
  it('loads backend variations without tenant or branch selection', async () => {
    render(<CreateUniversalDocumentModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('option', { name: 'Invoice' });
    expect(screen.queryByText(/tenant scope|select branch|workflow scopes/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'invoice' } });
    expect(screen.getByLabelText('Variation')).toHaveValue('final');
    expect(screen.getByRole('option', { name: 'Deposit' })).toBeInTheDocument();
  });
  it('creates an SMS catalog draft and preserves the created ID', async () => {
    const onCreated = vi.fn();
    createBuilderTemplate.mockResolvedValue({ data: { id: 42, kind: 'communication', subtype: 'sms' } });
    render(<CreateUniversalDocumentModal isOpen onClose={vi.fn()} onCreated={onCreated} />);
    await screen.findByRole('option', { name: 'Communication' });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Move reminder' } });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'communication' } });
    fireEvent.change(screen.getByLabelText('Variation'), { target: { value: 'sms' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create template' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }), expect.objectContaining({ mode: 'sms' })));
    expect(createBuilderTemplate).toHaveBeenCalledWith({ kind: 'communication', subtype: 'sms', name: 'Move reminder', category: 'general' });
  });
  it('shows server errors and keeps the form open', async () => {
    createBuilderTemplate.mockRejectedValue({ response: { data: { detail: 'Catalog permission denied.' } } });
    const onCreated = vi.fn();
    render(<CreateUniversalDocumentModal isOpen onClose={vi.fn()} onCreated={onCreated} />);
    await screen.findByRole('option', { name: 'Invoice' });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Invoice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create template' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Catalog permission denied.');
    expect(onCreated).not.toHaveBeenCalled();
  });
});
