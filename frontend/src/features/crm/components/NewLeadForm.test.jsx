import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewLeadForm from './NewLeadForm';
import { createLead, getMoveTypeLookups, getServices } from '../../../services/api';

vi.mock('../../../services/api', () => ({
  createLead: vi.fn(),
  getMoveTypeLookups: vi.fn(),
  getServices: vi.fn(),
}));

vi.mock('../../../shared/ui/AddressAutocomplete', () => ({
  default: ({ value, onChange, placeholder }) => (
    <input aria-label={placeholder} value={value} onChange={onChange} />
  ),
}));

const metadata = {
  branches: [{ id: 3, name: 'Toronto' }],
  users: [
    { id: 12, first_name: 'Ada', last_name: 'Manager', branches: [3] },
    { id: 13, first_name: 'Other', last_name: 'Branch', branches: [4] },
  ],
  moverSizes: [{ id: 8, name: 'Two Bedroom', is_active: true }],
  referralSources: [{ id: 9, name: 'Website' }],
};

describe('NewLeadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMoveTypeLookups.mockResolvedValue([{ id: 5, name: 'Local Move' }]);
    getServices.mockResolvedValue([{ id: 6, name: 'Residential' }]);
    createLead.mockResolvedValue({ id: 77, sales_number: 1007, system_state: 'new' });
  });

  it('validates required lead details before submitting', async () => {
    render(<NewLeadForm isOpen metadata={metadata} onClose={vi.fn()} />);

    fireEvent.submit(screen.getByRole('button', { name: 'Create Lead' }).closest('form'));

    expect(await screen.findByText('Select a branch.')).toBeInTheDocument();
    expect(createLead).not.toHaveBeenCalled();
  });

  it('filters managers by branch and submits a backend-compatible lead', async () => {
    const onSuccess = vi.fn();
    render(<NewLeadForm isOpen metadata={metadata} onClose={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Target Branch/), { target: { value: '3' } });
    await waitFor(() => expect(getMoveTypeLookups).toHaveBeenLastCalledWith({ applicable_branch_id: '3' }));
    expect(getServices).toHaveBeenLastCalledWith({ applicable_branch_id: '3' });
    expect(screen.getByRole('option', { name: 'Ada Manager' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Other Branch' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: ' Grace ' } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: ' grace@example.com ' } });
    fireEvent.change(screen.getByLabelText(/Move Manager/), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Origin Address'), { target: { value: '1 Main St' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Lead' }));

    await waitFor(() => expect(createLead).toHaveBeenCalledWith(expect.objectContaining({
      branch: 3,
      assigned_to: 12,
      first_name: 'Grace',
      email: 'grace@example.com',
      origin_street: '1 Main St',
    })));
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 77 }));
  });
});
