import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuditLogs from './AuditLogs';
import * as api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  getAuditLogs: vi.fn(),
}));

describe('AuditLogs Component Pagination', () => {
  const mockPaginatedResponse = {
    count: 75,
    page: 1,
    page_size: 25,
    total_pages: 3,
    results: [
      {
        id: 1,
        company_id: 1,
        action: 'CREATE',
        model_name: 'Lead',
        object_id: '101',
        user_email: 'john@example.com',
        user_details: { full_name: 'John Doe' },
        changes: { status: 'New' },
        created_at: '2026-10-10T08:00:00Z',
      },
      {
        id: 2,
        company_id: 1,
        action: 'UPDATE',
        model_name: 'Opportunity',
        object_id: '202',
        user_email: 'jane@example.com',
        user_details: { full_name: 'Jane Smith' },
        changes: { amount: 1500 },
        created_at: '2026-10-10T08:30:00Z',
      },
    ],
    stats: {
      total: 75,
      create: 30,
      update: 35,
      delete: 10,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stats and paginated audit logs from server response', async () => {
    api.getAuditLogs.mockResolvedValueOnce(mockPaginatedResponse);

    render(<AuditLogs />);

    // Await component and logs rendered
    await waitFor(() => {
      expect(screen.getByText('Activity Log')).toBeDefined();
      expect(screen.getByText(/John Doe/)).toBeDefined();
    });

    // Verify stats from backend
    expect(screen.getAllByText('75').length).toBeGreaterThanOrEqual(2); // Total entries & pagination footer
    expect(screen.getByText('30')).toBeDefined(); // Creates
    expect(screen.getByText('35')).toBeDefined(); // Updates
    expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(2); // Deletes & page size option

    // Verify pagination footer
    expect(screen.getByText(/Showing/)).toBeDefined();
    expect(screen.getByTitle('First Page')).toBeDefined();
    expect(screen.getByTitle('Next Page')).toBeDefined();
  });

  it('triggers new page request when page navigation button is clicked', async () => {
    api.getAuditLogs
      .mockResolvedValueOnce(mockPaginatedResponse)
      .mockResolvedValueOnce({
        ...mockPaginatedResponse,
        page: 2,
        results: [
          {
            id: 3,
            company_id: 1,
            action: 'DELETE',
            model_name: 'Contact',
            object_id: '303',
            user_email: 'admin@example.com',
            user_details: { full_name: 'Admin User' },
            changes: {},
            created_at: '2026-10-10T09:00:00Z',
          },
        ],
      });

    render(<AuditLogs />);

    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeDefined();
    });

    // Click Next Page button
    const nextBtn = screen.getByTitle('Next Page');
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(api.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, page_size: 25 })
      );
    });
  });

  it('resets page to 1 when changing page size or filters', async () => {
    api.getAuditLogs.mockResolvedValue(mockPaginatedResponse);

    render(<AuditLogs />);

    await waitFor(() => {
      expect(screen.getByText(/John Doe/)).toBeDefined();
    });

    // Change action filter
    const actionSelect = screen.getByDisplayValue('All actions');
    fireEvent.change(actionSelect, { target: { value: 'CREATE' } });

    await waitFor(() => {
      expect(api.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, action: 'CREATE' })
      );
    });
  });
});
