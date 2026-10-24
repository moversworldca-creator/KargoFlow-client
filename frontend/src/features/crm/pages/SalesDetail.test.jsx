import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SalesDetail from './SalesDetail';
import * as apiService from '../../../services/api';

const routeState = vi.hoisted(() => ({
  params: { id: '123' },
  location: { pathname: '/sales/123', state: {} },
}));
const timelineState = vi.hoisted(() => ({
  activities: [],
}));

// Mock components that we don't need to test in detail
vi.mock('../components/RedesignSalesComponents', () => ({
  CardCustomerMoveDate: () => <div data-testid="card-move-date" />,
  CommsHub: () => <div data-testid="comms-hub" />,
  Timeline: ({ activities = [], onEditCall, onDeleteCall }) => {
    timelineState.activities = activities;
    return (
    <div data-testid="timeline">
      <div data-testid="timeline-count">{activities.length}</div>
      <button type="button" onClick={() => onEditCall({ call_log_details: { id: 701, disposition: 'connected', duration_seconds: 120, notes: 'Original call note' } })}>Edit Call Log</button>
      <button type="button" onClick={() => onDeleteCall({ call_log_details: { id: 701 } })}>Delete Call Log</button>
    </div>
    );
  },
  SidebarSpecs: ({ onInlineSave }) => <div data-testid="sidebar-specs">
    <button type="button" onClick={() => onInlineSave('assigned_to', '82', { id: 82, label: 'Employee Ada' })}>Assign employee</button>
    <button type="button" onClick={() => onInlineSave('move_size', '8', { id: 8, label: '2 Bedroom' })}>Set move size</button>
  </div>,
  InventorySnapshot: () => <div data-testid="inventory-snapshot" />,
  RouteLogisticsCard: ({ routeStops = [], onEdit }) => (
    <div data-testid="route-logistics-card">
      {routeStops.map((stop) => <div key={stop.id}>{stop.address}</div>)}
      {onEdit ? <button type="button" onClick={onEdit}>Edit route logistics</button> : null}
    </div>
  ),
  RouteSection: ({ origin, destination, onChange, onSave, onCancelEdit }) => (
    <div role="dialog" aria-label="Route editor">
      <input aria-label="Origin address" value={origin?.line1 || ''} onChange={(event) => onChange('origin_street', event.target.value)} />
      <input aria-label="Destination address" value={destination?.line1 || ''} onChange={(event) => onChange('destination_street', event.target.value)} />
      <button type="button" onClick={onSave}>Save route</button>
      <button type="button" onClick={onCancelEdit}>Cancel route</button>
    </div>
  ),
  CustomerCard: ({ customerName, email, phone, location, onInlineSave, onManageContacts, additionalContacts = [] }) => (
    <div data-testid="customer-card">
      <div>{customerName}</div>
      <div>{email}</div>
      <div>{phone}</div>
      <button type="button" onClick={() => onInlineSave('email', 'updated@example.com')}>Inline Email Save</button>
      <button type="button" onClick={() => onInlineSave('phone', '555-777-8888')}>Inline Phone Save</button>
      <div>{location}</div>
      <button type="button" onClick={onManageContacts}>Contacts</button>
      {additionalContacts.map((contact) => (
        <div key={contact.id || contact.email}>{contact.name}</div>
      ))}
    </div>
  ),
  PlannedMoveCard: ({ plannedMove: {
    fetchAvailability = () => {},
    onStartEdit,
    onMoveDateChange,
    onArrivalWindowChange,
    onSave,
    onClearSchedule,
  } }) => (
    <div data-testid="planned-move-card">
      <button type="button" onClick={() => fetchAvailability('2026-07-10')}>Read Availability</button>
      <button
        type="button"
        onClick={() => {
          onStartEdit();
          onMoveDateChange('2026-07-10');
          onArrivalWindowChange?.('09:00', '11:00');
        }}
      >
        Select Schedule
      </button>
      <button type="button" onClick={onSave}>Apply Schedule</button>
      <button type="button" onClick={onClearSchedule}>Clear Schedule</button>
    </div>
  )
}));

vi.mock('../components/SalesLifecyclePanel', () => ({
  default: ({ opportunityId }) => <div data-testid="sales-lifecycle-panel" data-opportunity-id={opportunityId} />,
}));
vi.mock('../components/EstimateView', () => {
  return {
    default: ({ initialSubTab }) => (
      <div data-testid="estimate-view" data-initial-sub-tab={initialSubTab}>
        Estimate view {initialSubTab}
      </div>
    )
  };
});

vi.mock('../components/StorageView', () => {
  return {
    default: () => <div data-testid="storage-view" />
  };
});

vi.mock('../components/LeadSpecs', () => {
  return {
    default: ({ onInlineSave }) => <div data-testid="lead-specs">
      <button type="button" onClick={() => onInlineSave('assigned_to', '82', { id: 82, label: 'Employee Ada' })}>Assign employee</button>
      <button type="button" onClick={() => onInlineSave('move_size', '8', { id: 8, label: '2 Bedroom' })}>Set move size</button>
    </div>
  };
});

vi.mock('../components/RingCentralEmbeddablePanel', () => {
  return {
    default: () => <div data-testid="ringcentral-panel" />
  };
});

vi.mock('../components/MovablePanel', () => {
  return {
    default: ({ children }) => <div data-testid="movable-panel">{children}</div>
  };
});

vi.mock('../../files/components/CategorizedFilesPanel', () => {
  return {
    default: () => <div data-testid="files-panel" />
  };
});

vi.mock('../../../shared/ui/AsyncSelect', () => ({
  default: ({ value, onChange }) => (
    <select data-testid="async-select" value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">Select teammate...</option>
      <option value="7">Dinesh Kumar</option>
    </select>
  )
}));

vi.mock('../../../services/api', () => {
  const mockOpportunity = {
    id: 123,
    status: 'booked',
    status_code: 'booked',
    workflow_stage: 'booked',
    is_booked: true,
    customer_details: {
      id: 321,
      full_name: 'Dinesh Kumar',
      first_name: 'Dinesh',
      last_name: 'Kumar',
      email: 'sandeshnirmalme28@gmail.com',
      phone: '95854561230',
      primary_phone: '95854561230',
      contacts: [
        {
          id: 901,
          name: 'Asha Kumar',
          email: 'asha@example.com',
          phone: '555-0901',
          phone_type: 'mobile',
          relationship: 'Spouse',
          is_primary: false,
        },
      ],
    },
    origin_address_details: {
      address_line1: 'Calgary',
      city: 'Calgary',
      state: 'AB'
    },
    destination_address_details: {
      address_line1: 'Toronto',
      city: 'Toronto',
      state: 'ON'
    },
    stops: [
      {
        id: 700,
        stop_type: 'stop',
        notes: 'Storage pickup',
        sort_order: 0,
        address_details: {
          address_line1: '100 Storage Way',
          city: 'Red Deer',
          state: 'AB',
          postal_code: 'T4N 1A1',
          property_type: 'storage'
        }
      }
    ],
    customer: 321,
    lead: null,
    assigned_user: 7
  };

  const mockJob = {
    id: 456,
    opportunity: 123,
    lifecycle_stage: 'active',
    move_date: '2026-06-15'
  };

  const mockAccountingSummary = {
    estimate: {
      id: 789,
      grand_total: '1500.00'
    },
    payments: {
      total_paid: '1000.00',
      balance_due: '500.00'
    },
    invoice: {
      id: 111,
      invoice_number: 'INV-00123',
      status: 'pending',
      line_items: [
        {
          id: 1,
          name: 'Moving Labor',
          category: 'moving_labor',
          quantity: 4,
          unit_price: '100.00',
          line_total: '400.00',
          taxable: true
        }
      ],
      subtotal: '400.00',
      discount_amount: '0.00',
      tax_rate: '0.05',
      tax_amount: '20.00',
      total: '420.00',
      balance_due: '420.00'
    },
    costs: {
      total: '150.00',
      by_category: {
        fuel: '50.00',
        misc: '100.00'
      }
    }
  };

  const mockCrewResponse = [
    { id: 1, first_name: 'John', last_name: 'Doe', display_name: 'John Doe', email: 'john@movers.com', is_active: true }
  ];

  const defaultExport = {
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    sales: {
      getOpportunityPlannedSubJobs: vi.fn().mockResolvedValue([]),
      getOpportunityAccountingSummary: vi.fn().mockResolvedValue({
        ...mockAccountingSummary,
        jobs: [{ ...mockJob, invoice: mockAccountingSummary.invoice, estimate_id: 789 }],
        estimates: [{ ...mockAccountingSummary.estimate, invoice: mockAccountingSummary.invoice }],
      }),
      getOpportunityInvoiceDraft: vi.fn().mockResolvedValue(null),
      getOpportunityInvoice: vi.fn().mockResolvedValue(null),
      saveOpportunityInvoiceDraft: vi.fn().mockResolvedValue({}),
      finalizeOpportunityInvoice: vi.fn().mockResolvedValue({}),
      sendOpportunityInvoice: vi.fn().mockResolvedValue({}),
      createOpportunityInvoiceLineItem: vi.fn().mockResolvedValue({}),
      updateOpportunityInvoiceLineItem: vi.fn().mockResolvedValue({}),
      deleteOpportunityInvoiceLineItem: vi.fn().mockResolvedValue({}),
      createOpportunityPlannedSubJob: vi.fn().mockResolvedValue({}),
      updateOpportunityPlannedSubJob: vi.fn().mockResolvedValue({}),
      deleteOpportunityPlannedSubJob: vi.fn().mockResolvedValue({}),
    },
    jobs: {
      getJobs: vi.fn().mockResolvedValue([mockJob]),
      getJobAccountingSummary: vi.fn().mockResolvedValue(mockAccountingSummary),
      getOpportunityPlannedSubJobs: vi.fn().mockResolvedValue([]),
      createManualJobPayment: vi.fn().mockResolvedValue({ id: 999 }),
      updateManualJobPayment: vi.fn().mockResolvedValue({}),
      deleteManualJobPayment: vi.fn().mockResolvedValue({}),
    },
    crew: {
      getCrewMembers: vi.fn().mockResolvedValue(mockCrewResponse)
    },
    files: {
      list: vi.fn().mockResolvedValue([])
    },
    payments: {
      getPayments: vi.fn().mockResolvedValue([]),
      getPaymentRequests: vi.fn().mockResolvedValue([]),
      getRefunds: vi.fn().mockResolvedValue([])
    }
  };

  return {
    default: defaultExport,
    getOpportunity: vi.fn().mockResolvedValue(mockOpportunity),
    updateOpportunity: vi.fn().mockResolvedValue({}),
    createOpportunity: vi.fn().mockResolvedValue({}),
    getTimelineEvents: vi.fn().mockResolvedValue([]),
    sendRecordEmail: vi.fn().mockResolvedValue({ id: 901, status: 'queued' }),
    markOpportunityEstimateCreated: vi.fn().mockResolvedValue({}),
    bookOpportunityJob: vi.fn().mockResolvedValue({}),
    unbookOpportunityJob: vi.fn().mockResolvedValue({
      id: 123,
      workflow_stage: 'opportunity',
    }),
    confirmOpportunityJob: vi.fn().mockResolvedValue({}),
    cancelOpportunityJob: vi.fn().mockResolvedValue({}),
    completeOpportunityJob: vi.fn().mockResolvedValue({}),
    markOpportunityLost: vi.fn().mockResolvedValue({}),
    reopenOpportunity: vi.fn().mockResolvedValue({}),
    createOpportunityStop: vi.fn().mockResolvedValue({}),
    createOpportunityJobStop: vi.fn().mockResolvedValue({}),
    updateOpportunityStop: vi.fn().mockResolvedValue({}),
    updateOpportunityJobStop: vi.fn().mockResolvedValue({}),
    deleteOpportunityStop: vi.fn().mockResolvedValue({}),
    createSalesActivity: vi.fn().mockResolvedValue({}),
    updateSalesActivity: vi.fn().mockResolvedValue({}),
    deleteSalesActivity: vi.fn().mockResolvedValue({}),
    getActivities: vi.fn().mockResolvedValue([]),
    getTasks: vi.fn().mockResolvedValue([]),
    createTask: vi.fn().mockResolvedValue({}),
    updateTask: vi.fn().mockResolvedValue({}),
    getStatusCodes: vi.fn().mockResolvedValue([]),
    getStatusCodeLookups: vi.fn().mockResolvedValue([]),
    getOpportunityLossReasonLookups: vi.fn().mockResolvedValue([]),
    getCancellationReasons: vi.fn().mockResolvedValue([]),
    getDisqualificationReasons: vi.fn().mockResolvedValue([]),
    disqualifyLead: vi.fn().mockResolvedValue({ id: 123, system_state: 'disqualified' }),
    restoreLead: vi.fn().mockResolvedValue({ id: 123, system_state: 'in_progress' }),
    archiveLead: vi.fn().mockResolvedValue({ id: 123, system_state: 'archived' }),
    getOpportunityBookingReadiness: vi.fn().mockResolvedValue({ ready: true, missing: [], overridable_missing: [] }),
    getOpportunityLossReasonLookupsPage: vi.fn().mockResolvedValue({ results: [] }),
    getBranches: vi.fn().mockResolvedValue([]),
    getBranchLookups: vi.fn().mockResolvedValue([]),
    getBranchLookupsPage: vi.fn().mockResolvedValue({ results: [] }),
    getEstimates: vi.fn().mockResolvedValue([]),
    getUsers: vi.fn().mockResolvedValue([]),
    getLookupUsers: vi.fn().mockResolvedValue([]),
    getLookupEmployeesPage: vi.fn().mockResolvedValue({ results: [] }),
    getLeadStatusCodeLookups: vi.fn().mockResolvedValue([]),
    sendRecordSms: vi.fn().mockResolvedValue({}),
    getLookupUsersPage: vi.fn().mockResolvedValue({ results: [] }),
    getMoverSizes: vi.fn().mockResolvedValue([]),
    getMoverSizeLookups: vi.fn().mockResolvedValue([]),
    getMoveTypeLookups: vi.fn().mockResolvedValue([]),
    getServices: vi.fn().mockResolvedValue([]),
    getReferralSources: vi.fn().mockResolvedValue([]),
    getReferralSourceLookups: vi.fn().mockResolvedValue([]),
    getStatusCodeLookupsPage: vi.fn().mockResolvedValue({ results: [] }),
    updateCustomer: vi.fn().mockResolvedValue({}),
    createCustomer: vi.fn().mockResolvedValue({}),
    createCustomerContact: vi.fn().mockResolvedValue({
      id: 902,
      name: 'Ravi Kumar',
      email: 'ravi@example.com',
      phone: '555-0902',
      phone_type: 'work',
      relationship: 'Assistant',
      is_primary: false,
    }),
    updateCustomerContact: vi.fn().mockResolvedValue({}),
    deleteCustomerContact: vi.fn().mockResolvedValue({}),
    seedCommunicationTemplates: vi.fn().mockResolvedValue({}),
    getSendGridConfig: vi.fn().mockResolvedValue([]),
    getResendConfig: vi.fn().mockResolvedValue([]),
    getSMTPConfig: vi.fn().mockResolvedValue([]),
    getLead: vi.fn().mockResolvedValue({}),
    assignLead: vi.fn().mockResolvedValue({}),
    updateLead: vi.fn().mockResolvedValue({}),
    createLead: vi.fn().mockResolvedValue({}),
    startLead: vi.fn().mockResolvedValue({}),
    qualifyLead: vi.fn().mockResolvedValue({}),
    convertLead: vi.fn().mockResolvedValue({}),
    markLeadLost: vi.fn().mockResolvedValue({}),
    reopenLead: vi.fn().mockResolvedValue({}),
    getLeadActivities: vi.fn().mockResolvedValue([]),
    createLeadActivity: vi.fn().mockResolvedValue([]),
    updateLeadActivity: vi.fn().mockResolvedValue({}),
    getCommunicationTemplates: vi.fn().mockResolvedValue([]),
    getCommunicationTemplateCategories: vi.fn().mockResolvedValue([]),
    previewCommunicationTemplate: vi.fn().mockResolvedValue({}),
    getDocumentTemplates: vi.fn().mockResolvedValue([]),
    createContract: vi.fn().mockResolvedValue({}),
    getContracts: vi.fn().mockResolvedValue([]),
    previewDocumentTemplate: vi.fn().mockResolvedValue({}),
    sendContractForSignature: vi.fn().mockResolvedValue({}),
    getNotifications: vi.fn().mockResolvedValue([]),
    markNotificationRead: vi.fn().mockResolvedValue({}),
    markNotificationUnread: vi.fn().mockResolvedValue({}),
    createEstimate: vi.fn().mockResolvedValue({}),
    getOpportunityBySalesNumber: vi.fn().mockResolvedValue(mockOpportunity),
    getOpportunityAvailability: vi.fn().mockResolvedValue({}),
    duplicateLead: vi.fn().mockResolvedValue({}),
    duplicateOpportunity: vi.fn().mockResolvedValue({}),
    getPayments: vi.fn().mockResolvedValue([]),
    getPaymentRequests: vi.fn().mockResolvedValue([]),
    getRefunds: vi.fn().mockResolvedValue([]),
    getPaymentGateways: vi.fn().mockResolvedValue([]),
    createRefund: vi.fn().mockResolvedValue({}),
    createManualJobPayment: vi.fn().mockResolvedValue({ id: 999 }),
    updateManualJobPayment: vi.fn().mockResolvedValue({}),
    deleteManualJobPayment: vi.fn().mockResolvedValue({}),
    createPaymentRequestAndSend: vi.fn().mockResolvedValue({}),
    getJobs: vi.fn().mockResolvedValue([mockJob]),
    getJobAccountingSummary: vi.fn().mockResolvedValue(mockAccountingSummary),
    getOpportunityPlannedSubJobs: vi.fn().mockResolvedValue([]),
  };
});

// Mock react-router useParams and useNavigate
vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    useParams: () => routeState.params,
    useNavigate: () => vi.fn(),
    useLocation: () => routeState.location,
    Link: ({ children, to }) => <a href={to}>{children}</a>
  };
});

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, is_superuser: true, is_system_admin: false },
    permissionSet: new Set(['crm.admin']),
  }),
}));

vi.mock('../../../shared/auth/useCan', () => ({
  default: () => ({
    canAll: () => true,
    canAny: () => true,
    can: () => true,
    context: { permissions: new Set(['crm.admin']), isSuperuser: true, isSystemAdmin: false, isCompanyAdmin: false },
  }),
}));

// Restore implementations as well as call counts: one scenario must not change the next.
const mockDefaults = [];
const rememberMocks = (object) => {
  for (const value of Object.values(object)) {
    if (vi.isMockFunction(value)) mockDefaults.push([value, value.getMockImplementation()]);
    else if (value && typeof value === 'object') rememberMocks(value);
  }
};
rememberMocks(apiService);

describe('SalesDetail Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDefaults.forEach(([mock, implementation]) => mock.mockReset().mockImplementation(implementation));
    timelineState.activities = [];
    routeState.params = { id: '123' };
    routeState.location = { pathname: '/sales/123', state: {} };
  });

  const renderComponent = ({
    initialEntry = '/sales/123',
    routePath = '/sales/:id',
    params = { id: '123' },
  } = {}) => {
    routeState.params = params;
    routeState.location = { pathname: initialEntry, state: {} };
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path={routePath} element={<SalesDetail />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders workspace details and loads opportunity data', async () => {
    renderComponent();

    // Verify contact name shows in title or page
    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
      expect(screen.getByText('Calgary')).toBeInTheDocument();
    });
  });

  it('renders route logistics from the primary planned job stops', async () => {
    apiService.default.sales.getOpportunityPlannedSubJobs.mockResolvedValue([
      {
        id: 880,
        is_primary: true,
        stops: [
          {
            id: 881,
            stop_type: 'origin',
            sort_order: 0,
            address_line1: '25 Job Origin Road',
            city: 'Airdrie',
            state: 'AB',
            zip_code: 'T4A 0A1',
          },
          {
            id: 882,
            stop_type: 'destination',
            sort_order: 1,
            address_line1: '90 Job Destination Avenue',
            city: 'Edmonton',
            state: 'AB',
            zip_code: 'T5J 0N3',
          },
        ],
      },
    ]);

    renderComponent();

    await waitFor(() => {
      expect(apiService.default.sales.getOpportunityPlannedSubJobs).toHaveBeenCalledWith(123);
    });
    expect(await screen.findByText(/25 Job Origin Road/)).toBeInTheDocument();
    expect(screen.getByText(/90 Job Destination Avenue/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit route logistics' }));
    expect(screen.getByPlaceholderText('Enter origin address')).toHaveValue('25 Job Origin Road');
    expect(screen.getByPlaceholderText('Enter destination address')).toHaveValue('90 Job Destination Avenue');
  });

  it('loads estimate context for the sales route so inventory can request data after refresh', async () => {
    renderComponent({
      initialEntry: '/crm/opportunity/123/sales',
      routePath: '/crm/:entityType/:id/:tabId',
      params: { entityType: 'opportunity', id: '123', tabId: 'sales' },
    });

    await waitFor(() => {
      expect(apiService.getOpportunityBySalesNumber).toHaveBeenCalledWith('123');
      expect(apiService.getEstimates).toHaveBeenCalledWith({ opportunity: 123 });
    });
  });

  it('does not assign an unassigned lead when it is opened', async () => {
    apiService.getLead.mockResolvedValueOnce({
      id: 123,
      status: 'new',
      status_code: 'new',
      workflow_stage: 'new_lead',
      customer: 321,
      lead: null,
      assigned_to: null,
      customer_details: {
        id: 321,
        full_name: 'Dinesh Kumar',
        first_name: 'Dinesh',
        last_name: 'Kumar',
        email: 'sandeshnirmalme28@gmail.com',
        phone: '95854561230',
        primary_phone: '95854561230',
      },
      origin_address_details: {
        address_line1: 'Calgary',
        city: 'Calgary',
        state: 'AB',
      },
      destination_address_details: {
        address_line1: 'Toronto',
        city: 'Toronto',
        state: 'ON',
      },
      stops: [],
    });

    renderComponent({
      initialEntry: '/leads/123',
      routePath: '/leads/:id',
      params: { id: '123' },
    });

    await waitFor(() => {
      expect(apiService.getLead).toHaveBeenCalledWith('123');
      expect(apiService.assignLead).not.toHaveBeenCalled();
      expect(apiService.updateLead).not.toHaveBeenCalled();
    });
  });

  it('reads, updates, and clears route logistics on the lead details page', async () => {
    apiService.getLead.mockResolvedValue({
      id: 123,
      system_state: 'new',
      first_name: 'Dinesh',
      last_name: 'Kumar',
      email: 'dinesh@example.com',
      origin_street: '10 Existing Origin Street',
      origin_city: 'Calgary',
      origin_state: 'AB',
      origin_zip: 'T2P 1J9',
      destination_street: '20 Existing Destination Road',
      destination_city: 'Edmonton',
      destination_state: 'AB',
      destination_zip: 'T5J 0N3',
    });
    apiService.updateLead.mockResolvedValue({
      id: 123,
      system_state: 'new',
      origin_street: '10 Existing Origin Street',
      destination_street: '20 Existing Destination Road',
      origin_address_details: { address_line1: '10 Existing Origin Street', city: 'Calgary', state: 'AB' },
      destination_address_details: { address_line1: '20 Existing Destination Road', city: 'Edmonton', state: 'AB' },
    });

    renderComponent({
      initialEntry: '/leads/123',
      routePath: '/leads/:id',
      params: { id: '123' },
    });

    expect(await screen.findByText(/10 Existing Origin Street/)).toBeInTheDocument();
    expect(screen.getByText(/20 Existing Destination Road/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit route logistics' }));
    fireEvent.change(screen.getByPlaceholderText('Enter origin address'), {
      target: { value: '30 Updated Origin Avenue' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter destination address'), {
      target: { value: '40 Updated Destination Boulevard' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(apiService.updateLead).toHaveBeenCalledWith(123, expect.objectContaining({
        origin_street: '30 Updated Origin Avenue',
        destination_street: '40 Updated Destination Boulevard',
      }));
    });
    expect(apiService.updateLead.mock.calls[0][1]).not.toHaveProperty('origin_address_line1');
    expect(apiService.updateLead.mock.calls[0][1]).not.toHaveProperty('destination_address_line1');
    expect(screen.getByText(/30 Updated Origin Avenue/)).toBeInTheDocument();
    expect(screen.getByText(/40 Updated Destination Boulevard/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit route logistics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear origin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear destination' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(apiService.updateLead).toHaveBeenLastCalledWith(123, expect.objectContaining({
        origin_street: '',
        destination_street: '',
      }));
    });
  });

  it('renders additional contacts loaded by canonical opportunity refresh', async () => {
    apiService.getOpportunityBySalesNumber.mockResolvedValueOnce({
      id: 998,
      status: 'new',
      status_code: 'new',
      workflow_stage: 'opportunity',
      customer: 321,
      lead: null,
      customer_details: {
        id: 321,
        full_name: 'Dinesh Kumar',
        first_name: 'Dinesh',
        last_name: 'Kumar',
        email: 'sandeshnirmalme28@gmail.com',
        phone: '95854561230',
        primary_phone: '95854561230',
        contacts: [
          {
            id: 903,
            name: 'Ravi Kumar',
            email: 'ravi@example.com',
            phone: '555-0902',
            phone_type: 'work',
            relationship: 'Assistant',
            is_primary: false,
          },
        ],
      },
      origin_address_details: {
        address_line1: 'Calgary',
        city: 'Calgary',
        state: 'AB',
      },
      destination_address_details: {
        address_line1: 'Toronto',
        city: 'Toronto',
        state: 'ON',
      },
      stops: [],
    });

    renderComponent({
      initialEntry: '/crm/opportunity/998',
      routePath: '/crm/:entityType/:id',
      params: { entityType: 'opportunity', id: '998' },
    });

    await waitFor(() => {
      expect(apiService.getOpportunityBySalesNumber).toHaveBeenCalledWith('998');
      expect(screen.getByTestId('customer-card')).toHaveTextContent('Ravi Kumar');
    });
  });

  it('saves inline customer email and phone edits from the customer card', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('customer-card')).toHaveTextContent('Dinesh Kumar');
      expect(screen.getByTestId('customer-card')).toHaveTextContent('sandeshnirmalme28@gmail.com');
    });

    fireEvent.click(screen.getByRole('button', { name: /Inline Email Save/i }));

    await waitFor(() => {
      expect(apiService.updateCustomer).toHaveBeenCalledWith(321, expect.objectContaining({
        email: 'updated@example.com',
        primary_phone: '95854561230',
      }));
    });

    fireEvent.click(screen.getByRole('button', { name: /Inline Phone Save/i }));

    await waitFor(() => {
      expect(apiService.updateCustomer).toHaveBeenCalledWith(321, expect.objectContaining({
        email: 'updated@example.com',
        primary_phone: '555-777-8888',
      }));
    });
  });

  it('updates an existing additional customer contact', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Contacts$/i }));

    expect(await screen.findByText('Additional Contact Details')).toBeInTheDocument();
    expect(screen.getAllByText('Asha Kumar')[0]).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Asha Kumar'), { target: { value: 'Asha Updated' } });
    fireEvent.change(screen.getByDisplayValue('asha@example.com'), { target: { value: 'asha.updated@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Contacts/i }));

    await waitFor(() => {
      expect(apiService.updateCustomerContact).toHaveBeenCalledWith(901, {
        name: 'Asha Updated',
        email: 'asha.updated@example.com',
        phone: '555-0901',
        phone_type: 'mobile',
        relationship: 'Spouse',
        is_primary: false,
      }, 321);
    });
  });

  it('creates a new additional customer contact', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Contacts$/i }));
    expect(await screen.findByText('Additional Contact Details')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Add$/i }));
    fireEvent.change(screen.getByPlaceholderText('Enter contact name'), { target: { value: 'Ravi Kumar' } });
    fireEvent.change(screen.getByPlaceholderText('contact@example.com'), { target: { value: 'ravi@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('(555) 555-5555'), { target: { value: '555-0902' } });
    fireEvent.change(screen.getByPlaceholderText('mobile / home / work'), { target: { value: 'work' } });
    fireEvent.change(screen.getByPlaceholderText('Spouse / partner / assistant'), { target: { value: 'Assistant' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Contacts/i }));

    await waitFor(() => {
      expect(apiService.createCustomerContact).toHaveBeenCalledWith({
        customer: 321,
        name: 'Ravi Kumar',
        email: 'ravi@example.com',
        phone: '555-0902',
        phone_type: 'work',
        relationship: 'Assistant',
        is_primary: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('customer-card')).toHaveTextContent('Ravi Kumar');
    });
  });

  it('deactivates an additional contact and removes it from the customer card', async () => {
    renderComponent();

    fireEvent.click(await screen.findByRole('button', { name: /^Contacts$/i }));
    expect(await screen.findByText('Additional Contact Details')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Delete contact'));

    await waitFor(() => {
      expect(apiService.deleteCustomerContact).toHaveBeenCalledWith('901', 321);
      expect(screen.getByTestId('customer-card')).not.toHaveTextContent('Asha Kumar');
    });
  });

  it('reads availability for the scheduler date range', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('planned-move-card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Read Availability/i }));

    await waitFor(() => {
      expect(apiService.getOpportunityAvailability).toHaveBeenCalledWith(123, '2026-07-08');
    });
  });

  it('creates or updates the selected scheduler date and arrival window', async () => {
    apiService.updateOpportunity.mockResolvedValueOnce({
      id: 123,
      move_date: '2026-07-10',
      arrival_window_start: '09:00',
      arrival_window_end: '11:00',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('planned-move-card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Select Schedule/i }));

    await waitFor(() => {
      expect(apiService.getOpportunityAvailability).toHaveBeenCalledWith(123, '2026-07-08');
    });

    fireEvent.click(screen.getByRole('button', { name: /Apply Schedule/i }));

    await waitFor(() => {
      expect(apiService.updateOpportunity).toHaveBeenCalledWith(123, {
        move_date: '2026-07-10',
        arrival_window_start: '09:00',
        arrival_window_end: '11:00',
      });
    });
  });

  it('deletes the scheduler date and arrival window by clearing the schedule', async () => {
    apiService.updateOpportunity.mockResolvedValueOnce({
      id: 123,
      move_date: null,
      arrival_window_start: null,
      arrival_window_end: null,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('planned-move-card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Clear Schedule/i }));

    await waitFor(() => {
      expect(apiService.updateOpportunity).toHaveBeenCalledWith(123, {
        move_date: null,
        arrival_window_start: null,
        arrival_window_end: null,
      });
    });
  });

  it('loads, updates, and creates from the estimate requirements modal', async () => {
    apiService.getMoveTypeLookups.mockResolvedValue([{ id: 31, name: 'Company Move' }]);
    apiService.getServices.mockResolvedValue([{ id: 21, name: 'Company Service' }]);
    apiService.getOpportunityBySalesNumber.mockResolvedValueOnce({
      id: 123,
      workflow_stage: 'opportunity',
      system_state: 'open',
      customer: 321,
      branch: 1,
      branch_id: 1,
      service_type: 2,
      move_type: 3,
      move_date: null,
      customer_details: {
        id: 321, full_name: 'Dinesh Kumar', first_name: 'Dinesh', last_name: 'Kumar',
        email: 'sandeshnirmalme28@gmail.com', primary_phone: '95854561230',
      },
      origin_address_details: { address_line1: '1 Origin St' },
      destination_address_details: { address_line1: '2 Destination Ave' },
    });
    apiService.updateOpportunity.mockResolvedValueOnce({ id: 123, move_date: '2026-08-10' });
    apiService.createEstimate.mockResolvedValueOnce({ id: 777, opportunity: 123, method: 'manual' });

    renderComponent();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Create Estimate' }))[0]);
    const requirementsHeading = await screen.findByText('Complete Required Fields');
    expect(requirementsHeading).toBeInTheDocument();
    expect(screen.getByDisplayValue('Dinesh')).toBeInTheDocument();
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2026-08-10' } });
    const requirementSelects = requirementsHeading.closest('.fixed').querySelectorAll('select');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Company Move' })).toHaveValue('31'));
    expect(screen.getByRole('option', { name: 'Company Service' })).toHaveValue('21');
    expect(apiService.getMoveTypeLookups).toHaveBeenCalledWith();
    expect(apiService.getServices).toHaveBeenCalledWith();
    expect(screen.queryByRole('option', { name: 'Long Distance' })).not.toBeInTheDocument();
    fireEvent.change(requirementSelects[0], { target: { value: '7' } });
    fireEvent.change(requirementSelects[1], { target: { value: requirementSelects[1].options[1].value } });
    fireEvent.change(requirementSelects[2], { target: { value: requirementSelects[2].options[1].value } });
    fireEvent.click(screen.getByRole('button', { name: 'Save And Create Estimate' }));

    await waitFor(() => expect(apiService.updateOpportunity).toHaveBeenCalledWith(123, expect.objectContaining({
      move_date: '2026-08-10', service_type: '21', move_type: '31',
    })));
    expect(apiService.createEstimate).toHaveBeenCalledWith({ opportunity: 123, method: 'manual' });
  });

  it('opens the unbook modal from the workflow menu and submits the selected options', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Actions/i }));

    fireEvent.click(screen.getByRole('button', { name: /Unbook Job/i }));

    expect(await screen.findByRole('heading', { name: /Unbook Job/i })).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Select a reason...'), {
      target: { value: 'customer-requested-change' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Optional internal note/i), {
      target: { value: 'Customer moved the date' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Unbook Job/i }));

    await waitFor(() => {
      expect(apiService.unbookOpportunityJob).toHaveBeenCalledWith(123, {
        reason: 'customer-requested-change',
        note: 'Customer moved the date',
      });
    });
  });

  it('navigates tabs successfully', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
    });

    // We should see tabs: Sales, Estimate, Files, Accounting
    const salesTab = screen.getByRole('button', { name: /^Sales$/i });
    const estimateTab = screen.getByRole('button', { name: /^Estimate$/i });
    const accountingTab = screen.getByRole('button', { name: /^Accounting$/i });

    expect(salesTab).toBeInTheDocument();
    expect(estimateTab).toBeInTheDocument();
    expect(accountingTab).toBeInTheDocument();

    // Switch to Accounting tab
    fireEvent.click(accountingTab);
    await waitFor(() => {
      expect(screen.getAllByText(/Crew Payroll|No Job Found/i).length).toBeGreaterThan(0);
    });
  });

  it('locks estimate and related tabs when the opportunity is lost', async () => {
    apiService.getOpportunity.mockResolvedValueOnce({
      id: 123,
      status: 'lost',
      workflow_stage: 'lost',
      customer_details: {
        id: 321,
        full_name: 'Dinesh Kumar',
        first_name: 'Dinesh',
        last_name: 'Kumar',
        email: 'sandeshnirmalme28@gmail.com',
        phone: '95854561230',
        primary_phone: '95854561230',
      },
      origin_address_details: { address_line1: 'Calgary', city: 'Calgary', state: 'AB' },
      destination_address_details: { address_line1: 'Toronto', city: 'Toronto', state: 'ON' },
      customer: 321,
      lead: null,
    });
    apiService.getOpportunityBySalesNumber.mockResolvedValueOnce({
      id: 123,
      status: 'lost',
      workflow_stage: 'lost',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^Estimate$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Files & Photos$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Accounting$/i })).toBeDisabled();
  });

  it('opens the estimate page on the routed estimate sub-tab', async () => {
    renderComponent({
      initialEntry: '/crm/opportunity/998/estimate/route',
      routePath: '/crm/:entityType/:id/:tabId/:estimateTabId',
      params: { entityType: 'opportunity', id: '998', tabId: 'estimate', estimateTabId: 'route' },
    });

    const estimateView = await screen.findByTestId('estimate-view');
    expect(estimateView).toHaveAttribute('data-initial-sub-tab', 'route');
    expect(screen.getByTestId('customer-card')).toBeInTheDocument();
    expect(screen.getByTestId('planned-move-card')).toBeInTheDocument();
    expect(screen.getByTestId('route-logistics-card')).toBeInTheDocument();
  });

  it('toggles mobile sidebar drawer via info details button', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
    });

    // Toggle button exists
    const toggleBtn = screen.getByTitle(/Open details sidebar/i);
    expect(toggleBtn).toBeInTheDocument();

    // Click it to open
    fireEvent.click(toggleBtn);

    // Close button should now be visible or handle mobile sidebar open state
    const closeBtn = screen.getByLabelText(/Close sidebar/i);
    expect(closeBtn).toBeInTheDocument();

    // Click to close
    fireEvent.click(closeBtn);
  });

  it('displays job accounting summaries, crew, and invoice cards inside Accounting page', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
    });

    // Switch to Accounting
    fireEvent.click(screen.getByRole('button', { name: /^Accounting$/i }));

    // Wait for the accounting metrics and summaries to load
    await waitFor(() => {
      expect(screen.getAllByText(/Crew Payroll/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('$1500.00')[0]).toBeInTheDocument(); // Estimate grand total
      expect(screen.getAllByText('$1000.00')[0]).toBeInTheDocument(); // Paid total
      expect(screen.getAllByText('$500.00')[0]).toBeInTheDocument();  // Balance due
      expect(screen.getByText(/Job Invoices & Drafts/i)).toBeInTheDocument();
      expect(screen.getByText(/Crew Payroll/i)).toBeInTheDocument();
      expect(screen.getByText(/Job Costing & Expenses/i)).toBeInTheDocument();
      expect(screen.getByText(/Job Profitability Summary/i)).toBeInTheDocument();
      expect(screen.getAllByText('$420.00')[0]).toBeInTheDocument(); // Revenue/Invoice total
    });
  });

  it('includes inbound email events in the sales timeline', async () => {
    apiService.getTimelineEvents.mockResolvedValueOnce([
      {
        id: 501,
        source: 'inbound_email_resend',
        created_at: '2026-08-18T10:00:00.000Z',
        title: 'New inbound email',
        payload: {
          inbound_message_id: 9001,
          from_email: 'customer@example.com',
          subject: 'Question about my move',
          body_text: 'Please call me back.',
        },
      },
    ]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('timeline')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-count')).toHaveTextContent('1');
    });

    expect(timelineState.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activity_type: 'email',
          inbound_message_id: 9001,
          subject: 'Question about my move',
        }),
      ])
    );
  });

  it('deduplicates repeated inbound sms rows in the sales timeline', async () => {
    apiService.getTimelineEvents.mockResolvedValue([]);
    apiService.getOpportunity.mockResolvedValue({
      data: {
        id: 123,
        workflow_stage: 'booked',
        customer_details: {
          id: 321,
          full_name: 'Dinesh Kumar',
          first_name: 'Dinesh',
          last_name: 'Kumar',
          email: 'sandeshnirmalme28@gmail.com',
          phone: '95854561230',
        },
        lead: 555,
      },
    });
    apiService.getActivities
      .mockResolvedValueOnce({
        data: [
          {
            id: 11,
            activity_type: 'sms',
            direction: 'inbound',
            created_at: '2026-08-19T12:00:00.000Z',
            description: 'Inbound SMS body',
            timeline_source: 'opportunity',
            inbound_sms_id: 9001,
            sms_log_details: { to_phone: '5551231234' },
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'inbound-sms-9001',
            activity_type: 'sms',
            direction: 'inbound',
            created_at: '2026-08-19T12:00:00.000Z',
            description: 'Inbound SMS body',
            timeline_source: 'opportunity',
            inbound_sms_id: 9001,
            sms_log_details: { to_phone: '5551231234' },
          },
        ],
      });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('timeline')).toBeInTheDocument();
    });

    await waitFor(() => expect(screen.getByTestId('timeline-count')).toHaveTextContent('1'));
  });

  it('shows inbound sms timeline events in the sales activity feed', async () => {
    apiService.getActivities.mockResolvedValueOnce({
      data: [
        {
          id: 11,
          activity_type: 'note',
          created_at: '2026-08-19T10:00:00.000Z',
          description: 'Internal note',
          timeline_source: 'opportunity',
        },
      ],
    });
    apiService.getTimelineEvents.mockResolvedValueOnce({
      data: [
        {
          id: 'evt-sms-1',
          source: 'telnyx_inbound_sms',
          created_at: '2026-08-19T12:00:00.000Z',
          summary: 'Hello test',
          payload: {
            inbound_sms_id: 9001,
            provider_message_id: 'msg-9001',
            text: 'Hello test',
            to_phone: '+14375233738',
          },
        },
      ],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('timeline')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-count')).toHaveTextContent('2');
    });

    expect(timelineState.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activity_type: 'sms',
          timeline_source: 'telnyx_inbound_sms',
          inbound_sms_id: 9001,
        }),
      ])
    );
  });

  it('integrates PaymentsPanel inside Accounting page Right column', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
    });

    // Switch to Accounting
    fireEvent.click(screen.getByRole('button', { name: /^Accounting$/i }));

    // Verify Payments ledger headers show inside the PaymentsPanel
    await waitFor(() => {
      expect(screen.getByText(/Payments Ledger/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Balance/i)[0]).toBeInTheDocument();
      expect(screen.getByText(/No payment records found/i)).toBeInTheDocument(); // Mock list starts empty
    });
  });

  it('opens the payments sub-tab from the Payments tab', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Payments$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('estimate-view')).toHaveAttribute('data-initial-sub-tab', 'payments');
    });
    expect(screen.getByTestId('estimate-view')).toBeInTheDocument();
  });

  it('shows opportunity payments in Accounting page even when no job exists yet', async () => {
    apiService.default.jobs.getJobs.mockResolvedValue([]);
    apiService.default.sales.getOpportunityAccountingSummary.mockResolvedValue(null);
    apiService.default.payments.getPayments.mockResolvedValue([
      {
        id: 42,
        amount: '250.00',
        created_at: '2026-07-18T10:15:00.000Z',
        status: 'succeeded',
        payment_method_type: 'card',
      },
    ]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Accounting$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Payment Activity/i)).toBeInTheDocument();
      expect(screen.getAllByText('$250.00').length).toBeGreaterThan(0);
      expect(screen.getByText(/card/i)).toBeInTheDocument();
    });
  });

  it('performs CRUD operations on Follow-up Notes', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
    });

    // 1. Follow-up Notes CRUD
    const addFollowUpBtns = screen.getAllByRole('button', { name: /Add Follow-up/i });
    if (addFollowUpBtns.length > 0) {
      fireEvent.click(addFollowUpBtns[0]);
    }
    
    // Fill required fields
    const subjectInput = await screen.findByPlaceholderText(/e.g. Check on inventory/i);
    fireEvent.change(subjectInput, { target: { value: 'Follow up test subject' } });

    // Select Assigned To
    const assignSelect = screen.getByTestId('async-select');
    fireEvent.change(assignSelect, { target: { value: '7' } });
    
    // Find the due date input by type (since label might not be linked)
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
      fireEvent.change(input, { target: { value: '2026-07-20' } });
    });

    // Fill notes
    const followUpNoteInput = screen.getByPlaceholderText(/Optional notes for this follow-up/i);
    fireEvent.change(followUpNoteInput, { target: { value: 'New Follow-up Note' } });
    
    // Save
    fireEvent.click(screen.getByRole('button', { name: /Create Follow-up/i }));
    await waitFor(() => {
      expect(apiService.createTask).toHaveBeenCalledWith(expect.objectContaining({ notes: 'New Follow-up Note' }));
    });
  });

  it('performs CRUD operations on Call Log Notes', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getAllByText('Dinesh Kumar')[0]).toBeInTheDocument();
    });

    // 2. Call Log Notes CRUD (Update, Delete)
    fireEvent.click(screen.getByRole('button', { name: /Edit Call Log/i }));
    
    const callLogNoteInput = await screen.findByPlaceholderText(/Call notes.../i);
    fireEvent.change(callLogNoteInput, { target: { value: 'Updated Call Note' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Call Log/i }));

    await waitFor(() => {
      expect(apiService.default.patch).toHaveBeenCalledWith('/sales/call-logs/701/', expect.objectContaining({ disposition: 'connected' }));
    });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /Delete Call Log/i }));
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(apiService.default.delete).toHaveBeenCalledWith('/sales/call-logs/701/');
    });
    confirmSpy.mockRestore();
  });
  const leadFixture = { id: 123, first_name: 'Ada', last_name: 'Lead', status: 'new', system_state: 'new', branch: 1, branch_id: 1, assigned_to: null, move_size: 2 };
  it('renders the canonical full name when separate lead name fields are empty', async () => {
    apiService.getLead.mockResolvedValue({ ...leadFixture, first_name: '', last_name: '', full_name: 'Grace Hopper' });
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
  });

  it('updates the planned move date from a lead detail page', async () => {
    apiService.getLead.mockResolvedValue({ ...leadFixture, move_date: '2026-07-09' });
    apiService.updateLead.mockResolvedValue({ ...leadFixture, move_date: '2026-07-10' });
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    await screen.findByText('Ada Lead');
    fireEvent.click(screen.getByRole('button', { name: /Select Schedule/i }));
    fireEvent.click(screen.getByRole('button', { name: /Apply Schedule/i }));
    await waitFor(() => expect(apiService.updateLead).toHaveBeenCalledWith(123, { move_date: '2026-07-10' }));
  });

  it('reloads the same lead when quickly unmounted and reopened', async () => {
    apiService.getLead.mockResolvedValue(leadFixture);
    const first = renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    expect(await screen.findByText('Ada Lead')).toBeInTheDocument();
    first.unmount();
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    expect(await screen.findByText('Ada Lead')).toBeInTheDocument();
    expect(apiService.getLead).toHaveBeenCalledTimes(2);
  });
  it('saves employee assignment and move-size IDs from lead specs', async () => {
    apiService.getLead.mockResolvedValue(leadFixture);
    apiService.updateLead.mockResolvedValue(leadFixture);
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    await screen.findByText('Ada Lead');
    fireEvent.click(screen.getByRole('button', { name: 'Assign employee' }));
    await waitFor(() => expect(apiService.updateLead).toHaveBeenCalledWith(123, expect.objectContaining({ assigned_employee_id: 82 })));
    fireEvent.click(screen.getByRole('button', { name: 'Set move size' }));
    await waitFor(() => expect(apiService.updateLead).toHaveBeenCalledWith(123, expect.objectContaining({ move_size_id: 8 })));
    expect(apiService.getLeadStatusCodeLookups).toHaveBeenCalled();
  });
  it('shows load errors and supports retry instead of saying the lead is missing', async () => {
    apiService.getLead.mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValue(leadFixture);
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    expect(await screen.findByText('Could not load this record. Please try again.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Ada Lead')).toBeInTheDocument();
  });

  it.each([
    ['new', ['Start lead', 'Qualify lead', 'Mark Lost', 'Disqualify Lead', 'Archive Lead']],
    ['in_progress', ['Qualify lead', 'Mark Lost', 'Disqualify Lead', 'Archive Lead']],
    ['qualified', ['Convert to Opportunity', 'Mark Lost', 'Disqualify Lead']],
    ['lost', ['Reopen Lead']],
    ['archived', ['Restore Lead']],
    ['disqualified', ['Restore Lead']],
    ['converted', []],
  ])('shows only valid lead lifecycle actions for %s', async (state, expected) => {
    apiService.getLead.mockResolvedValue({ ...leadFixture, system_state: state, status: state });
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    await screen.findByText('Ada Lead');
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    for (const label of ['Start lead', 'Qualify lead', 'Convert to Opportunity', 'Mark Lost', 'Disqualify Lead', 'Archive Lead', 'Restore Lead', 'Reopen Lead', 'Book Job']) {
      expect(screen.queryAllByRole('button', { name: label }).length > 0).toBe(expected.includes(label));
    }
  });

  it('requires a lead lost reason and its required notes, and sends the reason ID', async () => {
    apiService.getLead.mockResolvedValue(leadFixture);
    apiService.getOpportunityLossReasonLookups.mockResolvedValue([
      { id: 41, name: 'Other lead loss', applies_to: 'lead', is_active: true, requires_note: true },
      { id: 42, name: 'Opportunity only', applies_to: 'opportunity', is_active: true },
      { id: 43, name: 'Inactive reason', applies_to: 'both', is_active: false },
    ]);
    apiService.markLeadLost.mockImplementation(async () => {
      const updated = { ...leadFixture, system_state: 'lost', status: 'lost' };
      apiService.getLead.mockResolvedValue(updated);
      return updated;
    });
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    await screen.findByText('Ada Lead');
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark Lost' }));
    await screen.findByText('Mark as Lost');
    expect(screen.queryByRole('option', { name: 'Opportunity only' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Inactive reason' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Loss' }));
    expect(apiService.markLeadLost).not.toHaveBeenCalled();
    const reasonSelect = screen.getByRole('option', { name: 'Other lead loss' }).closest('select');
    fireEvent.change(reasonSelect, { target: { value: '41' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Loss' }));
    expect(apiService.markLeadLost).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('Add notes (required for some reasons)...'), { target: { value: 'Customer stopped responding' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Loss' }));
    await waitFor(() => expect(apiService.markLeadLost).toHaveBeenCalledWith(123, { lost_reason_id: 41, note: 'Customer stopped responding' }));
  });

  it('uses the disqualification catalog and command for an unsuitable lead', async () => {
    apiService.getLead.mockResolvedValue(leadFixture);
    apiService.getDisqualificationReasons.mockResolvedValue([{ id: 51, name: 'Outside service area', is_active: true }]);
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    await screen.findByText('Ada Lead');
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disqualify Lead' }));
    const option = await screen.findByRole('option', { name: 'Outside service area' });
    fireEvent.change(option.closest('select'), { target: { value: '51' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Disqualification' }));
    await waitFor(() => expect(apiService.disqualifyLead).toHaveBeenCalledWith(123, { disqualification_reason_id: 51, note: '' }));
    expect(apiService.markLeadLost).not.toHaveBeenCalled();
  });

  it.each(['archived', 'disqualified'])('requires an explanation to restore a %s lead', async (state) => {
    apiService.getLead.mockResolvedValue({ ...leadFixture, system_state: state, status: state });
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    await screen.findByText('Ada Lead');
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore Lead' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Restore' }));
    expect(apiService.restoreLead).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText('Enter restoration reason...'), { target: { value: 'Customer confirmed a valid move' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Restore' }));
    await waitFor(() => expect(apiService.restoreLead).toHaveBeenCalledWith(123, { reason: 'Customer confirmed a valid move' }));
    expect(apiService.reopenLead).not.toHaveBeenCalled();
  });

  it('does not duplicate the primary Start lead action in the Actions menu', async () => {
    apiService.getLead.mockResolvedValue(leadFixture);
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    await screen.findByRole('button', { name: 'Start lead' });
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getAllByRole('button', { name: 'Start lead' })).toHaveLength(1);
  });

  it('keeps the persisted state after qualifying through Actions without refetching the old state', async () => {
    apiService.getLead.mockResolvedValue(leadFixture);
    apiService.qualifyLead.mockResolvedValue({ ...leadFixture, status: 'qualified', system_state: 'qualified' });
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    await screen.findByRole('button', { name: 'Start lead' });
    const readsBeforeTransition = apiService.getLead.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Qualify lead' }));
    await screen.findByRole('button', { name: 'Convert to Opportunity' });
    expect(screen.queryByRole('button', { name: 'Start lead' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.queryByRole('button', { name: 'Start lead' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Qualify lead' })).not.toBeInTheDocument();
    expect(apiService.getLead).toHaveBeenCalledTimes(readsBeforeTransition);
    expect(screen.getByText('Ada Lead')).toBeInTheDocument();
  });

  it('offers explicit workflow steps before converting a lead', async () => {
    apiService.getLead.mockResolvedValue(leadFixture);
    apiService.startLead.mockResolvedValue({ ...leadFixture, status: 'in_progress', system_state: 'in_progress' });
    apiService.qualifyLead.mockResolvedValue({ ...leadFixture, status: 'qualified', system_state: 'qualified' });
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    fireEvent.click(await screen.findByRole('button', { name: 'Start lead' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Qualify lead' }));
    expect(await screen.findByRole('button', { name: 'Convert to Opportunity' })).toBeInTheDocument();
    expect(apiService.startLead).toHaveBeenCalledWith(123);
    expect(apiService.qualifyLead).toHaveBeenCalledWith(123);
    expect(apiService.convertLead).not.toHaveBeenCalled();
  });
  it.each([
    ['Existing Customer', { customer_id: 321 }],
    ['Create a new customer', { create_new_customer: true }],
  ])('continues conversion after explicit customer review: %s', async (buttonName, expected) => {
    apiService.getLead.mockResolvedValue({ ...leadFixture, status: 'qualified', system_state: 'qualified' });
    apiService.convertLead.mockRejectedValueOnce({ response: { status: 422, data: { error: 'customer_review_required', candidates: [{ id: 321, profile_name: 'Existing Customer' }] } } })
      .mockResolvedValue({ opportunity: { id: 999, sales_number: 999 } });
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    fireEvent.click(await screen.findByRole('button', { name: 'Convert to Opportunity' }));
    expect(await screen.findByRole('dialog', { name: 'Review matching customers' })).toBeInTheDocument();
    expect(apiService.convertLead).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: buttonName }));
    await waitFor(() => expect(apiService.convertLead).toHaveBeenLastCalledWith(123, expected));
  });
  it('ignores a slow response for the previous lead after navigation', async () => {
    let resolveOld;
    apiService.getLead.mockImplementation((id) => String(id) === '123'
      ? new Promise((resolve) => { resolveOld = resolve; })
      : Promise.resolve({ ...leadFixture, id: 124, first_name: 'Current' }));
    routeState.params = { id: '123' };
    routeState.location = { pathname: '/leads/123', state: {} };
    const view = render(<MemoryRouter><SalesDetail /></MemoryRouter>);
    await waitFor(() => expect(apiService.getLead).toHaveBeenCalledWith('123'));
    routeState.params = { id: '124' };
    routeState.location = { pathname: '/leads/124', state: {} };
    view.rerender(<MemoryRouter><SalesDetail /></MemoryRouter>);
    expect(await screen.findByText('Current Lead')).toBeInTheDocument();
    await act(async () => resolveOld({ ...leadFixture, first_name: 'Previous' }));
    expect(screen.queryByText('Previous Lead')).not.toBeInTheDocument();
    expect(screen.getByText('Current Lead')).toBeInTheDocument();
  });

  it('ignores communication history returned for a previously opened lead', async () => {
    let resolvePreviousHistory;
    apiService.getLead.mockImplementation((id) => Promise.resolve({ ...leadFixture, id: Number(id), first_name: String(id) === '124' ? 'Current' : 'Previous' }));
    apiService.getTimelineEvents.mockImplementation(({ entity_id }) => Number(entity_id) === 123
      ? new Promise((resolve) => { resolvePreviousHistory = resolve; })
      : Promise.resolve([{ id: 222, source: 'inbound_email_resend', created_at: '2026-10-16T09:00:00Z', payload: { inbound_message_id: 222, from_email: 'current@example.com', subject: 'Current history' } }]));
    routeState.params = { id: '123' };
    routeState.location = { pathname: '/leads/123', state: {} };
    const view = render(<MemoryRouter><SalesDetail /></MemoryRouter>);
    await waitFor(() => expect(resolvePreviousHistory).toBeTypeOf('function'));
    routeState.params = { id: '124' };
    routeState.location = { pathname: '/leads/124', state: {} };
    view.rerender(<MemoryRouter><SalesDetail /></MemoryRouter>);
    await waitFor(() => expect(timelineState.activities).toEqual(expect.arrayContaining([expect.objectContaining({ subject: 'Current history' })])));
    await act(async () => resolvePreviousHistory([{ id: 111, source: 'inbound_email_resend', payload: { inbound_message_id: 111, from_email: 'previous@example.com', subject: 'Previous history' } }]));
    expect(timelineState.activities).not.toEqual(expect.arrayContaining([expect.objectContaining({ subject: 'Previous history' })]));
    expect(timelineState.activities).toEqual(expect.arrayContaining([expect.objectContaining({ subject: 'Current history' })]));
  });

  it('does not apply status-code lookup response from a previous lead after navigation', async () => {
    let resolveOldStatus;
    apiService.getLeadStatusCodeLookups
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldStatus = resolve; }))
      .mockResolvedValue([]);
    apiService.getLead.mockImplementation((id) => Promise.resolve({ ...leadFixture, id: Number(id), first_name: String(id) === '124' ? 'Current' : 'Previous' }));
    routeState.params = { id: '123' };
    routeState.location = { pathname: '/leads/123', state: {} };
    const view = render(<MemoryRouter><SalesDetail /></MemoryRouter>);
    await waitFor(() => expect(apiService.getLead).toHaveBeenCalledWith('123'));
    routeState.params = { id: '124' };
    routeState.location = { pathname: '/leads/124', state: {} };
    view.rerender(<MemoryRouter><SalesDetail /></MemoryRouter>);
    expect(await screen.findByText('Current Lead')).toBeInTheDocument();
    await act(async () => resolveOldStatus([{ id: 99, label: 'Old Status' }]));
    expect(screen.getByText('Current Lead')).toBeInTheDocument();
  });

  it('exposes a retry when loading activity history fails on a lead', async () => {
    apiService.getLead.mockResolvedValue(leadFixture);
    apiService.getActivities.mockRejectedValue(new Error('network error'));
    renderComponent({ initialEntry: '/leads/123', routePath: '/leads/:id' });
    await screen.findByText('Ada Lead');
    await waitFor(() => expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument());
  });

});

