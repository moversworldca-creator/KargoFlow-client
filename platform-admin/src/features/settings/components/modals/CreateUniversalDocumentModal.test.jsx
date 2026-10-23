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
  getGlobalTemplateCategories,
} from '../../../../services/api';

vi.mock('../../../../services/api', async (original) => ({
  ...await original(),
  getBuilderMeta: vi.fn(),
  getBuilderTemplates: vi.fn(),
  getGlobalTemplateCategories: vi.fn(),
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
  getGlobalTemplateCategories.mockResolvedValue({ data: ['general', 'billing', 'booking'] });
  createBuilderTemplate.mockResolvedValue({ data: { id: 42 } });
});
describe('Global template creation', () => {
  it('excludes copy sources with another kind or subtype', async () => {
    getBuilderTemplates.mockResolvedValue({ data: { results: [
      { id: 1, name: 'Contract', kind: 'document', subtype: 'contract' },
      { id: 2, name: 'Deposit', kind: 'invoice', subtype: 'deposit' },
      { id: 3, name: 'Final', kind: 'invoice', subtype: 'final' },
    ] } });
    render(<GlobalTemplateCreateForm initialKind="invoice" fixedKind onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('option', { name: 'Final (copy)' });
    expect(screen.getByLabelText('Template')).toBeDisabled();
    expect(screen.queryByRole('option', { name: 'Contract (copy)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Deposit (copy)' })).not.toBeInTheDocument();
  });

  it('shows relevant types and clears the selected source when switching template formats', async () => {
    render(<GlobalTemplateCreateForm onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('option', { name: 'Contract' });
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'invoice' } });
    expect(screen.queryByLabelText('Document type')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Invoice type')).toHaveValue('final');
    expect(screen.getByRole('option', { name: 'Deposit' })).toBeInTheDocument();
    await waitFor(() => expect(getBuilderTemplates).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'invoice', subtype: 'final' })));
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'communication' } });
    expect(screen.getByLabelText('Message type')).toHaveValue('email');
    expect(screen.getByRole('option', { name: 'SMS' })).toBeInTheDocument();
  });

  it('offers existing library categories and saves the entered description', async () => {
    render(<GlobalTemplateCreateForm onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('option', { name: 'Contract' });
    await waitFor(() => expect(document.querySelector('#global-template-categories option[value="billing"]')).not.toBeNull());
    fireEvent.change(screen.getByLabelText('Template title'), { target: { value: 'Agreement' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'booking' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '  Use when booking a move.  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Document' }));
    await waitFor(() => expect(createBuilderTemplate).toHaveBeenCalledWith(expect.objectContaining({ description: 'Use when booking a move.', category: 'booking' })));
  });

  it('loads every page of matching starting templates', async () => {
    getBuilderTemplates.mockResolvedValueOnce({ data: { count: 51, results: Array.from({ length: 50 }, (_, index) => ({ id: index + 1, kind: 'document', subtype: 'contract', name: `Contract ${index + 1}` })) } })
      .mockResolvedValueOnce({ data: { count: 51, results: [{ id: 51, kind: 'document', subtype: 'contract', name: 'Last contract' }] } });
    render(<GlobalTemplateCreateForm onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('option', { name: 'Last contract (copy)' });
    expect(getBuilderTemplates).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50 }));
  });

  it('associates server validation errors with the corresponding field', async () => {
    createBuilderTemplate.mockRejectedValueOnce({ response: { data: { description: ['Description is too long.'] } } });
    render(<GlobalTemplateCreateForm onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('option', { name: 'Contract' });
    fireEvent.change(screen.getByLabelText('Template title'), { target: { value: 'Agreement' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Document' }));
    expect(await screen.findByText('Description is too long.')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Description')).toHaveAccessibleDescription('Description is too long.');
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Short description.' } });
    expect(screen.getByLabelText('Description')).toHaveAttribute('aria-invalid', 'false');
  });
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
      data: { count: 1, results: [{ id: 7, kind: 'document', subtype: 'contract', name: 'Standard Contract' }] },
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
    expect(duplicateBuilderTemplate).toHaveBeenCalledWith('7', { name: 'Contract copy', category: 'general', description: '' });
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
    fireEvent.click(screen.getByRole('button', { name: 'Create Message Template' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, subtype: 'sms' })
    ));
    expect(createBuilderTemplate).toHaveBeenCalledWith({
      kind: 'communication',
      subtype: 'sms',
      name: 'Move reminder',
      category: 'general', description: '',
    });
  });

  it('shows a template-list error without breaking blank-template creation', async () => {
    getBuilderTemplates.mockRejectedValue({
      response: { data: { detail: 'Template list unavailable.' } },
    });
    render(<CreateUniversalDocumentModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(await screen.findByRole('status')).toHaveTextContent('Starting templates could not be loaded. You can still start blank.');
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

  it('uses one modal, focuses the title, traps keyboard focus, and restores scrolling', async () => {
    const close = vi.fn();
    const { unmount } = render(<CreateUniversalDocumentModal isOpen onClose={close} onCreated={vi.fn()} />);
    await screen.findByRole('option', { name: 'Contract' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByLabelText('Template title')).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    screen.getByRole('button', { name: 'Cancel' }).focus();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Cancel' }), { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('trims the title and applies the chosen category to a copied template', async () => {
    getBuilderTemplates.mockResolvedValue({ data: { results: [{ id: 7, kind: 'document', subtype: 'contract', name: 'Source' }] } });
    duplicateBuilderTemplate.mockResolvedValue({ data: { id: 42 } });
    render(<GlobalTemplateCreateForm onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('option', { name: 'Source (copy)' });
    fireEvent.change(screen.getByLabelText('Starting template'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Template title'), { target: { value: '  Contract copy  ' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: ' billing ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Document' }));
    await waitFor(() => expect(duplicateBuilderTemplate).toHaveBeenCalledWith('7', { name: 'Contract copy', category: 'billing', description: '' }));
  });

  it('clears stale starting templates when the invoice type changes', async () => {
    let finish;
    getBuilderTemplates.mockResolvedValueOnce({ data: { results: [{ id: 7, kind: 'invoice', subtype: 'final', name: 'Final invoice' }] } })
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<GlobalTemplateCreateForm initialKind="invoice" onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('option', { name: 'Final invoice (copy)' });
    fireEvent.change(screen.getByLabelText('Starting template'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Invoice type'), { target: { value: 'deposit' } });
    expect(screen.getByLabelText('Starting template')).toHaveValue('');
    expect(screen.getByLabelText('Starting template')).toBeDisabled();
    expect(screen.queryByRole('option', { name: 'Final invoice (copy)' })).not.toBeInTheDocument();
    finish({ data: { results: [{ id: 8, kind: 'invoice', subtype: 'deposit', name: 'Deposit invoice' }] } });
    await screen.findByRole('option', { name: 'Deposit invoice (copy)' });
    expect(screen.getByLabelText('Starting template')).toBeEnabled();
  });

  it('prevents duplicate submissions and closing while creation is pending', async () => {
    let finish;
    createBuilderTemplate.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const close = vi.fn();
    const created = vi.fn();
    render(<GlobalTemplateCreateForm onClose={close} onCreated={created} />);
    await screen.findByRole('option', { name: 'Contract' });
    fireEvent.change(screen.getByLabelText('Template title'), { target: { value: 'Contract' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Document' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.submit(dialog.querySelector('form'));
    expect(close).not.toHaveBeenCalled();
    expect(createBuilderTemplate).toHaveBeenCalledTimes(1);
    finish({ data: { id: 42 } });
    await waitFor(() => expect(created).toHaveBeenCalledExactlyOnceWith({ id: 42 }));
  });
});
