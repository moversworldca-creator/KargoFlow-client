import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';
import {
  getBranches,
  getDashboardSummary,
  getJobs,
  getLeads,
  getOpportunities,
} from '../../../services/api';

vi.mock('../../../services/api', () => ({
  getBranches: vi.fn(),
  getDashboardSummary: vi.fn(),
  getJobs: vi.fn(),
  getLeads: vi.fn(),
  getOpportunities: vi.fn(),
}));

const mockUser = {
  id: 1,
  branches: [{ id: 5 }],
  is_superuser: false,
  is_system_admin: false,
};

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

const baseStats = {
  today: {
    revenue: 4250,
    revenueDelta: 12.5,
    activeJobs: 3,
    booked: 3,
    canceled: 0,
    yesterdayRevenue: 3800,
  },
  conversion: {
    rate: 40,
    delta: 5,
    quotes: 10,
    booked: 4,
  },
  month: {
    moves: 22,
    value: 52000,
    delta: 8,
    target: 200,
  },
  alerts: {
    stagnant: 0,
    pipelineRisk: 0,
    oldest: '0 days',
    qualifiedCount: 0,
    estimateCount: 0,
  },
  revenueHistory: {
    days: Array.from({ length: 14 }, (_, index) => ({
      d: `D${index + 1}`,
      v: index === 13 ? 4250 : 1000 + index * 100,
      jobs: index === 13 ? 3 : 1,
      today: index === 13,
    })),
    weeks: [
      { d: 'W1', full: 'Week 1 (1-7)', v: 7000, jobs: 5, today: false },
      { d: 'W2', full: 'Week 2 (8-14)', v: 9000, jobs: 7, today: false },
      { d: 'W3', full: 'Week 3 (15-21)', v: 12000, jobs: 8, today: true },
      { d: 'W4', full: 'Week 4 (22-28)', v: 0, jobs: 0, today: false },
    ],
    months: [
      { d: 'Jan', full: 'January 2026', v: 41000, jobs: 14, today: false },
      { d: 'Feb', full: 'February 2026', v: 52000, jobs: 22, today: true },
    ],
    years: [
      { d: '2025', full: 'Year 2025', v: 500000, jobs: 180, today: false },
      { d: '2026', full: 'Year 2026', v: 620000, jobs: 210, today: true },
    ],
  },
  reps: [
    { id: 7, name: 'Asha Kumar', initials: 'AK', revenue: 16000, deals: 4, delta: 8.4 },
  ],
  activity: {
    headers: ['Today', 'Week', 'Month'],
    rows: [
      { label: 'Leads', icon: 'user-plus', today: 2, week: 8, month: 18 },
      { label: 'Quotes', icon: 'file-text', today: 1, week: 4, month: 10 },
      { label: 'Booked', icon: 'calendar-check-2', today: 1, week: 3, month: 4 },
      { label: 'Canceled', icon: 'x-circle', today: 0, week: 1, month: 2 },
    ],
  },
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDashboardSummary).mockResolvedValue({
      data: {
        branches: [{ id: 5, name: 'Main Branch' }],
        stats: baseStats,
      },
    });
  });

  it('loads dashboard metrics from the summary endpoint instead of bulk CRM lists', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText('$4,250')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('Asha Kumar')).toBeInTheDocument();
    expect(screen.getByText('Pipeline healthy')).toBeInTheDocument();

    expect(getDashboardSummary).toHaveBeenCalledWith({ branch: '5' });
    expect(getBranches).not.toHaveBeenCalled();
    expect(getOpportunities).not.toHaveBeenCalled();
    expect(getLeads).not.toHaveBeenCalled();
    expect(getJobs).not.toHaveBeenCalled();
  });

  it('refreshes the summary when a branch is selected', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await screen.findByText('$4,250');
    fireEvent.change(screen.getByLabelText(/branch/i), { target: { value: '5' } });

    await waitFor(() => {
      expect(getDashboardSummary).toHaveBeenLastCalledWith({ branch: '5' });
    });
  });

  it('uses backend revenue history buckets when changing chart modes', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText('$28,000')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /months/i }));
    expect(await screen.findByText('$93,000')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /years/i }));
    expect(await screen.findByText('$1,120,000')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /days/i }));
    expect(await screen.findByText('Daily Revenue This Week')).toBeInTheDocument();
  });

  it('opens and closes the reps performance modal when clicking View all', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await screen.findByText('Asha Kumar');
    fireEvent.click(screen.getByRole('button', { name: /view all/i }));
    expect(await screen.findByText('Sales Representatives')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search representative/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open leads pipeline/i }));
  });
});

