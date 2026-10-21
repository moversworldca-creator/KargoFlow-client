import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DocumentTemplatesPage from './DocumentTemplatesPage';
import * as api from '../services/api';

const auth = vi.hoisted(() => ({ allowed: ['platform.templates.view', 'platform.templates.manage', 'platform.templates.publish'] }));
vi.mock('../auth/PlatformAuthContext', () => ({ usePlatformAuth: () => ({ hasPermission: (key) => auth.allowed.includes(key) }) }));
vi.mock('../services/api', async (original) => ({
  ...await original(), getBuilderTemplates: vi.fn(), getBuilderTemplate: vi.fn(), startBuilderTemplateDraft: vi.fn(),
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
  api.getBuilderTemplate.mockResolvedValue({ data: template });
  const revision = { data: { template, document: { subject: 'Hello', body_html: '<p>Welcome</p>' }, revision: { lock_version: 1 } } };
  api.startBuilderTemplateDraft.mockResolvedValue(revision);
  api.getBuilderTemplateRevision.mockResolvedValue(revision);
});

describe('Platform global templates page', () => {
  it('lists catalog templates and filters SMS without a tenant selector', async () => {
    show();
    await screen.findByText('Welcome');
    expect(screen.queryByText(/tenant scope|select tenant|all branches/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Template type'), { target: { value: 'sms' } });
    await waitFor(() => expect(api.getBuilderTemplates).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'communication', subtype: 'sms' })));
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

  it('denies unauthorized staff before making catalog requests', async () => {
    auth.allowed = [];
    show();
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(api.getBuilderTemplates).not.toHaveBeenCalled();
  });
});
