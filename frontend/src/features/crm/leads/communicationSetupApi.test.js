import { beforeEach, expect, it, vi } from 'vitest';
import api from '../../../services/axios';
import { hasSendingMailbox, getComposerTemplates, getComposerTemplate } from './communicationSetupApi';
vi.mock('../../../services/axios', () => ({ default: { get: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
it('uses the current mailbox endpoint and accepts a connected personal sender', async () => {
  api.get.mockResolvedValue([{ id:1, connection_state:'connected', ownership_mode:'personal', outbound_enabled:true }]);
  expect(await hasSendingMailbox()).toBe(true);
  expect(api.get).toHaveBeenCalledWith('/tenant/communications/mailboxes/');
});
it.each([
  [], [{ connection_state:'disconnected', ownership_mode:'personal' }],
  [{ connection_state:'connected', ownership_mode:'personal', outbound_enabled:false }],
  [{ connection_state:'connected', ownership_mode:'branch' }],
])('rejects unavailable senders: %j', async (...rows) => {
  api.get.mockResolvedValue(rows);
  expect(await hasSendingMailbox()).toBe(false);
});
it('uses current general template routes and branch filters', async () => {
  await getComposerTemplates({ branch_id:1, channel:'email' });
  await getComposerTemplate(7);
  expect(api.get).toHaveBeenNthCalledWith(1, '/tenant/communications/templates/', { params:{ branch_id:1, channel:'email' } });
  expect(api.get).toHaveBeenNthCalledWith(2, '/tenant/communications/templates/7/');
});
