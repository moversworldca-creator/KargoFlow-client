import { expect, it, vi } from 'vitest';
import api from './axios';
import { getSendGridConfig, getResendConfig, getSMTPConfig, testSendGridEmail, testResendEmail, testSMTPEmail } from './api';
vi.mock('./axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
it.each([
  ['sendgrid', getSendGridConfig, testSendGridEmail],
  ['resend', getResendConfig, testResendEmail],
  ['smtp', getSMTPConfig, testSMTPEmail],
])('uses tenant isolation routes for %s email tests', async (provider, getConfig, testEmail) => {
  await getConfig({ branch: 3 });
  await testEmail(8, 'test@example.com');
  expect(api.get).toHaveBeenCalledWith(`/tenant/integrations/${provider}-configs/`, { params: { branch: 3 } });
  expect(api.post).toHaveBeenCalledWith(`/tenant/integrations/${provider}-configs/8/test-send-email/`, { test_email: 'test@example.com' });
});
