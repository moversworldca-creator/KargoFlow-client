import axios from 'axios';
import platformAxios from '../api/platformAxios';
import tenantSessionManager from './tenantSessionManager';
import { toBackendDocument } from '../features/settings/components/UnifiedTemplateBuilder/core/documentAdapter';

const api = platformAxios;

export const toBackendTemplateDocument = (data, mode) => {
  if (data?.document?.sections) return data.document;

  const content = data?.content && typeof data.content === "object" && !Array.isArray(data.content)
    ? { ...data.content }
    : {
        docSettings: {
          format: "Letter",
          margin: "40px",
          orientation: "portrait",
        },
        blocks: [],
      };

  const blocks = Array.isArray(content.blocks)
    ? content.blocks
    : (Array.isArray(data.blocks) ? data.blocks : []);

  const normalizedBlocks = blocks.map((block, index) => {
    if (block?.props) return block;
    return {
      id: block?.id || `block_${index + 1}`,
      type: block?.type || "html",
      props: {
        content: block?.html || block?.content || "",
      },
      page_index: block?.page_index || 0,
      render_conditions: block?.render_conditions || null,
    };
  });

  const htmlContent = data?.html_content || content?.html_content || data?.body_html || content?.body_html ||
    (typeof data?.content === "string" ? data.content : "");

  return toBackendDocument(
    {
      ...content,
      name: content?.name || data?.name,
      html_content: htmlContent,
      blocks: normalizedBlocks,
    },
    mode || data?.subtype || "contract"
  );
};

// ============================================================================
// Builder Core APIs
// ============================================================================
export const getBuilderVariables = (params = {}) =>
  api.get("/tenant/builder/variables/", { params });

export const getBuilderCustomVariables = (params = {}) =>
  api.get("/tenant/builder/variables/custom/", { params });

export const getBuilderCustomVariable = (id) =>
  api.get(`/tenant/builder/variables/${id}/`);

export const createBuilderCustomVariable = (data) =>
  api.post("/tenant/builder/variables/", data);

export const updateBuilderCustomVariable = (id, data) =>
  api.patch(`/tenant/builder/variables/${id}/`, data);

export const deleteBuilderCustomVariable = (id) =>
  api.delete(`/tenant/builder/variables/${id}/`);

export const getBuilderTemplates = (params = {}) =>
  api.get("/tenant/builder/templates/", { params });

export const getBuilderTemplate = (id) =>
  api.get(`/tenant/builder/templates/${id}/`);

export const createBuilderTemplate = (data) =>
  api.post("/tenant/builder/templates/", data);

export const updateBuilderTemplate = (id, data) =>
  api.patch(`/tenant/builder/templates/${id}/`, data);

export const archiveBuilderTemplate = (id) =>
  api.delete(`/tenant/builder/templates/${id}/`);

export const activateBuilderTemplate = (id) =>
  api.post(`/tenant/builder/templates/${id}/activate/`);

export const deactivateBuilderTemplate = (id) =>
  api.post(`/tenant/builder/templates/${id}/deactivate/`);

export const duplicateBuilderTemplate = (id, data = {}) =>
  api.post(`/tenant/builder/templates/${id}/duplicate/`, data);

export const getBuilderTemplateDraft = (id) =>
  api.get(`/tenant/builder/templates/${id}/draft/`);

export const startBuilderTemplateDraft = (id) =>
  api.post(`/tenant/builder/templates/${id}/draft/`);

export const saveBuilderTemplateDraft = (id, data) =>
  api.put(`/tenant/builder/templates/${id}/draft/`, data);

export const discardBuilderTemplateDraft = (id) =>
  api.delete(`/tenant/builder/templates/${id}/draft/`);

export const validateBuilderTemplateDraft = (id) =>
  api.post(`/tenant/builder/templates/${id}/draft/validate/`);

export const submitBuilderTemplateDraft = (id, data = {}) =>
  api.post(`/tenant/builder/templates/${id}/draft/submit/`, data);

export const withdrawBuilderTemplateDraft = (id) =>
  api.post(`/tenant/builder/templates/${id}/draft/withdraw/`);

export const publishBuilderTemplateDraft = (id) =>
  api.post(`/tenant/builder/templates/${id}/draft/publish/`);

export const getBuilderTemplateRevisions = (id) =>
  api.get(`/tenant/builder/templates/${id}/revisions/`);

export const getBuilderTemplateRevision = (id, revisionId) =>
  api.get(`/tenant/builder/templates/${id}/revisions/${revisionId}/`);

export const restoreBuilderTemplateRevision = (id, revisionId) =>
  api.post(`/tenant/builder/templates/${id}/revisions/${revisionId}/restore/`);

export const compareBuilderTemplateRevisions = (id, fromRev, toRev) =>
  api.get(`/tenant/builder/templates/${id}/compare/`, { params: { from: fromRev, to: toRev } });

export const previewBuilderTemplate = (id, data = {}, config = {}) => {
  const requestConfig = { ...config };
  if (data?.format === "pdf" && !requestConfig.responseType) {
    requestConfig.responseType = "blob";
  }
  return api.post(`/tenant/builder/templates/${id}/preview/`, data, requestConfig);
};

export const getBuilderBlocks = (params = {}) =>
  api.get("/tenant/builder/blocks/", { params });

export const getBuilderBlock = (id) =>
  api.get(`/tenant/builder/blocks/${id}/`);

export const createBuilderBlock = (data) =>
  api.post("/tenant/builder/blocks/", data);

export const updateBuilderBlock = (id, data) =>
  api.patch(`/tenant/builder/blocks/${id}/`, data);

export const archiveBuilderBlock = (id) =>
  api.delete(`/tenant/builder/blocks/${id}/`);

export const activateBuilderBlock = (id) =>
  api.post(`/tenant/builder/blocks/${id}/activate/`);

export const publishBuilderBlock = (id) =>
  api.post(`/tenant/builder/blocks/${id}/publish/`);

export const saveBuilderBlockDraft = (id, data) =>
  api.put(`/tenant/builder/blocks/${id}/draft/`, data);

export const discardBuilderBlockDraft = (id) =>
  api.delete(`/tenant/builder/blocks/${id}/draft/`);

export const getBuilderMeta = (params = {}) =>
  api.get("/tenant/builder/meta/", { params });

export const getBuilderSettings = () =>
  api.get("/tenant/builder/settings/");

export const updateBuilderSettings = (data) =>
  api.put("/tenant/builder/settings/current/", data);

export const getBranches = () => api.get("/tenant/branches/");
export const downloadFile = (id) => api.get(`/files/${id}/download/`, { responseType: "blob" });

// ============================================================================
// Document Templates CRUD & Adapter (Matching Frontend Services)
// ============================================================================
export const getDocumentTemplates = async (params = {}) => {
  try {
    const builderParams = {
      ...(params?.kind ? { kind: params.kind } : {}),
      ...(params?.branch ? { branch_id: params.branch } : {}),
      ...(params?.branch_id ? { branch_id: params.branch_id } : {}),
      ...(params?.q ? { q: params.q } : {}),
      ...(params?.subtype ? { subtype: params.subtype } : {}),
    };
    const res = await api.get("/tenant/builder/templates/", { params: builderParams });
    const payload = res?.data ?? res;
    let items = Array.isArray(payload) ? payload : (Array.isArray(payload?.results) ? payload.results : []);
    if (!params?.kind) {
      items = items.filter((t) => t.kind === "document" || t.kind === "invoice");
    }
    const normalized = items.map((t) => ({
      ...t,
      template_type: t.kind === "invoice"
        ? "invoice"
        : (t.subtype === "cc_authorization" ? "credit_card_authorization" : (t.subtype || t.template_type)),
      scope_type: t.kind === "invoice" ? "invoice" : (t.subtype === "bol" ? "job" : "opportunity"),
      branch: t.branch_id,
      is_active: t.state === "active" || t.is_active,
    }));
    return { ...res, data: normalized };
  } catch (err) {
    if (err?.response?.status === 404) {
      return api.get("/documents/templates/", { params });
    }
    throw err;
  }
};

export const createDocumentTemplate = async (data) => {
  const kind = data.kind ||
    (data.scope_type === "invoice" || data.template_type === "invoice" ? "invoice" : "document");
  const requestedSubtype = data.subtype || data.template_type || "contract";
  const invoiceSubtypes = ["final", "deposit", "storage", "progress"];
  const subtype = kind === "invoice"
    ? (invoiceSubtypes.includes(requestedSubtype) ? requestedSubtype : "final")
    : (["credit_card_authorization", "cc_auth"].includes(requestedSubtype)
        ? "cc_authorization"
        : requestedSubtype);
  const builderData = {
    kind,
    subtype,
    name: data.name,
    description: data.description || "",
    branch_id: data.branch_id ?? (data.branch ? Number(data.branch) : null),
  };
  if (data.document || data.content || data.html_content) {
    builderData.document = toBackendTemplateDocument(data, kind === "invoice" ? "invoice" : subtype);
  }

  try {
    const tenantId = tenantSessionManager.getActiveTenantId();
    if (!tenantId) {
      throw new Error('Select a tenant before creating a document.');
    }

    const tenantToken = await tenantSessionManager.ensureTenantSession(tenantId);
    if (!tenantToken) {
      throw new Error('Unable to start a tenant session. Verify that you have an active support session for the selected tenant, then try again.');
    }

    const platformToken = localStorage.getItem('platform_access_token');
    const res = await platformAxios.post("/tenant/builder/templates/", builderData, {
      headers: {
        Authorization: `Bearer ${tenantToken}`,
        'X-Tenant-Company-Id': String(tenantId),
        ...(platformToken ? { 'X-Platform-Token': platformToken } : {}),
      },
    });
    const created = res?.data ?? res;
    const normalized = {
      ...created,
      template_type: created.kind === "invoice"
        ? "invoice"
        : (created.subtype === "cc_authorization" ? "credit_card_authorization" : (created.subtype || data.template_type)),
      scope_type: created.kind === "invoice" ? "invoice" : (data.scope_type || (created.subtype === "bol" ? "job" : "opportunity")),
      branch: created.branch_id,
      html_content: data.html_content,
      content: data.content,
      lock_version: created.draft_revision?.lock_version,
    };
    return { ...res, data: normalized };
  } catch (err) {
    if (err?.response?.status === 404) {
      return api.post("/documents/templates/", data);
    }
    throw err;
  }
};

export const updateDocumentTemplate = async (id, data) => {
  try {
    const rawSubtype = data.subtype || data.template_type;
    const kind = data.scope_type === "invoice" || rawSubtype === "invoice" ? "invoice" : "document";
    const invoiceSubtypes = ["final", "deposit", "storage", "progress"];
    const subtype = kind === "invoice"
      ? (invoiceSubtypes.includes(rawSubtype) ? rawSubtype : "final")
      : (["credit_card_authorization", "cc_auth"].includes(rawSubtype) ? "cc_authorization" : rawSubtype);
    const updateData = {
      ...(data.name ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(subtype ? { subtype } : {}),
    };
    const res = await api.patch(`/tenant/builder/templates/${id}/`, updateData);
    if (data.content || data.html_content || data.document) {
      const mode = kind === "invoice" ? "invoice" : (subtype || "contract");
      const backendDoc = toBackendTemplateDocument(data, mode);
      const draftRes = await api.put(`/tenant/builder/templates/${id}/draft/`, {
        lock_version: data.lock_version || 1,
        document: backendDoc,
      });
      return { ...res, draft: draftRes?.data };
    }
    return res;
  } catch (err) {
    if (err?.response?.status === 404) {
      return api.patch(`/documents/templates/${id}/`, data);
    }
    throw err;
  }
};

export const deleteDocumentTemplate = async (id) => {
  try {
    return await api.delete(`/tenant/builder/templates/${id}/`);
  } catch (err) {
    if (err?.response?.status === 404) {
      return api.delete(`/documents/templates/${id}/`);
    }
    throw err;
  }
};

export const publishDocumentTemplate = async (id) => {
  try {
    await api.post(`/tenant/builder/templates/${id}/draft/validate/`);
  } catch (valErr) {
    console.warn("Template draft validation notice:", valErr?.response?.data || valErr?.message);
  }
  return await api.post(`/tenant/builder/templates/${id}/draft/publish/`);
};

export const activateDocumentTemplate = activateBuilderTemplate;
export const deactivateDocumentTemplate = deactivateBuilderTemplate;
export const getDocumentVariableRegistry = async (kind = "document") => {
  try {
    const params = typeof kind === "object" ? kind : { kind: kind || "document" };
    return await api.get("/tenant/builder/variables/", { params });
  } catch (err) {
    if (err?.response?.status === 404) {
      return api.get("/documents/variables/");
    }
    throw err;
  }
};

export const previewDocumentTemplate = async (id, data = {}) => {
  try {
    const isStructured = Boolean(data?.source && data?.format);
    const payload = isStructured
      ? data
      : {
          format: data.format || "html",
          audience: data.audience || "customer",
          source: data.source || {},
          revision: data.revision || "",
          ...(data.document ? { document: data.document } : {}),
        };
    return await api.post(`/tenant/builder/templates/${id}/preview/`, payload);
  } catch (err) {
    if (err?.response?.status === 404) {
      return api.post(`/documents/templates/${id}/preview/`, data);
    }
    throw err;
  }
};

export const getTemplateVariables = async (params) => {
  try {
    return await api.get("/tenant/builder/variables/", { params });
  } catch (err) {
    if (err?.response?.status === 404) {
      return api.get("/documents/template-variables/", { params });
    }
    throw err;
  }
};

// ============================================================================
// Estimate Portal Templates & Communication Templates Stubs (For Universal Modal)
// ============================================================================
export const getEstimatePortalTemplates = async (params = {}) => {
  try {
    const res = await api.get("/tenant/builder/templates/", { params: { kind: "estimate_portal", ...params } });
    const payload = res?.data ?? res;
    const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.results) ? payload.results : []);
    const normalized = items.map((t) => ({
      ...t,
      template_type: t.subtype || t.template_type || "binding",
      scope_type: "opportunity",
      branch: t.branch_id,
      is_active: t.state === "active" || t.is_active,
    }));
    return { ...res, data: normalized };
  } catch (err) {
    return { data: [] };
  }
};

export const createEstimatePortalTemplate = async (data) => {
  const builderData = {
    kind: "estimate_portal",
    subtype: data.subtype || "binding",
    name: data.name,
    description: data.description || "",
    branch_id: data.branch_id ?? null,
  };
  if (data.document || data.content || data.html_content) {
    builderData.document = toBackendTemplateDocument(data, "estimate_portal");
  }
  return await api.post("/tenant/builder/templates/", builderData);
};

export const updateEstimatePortalTemplate = async (id, data) => {
  return await api.patch(`/tenant/builder/templates/${id}/`, data);
};

export const deactivateEstimatePortalTemplate = async (id) => {
  return await api.post(`/tenant/builder/templates/${id}/deactivate/`);
};

export const duplicateEstimatePortalTemplate = async (id, data = {}) => {
  return await api.post(`/tenant/builder/templates/${id}/duplicate/`, data);
};

const toTenantCommunicationTemplatePayload = (data, partial = false) => {
  const payload = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(data, key);

  if (!partial || has("name")) payload.name = data.name;
  if (!partial || has("description")) payload.description = data.description || "";
  if (!partial || has("channel")) payload.channel = data.channel;
  if (!partial || has("subject")) payload.subject = data.subject || "";
  if (!partial || has("body_html")) payload.body_html = data.body_html || "";
  if (!partial || has("body_text") || has("body") || has("sms_body")) {
    payload.body_text = data.body_text ?? data.sms_body ?? data.body ?? "";
  }
  if (!partial || has("branch_id") || has("branch")) {
    payload.branch_id = data.branch_id ?? data.branch ?? null;
  }
  if (!partial || has("is_active")) payload.is_active = data.is_active ?? true;

  return payload;
};

export const getCommunicationTemplates = async (params = {}) => {
  try {
    return await api.get("/tenant/communications/templates/", { params });
  } catch (err) {
    return { data: [] };
  }
};

export const createCommunicationTemplate = async (data) => {
  return await api.post("/tenant/communications/templates/", toTenantCommunicationTemplatePayload(data));
};

export const updateCommunicationTemplate = async (id, data) => {
  return await api.patch(`/tenant/communications/templates/${id}/`, toTenantCommunicationTemplatePayload(data, true));
};

export const deleteCommunicationTemplate = async (id) => {
  return await api.delete(`/tenant/communications/templates/${id}/`);
};

export default api;
