import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ServiceTypeSettings from './ServiceTypeSettings';
import * as api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  getServiceTypes: vi.fn(),
  createServiceType: vi.fn(),
  updateServiceType: vi.fn(),
  deleteServiceType: vi.fn(),
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, first_name: 'Test' } }),
}));

describe('ServiceTypeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table inside overflow-x-auto container with responsive actions column', async () => {
    api.getServiceTypes.mockResolvedValueOnce([
      { id: 1, name: 'Packing & Loading', description: 'Full packing service', is_active: true }
    ]);

    const { container } = render(<ServiceTypeSettings />);

    await waitFor(() => {
      expect(screen.getByText('Packing & Loading')).toBeInTheDocument();
    });

    const scrollContainer = container.querySelector('.overflow-x-auto');
    expect(scrollContainer).toBeInTheDocument();

    const actionsHeader = screen.getByRole('columnheader', { name: /actions/i });
    expect(actionsHeader.className).toContain('px-3');
    expect(actionsHeader.className).toContain('sm:px-6');
  });
});
