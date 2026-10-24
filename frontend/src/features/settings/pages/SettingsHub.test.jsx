import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsHub from './SettingsHub';
import API from '../../../services/api';

const navigate = vi.fn();
const routeState = vi.hoisted(() => ({ params: {}, pathname: '/settings/company/profile' }));
const authUser = vi.hoisted(() => ({ id: 1, email: 'admin@test.com', branch_id: 1, is_superuser: true }));
const permissions = vi.hoisted(() => ({ canAll: () => true, canAny: () => true }));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useLocation: () => ({ pathname: routeState.pathname }),
  useParams: () => routeState.params,
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: authUser }),
}));

vi.mock('../../../shared/auth/useCan', () => ({
  default: () => permissions,
}));

vi.mock('../../../services/api', () => ({
  getBuilderCatalog: vi.fn().mockResolvedValue({ results: [] }),
  getCommunicationCatalogTemplate: vi.fn(),
  normalizeEstimateSubtype: (value) => ({ moving: 'non_binding', commercial: 'non_binding', minimal: 'flat_rate' }[value] || value),
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

vi.mock('../components/DocumentTemplates', () => ({
  default: ({ templateKind = "document", onOpenChooser }) => <div data-testid="document-templates-module">{templateKind}<button onClick={() => onOpenChooser(templateKind)}>New template</button></div>,
}));

vi.mock('../components/EstimatePortalTemplates', () => ({
  default: () => <div data-testid="estimate-templates-module">Estimate Templates Content</div>,
}));

vi.mock('../components/CommunicationTemplates', () => ({
  default: () => <div data-testid="communication-templates-module">Communication Templates Content</div>,
}));

vi.mock('../components/MoverSizeSettings', () => ({
  default: ({ branchId }) => <div data-testid="mover-size-settings-module">Move Sizes Settings: branch {branchId}</div>,
}));

vi.mock('../components/IntegrationSettings', () => ({
  default: ({ view }) => <div data-testid="integration-settings-module">Integration Settings: {view}</div>,
}));

vi.mock('../components/InventoryWorkflowSettings', () => ({
  default: ({ branchId }) => <div data-testid="inventory-workflow-settings-module">Inventory Settings: branch {branchId}</div>,
}));

describe('SettingsHub', () => {
  beforeEach(() => {
    navigate.mockClear();
    routeState.pathname = '/settings/company/profile';
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
    expect(screen.getByTitle('Operations & Fleet')).toBeInTheDocument();
    expect(screen.getByTitle('Team & Security')).toBeInTheDocument();
    expect(screen.getByTitle('Sales & CRM')).toBeInTheDocument();
    expect(screen.getByTitle('Move Classifications')).toBeInTheDocument();
    expect(screen.queryByTitle('Inventory Settings')).not.toBeInTheDocument();

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

  it('redirects from /settings/documents to /settings/documents/document-templates', () => {
    routeState.pathname = '/settings/documents';
    routeState.params = { mainGroup: 'documents' };
    render(<SettingsHub />);

    expect(navigate).toHaveBeenCalledWith('/settings/documents/document-templates', { replace: true });
  });

  it('navigates to /settings/documents/document-templates when clicking Documents in Settings left rail', () => {
    routeState.pathname = '/settings/company/profile';
    routeState.params = { mainGroup: 'company', subTab: 'profile' };
    render(<SettingsHub />);

    const docsButton = screen.getByRole('button', { name: /Documents/i });
    fireEvent.click(docsButton);

    expect(navigate).toHaveBeenCalledWith('/settings/documents/document-templates');
  });

  it('renders Documents group cleanly under /settings/documents/document-templates', () => {
    routeState.pathname = '/settings/documents/document-templates';
    routeState.params = { mainGroup: 'documents', subTab: 'document-templates' };
    render(<SettingsHub />);

    expect(screen.getByRole('heading', { name: 'Settings Hub' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Document Templates/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Estimate Templates/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Email & SMS Templates/i })).toBeInTheDocument();
    expect(screen.getByTestId('document-templates-module')).toBeInTheDocument();
  });

  it('navigates to estimate templates under /settings/documents when tab is clicked', () => {
    routeState.pathname = '/settings/documents/document-templates';
    routeState.params = { mainGroup: 'documents', subTab: 'document-templates' };
    render(<SettingsHub />);

    const estimateTab = screen.getByRole('tab', { name: /Estimate Templates/i });
    fireEvent.click(estimateTab);

    expect(navigate).toHaveBeenCalledWith('/settings/documents/estimate-portal-templates');
  });

  it('renders Documents Hub cleanly when under standalone /documents', () => {
    routeState.pathname = '/documents/document-templates';
    routeState.params = { subTab: 'document-templates' };
    render(<SettingsHub initialGroup="documents" />);

    expect(screen.getByRole('heading', { name: 'Documents Hub' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Document Templates/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Estimate Templates/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+ Create Template/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('document-templates-module')).toBeInTheDocument();
  });

  it('opens the separate invoice section under documents', () => {
    routeState.pathname = '/documents/document-templates';
    routeState.params = { subTab: 'document-templates' };
    render(<SettingsHub initialGroup="documents" />);
    fireEvent.click(screen.getByRole('tab', { name: /^Invoice Templates/ }));
    expect(navigate).toHaveBeenCalledWith('/documents/invoice-templates');
  });

  it('scopes invoice creation to invoice categories', async () => {
    routeState.pathname = '/documents/invoice-templates';
    routeState.params = { subTab: 'invoice-templates' };
    render(<SettingsHub initialGroup="documents" />);
    expect(screen.getByTestId('document-templates-module')).toHaveTextContent('invoice');
    fireEvent.click(screen.getByRole('button', { name: 'New template' }));
    expect(screen.getByRole('radio', { name: /invoice template/i })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    const options = [...screen.getByLabelText(/Document Applies To/i).options].map((option) => option.value);
    expect(options).toEqual(['invoice', 'invoice:deposit', 'invoice:storage', 'invoice:progress']);
  });

  it('navigates to estimate templates under /documents when clicked', () => {
    routeState.pathname = '/documents/document-templates';
    routeState.params = { subTab: 'document-templates' };
    render(<SettingsHub initialGroup="documents" />);

    const estimateTab = screen.getByRole('tab', { name: /Estimate Templates/i });
    fireEvent.click(estimateTab);

    expect(navigate).toHaveBeenCalledWith('/documents/estimate-portal-templates');
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


  it('redirects legacy inventory route to moves inventory tab', () => {
    routeState.params = { mainGroup: 'inventory', subTab: 'inventory' };
    render(<SettingsHub />);

    expect(navigate).toHaveBeenCalledWith('/settings/moves/inventory', { replace: true });
  });

  it('renders Inventory Helpers under Moves section', () => {
    routeState.params = { mainGroup: 'moves', subTab: 'inventory' };
    render(<SettingsHub />);

    expect(screen.getByRole('tab', { name: /Inventory Helpers/i })).toBeInTheDocument();
    expect(screen.getByTestId('inventory-workflow-settings-module')).toHaveTextContent('Inventory Settings: branch 1');
  });
});
