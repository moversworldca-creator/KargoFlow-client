import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsHub from './SettingsHub';
import API from '../../../services/api';

const navigate = vi.fn();
const routeState = vi.hoisted(() => ({ params: {} }));
const authUser = vi.hoisted(() => ({ id: 1, email: 'admin@test.com', branch_id: 1, is_superuser: true }));
const permissions = vi.hoisted(() => ({ canAll: () => true, canAny: () => true }));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => routeState.params,
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: authUser }),
}));

vi.mock('../../../shared/auth/useCan', () => ({
  default: () => permissions,
}));

vi.mock('../../../services/api', () => ({
  default: {
    general: {
      getBranches: vi.fn(() =>
        Promise.resolve([
          { id: 1, name: 'Main HQ', is_main: true },
          { id: 2, name: 'Regional North', is_main: false },
        ]),
      ),
    },
    company: {
      getCompany: vi.fn(() => Promise.resolve({ id: 1, legal_name: 'Test Moving Co.' })),
    },
  },
  getCompany: vi.fn(() => Promise.resolve({ id: 1, legal_name: 'Test Moving Co.' })),
  updateCompany: vi.fn(() => Promise.resolve({ id: 1, legal_name: 'Test Moving Co.' })),
}));

// Mock sub-tab modules to focus on SettingsHub layout and navigation tests
vi.mock('../components/CompanySettings', () => ({
  default: ({ view }) => <div data-testid="company-settings-module">Company Settings: {view}</div>,
}));

vi.mock('../components/BranchSettings', () => ({
  default: ({ view }) => <div data-testid="branch-settings-module">Branch Settings: {view}</div>,
}));

vi.mock('../components/MoverSizeSettings', () => ({
  default: ({ branchId }) => <div data-testid="mover-size-settings-module">Move Sizes Settings: branch {branchId}</div>,
}));

vi.mock('../components/IntegrationSettings', () => ({
  default: ({ view }) => <div data-testid="integration-settings-module">Integration Settings: {view}</div>,
}));

describe('SettingsHub', () => {
  beforeEach(() => {
    navigate.mockClear();
    permissions.canAny = () => true;
    routeState.params = { mainGroup: 'company', subTab: 'profile' };
  });

  it('renders the two-tier layout with primary groups and sub-tabs', async () => {
    render(<SettingsHub />);

    expect(screen.getByRole('heading', { name: 'Settings Hub' })).toBeInTheDocument();
    expect(screen.getByText('Two-tier workspace')).toBeInTheDocument();

    // Check primary tier-1 rail items
    expect(screen.getByTitle('Company Settings')).toBeInTheDocument();
    expect(screen.getByTitle('Branch Settings')).toBeInTheDocument();
    expect(screen.getByTitle('Operations & Scheduling')).toBeInTheDocument();
    expect(screen.getByTitle('Team & Security')).toBeInTheDocument();
    expect(screen.getByTitle('Sales & CRM')).toBeInTheDocument();

    // Check active sub-tab pill in sticky tier-2 header
    expect(screen.getByRole('tab', { name: /Profile & Legal/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Headquarters & Address/i })).toBeInTheDocument();

    // Check mounted module
    expect(screen.getByTestId('company-settings-module')).toHaveTextContent('Company Settings: profile');
  });

  it('navigates to sub-tab when clicked in tier-2 pill bar', () => {
    render(<SettingsHub />);

    const addressTab = screen.getByRole('tab', { name: /Headquarters & Address/i });
    fireEvent.click(addressTab);

    expect(navigate).toHaveBeenCalledWith('/settings/company/address');
  });

  it('performs quick search with fuzzy matching and opens dropdown results', () => {
    render(<SettingsHub />);

    const searchInput = screen.getByRole('searchbox', { name: 'Quick search settings' });
    fireEvent.change(searchInput, { target: { value: 'invoice' } });

    // Should find matching sub-tabs (like profile or document templates)
    const resultButtons = screen.getAllByRole('button');
    expect(resultButtons.length).toBeGreaterThan(0);

    // Clicking clear search resets the input
    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearButton);
    expect(searchInput).toHaveValue('');
  });

  it('contains the branch select dropdown without any floating window overlay', () => {
    render(<SettingsHub />);

    const branchSelect = screen.getByRole('combobox', { name: 'Global branch' });
    expect(branchSelect).toBeInTheDocument();

    // Verify there is NO floating unsaved changes overlay
    expect(screen.queryByText(/You have unsaved changes/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Discard/i })).not.toBeInTheDocument();
  });

  it('renders Moves section with Move Sizes tab and mounts the module', () => {
    routeState.params = { mainGroup: 'moves', subTab: 'move-sizes' };
    render(<SettingsHub />);

    expect(screen.getByRole('tab', { name: /Move Sizes/i })).toBeInTheDocument();
    expect(screen.getByTestId('mover-size-settings-module')).toHaveTextContent('Move Sizes Settings: branch 1');
  });

  it('exposes the payment gateway from the active settings navigation', () => {
    render(<SettingsHub />);
    fireEvent.click(screen.getByTitle('Integrations'));
    expect(navigate).toHaveBeenCalledWith('/settings/integrations/payment-gateway');
  });

  it('opens Authorize.Net configuration on the payment gateway route', () => {
    routeState.params = { mainGroup: 'integrations', subTab: 'payment-gateway' };
    render(<SettingsHub />);
    expect(screen.getByRole('tab', { name: /Payment Gateway/i })).toBeInTheDocument();
    expect(screen.getByTestId('integration-settings-module')).toHaveTextContent('Integration Settings: gateways');
  });

  it('normalizes the existing integrations link to the gateway configuration', () => {
    routeState.params = { mainGroup: 'integrations' };
    render(<SettingsHub />);
    expect(navigate).toHaveBeenCalledWith('/settings/integrations/payment-gateway', { replace: true });
  });

  it('hides the integration entry when settings view permission is missing', () => {
    permissions.canAny = (required) => !required.includes('settings.view');
    routeState.params = { mainGroup: 'company', subTab: 'profile' };
    render(<SettingsHub />);
    expect(screen.queryByTitle('Integrations')).not.toBeInTheDocument();
    permissions.canAny = () => true;
  });

});
