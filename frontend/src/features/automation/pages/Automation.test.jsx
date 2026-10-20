import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Automation from './Automation';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
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
      key: 'lead_created',
      name: 'New lead acknowledgment',
      description: 'Sent to the customer when a new inquiry is received.',
      event: 'lead.created',
      target: 'lead',
      trigger_ready: true,
      branch_id: 12,
      enabled: true,
      channels: {
        email: { enabled: true, template_id: 45, template_name: 'Lead Welcome' },
        sms: { enabled: false, template_id: null, template_name: null },
      },
    },
    {
      key: 'estimate_sent',
      name: 'Estimate sent',
      description: 'Sent when an estimate is sent to the customer.',
      event: 'estimate.sent',
      target: 'opportunity',
      trigger_ready: true,
      branch_id: 12,
      enabled: false,
      channels: {
        email: { enabled: false, template_id: null, template_name: null },
        sms: { enabled: false, template_id: null, template_name: null },
      },
    },
    {
      key: 'opportunity_booked',
      name: 'Booking confirmation',
      description: 'Sent when the move is booked.',
      event: 'opportunity.booked',
      target: 'opportunity',
      trigger_ready: true,
      branch_id: 12,
      enabled: false,
      channels: {
        email: { enabled: false, template_id: null, template_name: null },
        sms: { enabled: false, template_id: null, template_name: null },
      },
    },
    {
      key: 'moving_day_reminder',
      name: 'Moving-day reminder',
      description: 'Sent ahead of the moving day.',
      event: 'job.moving_day_reminder',
      target: 'opportunity',
      trigger_ready: false,
      branch_id: 12,
      enabled: false,
      channels: {
        email: { enabled: false, template_id: null, template_name: null },
        sms: { enabled: false, template_id: null, template_name: null },
      },
    },
  ]),
  updateBranchNotification: vi.fn().mockResolvedValue({
    key: 'lead_created',
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
  updateCustomAutomation: vi.fn().mockResolvedValue({ id: 91, is_active: false }),
  deactivateCustomAutomation: vi.fn().mockResolvedValue({}),
  createCustomAutomation: vi.fn().mockResolvedValue({ id: 92 }),
  getCustomAutomationEvents: vi.fn().mockResolvedValue([
    { event: 'lead.created', target: 'lead', emitted: true },
    { event: 'opportunity.booked', target: 'opportunity', emitted: true },
  ]),
  getCustomAutomationRuns: vi.fn().mockResolvedValue([
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
  ]),
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
  });

  it('renders standard notifications list and badges correctly', async () => {
    render(<Automation />);

    await waitFor(() => {
      // Check all 4 official notifications from NOTIFICATION_DEFINITIONS
      expect(screen.getByText('New lead acknowledgment')).toBeInTheDocument();
      expect(screen.getByText('Estimate sent')).toBeInTheDocument();
      expect(screen.getByText('Booking confirmation')).toBeInTheDocument();
      expect(screen.getByText('Moving-day reminder')).toBeInTheDocument();

      // Check event tags
      expect(screen.getByText('Event: lead.created')).toBeInTheDocument();
      expect(screen.getByText('Event: estimate.sent')).toBeInTheDocument();
      expect(screen.getByText('Event: opportunity.booked')).toBeInTheDocument();
      expect(screen.getByText('Event: job.moving_day_reminder')).toBeInTheDocument();

      // Check trigger badges: 3 trigger ready, 1 pending emission
      expect(screen.getAllByText('Trigger Ready')).toHaveLength(3);
      expect(screen.getByText('Pending Emission')).toBeInTheDocument();
    });
  });

  it('switches to Custom Automations tab and renders custom automations', async () => {
    render(<Automation />);

    const automationsTab = screen.getByRole('button', { name: /Custom Automations/i });
    fireEvent.click(automationsTab);

    await waitFor(() => {
      expect(screen.getByText('Follow up after a new lead')).toBeInTheDocument();
      expect(screen.getByText('lead.created')).toBeInTheDocument();
    });
  });

  it('switches to Automation Runs & Logs tab and renders runs', async () => {
    render(<Automation />);

    const logsTab = screen.getByRole('button', { name: /Automation Runs & Logs/i });
    fireEvent.click(logsTab);

    await waitFor(() => {
      expect(screen.getByText('Run #804')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });

  it('filters out inactive templates and prevents selecting inactive templates in wizard', async () => {
    const { getGeneralTemplates } = await import('../../../services/api');
    getGeneralTemplates.mockResolvedValueOnce([
      { id: 101, name: 'Active Email Template', state: 'active', is_active: true },
      { id: 102, name: 'Inactive Email Template', state: 'inactive', is_active: false },
    ]);

    render(<Automation />);

    const automationsTab = screen.getByRole('button', { name: /Custom Automations/i });
    fireEvent.click(automationsTab);

    const createBtn = await screen.findByRole('button', { name: /Create Automation/i });
    fireEvent.click(createBtn);

    // In wizard, navigate to Step 3: Communication Steps
    const nextBtn = await screen.findByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn); // Step 2 (Conditions)
    const nextBtn2 = await screen.findByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn2); // Step 3 (Steps)

    await waitFor(() => {
      expect(screen.getByText('Active Email Template')).toBeInTheDocument();
      expect(screen.queryByText('Inactive Email Template')).not.toBeInTheDocument();
    });
  });
});
