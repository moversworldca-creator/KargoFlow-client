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

  it('marks over-quota branches as read-only, displays warning banner, and blocks submission', async () => {
    const metaWithOverQuota = {
      ...metadata,
      branches: [
        { id: 1, name: 'HQ Branch', is_main: true, is_active: true },
        { id: 2, name: 'Second Branch', is_main: false, is_active: true },
      ],
      branchLimit: 1, // Only 1 active branch allowed; branch 2 is over-quota
    };

    render(<NewLeadForm isOpen metadata={metaWithOverQuota} onClose={vi.fn()} />);

    // Branch 2 option should be disabled and labeled (Over Quota - Read-Only)
    const overOption = screen.getByRole('option', { name: /Second Branch \(Over Quota - Read-Only\)/ });
    expect(overOption).toBeInTheDocument();
    expect(overOption).toBeDisabled();

    // If an over-quota branch is selected
    fireEvent.change(screen.getByLabelText(/Target Branch/), { target: { value: '2' } });

    // Warning banner should appear
    expect(screen.getByText(/This branch is over quota \(read-only\)\. Creating leads on this branch is blocked\./)).toBeInTheDocument();

    // Submit button should be disabled and show read-only label
    const submitBtn = screen.getByRole('button', { name: 'Branch Over Quota (Read-Only)' });
    expect(submitBtn).toBeDisabled();

    // Fill other required fields and attempt submit
    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'john@example.com' } });
    fireEvent.submit(submitBtn.closest('form'));

    // Validation error should show up and createLead should not be called
    expect(await screen.findByText(/Selected branch is over quota \(read-only\)/)).toBeInTheDocument();
    expect(createLead).not.toHaveBeenCalled();
  });

  it('allows selecting users and submitting when target branch is within quota', async () => {
    const metaWithNormalBranch = {
      ...metadata,
      users: [
        { id: 10, first_name: 'Admin', last_name: 'Boss', is_superuser: true, is_active: true, branches: [3] },
        { id: 20, first_name: 'Second', last_name: 'User', is_active: true, branches: [3] },
      ],
      branchLimit: 5,
    };

    createLead.mockResolvedValue({ id: 999, first_name: 'Alice', branch: 3 });

    render(<NewLeadForm isOpen metadata={metaWithNormalBranch} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Target Branch/), { target: { value: '3' } });

    // User 20 option should be selectable and not disabled
    const userOption = screen.getByRole('option', { name: /Second User/ });
    expect(userOption).toBeInTheDocument();
    expect(userOption).not.toBeDisabled();

    // Select user
    fireEvent.change(screen.getByLabelText(/Move Manager/), { target: { value: '20' } });

    // Submit button should be enabled with 'Create Lead'
    const submitBtn = screen.getByRole('button', { name: 'Create Lead' });
    expect(submitBtn).not.toBeDisabled();

    // Fill other fields and submit
    fireEvent.change(screen.getByLabelText(/First Name/), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'alice@example.com' } });
    fireEvent.submit(submitBtn.closest('form'));

    await waitFor(() => {
      expect(createLead).toHaveBeenCalled();
    });
  });
});

