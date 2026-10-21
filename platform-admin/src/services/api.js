import api from '../api/platformAxios';
import { toBackendDocument } from '../features/settings/components/UnifiedTemplateBuilder/core/documentAdapter';

const BASE = '/core/builder';
const templates = `${BASE}/templates/`;
const templatePath = (id, action = '') => `${templates}${id}/${action ? `${action}/` : ''}`;

export const getApiErrorMessage = (error, fallback = 'The request failed.') => {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) return data.errors.map((item) => item.message).join(' ');
  return data?.detail || data?.message || (data && typeof data === 'object'
    ? Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' ')
    : error?.message) || fallback;
};

// Platform catalog only. Tenant support uses the separate tenant API client.
export const getBuilderMeta = (kind = '') => api.get(`${BASE}/meta/`, {
  params: typeof kind === 'string' ? { kind } : kind,
});
export const getBuilderVariables = (kind = 'document') => api.get(`${BASE}/variables/`, {
  params: typeof kind === 'string' ? { kind } : kind,
});
export const getBuilderTemplates = (params = {}, config = {}) => api.get(templates, { ...config, params });
export const getBuilderTemplate = (id) => api.get(templatePath(id));
export const createBuilderTemplate = (data) => api.post(templates, data);
export const updateBuilderTemplate = (id, data) => api.patch(templatePath(id), data);
export const archiveBuilderTemplate = (id) => api.delete(templatePath(id));
export const activateBuilderTemplate = (id) => api.post(templatePath(id, 'activate'));
export const deactivateBuilderTemplate = (id) => api.post(templatePath(id, 'deactivate'));
export const duplicateBuilderTemplate = (id, data = {}) => api.post(templatePath(id, 'duplicate'), data);
export const getBuilderTemplateDraft = (id) => api.get(templatePath(id, 'draft'));
export const startBuilderTemplateDraft = (id) => api.post(templatePath(id, 'draft'));
export const saveBuilderTemplateDraft = (id, data) => api.put(templatePath(id, 'draft'), data);
export const discardBuilderTemplateDraft = (id) => api.delete(templatePath(id, 'draft'));
export const validateBuilderTemplateDraft = (id) => api.post(templatePath(id, 'draft/validate'));
export const publishBuilderTemplateDraft = (id) => api.post(templatePath(id, 'draft/publish'));
export const getBuilderTemplateRevisions = (id) => api.get(templatePath(id, 'revisions'));
export const getBuilderTemplateRevision = (id, revisionId) => api.get(templatePath(id, `revisions/${revisionId}`));
export const restoreBuilderTemplateRevision = (id, revisionId) => api.post(templatePath(id, `revisions/${revisionId}/restore`));
export const compareBuilderTemplateRevisions = (id, from, to) => api.get(templatePath(id, 'compare'), { params: { from, to } });
export const previewBuilderTemplate = async (id, data = {}, config = {}) => {
  try {
    return await api.post(templatePath(id, 'preview'), { ...data, source: { type: 'sample' } },
      { ...config, ...(data.format === 'pdf' ? { responseType: 'blob' } : {}) });
  } catch (error) {
    // PDF requests also receive JSON validation errors through the blob transport.
    const body = error?.response?.data;
    if (body instanceof Blob && typeof body.text === 'function') {
      try { error.response.data = JSON.parse(await body.text()); } catch { /* Preserve non-JSON errors. */ }
    }
    throw error;
  }
};
export const getGlobalTemplateCategories = () => api.get(`${templates}categories/`);
export const getGlobalTemplatePacks = () => api.get(`${templates}packs/`);

// Compatibility for existing creation dialogs; every write uses the catalog.
export const toBackendTemplateDocument = (data, mode) => data.document || toBackendDocument(data.content || data, mode);
export const createDocumentTemplate = (data) => {
  const kind = data.kind || (data.template_type === 'invoice' ? 'invoice' : 'document');
  const subtype = kind === 'invoice' ? (['final', 'deposit', 'storage', 'progress'].includes(data.subtype) ? data.subtype : 'final')
    : (['cc_auth', 'credit_card_authorization'].includes(data.template_type) ? 'cc_authorization' : data.subtype || data.template_type || 'contract');
  return createBuilderTemplate({ kind, subtype, name: data.name, description: data.description || '',
    ...(data.document || data.content ? { document: toBackendTemplateDocument(data, subtype) } : {}) });
};
export const createEstimatePortalTemplate = (data) => createBuilderTemplate({
  kind: 'estimate_portal', subtype: data.subtype || 'binding', name: data.name,
  ...(data.document ? { document: data.document } : {}),
});
export const createCommunicationTemplate = (data) => createBuilderTemplate({
  kind: 'communication', subtype: data.channel || 'email', name: data.name,
  document: { subject: data.subject || '', body_html: data.body_html || '', body_text: data.body_text ?? data.body_sms ?? data.body ?? '' },
});

export default api;
