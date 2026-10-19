import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import StatusCodeSettings from './StatusCodeSettings';
import { createStatusCode, getStatusCodes } from '../../../services/api';

vi.mock('../../../shared/auth/useCan', () => ({ default: () => ({ canAll: () => true }) }));
vi.mock('../../../shared/context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../../services/api', () => ({
  getStatusCodes: vi.fn(), createStatusCode: vi.fn(), updateStatusCode: vi.fn(), deleteStatusCode: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  getStatusCodes.mockResolvedValue([]);
  createStatusCode.mockResolvedValue({ id: 3, code: 'quoted', label: 'Quoted', color_hex: '#112233', is_active: true });
});

it('creates an internal status with fields accepted by the tenant API', async () => {
  render(<StatusCodeSettings />);
  fireEvent.click(await screen.findByRole('button', { name: /Add Status/i }));
  fireEvent.change(screen.getByPlaceholderText('e.g., Quoted'), { target: { value: 'Quoted' } });
  fireEvent.change(screen.getAllByDisplayValue('#888780').at(-1), { target: { value: '#112233' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Status' }));

  await waitFor(() => expect(createStatusCode).toHaveBeenCalledWith({
    label: 'Quoted', code: 'quoted', color_hex: '#112233', is_default: false,
    sort_order: 0, is_active: true,
  }));
  expect(screen.getByText('Quoted')).toBeInTheDocument();
});
