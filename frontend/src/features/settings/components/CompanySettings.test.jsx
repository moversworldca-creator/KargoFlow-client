import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CompanySettings from './CompanySettings';
import { getCompanies, updateCompany } from '../../../services/api';

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: { company: 17 }, isLoading: false }),
}));

vi.mock('../../../shared/context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../../services/api', () => ({
  getCompanies: vi.fn().mockResolvedValue([{
    id: 17,
    name: 'Northstar Freight',
    legal_name: 'Northstar Freight Ltd.',
    email: 'ops@northstar.test',
    phone: '+1 555 0100',
    city: 'Toronto',
    country: 'Canada',
    currency: 'CAD',
  }]),
  updateCompany: vi.fn().mockImplementation(async (id, company) => company),
}));

describe('CompanySettings', () => {
  it('loads the authenticated tenant company profile', async () => {
    render(<CompanySettings />);

    expect(await screen.findByDisplayValue('Northstar Freight Ltd.')).toBeInTheDocument();
    expect(getCompanies).toHaveBeenCalledWith();
    expect(screen.getByDisplayValue('Northstar Freight Ltd.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ops@northstar.test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Toronto')).toBeInTheDocument();
  });

  it('saves edits to the loaded company', async () => {
    render(<CompanySettings />);
    const legalName = await screen.findByDisplayValue('Northstar Freight Ltd.');
    fireEvent.change(legalName, { target: { value: 'Updated Freight Ltd.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() => expect(updateCompany).toHaveBeenCalledWith(17, expect.objectContaining({
      id: 17, legal_name: 'Updated Freight Ltd.',
    })));
    expect(await screen.findByText('Company profile saved successfully.')).toBeInTheDocument();
  });
});
