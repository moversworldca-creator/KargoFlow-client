import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
const navigateMock = vi.hoisted(() => vi.fn());
const automationRunsMock = vi.hoisted(() => vi.fn());
import Automation from './Automation';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, branch_id: 12, permissions: ['communications.automations.manage', 'communications.branch_settings.update'] },
  }),
}));

vi.mock('../../../shared/auth/useCan', () => ({
  default: () => ({
    can: () => true,
    canAll: () => true,
    canAny: () => true,
  }),
}));

vi.mock('../../../services/api', () => ({
  default: {
    general: {
      getBranches: vi.fn().mockResolvedValue([
        { id: 12, name: 'Downtown Branch' },
        { id: 15, name: 'North Branch' },
      ]),
    },
  },
  getBranchNotifications: vi.fn().mockResolvedValue([
    {
      key: 'new_lead_received',
      name: 'New Lead Received',
      description: 'Notify the assigned salesperson in the app when a new lead is created.',
      category: 'lead_intake',
      event: 'lead.created',
      target: 'lead',
      audience: 'sales_person',
      supported_channels: ['in_app'],
      recipient_rule: 'assigned salesperson only; not delivered when unassigned',
      trigger_ready: true,
      branch_id: 12,
      enabled: true,
      channels: {
        in_app: { enabled: true },
      },
    },
    {
      key: 'new_lead_request_response',
      name: 'New Lead Request Response',
      description: 'Confirm that the customer’s move request was received.',
      category: 'lead_intake',
      event: 'lead.created',
      target: 'lead',
      audience: 'customer',
      supported_channels: ['email', 'sms'],
      trigger_ready: true,
      branch_id: 12,
      enabled: true,
      channels: {
        email: { enabled: true, template_id: 45, template_name: 'Lead Welcome' },
        sms: { enabled: false, template_id: null, template_name: null },
      },
    },
    {
      key: 'send_quote',
      name: 'Send Quote',
      description: 'Send the estimate or quote to the customer when it is ready.',
      category: 'outbound_delivery',
      event: 'estimate.sent',
      target: 'opportunity',
      audience: 'customer',
      supported_channels: ['email', 'sms'],
      trigger_ready: true,
      branch_id: 12,
      enabled: false,
      channels: {
        email: { enabled: false, template_id: null, template_name: null },
        sms: { enabled: false, template_id: null, template_name: null },
      },
    },
    {
      key: 'opportunity_booked_customer',
      name: 'Opportunity Booked (Customer)',
      description: 'Confirm to the customer that their opportunity was booked.',
      category: 'customer_sign_off',
      event: 'opportunity.booked',
      target: 'opportunity',
      audience: 'customer',
      supported_channels: ['email', 'sms'],
      trigger_ready: true,
      branch_id: 12,
      enabled: false,
      channels: {
        email: { enabled: false, template_id: null, template_name: null },
        sms: { enabled: false, template_id: null, template_name: null },
      },
    },
    {
      key: 'job_reminder',
      name: 'Job Remainder',
      description: 'Remind the customer about their upcoming move.',
      category: 'job_communications',
      event: 'job.moving_day_reminder',
      target: 'opportunity',
      audience: 'customer',
      supported_channels: ['email', 'sms'],
      trigger_ready: false,
      branch_id: 12,
      enabled: false,
      channels: {
        email: { enabled: false, template_id: null, template_name: null },
        sms: { enabled: false, template_id: null, template_name: null },
      },
    },
    {
      key: 'customer_payment_made',
      name: 'Customer Payment Made',
      description: 'Notify the assigned salesperson when payment is received.',
      category: 'sales_updates',
      event: 'payment.received',
      target: 'opportunity',
      audience: 'sales_person',
      supported_channels: ['in_app'],
      trigger_ready: false,
      branch_id: 12,
      enabled: false,
      channels: { in_app: { enabled: false } },
    },
  ]),
  updateBranchNotification: vi.fn().mockResolvedValue({
    key: 'new_lead_request_response',
    enabled: false,
  }),
  getCustomAutomations: vi.fn().mockResolvedValue([
    {
      id: 91,
      name: 'Follow up after a new lead',
      description: 'Send immediate email and later text',
      event: 'lead.created',
      target: 'lead',
      branch_id: 12,
      is_active: true,
      conditions: {
        all: [{ field: 'lead.system_state', op: 'eq', value: 'new' }],
      },
      steps: [
        { id: 301, channel: 'email', template_id: 45, delay_minutes: 0, is_active: true },
        { id: 302, channel: 'sms', template_id: 46, delay_minutes: 1440, is_active: true },
      ],
    },
  ]),
  getCustomAutomation: vi.fn().mockResolvedValue({
    id: 91,
    name: 'Follow up after a new lead',
    description: 'Send immediate email and later text',
    event: 'lead.created',
    target: 'lead',
    branch_id: 12,
    is_active: true,
    conditions: {
      all: [{ field: 'lead.system_state', op: 'eq', value: 'new' }],
    },
    steps: [
      { id: 301, channel: 'email', template_id: 45, delay_minutes: 0, is_active: true },
      { id: 302, channel: 'sms', template_id: 46, delay_minutes: 1440, is_active: true },
    ],
  }),
  updateCustomAutomation: vi.fn().mockResolvedValue({ id: 91, is_active: false }),
  deactivateCustomAutomation: vi.fn().mockResolvedValue({}),
  createCustomAutomation: vi.fn().mockResolvedValue({ id: 92 }),
  getCustomAutomationEvents: vi.fn().mockResolvedValue([
    { event: 'lead.created', target: 'lead', emitted: true },
    { event: 'opportunity.booked', target: 'opportunity', emitted: true },
  ]),
  getCustomAutomationRuns: automationRunsMock,
  getNotificationTemplates: vi.fn().mockResolvedValue([
    { id: 45, name: 'Lead Welcome', is_active: true },
  ]),
  getGeneralTemplates: vi.fn().mockResolvedValue([
    { id: 45, name: 'General Follow-up', is_active: true },
  ]),
}));

describe('Automation Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    automationRunsMock.mockResolvedValue([
    {
      id: 804,
      step_id: 301,
      target_type: 'lead',
      target_id: 501,
      status: 'completed',
      scheduled_for: '2026-10-20T10:00:00Z',
      executed_at: '2026-10-20T10:00:02Z',
      error: '',
      message_id: 1204,
      message_state: 'queued',
    },
    ]);
  });

  it('renders standard notifications list and badges correctly', async () => {
    render(<Automation />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Automation Hub' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Customer notifications' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Sales Person notifications' })).toBeInTheDocument();
      expect(screen.getByText('New Lead Received')).toBeInTheDocument();
      expect(screen.getByText('New Lead Request Response')).toBeInTheDocument();
      expect(screen.getByText('Send Quote')).toBeInTheDocument();
      expect(screen.getByText('Opportunity Booked (Customer)')).toBeInTheDocument();
      expect(screen.getByText('Job Remainder')).toBeInTheDocument();
      for (const category of ['Lead Intake', 'Sales Updates', 'Job Communications', 'Customer Sign Off', 'Outbound Delivery']) {
        expect(screen.getAllByText(category, { exact: true }).length).toBeGreaterThan(0);
      }
      expect(screen.getByText('Workflow')).toBeInTheDocument();
      expect(screen.getByText('Channel')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
      const notificationToggle = screen.getByRole('button', { name: 'Disable New Lead Received' });
      expect(notificationToggle).toHaveAttribute('aria-pressed', 'true');
      expect(notificationToggle).toHaveClass('min-h-10', 'min-w-10');
      expect(notificationToggle.querySelector('span')).toHaveClass('h-3.5', 'w-6');
      expect(notificationToggle.querySelector('span span')).toHaveClass('h-2', 'w-2');
    });
  });

  it('opens the integrated Document Builder route from Automations', async () => {
    render(<Automation />);
    await screen.findByRole('button', { name: /Document Builder/ });
    fireEvent.click(screen.getByRole('button', { name: /Document Builder/ }));
    expect(navigateMock).toHaveBeenCalledWith('/automation/documents/document-templates');
  });

  it('shows a run-history error with a working retry action', async () => {
    automationRunsMock.mockRejectedValueOnce({ response: { status: 500, data: { detail: 'Run history unavailable.' } } });
    render(<Automation />);
    fireEvent.click(screen.getByRole('button', { name: 'Automation Logs' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Run history unavailable.');
    const retryButtons = screen.getAllByRole('button', { name: 'Retry' });
    fireEvent.click(retryButtons[0]);
    await waitFor(() => expect(screen.queryByText('Run history unavailable.')).not.toBeInTheDocument());
    expect(automationRunsMock).toHaveBeenCalledTimes(2);
  });

  it('enables a customer notification from the toggle after selecting a template', async () => {
    const { getNotificationTemplates, updateBranchNotification } = await import('../../../services/api');
    render(<Automation />);
    const enableButton = await screen.findByRole('button', { name: 'Enable Send Quote' });

    fireEvent.click(enableButton);
    expect(await screen.findByRole('heading', { name: 'Configure Notification' })).toBeInTheDocument();
    expect(screen.getByText('Notification Enabled')).toBeInTheDocument();
    const masterToggle = screen.getByText('Notification Enabled').parentElement.parentElement.querySelector('label');
    expect(masterToggle).toHaveClass('min-h-10', 'min-w-10');
    expect(masterToggle.querySelector('span')).toHaveClass('h-4', 'w-7');
    await waitFor(() => {
      expect(getNotificationTemplates).toHaveBeenCalledWith({ channel: 'email', branch_id: 12 });
    });

    const emailTemplateSelect = screen.getAllByText(/Email Notification Template/)[0].parentElement.querySelector('select');
    fireEvent.change(emailTemplateSelect, { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Configuration' }));

    await waitFor(() => {
      expect(updateBranchNotification).toHaveBeenCalledWith('12', 'send_quote', {
        enabled: true,
        channels: {
          email: { enabled: true, template_id: 45 },
          sms: { enabled: false, template_id: null },
        },
      });
    });
  });

  it('enables an in-app notification and updates the toggle from the API response', async () => {
    const { getBranchNotifications, updateBranchNotification } = await import('../../../services/api');
    getBranchNotifications.mockResolvedValueOnce([
      {
        key: 'new_lead_received',
        name: 'New Lead Received',
        event: 'lead.created',
        target: 'lead',
        trigger_ready: true,
        supported_channels: ['in_app'],
        enabled: false,
        channels: { in_app: { enabled: false } },
      },
    ]);
    updateBranchNotification.mockResolvedValueOnce({
      key: 'new_lead_received',
      enabled: true,
      channels: { in_app: { enabled: true } },
    });
    render(<Automation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Enable New Lead Received' }));

    await waitFor(() => {
      expect(updateBranchNotification).toHaveBeenCalledWith('12', 'new_lead_received', {
        enabled: true,
        channels: { in_app: { enabled: true } },
      });
      expect(screen.getByRole('button', { name: 'Disable New Lead Received' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('enables the first configured customer channel when no channel is currently enabled', async () => {
    const { getBranchNotifications, updateBranchNotification } = await import('../../../services/api');
    getBranchNotifications.mockResolvedValueOnce([
      {
        key: 'new_lead_request_response',
        name: 'New Lead Request Response',
        event: 'lead.created',
        target: 'lead',
        trigger_ready: true,
        supported_channels: ['email', 'sms'],
        enabled: false,
        channels: {
          email: { enabled: false, template_id: 45, template_name: 'Lead Welcome' },
          sms: { enabled: false, template_id: null, template_name: null },
        },
      },
    ]);
    updateBranchNotification.mockResolvedValueOnce({
      key: 'new_lead_request_response',
      enabled: true,
      channels: {
        email: { enabled: true, template_id: 45, template_name: 'Lead Welcome' },
        sms: { enabled: false, template_id: null, template_name: null },
      },
    });
    render(<Automation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Enable New Lead Request Response' }));

    await waitFor(() => {
      expect(updateBranchNotification).toHaveBeenCalledWith('12', 'new_lead_request_response', {
        enabled: true,
        channels: {
          email: { enabled: true, template_id: 45 },
          sms: { enabled: false, template_id: null },
        },
      });
      expect(screen.getByRole('button', { name: 'Disable New Lead Request Response' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('disables a notification and preserves its configured templates', async () => {
    const { getBranchNotifications, updateBranchNotification } = await import('../../../services/api');
    getBranchNotifications.mockResolvedValueOnce([
      {
        key: 'new_lead_request_response',
        name: 'New Lead Request Response',
        event: 'lead.created',
        target: 'lead',
        trigger_ready: true,
        supported_channels: ['email', 'sms'],
        enabled: true,
        channels: {
          email: { enabled: true, template_id: 45, template_name: 'Lead Welcome' },
          sms: { enabled: true, template_id: 46, template_name: 'Lead Welcome SMS' },
        },
      },
    ]);
    updateBranchNotification.mockResolvedValueOnce({
      key: 'new_lead_request_response',
      enabled: false,
      channels: {
        email: { enabled: true, template_id: 45, template_name: 'Lead Welcome' },
        sms: { enabled: true, template_id: 46, template_name: 'Lead Welcome SMS' },
      },
    });
    render(<Automation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Disable New Lead Request Response' }));

    await waitFor(() => {
      expect(updateBranchNotification).toHaveBeenCalledWith('12', 'new_lead_request_response', {
        enabled: false,
      });
      expect(screen.getByRole('button', { name: 'Enable New Lead Request Response' })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('allows saving an unavailable salesperson notification for when its event is emitted', async () => {
    const { getBranchNotifications, updateBranchNotification } = await import('../../../services/api');
    getBranchNotifications.mockResolvedValueOnce([
      {
        key: 'customer_submit_inventory',
        name: 'Customer Submit Inventory',
        event: 'inventory.submitted',
        target: 'opportunity',
        trigger_ready: false,
        supported_channels: ['in_app'],
        enabled: false,
        channels: { in_app: { enabled: false } },
      },
    ]);
    updateBranchNotification.mockResolvedValueOnce({
      key: 'customer_submit_inventory',
      enabled: true,
      trigger_ready: false,
      channels: { in_app: { enabled: true } },
    });
    render(<Automation />);

    const toggle = await screen.findByRole('button', { name: 'Enable Customer Submit Inventory' });
    expect(toggle).toBeEnabled();
    expect(toggle).toHaveAttribute('title', 'Turn on this workflow');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateBranchNotification).toHaveBeenCalledWith('12', 'customer_submit_inventory', {
        enabled: true,
        channels: { in_app: { enabled: true } },
      });
      expect(screen.getByRole('button', { name: 'Disable Customer Submit Inventory' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('allows saving an unavailable customer notification after choosing a template', async () => {
    const { getBranchNotifications, updateBranchNotification } = await import('../../../services/api');
    getBranchNotifications.mockResolvedValueOnce([
      {
        key: 'job_reminder',
        name: 'Job Remainder',
        event: 'job.moving_day_reminder',
        target: 'opportunity',
        trigger_ready: false,
        supported_channels: ['email', 'sms'],
        enabled: false,
        channels: {
          email: { enabled: false, template_id: null, template_name: null },
          sms: { enabled: false, template_id: null, template_name: null },
        },
      },
    ]);
    updateBranchNotification.mockResolvedValueOnce({
      key: 'job_reminder',
      enabled: true,
      trigger_ready: false,
      channels: {
        email: { enabled: true, template_id: 45, template_name: 'Lead Welcome' },
        sms: { enabled: false, template_id: null, template_name: null },
      },
    });
    render(<Automation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Enable Job Remainder' }));
    expect(await screen.findByText('Notification Enabled')).toBeInTheDocument();
    expect(screen.queryByText(/this event is accepted but is not currently emitted/i)).not.toBeInTheDocument();
    const emailTemplateSelect = screen.getAllByText(/Email Notification Template/)[0].parentElement.querySelector('select');
    fireEvent.change(emailTemplateSelect, { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Configuration' }));

    await waitFor(() => {
      expect(updateBranchNotification).toHaveBeenCalledWith('12', 'job_reminder', {
        enabled: true,
        channels: {
          email: { enabled: true, template_id: 45 },
          sms: { enabled: false, template_id: null },
        },
      });
    });
  });

  it('allows an inbound-reply notification toggle when its backend event is ready', async () => {
    const { getBranchNotifications, updateBranchNotification } = await import('../../../services/api');
    getBranchNotifications.mockResolvedValueOnce([
      {
        key: 'new_email_sms_reply_opportunity_sales_person',
        name: 'New Email & SMS Reply (Opportunity - Sales Person)',
        event: 'communications.inbound_message_received',
        target: 'opportunity',
        trigger_ready: true,
        supported_channels: ['in_app'],
        enabled: false,
        channels: { in_app: { enabled: false } },
      },
    ]);
    updateBranchNotification.mockResolvedValueOnce({
      key: 'new_email_sms_reply_opportunity_sales_person',
      enabled: true,
      channels: { in_app: { enabled: true } },
    });
    render(<Automation />);

    const toggle = await screen.findByRole('button', {
      name: 'Enable New Email & SMS Reply (Opportunity - Sales Person)',
    });
    expect(toggle).toBeEnabled();
    expect(toggle).toHaveAttribute(
      'title',
      'Turn on this workflow'
    );
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateBranchNotification).toHaveBeenCalledWith(
        '12',
        'new_email_sms_reply_opportunity_sales_person',
        { enabled: true, channels: { in_app: { enabled: true } } }
      );
      expect(
        screen.getByRole('button', {
          name: 'Disable New Email & SMS Reply (Opportunity - Sales Person)',
        })
      ).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('keeps the toggle state and reports an error when the API update fails', async () => {
    const { getBranchNotifications, updateBranchNotification } = await import('../../../services/api');
    getBranchNotifications.mockResolvedValueOnce([
      {
        key: 'new_lead_received',
        name: 'New Lead Received',
        event: 'lead.created',
        target: 'lead',
        trigger_ready: true,
        supported_channels: ['in_app'],
        enabled: false,
        channels: { in_app: { enabled: false } },
      },
    ]);
    updateBranchNotification.mockRejectedValueOnce({
      response: { data: { detail: 'Notification update was rejected.' } },
    });
    render(<Automation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Enable New Lead Received' }));

    await waitFor(() => {
      expect(screen.getByText('Notification update was rejected.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enable New Lead Received' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: 'Enable New Lead Received' })).not.toHaveAttribute('aria-busy', 'true');
    });
  });

  it('configures a notification using active templates scoped to the selected branch', async () => {
    const { getNotificationTemplates, updateBranchNotification } = await import('../../../services/api');
    render(<Automation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Configure New Lead Request Response' }));
    expect(await screen.findByRole('heading', { name: 'Configure Notification' })).toBeInTheDocument();

    await waitFor(() => {
      expect(getNotificationTemplates).toHaveBeenCalledWith({ channel: 'email', branch_id: 12 });
      expect(getNotificationTemplates).toHaveBeenCalledWith({ channel: 'sms', branch_id: 12 });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Configuration' }));
    await waitFor(() => {
      expect(updateBranchNotification).toHaveBeenCalledWith('12', 'new_lead_request_response', {
        enabled: true,
        channels: {
          email: { enabled: true, template_id: 45 },
          sms: { enabled: false, template_id: null },
        },
      });
    });
  });

  it('saves in-app notification settings without requesting message templates', async () => {
    const { getNotificationTemplates, updateBranchNotification } = await import('../../../services/api');
    render(<Automation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Configure New Lead Received' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save Configuration' }));

    await waitFor(() => {
      expect(updateBranchNotification).toHaveBeenCalledWith('12', 'new_lead_received', {
        enabled: true,
        channels: { in_app: { enabled: true } },
      });
    });
    expect(getNotificationTemplates).not.toHaveBeenCalled();
  });

  it('does not save notification settings when template loading fails', async () => {
    const { getNotificationTemplates, updateBranchNotification } = await import('../../../services/api');
    getNotificationTemplates.mockRejectedValueOnce(new Error('template service unavailable'));
    render(<Automation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Configure New Lead Request Response' }));
    expect(await screen.findByText('template service unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Configuration' }));

    await waitFor(() => {
      expect(screen.getByText(/templates could not be loaded/i)).toBeInTheDocument();
    });
    expect(updateBranchNotification).not.toHaveBeenCalled();
  });

  it('requires replacing a saved template that is no longer active', async () => {
    const { getBranchNotifications, updateBranchNotification } = await import('../../../services/api');
    getBranchNotifications.mockResolvedValueOnce([
      {
        key: 'new_lead_request_response',
        name: 'New Lead Request Response',
        target: 'lead',
        trigger_ready: true,
        supported_channels: ['email', 'sms'],
        enabled: true,
        channels: {
          email: { enabled: true, template_id: 999, template_name: 'Archived Welcome' },
          sms: { enabled: false, template_id: null },
        },
      },
    ]);
    render(<Automation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Configure New Lead Request Response' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save Configuration' }));

    expect(await screen.findByText(/selected Email template is inactive or unavailable/i)).toBeInTheDocument();
    expect(updateBranchNotification).not.toHaveBeenCalled();
  });

  it('switches to Custom Automations tab and renders custom automations', async () => {
    render(<Automation />);

    const automationsTab = screen.getByRole('button', { name: /^Automations$/i });
    fireEvent.click(automationsTab);

    await waitFor(() => {
      expect(screen.getByText('Follow up after a new lead')).toBeInTheDocument();
      expect(screen.getByText('On create')).toBeInTheDocument();
      expect(screen.getByText('Send email')).toBeInTheDocument();
      expect(screen.getByText('Send SMS · +1440m')).toBeInTheDocument();
      expect(screen.getByText('1 filter')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Edit Follow up after a new lead' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Duplicate Follow up after a new lead' })).toBeInTheDocument();
      const automationToggle = screen.getByRole('switch', { name: 'Disable Follow up after a new lead' });
      expect(automationToggle).toHaveAttribute('aria-pressed', 'true');
      expect(automationToggle).toHaveClass('min-h-10', 'min-w-10');
      expect(automationToggle.querySelector('span')).toHaveClass('h-3.5', 'w-6');
      expect(automationToggle.querySelector('span span')).toHaveClass('h-2', 'w-2');
      expect(screen.getByRole('button', { name: 'Deactivate Follow up after a new lead' })).toBeInTheDocument();
    });
  });

  it('loads automation detail from the API before opening the edit form', async () => {
    const { getCustomAutomation } = await import('../../../services/api');
    render(<Automation />);

    fireEvent.click(screen.getByRole('button', { name: /^Automations$/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Follow up after a new lead' }));

    await waitFor(() => {
      expect(getCustomAutomation).toHaveBeenCalledWith(91);
      expect(screen.getByPlaceholderText('Automation name')).toHaveValue('Follow up after a new lead');
    });
  });

  it('switches to Automation Runs & Logs tab and renders runs', async () => {
    render(<Automation />);

    const logsTab = screen.getByRole('button', { name: /Automation Logs/i });
    fireEvent.click(logsTab);

    await waitFor(() => {
      expect(screen.getByText('Run #804')).toBeInTheDocument();
      expect(screen.getByText('queued', { exact: true })).toBeInTheDocument();
      expect(screen.getByText('Send accepted · Message queued')).toBeInTheDocument();
    });
  });

  it('shows a run-history error instead of an empty-state message when loading fails', async () => {
    const { getCustomAutomationRuns } = await import('../../../services/api');
    getCustomAutomationRuns.mockRejectedValueOnce({ response: { status: 403 } });
    render(<Automation />);

    fireEvent.click(screen.getByRole('button', { name: /Automation Logs/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission to view this information.');
    expect(screen.queryByText('No automation runs found.')).not.toBeInTheDocument();
  });

  it('shows the four-step automation editor with a live preview', async () => {
    render(<Automation />);

    fireEvent.click(screen.getByRole('button', { name: /^Automations$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Create Automation/i }));

    expect(await screen.findByText('When should this automation trigger?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Automation name')).toBeInTheDocument();
    expect(screen.getByText('Live Preview')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(await screen.findByRole('heading', { name: 'Actions' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(await screen.findByRole('heading', { name: 'Target' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(await screen.findByText('Add filters (optional)')).toBeInTheDocument();
  });

  it('blocks the automation wizard when event metadata fails to load', async () => {
    const { getCustomAutomationEvents, createCustomAutomation } = await import('../../../services/api');
    getCustomAutomationEvents.mockRejectedValueOnce(new Error('events unavailable'));
    render(<Automation />);

    fireEvent.click(screen.getByRole('button', { name: /^Automations$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Create Automation/i }));

    expect(await screen.findByText('events unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(createCustomAutomation).not.toHaveBeenCalled();
  });

  it('filters out inactive templates and prevents selecting inactive templates in wizard', async () => {
    const { getGeneralTemplates } = await import('../../../services/api');
    getGeneralTemplates.mockResolvedValueOnce([
      { id: 101, name: 'Active Email Template', state: 'active', is_active: true },
      { id: 102, name: 'Inactive Email Template', state: 'inactive', is_active: false },
      { id: 103, name: 'Unpublished Email Template', state: 'active', is_active: true, revision_id: null },
    ]);

    render(<Automation />);

    const automationsTab = screen.getByRole('button', { name: /^Automations$/i });
    fireEvent.click(automationsTab);

    const createBtn = await screen.findByRole('button', { name: /Create Automation/i });
    fireEvent.click(createBtn);

    // The first Next button opens the Actions step.
    const nextBtn = await screen.findByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText('Active Email Template')).toBeInTheDocument();
      expect(screen.queryByText('Inactive Email Template')).not.toBeInTheDocument();
      expect(screen.queryByText('Unpublished Email Template')).not.toBeInTheDocument();
    });
  });

  it('requires a usable email template when an in-app channel is also enabled', async () => {
    const { getBranchNotifications, updateBranchNotification } = await import('../../../services/api');
    getBranchNotifications.mockResolvedValueOnce([
      {
        key: 'mixed_channel_notification',
        name: 'Mixed Channel Notification',
        event: 'lead.created',
        target: 'lead',
        enabled: true,
        supported_channels: ['in_app', 'email'],
        channels: {
          in_app: { enabled: true },
          email: { enabled: true, template_id: null },
        },
      },
    ]);
    render(<Automation />);

    fireEvent.click(await screen.findByRole('button', { name: 'Configure Mixed Channel Notification' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save Configuration' }));

    expect(await screen.findByText('Please select a template for the Email channel before saving.')).toBeInTheDocument();
    expect(updateBranchNotification).not.toHaveBeenCalled();
  });
});
