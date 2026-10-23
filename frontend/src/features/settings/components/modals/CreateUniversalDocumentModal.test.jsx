import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateUniversalDocumentModal from "./CreateUniversalDocumentModal";
import { getBuilderCatalog, getCommunicationCatalogTemplate, createCommunicationTemplate, createDocumentTemplate, createEstimatePortalTemplate } from '../../../../services/api';

const branches = [];

vi.mock("../../../../services/api", () => ({
  createDocumentTemplate: vi.fn(),
  getBuilderCatalog: vi.fn().mockResolvedValue({ results: [] }),
  getCommunicationCatalogTemplate: vi.fn(),
  normalizeEstimateSubtype: vi.fn((value) => ({ moving: "non_binding", commercial: "non_binding", minimal: "flat_rate" }[value] || value)),
  createEstimatePortalTemplate: vi.fn(),
  createCommunicationTemplate: vi.fn(),
}));

describe("CreateUniversalDocumentModal Builder workflow scopes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBuilderCatalog.mockResolvedValue({ results: [] });
  });

  it.each([
    ['contract', 'document', 'contract'],
    ['custom', 'document', 'custom'],
    ['estimate:hourly', 'estimate_portal', 'hourly'],
    ['estimate:moving', 'estimate_portal', 'non_binding'],
    ['invoice:deposit', 'invoice', 'deposit'],
  ])('lists and copies a published platform template for %s', async (category, kind, subtype) => {
    const source = { template_key: 'platform.new_template', name: 'My published platform template', kind, subtype };
    getBuilderCatalog.mockResolvedValue({ results: [source] });
    const create = kind === 'estimate_portal' ? createEstimatePortalTemplate : createDocumentTemplate;
    create.mockResolvedValue({ data: { id: 71, kind, subtype } });
    const created = vi.fn();
    render(<CreateUniversalDocumentModal isOpen initialCategory={category} defaultBranchId={3} branches={branches} onClose={vi.fn()} onCreated={created} />);
    await screen.findByRole('option', { name: `${source.name} — Published version unavailable` });
    fireEvent.change(screen.getByLabelText(/starting template/i), { target: { value: `catalog:${source.template_key}` } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Document' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ kind, subtype, branch_id: 3, catalog_template_key: source.template_key })));
    await waitFor(() => expect(created).toHaveBeenCalledWith(expect.objectContaining({ id: 71 }), expect.any(Object)));
  });

  it.each([['invoice', 'final'], ['invoice:deposit', 'deposit'], ['invoice:storage', 'storage'], ['invoice:progress', 'progress']])('creates %s with its billing subtype', async (category, subtype) => {
    createDocumentTemplate.mockResolvedValue({ data: { id: 91, kind: 'invoice', subtype } });
    render(<CreateUniversalDocumentModal isOpen templateKind="invoice" initialCategory={category} defaultBranchId={3} onClose={vi.fn()} onCreated={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Starting Template/i), { target: { value: 'blank' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Invoice' }));
    await waitFor(() => expect(createDocumentTemplate).toHaveBeenCalledWith(expect.objectContaining({ template_type: 'invoice', subtype, scope_type: 'invoice' })));
  });

  it('filters platform and tenant copies by kind and billing subtype', async () => {
    getBuilderCatalog.mockResolvedValue({ results: [
      { template_key: 'valid', name: 'Valid deposit', kind: 'invoice', subtype: 'deposit' },
      { template_key: 'final', name: 'Wrong invoice subtype', kind: 'invoice', subtype: 'final' },
      { template_key: 'wrong', name: 'Wrong kind', kind: 'document', subtype: 'deposit' },
    ] });
    render(<CreateUniversalDocumentModal isOpen templateKind="invoice" initialCategory="invoice:deposit" existingLegalTemplates={[
      { id: 1, name: 'Tenant deposit', kind: 'invoice', subtype: 'deposit', template_type: 'invoice' },
      { id: 2, name: 'Tenant final', kind: 'invoice', subtype: 'final', template_type: 'invoice' },
      { id: 3, name: 'Tenant contract', kind: 'document', template_type: 'contract' },
    ]} onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('option', { name: 'Valid deposit — Published version unavailable' });
    expect(screen.queryByRole('option', { name: 'Wrong invoice subtype' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Wrong kind' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Starting Template/i)).toHaveTextContent('Tenant deposit');
    expect(screen.getByLabelText(/Starting Template/i)).not.toHaveTextContent('Tenant final');
    expect(screen.getByLabelText(/Starting Template/i)).not.toHaveTextContent('Tenant contract');
  });

  it('keeps the selected global source when the branch list refreshes', async () => {
    getBuilderCatalog.mockResolvedValue({ results: [{ template_key: 'platform.current', name: 'Current terms', kind: 'document', subtype: 'contract', published_revision_number: 14 }] });
    const props = { isOpen: true, initialCategory: 'contract', defaultBranchId: 3, onClose: vi.fn(), onCreated: vi.fn() };
    const { rerender } = render(<CreateUniversalDocumentModal {...props} branches={[{ id: 3, name: 'Main' }]} />);
    await screen.findByRole('option', { name: 'Current terms — Published v14' });
    fireEvent.change(screen.getByLabelText(/Starting Template/i), { target: { value: 'catalog:platform.current' } });
    fireEvent.change(screen.getByLabelText(/Document Title/i), { target: { value: 'Our latest terms' } });
    rerender(<CreateUniversalDocumentModal {...props} branches={[{ id: 3, name: 'Main refreshed' }]} />);
    expect(screen.getByLabelText(/Starting Template/i)).toHaveValue('catalog:platform.current');
    expect(screen.getByLabelText(/Document Title/i)).toHaveValue('Our latest terms');
  });

  it('shows the published revision and explains the copy boundary', async () => {
    getBuilderCatalog.mockResolvedValue({ results: [{ template_key: 'platform.current', name: 'Current terms', kind: 'document', subtype: 'contract', published_revision_number: 14 }] });
    render(<CreateUniversalDocumentModal isOpen initialCategory="contract" onClose={vi.fn()} onCreated={vi.fn()} />);
    await screen.findByRole('option', { name: 'Current terms — Published v14' });
    fireEvent.change(screen.getByLabelText(/Starting Template/i), { target: { value: 'catalog:platform.current' } });
    expect(await screen.findByText(/Copies the latest published global version at creation/)).toBeInTheDocument();
    expect(screen.getByText(/Existing tenant copies keep their own content/)).toBeInTheDocument();
  });

  it('keeps local creation available and reports catalog access failures', async () => {
    getBuilderCatalog.mockRejectedValueOnce({ response: { data: { detail: 'Template Library is not enabled.' } } });
    render(<CreateUniversalDocumentModal isOpen onClose={vi.fn()} onCreated={vi.fn()} branches={branches} />);
    expect(await screen.findByRole('status')).toHaveTextContent('Template Library is not enabled.');
    expect(screen.getByRole('option', { name: /blank canvas/i })).toBeInTheDocument();
  });

  it.each(['email', 'sms'])('copies published %s body content through the existing communication API', async (channel) => {
    getBuilderCatalog.mockResolvedValue({ results: [{ template_key: 'platform.message', name: 'Platform message', template_subtype: channel }] });
    getCommunicationCatalogTemplate.mockResolvedValue({ body_text: 'Published message text', body_html: '<p>Published HTML</p>' });
    createCommunicationTemplate.mockResolvedValue({ id: 72 });
    render(<CreateUniversalDocumentModal isOpen initialCategory={channel === 'email' ? 'comm:email:custom_email' : 'comm:sms:custom_sms'} onClose={vi.fn()} onCreated={vi.fn()} branches={branches} />);
    await screen.findByRole('option', { name: 'Platform message — Published version unavailable' });
    fireEvent.change(screen.getByLabelText(/starting template/i), { target: { value: 'catalog:platform.message' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Document' }));
    await waitFor(() => expect(createCommunicationTemplate).toHaveBeenCalledWith(expect.objectContaining({ channel, body_text: 'Published message text', body_html: '<p>Published HTML</p>' })));
  });
  it("displays opportunity, job, and invoice scopes supported by document workflows", () => {
    render(
      <CreateUniversalDocumentModal
        isOpen
        onClose={vi.fn()}
        onCreated={vi.fn()}
        branches={branches}
      />
    );

    expect(screen.getByText("Backend-supported workflow scopes")).toBeInTheDocument();
    expect(screen.getByText("Opportunity / Estimate")).toBeInTheDocument();
    expect(screen.getByText("Job", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Invoice", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText(/actual applicability is configured with assignments after it is published/i)).toBeInTheDocument();
  });

  it("shows invoice-specific backend scope and stages for invoice templates", () => {
    render(
      <CreateUniversalDocumentModal
        isOpen
        onClose={vi.fn()}
        onCreated={vi.fn()}
        branches={branches}
      />
    );

    fireEvent.change(screen.getByRole("combobox", { name: /document applies to/i }), {
      target: { value: "invoice" },
    });

    expect(screen.getByText(/Invoice \/ Billing Scope/)).toBeInTheDocument();
    expect(screen.getByText(/Invoice issue · Storage billing/)).toBeInTheDocument();
    expect(screen.queryByText("Opportunity / Estimate")).not.toBeInTheDocument();
  });
});
