import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EstimatePortalTemplates from './EstimatePortalTemplates';
import {
  createEstimatePortalTemplate,
  getBranches,
  getDocumentVariableRegistry,
  getEstimatePortalTemplates,
  getTemplateVariables,
} from '../../../services/api';

const navigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
  createEstimatePortalTemplate: vi.fn(),
  deactivateEstimatePortalTemplate: vi.fn(),
  getBuilderMeta: vi.fn().mockResolvedValue({ data: { blocks: [] } }),
  getBranches: vi.fn(),
  getBuilderVariables: vi.fn().mockResolvedValue([]),
  getBuilderBlocks: vi.fn().mockResolvedValue([]),
  getBuilderSettings: vi.fn().mockResolvedValue({ data: {} }),
  getBuilderTemplateDraft: vi.fn().mockResolvedValue({ data: null }),
  saveBuilderTemplateDraft: vi.fn().mockResolvedValue({ data: null }),
  getDocumentVariableRegistry: vi.fn(),
  getEstimatePortalTemplates: vi.fn(),
  getTemplateVariables: vi.fn(),
  updateEstimatePortalTemplate: vi.fn(),
}));

describe('EstimatePortalTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBranches.mockResolvedValue([{ id: 1, name: 'Main Branch' }]);
    getDocumentVariableRegistry.mockResolvedValue({ groups: [] });
    getEstimatePortalTemplates.mockResolvedValue([]);
    getTemplateVariables.mockResolvedValue([]);
    createEstimatePortalTemplate.mockResolvedValue({ id: 42, name: 'Custom Estimate Portal' });
  });

  it('saves new estimate builder templates with a valid portal template type', async () => {
    render(
      <EstimatePortalTemplates
        branchId={1}
        builderRouteView="builder"
        builderRouteItemId="new"
      />,
    );

    const titleInput = await screen.findByPlaceholderText('Enter document title...');
    fireEvent.change(titleInput, { target: { value: 'Custom Estimate Portal' } });

    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    const typeSelect = screen.getByLabelText('Template Type');
    expect(typeSelect).toHaveValue('binding');

    fireEvent.click(screen.getByRole('button', { name: /^save template$/i }));

    await waitFor(() => {
      expect(createEstimatePortalTemplate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Custom Estimate Portal',
        branch: 1,
        template_type: 'binding',
        version: 1,
      }));
    });
    expect(createEstimatePortalTemplate.mock.calls[0][0].template_type).not.toBe('contract');
  });
});
