import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MoverSizeSettings from './MoverSizeSettings';
import * as api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  getMoverSizes: vi.fn(),
  createMoverSize: vi.fn(),
  updateMoverSize: vi.fn(),
  deleteMoverSize: vi.fn(),
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, first_name: 'Test' } }),
}));

describe('MoverSizeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders toolbar with responsive styling and opens Add Size modal', async () => {
    api.getMoverSizes.mockResolvedValueOnce([
      { id: 1, name: '1 Bedroom', description: 'Small apartment', is_active: true }
    ]);

    render(<MoverSizeSettings />);

    await waitFor(() => {
      expect(screen.getByText('Mover Sizes')).toBeInTheDocument();
      expect(screen.getByText('1 Bedroom')).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /add size/i });
    expect(addBtn).toBeInTheDocument();
    expect(addBtn.className).toContain('shrink-0');
    expect(addBtn.className).toContain('whitespace-nowrap');

    const searchInput = screen.getByPlaceholderText('Search sizes...');
    expect(searchInput.className).toContain('w-full');
    expect(searchInput.className).toContain('sm:w-64');

    // Clicking Add Size should open modal
    fireEvent.click(addBtn);

    expect(screen.getByText('New Mover Size')).toBeInTheDocument();
    expect(screen.getByText('Size Name*')).toBeInTheDocument();
  });

  it('renders table inside overflow-x-auto container with responsive actions column', async () => {
    api.getMoverSizes.mockResolvedValueOnce([
      { id: 1, name: '1 Bedroom', description: 'Small apartment', is_active: true }
    ]);

    const { container } = render(<MoverSizeSettings />);

    await waitFor(() => {
      expect(screen.getByText('1 Bedroom')).toBeInTheDocument();
    });

    const scrollContainer = container.querySelector('.overflow-x-auto');
    expect(scrollContainer).toBeInTheDocument();

    const actionsHeader = screen.getByRole('columnheader', { name: /actions/i });
    expect(actionsHeader.className).toContain('px-3');
    expect(actionsHeader.className).toContain('sm:px-6');
  });

  it('allows creating a new move size with volume and weight', async () => {
    api.getMoverSizes.mockResolvedValueOnce([]);
    api.createMoverSize.mockResolvedValueOnce({
      id: 2,
      name: '2 Bedroom Apartment',
      description: 'Standard 2 bed',
      default_volume_cuft: 800,
      default_weight_lbs: 5600,
      is_active: true,
      branch_id: 1,
    });

    render(<MoverSizeSettings branchId={1} />);

    await waitFor(() => {
      expect(screen.getByText('No move sizes found.')).toBeInTheDocument();
    });

    // Open add modal
    const addBtn = screen.getByRole('button', { name: /add size/i });
    fireEvent.click(addBtn);

    // Fill form
    const nameInput = screen.getByPlaceholderText(/1 Bedroom Apartment/i);
    const volumeInput = screen.getByPlaceholderText(/450/i);
    const weightInput = screen.getByPlaceholderText(/3150/i);
    const descInput = screen.getByPlaceholderText(/Optional notes/i);

    fireEvent.change(nameInput, { target: { value: '2 Bedroom Apartment' } });
    fireEvent.change(volumeInput, { target: { value: '800' } });
    fireEvent.change(weightInput, { target: { value: '5600' } });
    fireEvent.change(descInput, { target: { value: 'Standard 2 bed' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /create size/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createMoverSize).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '2 Bedroom Apartment',
          default_volume_cuft: 800,
          default_weight_lbs: 5600,
          branch_id: 1,
          is_active: true,
        })
      );
      expect(screen.getByText('2 Bedroom Apartment')).toBeInTheDocument();
      expect(screen.getByText('800 cu ft')).toBeInTheDocument();
      expect(screen.getByText('5600 lbs')).toBeInTheDocument();
    });
  });

  it('fetches sizes scoped by branchId when prop is provided', async () => {
    api.getMoverSizes.mockResolvedValueOnce([]);

    render(<MoverSizeSettings branchId={5} />);

    await waitFor(() => {
      expect(api.getMoverSizes).toHaveBeenCalledWith({ branch_id: 5 });
    });
  });
});
