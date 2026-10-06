import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EstimateBuilderFullPage from './EstimateBuilderFullPage';

describe('EstimateBuilderFullPage preview', () => {
  it('adds the header widget with popup, payment, and inventory action hooks', () => {
    const onChange = vi.fn();
    render(
      <EstimateBuilderFullPage
        draft={{
          name: 'Estimate Template',
          template_type: 'moving',
          branch: 1,
          html_content: '',
        }}
        onChange={onChange}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Header Section'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        html_content: expect.stringContaining('data-action="sign-accept"'),
      }),
    );
    const html = onChange.mock.calls.at(-1)?.[0]?.html_content || '';
    expect(html).toContain('data-action="pay-deposit"');
    expect(html).toContain('data-action="pay-full"');
    expect(html).toContain('href="@inventory_link"');
    expect(html).toContain('Inventory Portal');
    expect(html).toContain('data-require-signature="true"');
    expect(html).toContain('modal-signature');
    expect(html).toContain('modal-thankyou');
  });

  it('keeps direct accept available in the header widget when e-signature is optional', () => {
    const onChange = vi.fn();
    render(
      <EstimateBuilderFullPage
        draft={{
          name: 'Estimate Template',
          template_type: 'moving',
          branch: 1,
          require_e_signature: false,
          html_content: '',
        }}
        onChange={onChange}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Header Section'));

    const html = onChange.mock.calls.at(-1)?.[0]?.html_content || '';
    expect(html).toContain('data-require-signature="false"');
    expect(html).not.toContain('<div class="est-modal-overlay modal-signature">');
    expect(html).not.toContain('Accept Estimate');
    expect(html).toContain('>Accept<');
    expect(html).toContain('data-action="accept-no-sig"');
    expect(html).not.toContain('for="header-accept-toggle"');
  });

  it('lets the header widget Accept button open the e-sign popup inside the builder canvas', () => {
    render(
      <EstimateBuilderFullPage
        draft={{
          name: 'Estimate Template',
          template_type: 'moving',
          branch: 1,
          html_content: '',
        }}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Header Section'));
    fireEvent.click(screen.getByText('Accept'));

    expect(document.getElementById('header-accept-toggle')).toBeChecked();
    expect(document.getElementById('est-sig-canvas')).toBeInTheDocument();
    expect(screen.getByText('Accept Estimate')).toBeInTheDocument();
  });

  it('shows estimate HTML in the builder canvas when the draft loads after mount', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <EstimateBuilderFullPage
        draft={{
          name: 'Estimate Template',
          template_type: 'contract',
          branch: 1,
          html_content: '',
        }}
        onChange={onChange}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    expect(screen.getByText(/Blank Canvas/i)).toBeInTheDocument();

    rerender(
      <EstimateBuilderFullPage
        draft={{
          id: 7,
          name: 'Estimate Template',
          template_type: 'estimate',
          branch: 1,
          html_content: '<section><h1>Imported Estimate HTML</h1><p>@grand_total</p></section>',
        }}
        onChange={onChange}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Imported Estimate HTML')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Blank Canvas/i)).not.toBeInTheDocument();
  });

  it('renders sample estimate data with the selected branch details in preview', async () => {
    render(
      <EstimateBuilderFullPage
        draft={{
          name: 'Estimate Template',
          template_type: 'contract',
          branch: 2,
          html_content: `
            <section>
              <h1>@branch_name</h1>
              <p>@branch_phone</p>
              <p>@branch_email</p>
              <p>@branch_website</p>
              <div>@branch_email_footer</div>
              <strong>@customer_name</strong>
              <span>@grand_total</span>
            </section>
          `,
        }}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onPreview={vi.fn()}
        branches={[
          {
            id: 1,
            name: 'West Branch',
            phone: '(555) 111-1000',
            email: 'west@example.com',
            website: 'https://west.example.com',
            logo_url: 'https://cdn.example.com/west-logo.png',
            email_footer_html: '<p>West Branch footer</p>',
          },
          {
            id: 2,
            name: 'North Branch',
            phone: '(555) 222-2000',
            email: 'north@example.com',
            website: 'https://north.example.com',
            logo_url: 'https://cdn.example.com/north-logo.png',
            email_footer_html: '<p>North Branch footer</p>',
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /preview/i }));

    const iframe = await screen.findByTitle('Fullscreen Document Preview');

    await waitFor(() => {
      const srcDoc = iframe.getAttribute('srcdoc') || '';
      expect(srcDoc).toContain('North Branch');
      expect(srcDoc).toContain('north@example.com');
      expect(srcDoc).toContain('https://north.example.com');
      expect(srcDoc).toContain('North Branch footer');
      expect(srcDoc).toContain('Sandesh Off');
      expect(srcDoc).toContain('$1,250.00');
    });
  });

  it('resolves estimate portal variables used by imported @token HTML', async () => {
    render(
      <EstimateBuilderFullPage
        draft={{
          name: 'Estimate Template',
          template_type: 'estimate',
          branch: 1,
          html_content: `
            <section>
              <h1>Estimate #@estimate_number</h1>
              <p>@sales_rep_name - @sales_rep_phone</p>
              <p>@branch_address</p>
              <p>@route_stops_count stops</p>
              <div>@route_stops_html</div>
              <div>@estimate_breakdown</div>
              <h2>@terms_title</h2>
              <p>@terms_body</p>
            </section>
          `,
        }}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /preview/i }));

    const iframe = await screen.findByTitle('Fullscreen Document Preview');

    await waitFor(() => {
      const srcDoc = iframe.getAttribute('srcdoc') || '';
      expect(srcDoc).toContain('Estimate #EST-8812');
      expect(srcDoc).toContain('Sarah Representative');
      expect(srcDoc).toContain('456 Branch Office Road');
      expect(srcDoc).toContain('2 stops');
      expect(srcDoc).toContain('987 Storage Road');
      expect(srcDoc).toContain('Moving labor');
      expect(srcDoc).toContain('Terms & Conditions');
      expect(srcDoc).not.toContain('@estimate_number');
      expect(srcDoc).not.toContain('@route_stops_html');
      expect(srcDoc).not.toContain('@terms_body');
    });
  });

  it('keeps estimate portal variables available when an external registry is loaded', () => {
    render(
      <EstimateBuilderFullPage
        draft={{
          name: 'Estimate Template',
          template_type: 'estimate',
          branch: 1,
          html_content: '',
        }}
        onChange={vi.fn()}
        onSave={vi.fn()}
        onBack={vi.fn()}
        onPreview={vi.fn()}
        registry={[
          {
            label: 'Contract',
            fields: [{ key: 'Contract.contract_number', description: 'Contract number' }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /variables/i }));

    expect(screen.getByText('{{terms_title}}')).toBeInTheDocument();
    expect(screen.getByText('{{route_stops_html}}')).toBeInTheDocument();
    expect(screen.getByText('{{estimate_breakdown}}')).toBeInTheDocument();
    expect(screen.getByText('{{Contract.contract_number}}')).toBeInTheDocument();
  });
});
