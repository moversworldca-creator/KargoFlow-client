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

  it('renders the Document Templates page with heading, description, and prominent + New Document button', async () => {
    render(<DocumentTemplates branchId={5} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Document Templates' })).toBeInTheDocument();
    expect(screen.getByText(/Design and manage legal contracts, bills of lading, payment invoices/i)).toBeInTheDocument();
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

    // Switch to Payment Invoice
    fireEvent.change(categorySelect, { target: { value: 'invoice' } });
    expect(titleInput.value).toBe('Payment Invoice');
    expect(startingTemplateSelect).toHaveTextContent(/Payment Invoice/i);
  });

  it('submits form with correct payload and launches builder upon successful template creation', async () => {
    render(<DocumentTemplates branchId={5} />);
    fireEvent.click(await screen.findByRole('button', { name: /\+ New Document/i }));

    const categorySelect = screen.getByLabelText(/Document Applies To/i);
    const titleInput = screen.getByLabelText(/Document Title/i);
    const startingTemplateSelect = screen.getByLabelText(/Starting Template/i);

    fireEvent.change(categorySelect, { target: { value: 'invoice' } });
    fireEvent.change(titleInput, { target: { value: 'Commercial Freight Invoice' } });
    fireEvent.change(startingTemplateSelect, { target: { value: 'blank' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Document' });
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
      expect(navigate).toHaveBeenCalledWith('/settings/document-templates/99/builder');
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

  it('renders optgroups for Opportunity, Job, Estimate, and Communication scopes in Create Document modal', async () => {
    render(<DocumentTemplates branchId={5} />);
    await screen.findByText('Moving Services Agreement');

    // Open + New Document modal
    const newDocBtn = screen.getByRole('button', { name: /\+ New Document/i });
    fireEvent.click(newDocBtn);

    const categorySelect = screen.getByLabelText(/Document Applies To/i);

    // Verify optgroups exist
    const opportunityGroup = categorySelect.querySelector('optgroup[label*="Opportunity Scope"]');
    const jobGroup = categorySelect.querySelector('optgroup[label*="Job Scope"]');
    const estimateGroup = categorySelect.querySelector('optgroup[label*="Customer Estimate Portals"]');
    const commGroup = categorySelect.querySelector('optgroup[label*="Customer Communications"]');
    expect(opportunityGroup).toBeInTheDocument();
    expect(jobGroup).toBeInTheDocument();
    expect(estimateGroup).toBeInTheDocument();
    expect(commGroup).toBeInTheDocument();
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

  it('renders unified document list aggregating all document types without category filter tabs', async () => {
    render(<DocumentTemplates branchId={5} />);
    expect(await screen.findByText('Moving Services Agreement')).toBeInTheDocument();
    expect(screen.getByText('Standard Estimate Portal')).toBeInTheDocument();
    expect(screen.getByText('Quote Follow-up Email')).toBeInTheDocument();
    expect(screen.getByText('Move Day Reminder SMS')).toBeInTheDocument();

    // Verify category filter tabs and badges are not rendered
    expect(screen.queryByRole('button', { name: /^All Documents/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Estimates/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Emails/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^SMS Alerts/i })).not.toBeInTheDocument();
  });

  it('filters across all document types including Estimates and SMS alerts via search input', async () => {
    render(<DocumentTemplates branchId={5} />);
    await screen.findByText('Moving Services Agreement');

    const searchInput = screen.getByPlaceholderText(/Search templates/i);

    // Search for Estimates
    fireEvent.change(searchInput, { target: { value: 'Standard Estimate' } });
    expect(screen.getByText('Standard Estimate Portal')).toBeInTheDocument();
    expect(screen.queryByText('Moving Services Agreement')).not.toBeInTheDocument();
    expect(screen.queryByText('Quote Follow-up Email')).not.toBeInTheDocument();

    // Search for SMS
    fireEvent.change(searchInput, { target: { value: 'Reminder SMS' } });
    expect(screen.getByText('Move Day Reminder SMS')).toBeInTheDocument();
    expect(screen.queryByText('Standard Estimate Portal')).not.toBeInTheDocument();
  });

  it('creates an estimate portal template via universal modal and dispatches createEstimatePortalTemplate', async () => {
    render(<DocumentTemplates branchId={5} />);
    fireEvent.click(await screen.findByRole('button', { name: /\+ New Document/i }));

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

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/settings/estimate-portal-templates/202/builder');
    });
  });

  it('creates an email communication template with subject via universal modal and dispatches createCommunicationTemplate', async () => {
    render(<DocumentTemplates branchId={5} />);
    fireEvent.click(await screen.findByRole('button', { name: /\+ New Document/i }));

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

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/settings/documents/communication-templates/303/builder');
    });
  });
});
