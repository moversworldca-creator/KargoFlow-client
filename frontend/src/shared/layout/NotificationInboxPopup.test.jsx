import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationInboxPopup from './NotificationInboxPopup';
import { BrowserRouter } from 'react-router-dom';
import * as api from '../../services/api';
import { toast } from 'sonner';

vi.mock('../../services/api', () => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markNotificationUnread: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockIcon = () => <svg data-testid="mock-icon" />;

describe('NotificationInboxPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders and fetches notifications', async () => {
    api.getNotifications.mockResolvedValueOnce({
      results: [{ id: 1, title: 'Test Notif', category: 'email', read_at: null }]
    });

    render(
      <BrowserRouter>
        <NotificationInboxPopup
          id="test"
          label="Test Inbox"
          icon={mockIcon}
          categories={['email']}
          onClose={vi.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Inbox')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Test Notif')).toBeInTheDocument();
    });
  });

  it('handles mark all read error', async () => {
    api.getNotifications.mockResolvedValueOnce({
      results: [{ id: 2, title: 'Unread Notif', category: 'all', read_at: null }]
    });
    api.markAllNotificationsRead.mockRejectedValueOnce(new Error('API Error'));

    render(
      <BrowserRouter>
        <NotificationInboxPopup
          id="test"
          label="Test Inbox"
          icon={mockIcon}
          categories={['all']}
          onClose={vi.fn()}
        />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Unread Notif')).toBeInTheDocument();
    });

    const markAllBtn = screen.getByText('Mark all read');
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to mark all as read');
    });
  });

  it('renders mobile-responsive container classes and triggers onClose', async () => {
    const handleClose = vi.fn();
    api.getNotifications.mockResolvedValueOnce({
      results: []
    });

    const { container } = render(
      <BrowserRouter>
        <NotificationInboxPopup
          id="test-mobile"
          label="Mobile Inbox"
          icon={mockIcon}
          categories={['email']}
          onClose={handleClose}
        />
      </BrowserRouter>
    );

    const popupEl = container.firstChild;
    expect(popupEl.className).toContain('fixed inset-x-2');
    expect(popupEl.className).toContain('sm:absolute');
    expect(popupEl.className).toContain('max-w-[calc(100vw-1rem)]');

    await waitFor(() => {
      expect(screen.getByText(/No unread items in this inbox/i)).toBeInTheDocument();
    });

    const closeBtn = screen.getByTitle('Close');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

