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
});
