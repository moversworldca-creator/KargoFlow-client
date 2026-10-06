import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DocumentTemplates from './DocumentTemplates';

const apiMocks = vi.hoisted(() => ({
  createDocumentTemplate: vi.fn(),
  createTemplateVariable: vi.fn(),
  deleteDocumentTemplate: vi.fn(),
  deleteTemplateVariable: vi.fn(),
  getBranches: vi.fn(),
  getDocumentTemplates: vi.fn(),
  getDocumentVariableRegistry: vi.fn(),
  getTemplateVariables: vi.fn(),
  previewDocumentTemplate: vi.fn(),
  updateDocumentTemplate: vi.fn(),
  updateTemplateVariable: vi.fn(),
}));

vi.mock('../../../services/api', () => apiMocks);

vi.mock('../../../shared/ui/Card', () => ({
  default: ({ children, className = '' }) => <div className={className}>{children}</div>,
}));

const user = { id: 7, branches: [{ id: 5 }] };
const navigate = vi.fn();
vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({
    user,
  }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    useNavigate: () => navigate,
  };
});

describe('DocumentTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMocks.getBranches.mockResolvedValue({
      data: [
        { id: 5, name: 'Main Branch' },
      ],
    });

    apiMocks.getDocumentTemplates.mockResolvedValue({
      data: [
        {
          id: 11,
          branch: 5,
          name: 'Contract Template',
          template_type: 'contract',
          applies_to_entity: 'opportunity',
          applies_to_service_type: '',
          applies_to_binding_type: '',
          applies_to_opp_type: '',
          subject: 'Hello {{Customer.full_name}}',
          version: '1.0',
          is_active: true,
          content: { blocks: [{ id: 'body', html: '<div>Contract body</div>', settings: {} }], docSettings: { format: 'Letter', margin: '40px' } },
        },
      ],
    });

    apiMocks.getTemplateVariables.mockResolvedValue({ data: [] });
    apiMocks.getDocumentVariableRegistry.mockResolvedValue({
      data: {
        groups: [
          {
            entity: 'customer',
            label: 'Customer',
            fields: [{ key: 'Customer.full_name' }],
          },
        ],
      },
    });
    apiMocks.createDocumentTemplate.mockResolvedValue({
      data: { id: 22 },
    });
    apiMocks.updateDocumentTemplate.mockResolvedValue({
      data: { id: 11 },
    });
    apiMocks.previewDocumentTemplate.mockResolvedValue({
      data: { rendered_html: '<html><body>Rendered preview</body></html>' },
    });
  });

  it('saves structured builder edits using the API content field', async () => {
    render(<DocumentTemplates branchId={5} builderRouteView="builder" builderRouteItemId="11" />);
    await screen.findByRole('button', { name: 'Sample Preview' });
    fireEvent.click(screen.getByText('Simple Heading'));
    fireEvent.click(screen.getByRole('button', { name: /Save.*Unsaved/i }));
    await waitFor(() => expect(apiMocks.updateDocumentTemplate).toHaveBeenCalled());
    const [id, payload] = apiMocks.updateDocumentTemplate.mock.calls[0];
    expect(id).toBe(11);
    expect(payload.content.blocks.map((block) => block.html).join('')).toContain('Heading');
    expect(payload).not.toHaveProperty('html_content');
  });

  it('previews structured content without saving the document', async () => {
    render(<DocumentTemplates branchId={5} builderRouteView="builder" builderRouteItemId="11" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sample Preview' }));
    expect(screen.getByTitle('Fullscreen Document Preview')).toHaveAttribute('srcdoc', expect.stringContaining('Contract body'));
    expect(apiMocks.updateDocumentTemplate).not.toHaveBeenCalled();
  });

  it('opens the server preview above the builder', async () => {
    render(<DocumentTemplates branchId={5} builderRouteView="builder" builderRouteItemId="11" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Live Preview' }));
    await waitFor(() => expect(apiMocks.previewDocumentTemplate).toHaveBeenCalledWith(11, expect.objectContaining({ branch_id: 5 })));
    const frame = screen.getByTitle('Fullscreen Document Preview');
    await waitFor(() => expect(frame).toHaveAttribute('srcdoc', '<html><body>Rendered preview</body></html>'));
    expect(frame.closest('.fixed').parentElement).toBe(document.body);
  });

  it('keeps changes marked unsaved when saving fails', async () => {
    apiMocks.updateDocumentTemplate.mockRejectedValue(new Error('Save failed'));
    render(<DocumentTemplates branchId={5} builderRouteView="builder" builderRouteItemId="11" />);
    await screen.findByRole('button', { name: 'Sample Preview' });
    fireEvent.click(screen.getByText('Simple Heading'));
    fireEvent.click(screen.getByRole('button', { name: /Save.*Unsaved/i }));
    expect(await screen.findByText('Save failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save.*Unsaved/i })).toBeInTheDocument();
  });
});
