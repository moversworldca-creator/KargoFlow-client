import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import MemberPasswordPage from './MemberPasswordPage';
import { getEmployee, setEmployeeTemporaryPassword } from '../../../services/api';
vi.mock('../../../services/api', () => ({ getEmployee: vi.fn(), setEmployeeTemporaryPassword: vi.fn() }));
const setup = () => render(<MemoryRouter initialEntries={['/settings/team/members/2/password']}><Routes><Route path="/settings/team/members/:employeeId/password" element={<MemberPasswordPage />} /></Routes></MemoryRouter>);
const fill = async (confirm = 'Strong-password-27!') => {
  fireEvent.change(await screen.findByLabelText('Temporary password'), { target: { value: 'Strong-password-27!' } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: confirm } });
};
beforeEach(() => {
  vi.resetAllMocks();
  getEmployee.mockResolvedValue({ id: 2, first_name: 'Member', email: 'member@example.com', has_login: false, user_id: null, employment_status: 'active' });
});
it('creates a member login and clears password fields on success', async () => {
  setEmployeeTemporaryPassword.mockResolvedValue({ user_id: 9 });
  setup(); await fill();
  fireEvent.click(screen.getByRole('button', { name: 'Create login' }));
  expect(await screen.findByText(/Login created/)).toBeInTheDocument();
  expect(setEmployeeTemporaryPassword).toHaveBeenCalledWith('2', 'Strong-password-27!');
  expect(screen.queryByLabelText('Temporary password')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Return to members to attach a role' })).toHaveAttribute('href', '/settings/team/members');
});
it('validates password confirmation before sending', async () => {
  setup(); await fill('different');
  fireEvent.click(screen.getByRole('button', { name: 'Create login' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
  expect(setEmployeeTemporaryPassword).not.toHaveBeenCalled();
});
it('shows backend validation errors and allows retry', async () => {
  setEmployeeTemporaryPassword.mockRejectedValue({ response: { data: { detail: 'Password is too common.' } } });
  setup(); await fill(); fireEvent.click(screen.getByRole('button', { name: 'Create login' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Password is too common.');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create login' })).toBeEnabled());
});
it('prevents replacing an existing login password', async () => {
  getEmployee.mockResolvedValue({ id: 2, email: 'member@example.com', user_id: 9, has_login: true, employment_status: 'active' });
  setup(); expect(await screen.findByText('This member already has a login.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Create login' })).not.toBeInTheDocument();
});
it('shows tenant access failures without displaying the password form', async () => {
  getEmployee.mockRejectedValue({ response: { data: { detail: 'Employee not found' } } });
  setup(); expect(await screen.findByRole('alert')).toHaveTextContent('Employee not found');
  expect(screen.queryByLabelText('Temporary password')).not.toBeInTheDocument();
});
