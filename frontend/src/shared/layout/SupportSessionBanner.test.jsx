import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SupportSessionBanner from './SupportSessionBanner';

const mockLogout = vi.fn();
let mockAuthValue = {
  user: null,
  supportConsoleContext: null,
  logout: mockLogout,
};

vi.mock('../../features/auth/context/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SupportSessionBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when not in a platform support session', () => {
    mockAuthValue = {
      user: { id: 1, identity_type: 'tenant' },
      supportConsoleContext: null,
      logout: mockLogout,
    };
    const { container } = render(<SupportSessionBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders support session banner with tenant name and access mode', () => {
    mockAuthValue = {
      user: {
        id: 99,
        identity_type: 'platform_support',
        company: { name: 'Acme Movers' },
        access_mode: 'support_write',
      },
      supportConsoleContext: {
        tenantName: 'Acme Movers',
        accessMode: 'support_write',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
      logout: mockLogout,
    };

    render(<SupportSessionBanner />);
    expect(screen.getByTestId('platform-support-banner')).toBeInTheDocument();
    expect(screen.getByText('Controlled Support Session Active')).toBeInTheDocument();
    expect(screen.getByText('Acme Movers')).toBeInTheDocument();
    expect(screen.getByText('Support Write (Modify)')).toBeInTheDocument();
    expect(screen.getByText('Exit Session')).toBeInTheDocument();
  });

  it('calls logout when Exit Session is clicked', () => {
    mockAuthValue = {
      user: {
        id: 99,
        identity_type: 'platform_support',
        company: { name: 'Acme Movers' },
      },
      supportConsoleContext: {
        tenantName: 'Acme Movers',
        accessMode: 'read',
      },
      logout: mockLogout,
    };

    render(<SupportSessionBanner />);
    const exitBtn = screen.getByText('Exit Session');
    fireEvent.click(exitBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
