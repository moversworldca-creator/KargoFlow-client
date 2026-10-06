import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import CommunicationTemplates from './CommunicationTemplates';

const apiMocks = vi.hoisted(() => ({
  createCommunicationTemplate: vi.fn(),
  createCommunicationTemplateCategory: vi.fn(),
  deleteCommunicationTemplate: vi.fn(),
  deleteCommunicationTemplateCategory: vi.fn(),
  getBranches: vi.fn(),
  getCommunicationTemplateCategories: vi.fn(),
  getCommunicationTemplateKeys: vi.fn(),
  getCommunicationTemplateVariables: vi.fn(),
  getCommunicationTemplates: vi.fn(),
  previewCommunicationTemplate: vi.fn(),
  seedCommunicationTemplates: vi.fn(),
  updateCommunicationTemplate: vi.fn(),
  updateAutomationStep: vi.fn(),
}));

const routerMocks = vi.hoisted(() => ({
  locationState: null,
  navigate: vi.fn(),
}));

vi.mock('../../../services/api', () => ({
  default: {
    general: {
      getBranches: apiMocks.getBranches,
    },
  },
  createCommunicationTemplate: apiMocks.createCommunicationTemplate,
  createCommunicationTemplateCategory: apiMocks.createCommunicationTemplateCategory,
  deleteCommunicationTemplate: apiMocks.deleteCommunicationTemplate,
  deleteCommunicationTemplateCategory: apiMocks.deleteCommunicationTemplateCategory,
  getCommunicationTemplateCategories: apiMocks.getCommunicationTemplateCategories,
  getCommunicationTemplateKeys: apiMocks.getCommunicationTemplateKeys,
  getCommunicationTemplateVariables: apiMocks.getCommunicationTemplateVariables,
  getCommunicationTemplates: apiMocks.getCommunicationTemplates,
  previewCommunicationTemplate: apiMocks.previewCommunicationTemplate,
  seedCommunicationTemplates: apiMocks.seedCommunicationTemplates,
  updateAutomationStep: apiMocks.updateAutomationStep,
  updateCommunicationTemplate: apiMocks.updateCommunicationTemplate,
}));

vi.mock('../../../shared/ui/Card', () => ({
  default: ({ children, className = '' }) => <div className={className}>{children}</div>,
}));

vi.mock('./EmailVisualBuilder', () => ({
  default: ({ value = '', onChange, insertTokenRequest = null }) => {
    React.useEffect(() => {
      if (!insertTokenRequest?.token) return;
      onChange?.(`${value ? `${value} ` : ''}${insertTokenRequest.token}`);
    }, [insertTokenRequest?.id]);

    return (
      <textarea
        aria-label="Email visual builder"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  },
}));

vi.mock('../../../shared/ui/RichTextEditor', () => ({
  default: ({ value = '', onChange }) => <textarea aria-label="Rich text editor" value={value} onChange={(e) => onChange?.(e.target.value)} />,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => routerMocks.navigate,
    useLocation: () => ({ state: routerMocks.locationState }),
  };
});

describe('CommunicationTemplates', () => {
  let queryClient;

  const renderWithQueryClient = (ui) => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    routerMocks.locationState = null;

    apiMocks.getBranches.mockResolvedValue([{ id: 5, name: 'Main Branch' }]);
    apiMocks.getCommunicationTemplateCategories.mockResolvedValue([]);
    apiMocks.getCommunicationTemplateVariables.mockResolvedValue({ results: [] });
    apiMocks.getCommunicationTemplateKeys.mockResolvedValue({ results: [] });
    apiMocks.seedCommunicationTemplates.mockResolvedValue({ message: 'Default templates loaded.' });
    apiMocks.getCommunicationTemplates.mockResolvedValue([
      {
        id: 1,
        branch: 5,
        template_key: 'quote_sent',
        name: 'Quote Sent',
        description: 'Default quote template',
        channel: 'email',
        subject: 'Subject',
        body: 'Body',
        body_html: '',
        body_css: '',
        variables: [],
        is_active: true,
        is_default: true,
        sort_order: 0,
      },
      {
        id: 2,
        branch: 5,
        template_key: 'custom_followup',
        name: 'Custom Follow Up',
        description: 'Custom template',
        channel: 'email',
        subject: 'Hello',
        body: 'Body',
        body_html: '',
        body_css: '',
        variables: [],
        is_active: true,
        is_default: false,
        sort_order: 1,
      },
    ]);
  });

  afterEach(() => {
    queryClient?.clear?.();
    queryClient = null;
  });

  it('locks default templates and keeps custom templates deletable', async () => {
    renderWithQueryClient(<CommunicationTemplates branchId={5} />);

    await waitFor(() => {
      expect(apiMocks.getCommunicationTemplates).toHaveBeenCalled();
    });

    expect(await screen.findByText('Quote Sent')).toBeInTheDocument();
    expect(await screen.findByText('Custom Follow Up')).toBeInTheDocument();
    expect(screen.getByLabelText('Default template locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete template/i })).toBeInTheDocument();
  });

  it('reorders templates when the drag handle is used', async () => {
    renderWithQueryClient(<CommunicationTemplates branchId={5} />);

    await waitFor(() => {
      expect(apiMocks.getCommunicationTemplates).toHaveBeenCalled();
    });

    const dataTransfer = {
      data: {},
      setData(type, value) {
        this.data[type] = value;
      },
      getData(type) {
        return this.data[type] || '';
      },
      effectAllowed: '',
    };

    fireEvent.dragStart(screen.getByLabelText('Drag Custom Follow Up to reorder'), { dataTransfer });
    fireEvent.dragOver(screen.getByText('Quote Sent').closest('tr'), { dataTransfer });
    fireEvent.drop(screen.getByText('Quote Sent').closest('tr'), { dataTransfer });

    await waitFor(() => {
      expect(apiMocks.updateCommunicationTemplate).toHaveBeenCalledWith(2, { sort_order: 0 });
      expect(apiMocks.updateCommunicationTemplate).toHaveBeenCalledWith(1, { sort_order: 1 });
    });
  });

  it('inserts a quick variable into the email visual builder', async () => {
    renderWithQueryClient(<CommunicationTemplates branchId={5} builderRouteView="builder" />);

    await screen.findByText('New Template');

    fireEvent.click(screen.getByRole('button', { name: /Insert Variable/i }));
    fireEvent.click(screen.getByTitle('Insert {{branch_name}}'));

    await waitFor(() => {
      expect(screen.getByLabelText('Email visual builder')).toHaveValue('{{branch_name}}');
    });
  });

  it('hydrates automation draft data with separate email and sms content', async () => {
    vi.mocked(apiMocks.getCommunicationTemplates).mockResolvedValue([
      {
        id: 11,
        branch: null,
        template_key: 'notif_booking_confirmation',
        name: 'Notification Booking Confirmation',
        description: 'Company-scoped booking confirmation email for automation notifications.',
        channel: 'email',
        subject: 'Your move is confirmed for {{move_date}}',
        body: 'Email body',
        body_html: '<p>Email body</p>',
        body_css: '',
        variables: [],
        is_active: true,
        is_default: true,
        sort_order: 0,
      },
      {
        id: 12,
        branch: null,
        template_key: 'notif_booking_confirmation',
        name: 'Notification Booking Confirmation SMS',
        description: 'Company-scoped booking confirmation SMS for automation notifications.',
        channel: 'sms',
        subject: '',
        body: 'SMS body',
        body_html: '',
        body_css: '',
        variables: [],
        is_active: true,
        is_default: true,
        sort_order: 1,
      },
    ]);

    routerMocks.locationState = {
      draftData: {
        name: 'Booking Confirmation',
        template_key: 'notif_booking_confirmation',
        email_template_key: 'notif_booking_confirmation',
        sms_template_key: 'notif_booking_confirmation',
        email_subject: 'Your move is confirmed for {{move_date}}',
        body: 'Email body',
        sms_body: 'SMS body',
        channel: 'email_sms',
        channels: ['email', 'sms'],
        notification_scope: 'company',
      },
    };

    renderWithQueryClient(
      <CommunicationTemplates
        branchId={null}
        basePath="/automation/templates"
        builderRouteView="builder"
        builderRouteItemId="new"
        builderRouteState={routerMocks.locationState}
      />
    );

    await screen.findByText('New Template');
    expect(screen.getByLabelText('Name')).toHaveValue('Booking Confirmation');
    expect(screen.getByLabelText('Email Subject')).toHaveValue('Your move is confirmed for {{move_date}}');
    expect(screen.getByText('Email & SMS')).toBeInTheDocument();
    expect(screen.getByText('SMS Editor')).toBeInTheDocument();
  });

  it('updates an existing notification template when route state lacks template ids', async () => {
    vi.mocked(apiMocks.getCommunicationTemplates).mockResolvedValue([
      {
        id: 21,
        branch: 5,
        template_key: 'automation_notification__new_lead_received',
        name: 'New Lead Received',
        description: 'Seeded notification email.',
        channel: 'email',
        subject: 'Lead received',
        body: 'Body',
        body_html: '',
        body_css: '',
        variables: [],
        is_active: true,
        is_default: true,
        sort_order: 0,
      },
    ]);
    apiMocks.updateCommunicationTemplate.mockResolvedValue({
      id: 21,
      branch: 5,
      template_key: 'automation_notification__new_lead_received',
      name: 'New Lead Received',
      channel: 'email',
      subject: 'Lead received',
      body: 'Body',
      body_html: '',
    });

    routerMocks.locationState = {
      draftData: {
        name: 'New Lead Received',
        template_key: 'automation_notification__new_lead_received',
        email_template_key: 'automation_notification__new_lead_received',
        subject: 'Lead received',
        body: 'Body',
        body_html: '',
        channel: 'email',
        notification_scope: 'company',
        branch: 5,
      },
    };

    renderWithQueryClient(
      <CommunicationTemplates
        branchId={null}
        basePath="/automation/templates"
        builderRouteView="builder"
        builderRouteItemId="new"
        builderRouteState={routerMocks.locationState}
      />
    );

    await screen.findByText('New Template');
    fireEvent.click(screen.getByRole('button', { name: /save template/i }));

    await waitFor(() => {
      expect(apiMocks.updateCommunicationTemplate).toHaveBeenCalledWith(
        21,
        expect.objectContaining({
          branch: 5,
          channel: 'email',
          template_key: 'automation_notification__new_lead_received',
        })
      );
    });
    expect(apiMocks.createCommunicationTemplate).not.toHaveBeenCalled();
  });

  it('keeps an email-only automation draft from being hydrated as multichannel when sms shares the same key', async () => {
    vi.mocked(apiMocks.getCommunicationTemplates).mockResolvedValue([
      {
        id: 41,
        branch: 5,
        template_key: 'automation_notification__lead_followup',
        name: 'Lead Followup',
        description: 'Email template',
        channel: 'email',
        subject: 'Follow up',
        body: 'Email body',
        body_html: '',
        body_css: '',
        variables: [],
        is_active: true,
        is_default: true,
        sort_order: 0,
      },
      {
        id: 42,
        branch: 5,
        template_key: 'automation_notification__lead_followup',
        name: 'Lead Followup SMS',
        description: 'SMS template',
        channel: 'sms',
        subject: '',
        body: 'SMS body',
        body_html: '',
        body_css: '',
        variables: [],
        is_active: true,
        is_default: true,
        sort_order: 1,
      },
    ]);

    routerMocks.locationState = {
      draftData: {
        name: 'Lead Followup',
        template_key: 'automation_notification__lead_followup',
        email_template_key: 'automation_notification__lead_followup',
        subject: 'Follow up',
        body: 'Email body',
        body_html: '',
        channel: 'email',
        notification_scope: 'company',
        branch: 5,
      },
    };

    renderWithQueryClient(
      <CommunicationTemplates
        branchId={null}
        basePath="/automation/templates"
        builderRouteView="builder"
        builderRouteItemId="new"
        builderRouteState={routerMocks.locationState}
      />
    );

    await screen.findByText('New Template');
    expect(screen.queryByText('Email & SMS')).not.toBeInTheDocument();
    expect(screen.queryByText('SMS Editor')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Channel')).toHaveValue('email');
  });

  it('downgrades a multichannel automation step to email-only when saved as email', async () => {
    vi.mocked(apiMocks.getCommunicationTemplates).mockResolvedValue([
      {
        id: 31,
        branch: 5,
        template_key: 'automation_notification__job_confirm',
        name: 'Job Confirm',
        description: 'Email template',
        channel: 'email',
        subject: 'Job confirmed',
        body: 'Email body',
        body_html: '',
        body_css: '',
        variables: [],
        is_active: true,
        is_default: true,
        sort_order: 0,
      },
      {
        id: 32,
        branch: 5,
        template_key: 'automation_notification__job_confirm',
        name: 'Job Confirm SMS',
        description: 'SMS template',
        channel: 'sms',
        subject: '',
        body: 'SMS body',
        body_html: '',
        body_css: '',
        variables: [],
        is_active: true,
        is_default: true,
        sort_order: 1,
      },
    ]);
    apiMocks.updateCommunicationTemplate.mockResolvedValue({
      id: 31,
      branch: 5,
      template_key: 'automation_notification__job_confirm',
      channel: 'email',
      subject: 'Job confirmed',
      body: 'Email body',
      body_html: '',
    });

    routerMocks.locationState = {
      automationStepId: 99,
      automationStepConfig: {
        channels: ['email', 'sms'],
        email_template_key: 'automation_notification__job_confirm',
        sms_template_key: 'automation_notification__job_confirm',
        email_template_id: 31,
        sms_template_id: 32,
      },
      draftData: {
        name: 'Job Confirm',
        template_key: 'automation_notification__job_confirm',
        email_template_key: 'automation_notification__job_confirm',
        subject: 'Job confirmed',
        body: 'Email body',
        body_html: '',
        channel: 'email',
        notification_scope: 'company',
        branch: 5,
      },
    };

    renderWithQueryClient(
      <CommunicationTemplates
        branchId={null}
        basePath="/automation/templates"
        builderRouteView="builder"
        builderRouteItemId="new"
        builderRouteState={routerMocks.locationState}
      />
    );

    await screen.findByText('New Template');
    fireEvent.click(screen.getByRole('button', { name: /save template/i }));

    await waitFor(() => {
      expect(apiMocks.updateAutomationStep).toHaveBeenCalledWith(
        99,
        expect.objectContaining({
          step_type: 'send_email',
          config: expect.objectContaining({
            channels: ['email'],
            email_template_key: 'automation_notification__job_confirm',
            sms_template_key: '',
            email_template_id: 31,
            sms_template_id: null,
            sms_body: '',
          }),
        })
      );
    });
  });
});
