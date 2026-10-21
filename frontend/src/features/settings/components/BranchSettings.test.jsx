import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BranchSettings from './BranchSettings';
import API from '../../../services/api';

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 7,
      company: 3,
      role_details: [{ name: 'Company Admin', is_system_role: true }],
      branches: [{ id: 1 }],
    },
  }),
}));

vi.mock('../../../services/api', () => ({
  default: {
    general: {
      getBranches: vi.fn(),
      createBranch: vi.fn(),
      updateBranch: vi.fn(),
      deleteBranch: vi.fn(),
      getCompany: vi.fn(),
    },
  },
}));

describe('BranchSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both main and non-main branches in directory view', async () => {
    const branches = [
      {
        id: 1,
        name: 'Main Branch',
        city: 'Toronto',
        state: 'ON',
        zip_code: 'M5V',
        dispatch_location: 'Yard A',
        sales_tax_rate: '0.13',
        is_main: true,
        is_active: true,
      },
      {
        id: 2,
        name: 'East Hub',
        city: 'Montreal',
        state: 'QC',
        zip_code: 'H2X',
        dispatch_location: 'Yard E',
        sales_tax_rate: '0.15',
        is_main: false,
        is_active: true,
      },
    ];
    API.general.getBranches.mockResolvedValue(branches);

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <BranchSettings />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Main Branch')).toBeInTheDocument();
    expect(screen.getByText('Toronto, ON M5V')).toBeInTheDocument();
    expect(screen.getByText('East Hub')).toBeInTheDocument();
    expect(screen.getByText('Montreal, QC H2X')).toBeInTheDocument();
  });

  it('shows inactive status for disabled branches', async () => {
    API.general.getBranches.mockResolvedValue([
      {
        id: 3,
        name: 'Secondary Branch',
        city: 'Ottawa',
        state: 'ON',
        zip_code: 'K1A',
        dispatch_location: 'Yard B',
        sales_tax_rate: '0.13',
        is_main: false,
        is_active: false,
      },
    ]);

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <BranchSettings />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Secondary Branch')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});

