import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CustomerEstimatePortal from './CustomerEstimatePortal';
import {
  getPublicEstimatePortal,
  approvePublicEstimatePortal,
  createPublicEstimatePaymentSession,
} from '../../../services/api';

// Mock the API calls
vi.mock('../../../services/api', () => ({
  getPublicEstimatePortal: vi.fn(),
  approvePublicEstimatePortal: vi.fn(),
  createPublicEstimatePaymentSession: vi.fn(),
  createPublicEstimateSquarePayment: vi.fn(),
  getPublicSquareOrder: vi.fn(),
}));

// Mock react-router-dom search params
vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    useSearchParams: () => [new URLSearchParams('token=test-token'), vi.fn()],
  };
});

describe('CustomerEstimatePortal Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPortalData = {
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    company_name: 'Test Mover',
    sales_number: 'EST-1001',
    move_date: '2026-07-01',
    move_size_label: '2 Bedroom',
    move_type_label: 'Local',
    origin_address: '123 Origin St',
    destination_address: '456 Dest St',
    grand_total: 1000,
    deposit_amount: 100,
    inventory_link: 'https://example.com/inventory-portal',
    esigned: false,
    portal_template_snapshot: {
      html_content: `
        <div>
          <h1>Saved Estimate Template</h1>
          <div class="actions">
            <span data-portal-block="signing"></span>
            <span data-portal-block="payment"></span>
          </div>
        </div>
      `,
      layout_config: {
        page_html: `
          <div class="actions">
            <span data-portal-block="signing"></span>
            <span data-portal-block="payment"></span>
          </div>
        `,
        page_css: '',
      },
    },
  };

  it('renders correctly and opens SignaturePadModal when clicking Accept & Sign', async () => {
    vi.mocked(getPublicEstimatePortal).mockResolvedValue(mockPortalData);

    render(
      <MemoryRouter>
        <CustomerEstimatePortal />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Accept & Sign/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Saved Estimate Template')).toBeInTheDocument();

    const signButton = screen.getByRole('button', { name: /Accept & Sign/i });
    
    // The signature pad modal should not be visible initially
    expect(screen.queryByText(/Draw your/i)).not.toBeInTheDocument();

    // Click Accept & Sign
    fireEvent.click(signButton);

    // The signature modal should now show up
    await waitFor(() => {
      expect(screen.getByText('Accept Estimate')).toBeInTheDocument();
      expect(screen.getByText(/Draw your signature.*or check/is)).toBeInTheDocument();
    });
  });

  it('allows accepting the estimate without drawing/typing a signature', async () => {
    vi.mocked(getPublicEstimatePortal).mockResolvedValue(mockPortalData);
    vi.mocked(approvePublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      esigned: true,
      approved_by_name: 'John Doe',
      approved_by_email: 'john@example.com',
    });

    render(
      <MemoryRouter>
        <CustomerEstimatePortal />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Accept & Sign/i })).toBeInTheDocument();
    });

    const signButton = screen.getByRole('button', { name: /Accept & Sign/i });
    fireEvent.click(signButton);

    await waitFor(() => {
      expect(screen.getByText('Accept Estimate')).toBeInTheDocument();
    });

    // Check the accept without signature checkbox
    const checkbox = screen.getByLabelText(/Accept without signature/i);
    fireEvent.click(checkbox);

    // Click Save button
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    // Verify the approve API call was triggered with an empty signature payload
    await waitFor(() => {
      expect(approvePublicEstimatePortal).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'test-token',
          approved_by_name: 'John Doe',
          approved_by_email: 'john@example.com',
          signature_payload: '',
        })
      );
    });
  });

  it('keeps custom header popup controls interactive while submitting approval', async () => {
    vi.mocked(getPublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      portal_template_snapshot: {
        html_content: `
          <input type="checkbox" id="header-sign-save-toggle" />
          <label for="header-sign-save-toggle" data-action="sign-accept">Save Header Acceptance</label>
        `,
        layout_config: {},
      },
    });
    vi.mocked(approvePublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      esigned: true,
    });

    render(
      <MemoryRouter>
        <CustomerEstimatePortal />
      </MemoryRouter>
    );

    const saveLabel = await screen.findByText('Save Header Acceptance');
    const saveToggle = document.getElementById('header-sign-save-toggle');

    expect(saveToggle).not.toBeChecked();
    fireEvent.click(saveLabel);

    await waitFor(() => {
      expect(saveToggle).toBeChecked();
      expect(approvePublicEstimatePortal).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'test-token',
          approved_by_name: 'John Doe',
          approved_by_email: 'john@example.com',
        })
      );
    });
  });

  it('requires a non-blank signature for builder header widgets that enforce e-sign', async () => {
    vi.mocked(getPublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      portal_template_snapshot: {
        html_content: `
          <div class="est-header-wrapper" data-require-signature="true">
            <input type="checkbox" id="header-sign-save-toggle" />
            <canvas id="est-sig-canvas" width="300" height="120"></canvas>
            <label for="header-sign-save-toggle" data-action="sign-accept">Save Header Acceptance</label>
          </div>
        `,
        layout_config: {},
      },
    });

    const toDataUrlSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,blank');

    render(
      <MemoryRouter>
        <CustomerEstimatePortal />
      </MemoryRouter>
    );

    const saveLabel = await screen.findByText('Save Header Acceptance');
    const saveToggle = document.getElementById('header-sign-save-toggle');

    fireEvent.click(saveLabel);

    await waitFor(() => {
      expect(approvePublicEstimatePortal).not.toHaveBeenCalled();
      expect(saveToggle).not.toBeChecked();
      expect(screen.getByRole('alert')).toHaveTextContent('Please add your signature before accepting this estimate.');
    });

    toDataUrlSpy.mockRestore();
  });

  it('does not open the signature pad when estimate e-sign is disabled', async () => {
    vi.mocked(getPublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      customer_portal_settings: {
        estimate_esign_enabled: false,
      },
    });
    vi.mocked(approvePublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      esigned: true,
      approved_by_name: 'John Doe',
      approved_by_email: 'john@example.com',
    });

    render(
      <MemoryRouter>
        <CustomerEstimatePortal />
      </MemoryRouter>
    );

    await screen.findByText('Saved Estimate Template');
    expect(screen.queryByRole('button', { name: /Accept Estimate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Accept & Sign/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Draw your signature/i)).not.toBeInTheDocument();
  });

  it('hides the signing block entirely when estimate e-sign is disabled', async () => {
    vi.mocked(getPublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      customer_portal_settings: {
        estimate_esign_enabled: false,
      },
    });

    render(
      <MemoryRouter>
        <CustomerEstimatePortal />
      </MemoryRouter>
    );

    await screen.findByText('Saved Estimate Template');
    expect(screen.queryByRole('button', { name: /Accept Estimate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Accept & Sign/i })).not.toBeInTheDocument();
  });

  it('strips legacy signature modal markup from the portal when e-sign is disabled', async () => {
    vi.mocked(getPublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      customer_portal_settings: {
        estimate_esign_enabled: false,
      },
      portal_template_snapshot: {
        html_content: `
          <div>
            <section class="section">
              <div class="actions">
                <span data-portal-block="signing"></span>
              </div>
            </section>
            <!-- Signature Modal -->
            <div class="est-modal-overlay modal-signature">
              <div class="est-modal">
                <div class="sig-header">
                  <div>Accept Estimate</div>
                </div>
              </div>
            </div>
            <!-- Thank You Modal -->
          </div>
        `,
      },
    });

    render(
      <MemoryRouter>
        <CustomerEstimatePortal />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.querySelector('.portal-template-custom')).toBeInTheDocument();
    });
    expect(screen.queryByText('Accept Estimate')).not.toBeInTheDocument();
    expect(screen.queryByText(/Draw your signature/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Accept without signature/i)).not.toBeInTheDocument();
    expect(document.querySelector('.modal-signature')).not.toBeInTheDocument();
  });

  it('turns the legacy authorization card into a direct accept control when e-sign is disabled', async () => {
    vi.mocked(getPublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      customer_portal_settings: {
        estimate_esign_enabled: false,
      },
      portal_template_snapshot: {
        html_content: `
          <section class="responsive-grid-2">
            <div>
              <h4>Authorization</h4>
              <p>Please sign below to authorize this estimate and accept terms.</p>
              <label for="signature-toggle" class="sign-button">Open Signature Pad</label>
            </div>
            <div data-portal-block="payment"></div>
          </section>
        `,
      },
    });
    vi.mocked(approvePublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      esigned: true,
      approved_by_name: 'John Doe',
      approved_by_email: 'john@example.com',
    });

    render(
      <MemoryRouter>
        <CustomerEstimatePortal />
      </MemoryRouter>
    );

    const acceptControl = await screen.findByText('Accept');
    fireEvent.click(acceptControl);

    await waitFor(() => {
      expect(approvePublicEstimatePortal).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'test-token',
          signature_payload: '',
        })
      );
    });
  });

  it('keeps the header signature popup open when approval fails', async () => {
    vi.mocked(getPublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      portal_template_snapshot: {
        html_content: `
          <input type="checkbox" id="header-sign-save-toggle" />
          <label for="header-sign-save-toggle" data-action="sign-accept">Save Header Acceptance</label>
        `,
        layout_config: {},
      },
    });
    vi.mocked(approvePublicEstimatePortal).mockRejectedValue({
      response: { data: { detail: 'Approval failed.' } },
    });

    render(
      <MemoryRouter>
        <CustomerEstimatePortal />
      </MemoryRouter>
    );

    const saveLabel = await screen.findByText('Save Header Acceptance');
    const saveToggle = document.getElementById('header-sign-save-toggle');

    fireEvent.click(saveLabel);

    await waitFor(() => {
      expect(approvePublicEstimatePortal).toHaveBeenCalled();
      expect(saveToggle).not.toBeChecked();
    });
  });

  it('wires custom header payment and inventory buttons through portal actions', async () => {
    vi.mocked(getPublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      portal_template_snapshot: {
        html_content: `
          <label data-action="pay-deposit">Pay Header Deposit</label>
          <span data-portal-block="inventory"></span>
        `,
        layout_config: {},
      },
    });
    vi.mocked(createPublicEstimatePaymentSession).mockResolvedValue({
      checkout_config: { checkout_mode: 'web_payments' },
    });

    render(
      <MemoryRouter>
        <CustomerEstimatePortal />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByText('Pay Header Deposit'));

    await waitFor(() => {
      expect(createPublicEstimatePaymentSession).toHaveBeenCalledWith({
        token: 'test-token',
        payment_option: 'deposit',
      });
    });

    const inventoryLink = await screen.findByLabelText('Open inventory portal');
    expect(inventoryLink).toHaveAttribute('href', 'https://example.com/inventory-portal');
  });

  it('hides payment controls until the estimate has been accepted', async () => {
    vi.mocked(getPublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      portal_template_snapshot: {
        html_content: `
          <section class="responsive-grid-2">
            <div>
              <h4>Authorization</h4>
              <label for="signature-toggle" class="sign-button">Open Signature Pad</label>
            </div>
            <div data-portal-block="payment"></div>
          </section>
        `,
      },
    });

    render(
      <MemoryRouter>
        <CustomerEstimatePortal />
      </MemoryRouter>
    );

    await screen.findByText('Authorization');
    expect(screen.queryByRole('button', { name: /Pay Deposit/i })).not.toBeInTheDocument();
  });

  it('renders the inventory portal link using the supported inventory_link token', async () => {
    vi.mocked(getPublicEstimatePortal).mockResolvedValue({
      ...mockPortalData,
      portal_template_snapshot: {
        html_content: `
          <div>
            <span data-portal-block="inventory"></span>
          </div>
        `,
        layout_config: {},
      },
    });

    render(
      <MemoryRouter>
        <CustomerEstimatePortal />
      </MemoryRouter>
    );

    await screen.findByText('Saved Estimate Template');

    expect(document.body.innerHTML).toContain('{{inventory_link}}');
    expect(document.body.innerHTML).not.toContain('@inventory_link');
  });
});
