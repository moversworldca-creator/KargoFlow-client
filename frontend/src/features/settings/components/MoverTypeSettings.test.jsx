import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MoverTypeSettings from './MoverTypeSettings';
import * as api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  getMoverTypes: vi.fn(),
  createMoverType: vi.fn(),
  updateMoverType: vi.fn(),
  deleteMoverType: vi.fn(),
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, first_name: 'Test' } }),
}));

describe('MoverTypeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getMoverTypes.mockResolvedValue([]);
  });

  it('renders table inside overflow-x-auto container with responsive actions column', async () => {
    api.getMoverTypes.mockResolvedValueOnce([
      { id: 1, name: 'Local Move', description: 'Moves within city', is_active: true }
    ]);

    const { container } = render(<MoverTypeSettings />);

    await waitFor(() => {
      expect(screen.getByText('Local Move')).toBeInTheDocument();
    });

    const scrollContainer = container.querySelector('.overflow-x-auto');
    expect(scrollContainer).toBeInTheDocument();

    const actionsHeader = screen.getByRole('columnheader', { name: /actions/i });
    expect(actionsHeader.className).toContain('px-3');
    expect(actionsHeader.className).toContain('sm:px-6');
  });

  it('loads the company catalog despite a selected branch', async () => {
    render(<MoverTypeSettings branchId="12" />);

    await waitFor(() => expect(api.getMoverTypes).toHaveBeenCalledWith());
  });

  it('toggles status with a minimal patch and updates the row', async () => {
    api.getMoverTypes.mockResolvedValueOnce([
      { id: 4, company_id: 99, name: 'Local', description: '', is_active: true }
    ]);
    api.updateMoverType.mockResolvedValueOnce({ id: 4, name: 'Local', description: '', is_active: false });
    render(<MoverTypeSettings />);

    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate Local' }));

    await waitFor(() => expect(api.updateMoverType).toHaveBeenCalledWith(4, { is_active: false }));
    expect(await screen.findByRole('button', { name: 'Activate Local' })).toBeInTheDocument();
  });

  it('creates a company-wide move type and renders the API result', async () => {
    api.createMoverType.mockResolvedValueOnce({ id: 7, name: 'Interstate', description: 'Long haul', is_active: true, sort_order: 0 });
    render(<MoverTypeSettings branchId={12} />);

    await screen.findByText('No mover types found.');
    fireEvent.click(screen.getByRole('button', { name: /add type/i }));
    fireEvent.change(screen.getByLabelText('Type Name*'), { target: { value: 'Interstate' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Long haul' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Type' }));

    await waitFor(() => expect(api.createMoverType).toHaveBeenCalledWith({
      name: 'Interstate', description: 'Long haul', is_active: true, code: 'interstate',
    }));
    expect(await screen.findByText('Interstate')).toBeInTheDocument();
  });
});
