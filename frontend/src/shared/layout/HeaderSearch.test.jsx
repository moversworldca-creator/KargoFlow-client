import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from './Header';
import { MemoryRouter } from 'react-router-dom';
import * as api from '../../services/api';

vi.mock('../../services/api', () => ({
  universalSearch: vi.fn(),
  getFollowUps: vi.fn().mockResolvedValue([]),
  getNotifications: vi.fn().mockResolvedValue({ results: [] }),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  markNotificationUnread: vi.fn(),
  getCompanies: vi.fn().mockResolvedValue({ results: [] }),
}));

vi.mock('../queries/sharedQueries', () => ({
  useUnreadNotificationsCount: vi.fn().mockReturnValue({ data: 0 }),
}));

vi.mock('../../features/auth/context/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
    selectedCompanyId: null,
    switchCompany: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Header Universal Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search trigger and opens modal on click', async () => {
    render(
      <MemoryRouter>
        <Header onLogout={vi.fn()} user={{ id: 1, first_name: 'John', last_name: 'Doe' }} />
      </MemoryRouter>
    );

    const trigger = screen.getByTitle('Search (⌘K)');
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText('Search customers, leads, jobs...')).toBeInTheDocument();
  });

  it('filters commands cleanly without overlapping or duplicate descriptions', async () => {
    render(
      <MemoryRouter>
        <Header onLogout={vi.fn()} user={{ id: 1, first_name: 'John', last_name: 'Doe' }} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle('Search (⌘K)'));
    const input = screen.getByPlaceholderText('Search customers, leads, jobs...');

    fireEvent.change(input, { target: { value: 'c' } });

    // Should find Dashboard command (CRM overview)
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('CRM overview')).toBeInTheDocument();
    expect(screen.getAllByText('FEATURE').length).toBeGreaterThan(0);

    // Verify open in new tab button is present
    const openNewTabBtn = screen.getByLabelText('Open Dashboard in new tab');
    expect(openNewTabBtn).toBeInTheDocument();
  });

  it('handles keyboard navigation with arrow keys and Enter', async () => {
    const mockNavigate = vi.fn();
    render(
      <MemoryRouter>
        <Header onLogout={vi.fn()} user={{ id: 1, first_name: 'John', last_name: 'Doe' }} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle('Search (⌘K)'));
    const input = screen.getByPlaceholderText('Search customers, leads, jobs...');

    fireEvent.change(input, { target: { value: 'Fleet' } });

    expect(await screen.findByText('Fleet')).toBeInTheDocument();

    // Press down arrow
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Press Enter to select
    fireEvent.keyDown(input, { key: 'Enter' });

    // Modal should close upon selection
    expect(screen.queryByPlaceholderText('Search customers, leads, jobs...')).not.toBeInTheDocument();
  });

  it('renders live search results with ID badge and meta details cleanly', async () => {
    api.universalSearch.mockResolvedValueOnce({
      results: [
        {
          id: 42,
          type: 'lead',
          title: 'Alice Wonder',
          sales_number: 10042,
          meta: '2 Bedroom · NY -> LA',
          branch_name: 'Manhattan',
          assigned_to: 'Sarah Rep',
        },
      ],
    });

    render(
      <MemoryRouter>
        <Header onLogout={vi.fn()} user={{ id: 1, first_name: 'John', last_name: 'Doe' }} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle('Search (⌘K)'));
    const input = screen.getByPlaceholderText('Search customers, leads, jobs...');

    fireEvent.change(input, { target: { value: 'Alice' } });

    expect(await screen.findByText('Alice Wonder')).toBeInTheDocument();
    expect(screen.getByText('#10042')).toBeInTheDocument();
    expect(screen.getByText('2 Bedroom · NY -> LA')).toBeInTheDocument();
    expect(screen.getByText('Manhattan · Sarah Rep')).toBeInTheDocument();
    expect(screen.getByLabelText('Open Alice Wonder in new tab')).toBeInTheDocument();
  });
});
