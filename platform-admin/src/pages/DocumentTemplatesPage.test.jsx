import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DocumentTemplatesPage from './DocumentTemplatesPage';
import * as api from '../services/api';

const auth = vi.hoisted(() => ({ allowed: ['platform.templates.view', 'platform.templates.manage', 'platform.templates.publish'] }));
vi.mock('../auth/PlatformAuthContext', () => ({ usePlatformAuth: () => ({ hasPermission: (key) => auth.allowed.includes(key) }) }));
vi.mock('../services/api', async (original) => ({
  ...await original(), getBuilderTemplates: vi.fn(), getBuilderMeta: vi.fn(), createBuilderTemplate: vi.fn(),
  duplicateBuilderTemplate: vi.fn(), getBuilderTemplate: vi.fn(), startBuilderTemplateDraft: vi.fn(),
  getBuilderTemplateDraft: vi.fn(), getBuilderTemplateRevision: vi.fn(),
}));
vi.mock('../features/settings/components/UnifiedTemplateBuilder/UnifiedTemplateBuilder', () => ({
  default: ({ mode, canSave }) => <div data-testid="loaded-editor">{mode} / {canSave ? 'editable' : 'read-only'}</div>,
}));
const template = { id: 7, name: 'Welcome', kind: 'communication', subtype: 'email', state: 'active', published_revision: { id: 2 }, draft_revision: null };
function show(path = '/document-templates') { return render(<MemoryRouter initialEntries={[path]}><DocumentTemplatesPage /></MemoryRouter>); }
beforeEach(() => {
  vi.clearAllMocks();
  auth.allowed = ['platform.templates.view', 'platform.templates.manage', 'platform.templates.publish'];
  api.getBuilderTemplates.mockResolvedValue({ data: { count: 1, results: [template] } });
  api.getBuilderMeta.mockResolvedValue({ data: { kinds: [
    { kind: 'document', subtypes: [{ key: 'contract', label: 'Moving Contract' }, { key: 'bol', label: 'Bill of Lading' }] },
    { kind: 'estimate_portal', subtypes: [{ key: 'binding', label: 'Binding' }] },
    { kind: 'communication', subtypes: [{ key: 'email', label: 'Email' }, { key: 'sms', label: 'SMS' }] },
  ] } });
  api.getBuilderTemplate.mockResolvedValue({ data: template });
  api.createBuilderTemplate.mockResolvedValue({ data: { id: 42, ...template } });
  api.duplicateBuilderTemplate.mockResolvedValue({ data: { id: 42, ...template } });
  const revision = { data: { template, document: { subject: 'Hello', body_html: '<p>Welcome</p>' }, revision: { lock_version: 1 } } };
  api.startBuilderTemplateDraft.mockResolvedValue(revision);
  api.getBuilderTemplateRevision.mockResolvedValue(revision);
});

describe('Platform global templates page', () => {
  it('shows category tabs and switches the catalog to estimate and communication templates', async () => {
    show();
    await screen.findByText('Welcome');
    expect(screen.queryByText(/tenant scope|select tenant|all branches/i)).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Global template categories' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Estimate Templates' }));
    await waitFor(() => expect(api.getBuilderTemplates).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'estimate_portal' })));
    fireEvent.click(screen.getByRole('button', { name: 'Email & SMS Templates' }));
    await waitFor(() => expect(api.getBuilderTemplates).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'communication' })));
  });

  it('aligns pagination and advances between pages', async () => {
    api.getBuilderTemplates.mockResolvedValue({ data: { count: 51, results: [template] } });
    show();
    const pagination = await screen.findByRole('navigation', { name: 'Template pagination' });
    await waitFor(() => expect(screen.getByRole('contentinfo')).toHaveTextContent('Showing 1–50 of 51 templates'));
    expect(pagination).toHaveTextContent('Page 1 of 2');
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(api.getBuilderTemplates).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50 })));
    expect(pagination).toHaveTextContent('Page 2 of 2');
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('keeps table headers and status labels aligned without wrapping', async () => {
    show();
    await screen.findByText('Welcome');
    const table = screen.getByRole('table');
    expect(table).toHaveClass('table-fixed');
    expect(table.querySelectorAll('colgroup col')).toHaveLength(7);
    const status = table.querySelector('tbody tr td:nth-child(6) span');
    expect(status).toHaveTextContent('Active');
    expect(status).toHaveClass('whitespace-nowrap');
    expect(status.closest('td')).toHaveClass('text-center');
  });

  it('hydrates a direct email editor link from a global draft', async () => {
    show('/communication-templates/7/builder');
    expect(await screen.findByTestId('loaded-editor')).toHaveTextContent('email / editable');
    expect(api.startBuilderTemplateDraft).toHaveBeenCalledExactlyOnceWith('7');
    expect(api.getBuilderTemplates).not.toHaveBeenCalled();
  });

  it('loads the published revision without creating a draft for view-only staff', async () => {
    auth.allowed = ['platform.templates.view'];
    show('/document-templates/7/builder');
    expect(await screen.findByTestId('loaded-editor')).toHaveTextContent('email / read-only');
    expect(api.getBuilderTemplateRevision).toHaveBeenCalledExactlyOnceWith('7', 2);
    expect(api.startBuilderTemplateDraft).not.toHaveBeenCalled();
  });

  it('opens the category popup, then shows document and starting-template dropdowns', async () => {
    show();
    await screen.findByText('Welcome');
    api.getBuilderTemplates.mockResolvedValueOnce({ data: { count: 1, results: [
      { id: 8, name: 'Contract Preset', kind: 'document', subtype: 'contract', state: 'active' },
    ] } });
    fireEvent.click(screen.getByRole('button', { name: /new document/i }));
    expect(screen.getByText('Create a New Template')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /document template/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(await screen.findByRole('heading', { name: 'Create Document' })).toBeInTheDocument();
    const createDialog = screen.getByRole('dialog', { name: 'Create global template' });
    const createForm = createDialog.querySelector('form');
    expect(createForm).not.toHaveClass('space-y-5');
    expect(createForm).toHaveClass('max-w-xl');
    expect(createForm.querySelector('.overflow-y-auto')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Document applies to' })).toHaveValue('contract');
    expect(screen.getByRole('combobox', { name: 'Starting template' })).toBeInTheDocument();
    await screen.findByRole('option', { name: 'Contract Preset (copy)' });
    fireEvent.change(screen.getByLabelText('Template title'), { target: { value: 'My Contract' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Starting template' }), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Document' }));
    await waitFor(() => expect(api.duplicateBuilderTemplate).toHaveBeenCalledWith('8', { name: 'My Contract' }));
  });

  it('denies unauthorized staff before making catalog requests', async () => {
    auth.allowed = [];
    show();
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(api.getBuilderTemplates).not.toHaveBeenCalled();
  });
});
