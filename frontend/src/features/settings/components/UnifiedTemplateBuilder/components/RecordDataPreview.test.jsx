import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecordDataPreview from './RecordDataPreview';

describe('Actual record values', () => {
  it('renders real values and missing tags without substituting samples', async () => {
    const onRender = vi.fn().mockResolvedValue({
      source: { type: 'invoice', id: 42 }, html: '<p>Real invoice</p>',
      resolved_variables: { 'customer.full_name': 'Actual customer', 'invoice.balance_due': '$0.00', 'sales_rep.phone': '' },
      missing_variables: ['sales_rep.phone'],
    });
    render(<RecordDataPreview mode="invoice" onRender={onRender} />);
    fireEvent.click(screen.getByText('Check actual record values'));
    fireEvent.change(screen.getByLabelText('Record ID'), { target: { value: '42' } });
    fireEvent.click(screen.getByText('Check values'));
    await waitFor(() => expect(screen.getByText('Actual customer')).toBeInTheDocument());
    expect(onRender).toHaveBeenCalledWith({ type: 'invoice', id: 42 });
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('Missing: sales_rep.phone')).toBeInTheDocument();
    expect(screen.getByTitle('Actual record document')).toHaveAttribute('sandbox', '');
    fireEvent.change(screen.getByLabelText('Record ID'), { target: { value: '43' } });
    expect(screen.queryByText('Actual customer')).not.toBeInTheDocument();
  });

  it('shows access failures without rendering sample data as actual', async () => {
    render(<RecordDataPreview mode="estimate" onRender={vi.fn().mockRejectedValue({ response: { data: { detail: 'Access denied' } } })} />);
    fireEvent.click(screen.getByText('Check actual record values'));
    expect(screen.queryByRole('option', { name: 'invoice' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Record ID'), { target: { value: '9' } });
    fireEvent.click(screen.getByText('Check values'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(screen.queryByTitle('Actual record document')).not.toBeInTheDocument();
  });

  it('shows a readable message when the server detail is not text', async () => {
    const onRender = vi.fn().mockRejectedValue({ message: 'Request failed', response: { data: { detail: { source: ['Invalid'] } } } });
    render(<RecordDataPreview mode="invoice" onRender={onRender} />);
    fireEvent.click(screen.getByText('Check actual record values'));
    fireEvent.change(screen.getByLabelText('Record ID'), { target: { value: '42' } });
    fireEvent.click(screen.getByText('Check values'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Request failed'));
  });
});
