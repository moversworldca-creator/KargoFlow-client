import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import AcceptInvitationPage from './AcceptInvitationPage';
import { acceptEmployeeInvitation } from '../../../services/api';
vi.mock('../../../services/api', () => ({ acceptEmployeeInvitation: vi.fn() }));
const setup = () => {
  render(<MemoryRouter initialEntries={['/accept-invitation#token=secret']}><AcceptInvitationPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Strong-password-27!' } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Strong-password-27!' } });
};
beforeEach(() => vi.resetAllMocks());
it('accepts the emailed token and links to login after setting a password', async () => {
  acceptEmployeeInvitation.mockResolvedValue({ email: 'member@example.com' });
  setup(); fireEvent.click(screen.getByRole('button', { name: 'Create login' }));
  expect(await screen.findByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login');
  expect(acceptEmployeeInvitation).toHaveBeenCalledWith({ token: 'secret', password: 'Strong-password-27!' });
  expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
});
it('rejects mismatched passwords locally', () => {
  setup(); fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create login' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
  expect(acceptEmployeeInvitation).not.toHaveBeenCalled();
});
it('displays backend password validation errors', async () => {
  acceptEmployeeInvitation.mockRejectedValue({ response: { data: { password: ['Password is too common.'] } } });
  setup(); fireEvent.click(screen.getByRole('button', { name: 'Create login' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Password is too common.');
});
it('explains recovery from expired or used invitations', async () => {
  acceptEmployeeInvitation.mockRejectedValue(new Error('invalid'));
  setup(); fireEvent.click(screen.getByRole('button', { name: 'Create login' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ask your administrator for a new invitation');
});
