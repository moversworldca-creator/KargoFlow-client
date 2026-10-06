import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
});
