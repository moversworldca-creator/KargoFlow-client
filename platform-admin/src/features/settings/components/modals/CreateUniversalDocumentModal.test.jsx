import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateUniversalDocumentModal from './CreateUniversalDocumentModal';
import GlobalTemplateCreateForm from '../GlobalTemplateCreateForm';
import {
  createBuilderTemplate,
  duplicateBuilderTemplate,
  getBuilderMeta,
  getBuilderTemplates,
} from '../../../../services/api';

vi.mock('../../../../services/api', async (original) => ({
  ...await original(),
  getBuilderMeta: vi.fn(),
  getBuilderTemplates: vi.fn(),
  createBuilderTemplate: vi.fn(),
  duplicateBuilderTemplate: vi.fn(),
}));
const kinds = [
  { kind: 'document', label: 'Document', subtypes: [{ key: 'contract', label: 'Contract' }] },
  { kind: 'invoice', label: 'Invoice', subtypes: [{ key: 'final', label: 'Final' }, { key: 'deposit', label: 'Deposit' }] },
  { kind: 'communication', label: 'Communication', subtypes: [{ key: 'email', label: 'Email' }, { key: 'sms', label: 'SMS' }] },
];
beforeEach(() => {
  vi.clearAllMocks();
  getBuilderMeta.mockResolvedValue({ data: { kinds } });
  getBuilderTemplates.mockResolvedValue({ data: { count: 0, results: [] } });
});
describe('Global template creation', () => {
  it('loads backend variations and an empty starting-template list', async () => {
    render(<CreateUniversalDocumentModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('option', { name: 'Contract' });
    expect(screen.queryByText(/tenant scope|select branch|workflow scopes/i)).not.toBeInTheDocument();
    await waitFor(() => expect(getBuilderTemplates).toHaveBeenCalledWith({
      kind: 'document',
      subtype: 'contract',
      state: 'active',
      limit: 50,
      offset: 0,
    }));
    expect(screen.getByLabelText('Starting template')).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Blank template' })).toBeInTheDocument();
  });

  it('loads and duplicates a successful starting-template response', async () => {
    getBuilderTemplates.mockResolvedValue({
      data: { count: 1, results: [{ id: 7, name: 'Standard Contract' }] },
    });
    const onCreated = vi.fn();
    duplicateBuilderTemplate.mockResolvedValue({
      data: { id: 42, kind: 'document', subtype: 'contract' },
    });
    render(<CreateUniversalDocumentModal isOpen onClose={vi.fn()} onCreated={onCreated} />);
    await screen.findByRole('option', { name: 'Standard Contract (copy)' });
    fireEvent.change(screen.getByLabelText('Starting template'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Template title'), { target: { value: 'Contract copy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Document' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
      expect.objectContaining({ mode: 'contract' })
    ));
    expect(duplicateBuilderTemplate).toHaveBeenCalledWith('7', { name: 'Contract copy' });
  });

  it('creates an SMS catalog draft when initialized for communications', async () => {
    const onCreated = vi.fn();
    createBuilderTemplate.mockResolvedValue({
      data: { id: 42, kind: 'communication', subtype: 'sms' },
    });
    render(
      <GlobalTemplateCreateForm
        initialKind="communication"
        onClose={vi.fn()}
        onCreated={onCreated}
      />
    );
    await screen.findByRole('option', { name: 'SMS' });
    fireEvent.change(screen.getByLabelText('Template title'), {
      target: { value: 'Move reminder' },
    });
    fireEvent.change(screen.getByLabelText('Message type'), { target: { value: 'sms' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Document' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, subtype: 'sms' })
    ));
    expect(createBuilderTemplate).toHaveBeenCalledWith({
      kind: 'communication',
      subtype: 'sms',
      name: 'Move reminder',
      category: 'general',
    });
  });

  it('shows a template-list error without breaking blank-template creation', async () => {
    getBuilderTemplates.mockRejectedValue({
      response: { data: { detail: 'Template list unavailable.' } },
    });
    render(<CreateUniversalDocumentModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Template list unavailable.');
    expect(screen.getByRole('option', { name: 'Blank template' })).toBeInTheDocument();
  });

  it('shows server errors and keeps the form open', async () => {
    createBuilderTemplate.mockRejectedValue({ response: { data: { detail: 'Catalog permission denied.' } } });
    const onCreated = vi.fn();
    render(<CreateUniversalDocumentModal isOpen onClose={vi.fn()} onCreated={onCreated} />);
    await screen.findByRole('option', { name: 'Contract' });
    fireEvent.change(screen.getByLabelText('Template title'), { target: { value: 'Invoice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Document' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Catalog permission denied.');
    expect(onCreated).not.toHaveBeenCalled();
  });
});
