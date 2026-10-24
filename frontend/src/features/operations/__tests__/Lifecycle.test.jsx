import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render as baseRender, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JobLifecyclePanel from '../components/JobLifecyclePanel';
import SalesLifecyclePanel from '../../crm/components/SalesLifecyclePanel';
import { STATUS_FIELDS, statusLabel } from '../../../shared/status/statusCatalog';
import { estimateLifecycleApi, jobsApi, plannedJobApi } from '../operationsApi';

let permissions = new Set();
vi.mock('../../../shared/auth/useCan', () => ({
  default: () => ({ can: (key) => permissions.has(key), canAny: (keys) => keys.some((k) => permissions.has(k)), canAll: (keys) => keys.every((k) => permissions.has(k)) }),
}));
vi.mock('../operationsApi', async (importOriginal) => ({
  ...(await importOriginal()),
  jobsApi: { list: vi.fn(), get: vi.fn(), move: vi.fn(), finalize: vi.fn(), close: vi.fn() },
  estimateLifecycleApi: { list: vi.fn(), move: vi.fn(), recordAcceptance: vi.fn() },
  plannedJobApi: { list: vi.fn(), confirmation: vi.fn() },
}));

const job = (extra = {}) => ({
  id: 7, opportunity_number: 'OPP-12', title: 'Moving day', move_date: '2026-11-04',
  booking_state: 'booked', customer_confirmation_state: 'not_required', dispatch_state: 'unscheduled',
  execution_state: 'not_started', accounting_state: 'not_ready', can_finalize: false,
  available_transitions: {
    booking: [{ to_state: 'confirmed', label: 'Confirmed' }, { to_state: 'cancelled', label: 'Cancelled' }],
    customer_confirmation: [], dispatch: [{ to_state: 'scheduled', label: 'Scheduled' }], execution: [], accounting: [],
  },
  ...extra,
});

const render = (ui) => baseRender(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>{ui}</QueryClientProvider>,
);

beforeEach(() => { vi.clearAllMocks(); permissions = new Set(); });

describe('status catalog', () => {
  it('names every state of the nine status fields', () => {
    expect(Object.keys(STATUS_FIELDS)).toEqual(['lead.system', 'opportunity.system', 'estimate.lifecycle', 'planned_job.confirmation',
      'job.booking', 'job.customer_confirmation', 'job.dispatch', 'job.execution', 'job.accounting']);
    expect(statusLabel('opportunity.system', 'open')).toBe('Opportunity');
    expect(statusLabel('job.customer_confirmation', 'reminder_sent')).toBe('Reminder Sent');
    expect(statusLabel('job.accounting', 'pending_close')).toBe('Pending Close');
  });
});

describe('Job lifecycle panel', () => {
  it('shows the five states and offers only allowed moves the user may make', async () => {
    permissions = new Set(['jobs.view', 'jobs.manage_booking']);
    jobsApi.get.mockResolvedValue(job());
    render(<JobLifecyclePanel jobId={7} />);
    const panel = await screen.findByRole('region', { name: 'Job lifecycle' });
    for (const label of ['Booked', 'Not Required', 'Unscheduled', 'Not Started', 'Not Ready']) {
      expect(within(panel).getByText(label)).toBeInTheDocument();
    }
    expect(within(panel).getByRole('button', { name: 'Confirmed' })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Scheduled' })).not.toBeInTheDocument();   // no jobs.dispatch
  });

  it('moves a lifecycle and shows the backend refusal when a rule blocks it', async () => {
    permissions = new Set(['jobs.view', 'jobs.dispatch']);
    jobsApi.get.mockResolvedValue(job({ dispatch_state: 'scheduled', available_transitions: { ...job().available_transitions, dispatch: [{ to_state: 'published', label: 'Published' }] } }));
    jobsApi.move.mockRejectedValue({ response: { status: 422, data: { detail: 'Job 7 must be booking-confirmed before dispatch publication' } } });
    render(<JobLifecyclePanel jobId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Published' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('must be booking-confirmed before dispatch publication');
    expect(jobsApi.move).toHaveBeenCalledWith(7, 'dispatch', 'published');
  });

  it('finalizes with the checklist, then offers Close', async () => {
    permissions = new Set(['jobs.view', 'jobs.close']);
    jobsApi.get.mockResolvedValue(job({ execution_state: 'completed', accounting_state: 'pending_finalization', can_finalize: true }));
    jobsApi.finalize.mockResolvedValue(job({ execution_state: 'completed', accounting_state: 'pending_close',
      available_transitions: { ...job().available_transitions, accounting: [{ to_state: 'closed', label: 'Closed' }] } }));
    render(<JobLifecyclePanel jobId={7} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Finalize job' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText('Customer signature collected'));
    fireEvent.click(within(dialog).getByLabelText('Inventory checked'));
    fireEvent.click(within(dialog).getByLabelText('Payment handled'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Finalize' }));
    await waitFor(() => expect(jobsApi.finalize).toHaveBeenCalledWith(7, expect.objectContaining({
      signature_complete: true, inventory_complete: true, payment_complete: true, payment_disposition: 'paid_in_full' })));
    expect(await screen.findByText('Pending Close')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});

describe('Opportunity status panel', () => {
  const setup = () => {
    estimateLifecycleApi.list.mockResolvedValue([{ id: 3, estimate_number: 'EST-1', lifecycle_state: 'draft',
      available_transitions: [{ to_state: 'ready', label: 'Ready' }, { to_state: 'cancelled', label: 'Cancelled' }], can_record_acceptance: true }]);
    plannedJobApi.list.mockResolvedValue([{ id: 21, title: 'Moving day', move_date: '2026-11-04', confirmation_state: 'requested' }]);
    jobsApi.list.mockResolvedValue({ count: 1, results: [job()] });
    estimateLifecycleApi.move.mockResolvedValue({});
    estimateLifecycleApi.recordAcceptance.mockResolvedValue({});
    plannedJobApi.confirmation.mockResolvedValue({});
  };

  it('shows estimate, planned job and operational job states; actions need opportunities.update', async () => {
    permissions = new Set(['opportunities.view', 'jobs.view']);
    setup();
    render(<MemoryRouter><SalesLifecyclePanel opportunityId={40} /></MemoryRouter>);
    const panel = await screen.findByRole('region', { name: 'Sales and job status' });
    expect(await within(panel).findByText('EST-1')).toBeInTheDocument();
    expect(within(panel).getByText('Draft')).toBeInTheDocument();
    expect(within(panel).getByText('Requested')).toBeInTheDocument();
    expect(await within(panel).findByRole('link', { name: 'Moving day' })).toHaveAttribute('href', '/jobs/7');
    expect(within(panel).queryByRole('button', { name: 'Mark Ready' })).not.toBeInTheDocument();
  });

  it('marks ready, records acceptance and confirms a planned job', async () => {
    permissions = new Set(['opportunities.view', 'opportunities.update']);
    setup();
    render(<MemoryRouter><SalesLifecyclePanel opportunityId={40} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark Ready' }));
    await waitFor(() => expect(estimateLifecycleApi.move).toHaveBeenCalledWith(3, 'ready'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(plannedJobApi.confirmation).toHaveBeenCalledWith(40, 21, 'confirm'));
    fireEvent.click(screen.getByRole('button', { name: 'Record acceptance' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Accepted by'), { target: { value: 'Pat Doe' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record acceptance' }));
    await waitFor(() => expect(estimateLifecycleApi.recordAcceptance).toHaveBeenCalledWith(3, { accepted_by_name: 'Pat Doe', accepted_by_email: '', note: '' }));
    expect(jobsApi.list).not.toHaveBeenCalled();   // no jobs.view
  });
});
