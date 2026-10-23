import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DocumentTemplates from './DocumentTemplates';
import CreateUniversalDocumentModal from './modals/CreateUniversalDocumentModal';

const apiMocks = vi.hoisted(() => ({
  createDocumentTemplate: vi.fn(),
  getBuilderTemplate: vi.fn(),
  getBuilderTemplateDraft: vi.fn(),
  getBuilderCatalog: vi.fn().mockResolvedValue({ results: [] }),
  getCommunicationCatalogTemplate: vi.fn(),
  normalizeEstimateSubtype: vi.fn((value) => ({ moving: "non_binding", commercial: "non_binding", minimal: "flat_rate" }[value] || value)),
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
  getEstimatePortalTemplates: vi.fn(),
  createEstimatePortalTemplate: vi.fn(),
  updateEstimatePortalTemplate: vi.fn(),
  deactivateEstimatePortalTemplate: vi.fn(),
  duplicateEstimatePortalTemplate: vi.fn(),
  getCommunicationTemplates: vi.fn(),
  createCommunicationTemplate: vi.fn(),
  updateCommunicationTemplate: vi.fn(),
  deleteCommunicationTemplate: vi.fn(),
}));

vi.mock('../../../services/api', () => apiMocks);

vi.mock('../../../shared/ui/Card', () => ({
  default: ({ children, className = '' }) => <div className={className}>{children}</div>,
}));

// Mock UnifiedTemplateBuilder
vi.mock('./UnifiedTemplateBuilder/UnifiedTemplateBuilder', () => ({
  default: ({ mode, draft, onBack, onSave }) => (
    <div data-testid="unified-template-builder" data-mode={mode}>
      <span>Unified Builder ({mode})</span>
      <button onClick={onBack}>Back to Templates</button>
      <button onClick={() => onSave(draft)}>Save Builder Document</button>
    </div>
  ),
}));

const user = { id: 7, branches: [{ id: 5, name: 'Main Branch' }] };
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

describe('DocumentTemplates Page & Create Document Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMocks.getBranches.mockResolvedValue({
      data: [
        { id: 5, name: 'Main Branch' },
        { id: 8, name: 'West Regional' },
      ],
    });

    apiMocks.getDocumentTemplates.mockResolvedValue({
      data: [
        {
          id: 11,
          branch: 5,
          name: 'Moving Services Agreement',
          template_type: 'contract',
          applies_to_entity: 'opportunity',
          scope_type: 'opportunity',
          applies_to_service_type: '',
          applies_to_binding_type: '',
          applies_to_opp_type: '',
          subject: 'Contract {{Contract.contract_number}}',
          version: '1.0',
          is_active: true,
          content: { docSettings: { format: 'Letter', margin: '40px' }, blocks: [] },
          html_content: '<div>Contract content</div>',
        },
        {
          id: 12,
          branch: 5,
          name: 'Uniform Household BOL',
          template_type: 'bol',
          applies_to_entity: 'job',
          scope_type: 'job',
          subject: 'Bill of Lading',
          version: '1.0',
          is_active: true,
          content: {},
          html_content: '<div>BOL content</div>',
        },
      ],
    });

    apiMocks.getEstimatePortalTemplates.mockResolvedValue({
      data: [
        {
          id: 201,
          name: 'Standard Estimate Portal',
          template_type: 'moving',
          branch: 5,
          is_active: true,
          html_content: '<div>Estimate portal content</div>',
        },
      ],
    });

    apiMocks.getCommunicationTemplates.mockResolvedValue({
      data: [
        {
          id: 301,
          name: 'Quote Follow-up Email',
          channel: 'email',
          template_key: 'quote_sent',
          subject: 'Your Moving Estimate',
          branch: 5,
          is_active: true,
        },
        {
          id: 302,
          name: 'Move Day Reminder SMS',
          channel: 'sms',
          template_key: 'move_reminder',
          body: 'Reminder for your move tomorrow',
          branch: 5,
          is_active: true,
        },
      ],
    });

    apiMocks.getTemplateVariables.mockResolvedValue({ data: [] });
    apiMocks.getDocumentVariableRegistry.mockResolvedValue({ data: { groups: [] } });

    apiMocks.createDocumentTemplate.mockResolvedValue({
      data: {
        id: 99,
        name: 'New Custom Invoice',
        template_type: 'invoice',
        applies_to_entity: 'opportunity',
        scope_type: 'opportunity',
        version: '1.0',
        branch: 5,
        is_active: true,
      },
    });

    apiMocks.createEstimatePortalTemplate.mockResolvedValue({
      data: {
        id: 202,
        name: 'Custom Freight Estimate Portal',
        template_type: 'commercial',
        branch: 5,
        is_active: true,
      },
    });

    apiMocks.createCommunicationTemplate.mockResolvedValue({
      data: {
        id: 303,
        name: 'Booking Confirmed Email',
        channel: 'email',
        template_key: 'booking_confirmed',
        subject: 'Move Confirmed',
        branch: 5,
        is_active: true,
      },
    });

    apiMocks.deleteDocumentTemplate.mockResolvedValue({ data: { success: true } });
    apiMocks.deactivateEstimatePortalTemplate.mockResolvedValue({ data: { success: true } });
    apiMocks.deleteCommunicationTemplate.mockResolvedValue({ data: { success: true } });
  });

  it.each([
    ['invoice', 'deposit', '/documents/invoice-templates/81/builder'],
    ['estimate_portal', 'binding', '/documents/estimate-portal-templates/81/builder'],
  ])('redirects a misplaced %s link before reading its draft', async (kind, subtype, path) => {
    apiMocks.getBuilderTemplate.mockResolvedValue({ data: { id: 81, kind, subtype, name: 'Other kind' } });
    render(<DocumentTemplates branchId={5} basePath="/documents/document-templates" builderRouteView="builder" builderRouteItemId="81" />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(path, { replace: true }));
    expect(apiMocks.getBuilderTemplateDraft).not.toHaveBeenCalled();
    expect(screen.queryByTestId('unified-template-builder')).not.toBeInTheDocument();
  });

  it('renders the Document Templates page with heading, description, and prominent + New Document button', async () => {
    render(<DocumentTemplates branchId={5} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Document Templates' })).toBeInTheDocument();
    expect(screen.getByText(/Design and manage contracts, bills of lading, waivers/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ New Document/i })).toBeInTheDocument();
    expect(await screen.findByText('Moving Services Agreement')).toBeInTheDocument();
    expect(screen.getByText('Uniform Household BOL')).toBeInTheDocument();
  });

  it('displays the Applies To, Type, and Branch columns in the templates table', async () => {
    render(<DocumentTemplates branchId={5} />);
    expect(await screen.findByText('Moving Services Agreement')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Applies To' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Branch' })).toBeInTheDocument();
    expect(screen.getByText('Opportunity')).toBeInTheDocument();
    expect(screen.getByText('Job')).toBeInTheDocument();
    expect(screen.getAllByText('Main Branch').length).toBeGreaterThan(0);
  });

  it('opens Create Document modal when + New Document is clicked and closes on Cancel', async () => {
    render(<DocumentTemplates branchId={5} />);
    const newDocBtn = await screen.findByRole('button', { name: /\+ New Document/i });
    fireEvent.click(newDocBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Create Document' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Document Applies To/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Document Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Starting Template/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('validates that Document Title is required and disables Create Document button until valid', async () => {
    render(<DocumentTemplates branchId={5} />);
    fireEvent.click(await screen.findByRole('button', { name: /\+ New Document/i }));

    const titleInput = screen.getByLabelText(/Document Title/i);
    const submitBtn = screen.getByRole('button', { name: 'Create Document' });

    // Clear input
    fireEvent.change(titleInput, { target: { value: '' } });
    expect(submitBtn).toBeDisabled();

    // Type short invalid value
    fireEvent.change(titleInput, { target: { value: 'ab' } });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/Title must be between 3 and 120 characters/i)).toBeInTheDocument();

    // Type valid title
    fireEvent.change(titleInput, { target: { value: 'Valid Agreement Name' } });
    expect(submitBtn).toBeEnabled();
  });

  it('updates title suggestion and starting template options when Document Applies To category changes', async () => {
    render(<DocumentTemplates branchId={5} />);
    fireEvent.click(await screen.findByRole('button', { name: /\+ New Document/i }));

    const categorySelect = screen.getByLabelText(/Document Applies To/i);
    const titleInput = screen.getByLabelText(/Document Title/i);
    const startingTemplateSelect = screen.getByLabelText(/Starting Template/i);

    // Switch to Bill of Lading
    fireEvent.change(categorySelect, { target: { value: 'bol' } });
    expect(titleInput.value).toBe('Uniform Bill of Lading');
    expect(startingTemplateSelect).toHaveTextContent(/Uniform Bill of Lading/i);

    expect([...categorySelect.options].map((option) => option.value)).not.toContain('invoice');
  });

  it('submits form with correct payload and launches builder upon successful template creation', async () => {
    render(<DocumentTemplates branchId={5} templateKind="invoice" basePath="/documents/invoice-templates" />);
    fireEvent.click(await screen.findByRole('button', { name: /\+ New Invoice/i }));

    const categorySelect = screen.getByLabelText(/Document Applies To/i);
    const titleInput = screen.getByLabelText(/Document Title/i);
    const startingTemplateSelect = screen.getByLabelText(/Starting Template/i);

    fireEvent.change(categorySelect, { target: { value: 'invoice' } });
    fireEvent.change(titleInput, { target: { value: 'Commercial Freight Invoice' } });
    fireEvent.change(startingTemplateSelect, { target: { value: 'blank' } });

    const submitBtn = within(screen.getByRole('dialog')).getByRole('button', { name: 'Create Invoice' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiMocks.createDocumentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Commercial Freight Invoice',
          template_type: 'invoice',
          scope_type: 'invoice',
          branch: 5,
        })
      );
    });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/documents/invoice-templates/99/builder');
    });
  });

  it('handles row-level duplicate action using existing createDocumentTemplate API', async () => {
    render(<DocumentTemplates branchId={5} />);
    await screen.findByText('Moving Services Agreement');

    const duplicateButtons = screen.getAllByTitle('Duplicate Template');
    expect(duplicateButtons.length).toBeGreaterThan(0);
    fireEvent.click(duplicateButtons[0]);

    await waitFor(() => {
      expect(apiMocks.createDocumentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Copy of Moving Services Agreement',
          template_type: 'contract',
          scope_type: 'opportunity',
          branch: 5,
        })
      );
    });
  });

  it('filters documents table when search input or status filters are used', async () => {
    render(<DocumentTemplates branchId={5} />);
    await screen.findByText('Moving Services Agreement');

    // Filter by search query
    const searchInput = screen.getByPlaceholderText(/Search templates/i);
    fireEvent.change(searchInput, { target: { value: 'Uniform' } });

    expect(screen.queryByText('Moving Services Agreement')).not.toBeInTheDocument();
    expect(screen.getByText('Uniform Household BOL')).toBeInTheDocument();

    // Filter by non-existent query
    fireEvent.change(searchInput, { target: { value: 'Non-existent query' } });
    expect(screen.getByText(/No document templates match your filters/i)).toBeInTheDocument();

    // Reset search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(await screen.findByText('Moving Services Agreement')).toBeInTheDocument();
  });

  it('offers document subtypes without invoice, estimate, or message categories', async () => {
    render(<DocumentTemplates branchId={5} />);
    fireEvent.click(await screen.findByRole('button', { name: /\+ New Document/i }));
    const values = [...screen.getByLabelText(/Document Applies To/i).options].map((option) => option.value);
    expect(values).toContain('contract');
    expect(values).toContain('bol');
    expect(values).toContain('inventory_sheet');
    expect(values).not.toContain('invoice');
    expect(values.some((value) => value.startsWith('estimate:') || value.startsWith('comm:'))).toBe(false);
  });

  it('clones existing template with deep-copied content and independent structure', async () => {
    render(<DocumentTemplates branchId={5} />);
    fireEvent.click(await screen.findByRole('button', { name: /\+ New Document/i }));

    const categorySelect = screen.getByLabelText(/Document Applies To/i);
    fireEvent.change(categorySelect, { target: { value: 'contract' } });

    const startingTemplateSelect = screen.getByLabelText(/Starting Template/i);
    // Select the existing saved template
    fireEvent.change(startingTemplateSelect, { target: { value: 'template:11' } });

    const titleInput = screen.getByLabelText(/Document Title/i);
    fireEvent.change(titleInput, { target: { value: 'Cloned Moving Agreement' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Document' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiMocks.createDocumentTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Cloned Moving Agreement',
          template_type: 'contract',
          scope_type: 'opportunity',
          content: expect.objectContaining({
            docSettings: { format: 'Letter', margin: '40px' },
          }),
        })
      );
    });
  });

  it('closes modal when Escape key is pressed', async () => {
    render(<DocumentTemplates branchId={5} />);
    fireEvent.click(await screen.findByRole('button', { name: /\+ New Document/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays API error banner and preserves user input on submission failure', async () => {
    apiMocks.createDocumentTemplate.mockRejectedValueOnce({
      response: { data: { detail: 'Template name already exists in this branch.' } },
    });

    render(<DocumentTemplates branchId={5} />);
    fireEvent.click(await screen.findByRole('button', { name: /\+ New Document/i }));

    const titleInput = screen.getByLabelText(/Document Title/i);
    fireEvent.change(titleInput, { target: { value: 'Duplicate Contract Name' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Document' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Template name already exists in this branch.')).toBeInTheDocument();
    // Modal is still open and input is preserved
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(titleInput.value).toBe('Duplicate Contract Name');
  });

  it('loads only the document catalog and excludes other kinds', async () => {
    render(<DocumentTemplates branchId={5} />);
    expect(await screen.findByText('Moving Services Agreement')).toBeInTheDocument();
    expect(apiMocks.getDocumentTemplates).toHaveBeenCalledWith({ branch: '5', kind: 'document' });
    expect(apiMocks.getEstimatePortalTemplates).not.toHaveBeenCalled();
    expect(apiMocks.getCommunicationTemplates).not.toHaveBeenCalled();
    expect(screen.queryByText('Standard Estimate Portal')).not.toBeInTheDocument();
    expect(screen.queryByText('Quote Follow-up Email')).not.toBeInTheDocument();
  });

  it('shows the actual global source version on copied templates', async () => {
    apiMocks.getDocumentTemplates.mockResolvedValue({ data: [{ id: 31, branch: 5, name: 'Copied terms', kind: 'document', template_type: 'contract', is_active: true, catalog_source: { revision_number: 9 } }] });
    render(<DocumentTemplates branchId={5} />);
    expect(await screen.findByText('Copied from global v9')).toBeInTheDocument();
  });

  it('loads invoices through the existing catalog with an invoice kind filter', async () => {
    apiMocks.getDocumentTemplates.mockResolvedValue({ data: [
      { id: 31, branch: 5, name: 'Deposit invoice', kind: 'invoice', subtype: 'deposit', template_type: 'invoice', scope_type: 'invoice', is_active: true },
      { id: 32, name: 'Wrong document', kind: 'document', template_type: 'contract', is_active: true },
    ] });
    render(<DocumentTemplates branchId={5} templateKind="invoice" basePath="/documents/invoice-templates" />);
    expect(await screen.findByText('Deposit invoice')).toBeInTheDocument();
    expect(screen.queryByText('Wrong document')).not.toBeInTheDocument();
    expect(apiMocks.getDocumentTemplates).toHaveBeenCalledWith({ branch: '5', kind: 'invoice' });
    fireEvent.click(screen.getByTitle('Edit Template'));
    expect(navigate).toHaveBeenCalledWith('/documents/invoice-templates/31/builder');
  });

  it('creates an estimate portal template via universal modal and dispatches createEstimatePortalTemplate', async () => {
    render(<CreateUniversalDocumentModal isOpen defaultBranchId={5} branches={user.branches} onClose={vi.fn()} onCreated={vi.fn()} />);

    const categorySelect = screen.getByLabelText(/Document Applies To/i);
    const titleInput = screen.getByLabelText(/Document Title/i);

    fireEvent.change(categorySelect, { target: { value: 'estimate:commercial' } });
    fireEvent.change(titleInput, { target: { value: 'Custom Freight Estimate Portal' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Document' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiMocks.createEstimatePortalTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Custom Freight Estimate Portal',
          template_type: 'commercial',
          applies_to_entity: 'opportunity',
          branch: 5,
        })
      );
    });


  });

  it('creates an email communication template with subject via universal modal and dispatches createCommunicationTemplate', async () => {
    render(<CreateUniversalDocumentModal isOpen defaultBranchId={5} branches={user.branches} onClose={vi.fn()} onCreated={vi.fn()} />);

    const categorySelect = screen.getByLabelText(/Document Applies To/i);
    const titleInput = screen.getByLabelText(/Document Title/i);

    fireEvent.change(categorySelect, { target: { value: 'comm:email:booking_confirmed' } });
    fireEvent.change(titleInput, { target: { value: 'Booking Confirmed Email' } });

    const subjectInput = screen.getByLabelText(/Email Subject/i);
    expect(subjectInput).toBeInTheDocument();
    fireEvent.change(subjectInput, { target: { value: 'Move Confirmed' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Document' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiMocks.createCommunicationTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Booking Confirmed Email',
          channel: 'email',
          subject: 'Move Confirmed',
          branch: 5,
        })
      );
    });


  });
});
