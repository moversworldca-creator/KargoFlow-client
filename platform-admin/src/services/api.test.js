import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import client from '../api/platformAxios';
import * as api from './api';

let requests;
const originalAdapter = client.defaults.adapter;
beforeEach(() => {
  requests = [];
  client.defaults.adapter = async (config) => {
    requests.push(config);
    return { status: 200, config, data: {}, headers: {} };
  };
});
afterEach(() => { client.defaults.adapter = originalAdapter; });

describe('Global catalog integration', () => {
  it('routes CRUD, draft, revision, preview and metadata calls only to the platform catalog', async () => {
    await api.getBuilderMeta('invoice');
    await api.getBuilderVariables('communication');
    await api.getBuilderTemplates({ kind: 'estimate_portal', limit: 50 });
    await api.getBuilderTemplate(7);
    await api.createBuilderTemplate({ kind: 'communication', subtype: 'sms', name: 'Reminder' });
    await api.updateBuilderTemplate(7, { name: 'Updated' });
    await api.archiveBuilderTemplate(7);
    await api.activateBuilderTemplate(7);
    await api.deactivateBuilderTemplate(7);
    await api.duplicateBuilderTemplate(7);
    await api.startBuilderTemplateDraft(7);
    await api.getBuilderTemplateDraft(7);
    await api.saveBuilderTemplateDraft(7, { lock_version: 3, document: { body_text: 'Hello' } });
    await api.discardBuilderTemplateDraft(7);
    await api.validateBuilderTemplateDraft(7);
    await api.publishBuilderTemplateDraft(7);
    await api.getBuilderTemplateRevisions(7);
    await api.getBuilderTemplateRevision(7, 2);
    await api.restoreBuilderTemplateRevision(7, 2);
    await api.compareBuilderTemplateRevisions(7, 'published', 'draft');
    await api.previewBuilderTemplate(7, { format: 'pdf', source: { type: 'opportunity', id: 99 } });
    expect(requests).toHaveLength(21);
    expect(requests.every((request) => request.url.startsWith('/core/builder/'))).toBe(true);
    expect(requests.find((request) => request.method === 'put').data).toBe(JSON.stringify({ lock_version: 3, document: { body_text: 'Hello' } }));
    const preview = requests.at(-1);
    expect(JSON.parse(preview.data).source).toEqual({ type: 'sample' });
    expect(preview.responseType).toBe('blob');
  });

  it('sends no bearer token, names the platform cookie and strips tenant headers', async () => {
    localStorage.setItem('platform_access_token', 'legacy-platform-token');
    localStorage.setItem('tenant_access_token', 'tenant-token');
    localStorage.setItem('platform_builder_tenant_id', '99');
    await client.get('/core/builder/templates/', { headers: { 'X-Tenant-Company-Id': '99', 'X-Platform-User-Id': '1', Authorization: 'Bearer forged' } });
    expect(requests[0].withCredentials).toBe(true);
    expect(requests[0].headers.has('Authorization')).toBe(false);
    expect(requests[0].headers.get('X-KF-Client')).toBe('platform');
    expect(requests[0].headers.has('X-Tenant-Company-Id')).toBe(false);
    expect(requests[0].headers.has('X-Platform-User-Id')).toBe(false);
    await expect(client.get('/tenant/builder/templates/')).rejects.toThrow('Tenant requests must use');
    expect(requests).toHaveLength(1);
  });

  it('sends the CSRF token on writes only', async () => {
    document.cookie = 'csrftoken=csrf-value; path=/';
    await client.get('/core/builder/templates/');
    await client.post('/core/builder/templates/', {});
    document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    expect(requests[0].headers.has('X-CSRFToken')).toBe(false);
    expect(requests[1].headers.get('X-CSRFToken')).toBe('csrf-value');
  });

  it('signals session expiry on 401 except for quiet session probes', async () => {
    const listener = vi.fn();
    window.addEventListener('platform:session_expired', listener);
    client.defaults.adapter = (config) => Promise.reject({ response: { status: 401, data: {} }, config });
    await expect(client.get('/auth/me/', { skipSessionExpiry: true })).rejects.toBeDefined();
    expect(listener).not.toHaveBeenCalled();
    await expect(client.get('/core/dashboard/')).rejects.toBeDefined();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('platform:session_expired', listener);
  });

  it('propagates permission and network errors instead of inventing empty successful results', async () => {
    const error = { response: { status: 403, data: { detail: 'Access denied.' } }, config: { url: '/core/builder/templates/' } };
    const listener = vi.fn();
    window.addEventListener('platform:session_expired', listener);
    client.defaults.adapter = vi.fn().mockRejectedValue(error);
    await expect(api.getBuilderTemplates()).rejects.toBe(error);
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('platform:session_expired', listener);
  });
});
