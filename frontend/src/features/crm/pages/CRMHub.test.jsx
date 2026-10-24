import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CRMHub from './CRMHub';
import * as apiService from '../../../services/api';

vi.mock('../../../services/api', () => ({
  convertLead: vi.fn(),
  assignLead: vi.fn(),
  createLead: vi.fn(),
  createLeadActivity: vi.fn(),
  getLeadActivities: vi.fn(),
  createOpportunity: vi.fn(),
  createCustomer: vi.fn(),
  deleteLead: vi.fn(),
  deleteOpportunity: vi.fn(),
  getActivities: vi.fn().mockResolvedValue([]),
  getCustomers: vi.fn().mockResolvedValue([]),
  getLead: vi.fn(),
  getLeads: vi.fn().mockResolvedValue([]),
  getLeadStatusCodes: vi.fn().mockResolvedValue([]),
  getOpportunities: vi.fn().mockResolvedValue([]),
  getBranchLookups: vi.fn().mockResolvedValue([]),
  getLookupUsers: vi.fn().mockResolvedValue([]),
  getStatusCodes: vi.fn().mockResolvedValue([]),
  updateLead: vi.fn(),
  setLeadCustomStatus: vi.fn(),
  updateOpportunity: vi.fn(),
  createSalesActivity: vi.fn(),
  getEntitlementSnapshot: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../shared/auth/useCan', () => {
  const mockCan = () => ({
    can: () => true,
    canAny: () => true,
    canAll: () => true,
  });
  return {
    default: mockCan,
    useCan: mockCan,
  };
});

const mockUser = {
  id: 1,
  first_name: 'Admin',
  last_name: 'User',
  is_superuser: true,
  is_system_admin: true,
  branches: [],
};

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

const branchesFixture = [
  { id: 1, name: 'Main Branch', is_main: true, is_active: true },
  { id: 2, name: 'Secondary Branch', is_main: false, is_active: true },
];

const leadsFixture = [
  {
    id: 101,
    first_name: 'Alice',
    last_name: 'Active',
    status: 'new',
    branch: 1,
    branch_details: { id: 1, name: 'Main Branch' },
    created_at: '2026-10-20T10:00:00Z',
  },
  {
    id: 102,
    first_name: 'Bob',
    last_name: 'OverQuota',
    status: 'new',
    branch: 2,
    branch_details: { id: 2, name: 'Secondary Branch' },
    created_at: '2026-10-21T10:00:00Z',
  },
];

describe('CRMHub Over-Quota Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiService.getLeads.mockResolvedValue(leadsFixture);
    apiService.getOpportunities.mockResolvedValue([]);
    apiService.getActivities.mockResolvedValue([]);
    apiService.getBranchLookups.mockResolvedValue(branchesFixture);
    apiService.getLookupUsers.mockResolvedValue([{ id: 1, first_name: 'Admin' }]);
    apiService.getLeadStatusCodes.mockResolvedValue([]);
    apiService.getStatusCodes.mockResolvedValue([]);
    apiService.getEntitlementSnapshot.mockResolvedValue({
      limits: { 'branches.max_active': 1 },
      resource_access: { branch_limit: 1 },
    });
  });

  const renderComponent = (defaultTab = 'leads') => {
    return render(
      <MemoryRouter initialEntries={['/leads']}>
        <CRMHub defaultTab={defaultTab} />
      </MemoryRouter>
    );
  };

  it('renders over-quota warning banner and disables actions when an over-quota lead is selected in leads inbox', async () => {
    renderComponent('leads');

    // Bob OverQuota belongs to branch 2 which is over quota (limit is 1, branch 1 is main)
    const bobLead = await screen.findByText('Bob OverQuota');
    expect(bobLead).toBeInTheDocument();

    // Click on Bob to view details in drawer
    fireEvent.click(bobLead);

    // Banner should be visible
    expect(await screen.findByTestId('crmhub-lead-over-quota-banner')).toBeInTheDocument();
    expect(screen.getByText(/Branch Over Quota \(Read-Only Mode\)/i)).toBeInTheDocument();

    // Save Assignment button should be disabled with over-quota text
    const saveAssignBtn = screen.getByRole('button', { name: /Branch Over Quota \(Read-Only\)/i });
    expect(saveAssignBtn).toBeDisabled();

    // Action buttons should be disabled
    expect(screen.getByRole('button', { name: /Edit/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Convert/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Delete Lead/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Log Call/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Log Email/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Log SMS/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Log Note/i })).toBeDisabled();

    // Over-quota branch in the dropdown should be disabled with label
    const overQuotaOption = screen.getByRole('option', { name: /Secondary Branch \(Over Quota - Read-Only\)/i });
    expect(overQuotaOption).toBeDisabled();
  });

  it('allows actions when a lead belonging to an active within-quota branch is selected', async () => {
    renderComponent('leads');

    // Alice Active belongs to branch 1 which is the main branch (within quota limit 1)
    const aliceLeads = await screen.findAllByText('Alice Active');
    expect(aliceLeads.length).toBeGreaterThan(0);

    // Click on the list item for Alice
    fireEvent.click(aliceLeads[0]);

    await waitFor(() => {
      expect(screen.queryByTestId('crmhub-lead-over-quota-banner')).not.toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Save Assignment/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Edit/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Convert/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Delete Lead/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Log Call/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Log Email/i })).not.toBeDisabled();
  });

  it('does not restrict actions or display over-quota banner when lead branch is within quota', async () => {
    // Lead 103 belongs to branch 1 (within quota)
    apiService.getLeads.mockResolvedValue([
      {
        id: 103,
        first_name: 'Charlie',
        last_name: 'AssignedLead',
        status: 'new',
        branch: 1,
        branch_details: { id: 1, name: 'Main Branch' },
        assigned_to: 2,
        created_at: '2026-10-22T10:00:00Z',
      },
    ]);
    apiService.getLookupUsers.mockResolvedValue([
      { id: 1, first_name: 'Admin', is_superuser: true, is_active: true },
      { id: 2, first_name: 'Second', last_name: 'User', is_active: true },
    ]);
    apiService.getEntitlementSnapshot.mockResolvedValue({
      limits: { 'branches.max_active': 5, 'users.max_active': 0 },
      resource_access: { branch_limit: 5, user_limit: 0 },
    });

    renderComponent('leads');

    const charlieLead = await screen.findByText('Charlie AssignedLead');
    expect(charlieLead).toBeInTheDocument();

    fireEvent.click(charlieLead);

    // Over-quota banner should not be visible
    expect(screen.queryByTestId('crmhub-lead-over-quota-banner')).not.toBeInTheDocument();

    // Save Assignment button should be enabled
    const saveAssignBtn = screen.getByRole('button', { name: /Save Assignment/i });
    expect(saveAssignBtn).not.toBeDisabled();

    // Action buttons should be enabled
    expect(screen.getByRole('button', { name: /Edit/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Convert/i })).not.toBeDisabled();
  });
});

