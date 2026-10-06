import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomerContractPortal from './CustomerContractPortal';

const apiMocks = vi.hoisted(() => ({
  getPublicContractPortal: vi.fn(),
  signPublicContractPortal: vi.fn(),
}));

vi.mock('../../../services/api', () => apiMocks);

vi.mock('../../../shared/ui/SignaturePadModal', () => ({
  default: ({ open, description, resetKey, saved, onSave, onNext }) => (
    open ? (
      <div role="dialog" aria-label="Signature">
        <div>{description}</div>
        <div data-testid="signature-reset-key">{resetKey}</div>
        {saved ? (
          onNext ? (
            <button type="button" onClick={onNext}>
              Next signature
            </button>
          ) : null
        ) : (
          <button type="button" onClick={() => onSave('data:image/png;base64,test-signature')}>
            Save mock signature
          </button>
        )}
      </div>
    ) : null
  ),
}));

describe('CustomerContractPortal signing fields', () => {
  let scrolledNode;

  beforeEach(() => {
    vi.clearAllMocks();
    scrolledNode = null;
    Element.prototype.scrollIntoView = vi.fn(function scrollIntoView() {
      scrolledNode = this;
    });

    apiMocks.getPublicContractPortal.mockResolvedValue({
      data: {
        status: 'sent',
        content_html: `
          <section>
            <p>First signature</p>
            <span data-sign="signature" data-key="sig_1"></span>
            <p>Second signature</p>
            <span data-sign="signature" data-key="sig_2"></span>
            <p>Office note</p>
            <span data-sign="text" data-key="note_1"></span>
          </section>
        `,
        required_fields: [
          { field_key: 'sig_1', field_type: 'signature' },
          { field_key: 'note_1', field_type: 'text' },
          { field_key: 'sig_2', field_type: 'signature' },
        ],
      },
    });
    apiMocks.signPublicContractPortal.mockResolvedValue({});
  });

  const renderPortal = () =>
    render(
      <MemoryRouter initialEntries={['/portal/contracts/test-token']}>
        <Routes>
          <Route path="/portal/contracts/:token" element={<CustomerContractPortal />} />
        </Routes>
      </MemoryRouter>
    );

  it('does not show next buttons inside document fields before saving', async () => {
    renderPortal();

    expect(await screen.findByText('Signature (sig_1)')).toBeInTheDocument();
    expect(await screen.findByText('Signature (sig_2)')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /^Next$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Next Field/i })).not.toBeInTheDocument();
  });

  it('preserves the signature when another inline field changes', async () => {
    renderPortal();
    const buttons = await screen.findAllByRole('button', { name: /^Add$/i });
    fireEvent.click(buttons[0]);
    fireEvent.click(screen.getByRole('button', { name: /Save mock signature/i }));
    fireEvent.change(screen.getByPlaceholderText('Enter value'), { target: { value: 'Customer note' } });
    expect(screen.getByAltText('Signature (sig_1)')).toHaveAttribute('src', 'data:image/png;base64,test-signature');
  });

  it('displays the saved signature when reopening a signed document', async () => {
    apiMocks.getPublicContractPortal.mockResolvedValue({ data: {
      status: 'signed',
      content_html: '<span data-sign="signature" data-key="sig_1"></span>',
      signed_fields: [{ field_key: 'sig_1', signature_payload: 'https://example.com/signature.png' }],
    } });
    renderPortal();
    expect(await screen.findByAltText('Signature (sig_1)')).toHaveAttribute('src', 'https://example.com/signature.png');
    expect(screen.queryByRole('button', { name: /^Add$/i })).not.toBeInTheDocument();
  });

  it('shows the persisted signature after final submission', async () => {
    renderPortal();
    const buttons = await screen.findAllByRole('button', { name: /^Add$/i });
    fireEvent.click(buttons[0]);
    fireEvent.click(screen.getByRole('button', { name: /Save mock signature/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next signature/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save mock signature/i }));
    fireEvent.change(screen.getByPlaceholderText('Enter value'), { target: { value: 'Approved' } });
    apiMocks.getPublicContractPortal.mockResolvedValue({ data: {
      status: 'signed',
      content_html: '<img alt="signature" src="https://example.com/saved-signature.png" />',
      signed_fields: [],
    } });
    fireEvent.click(screen.getByRole('button', { name: /Submit signature/i }));
    expect(await screen.findByAltText('signature')).toHaveAttribute('src', 'https://example.com/saved-signature.png');
    expect(screen.getByText('Signed & Validated')).toBeInTheDocument();
    expect(apiMocks.signPublicContractPortal).toHaveBeenCalledWith(expect.objectContaining({
      token: 'test-token',
      fields: expect.arrayContaining([expect.objectContaining({ field_key: 'sig_1', signature_payload: 'data:image/png;base64,test-signature' })]),
    }));
  });

  it('shows explanation and opens the next signature popup directly after saving', async () => {
    renderPortal();

    expect(await screen.findByText('Signature (sig_1)')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^Add$/i })[0]);
    expect(await screen.findByText(/Use this popup to add your electronic signature/i)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Save mock signature/i }));

    expect(await screen.findByAltText('Signature (sig_1)')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Next signature/i }));

    expect(scrolledNode).toBeNull();
    expect(await screen.findByTestId('signature-reset-key')).toHaveTextContent('sig_2');
    expect(await screen.findByRole('button', { name: /Save mock signature/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Save mock signature/i }));

    expect(await screen.findByAltText('Signature (sig_2)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Next signature/i })).not.toBeInTheDocument();
  });
});
