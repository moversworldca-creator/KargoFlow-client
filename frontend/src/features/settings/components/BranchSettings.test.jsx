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

const getEntitlementSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock('../../../services/api', () => ({
    default: {
        general: {
            getBranches: vi.fn(),
            createBranch: vi.fn(),
            updateBranch: vi.fn(),
            deleteBranch: vi.fn(),
            getCompany: vi.fn(),
            getEntitlementSnapshot: getEntitlementSnapshotMock,
        },
    },
    getEntitlementSnapshot: getEntitlementSnapshotMock,
}));

describe('BranchSettings', () => {
    const mockBranches = [
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
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        API.general.getBranches.mockResolvedValue(mockBranches);
        branchesLookupMock.mockReturnValue({
            data: mockBranches,
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

        const inactiveBranches = [
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
        ];

        API.general.getBranches.mockResolvedValue(inactiveBranches);
        branchesLookupMock.mockReturnValue({
            data: inactiveBranches,
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

    it('enforces read-only mode and shows expired add-on banner when branches exceed plan limit (4 / 3 scenario)', async () => {
        const queryClient = new QueryClient();

        const fourBranches = [
            { id: 1, name: 'Branch 1', city: 'City 1', is_main: true, is_active: true },
            { id: 2, name: 'Branch 2', city: 'City 2', is_main: false, is_active: true },
            { id: 3, name: 'Branch 3', city: 'City 3', is_main: false, is_active: true },
            { id: 4, name: 'Branch 4', city: 'City 4', is_main: false, is_active: true },
        ];

        API.general.getBranches.mockResolvedValue(fourBranches);
        getEntitlementSnapshotMock.mockResolvedValue({
            limits: { 'branches.max_active': 3 },
            resource_access: {
                branch_limit: 3,
                active_branches: 4,
                has_expired_branch_addon: true,
                branches_read_only: true,
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <BranchSettings />
            </QueryClientProvider>,
        );

        expect(await screen.findByText(/Add-On Expired \(Read-Only Mode\)/i)).toBeInTheDocument();
        expect(screen.getByText(/exceed or meet your current plan limit/i)).toBeInTheDocument();

        // The Add Branch button should be disabled
        const addBtn = screen.getByRole('button', { name: /Add Branch/i });
        expect(addBtn).toBeDisabled();

        // Only the 4th branch (the excess add-on branch) has the Over Quota badge
        const overQuotaBadges = screen.getAllByText(/Over Quota/i);
        expect(overQuotaBadges.length).toBe(1);

        // Branch 1 (Main) is within quota and must NOT show Over Quota
        const mainCard = screen.getByText('Branch 1').closest('div');
        expect(mainCard).not.toHaveTextContent(/Over Quota/i);
    });

    it('disables Save Settings in subtab view when viewing the over-quota add-on branch', async () => {
        const queryClient = new QueryClient();

        const branches = [
            { id: 1, name: 'Main Branch', city: 'City 1', is_main: true, is_active: true, sales_tax_rate: '0.13' },
            { id: 2, name: 'Branch 2', city: 'City 2', is_main: false, is_active: true, sales_tax_rate: '0.13' },
        ];

        API.general.getBranches.mockResolvedValue(branches);
        getEntitlementSnapshotMock.mockResolvedValue({
            limits: { 'branches.max_active': 1 },
            resource_access: {
                branch_limit: 1,
                active_branches: 2,
                has_expired_branch_addon: true,
                branches_read_only: true,
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <BranchSettings view="general" activeBranchId={2} />
            </QueryClientProvider>,
        );

        expect(await screen.findByText(/Add-On Branch \(Over Quota - Read-Only\)/i)).toBeInTheDocument();
        const saveBtn = screen.getByRole('button', { name: /Save Settings/i });
        expect(saveBtn).toBeDisabled();
    });

    it('allows editing and saving valid within-quota branches even if overall quota is exceeded', async () => {
        const queryClient = new QueryClient();

        const branches = [
            { id: 1, name: 'Main Branch', city: 'City 1', is_main: true, is_active: true, sales_tax_rate: '0.13' },
            { id: 2, name: 'Branch 2', city: 'City 2', is_main: false, is_active: true, sales_tax_rate: '0.13' },
        ];

        API.general.getBranches.mockResolvedValue(branches);
        getEntitlementSnapshotMock.mockResolvedValue({
            limits: { 'branches.max_active': 1 },
            resource_access: {
                branch_limit: 1,
                active_branches: 2,
                has_expired_branch_addon: true,
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <BranchSettings view="general" activeBranchId={1} />
            </QueryClientProvider>,
        );

        const elements = await screen.findAllByText('Main Branch');
        expect(elements.length).toBeGreaterThan(0);
        const saveBtn = screen.getByRole('button', { name: /Save Settings/i });
        expect(saveBtn).toBeEnabled();
    });
});
