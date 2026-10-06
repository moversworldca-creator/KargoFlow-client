import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { Timeline, CommsHub, PlannedMoveCard } from './RedesignSalesComponents';

beforeAll(() => {
  if (!globalThis.IntersectionObserver) {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe('Timeline activity email preview', () => {
  it('renders the email preview content without the gray wrapper background', async () => {
    const emailActivity = {
      id: 1,
      activity_type: 'email',
      created_at: '2026-06-10T12:00:00.000Z',
      subject: 'Quote Sent',
      user_details: { first_name: 'System' },
      email_log_details: {
        status: 'sent',
        to_email: 'customer@example.com',
        preview_html: `<!doctype html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                .crm-email-wrapper{font-family:Arial,sans-serif;color:#111d23;line-height:1.6;background:#f6f7f9;padding:24px 0;}
                .crm-email-body{padding:20px 22px;}
              </style>
            </head>
            <body class="crm-email-wrapper">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="crm-email-body">
                    <div>Hello from the email</div>
                  </td>
                </tr>
              </table>
            </body>
          </html>`,
      },
    };

    render(
      <Timeline
        activities={[emailActivity]}
        filter="all"
        onFilterChange={vi.fn()}
        onTogglePin={vi.fn()}
        onPreview={vi.fn()}
        onToggleEmailRead={vi.fn()}
      />
    );

    const expandButton = screen.queryByRole('button', { name: /^Expand$/i });
    if (expandButton) {
      fireEvent.click(expandButton);
    }

    expect(screen.getByText(/to customer@example\.com/i)).toBeInTheDocument();

    const iframe = await screen.findByTitle('Email activity 1 preview');
    const srcDoc = iframe.getAttribute('srcdoc') || '';

    expect(srcDoc).toContain('Hello from the email');
    expect(srcDoc).not.toContain('background:#f6f7f9');
    expect(srcDoc).toMatch(/background:\s*#fff/i);
  });
});

describe('CommsHub note channel layout', () => {
  it('renders Post Note button and excludes email attachment tools on note channel', () => {
    render(
      <CommsHub
        customerName="Jane Doe"
        customerPhone="123-456-7890"
        currentChannel="note"
        onChannelChange={vi.fn()}
        body="Test note content"
        onBodyChange={vi.fn()}
        subject=""
        onSubjectChange={vi.fn()}
        isPosting={false}
        onPost={vi.fn()}
      />
    );

    const postNoteBtn = screen.getByRole('button', { name: /Post Note/i });
    expect(postNoteBtn).toBeInTheDocument();
    expect(screen.getByText('17 chars')).toBeInTheDocument();
    // Email tools should not be rendered on note channel to avoid mobile overflow
    expect(screen.queryByRole('button', { name: /hide email tools/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show email tools/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Attach$/i })).not.toBeInTheDocument();
  });
});

describe('CommsHub template category selection', () => {
  const categories = [
    { id: 1, name: 'Sales' },
    { id: 2, name: 'Operations' }
  ];

  const emailTemplates = [
    { id: 101, name: 'Sales Template 1', channel: 'email', is_active: true, category: 1 },
    { id: 102, name: 'Ops Template 2', channel: 'email', is_active: true, category: 2 },
    { id: 103, name: 'General Template 3', channel: 'email', is_active: true, category: null }
  ];

  it('filters email templates by selected category', async () => {
    const handleApplyTemplate = vi.fn();
    render(
      <CommsHub
        customerName="Jane Doe"
        customerPhone="123-456-7890"
        currentChannel="email"
        onChannelChange={vi.fn()}
        body=""
        onBodyChange={vi.fn()}
        subject=""
        onSubjectChange={vi.fn()}
        isPosting={false}
        onPost={vi.fn()}
        onDial={vi.fn()}
        emailTemplates={emailTemplates}
        smsTemplates={[]}
        onApplyTemplate={handleApplyTemplate}
        emailAttachments={[]}
        onEmailAttachmentsChange={vi.fn()}
        categories={categories}
      />
    );

    // Initial state: "All Categories" selected. Open dropdown and check templates.
    const templateButton = screen.getByRole('button', { name: /template\.\.\./i });
    fireEvent.click(templateButton);
    expect(screen.getByText('Sales Template 1')).toBeInTheDocument();
    expect(screen.getByText('Ops Template 2')).toBeInTheDocument();
    expect(screen.getByText('General Template 3')).toBeInTheDocument();
    fireEvent.click(templateButton);

    // Click on category button to open popover
    const categoryButton = screen.getByTitle('Filter templates by category');
    fireEvent.click(categoryButton);

    // Verify popover options
    expect(screen.getByText('Filter by Category')).toBeInTheDocument();
    expect(screen.getAllByText('All Categories')[0]).toBeInTheDocument();
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();

    // Click "Sales" category
    fireEvent.click(screen.getByText('Sales'));

    // Check filtering
    // Open template dropdown
    fireEvent.click(templateButton);
    expect(screen.getByText('Sales Template 1')).toBeInTheDocument();
    expect(screen.queryByText('Ops Template 2')).not.toBeInTheDocument();
    expect(screen.queryByText('General Template 3')).not.toBeInTheDocument();
    fireEvent.click(templateButton);

    // Click on category button again and select "Uncategorized"
    fireEvent.click(categoryButton);
    fireEvent.click(screen.getByText('Uncategorized'));

    // Open template dropdown
    fireEvent.click(templateButton);
    expect(screen.getByText('General Template 3')).toBeInTheDocument();
    expect(screen.queryByText('Sales Template 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Ops Template 2')).not.toBeInTheDocument();
  });
});

describe('PlannedMoveCard availability scheduler', () => {
  const availabilityData = {
    days: [
      {
        date: '2026-07-10',
        closed: false,
        slots: [
          { start: '09:00', end: '11:00', available: true, remaining_capacity: 2, capacity: 3 },
          { start: '12:00', end: '14:00', available: false, remaining_capacity: 0, capacity: 1 },
        ],
      },
    ],
  };

  const renderScheduler = (props = {}) => {
    const defaults = {
      moveDate: '2026-07-10',
      moveDateTime: '',
      truckCount: 1,
      daysUntilMove: 9,
      crewSize: 3,
      estHours: 5,
      saving: false,
      onSave: vi.fn().mockResolvedValue(true),
      onStartEdit: vi.fn(),
      onCancelEdit: vi.fn(),
      onClearSchedule: vi.fn().mockResolvedValue(true),
      onMoveDateChange: vi.fn(),
      onArrivalWindowChange: vi.fn(),
      isLeadPath: false,
      draftArrivalWindowStart: '09:00',
      draftArrivalWindowEnd: '11:00',
      availabilityData,
      isAvailabilityLoading: false,
      branchName: 'Main Branch',
      hasBranch: true,
      fetchAvailability: vi.fn(),
      moveSizeLabel: '2 Bedroom',
    };
    const merged = { ...defaults, ...props };
    render(<PlannedMoveCard plannedMove={merged} />);
    return merged;
  };

  it('opens, selects, applies, and clears scheduler availability', async () => {
    const props = renderScheduler();

    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(props.onStartEdit).toHaveBeenCalled();
    expect(await screen.findByText('Availability Scheduler')).toBeInTheDocument();

    const slotButton = screen.getAllByRole('button', { name: /9:00 AM/i }).at(-1);
    fireEvent.click(slotButton);
    expect(props.onArrivalWindowChange).toHaveBeenCalledWith('09:00', '11:00');
    expect(props.onMoveDateChange).toHaveBeenCalledWith('2026-07-10');

    fireEvent.click(screen.getByRole('button', { name: /^Apply$/i }));
    await waitFor(() => {
      expect(props.onSave).toHaveBeenCalled();
      expect(screen.queryByText('Availability Scheduler')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(await screen.findByText('Availability Scheduler')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Clear Schedule/i }));
    await waitFor(() => {
      expect(props.onClearSchedule).toHaveBeenCalled();
      expect(screen.queryByText('Availability Scheduler')).not.toBeInTheDocument();
    });
  });
});
