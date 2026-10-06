import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BranchSettings from './BranchSettings';
import API from '../../../services/api';

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, company: 3 } }),
}));

const branchesLookupMock = vi.hoisted(() => vi.fn());

vi.mock('../../../shared/queries/sharedQueries', () => ({
  useBranchesLookup: branchesLookupMock,
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
    branchesLookupMock.mockReturnValue({
      data: [
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
          restrict_leads_opportunities_to_branch_users: false,
          enable_lead_posting: true,
        },
      ],
      refetch: vi.fn(),
    });
  });

  it('renders branch lookup responses without crashing', async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <BranchSettings />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Main Branch')).toBeInTheDocument();
    expect(screen.getByText('Toronto, ON M5V')).toBeInTheDocument();
  });

  it('shows inactive status for disabled branches', async () => {
    const queryClient = new QueryClient();

    branchesLookupMock.mockReturnValueOnce({
      data: [
        {
          id: 2,
          name: 'Secondary Branch',
          city: 'Ottawa',
          state: 'ON',
          zip_code: 'K1A',
          dispatch_location: 'Yard B',
          sales_tax_rate: '0.13',
          is_main: false,
          is_active: false,
          restrict_leads_opportunities_to_branch_users: true,
          enable_lead_posting: false,
        },
      ],
      refetch: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BranchSettings />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Secondary Branch')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
