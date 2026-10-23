import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import MailboxOAuthCallback from './MailboxOAuthCallback';
import { completeMailboxOAuth } from '../../../services/api';
vi.mock('../../../services/api', () => ({ completeMailboxOAuth: vi.fn() }));
const setup = (query = '?code=auth-code&state=issued-state') => render(<MemoryRouter initialEntries={['/settings/communications/mailbox/callback' + query]}><MailboxOAuthCallback /></MemoryRouter>);
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); });
it('finishes the authenticated mailbox connection and clears pending state', async () => {
  sessionStorage.setItem('mailbox_oauth_pending', JSON.stringify({ provider:'gmail', state:'issued-state' }));
  completeMailboxOAuth.mockResolvedValue({ id:1 }); setup();
  expect(await screen.findByText(/Mailbox connected/)).toBeInTheDocument();
  expect(completeMailboxOAuth).toHaveBeenCalledWith({ provider:'gmail', code:'auth-code', state:'issued-state' });
  expect(sessionStorage.getItem('mailbox_oauth_pending')).toBeNull();
});
it('rejects mismatched callback state before exchanging the code', async () => {
  sessionStorage.setItem('mailbox_oauth_pending', JSON.stringify({ provider:'gmail', state:'other-state' })); setup();
  expect(await screen.findByRole('alert')).toHaveTextContent('Start again');
  expect(completeMailboxOAuth).not.toHaveBeenCalled();
});
it('explains authorization denial', async () => {
  sessionStorage.setItem('mailbox_oauth_pending', JSON.stringify({ provider:'gmail', state:'issued-state' }));
  setup('?error=access_denied');
  expect(await screen.findByRole('alert')).toHaveTextContent('Google denied mailbox access (access_denied)');
  expect(screen.getByRole('alert')).toHaveTextContent('Test users');
  expect(sessionStorage.getItem('mailbox_oauth_pending')).toBeNull();
  expect(completeMailboxOAuth).not.toHaveBeenCalled();
});
it('explains Google Workspace admin policy denial', async () => {
  setup('?error=admin_policy_enforced');
  expect(await screen.findByRole('alert')).toHaveTextContent('administrator blocked mailbox access');
  expect(completeMailboxOAuth).not.toHaveBeenCalled();
});
