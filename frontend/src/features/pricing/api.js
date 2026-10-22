// Tariffs API (SmartMoving parity). Every call goes through the shared axios
// client (auth, tenant headers, 403 notification); responses are the backend's
// JSON. Prices are rated by the backend, never computed here.
import api from '../../services/axios';

const T = '/tenant/tariffs';

export const tariffsApi = {
  list: (params) => api.get(`${T}/`, { params }),
  get: (id) => api.get(`${T}/${id}/`),
  create: (data) => api.post(`${T}/`, data),
  /** The Common screen; carries the lock_version the client read. */
  updateCommon: (id, data) => api.patch(`${T}/${id}/`, data),
  /** One screen of the tariff: { value, lock_version }. */
  saveSection: (id, section, value, lockVersion) =>
    api.put(`${T}/${id}/sections/${section}/`, { value, lock_version: lockVersion }),
  activate: (id) => api.post(`${T}/${id}/activate/`),
  deactivate: (id) => api.post(`${T}/${id}/deactivate/`),
  rate: (id, job) => api.post(`${T}/${id}/rate/`, job),
};

export const valuationTemplatesApi = {
  list: () => api.get('/tenant/valuation-templates/'),
  create: (data) => api.post('/tenant/valuation-templates/', data),
  update: (id, data) => api.patch(`/tenant/valuation-templates/${id}/`, data),
};

export const storageTariffsApi = {
  list: () => api.get('/tenant/storage-tariffs/'),
  create: (data) => api.post('/tenant/storage-tariffs/', data),
  update: (id, data) => api.patch(`/tenant/storage-tariffs/${id}/`, data),
  warehouses: () => api.get('/tenant/storage-tariffs/warehouses/'),
  assign: (warehouseId, storageTariffId) =>
    api.post('/tenant/storage-tariffs/assign/', { warehouse_id: warehouseId, storage_tariff_id: storageTariffId }),
};

export const opportunityTariffApi = {
  get: (opportunityId) => api.get(`/tenant/opportunity-tariffs/${opportunityId}/`),
  change: (opportunityId, tariffId) => api.post(`/tenant/opportunity-tariffs/${opportunityId}/change/`, { tariff_id: tariffId }),
  saveMaterials: (opportunityId, materials) =>
    api.put(`/tenant/opportunity-tariffs/${opportunityId}/materials/`, { materials }),
  rerate: (opportunityId) => api.post(`/tenant/opportunity-tariffs/${opportunityId}/rerate/`),
};

/** Reference data the tariff screens offer as choices. */
export const referenceApi = {
  opportunityTypes: () => api.get('/tenant/opportunity-types/'),
};
