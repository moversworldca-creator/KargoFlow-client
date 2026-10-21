import api from '../../../services/axios';

export async function hasSendingMailbox() {
  const response = await api.get('/tenant/communications/mailboxes/');
  const rows = Array.isArray(response) ? response : response?.results || [];
  return rows.some((mailbox) => mailbox.connection_state === 'connected' && mailbox.outbound_enabled !== false
    && mailbox.ownership_mode === 'personal');
}

export const getComposerTemplates = (params = {}) => api.get('/tenant/communications/templates/', { params });
export const getComposerTemplate = (id) => api.get(`/tenant/communications/templates/${id}/`);
