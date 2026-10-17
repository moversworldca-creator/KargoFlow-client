import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import TeamManagement from './TeamManagement';
import * as api from '../../../services/api';
vi.mock('../../../services/api', () => ({
  getUsers: vi.fn(), getEmployees: vi.fn(), getRoles: vi.fn(), getBranches: vi.fn(),
  getEmployeeInvitations: vi.fn(), inviteEmployee: vi.fn(), createEmployee: vi.fn(),
  updateEmployee: vi.fn(), assignUserRole: vi.fn(), deactivateUser: vi.fn(), reactivateUser: vi.fn(),
}));
vi.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
vi.mock('../../../shared/auth/useCan', () => ({ default: () => ({ canAll: () => true }) }));
vi.mock('../../../shared/context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
beforeEach(() => {
  vi.resetAllMocks();
  api.getUsers.mockResolvedValue([]);
  api.getEmployees.mockResolvedValue({ results: [{ id: 91, user_id: null, first_name: 'New', email: 'member@example.com', employment_status: 'active' }] });
  api.getRoles.mockResolvedValue([]); api.getBranches.mockResolvedValue([]);
  api.getEmployeeInvitations.mockResolvedValue([]);
});
it('invites an employee and offers resend without exposing login actions', async () => {
  api.inviteEmployee.mockResolvedValue({ id: 8, employee_id: 91, status: 'pending' });
  render(<MemoryRouter><TeamManagement /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Invite to log in' }));
  await waitFor(() => expect(api.inviteEmployee).toHaveBeenCalledWith(91, { email: 'member@example.com' }));
  expect(await screen.findByRole('button', { name: 'Resend invitation' })).toBeEnabled();
  expect(screen.getByRole('link', { name: 'Set temporary password' })).toHaveAttribute('href', '/settings/team/members/91/password');
  expect(screen.queryByTitle('Activate')).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
it('shows invitation failures and allows retry', async () => {
  api.inviteEmployee.mockRejectedValue({ response: { data: { detail: 'Invitation failed.' } } });
  render(<MemoryRouter><TeamManagement /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Invite to log in' }));
  expect(await screen.findByText('Invitation failed.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Invite to log in' })).toBeEnabled();
});
