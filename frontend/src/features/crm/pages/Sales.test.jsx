import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sales from './Sales';
import {
  bulkSalesAssign,
  bulkSalesMarkLost,
  getBranchLookups,
  getLead,
  getLeadStatusCodeLookups,
  getLookupUsers,
  getMyLeadsQueue,
  getActivities,
  getLeadActivities,
  getMoveTypeLookups,
  getPayments,
  getOpportunity,
  getSalesDashboardSummary,
  getMoverSizeLookups,
  getServices,
  getStatusCodes,
  getTasks,
  seedCommunicationTemplates,
  updateSalesActivity,
  updateTask,
  deleteSalesActivity,
} from '../../../services/api';

vi.mock('../../../shared/auth/useCan', () => ({
  default: () => ({
    canAll: () => true,
    canAny: () => true,
    can: () => true,
  }),
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      branches: [{ id: 5 }],
      is_superuser: false,
      is_system_admin: false,
    },
    hasPermission: () => true,
  }),
}));

vi.mock('../../../shared/context/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('../../../services/api', () => ({
  assignLead: vi.fn(),
  bulkSalesAssign: vi.fn(),
  bulkSalesEmail: vi.fn(),
  bulkSalesMarkLost: vi.fn(),
  bulkSalesSms: vi.fn(),
  bulkSalesStatus: vi.fn(),
  getBranchLookups: vi.fn(),
  getCommunicationTemplate: vi.fn(),
  getCommunicationTemplates: vi.fn(),
  getServices: vi.fn(),
  getMoveTypeLookups: vi.fn(),
  getMoverSizeLookups: vi.fn(),
  getLead: vi.fn(),
  getLookupUsers: vi.fn(),
  getMyLeadsQueue: vi.fn(),
  getPayments: vi.fn(),
  getActivities: vi.fn(),
  getLeadActivities: vi.fn(),
  getLeadStatusCodeLookups: vi.fn(),
  getOpportunity: vi.fn(),
  getSalesDashboardSummary: vi.fn(),
  getStatusCodeLookupsPage: vi.fn(),
  getStatusCodes: vi.fn(),
  getTasks: vi.fn(),
  liststatuscode: vi.fn(),
  seedCommunicationTemplates: vi.fn(),
  updateTask: vi.fn(),
  updateSalesActivity: vi.fn(),
  deleteSalesActivity: vi.fn(),
  getUsers: vi.fn(),
}));

const today = new Date().toISOString().slice(0, 10);

const makeSalesQueueResponse = (rows) => ({
  results: rows,
  summary: {
    total: rows.length,
    lead_count: rows.filter((row) => row.row_type === 'lead').length,
    opportunity_count: rows.filter((row) => row.row_type === 'opportunity').length,
    hot_count: 0,
    new_count: rows.length,
    value_total: 0,
  },
  count: rows.length,
  page: 1,
  page_size: 50,
  total_pages: 1,
});

const makeSalesQueueRow = (overrides = {}) => ({
  id: 101,
  row_type: 'lead',
  lead_id: overrides.id || 101,
  opportunity_id: null,
  sales_number: `LEAD-${overrides.id || 101}`,
  display_number: `LEAD-${overrides.id || 101}`,
  name: 'Alpha Lead',
  email: 'alpha@example.com',
  phone: '555-0001',
  workflow_stage: 'new_lead',
  workflow_stage_label: 'New',
  custom_status_code: '',
  custom_status_label: '',
  branch_id: 5,
  assigned_user_id: null,
  assigned_user_name: '',
  service_type: 'moving',
  move_size: '2 Bedroom',
  source: 'Website',
  last_contacted_at: null,
  move_date: '2026-08-20',
  created_at: '2026-07-01T10:00:00Z',
  origin: 'Toronto',
  destination: 'Mississauga',
  ...overrides,
});

describe('Sales DashboardPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();

    vi.mocked(getBranchLookups).mockResolvedValue([
      { id: 5, name: 'Main Branch' },
    ]);
    vi.mocked(getLookupUsers).mockResolvedValue([
      { id: 7, first_name: 'Sandesh', last_name: 'Off', email: 'sandesh@example.com', branches: [5] },
      { id: 8, first_name: 'Asha', last_name: 'Kumar', email: 'asha@example.com', branches: [5] },
    ]);
    vi.mocked(getStatusCodes).mockResolvedValue([]);
    vi.mocked(getServices).mockResolvedValue([]);
    vi.mocked(getMoveTypeLookups).mockResolvedValue([]);
    vi.mocked(getMoverSizeLookups).mockResolvedValue([]);
    vi.mocked(getLeadStatusCodeLookups).mockResolvedValue([]);
    vi.mocked(getMyLeadsQueue).mockResolvedValue(makeSalesQueueResponse([]));
    vi.mocked(getActivities).mockResolvedValue([]);
    vi.mocked(getLeadActivities).mockResolvedValue([]);
    vi.mocked(getTasks).mockResolvedValue({ data: [] });
    vi.mocked(getPayments).mockResolvedValue([]);
    vi.mocked(getLead).mockResolvedValue({ data: null });
    vi.mocked(getOpportunity).mockResolvedValue({ data: null });
    vi.mocked(updateSalesActivity).mockResolvedValue({});
    vi.mocked(updateTask).mockResolvedValue({});
    vi.mocked(deleteSalesActivity).mockResolvedValue({});
    vi.mocked(bulkSalesAssign).mockResolvedValue({ data: { updated: 1, failed: 0 } });
    vi.mocked(bulkSalesMarkLost).mockResolvedValue({ data: { updated: 1, failed: 0 } });
    vi.mocked(seedCommunicationTemplates).mockResolvedValue({});
    vi.mocked(getSalesDashboardSummary).mockImplementation((params = {}) => {
      const isSelectedStaff = String(params.assigned_user || '') === '7';
      const summary = isSelectedStaff
        ? {
            emailCount: 4,
            smsCount: 2,
            phoneCallCount: 5,
            paymentTotal: 900,
            leadsCount: 1,
            wonCount: 0,
            lostCount: 0,
            taskCount: 0,
            emailTrend: 0,
            smsTrend: 0,
            phoneCallTrend: 0,
            paymentTrend: 0,
            dailyBreakdown: [
              { date: today, count: 1, label: 'Today', shortLabel: 'Today' },
            ],
          }
        : {
            emailCount: 2,
            smsCount: 1,
            phoneCallCount: 3,
            paymentTotal: 1500,
            leadsCount: 2,
            wonCount: 0,
            lostCount: 0,
            taskCount: 0,
            emailTrend: 0,
            smsTrend: 0,
            phoneCallTrend: 0,
            paymentTrend: 0,
            dailyBreakdown: [
              { date: today, count: 2, label: 'Today', shortLabel: 'Today' },
          ],
        };

      return Promise.resolve({ data: summary });
    });
  });

  const renderSalesDashboard = () => render(
    <MemoryRouter initialEntries={[{ pathname: '/sales', state: { activeTab: 'dashboard' } }]}>
      <Routes>
        <Route path="/sales" element={<Sales />} />
      </Routes>
    </MemoryRouter>
  );

  it('renders dashboard metrics and scopes refreshes by selected user', async () => {
    renderSalesDashboard();

    expect(await screen.findByText('Performance Overview')).toBeInTheDocument();
    expect(screen.getAllByText(/All Branches.*All Users.*Today/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Emails Logged')).toBeInTheDocument();
    expect(screen.getByText('SMS Logged')).toBeInTheDocument();
    expect(screen.getByText('Phone Calls Logged')).toBeInTheDocument();
    expect(screen.getByText('Payments Captured')).toBeInTheDocument();
    expect(within(screen.getByText('Emails Logged').closest('div.rounded-xl')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByText('SMS Logged').closest('div.rounded-xl')).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByText('Phone Calls Logged').closest('div.rounded-xl')).getByText('3')).toBeInTheDocument();
    expect(screen.getByText('$1.5k')).toBeInTheDocument();
    expect(screen.getByText(/2 leads received this period/i)).toBeInTheDocument();
    expect(getActivities).toHaveBeenCalledWith(expect.objectContaining({
      startDate: expect.any(String),
      endDate: expect.any(String),
    }));
    expect(getLeadActivities).toHaveBeenCalledWith(expect.objectContaining({
      startDate: expect.any(String),
      endDate: expect.any(String),
    }));
    expect(getTasks).toHaveBeenCalledWith(expect.objectContaining({
      startDate: expect.any(String),
      endDate: expect.any(String),
      status: 'pending',
    }));
    expect(getMyLeadsQueue).toHaveBeenCalledWith(expect.objectContaining({
      startDate: expect.any(String),
      endDate: expect.any(String),
      date_field: 'created_at',
      include_converted: true,
    }));

    const userSelect = screen.getByDisplayValue('All Staff');
    fireEvent.change(userSelect, { target: { value: '7' } });

    await waitFor(() => {
      expect(screen.getAllByText(/All Branches.*Sandesh Off/i).length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(getSalesDashboardSummary).toHaveBeenCalledWith(expect.objectContaining({
        assigned_user: '7',
        branch: '',
        noCache: 1,
      }));
    });
    expect(getTasks).toHaveBeenCalledWith(expect.objectContaining({
      assigned_user: '7',
      branch: undefined,
      status: 'pending',
    }));

    expect(within(screen.getByText('Emails Logged').closest('div.rounded-xl')).getByText('4')).toBeInTheDocument();
    expect(within(screen.getByText('SMS Logged').closest('div.rounded-xl')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByText('Phone Calls Logged').closest('div.rounded-xl')).getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/11 total outreach activities \(4 emails, 2 SMS, 5 calls\)/i)).toBeInTheDocument();
    expect(getActivities).toHaveBeenCalledWith(expect.objectContaining({
      assigned_user: '7',
      noCache: undefined,
    }));
    expect(getLeadActivities).toHaveBeenCalledWith(expect.objectContaining({
      assigned_user: '7',
    }));
    expect(getTasks).toHaveBeenCalledWith(expect.objectContaining({
      assigned_user: '7',
      status: 'pending',
    }));
    expect(getMyLeadsQueue).toHaveBeenCalledWith(expect.objectContaining({
      assigned_user: '7',
      include_converted: true,
    }));

    const insights = screen.getByText('User Insights').closest('div.rounded-xl');
    expect(within(insights).getByText('Sandesh Off')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Yesterday' }));

    await waitFor(() => {
      expect(getSalesDashboardSummary).toHaveBeenCalledWith(expect.objectContaining({
        assigned_user: '7',
        branch: '',
        startDate: expect.any(String),
        endDate: expect.any(String),
        noCache: 1,
      }));
    });
    expect(getActivities).toHaveBeenCalledWith(expect.objectContaining({
      assigned_user: '7',
      startDate: expect.any(String),
      endDate: expect.any(String),
    }));
    expect(getLeadActivities).toHaveBeenCalledWith(expect.objectContaining({
      assigned_user: '7',
      startDate: expect.any(String),
      endDate: expect.any(String),
    }));
    expect(getTasks).toHaveBeenCalledWith(expect.objectContaining({
      assigned_user: '7',
      startDate: expect.any(String),
      endDate: expect.any(String),
      status: 'pending',
    }));
  });

  it('renders follow-up table data from backend tasks and related records', async () => {
    vi.mocked(getTasks).mockResolvedValue({
      data: [
        {
          id: 101,
          task_type: 'call',
          due_date: '2026-07-03T15:30:00Z',
          notes: 'Confirm elevator booking\nAsk for certificate of insurance',
          lead: 55,
          opportunity: null,
          assigned_to: 7,
          assigned_to_details: {
            id: 7,
            first_name: 'Sandesh',
            last_name: 'Off',
          },
          activity: 501,
          activity_details: {
            id: 501,
            subject: 'Confirm elevator booking',
            description: 'Confirm elevator booking',
            status: 'pending',
          },
        },
        {
          id: 102,
          task_type: 'general',
          due_date: '2026-07-04T10:00:00Z',
          notes: 'Send revised quote',
          lead: null,
          opportunity: 77,
          assigned_to: 8,
          assigned_to_details: {
            id: 8,
            first_name: 'Asha',
            last_name: 'Kumar',
          },
          activity: 502,
          activity_details: {
            id: 502,
            subject: 'Quote revision',
            description: 'Send revised quote',
            status: 'completed',
          },
        },
      ],
    });
    vi.mocked(getLead).mockResolvedValue({
      data: {
        id: 55,
        display_number: 'LEAD-55',
        first_name: 'Priya',
        last_name: 'Shah',
        phone: '555-1000',
        email: 'priya@example.com',
        move_date: '2026-07-12',
        status: 'qualified',
        status_label: 'Qualified',
        custom_status_code_details: {
          id: 901,
          label: 'Needs COI',
        },
        last_contacted_at: '2026-07-01T09:15:00Z',
      },
    });
    vi.mocked(getOpportunity).mockResolvedValue({
      data: {
        id: 77,
        sales_number: 'OPP-77',
        customer_details: {
          first_name: 'Northwind',
          last_name: 'Ops',
          phone: '555-2000',
          email: 'ops@northwind.test',
        },
        move_date: '2026-07-15',
        status: 'booked',
        status_label: 'Booked',
        custom_status_code_details: {
          id: 902,
          name: 'Deposit Paid',
        },
        last_contacted_at: '2026-07-02T11:00:00Z',
      },
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/sales', state: { activeTab: 'follow-up' } }]}>
        <Routes>
          <Route path="/sales" element={<Sales />} />
        </Routes>
      </MemoryRouter>
    );

    expect((await screen.findAllByText('LEAD-55')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('OPP-77').length).toBeGreaterThan(0);

    expect(getTasks).toHaveBeenCalledWith({ ordering: '-activity__created_at', page: 1, page_size: 50 });
    expect(screen.getAllByText('Sandesh Off').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Asha Kumar').length).toBeGreaterThan(0);
    expect(screen.getByTitle('Select all visible records')).toBeInTheDocument();
  });

  it('runs follow-up action menu options for complete, edit, and delete', async () => {
    vi.mocked(getTasks).mockResolvedValue({
      data: [
        {
          id: 101,
          task_type: 'call',
          due_date: '2026-07-03T15:30:00Z',
          notes: 'Call customer\nOriginal note',
          lead: 55,
          opportunity: null,
          assigned_to: 7,
          assigned_to_details: {
            id: 7,
            first_name: 'Sandesh',
            last_name: 'Off',
          },
          activity: 501,
          activity_details: {
            id: 501,
            subject: 'Call customer',
            description: 'Call customer\nOriginal note',
            status: 'pending',
          },
        },
      ],
    });
    vi.mocked(getLead).mockResolvedValue({
      data: {
        id: 55,
        display_number: 'LEAD-55',
        first_name: 'Priya',
        last_name: 'Shah',
        status: 'qualified',
        status_label: 'Qualified',
      },
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={[{ pathname: '/sales', state: { activeTab: 'follow-up' } }]}>
        <Routes>
          <Route path="/sales" element={<Sales />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findAllByText('LEAD-55');

    fireEvent.click(screen.getAllByRole('button', { name: /task actions/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /mark complete/i }));

    await waitFor(() => {
      expect(updateSalesActivity).toHaveBeenCalledWith(501, expect.objectContaining({
        status: 'completed',
        completed_at: expect.any(String),
      }));
    });

    fireEvent.click(screen.getAllByRole('button', { name: /task actions/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(await screen.findByRole('heading', { name: /edit follow-up/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'Updated call' } });
    fireEvent.change(screen.getByLabelText(/task type/i), { target: { value: 'email' } });
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-07-05T09:15' } });
    fireEvent.change(screen.getByLabelText(/assigned to/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Updated note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateSalesActivity).toHaveBeenCalledWith(501, expect.objectContaining({
        subject: 'Updated call',
        description: 'Updated call\nUpdated note',
        status: 'pending',
      }));
      expect(updateTask).toHaveBeenCalledWith(101, expect.objectContaining({
        task_type: 'email',
        assigned_to: 8,
        due_date: expect.any(String),
        notes: 'Updated call\nUpdated note',
      }));
    });

    fireEvent.click(screen.getAllByRole('button', { name: /task actions/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Call customer'));
      expect(deleteSalesActivity).toHaveBeenCalledWith(501);
    });
  });

  it('only enables selection and manual sorting for a selected branch', async () => {
    const branchRows = [
      {
        id: 101,
        row_type: 'lead',
        sales_number: 'LEAD-101',
        display_number: 'LEAD-101',
        name: 'Alpha Lead',
        email: 'alpha@example.com',
        phone: '555-0001',
        status: 'new_lead',
        status_label: 'New',
        branch_id: 5,
        assigned_user_id: null,
        assigned_user_name: '',
        service_type: 'moving',
        move_size: '2 Bedroom',
        source: 'Website',
        last_contacted_at: null,
        move_date: '2026-08-20',
        created_at: '2026-07-01T10:00:00Z',
        origin: 'Toronto',
        destination: 'Mississauga',
      },
      {
        id: 102,
        row_type: 'lead',
        sales_number: 'LEAD-102',
        display_number: 'LEAD-102',
        name: 'Beta Lead',
        email: 'beta@example.com',
        phone: '555-0002',
        status: 'new_lead',
        status_label: 'New',
        branch_id: 5,
        assigned_user_id: null,
        assigned_user_name: '',
        service_type: 'moving',
        move_size: '1 Bedroom',
        source: 'Referral',
        last_contacted_at: null,
        move_date: '2026-08-21',
        created_at: '2026-07-02T10:00:00Z',
        origin: 'Ottawa',
        destination: 'Kingston',
      },
    ];

    vi.mocked(getMyLeadsQueue).mockResolvedValue(makeSalesQueueResponse(branchRows));

    render(
      <MemoryRouter initialEntries={[{ pathname: '/sales', state: { activeTab: 'all-leads' } }]}>
        <Routes>
          <Route path="/sales" element={<Sales />} />
        </Routes>
      </MemoryRouter>
    );

    expect((await screen.findAllByText('Alpha Lead')).length).toBeGreaterThan(0);
    expect(screen.queryByTitle(/select all visible records/i)).not.toBeInTheDocument();

    const branchSelect = screen.getByDisplayValue('All Branches');
    fireEvent.change(branchSelect, { target: { value: '5' } });

    await waitFor(() => {
      expect(screen.getByTitle('Select all visible records')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Alpha Lead').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Beta Lead').length).toBeGreaterThan(0);

    fireEvent.change(branchSelect, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByTitle(/select all visible records/i)).not.toBeInTheDocument();
    });
  });

  it.each([
    {
      label: 'New Leads',
      activeTab: 'new-leads',
      row: makeSalesQueueRow({ id: 301, name: 'Cache Test New Lead' }),
      expectedItems: [{ row_type: 'lead', id: 301 }],
    },
    {
      label: 'Leads & Opportunities',
      activeTab: 'leads',
      row: makeSalesQueueRow({
        id: 401,
        row_type: 'opportunity',
        lead_id: 301,
        opportunity_id: 401,
        sales_number: 'OPP-401',
        display_number: 'OPP-401',
        name: 'Cache Test Opportunity',
        assigned_user_id: 7,
        assigned_user_name: 'Sandesh Off',
      }),
      expectedItems: [{ row_type: 'opportunity', id: 401 }],
    },
  ])('bypasses the queue cache after bulk assign in $label', async ({ activeTab, row, expectedItems }) => {
    vi.mocked(getMyLeadsQueue).mockResolvedValue(makeSalesQueueResponse([row]));

    render(
      <MemoryRouter initialEntries={[{ pathname: '/sales', state: { activeTab } }]}>
        <Routes>
          <Route path="/sales" element={<Sales />} />
        </Routes>
      </MemoryRouter>
    );

    expect((await screen.findAllByText(row.name)).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByDisplayValue('All Branches'), { target: { value: '5' } });

    await waitFor(() => {
      expect(getMyLeadsQueue).toHaveBeenCalledWith(expect.objectContaining({
        branch: '5',
      }));
    });

    const [selectRowButton] = await screen.findAllByRole('button', { name: `Select ${row.name}` });
    fireEvent.click(selectRowButton);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    const callsBeforeBulkRefresh = vi.mocked(getMyLeadsQueue).mock.calls.length;
    const bulkToolbar = screen.getByText(/Bulk operations for 1 record/i).closest('.rounded-xl');
    fireEvent.click(within(bulkToolbar).getByRole('button', { name: /^Assign$/i }));

    const assignModal = (await screen.findByRole('heading', { name: /Assign 1 record/i })).closest('.fixed');
    fireEvent.change(within(assignModal).getByDisplayValue('Keep current assignee'), { target: { value: '7' } });
    fireEvent.click(within(assignModal).getByRole('button', { name: /^Confirm$/i }));

    await waitFor(() => {
      expect(bulkSalesAssign).toHaveBeenCalledWith({
        items: expectedItems,
        branch: 5,
        assigned_user: 7,
      });
    });

    await waitFor(() => {
      expect(getMyLeadsQueue.mock.calls.length).toBeGreaterThan(callsBeforeBulkRefresh);
    });
    await waitFor(() => {
      expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
    });
  });

  it('opens a lead from the new leads tab when the row is clicked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.mocked(getMyLeadsQueue).mockResolvedValue(
      makeSalesQueueResponse([
        makeSalesQueueRow({ id: 777, name: 'Openable New Lead', assigned_user_id: null, assigned_user_name: '' }),
      ])
    );

    render(
      <MemoryRouter initialEntries={[{ pathname: '/sales', state: { activeTab: 'new-leads' } }]}>
        <Routes>
          <Route path="/sales" element={<Sales />} />
        </Routes>
      </MemoryRouter>
    );

    const leadElements = await screen.findAllByText('Openable New Lead');
    expect(leadElements.length).toBeGreaterThan(0);
    fireEvent.click(leadElements[0]);

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
      expect(String(openSpy.mock.calls[0][0] || '')).toMatch(/\/(leads|crm\/lead)\/.*777/);
    });

    openSpy.mockRestore();
  });

  it('loads the merged calls modal within the current day range', async () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
      .toISOString()
      .slice(0, 10);

    vi.mocked(getActivities).mockResolvedValue([
      {
        id: 11,
        activity_type: 'call',
        created_at: '2026-07-27T09:15:00Z',
        call_log_details: { disposition: 'connected' },
        opportunity_id: 77,
        related_row_type: 'opportunity',
        display_number: '07641',
        name: 'Janice Pinkney',
        service_type: 'moving',
        move_date: '2026-08-24',
        status_label: 'New Lead',
      },
    ]);
    vi.mocked(getLeadActivities).mockResolvedValue([
      {
        id: 21,
        activity_type: 'call',
        created_at: '2026-07-27T10:30:00Z',
        lead_id: 55,
        lead_details: {
          id: 55,
          display_number: 'L-55',
          first_name: 'Priya',
          last_name: 'Shah',
          service_type: 'moving',
          move_date: '2026-07-30',
          workflow_stage_label: 'New',
        },
        content: 'Disposition: no_answer',
      },
    ]);

    renderSalesDashboard();

    await waitFor(() => {
      expect(screen.getByText('Phone Calls Logged')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Phone Calls Logged').closest('div.rounded-xl'));

    await waitFor(() => {
      expect(screen.getByText('Calls This Month')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(getActivities).toHaveBeenCalledWith(expect.objectContaining({
        startDate: monthStart,
        endDate: tomorrow,
      }));
      expect(getLeadActivities).toHaveBeenCalledWith(expect.objectContaining({
        startDate: monthStart,
        endDate: tomorrow,
        activity_type: 'call',
      }));
    });

    expect(screen.getByText('07641')).toBeInTheDocument();
    expect(screen.getByText('L-55')).toBeInTheDocument();
  });

  it('keeps the metric modal aligned with dashboard scope changes while open', async () => {
    vi.mocked(getActivities).mockResolvedValue([]);
    vi.mocked(getLeadActivities).mockResolvedValue([]);

    renderSalesDashboard();

    await waitFor(() => {
      expect(screen.getByText('Phone Calls Logged')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Phone Calls Logged').closest('div.rounded-xl'));

    await waitFor(() => {
      expect(screen.getByText('Calls Today')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue('All Staff'), { target: { value: '7' } });

    await waitFor(() => {
      expect(getActivities).toHaveBeenCalledWith(expect.objectContaining({
        assigned_user: '7',
      }));
      expect(getLeadActivities).toHaveBeenCalledWith(expect.objectContaining({
        assigned_user: '7',
      }));
    });
    expect(getTasks).toHaveBeenCalledWith(expect.objectContaining({
      assigned_user: '7',
      status: 'pending',
    }));
  });

  it('hides completed tasks from the follow-up modal so the count matches the dashboard', async () => {
    vi.mocked(getTasks).mockResolvedValue({
      data: [
        {
          id: 201,
          task_type: 'call',
          due_date: today,
          status: 'pending',
          notes: 'Call pending lead',
          lead: 55,
          opportunity: null,
          assigned_to_details: {
            id: 7,
            first_name: 'Sandesh',
            last_name: 'Off',
          },
          activity: 601,
          activity_details: {
            id: 601,
            subject: 'Call pending lead',
            status: 'pending',
          },
        },
        {
          id: 202,
          task_type: 'call',
          due_date: today,
          status: 'in_progress',
          notes: 'Completed task should not count',
          lead: 56,
          opportunity: null,
          assigned_to_details: {
            id: 7,
            first_name: 'Sandesh',
            last_name: 'Off',
          },
          activity: 602,
          activity_details: {
            id: 602,
            subject: 'Completed task should not count',
            status: 'in_progress',
          },
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/sales', state: { activeTab: 'dashboard' } }]}>
        <Routes>
          <Route path="/sales" element={<Sales />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Follow-up')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Follow-up').closest('div.rounded-xl'));

    await waitFor(() => {
      expect(screen.getByText('Follow-up Today')).toBeInTheDocument();
    });

    expect(getTasks).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pending',
      branch: undefined,
      assigned_user: undefined,
    }));
    expect(await screen.findAllByText('1 - 1 of 1 Total Results')).toHaveLength(1);
    expect(screen.getByText('Call pending lead')).toBeInTheDocument();
    expect(screen.queryByText('Completed task should not count')).not.toBeInTheDocument();
  });
});
