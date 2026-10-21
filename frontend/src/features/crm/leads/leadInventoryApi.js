import api from '../../../services/axios';
const base = (leadId) => {
  if (!leadId || leadId === 'new') throw new Error('A saved lead is required.');
  return `/tenant/leads/${leadId}/inventory/`;
};
const fields = ['room_name', 'item_name', 'quantity', 'weight_lbs_each', 'notes', 'is_fragile', 'is_special'];
export const inventoryPayload = (data, creating = false) => Object.fromEntries(
  [...fields, ...(creating ? ['submitted_by_name', 'submitted_by_email'] : [])]
    .filter(key => data[key] !== undefined).map(key => [key, data[key]])
);
export const listLeadInventory = (leadId) => api.get(base(leadId));
export const createLeadInventoryItem = (leadId, payload) => api.post(base(leadId), inventoryPayload(payload, true));
export const updateLeadInventoryItem = (leadId, itemId, payload) => api.patch(`${base(leadId)}${itemId}/`, inventoryPayload(payload));
export const deleteLeadInventoryItem = (leadId, itemId) => api.delete(`${base(leadId)}${itemId}/`);
export function inventorySummary(items) {
  return items.reduce((summary, item) => {
    summary.rooms.add(item.room_name);
    const quantity = Number(item.quantity);
    summary.quantity += quantity;
    summary.weight += quantity * Number(item.weight_lbs_each || 0);
    summary.fragile += item.is_fragile ? quantity : 0;
    summary.special += item.is_special ? quantity : 0;
    return summary;
  }, { rooms: new Set(), quantity: 0, weight: 0, fragile: 0, special: 0 });
}
export function recordInventoryLeadId(isLead, routeId, record, canonicalRoute = false) {
  if (routeId === 'new') return null;
  if (canonicalRoute && String(record?.sales_number) !== String(routeId) && String(record?.id) !== String(routeId)) return null;
  if (isLead) return canonicalRoute ? record?.id : routeId;
  if (!canonicalRoute && String(record?.id) !== String(routeId)) return null;
  return record?.lead_id || record?.lead_details?.id || record?.lead?.id || (typeof record?.lead !== 'object' ? record?.lead : null) || null;
}
