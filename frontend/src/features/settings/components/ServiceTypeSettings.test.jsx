import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    api.getServiceTypes.mockResolvedValue([]);
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

  it('loads the company catalog despite a selected branch', async () => {
    render(<ServiceTypeSettings branchId="12" />);

    await waitFor(() => expect(api.getServiceTypes).toHaveBeenCalledWith());
  });

  it('toggles status with a minimal patch and updates the row', async () => {
    api.getServiceTypes.mockResolvedValueOnce([
      { id: 5, company_id: 99, name: 'Packing', description: '', is_active: true }
    ]);
    api.updateServiceType.mockResolvedValueOnce({ id: 5, name: 'Packing', description: '', is_active: false });
    render(<ServiceTypeSettings />);

    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate Packing' }));

    await waitFor(() => expect(api.updateServiceType).toHaveBeenCalledWith(5, { is_active: false }));
    expect(await screen.findByRole('button', { name: 'Activate Packing' })).toBeInTheDocument();
  });

  it('creates a company-wide service type and renders the API result', async () => {
    api.createServiceType.mockResolvedValueOnce({ id: 8, name: 'Storage', description: 'Warehouse', is_active: true, sort_order: 0 });
    render(<ServiceTypeSettings branchId={12} />);

    await screen.findByText('No service types found.');
    fireEvent.click(screen.getByRole('button', { name: /add type/i }));
    fireEvent.change(screen.getByLabelText('Type Name*'), { target: { value: 'Storage' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Warehouse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Type' }));

    await waitFor(() => expect(api.createServiceType).toHaveBeenCalledWith({
      name: 'Storage', description: 'Warehouse', is_active: true, code: 'storage',
    }));
    expect(await screen.findByText('Storage')).toBeInTheDocument();
  });
});
